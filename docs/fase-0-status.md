# Status da Fase 0

Auditoria do código herdado do Lovable contra `docs/fase-0.md` e as regras do `regras-do-projeto.md`, feita antes de qualquer alteração funcional, e o registro de como cada uma das 9 etapas do plano resultante mudou esse estado. As 9 etapas estão concluídas — ver "Estado final da Fase 0" ao fim deste documento.

Legenda: ✅ Feito · 🟡 Parcial · ❌ Faltando

## 1. Base técnica e visual

| Item                                                      | Estado | Onde / observação                                                                                                                                                               |
| --------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TanStack Start + React + TS strict + Tailwind + shadcn    | ✅     | `package.json`, `tsconfig.json`, `components.json`                                                                                                                              |
| Zustand + Immer, three + R3F, Vitest                      | ✅     | `src/components/editor/store.ts`, `src/core/history.ts`                                                                                                                         |
| `core/units`, `can(user, feature)`                        | ✅     | `src/core/units.ts`, `src/core/permissions.ts`                                                                                                                                  |
| Pastas reservadas `engine/`, `workers/`, `addons/`        | ✅     | **(etapa 9)** criadas em `src/`, com um `README.md` cada explicando a que fase pertencem                                                                                        |
| `docs/licenses.md` com a licença de cada pacote           | ✅     | **(etapa 9)** todas as 77 dependências diretas (produção + desenvolvimento), conferidas em `node_modules/*/package.json`; nenhuma GPL/LGPL/AGPL                                 |
| Backend Supabase configurado só por variáveis de ambiente | 🟡     | continua apontando para o Supabase gerenciado pelo Lovable Cloud — só muda quando você criar o projeto novo e preencher o `.env` local (ver seção 3 da minha resposta original) |

## 2. Contas e perfis

| Item                                                | Estado | Onde / observação                                                                             |
| --------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------- |
| Cadastro/login e-mail+senha, confirmação por e-mail | ✅     | `src/components/app/AuthScreen.tsx`                                                           |
| Login Google                                        | ✅     | nativo via `supabase.auth.signInWithOAuth` (etapa 2)                                          |
| Recuperação de senha                                | ✅     | fluxo "Esqueci minha senha" + tela de nova senha via evento `PASSWORD_RECOVERY` (etapa 2)     |
| Saída segura                                        | ✅     | `ProjectsDashboard.tsx` (`supabase.auth.signOut()`)                                           |
| `profiles` (id, nome, avatar_url, created_at)       | ✅     | `supabase/migrations/20250101000000_phase_zero_foundation.sql`, preenchido em `bootstrapUser` |
| `user_preferences` (emulateNumpad, historyLimit)    | ✅     | lida e gravada via o novo diálogo Editar → Preferências (etapa 7); usada pelo Viewport        |
| Sessão sincronizada na navegação                    | ✅     | `src/routes/__root.tsx` (`onAuthStateChange`) + `_authenticated/route.tsx`                    |
| Convites pendentes processados no 1º login          | ✅     | `bootstrapUser` em `src/lib/projects.functions.ts`                                            |

## 3. Banco, segurança e arquivos

- Tabelas `projects`, `project_members`, `project_invites`, `share_links`, `project_locks`, `user_preferences` com RLS: ✅, bem implementado (regras de acesso vivem no banco via `is_project_owner`/`is_project_member`/`can_edit_project`, não só no app).
- Papéis salvos em inglês (`editor`/`commenter`/`viewer`) com rótulos em português só na UI: ✅ — já segue o `regras-do-projeto.md`.
- **Contraria o `regras-do-projeto.md` (regra 20)**: migrações vivem em `drizzle/migrations` via drizzle-kit + `LOVABLE_DB_MIGRATION_URL`, não em `supabase/migrations`. Corrigido nesta etapa (SQL copiado para `supabase/migrations/`).
- Token bruto nunca persistido, só hash: ✅ (`tokenHash` em `projects.functions.ts`).
- Documento no Storage em `projects/{id}/document.json` + políticas de Storage: ✅.
- Chave secreta do Supabase só no servidor, importada dentro de handlers (nunca top-level em rota/`*.functions.ts`): ✅ — boa prática já seguida.

## 4. Painel de projetos

✅ quase completo: abas, criar/renomear/duplicar/excluir com confirmação, cartão com nome/dono/data/papel, exclusão em cascata (Storage + linhas relacionadas via `ON DELETE CASCADE`), duplicação sem copiar membros/convites/links/travas.

