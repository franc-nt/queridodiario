# Querido Diario - Plano de Implementacao

## Contexto

App de rotina diaria. O usuario cadastra atividades com pontuacao em diarios, e marca o que completou. Cada diario e um perfil de rotina (pode ser para qualquer pessoa). Uso inicial pessoal (1 usuario seed), mas arquitetura multi-tenant desde o inicio.

---

## Stack

| Camada | Escolha |
|--------|---------|
| Framework | React Router v7 (evolucao do Remix) |
| Runtime | Cloudflare Workers (deploy futuro, dev local com wrangler) |
| Banco | NeonDB (PostgreSQL serverless, usado direto em dev) |
| ORM | Drizzle |
| Auth | Cookie sessions (React Router built-in) |
| CSS | Tailwind |
| Hash | bcrypt-ts (edge-compatible) |
| Drag & Drop | @hello-pangea/dnd (kanban de atividades por dia) |

---

## Fluxo de Telas

```
=== AREA ADMIN (login com email/senha) ===

Login
  ↓
Diarios (cards: Maria, Joana...) + botao "Cadastrar Diario"
  ↓ clica no diario
Rotinas do Diario de Maria (cards: Manha, Tarde, Noite) + botao "Cadastrar Rotina"
  ↓ clica na rotina
Rotinas Manha Diario de Maria (kanban por dia da semana) + botao "Cadastrar Atividade"
  Colunas: Segunda | Terca | Quarta | ... | Domingo
  Cards arrastaveis dentro de cada coluna


=== PAINEL (acesso via token na URL, sem login) ===

http://dominio.com/painel#token=<access_token>
  ↓ le token do hash, valida via API
  ↓ abre no ultimo dia preenchido (ou dia atual se vazio)
  ↓
Mostra SOMENTE a primeira rotina (ex: Manha)
  ↓ ao marcar TODAS as atividades binary da Manha
Desbloqueia a proxima rotina (ex: Tarde)
  ↓ ao marcar TODAS as binary da Tarde
Desbloqueia a proxima (ex: Noite)
  ...e assim por diante
```

---

## Modelo de Dados

```
tenants
  id uuid PK
  email text unique
  password_hash text
  name text
  plan text default 'free'
  created_at timestamptz

diaries
  id uuid PK
  tenant_id uuid FK → tenants
  name text
  avatar text (emoji)
  access_token text unique not null  ← token para acesso ao painel (gerado automaticamente)
  created_at timestamptz

routines
  id uuid PK
  diary_id uuid FK → diaries
  name text ("Manha", "Tarde", "Noite" por padrao, editavel)
  icon text (emoji)
  sort_order int
  created_at timestamptz

activities
  id uuid PK
  routine_id uuid FK → routines
  title text
  icon text (emoji)
  points int default 1
  type enum('binary', 'incremental')
      binary = "Fiz ou Nao Fiz"
      incremental = "Registro sem sumir atividade"
  created_at timestamptz

activity_days (em quais dias a atividade aparece + ordem por dia)
  activity_id uuid FK → activities
  day_of_week int (0=Dom, 1=Seg, ..., 6=Sab)
  sort_order int default 0  ← ordem dentro da coluna do dia
  PK(activity_id, day_of_week)

completions
  id uuid PK
  activity_id uuid FK → activities
  diary_id uuid FK → diaries
  date date
  value int (+pontos ou -pontos)
  created_at timestamptz
  INDEX(activity_id, diary_id, date)
```

### Dois tipos de atividade

**"Fiz ou Nao Fiz" (binary):**
- Dois botoes no painel: "Fiz" (+pontos) e "Nao Fiz" (-pontos)
- Marca como concluida pro dia ao clicar em qualquer opcao
- Um registro em completions por dia
- **BLOQUEIA progressao**: precisa ser marcada para desbloquear proxima rotina

**"Registro sem sumir atividade" (incremental):**
- Dois botoes no painel: "+" (+pontos) e "-" (-pontos)
- Cada clique cria um novo registro em completions
- Nunca "conclui" - fica disponivel para clicar quantas vezes quiser
- **NAO BLOQUEIA progressao**: nao impede desbloqueio da proxima rotina

### Nota sobre activity_days

O `sort_order` esta em `activity_days` (nao em `activities`) porque a mesma atividade pode ter ordens diferentes em dias diferentes.

### Nota sobre access_token

- Gerado automaticamente ao criar o diario (UUID ou string aleatoria)
- Usado no hash da URL: `http://dominio.com/painel#token=<token>`
- Hash fragment nao e enviado ao servidor no HTTP request (seguranca)
- Client-side JS le o hash e faz fetch para `/api/painel` com o token para obter dados
- Pode ser regenerado pelo admin se necessario

