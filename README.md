# AI 绩效面谈陪练 Agent

基于 Next.js 16 + shadcn/ui + LangChain/LangGraph 的全栈应用，帮助管理者通过 AI 模拟练习绩效面谈。

## 快速开始

### 1. 环境要求

- Node.js 20+
- pnpm 9+

### 2. 安装依赖

```bash
pnpm install
```

### 3. 配置环境变量

复制 `.env.example` 为 `.env`，填入你的配置：

```bash
cp .env.example .env
```

必需环境变量：

```env
# LLM API（兼容 OpenAI 格式，DeepSeek / OpenAI / 任意兼容服务均可）
LLM_API_KEY=your_api_key
LLM_BASE_URL=https://api.deepseek.com/v1
LLM_CHAT_MODEL=deepseek-chat           # 对话模型（temperature 0.8）
LLM_ANALYSIS_MODEL=deepseek-chat       # 分析模型（temperature 0.3）

# Supabase 数据库（可选，不配置则使用内存存储）
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

可选配置：

```env
# 实现版本切换（默认使用 LangChain/LangGraph 新实现）
# 设为 false 降级到旧版裸 fetch 实现
NEXT_PUBLIC_USE_LANGGRAPH=false
```

### 4. 启动开发服务器

```bash
pnpm dev
```

浏览器打开 [http://localhost:5000](http://localhost:5000)。

### 5. 构建生产版本

```bash
pnpm build
pnpm start
```

## 项目结构

```
src/
├── app/                      # Next.js App Router
│   ├── api/
│   │   ├── chat/stream/     # AI 对话（SSE 流式，旧实现）
│   │   ├── analysis/        # 实时分析评分（旧实现）
│   │   ├── v2/              # LangChain/LangGraph 新实现
│   │   │   ├── chat/stream/ # 流式对话 API
│   │   │   └── analysis/    # 分析 API
│   │   ├── sessions/        # 会话管理
│   │   └── knowledge/       # 知识库 CRUD + 搜索
│   ├── training/            # 训练页面
│   ├── history/             # 历史记录
│   └── knowledge/           # 知识库管理
├── agents/                   # LangChain/LangGraph Agent
│   ├── state.ts             # 状态定义（Annotation.Root）
│   ├── graph.ts             # StateGraph（prompt构建 → RAG检索）
│   ├── coach-chain.ts       # 分析/总结 LCEL 链
│   ├── prompt-helpers.ts    # Prompt 输入构造器
│   ├── rag-chain.ts         # RAG 检索集成
│   ├── nodes/               # 图节点
│   │   ├── build-prompt.ts  # Prompt 构建节点
│   │   ├── search-kb.ts     # 知识库检索节点
│   │   └── employee-chat.ts # LLM 流式调用
│   └── prompts/             # ChatPromptTemplate
│       ├── employee.ts      # 员工角色扮演
│       ├── coach.ts         # 教练分析
│       └── summaries.ts     # 总结报告
├── components/
│   ├── ui/                  # shadcn/ui 组件
│   └── layout/nav.tsx       # 侧边导航
├── lib/
│   ├── langchain-client.ts  # ChatOpenAI 工厂
│   ├── llm-client.ts        # LLM API 调用（旧实现）
│   ├── knowledge.ts         # RAG 知识检索
│   ├── prompts.ts           # AI 提示词（旧实现）
│   └── employee-types.ts    # 员工角色定义
└── storage/database/
    └── shared/schema.ts     # Drizzle ORM Schema
```

## 核心功能

### AI 对话训练

- **5 种员工角色**：抗拒型、沉默型、情绪型、敷衍型、进取型
- **4 步训练流程**：开场破冰 → 问题诊断 → 反馈沟通 → 改进计划
- **实时分析**：AI 自动评分并给出改进建议
- **RAG 知识库**：启用后可检索公司话术和案例

### 知识库管理

访问 `/knowledge` 页面管理知识文档。支持：
- 按分类筛选（通用、话术、案例、政策、技巧）
- 全文搜索
- 训练时自动注入相关知识

## 开发命令

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 启动开发服务器（端口 5000） |
| `pnpm build` | 构建生产版本 |
| `pnpm start` | 启动生产服务器 |
| `pnpm lint` | 运行 ESLint |
| `pnpm ts-check` | TypeScript 类型检查 |
| `pnpm validate` | 运行 lint + 类型检查 |

## 技术栈

- **框架**: Next.js 16 (App Router)
- **UI**: shadcn/ui + Tailwind CSS v4
- **AI Agent**: LangChain + LangGraph（StateGraph 编排 Prompt 构建、RAG 检索、LLM 调用）
- **数据库**: Supabase (PostgreSQL) + Drizzle ORM
- **包管理**: pnpm 9+

## 实现版本切换

项目内置两套 AI 实现，通过环境变量切换：

| 值 | 实现 | 说明 |
|----|------|------|
| 不设置 / `true`（默认） | LangChain/LangGraph | Prompt 模板化、StateGraph 编排、RAG 链式调用 |
| `false` | 裸 fetch + 字符串拼接 | 旧实现，保留作为降级 fallback |

```env
# 降级到旧实现
NEXT_PUBLIC_USE_LANGGRAPH=false
```

两套实现 API 协议相同，前端无感知切换。

## 重要提示

1. **必须使用 pnpm**，项目已配置 `preinstall` 脚本阻止 npm/yarn
2. **优先使用 shadcn/ui 组件**，位于 `src/components/ui/`
3. **使用 `@/` 路径别名**导入模块
4. **不要使用 `<head>` 标签**，使用 Next.js `metadata` 导出
