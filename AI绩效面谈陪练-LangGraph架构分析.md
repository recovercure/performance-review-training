# AI 绩效面谈陪练 — LangGraph 架构分析

> 分析对象：`src/agents/` | 框架：LangChain + LangGraph | 日期：2026-07-02

---

## 一、架构总览

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js API Routes                       │
│                                                              │
│  POST /api/v2/chat/stream          POST /api/v2/analysis    │
│         │                                    │               │
│         ▼                                    ▼               │
│  ┌──────────────┐              ┌────────────────────────┐   │
│  │ StateGraph   │              │    Coach Chain (LCEL)   │   │
│  │ (graph.ts)   │              │   (coach-chain.ts)      │   │
│  │              │              │                         │   │
│  │ START ─┬─→ search_kb       │ runCoachAnalysis()      │   │
│  │        │      │             │ runSummaryAnalysis()    │   │
│  │        └─→ build_prompt    │                         │   │
│  │               │             │    COACH_PROMPT          │   │
│  │               ▼             │    SUMMARY_PROMPT        │   │
│  │              END            └──────────┬─────────────┘   │
│  │              │                         │                  │
│  └──────┬───────┘                         ▼                  │
│         │                         analysisModel.invoke()     │
│         ▼                         (ChatOpenAI, temp=0.3)     │
│  employeeChatStream()                                        │
│  (NOT in graph!)         ┌──────────────────────────┐       │
│                          │   Supabase PostgreSQL     │       │
│  chatModel.stream()      │   search_knowledge() RPC │       │
│  (ChatOpenAI, temp=0.8)  │   (全文搜索)             │       │
│                          └──────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

核心要点：Graph **只负责 Prompt 构建**（含可选 RAG 注入），LLM 流式调用在 Graph 外部由 API route 直接驱动。

---

## 二、StateGraph — 核心编排

### 2.1 文件：`src/agents/graph.ts`（32 行）

```typescript
const builder = new StateGraph(EmployeeReplyState)
  .addNode("build_prompt", buildPromptNode)
  .addNode("search_kb", searchKnowledgeNode)
  .addConditionalEdges(START, routeFromStart, {
    search_kb: "search_kb",
    build_prompt: "build_prompt",
  })
  .addEdge("search_kb", "build_prompt")
  .addEdge("build_prompt", END);
```

### 2.2 执行流程

```
START
  │
  ▼
  ragEnabled? ──Yes──→ search_kb ──→ build_prompt ──→ END
  │                                       ▲
  └───────────No──────────────────────────┘
```

- **条件路由** (`routeFromStart`)：根据 `state.ragEnabled` 选择是否需要先检索知识库
- **无论哪条路径，最终都到达 `build_prompt` 节点**
- **结果**：State 中的 `systemPrompt` 字段被填充

### 2.3 设计特点

| 特点 | 说明 |
|------|------|
| **极简图结构** | 仅 2 个节点 + 1 条条件边，无循环、无并行 |
| **单次执行模式** | 每次 API 调用只运行一次图表，用于单轮对话的 Prompt 构建 |
| **LLM 不参与 Graph** | `employeeChatStream()` 是独立函数，不在图节点中运行 |
| **无状态持久化** | 每次请求重新创建 State，不跨请求保留 |

### 2.4 评价

**优点**：简单直观，RAG 分支清晰，Prompt 构建逻辑与 LLM 调用解耦。

**局限**：
- Graph 是"装饰性"使用 — 只做串行数据转换，未发挥 StateGraph 的并行/循环/条件分支能力
- LLM 调用在图外部，Graph 本身不产生 AI 输出
- 无检查点/持久化，每次请求都是无状态的

---

## 三、State 定义

### 3.1 文件：`src/agents/state.ts`

```typescript
export const EmployeeReplyState = Annotation.Root({
  messages:       Annotation<BaseMessage[]>({
    reducer: (left, right) => left.concat(right),  // 追加合并
    default: () => [],
  }),
  chatHistory:    Annotation<{ role: string; content: string }[]>({
    reducer: (_, incoming) => incoming,             // 替换覆盖
    default: () => [],
  }),
  systemPrompt:   Annotation<string>,               // 无 reducer，直接赋值
  knowledgeContext: Annotation<string>,
  employeeType:   Annotation<string>,
  employeeName:   Annotation<string>,
  step:           Annotation<number>,
  difficulty:     Annotation<string>,
  ragEnabled:     Annotation<boolean>,
});
```

### 3.2 字段分类