---

## Rotas

```
=== ADMIN (autenticado via cookie session) ===
/                                    → Redirect /login ou /diarios
/login                               → Login
/logout                              → Logout action
/diarios                             → Layout autenticado
/diarios/                            → Lista de diarios (cards)
/diarios/novo                        → Criar diario
/diarios/:diarioId                   → Layout do diario
/diarios/:diarioId/                  → Lista de rotinas (cards)
/diarios/:diarioId/editar            → Editar diario
/diarios/:diarioId/rotinas/nova      → Criar rotina
/diarios/:diarioId/rotinas/:rotinaId              → Kanban de atividades por dia
/diarios/:diarioId/rotinas/:rotinaId/editar       → Editar rotina
/diarios/:diarioId/rotinas/:rotinaId/atividades/nova  → Criar atividade
/diarios/:diarioId/rotinas/:rotinaId/atividades/:atividadeId/editar → Editar atividade

=== PAINEL (autenticado via token no hash) ===
/painel                              → Tela do painel (le #token=xxx via JS)
/api/painel                          → GET com header token → retorna dados do dia
/api/painel/complete                 → POST → registra completion
```

---

## Estrutura de Arquivos

```
app/
  db/
    schema.ts
    client.ts
    relations.ts
    seed.ts
  lib/
    auth.server.ts
    sessions.server.ts
    require-auth.server.ts
  routes/
    _index.tsx
    login.tsx
    logout.tsx
    diarios.tsx
    diarios._index.tsx
    diarios.novo.tsx
    diarios.$diarioId.tsx
    diarios.$diarioId._index.tsx
    diarios.$diarioId.editar.tsx
    diarios.$diarioId.rotinas.nova.tsx
    diarios.$diarioId.rotinas.$rotinaId.tsx          ← kanban
    diarios.$diarioId.rotinas.$rotinaId.editar.tsx
    diarios.$diarioId.rotinas.$rotinaId.atividades.nova.tsx
    diarios.$diarioId.rotinas.$rotinaId.atividades.$atividadeId.editar.tsx
    painel.tsx                       ← tela do painel (le token do hash)
    api.painel.tsx                   ← GET dados do dia via token
    api.painel.complete.tsx          ← POST registrar completion
  components/
    KanbanBoard.tsx
    KanbanColumn.tsx
    KanbanCard.tsx
    ActivityCardBinary.tsx
    ActivityCardIncremental.tsx
    RoutineSection.tsx
    PointsCounter.tsx
  root.tsx
public/
  manifest.json
  sw.js
drizzle/
drizzle.config.ts
wrangler.jsonc
.dev.vars
```

---

## Etapas de Implementacao

Ordem pensada para chegar na tela de preenchimento funcionando o mais rapido possivel.

### Etapa 1 - Scaffold do Projeto ✅
- `npm create cloudflare@latest` com template react-router
- Instalar deps: drizzle-orm, @neondatabase/serverless, bcrypt-ts, drizzle-kit, dotenv
- Configurar vite.config.ts, wrangler.jsonc, drizzle.config.ts
- Criar `.dev.vars` com placeholders:
  ```
  NEON_DATABASE_URL=<sua_connection_string_neondb>
  SESSION_SECRET=<qualquer_string_segura>
  ```
- Configurar Tailwind

**Notas pos-implementacao:**
- Template usado: `remix-run/react-router-templates/cloudflare` (via `npx create-react-router@latest`)
- Tailwind v4 ja veio configurado no template (plugin `@tailwindcss/vite`, sem `tailwind.config`). CSS em `app/app.css` com `@import "tailwindcss"`.
- Dev dependencies extras adicionadas: `tsx` (para rodar seed), `dotenv` (para drizzle-kit ler `.dev.vars`)
- Scripts adicionados ao package.json: `db:generate`, `db:migrate`, `db:push`, `db:studio`, `db:seed`
- `drizzle.config.ts` usa `dotenv/config` para ler `NEON_DATABASE_URL` do `.env` ou `.dev.vars`
- Env vars tipadas automaticamente pelo `wrangler types` (le `.dev.vars`). Acessiveis via `context.cloudflare.env.NEON_DATABASE_URL` nos loaders/actions.
- **Antes de iniciar a Etapa 2**: preencher `.dev.vars` com a connection string real do NeonDB.

