# Wasabii Art

Software web de modelagem 3D de vestuário para moda e produção: moldes 2D → costura → simulação física do tecido sobre avatar → gradação, medidas e ficha técnica.

Projeto em desenvolvimento local. O backend é um projeto [Supabase](https://supabase.com) próprio (Auth, Postgres, Storage).

## Status

Em desenvolvimento da **Fase 0 — Fundação** (contas, projetos, compartilhamento, trava de edição e a casca do editor). Veja o estado detalhado em [docs/fase-0-status.md](docs/fase-0-status.md).

## Stack

TanStack Start + React + TypeScript (strict) + Tailwind + shadcn/ui, Zustand + Immer, three.js + React Three Fiber, Supabase (Auth, Postgres, Storage) e Vitest.

## Rodando localmente

Requer [Bun](https://bun.sh).

```sh
bun install
cp .env.example .env   # preencha com as chaves do seu projeto Supabase
bunx supabase login
bunx supabase link --project-ref <ref-do-seu-projeto>
bunx supabase db push   # aplica as migrações de supabase/migrations/
bun run dev
```

No painel do Supabase, configure também:

- Storage → bucket `projects` (privado).
- Auth → Providers → Email (com confirmação) e Google, se for usar login com Google.
- Auth → URL Configuration → adicione `http://localhost:3000/**` (e o domínio de produção depois).

## Scripts

```sh
bun run dev         # servidor de desenvolvimento
bun run build       # build de produção
bun run test        # testes (Vitest)
bun run typecheck   # checagem de tipos (tsc --noEmit)
bun run lint        # eslint
bun run format      # prettier --write
```