✅ **(etapa 8)** `ProjectsDashboard.tsx` ganhou estado de erro de verdade: falha ao carregar a lista mostra um painel com "Tentar novamente" (em vez de ficar preso em "Carregando…" para sempre); falha em criar/renomear/duplicar/excluir mostra um banner dispensável acima da lista, em vez de falhar em silêncio.

## 5. Compartilhamento

✅ modal só para o dono, convite por e-mail com papel, alterar papel/remover membro, link com revogação, página pública de convite exigindo login, fallback de "e-mail não enviado" com link copiável (permitido pela própria spec).

✅ **(etapa 8)** `ShareDialog` ganhou um campo "Expira em" (opcional) ao gerar o link, e os links ativos agora mostram a data de validade quando têm uma.

## 6. Documento e workspaces

✅ **(etapa 5)** `EditorShell` agora renderiza `document.workspaces[activeWorkspaceId].layout` de verdade, através de `src/core/areas.ts` (`splitArea`, `joinArea`, `setAreaEditor`, `resizeSplit`, puras e testadas em `areas.test.ts`) e novas ações no `store.ts`. Split horizontal/vertical, juntar área vizinha, trocar o editor e redimensionar (arrastando o `ResizableHandle`) alteram o documento de verdade e persistem por autosave; `onLayoutChanged` só grava quando `meta.isUserInteraction` é `true`, então montar a tela não marca o documento como sujo à toa.

⚠️ **Mudança de comportamento**: como o documento inicial (`createDocument()`) sempre teve só uma área (`viewport-main`), projetos — novos e já existentes — agora abrem com um único Viewport 3D em vez do layout fixo de 3 painéis que a tela mostrava antes (esse fixo nunca vinha do documento, era um `useState` local ignorando o schema). Bate com o próprio teste de aceite do `fase-0.md` ("dividir o viewport em 3 áreas"), mas é visualmente diferente do que existia até a etapa 4.

🟡 Leitura/permissão: as ações de layout **não** são bloqueadas por `editable` (diferente de mover objetos) — de propósito, porque a spec permite reorganizar o layout mesmo em modo leitura, contanto que não persista. Isso funciona hoje porque `persist()` só grava quando `lock === "owned"`; não criei um caminho local separado para isso.

## 7. Casca do editor e áreas

- ✅ **(etapa 4)** Menus **Arquivo** (Salvar, Baixar cópia) e **Editar** (Desfazer, Refazer) viram dropdowns reais alimentados pelo `CommandRegistry`; **Adicionar** (Cubo/Esfera/Plano) idem; **Ajuda** abre a paleta F3. **Visualizar** e **Janela** ficam desabilitados (nada implementado ainda nesta fase); "Novo workspace" também desabilitado em vez de disparar `alert(...)`.
- ✅ **(etapa 7)** **Visualizar** deixou de ser um botão desabilitado: agora é um dropdown com Vista frontal/direita/topo e Perspectiva/Ortográfica, chamando `store.requestView`/`requestToggleOrtho` — um "broadcast" que qualquer `Viewport` montado aplica à própria câmera, já que o menu (ao contrário do atalho de teclado) não sabe sobre qual viewport o usuário está. **Janela** continua desabilitado (workspaces adicionais seguem fora do escopo da Fase 0).
- ✅ **(etapa 4)** Editores futuros (Moldes 2D, Tabela de Medidas, Nós, Console Python) agora aparecem no seletor de área, desabilitados, com o aviso "Disponível na Fase X".
- ✅ **(etapa 4)** Botão Salvar do cabeçalho fica `disabled` em modo leitura, em vez de no-op silencioso.
- ✅ **(etapa 5)** O botão "Maximizar área" agora funciona (mostra só aquela área em tela cheia, com um botão para restaurar); "juntar" fica desabilitado quando a área não tem uma vizinha (é a única área do workspace).

## 8. Viewport, seleção e propriedades