### Etapa 2 - Banco de Dados + Seed completo ✅
- Criar `app/db/schema.ts` com todas as tabelas
- Criar `app/db/relations.ts` e `app/db/client.ts`
- Gerar e rodar migration
- Criar `app/db/seed.ts` com dados prontos para teste:
  - Tenant: francisconetoemail@gmail.com / teste123
  - Diario: "Melina" com access_token gerado
  - Rotina "Manha" ☀️ (sort_order 0):
    - "Beber agua" - 10pts - binary - todos os dias
    - "Se arrumar" - 5pts - binary - todos os dias (Seg-Sex)
    - "Obedeceu" - 20pts - incremental - todos os dias
  - Rotina "Tarde" 🌤️ (sort_order 1):
    - "Fazer tarefa" - 15pts - binary - Seg-Sex
    - "Brincar educativo" - 10pts - binary - todos os dias
    - "Se comportou" - 20pts - incremental - todos os dias
  - Rotina "Noite" 🌙 (sort_order 2):
    - "Escovar os dentes" - 10pts - binary - todos os dias
    - "Guardar brinquedos" - 10pts - binary - todos os dias
    - "Dormir no horario" - 15pts - binary - todos os dias
- Rodar seed e imprimir no console o link de acesso: `http://localhost:8787/painel#token=<token>`

**Notas pos-implementacao:**
- `drizzle.config.ts` atualizado para carregar `.dev.vars` (padrao Wrangler) antes de `.env` como fallback. Usa `config()` do dotenv com paths explicitos.
- `.dev.vars` preenchido com `NEON_DATABASE_URL` real e `SESSION_SECRET`.
- `app/db/client.ts` exporta funcao `createDb(databaseUrl)` que recebe a URL como parametro (compativel com Cloudflare Workers onde env e passado por request via `context.cloudflare.env.NEON_DATABASE_URL`).
- `app/db/seed.ts` usa `dotenv` para ler `.dev.vars` e `.env` (roda via `npx tsx`, nao no Workers).
- Migration gerada em `drizzle/0000_broad_pyro.sql` e aplicada via `drizzle-kit push`.
- Schema usa `onDelete: "cascade"` em todas as FKs para limpeza automatica.
- Tipo `Database` exportado de `client.ts` para tipar o db nos loaders/actions.
- **Para a Etapa 3**: usar `createDb(context.cloudflare.env.NEON_DATABASE_URL)` nos loaders/actions do React Router para obter a instancia do banco. O token de acesso ao painel do seed atual e: `eb9bc459-a603-4404-bbb9-459ef8f21b2b`. Rodar `npm run db:seed` gera um novo token a cada execucao.

### Etapa 3 - Tela do Painel (marcacao de atividades) ✅
- Rota `/painel` + APIs `/api/painel` e `/api/painel/complete`
- Client-side le `#token=xxx`, valida via API, carrega atividades
- Logica de dia: abre no ultimo dia preenchido (MAX date em completions), ou dia atual
- Revelacao progressiva de rotinas:
  - Mostra so a primeira rotina
  - Ao marcar TODAS as binary da rotina, desbloqueia a proxima
  - Incremental nao bloqueia
- Cards de atividade:
  - Binary: botoes "Fiz" / "Nao Fiz"
  - Incremental: botoes "+" / "-" com contador
- Pontuacao total do dia no topo
- Touch-first (botoes 64px+)
- Ao final: fornecer link de teste para abrir no browser

**Notas pos-implementacao:**
- Rotas adicionadas em `app/routes.ts`: `painel`, `api/painel`, `api/painel/complete`.
- `api.painel.tsx` exporta apenas `loader` (GET). Recebe token via header `X-Access-Token`. Aceita query param `?date=YYYY-MM-DD` para navegar entre dias. Sem date, usa MAX(completions.date) ou data atual. Retorna JSON com `{ diary, date, dayOfWeek, routines[], totalPoints }`.
- `api.painel.complete.tsx` exporta apenas `action` (POST). Recebe `{ activityId, date, value }` no body JSON + token no header. Para binary: deleta completion anterior do dia e insere novo (upsert). Para incremental: sempre insere novo registro.
- `painel.tsx` e 100% client-side (sem loader/action server). Le `#token=xxx` do hash via `useEffect`. Faz fetch para as APIs com o token no header. Navegacao de dias com botoes prev/next.
- Componentes criados em `app/components/`: `PointsCounter.tsx`, `ActivityCardBinary.tsx`, `ActivityCardIncremental.tsx`, `RoutineSection.tsx`.
- Tipos `Activity`, `Routine`, `Completion` exportados de `painel.tsx` e importados pelos componentes.
- Revelacao progressiva: primeira rotina sempre desbloqueada. Proxima desbloqueia quando TODAS as binary da anterior tem pelo menos 1 completion.
- **Link de teste**: `http://localhost:5173/painel#token=<token>` (o token e o que foi impresso pelo seed, rodar `npm run db:seed` para obter um novo).
- **Para a Etapa 4**: a rota `/` (home.tsx) ainda mostra o Welcome do template. Na Etapa 4, substituir por redirect para `/login` ou `/diarios`. Os arquivos `app/lib/auth.server.ts`, `sessions.server.ts` e `require-auth.server.ts` ainda nao existem. A porta de dev pode ser 5173 (Vite) em vez de 8787 (Wrangler) dependendo de como rodar — verificar com `npm run dev`.

