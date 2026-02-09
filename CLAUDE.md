# Querido Diário

App de acompanhamento de rotinas infantis. Admin gerencia diários/rotinas/atividades; painel público (via token) permite marcar atividades do dia. Toda a UI é em português (pt-BR).

## Stack

React Router v7 + Cloudflare Workers + NeonDB (PostgreSQL) + Drizzle ORM + Tailwind CSS v4 + bcrypt-ts

## Comandos

```bash
npm run dev            # servidor local (Vite)
npm run build          # build para produção
npm run deploy         # build + wrangler deploy
npm run typecheck      # cf-typegen + react-router typegen + tsc
npm run db:generate    # gera migrations (drizzle-kit)
npm run db:push        # aplica migrations no banco
npm run db:seed        # seed com dados de teste (imprime token do painel)
npm run db:studio      # GUI do Drizzle
```

## Arquitetura

- `app/routes.ts` — definição centralizada de rotas (não usa file-based routing automático)
- `app/routes/` — rotas: loaders (GET), actions (POST), componentes React
- `app/db/schema.ts` — schema Drizzle (tenants → diaries → routines → activities → activityDays/completions)
- `app/db/client.ts` — factory `createDb(databaseUrl)` usada em todo loader/action
- `app/lib/*.server.ts` — autenticação (cookie session) e guard `requireAuth()`
- `app/components/` — componentes do painel público (ActivityCard*, RoutineSection, etc.)
- `workers/app.ts` — entry point do Cloudflare Worker
- `drizzle/` — migrations SQL geradas

### Duas interfaces

1. **Admin** (`/diarios/*`) — autenticado via cookie session, CRUD de diários/rotinas/atividades
2. **Painel** (`/painel#token=UUID`) — público, token no hash (nunca enviado ao servidor), lido via JS e passado no header `X-Access-Token`

### Fluxo de dados nos loaders/actions

```typescript
const userId = await requireAuth(request, context.cloudflare.env.SESSION_SECRET);
const db = createDb(context.cloudflare.env.NEON_DATABASE_URL);
```

## Convenções

- Tipos de rota auto-gerados: `import type { Route } from "./+types/nomedarota"`
- Env vars acessadas via `context.cloudflare.env.NOME_DA_VAR` (não `process.env`)
- Todos os FKs usam `onDelete: "cascade"`
- Atividades têm dois tipos: `"binary"` (fiz/não fiz, bloqueia progressão) e `"incremental"` (+/- contador, não bloqueia)
- Rotinas desbloqueiam sequencialmente: próxima só abre quando todas as binary da anterior estão completas
- Tailwind v4 sem arquivo de config — tema definido em `app/app.css` via `@theme`
- Emojis como ícones (sem biblioteca de ícones)

## Gotchas

- Env local fica em `.dev.vars` (formato Wrangler), NÃO em `.env` — `.env` é apenas fallback para drizzle-kit
- `npm run cf-typegen` roda automaticamente no postinstall — gera `worker-configuration.d.ts`
- Token do painel fica no **hash** da URL (`#token=`), nunca na query string — por segurança
- Usar `bcrypt-ts` (edge-compatible), NUNCA bcrypt nativo
- `activityDays` tem `sortOrder` **por dia da semana**, não global — mesmo activity pode ter ordem diferente em dias diferentes
- Seed deleta tabelas em ordem reversa de dependência (completions → tenants)

## Status do projeto

Fases 1-6 completas (scaffold, DB, painel, auth, CRUD diários, CRUD rotinas). Fase 7 (kanban de atividades) em andamento. Ver `plano.md` para detalhes.
