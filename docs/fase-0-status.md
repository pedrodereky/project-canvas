# Status da Fase 0 — auditoria

Auditoria do código herdado do Lovable contra `docs/fase-0.md` e as regras do `CLAUDE.md`. Feita antes de qualquer alteração funcional; serve de base para o plano de etapas no fim deste documento.

Legenda: ✅ Feito · 🟡 Parcial · ❌ Faltando

## 1. Base técnica e visual

| Item                                                      | Estado | Onde / observação                                                                                                    |
| --------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------- |
| TanStack Start + React + TS strict + Tailwind + shadcn    | ✅     | `package.json`, `tsconfig.json`, `components.json`                                                                   |
| Zustand + Immer, three + R3F, Vitest                      | ✅     | `src/components/editor/store.ts`, `src/core/history.ts`                                                              |
| `core/units`, `can(user, feature)`                        | ✅     | `src/core/units.ts`, `src/core/permissions.ts`                                                                       |
| Pastas reservadas `engine/`, `workers/`, `addons/`        | ❌     | não existem no repositório                                                                                           |
| `docs/licenses.md` com a licença de cada pacote           | 🟡     | lista só 6 pacotes; faltam `@supabase/supabase-js`, `@tanstack/*`, `@radix-ui/*`, `zod`, `react`, `tailwindcss` etc. |
| Backend Supabase configurado só por variáveis de ambiente | 🟡     | hoje aponta para o Supabase gerenciado pelo Lovable Cloud (ver seção "Resíduos")                                     |

## 2. Contas e perfis

| Item                                                | Estado             | Onde / observação                                                                             |
| --------------------------------------------------- | ------------------ | --------------------------------------------------------------------------------------------- |
| Cadastro/login e-mail+senha, confirmação por e-mail | ✅                 | `src/components/app/AuthScreen.tsx`                                                           |
| Login Google                                        | ✅                 | nativo via `supabase.auth.signInWithOAuth` (etapa 2)                                          |
| Recuperação de senha                                | ✅                 | fluxo "Esqueci minha senha" + tela de nova senha via evento `PASSWORD_RECOVERY` (etapa 2)     |
| Saída segura                                        | ✅                 | `ProjectsDashboard.tsx` (`supabase.auth.signOut()`)                                           |
| `profiles` (id, nome, avatar_url, created_at)       | ✅                 | `supabase/migrations/20250101000000_phase_zero_foundation.sql`, preenchido em `bootstrapUser` |
| `user_preferences` (emulateNumpad, historyLimit)    | ✅ tabela / ❌ uso | tabela e RLS existem; preferência de numpad nunca é lida pelo Viewport                        |
| Sessão sincronizada na navegação                    | ✅                 | `src/routes/__root.tsx` (`onAuthStateChange`) + `_authenticated/route.tsx`                    |
| Convites pendentes processados no 1º login          | ✅                 | `bootstrapUser` em `src/lib/projects.functions.ts`                                            |

## 3. Banco, segurança e arquivos

- Tabelas `projects`, `project_members`, `project_invites`, `share_links`, `project_locks`, `user_preferences` com RLS: ✅, bem implementado (regras de acesso vivem no banco via `is_project_owner`/`is_project_member`/`can_edit_project`, não só no app).
- Papéis salvos em inglês (`editor`/`commenter`/`viewer`) com rótulos em português só na UI: ✅ — já segue o `CLAUDE.md`.
- **Contraria o `CLAUDE.md` (regra 20)**: migrações vivem em `drizzle/migrations` via drizzle-kit + `LOVABLE_DB_MIGRATION_URL`, não em `supabase/migrations`. Corrigido nesta etapa (SQL copiado para `supabase/migrations/`).
- Token bruto nunca persistido, só hash: ✅ (`tokenHash` em `projects.functions.ts`).
- Documento no Storage em `projects/{id}/document.json` + políticas de Storage: ✅.
- Chave secreta do Supabase só no servidor, importada dentro de handlers (nunca top-level em rota/`*.functions.ts`): ✅ — boa prática já seguida.

## 4. Painel de projetos

✅ quase completo: abas, criar/renomear/duplicar/excluir com confirmação, cartão com nome/dono/data/papel, exclusão em cascata (Storage + linhas relacionadas via `ON DELETE CASCADE`), duplicação sem copiar membros/convites/links/travas.

🟡 Falta estado de erro explícito em `ProjectsDashboard.tsx` — sem tratamento nem mensagem quando uma chamada ao servidor falha.