### Etapa 4 - Auth + Login (admin) ✅
- `app/lib/auth.server.ts`, sessions, require-auth
- Rotas `/login`, `/logout`
- `/` redireciona para `/login` ou `/diarios`

**Notas pos-implementacao:**
- `app/lib/sessions.server.ts`: usa `createCookieSessionStorage` do React Router. Cookie `__qd_session`, httpOnly, secure, sameSite=lax, 30 dias de duracao. Recebe `secret` como parametro (factory) porque no Cloudflare Workers o env so e acessivel no contexto do request.
- `app/lib/auth.server.ts`: exporta `login(db, email, password)` (valida com `bcrypt-ts`), `getUserId(request, sessionStorage)`, `createUserSession(sessionStorage, userId, redirectTo)` e `destroyUserSession(request, sessionStorage)`.
- `app/lib/require-auth.server.ts`: exporta `requireAuth(request, sessionSecret)` que retorna `userId` ou faz `throw redirect("/login")`. Uso nos loaders/actions das rotas admin: `const userId = await requireAuth(request, context.cloudflare.env.SESSION_SECRET)`.
- `app/routes/login.tsx`: loader verifica se ja esta logado (redireciona para `/diarios`). Action valida email/senha via `login()` e cria sessao. UI com form simples (email + senha), mensagem de erro inline, estado de submitting.
- `app/routes/logout.tsx`: action destroi sessao e redireciona para `/login`. Loader (GET) tambem redireciona para `/login` (seguranca).
- `app/routes/home.tsx`: agora so tem loader que verifica sessao e faz redirect para `/diarios` (logado) ou `/login` (nao logado). Componente Welcome do template foi removido.
- **Para a Etapa 5**: usar `requireAuth(request, context.cloudflare.env.SESSION_SECRET)` nos loaders/actions das rotas de diarios. A rota `/diarios` ainda nao existe — ao acessar sera 404. Criar o layout `diarios.tsx` com `<Outlet />` e header com botao de logout (fazer `<Form method="post" action="/logout">`). O `userId` retornado por `requireAuth` e o `tenant.id` — usar para filtrar diarios por tenant. A senha do seed e `teste123` e o email e `francisconetoemail@gmail.com`.

### Etapa 5 - CRUD Diarios ✅
- Lista de diarios (cards)
- Criar diario → gera token + 3 rotinas default
- Editar diario (mostrar link do painel copiavel)
- Deletar diario

**Notas pos-implementacao:**
- `routes.ts` atualizado com rotas aninhadas: `diarios.tsx` (layout) > `_index`, `novo`, `$diarioId` > `_index`, `editar`.
- `diarios.tsx`: layout autenticado com header sticky (app name + botao logout). Usa `requireAuth` no loader. Todas as sub-rotas herdam a autenticacao.
- `diarios._index.tsx`: lista de diarios do tenant como cards (grid responsivo 1/2/3 colunas). Cards linkam para `/diarios/:id` (rotinas). Botao "+ Novo Diario" no topo.
- `diarios.novo.tsx`: form com campos nome + emoji. Action cria o diario com `crypto.randomUUID()` como access_token e insere 3 rotinas padrao (Manha ☀️, Tarde 🌤️, Noite 🌙) automaticamente. Redireciona para `/diarios/:id` apos criacao.
- `diarios.$diarioId.tsx`: layout do diario. Loader valida que o diario pertence ao tenant (retorna 404 se nao). Mostra breadcrumb (Diarios / emoji+nome) e link "Editar". Renderiza `<Outlet />`.
- `diarios.$diarioId._index.tsx`: lista as rotinas do diario como cards (nome + icon + sort_order). Placeholder para Etapa 6 — nao tem CRUD de rotinas ainda, apenas exibicao.
- `diarios.$diarioId.editar.tsx`: form de edicao (nome + emoji) com actions via `intent`: `update` (salva), `delete` (remove diario + cascade), `regenerate-token` (novo UUID). Mostra link do painel copiavel com botao "Copiar" (usa `navigator.clipboard`). Zona de perigo com confirmacao de delete em 2 passos.
- Todas as rotas verificam ownership (tenant_id = userId) em loaders e actions. Cascade deletes no schema garantem limpeza automatica de rotinas/atividades/completions ao deletar diario.
- **Para a Etapa 6**: a rota `diarios.$diarioId._index.tsx` ja lista rotinas do diario. Implementar CRUD: criar `diarios.$diarioId.rotinas.nova.tsx` e `diarios.$diarioId.rotinas.$rotinaId.editar.tsx`. Adicionar actions de criar/editar/deletar rotina. Adicionar reordenacao (seta cima/baixo ou drag-and-drop) que atualiza `sort_order` via action. A rota de layout `diarios.$diarioId.tsx` ja carrega dados do diario e valida ownership — as sub-rotas de rotinas podem aproveitar isso. Lembrar de adicionar as novas rotas em `routes.ts` dentro do array de children de `:diarioId`.

