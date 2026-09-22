# Fase 0 — Fundação

## Objetivo

Entregar a primeira versão funcional do aplicativo: autenticação, projetos persistentes, compartilhamento seguro, trava de edição e uma casca de editor 3D capaz de organizar áreas, manipular primitivas e desfazer/refazer ações.

Ficam explicitamente fora desta fase: moldes, física, edição de materiais, comentários e cobrança.

## 1. Base técnica e visual

- Substituir a tela inicial vazia por uma experiência de produto em português, com identidade visual própria de software 3D profissional, adaptada a desktop e notebook.
- Criar páginas públicas de entrada/autenticação e páginas protegidas para o painel e o editor.
- Configurar Lovable Cloud para autenticação, banco e Storage.
- Adotar TanStack Start, React, TypeScript strict, Tailwind e shadcn/ui; lógica sensível ficará em server functions e segredos somente no servidor Cloudflare Workers, sem binários nativos nem processamento pesado.
- Adicionar Zustand + Immer, Three.js + React Three Fiber, WebGPURenderer com fallback WebGL2 e Vitest. Física, nós e Python permanecem fora desta fase, reservando respectivamente `engine/`, `workers/` e `addons/` para as fases futuras.
- Manter documento, comandos, unidades, migração e demais regras de domínio em TypeScript puro sob `core/`, sem React e fora das rotas; interface ficará em `components/` e `routes/`.
- Criar `core/units` para mm ↔ m e unidade de exibição, além de `can(user, feature)` retornando `true` nesta fase.
- Documentar em `docs/licenses.md` a licença de cada pacote instalado nesta fase.
- Atualizar os títulos e descrições de compartilhamento de cada página.

## 2. Contas e perfis

- Implementar cadastro e login por e-mail/senha e Google, confirmação de e-mail, recuperação de senha e saída segura.
- Criar `profiles` com `id`, `nome`, `avatar_url` e `created_at`, preenchido automaticamente no cadastro.
- Criar `user_preferences` com `user_id` e `prefs jsonb`; cada usuário poderá ler e gravar apenas as próprias preferências, incluindo **Emular teclado numérico** e o limite do histórico.
- Manter o estado da sessão sincronizado na navegação e proteger painel/editor antes de renderizar conteúdo privado.
- Processar, no primeiro login confirmado, convites pendentes destinados ao e-mail daquela conta.

## 3. Banco, segurança e arquivos

Criar migrações com permissões explícitas e RLS para:

- `projects`: dono, nome, datas de criação e última edição.
- `project_members`: projeto, usuário e papel (`editor`, `commenter` ou `viewer`); rótulos em português existirão apenas na interface.
- `project_invites`: projeto, e-mail normalizado, papel, hash do token, estado e validade.
- `share_links`: projeto, hash do token, papel, validade e revogação.
- `project_locks`: projeto, usuário, identificador único da sessão/aba e último heartbeat.
- `user_preferences`: usuário e preferências em JSON.

Regras principais:

- O dono controla projeto, membros, convites e links; `editor` altera apenas o documento quando possui a trava; `viewer` e `commenter` têm somente leitura nesta fase.
- Nenhum token bruto será persistido ou retornado depois da criação. Validação, consumo e revogação ocorrerão apenas no servidor.
- O documento ficará no Storage em `projects/{id}/document.json`; metadados permanecem no Postgres.
- Políticas do Storage validarão acesso ao projeto e papel do usuário.
- Operações sensíveis usarão funções seguras no servidor do app, equivalentes ao limite de confiança solicitado para edge functions, conforme a arquitetura TanStack do projeto.

## 4. Painel de projetos

- Criar as abas **Meus projetos** e **Compartilhados comigo**.
- Implementar criação, abertura, renomeação, duplicação e exclusão com confirmação.
- Exibir em cada cartão nome, dono, última edição e papel do usuário.
- Duplicar metadados e o documento, sem copiar membros, convites, links ou travas.
- Excluir completamente o arquivo no Storage e todas as linhas relacionadas em `project_members`, `project_invites`, `share_links` e `project_locks`.
- Garantir estados reais de carregamento, vazio, erro e confirmação; nenhum controle ficará sem ação.

## 5. Compartilhamento

- Criar o modal **Compartilhar**, disponível somente ao dono.
- Permitir convite por e-mail com papel, alteração de papel e remoção de membro.
- Tornar membro imediatamente quando o e-mail já pertencer a uma conta; caso contrário, manter convite pendente e aceitá-lo automaticamente no primeiro login correspondente.
- Gerar links com papel e validade opcional, listar links ativos e permitir revogação imediata.
- Criar uma página pública de entrada por convite que exige login e, após autenticação, valida o token no servidor e adiciona o usuário ao projeto.
- Preparar o envio de convite no servidor. Sem serviço de e-mail configurado, retornar e mostrar um link copiável e a mensagem explícita de que o e-mail não foi enviado.

## 6. Documento e workspaces

Definir `schemaVersion: 1` e uma função central de migração, inicialmente sem transformações. O documento conterá:

- cena com objetos e transformações;
- seleção atual;
- workspaces e suas árvores de áreas;
- tipo e tamanho de cada área;

As preferências **Emular teclado numérico** e limite do histórico, com padrão de 100 passos, serão carregadas de `user_preferences`, nunca do documento. Em modo somente leitura, alterações no layout valerão apenas para a sessão e não serão salvas.

Criar um documento inicial consistente e validar todo conteúdo carregado antes de abrir o editor.