| 类别 | 字段 | 用途 |
|------|------|------|
| **对话数据** | `messages` | LangChain BaseMessage[]，concat 合并 |
| **对话数据** | `chatHistory` | 前端格式 `{role, content}[]`，RAG 检索用 |
| **生成产物** | `systemPrompt` | `build_prompt` 节点填充的完整系统 Prompt |
| **生成产物** | `knowledgeContext` | RAG 检索结果文本 |
| **会话上下文** | `employeeType`, `employeeName`, `step`, `difficulty` | Prompt 模板变量 |
| **控制开关** | `ragEnabled` | 条件路由判断依据 |

### 3.3 重复字段问题

`messages` 和 `chatHistory` 存储同一对话的两种格式：

| 字段 | 类型 | 格式 | 用途 |
|------|------|------|------|
| `messages` | `BaseMessage[]` | LangChain 标准格式 | 注入 ChatPromptTemplate |
| `chatHistory` | `{role, content}[]` | 前端 JS 对象格式 | RAG 检索（提取最后一条用户消息） |

这是一个冗余设计 — 两个字段始终同时存在，且 `chatHistory` 仅用于 `searchKnowledgeNode` 中提取最后一条 user 消息。

---

## 四、节点详解

### 4.1 `buildPromptNode` (`nodes/build-prompt.ts`)

```
输入：state.employeeType, employeeName, step, difficulty, knowledgeContext
处理：调用 buildEmployeePromptInput() → EMPLOYEE_PROMPT.format()
输出：{ systemPrompt: "<完整系统提示词>" }
```

**流程**：
1. 从 State 提取会话参数 + 知识库上下文
2. 调用 `buildEmployeePromptInput()` 组装模板变量（含难度修饰语、步骤信息、员工档案）
3. 调用 `EMPLOYEE_PROMPT.format()` 填入变量 → 生成完整系统 Prompt 字符串
4. 返回 `{ systemPrompt }` 更新 State

### 4.2 `searchKnowledgeNode` (`nodes/search-kb.ts`)

```
输入：state.chatHistory, state.ragEnabled
处理：提取最后一条用户消息 → Supabase search_knowledge() RPC → formatKnowledgeContext()
输出：{ knowledgeContext: "<知识库文本>" }
```

**流程**：
1. 检查 `ragEnabled`，若关闭则返回空字符串
2. 从 `chatHistory` 中找到最后一条 `role === "user"` 的消息
3. 调用 Supabase `search_knowledge()` RPC（PostgreSQL 全文搜索，Top 3）
4. 格式化结果：`## 参考知识库资料\n[1] 标题\n内容...`
5. 返回 `{ knowledgeContext }` 更新 State

### 4.3 `employeeChatStream` — 非图节点

```
输入：state.systemPrompt, state.messages
处理：ChatOpenAI.stream([systemPrompt, ...messages])
输出：AsyncGenerator<string>（逐 token 产出）
```

这是一个**独立函数**，不在 StateGraph 中。API route 先 `graph.invoke()` 拿到填充好的 `state.systemPrompt`，再调用 `employeeChatStream(state)` 流式生成回复。

---

## 五、Coach Chain（独立 LCEL 链）

### 5.1 文件：`src/agents/coach-chain.ts`

独立于 StateGraph 的两条分析链：

```
runCoachAnalysis()                     runSummaryAnalysis()
      │                                       │
      ▼                                       ▼
COACH_PROMPT.format()                  SUMMARY_PROMPT.format()
      │                                       │
      ▼                                       ▼
analysisModel.invoke()                 analysisModel.invoke()
(ChatOpenAI, temp=0.3)                 (ChatOpenAI, temp=0.3)
      │                                       │
      ▼                                       ▼
parseLLMJson()                         parseLLMJson()
      │                                       │
      ▼                                       ▼
AnalysisResult                         SummaryReport
```

### 5.2 关键实现细节

```typescript
// 对话文本拼接格式
const conversationText = input.messages
  .map((m) => `${m.role === "user" ? "管理者" : "员工"}：${m.content}`)
  .join("\n");

// JSON 解析（清理 Markdown 代码块标记）
function parseLLMJson(raw: string): Record<string, unknown> {
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleaned);
}
```

### 5.3 错误处理

API route (`v2/analysis/route.ts`) 对 LLM 调用做了降级处理：

- 分析失败 → 返回 `{ score: 0, dimensions: {}, ..., fallback: true }`
- 总结失败 → 返回 `{ overallScore: 手动计算, summary: "服务不可用", ..., fallback: true }`

---

## 六、模型配置

### 6.1 文件：`src/lib/langchain-client.ts`

| 模型 | 温度 | 流式 | 用途 |
|------|------|------|------|
| `chatModel` (LLM_CHAT_MODEL) | 0.8 | ✅ 开启 | 员工角色扮演对话 |
| `analysisModel` (LLM_ANALYSIS_MODEL) | 0.3 | ❌ 关闭 | 教练分析 + 总结报告 |

