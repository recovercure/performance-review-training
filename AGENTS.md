# AGENTS.md

## Commands

| Task | Command |
|------|---------|
| Install deps | `pnpm install` |
| Dev server | `pnpm dev` (port 5000, tsx watch on `src/server.ts`) |
| Build | `pnpm build` (runs `pnpm install` → `next build` → `tsup` bundle of server) |
| Lint | `pnpm lint` |
| Lint (strict, CI) | `pnpm lint:build` |
| Typecheck | `pnpm ts-check` |
| Validate (lint + typecheck) | `pnpm validate` (runs both in parallel) |

**Pre-commit check**: `pnpm validate` (typecheck + lint). Run this before committing.

## Tech Stack

- Next.js 16 (App Router), React 19, TypeScript 5 (strict)
- Tailwind CSS 4 + shadcn/ui (new-york style, `src/components/ui/`)
- Drizzle ORM + Supabase (PostgreSQL)
- pnpm only — enforced by `preinstall` script, npm/yarn will fail

## Architecture

Custom Node server (`src/server.ts`) wraps Next.js. Dev uses `tsx watch`, prod uses tsup-bundled `dist/server.js`. Port defaults to 5000.

```
src/
├── app/                # Next.js App Router pages + API routes
│   ├── api/            # API routes (chat/stream, analysis, sessions, knowledge, wecom)
│   ├── training/       # Training setup + session pages
│   ├── history/        # History & review
│   └── knowledge/      # Knowledge base management
├── components/
│   ├── ui/             # shadcn/ui components (use these, don't create from scratch)
│   └── layout/nav.tsx  # Sidebar navigation
├── lib/                # prompts.ts, employee-types.ts, training-steps.ts, utils.ts, knowledge.ts
├── storage/database/
│   ├── shared/schema.ts      # Drizzle schema (trainingSessions, sessionMessages, sessionAnalytics, knowledgeDocuments)
│   └── supabase-client.ts    # Supabase client (env loaded via dotenv)
└── server.ts           # Custom HTTP server entrypoint
```

## Key Domain Context

This is a **performance review training agent** (绩效面谈陪练). Managers practice difficult conversations with AI-simulated employees.

**5 employee types**: resistant, silent, emotional, perfunctory, aggressive
**4-step training flow**: Opening → Diagnosis → Feedback → Planning

AI integration:
- `src/lib/llm-client.ts` — direct OpenAI-compatible fetch (`LLM_API_KEY`, `LLM_BASE_URL`, `LLM_CHAT_MODEL`, `LLM_ANALYSIS_MODEL`)
- `src/lib/knowledge.ts` — RAG retrieval via Supabase full-text search
- RAG: `knowledge_documents` table with `tsvector` column, `search_knowledge()` SQL function

## Critical Rules

### Path aliases
- Use `@/` prefix for all imports (maps to `src/`). Never use relative paths crossing directory boundaries.

### next.config.ts
- Never hardcode absolute paths. Use `path.resolve(__dirname, ...)`, `import.meta.dirname`, or `process.cwd()`.
- ESLint enforces this via `no-restricted-syntax`.

### Hydration
- No `typeof window`, `Date.now()`, `Math.random()` in JSX render. Use `'use client'` + `useEffect`/`useState`.
- No `<head>` tag — use Next.js `metadata` export. ESLint enforces this.
- No invalid HTML nesting (e.g. `<p>` inside `<div>`).

### Components
- Always use existing shadcn/ui components from `src/components/ui/`. Add new ones via `pnpm dlx shadcn@latest add <component>`.

### Styling
- Tailwind CSS 4, use `cn()` from `@/lib/utils` for conditional classes.
- Theme variables defined in `src/app/globals.css`. Follow DESIGN.md for color palette (oklch values, no neon/blue-purple gradients).

### Database
- Schema in `src/storage/database/shared/schema.ts`. Four tables: `trainingSessions`, `sessionMessages`, `sessionAnalytics`, `knowledgeDocuments`.
- Supabase credentials: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, optionally `SUPABASE_SERVICE_ROLE_KEY` (also accepts `COZE_SUPABASE_*` variants for backward compat).
- Env auto-loaded via dotenv.
- Knowledge RAG requires running `scripts/migrate-knowledge.sql` to create the `knowledge_documents` table and `search_knowledge()` function.

### ESLint
- `import/no-cycle` is enforced.
- `<head>` JSX usage and absolute paths in next.config are blocked via `no-restricted-syntax`.
