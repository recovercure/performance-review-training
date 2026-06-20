# AI 绩效面谈陪练 Agent

基于 Next.js 16 + shadcn/ui 的全栈应用，帮助管理者通过 AI 模拟练习绩效面谈。

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env`，填入你的配置：

```bash
cp .env.example .env
```

必需的环境变量：

```env
# LLM API（兼容 OpenAI 格式）
LLM_API_KEY=your_api_key
LLM_BASE_URL=https://api.deepseek.com/v1
LLM_CHAT_MODEL=deepseek-chat
LLM_ANALYSIS_MODEL=deepseek-chat

# Supabase 数据库（可选，用于持久化）
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. 启动开发服务器

```bash
pnpm dev
```

打开 [http://localhost:5000](http://localhost:5000) 查看应用。

### 4. 构建生产版本

```bash
pnpm build
pnpm start
```

## 项目结构

```
src/
├── app/                      # Next.js App Router
│   ├── api/                  # API 路由
│   │   ├── chat/stream/     # AI 对话（SSE 流式）
│   │   ├── analysis/        # 实时分析评分
│   │   ├── sessions/        # 会话管理
│   │   └── knowledge/       # 知识库 CRUD + 搜索
│   ├── training/            # 训练页面
│   ├── history/             # 历史记录
│   └── knowledge/           # 知识库管理
├── components/
│   ├── ui/                  # shadcn/ui 组件（直接使用）
│   └── layout/nav.tsx       # 侧边导航
├── lib/                     # 工具库
│   ├── llm-client.ts        # LLM API 调用
│   ├── knowledge.ts         # RAG 知识检索
│   ├── prompts.ts           # AI 提示词
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
- **数据库**: Supabase (PostgreSQL) + Drizzle ORM
- **AI**: 兼容 OpenAI 格式的 LLM API
- **包管理**: pnpm 9+

## 重要提示

1. **必须使用 pnpm**，项目已配置 `preinstall` 脚本阻止 npm/yarn
2. **优先使用 shadcn/ui 组件**，位于 `src/components/ui/`
3. **使用 `@/` 路径别名**导入模块
4. **不要使用 `<head>` 标签**，使用 Next.js `metadata` 导出