## 7. Casca do editor e áreas

- Renderizar a rota do editor apenas no cliente; o servidor entregará somente a casca de carregamento. Three.js, WebGPU, Web Workers e demais APIs do navegador não entrarão no caminho de SSR.
- Barra superior com **Arquivo, Editar, Adicionar, Visualizar, Janela e Ajuda**, além das abas de workspace.
- Árvore recursiva de áreas para dividir horizontalmente ou verticalmente, redimensionar arrastando, juntar áreas vizinhas e trocar o editor pelo seletor de canto.
- Editores ativos: **Viewport 3D**, **Outliner** e **Propriedades**.
- Mostrar Moldes 2D, Nós, Console Python e Tabela de Medidas desabilitados, indicando a fase futura correspondente.
- Barra de status com nome do projeto, estado de salvamento, modo gráfico efetivamente inicializado e papel do usuário.
- Ocultar ou desabilitar comandos de escrita em modo somente leitura, incluindo menus, atalhos e campos.

## 8. Viewport, seleção e propriedades

- Criar o viewport Three.js com grade, eixos e gizmo de orientação clicável.
- Configurar botão do meio para órbita, Shift + botão do meio para deslocamento e roda para zoom.
- Implementar vistas 1/3/7, inversão com Ctrl, alternância perspectiva/ortográfica com 5 e a preferência de emulação do teclado numérico.
- Detectar e inicializar WebGPU quando realmente disponível; usar WebGL2 como fallback e mostrar o resultado real na barra de status.
- Implementar clique e Shift+clique para seleção, com contorno visível no objeto selecionado.
- Disponibilizar cubo, esfera e plano em **Adicionar → Primitivas de teste**.
- Sincronizar seleção entre viewport e Outliner; permitir renomear por duplo clique e alternar visibilidade.
- Editar posição, rotação em graus e escala por campo e por arraste nas Propriedades, com conversão consistente entre graus e radianos.

## 9. Comandos, transformação e histórico

- Criar um registro central com identificador, nome, atalho, contexto, disponibilidade e execução; menus, atalhos e F3 consumirão esse mesmo registro.
- Implementar F3 com busca, exibição do atalho e execução por Enter.
- Implementar a máquina de estado modal para G/R/S, trava X/Y/Z, entrada numérica, confirmação por Enter/clique esquerdo e cancelamento restaurador por Esc/clique direito.
- Garantir o caso `G → X → 2 → Enter` como deslocamento exato de 2 m.
- Registrar alterações em patches do Immer, com desfazer/refazer e **Editar → Histórico** navegável.
- Disparar atalhos somente na área focada e nunca dentro de campos editáveis.

## 10. Salvamento e trava

- Adquirir a trava atomicamente ao abrir como dono/editor; renovar a cada 30 s e considerar expirada após 90 s.
- Se outra sessão possuir a trava, abrir em somente leitura e mostrar **Em edição por {nome}**.
- Se a trava pertencer ao mesmo usuário em outra sessão, oferecer **Assumir edição nesta aba** e transferi-la atomicamente; a aba anterior detectará a perda no heartbeat seguinte.
- Abrir `viewer` e `commenter` sempre em somente leitura.
- Liberar a trava ao sair quando possível, mantendo a expiração como proteção contra fechamento abrupto.
- Implementar autosave 2 s após a última alteração e Ctrl+S, com estados **Salvo**, **Salvando…** e **Erro — tentar novamente**.
- Validar a trava e a versão esperada também no servidor antes de gravar, evitando sobrescrita por sessão antiga.
- Se uma gravação for recusada por perda da trava ou conflito de versão, preservar integralmente as alterações da sessão, mudar para somente leitura e mostrar **Suas últimas alterações não foram salvas porque outra sessão assumiu a edição**, com **Baixar cópia (.json)** e **Recarregar projeto**.
- Atualizar `updated_at` somente após gravação confirmada do documento.

## 11. Testes e validação

Adicionar testes Vitest para:

- registro, contexto e busca de comandos;
- patches de desfazer/refazer e navegação pelo histórico;
- conversão graus/radianos e entrada de transformações;
- conversão mm ↔ m e unidade de exibição em `core/units`;
- `can(user, feature)` retornando `true` nesta fase;
- leitura e migração do documento `schemaVersion: 1`.

Validar também os fluxos centrais no navegador:

1. criar conta, projeto e layout; recarregar e confirmar persistência;
2. dividir em três áreas, trocar uma para Outliner e recarregar;
3. executar `G → X → 2 → Enter`, depois Ctrl+Z;
4. cancelar `R` com Esc;
5. criar esfera por F3;
6. confirmar que leitor não altera nada, inclusive por atalhos;
7. abrir duas sessões editoras e verificar a segunda em somente leitura;
8. revogar link e confirmar bloqueio imediato;
9. conferir o modo gráfico real na barra de status;
10. percorrer menus e controles para garantir que todos executam uma ação ou aparecem claramente desabilitados.

## Limitações conhecidas da Fase 0

- `commenter` equivale a `viewer`; comentários serão futuros.
- Edição é exclusiva por trava, não colaborativa em tempo real.
- O histórico de desfazer/refazer pertence à sessão e ao documento aberto; não é versionamento/auditoria multiusuário.
- Sem provedor de e-mail configurado, convites serão entregues somente por link copiável com aviso explícito.
- Objetos disponíveis são apenas as primitivas de teste e suas transformações básicas.