两个模型可独立配置，共用同一 API key 和 base URL（兼容 OpenAI 格式，支持 DeepSeek 等）。

---

## 七、API Route 调用链

### 7.1 对话流式接口：`POST /api/v2/chat/stream`

```
请求体：{ messages, employeeType, employeeName, step, difficulty, ragEnabled }

1. 前端 messages 转换为 LangChain BaseMessage[]
2. graph.invoke(state) → 运行 Graph，生成 systemPrompt
3. employeeChatStream(state) → AsyncGenerator<string>
4. 逐 token 包装为 SSE 格式输出
```

### 7.2 分析接口：`POST /api/v2/analysis`

```
请求体：{ messages, employeeType, employeeName, step, mode?, stepScores? }

mode === "summary"
  → runSummaryAnalysis() → { overallScore, summary, strengths, weaknesses, ... }
mode !== "summary"
  → runCoachAnalysis() → { score, dimensions, highlights, improvements, ... }
```

---

## 八、架构评价

### 优点

1. **Prompt 与 LLM 解耦**：Graph 负责数据准备，LLM 调用在外部，职责清晰
2. **双模型分离**：对话用高温模型（0.8）追求多样性，分析用低温模型（0.3）追求一致性
3. **RAG 可插拔**：通过 `ragEnabled` 开关条件路由，不启用时跳过检索节点
4. **降级健壮**：分析 API 有 fallback 机制，LLM 失败不影响前端体验
5. **模板化管理**：所有 Prompt 集中在 `src/agents/prompts/`，修改方便

### 可优化点

| 问题 | 现状 | 建议 |
|------|------|------|
| **Graph 利用不充分** | 2 节点纯串行，无循环/并行 | 可保留当前设计（简洁够用），但需认识到这是"轻量 Graph" |
| **State 字段冗余** | `messages` 和 `chatHistory` 存两份对话 | 合并为一个字段，或仅在需要转换时才做格式映射 |
| **LLM 在图外** | `employeeChatStream` 不是图节点 | 当前设计合理（流式输出需要外部控制），但如果后续需要多步推理，可加入图节点 |
| **无检查点** | 每次请求重新跑全图 | 对于单轮对话场景够用，多轮场景可引入 Checkpointer |
| **无重试/超时** | `model.invoke()` 无超时控制 | 添加 `AbortSignal` 或 timeout 机制 |
| **JSON 解析脆弱** | `parseLLMJson` 仅清理代码块标记 | 可加 `jsonrepair` 库或 retry 逻辑处理格式错误 |
| **Coach Chain 非 LangGraph** | 分析链是普通 LCEL，未集成到 Graph | 可考虑合并进 Graph 形成完整单次调用链路 |

---

## 九、与 V1 对比

| 维度 | V1 (Legacy) | V2 (LangGraph) |
|------|-------------|----------------|
| Prompt 构建 | 字符串模板 `buildXxxPrompt()` | `ChatPromptTemplate.format()` |
| RAG 注入 | 拼接字符串到 Prompt 末尾 | Graph 条件路由 `search_kb` 节点 |
| LLM 调用 | 裸 `fetch()` + SSE 手动解析 | `ChatOpenAI.stream()` |
| 编排方式 | 函数调用（线性代码） | StateGraph（声明式 + 条件边） |
| 可观测性 | 无结构化状态 | State 对象可追踪全流程数据 |
| 扩展性 | 修改代码逻辑 | 增删 Graph 节点/边 |

---

## 十、文件索引

```
src/agents/
├── graph.ts              # StateGraph 定义（2 节点 + 条件路由）
├── state.ts              # Annotation.Root State（9 字段）
├── coach-chain.ts        # 教练分析 + 总结报告 LCEL 链
├── rag-chain.ts          # RAG 检索封装（调用 Supabase 全文搜索）
├── prompt-helpers.ts     # Prompt 输入构造器（3 个 builder 函数）
├── nodes/
│   ├── build-prompt.ts   # Prompt 构建节点
│   ├── search-kb.ts      # 知识库检索节点
│   └── employee-chat.ts  # LLM 流式调用（非图节点）
└── prompts/
    ├── employee.ts       # 员工角色扮演 ChatPromptTemplate
    ├── coach.ts          # 教练分析 ChatPromptTemplate
    └── summaries.ts      # 总结报告 ChatPromptTemplate

src/lib/
├── langchain-client.ts   # ChatOpenAI 工厂函数
├── prompts.ts            # V1 遗留 Prompt（裸字符串）
└── knowledge.ts          # Supabase 知识检索底层
```