## 5. Compartilhamento

✅ modal só para o dono, convite por e-mail com papel, alterar papel/remover membro, link com revogação, página pública de convite exigindo login, fallback de "e-mail não enviado" com link copiável (permitido pela própria spec).

🟡 `ShareDialog` nunca deixa definir validade do link — `expiresAt` é sempre `null`, embora o backend (`createShareLink`) já aceite essa data.

## 6. Documento e workspaces

❌ **Gap grande**: `EditorShell.tsx` mantém `areas` como `useState` local plano, desconectado da árvore recursiva `workspaces[].layout` que já existe em `src/core/document.ts`. Não há split vertical/horizontal real, não há "juntar áreas", e o layout não é salvo nem restaurado do documento. O teste de aceite "dividir em 3 áreas, trocar uma para Outliner e recarregar" falha hoje.

## 7. Casca do editor e áreas

- ❌ Menus **Arquivo/Editar/Visualizar/Janela/Ajuda** são botões sem nenhuma ação e não aparecem desabilitados — viola a regra 2 do `CLAUDE.md` ("nenhum botão sem ação").
- ❌ Editores futuros (Moldes 2D, Nós, Console Python, Tabela de Medidas) nem aparecem no seletor de área, muito menos desabilitados com o aviso "Disponível na Fase X".
- 🟡 Botões Salvar/Adicionar continuam clicáveis em modo leitura, mas fazem no-op silencioso em vez de desabilitar/ocultar.

## 8. Viewport, seleção e propriedades

- ✅ Grade, eixos, gizmo clicável, seleção com contorno visível.
- ❌ **"Modo gráfico" simulado**: a barra de status escreve "WebGPU" só checando `navigator.gpu`, mas o `<Canvas>` em `Viewport.tsx` nunca inicializa de fato um `WebGPURenderer` — dado apresentado como real sem ser. Viola a regra 1 do `CLAUDE.md` ("nunca simular funcionalidade").
- 🟡 Navegação do mouse incorreta: `mouseButtons={{LEFT:0,MIDDLE:0,RIGHT:2}}` mapeia botão esquerdo e do meio para o mesmo ROTATE; não existe Shift+meio para deslocar.
- ❌ Vistas numéricas (1/3/7, Ctrl inverte, 5 ortho/perspectiva) e a preferência "emular numpad": ausentes.
- ❌ Edição de campos por arraste (scrub): só inputs numéricos existem.

## 9. Comandos, transformação e histórico

- 🟡 `CommandRegistry` (`src/core/commands.ts`) existe e tem teste, mas **não é usado em lugar nenhum da UI** — o F3 do `EditorShell` usa um array ad-hoc próprio, sem id/atalho/contexto, o oposto do que a spec pede ("menus, atalhos e F3 consomem o mesmo registro").
- ❌ **Não existe** a máquina de estado modal G/R/S (trava de eixo, entrada numérica, confirmar/cancelar) — é o critério de aceite mais citado no `fase-0.md` (`G → X → 2 → Enter`).
- ❌ `history.jumpTo` existe mas não é usado; não há painel "Editar → Histórico" navegável.

## 10. Salvamento e trava

✅ muito bem implementado: RPC atômica (`FOR UPDATE`), heartbeat 30s/expiração 90s, autosave 2s + Ctrl+S, conflito de versão otimista, aviso com baixar cópia/recarregar, `updated_at` só após gravação confirmada.

❌ **Bug real**: a RPC `acquire_project_lock` retorna `holderName`, mas `EditorShell.tsx` descarta esse dado e sempre mostra "Em edição por outra pessoa", nunca o nome de fato.

## 11. Testes

✅ existem e passam: registro de comandos (isolado), undo/redo, unidades mm↔m, `can()`, migração do documento (5/5 testes, `bun run test`).

❌ Falta teste de conversão graus/radianos — a lógica está inline em `EditorShell.tsx`, deveria estar em `core/` como as demais regras de domínio.

❌ Não havia scripts `test`/`typecheck` no `package.json` (regra 18 do `CLAUDE.md`) — **corrigido nesta etapa**.

✅ `bun run lint` estava com 484 erros (quase todos formatação Prettier, herdados do estilo denso gerado pelo Lovable) — corrigido nesta etapa com `prettier --write` + `eslint --fix`, mais 2 ajustes manuais mínimos (ternário usado como statement em `EditorShell.tsx`, `let`→`const` em `previewAuthStorage.ts`). Restam só 15 avisos pré-existentes de `react-hooks/exhaustive-deps` e `react-refresh` (padrão em projetos shadcn), sem erros.