- ✅ Grade, eixos, gizmo clicável, seleção com contorno visível.
- ✅ **(etapa 7)** Modo gráfico real: `Viewport.tsx` cria de fato um `THREE.WebGPURenderer` (`three/webgpu`) via um `gl` factory assíncrono no `<Canvas>`; a própria classe já cai para o backend WebGL2 sozinha quando WebGPU não existe (`getFallback` do three.js), e o app só lê `renderer.backend.isWebGPUBackend` depois do `init()` para decidir o texto da barra de status — nunca mais um "achismo" a partir de `navigator.gpu`.
  - **Risco assumido e não testável por mim**: sob WebGPU real, `<Outlines>` do drei (que usava um `ShaderMaterial` GLSL cru) não seria convertido automaticamente pelo `StandardNodeLibrary` do three.js. Troquei o contorno de seleção por uma técnica de "casco invertido" (segunda malha, escala 1.05×, `side: THREE.BackSide`, `MeshBasicMaterial`), que é suportada nativamente nos dois backends. Não consegui testar visualmente em WebGPU real (exige conta autenticada + hardware/navegador com WebGPU) — vale conferir.
- ✅ **(etapa 7)** Navegação do mouse corrigida: `mouseButtons={{ MIDDLE: 0 }}` (só o botão do meio orbita); Shift+meio já vira "deslocar" de graça, porque o `OrbitControls` do three.js troca ROTATE→PAN sozinho quando Ctrl/Meta/Shift está pressionado. Botão esquerdo fica livre para seleção; botão direito fica livre para cancelar o G/R/S.
- ✅ **(etapa 7)** Vistas numéricas (Numpad1/3/7 = frente/direita/topo, Ctrl inverte, Numpad5 alterna perspectiva/ortográfica) e a preferência **Emular teclado numérico** (lida de `user_preferences`, com um diálogo novo em Editar → Preferências para ativá-la e ajustar o limite do histórico — não existia UI nenhuma para gravar essa preferência antes). **Não testado visualmente** (câmera/`lookAt`/`up` para a vista de topo é matemática padrão do three.js, mas só vejo funcionando de verdade com os olhos de alguém no navegador).
- ❌ Ainda falta: edição de campos por arraste (scrub) nas Propriedades — só inputs numéricos existem. Não estava no escopo desta etapa; fica para uma limpeza futura.

## 9. Comandos, transformação e histórico

- ✅ **(etapa 4)** `CommandRegistry` agora é a fonte única: `EditorShell` registra os comandos (Adicionar cubo/esfera/plano, Desfazer, Refazer, Salvar, Baixar cópia, Atalhos) com id/atalho/contexto, e os menus, o F3 (que agora mostra o atalho de cada comando) e Ctrl+S/Ctrl+Z/Ctrl+Shift+Z consomem esse mesmo registro via `registry.execute(...)`.
- ✅ **(etapa 6)** Máquina de estado modal G/R/S em `src/core/transformModal.ts` (pura, testada): G/R/S inicia, X/Y/Z trava o eixo, dígitos/`-`/`.` digitam o valor exato, Backspace apaga, Enter ou clique esquerdo confirma, Esc ou clique direito cancela sem alterar nada. `G → X → 2 → Enter` desloca exatamente 2 m, conforme o critério de aceite. A pré-visualização do arraste vive em `store.transformPreview` (nunca passa por `change()`, então não é undoável nem suja o documento); só o `setVector` final ao confirmar é salvo. **Simplificação assumida**: sem eixo travado, mouse e teclado não alteram nada — o arraste livre no plano de tela (sem eixo) fica para uma fase futura, já que nenhum critério de aceite da Fase 0 exige isso.
- ✅ **(etapa 6)** `history.jumpTo` agora navega nos dois sentidos (undo e redo) e alimenta o painel **Editar → Histórico**, que lista todo o histórico (incluindo "Estado inicial") e pula para qualquer ponto com um clique; desabilitado quando `!store.editable`, igual a desfazer/refazer.
- ✅ **(etapa 6)** Conversão graus↔radianos extraída para `src/core/angles.ts` (`radToDeg`/`degToRad`), com teste, e usada tanto no campo de rotação das Propriedades quanto na máquina de transformação modal.

## 10. Salvamento e trava

✅ muito bem implementado: RPC atômica (`FOR UPDATE`), heartbeat 30s/expiração 90s, autosave 2s + Ctrl+S, conflito de versão otimista, aviso com baixar cópia/recarregar, `updated_at` só após gravação confirmada.

✅ **(etapa 8)** `EditorShell.tsx` agora mostra o `holderName` de verdade que a RPC já retornava. De quebra, achei e corrigi um segundo bug no mesmo trecho: a checagem usava `status.includes("same_user")`, mas a RPC nunca retorna essa string — o status real é `"own-other-session"`. Isso significava que abrir o mesmo projeto em duas abas da mesma conta caía silenciosamente no ramo "outra pessoa" em vez de oferecer "Assumir edição nesta aba" (o teste de aceite nº 12 do `fase-0.md`). A comparação agora usa o status tipado da própria função (`r.status`), sem `String(...).includes(...)`.