### Etapa 6 - CRUD Rotinas ✅
- Lista de rotinas do diario (cards ordenados por sort_order)
- Criar, editar, deletar rotina
- Reordenar rotinas (drag-and-drop ou botoes seta cima/baixo nos cards)
- Atualizar sort_order via action ao reordenar

**Notas pos-implementacao:**
- `routes.ts` atualizado com 2 novas rotas dentro de `:diarioId`: `rotinas/nova` e `rotinas/:rotinaId/editar`.
- `diarios.$diarioId._index.tsx`: agora tem `action` com intents `move-up` e `move-down` que trocam o `sort_order` entre duas rotinas adjacentes. Cards em layout vertical (lista, nao grid) com setas ▲/▼ a esquerda e link "Editar" a direita. Botao "+ Nova Rotina" no topo.
- `diarios.$diarioId.rotinas.nova.tsx`: form com campos nome + emoji. Action calcula `max(sort_order) + 1` para colocar a nova rotina no final. Redireciona para `/diarios/:diarioId` apos criacao.
- `diarios.$diarioId.rotinas.$rotinaId.editar.tsx`: form de edicao (nome + emoji) com intents `update` e `delete`. Zona de perigo com confirmacao em 2 passos (mesmo padrao da edicao de diario). Cascade delete remove atividades e completions junto.
- Todas as rotas verificam ownership do diario (tenant_id = userId) em loaders e actions. Rotinas sao verificadas via `diary_id = params.diarioId`.
- **Para a Etapa 7**: a rota kanban sera `diarios.$diarioId.rotinas.$rotinaId.tsx` (ja prevista no plano). Precisa adicionar em `routes.ts` dentro dos children de `:diarioId`: `route("rotinas/:rotinaId", "routes/diarios.$diarioId.rotinas.$rotinaId.tsx")`. Os cards de rotina em `_index.tsx` devem linkar para `/diarios/:diarioId/rotinas/:rotinaId` (o kanban). Atualmente os cards so tem link "Editar" — adicionar um `<Link>` no card inteiro ou no nome para abrir o kanban. A rota de editar atividade sera `rotinas/:rotinaId/atividades/:atividadeId/editar` e a de criar sera `rotinas/:rotinaId/atividades/nova`. A lib `@hello-pangea/dnd` precisa ser instalada (`npm install @hello-pangea/dnd`). O schema `activity_days` ja tem `sort_order` por dia — o drag-and-drop deve atualizar essa coluna.

### Etapa 7 - Kanban de Atividades
- Instalar @hello-pangea/dnd
- Tela kanban: 7 colunas (Seg-Dom)
- Drag-and-drop para reordenar
- Cadastrar atividade: nome, pontos, tipo, dias
- Editar e deletar atividade

### Etapa 8 - PWA
- manifest.json (display: standalone, start_url: /painel)
- Service worker minimo
- Meta tags + registro SW

---

## Verificacao por etapa

### Apos Etapa 3 (principal):
1. `npm run dev`
2. Abrir link do painel com token (impresso no console pelo seed)
3. Ver atividades da Manha (Beber agua, Se arrumar, Obedeceu)
4. Marcar "Fiz" em Beber agua e Se arrumar → Tarde aparece
5. Testar "Nao Fiz" → tira pontos
6. Testar Obedeceu (incremental): varios cliques em "+" e "-"
7. Verificar pontuacao no topo
8. Fechar e reabrir → abre no ultimo dia preenchido

### Apos Etapa 7 (completo):
9. Login admin → CRUD diarios, rotinas, atividades
10. Kanban: arrastar atividades entre posicoes
11. Criar novo diario → copiar link → testar painel