## Resíduos do Lovable

**Ainda acopla ao Lovable Cloud (pendente — depende do projeto Supabase novo):**

- `.env` aponta para o projeto Supabase gerenciado pelo Lovable Cloud (`flrkhnuintfetxbxzcme`, visível em `supabase/config.toml`). Só é substituído quando o `.env` local apontar para o projeto Supabase próprio.

**Deixado como está intencionalmente, fora do escopo de limpeza de resíduos:**

- `@lovable.dev/vite-tanstack-config` (`vite.config.ts`) — pacote público no npm (não bloqueia `bun install`), mas embute defaults de Cloudflare/nitro e detecção de sandbox do Lovable. Trocá-lo por uma configuração Vite própria é uma mudança de arquitetura maior (a regra 5 do `CLAUDE.md` exige pedido explícito antes de trocar stack/arquitetura) — decisão fica para quando/se for necessário.

**Removido na etapa 3:**

- `@lovable.dev/cloud-auth-js` (etapa 2) e agora `.lovable/` (bookkeeping do Lovable), `AGENTS.md` (aviso de sync que só fazia sentido com o Lovable ativo), `roadmap.md` (superado por este documento e por `docs/fase-0.md`).
- `drizzle/`, `drizzle.config.ts` e as dependências `drizzle-kit`, `drizzle-orm`, `postgres` — só existiam para empurrar migração ao Postgres do Lovable Cloud via `LOVABLE_DB_MIGRATION_URL`; o SQL já estava copiado em `supabase/migrations/`.
- `src/integrations/supabase/cron-auth.ts` — código morto (não importado por ninguém), usava `LOVABLE_CRON_SECRET*`.
- `src/integrations/supabase/previewAuthStorage.ts` — brokering de auth só ativo dentro do iframe de preview do Lovable; `client.ts` agora deixa o supabase-js usar seu `localStorage` padrão no navegador.
- `src/lib/lovable-error-reporting.ts` → virou `src/lib/error-reporting.ts`, sem a dependência de `window.__lovableEvents`/`__lovableReportRuntimeError` (globais que só existiam dentro do editor do Lovable).
- Cabeçalhos "Do not edit — auto-generated" e a mensagem "Connect Supabase in Lovable Cloud." nos arquivos de `src/integrations/supabase/`.
- Meta tag `twitter:site: @Lovable` em `src/routes/__root.tsx`.
- Entradas mortas (`@lovable.dev/mcp-js`, `@lovable.dev/email-js`, `@lovable.dev/webhooks-js`, que nem estavam nas dependências) removidas de `bunfig.toml`.
- `README.md` reescrito com instruções reais do projeto, sem a seção "Build with Lovable".

## Plano de etapas para concluir a Fase 0

1. ✅ **Infra e tooling** — scripts `test`/`typecheck`, migrações copiadas para `supabase/migrations/`, `.env.example`.
2. ✅ **Desacoplar login do Lovable** — trocar Google OAuth para `supabase.auth.signInWithOAuth`, remover `src/integrations/lovable/`, adicionar recuperação de senha.
3. ✅ **Limpeza de resíduos** — removidos `.lovable/`, `drizzle/*`, dependências mortas do Lovable, headers "auto-generated"; README reescrito; `roadmap.md`/`AGENTS.md` removidos.
4. **Casca do editor: comandos e menus** — ligar `EditorShell` ao `CommandRegistry` real, desabilitar/ocultar itens de menu sem ação, listar editores futuros desabilitados com "Disponível na Fase X".
5. **Árvore de áreas** — split/resize/join real, persistido em `document.workspaces`.
6. **Transformação modal G/R/S + histórico navegável** — extrair conversão graus/radianos para `core/`, implementar a máquina de estado G/R/S, painel de histórico.
7. **Viewport fiel ao Blender** — WebGPU real com fallback verdadeiro, botão do meio/Shift+meio, vistas numéricas + preferência de numpad.
8. **Correções de UX de trava e erro** — mostrar `holderName` real, desabilitar (não só no-op) controles em somente leitura, estado de erro no painel, campo de validade no link de compartilhamento.
9. **Fechamento** — completar `docs/licenses.md`, rodar checklist de aceite completo (automatizado + os 15 passos manuais do `docs/fase-0.md`), atualizar este documento com o estado final.

Cada etapa termina com `bun run test`, `bun run typecheck` (e lint quando aplicável) passando, e um commit em português.