## 11. Testes

✅ existem e passam: registro de comandos (isolado), undo/redo + `jumpTo` nos dois sentidos, unidades mm↔m, graus↔radianos, `can()`, migração do documento, split/join/redimensionar/trocar editor da árvore de áreas, máquina de estado G/R/S (23/23 testes, `bun run test`).

🟡 A etapa 7 (WebGPU/fallback, câmera das vistas numéricas, `OrbitControls`) não ganhou teste automatizado novo — é integração com APIs de GPU/DOM que o Vitest (ambiente Node) não consegue exercitar; só dá para validar de verdade num navegador.

❌ Não havia scripts `test`/`typecheck` no `package.json` (regra 18 do `regras-do-projeto.md`) — **corrigido nesta etapa**.

✅ `bun run lint` estava com 484 erros (quase todos formatação Prettier, herdados do estilo denso gerado pelo Lovable) — corrigido nesta etapa com `prettier --write` + `eslint --fix`, mais 2 ajustes manuais mínimos (ternário usado como statement em `EditorShell.tsx`, `let`→`const` em `previewAuthStorage.ts`). Restam só 15 avisos pré-existentes de `react-hooks/exhaustive-deps` e `react-refresh` (padrão em projetos shadcn), sem erros.

## 12. Checklist manual de aceite (`docs/fase-0.md`)

Avaliação por leitura de código — **não é a mesma coisa que ter rodado no navegador**. Cada linha diz o que sustenta a expectativa e, quando existe, o risco de não ter sido visto com os próprios olhos. Confirmação final é sua, como o `regras-do-projeto.md` já estabelece.

| #   | Teste                                                                           | Avaliação                                                                                                                                                                                                               |
| --- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Criar conta, projeto e layout; recarregar e confirmar persistência              | Sustentado por `createProject`/`loadProject`/`saveProject` e pelo documento persistido no Storage. Alta confiança.                                                                                                      |
| 2   | Dividir em 3 áreas, trocar uma para Outliner, recarregar                        | Sustentado pela árvore de áreas real (etapa 5) + autosave. Alta confiança na lógica; não vi renderizado.                                                                                                                |
| 3   | `G → X → 2 → Enter`, depois `Ctrl+Z`                                            | O cálculo exato (`+2` em X) tem teste unitário direto (`transformModal.test.ts`). A integração mouse/teclado no `Viewport` não foi vista rodando.                                                                       |
| 4   | `R` → `Esc`: nada muda                                                          | Cancelar nunca chama `setVector`; o documento não é tocado. Alta confiança na lógica, não visto rodando.                                                                                                                |
| 5   | Criar esfera por F3                                                             | `add-sphere` está registrado no `CommandRegistry` e aparece na busca. Alta confiança.                                                                                                                                   |
| 6   | Leitor não altera nada, nem por atalhos                                         | `store.add/rename/toggleVisible/setVector/undo/redo/jumpTo` checam `editable`; G/R/S no `Viewport` também. Alta confiança.                                                                                              |
| 7   | Duas contas diferentes: a segunda abre em somente leitura                       | RPC `acquire_project_lock` retorna `locked`/`holderName` para um usuário diferente; `EditorShell` trata esse ramo desde sempre (não foi afetado pelo bug da etapa 8, que era só sobre a _mesma_ conta). Alta confiança. |
| 8   | Revogar link, bloqueio imediato                                                 | `revokeShareLink` grava `revoked_at`; `consumeInvite` checa `!link.revoked_at`. Alta confiança.                                                                                                                         |
| 9   | Barra de status mostra o modo gráfico real                                      | Depende da detecção real de WebGPU da etapa 7 — não vi rodando.                                                                                                                                                         |
| 10  | Todo menu/controle executa uma ação ou aparece desabilitado                     | Percorri manualmente cada menu/botão do `EditorShell`/`Viewport`/`ProjectsDashboard`/`ShareDialog` no código; não sobrou nenhum com `onClick` vazio ou `alert()`. Alta confiança.                                       |
| 11  | "Emular numpad" não é herdado entre contas                                      | `user_preferences` é uma tabela por `user_id`, isolada por RLS; cada login busca a própria linha. Alta confiança.                                                                                                       |
| 12  | Mesma conta, duas abas: 2ª mostra "Assumir edição"; 1ª vira leitura em ~30s     | O bug que quebrava exatamente isso foi corrigido na etapa 8 (`own-other-session` em vez de `same_user`). Alta confiança na correção; não vi rodando com duas abas de verdade.                                           |
| 13  | Depois de assumir na aba 2, salvar na aba 1 mostra aviso + permite baixar cópia | `saveProject` rejeita por lock/versão; `EditorShell` mostra o aviso com "Baixar cópia" e "Recarregar". Não tocado nas etapas 1–8, presente desde o início. Alta confiança.                                              |
| 14  | Leitor divide uma área e recarrega: layout volta ao salvo                       | Ações de layout não são bloqueadas por `editable`, mas `persist()` só grava com `lock === "owned"` — um leitor nunca tem essa trava. Alta confiança na lógica, não vi rodando.                                          |
| 15  | Excluir projeto com link/convite ativos: tudo para de funcionar e a pasta some  | `deleteProject` remove o arquivo do Storage; `ON DELETE CASCADE` cuida de `project_members`/`project_invites`/`share_links`/`project_locks`. Não tocado nas etapas 1–8. Alta confiança.                                 |

## Resíduos do Lovable

**Ainda acopla ao Lovable Cloud (pendente — depende do projeto Supabase novo):**

- `.env` aponta para o projeto Supabase gerenciado pelo Lovable Cloud (`flrkhnuintfetxbxzcme`, visível em `supabase/config.toml`). Só é substituído quando o `.env` local apontar para o projeto Supabase próprio.

**Deixado como está intencionalmente, fora do escopo de limpeza de resíduos:**

- `@lovable.dev/vite-tanstack-config` (`vite.config.ts`) — pacote público no npm (não bloqueia `bun install`), mas embute defaults de Cloudflare/nitro e detecção de sandbox do Lovable. Trocá-lo por uma configuração Vite própria é uma mudança de arquitetura maior (a regra 5 do `regras-do-projeto.md` exige pedido explícito antes de trocar stack/arquitetura) — decisão fica para quando/se for necessário.

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
4. ✅ **Casca do editor: comandos e menus** — `EditorShell` ligado ao `CommandRegistry` real, menus sem ação desabilitados, editores futuros listados com "Disponível na Fase X".
5. ✅ **Árvore de áreas** — split/resize/join real, persistido em `document.workspaces`.
6. ✅ **Transformação modal G/R/S + histórico navegável** — conversão graus/radianos extraída para `core/`, máquina de estado G/R/S, painel de histórico.
7. ✅ **Viewport fiel ao Blender** — WebGPU real com fallback verdadeiro, botão do meio/Shift+meio, vistas numéricas + preferência de numpad. Peça pendente de teste visual — ver seção 8.
8. ✅ **Correções de UX de trava e erro** — `holderName` real (e um bug de detecção de "mesma conta, outra aba" corrigido de quebra), estado de erro no painel de projetos, campo de validade no link de compartilhamento.
9. ✅ **Fechamento** — `docs/licenses.md` completo, pastas `engine/`/`workers/`/`addons/` criadas, checklist de aceite avaliado por leitura de código (seção 12), este documento atualizado com o estado final.

Cada etapa termina com `bun run test`, `bun run typecheck` (e lint quando aplicável) passando, e um commit em português.

## Estado final da Fase 0

As 9 etapas do plano estão concluídas. O que resta, e não depende de mim escrever mais código:

- **Trocar o backend**: o `.env` ainda aponta para o Supabase do Lovable Cloud. Falta você criar o projeto Supabase próprio, aplicar `supabase/migrations/` e preencher o `.env` local — os passos exatos estão na minha resposta original (seção 3), antes da etapa 1.
- **Testar no navegador**: o `regras-do-projeto.md` deste projeto define que testes no navegador são seus. A seção 12 lista os 15 passos do `docs/fase-0.md` com minha avaliação por leitura de código, mas nenhum foi confirmado com os próprios olhos rodando. As peças de maior risco, por dependerem de renderização 3D real e de uma sessão autenticada que não tenho, são: o contorno de seleção sob WebGPU real (item 72), as vistas numéricas/câmera (item 74) e o modo gráfico na barra de status (item 9 da seção 12).
- **Dívida conhecida, fora do escopo de qualquer etapa**: edição de campos por arraste (scrub) nas Propriedades continua ausente (seção 8); é uma peça pequena e isolada, mas não estava em nenhuma etapa deste plano.
