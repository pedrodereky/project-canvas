# Project Canvas

# Fase 0 — Fundação

Siga o Knowledge do projeto. Esta fase cria a estrutura do app. NÃO implemente moldes, física, materiais nem cobrança.

## 1. Autenticação

- Login e cadastro com e-mail/senha e Google.

- Tabela profiles (id, nome, avatar_url, created_at).

## 2. Painel de projetos

- Abas "Meus projetos" e "Compartilhados comigo".

- Criar, renomear, duplicar e excluir projetos (a exclusão pede confirmação).

- Cada cartão mostra nome, dono, data da última edição e o papel do usuário.

## 3. Compartilhamento

- Modal "Compartilhar" (somente o dono): convidar por e-mail escolhendo o papel; gerar link com papel e validade opcional; revogar link; alterar papel ou remover membro.

- Se o e-mail convidado já tem conta, a pessoa vira membro na hora. Se não tem, o convite fica pendente e é aceito automaticamente no primeiro login com aquele e-mail.

- O envio do e-mail é feito por edge function. Se não houver serviço de e-mail configurado, gerar um link de convite copiável e avisar na tela que o e-mail não foi enviado. Nunca fingir o envio.

- Link: exige login. Ao abrir um link válido, o usuário vira membro com o papel do link.

- Tokens armazenados apenas como hash e validados somente em edge function.

- Nesta fase, o papel "comentarista" se comporta como leitor (comentários chegam numa fase futura).

## 4. Banco (todas as tabelas com RLS)

- projects, project_members (project_id, user_id, role), project_invites (email, role, token_hash, status, expires_at), share_links (project_id, token_hash, role, expires_at, revoked_at), project_locks (project_id, user_id, heartbeat_at).

- Metadados no Postgres. Documento do projeto no Storage em projects/{id}/document.json.

## 5. Casca do editor

- Barra superior com os menus Arquivo, Editar, Adicionar, Visualizar, Janela e Ajuda, e as abas de workspace.

- Áreas: dividir na horizontal ou vertical, redimensionar arrastando, juntar áreas vizinhas, trocar o tipo de editor pelo seletor no canto. O layout é salvo por workspace dentro do documento.

- Barra de status: nome do projeto, estado do salvamento, modo gráfico ("WebGPU" ou "Modo compatível — WebGL2") e papel do usuário.

## 6. Editores desta fase

- Viewport 3D:

  - grade, eixos e gizmo de orientação clicável;

  - navegação: botão do meio orbita, Shift+meio desloca, roda aproxima;

  - vistas no teclado numérico: 1 frente, 3 direita, 7 topo, Ctrl inverte, 5 alterna perspectiva/ortográfica;

  - preferência "Emular teclado numérico" para notebooks sem numpad.

- Seleção: clique e Shift+clique, com contorno destacado no objeto selecionado.

- Adicionar → Primitivas de teste (cubo, esfera, plano), para validar seleção, transformação e desfazer.

- Outliner: árvore de objetos, renomear com duplo clique, alternar visibilidade, seleção sincronizada com o viewport.

- Propriedades: posição, rotação (em graus) e escala do objeto selecionado, editáveis por campo ou arrastando.

- Editores futuros (Moldes 2D, Nós, Console Python, Tabela de Medidas) aparecem desabilitados no seletor, com o aviso "Disponível na Fase X".

## 7. Sistema de comandos

- Registro central conforme o Knowledge. Menus, atalhos e F3 leem do mesmo registro.

- F3: busca pelo nome do comando, mostra o atalho e executa com Enter.

- Transformação modal:

  - G/R/S inicia a transformação e o mouse altera o valor;

  - X/Y/Z trava o eixo;

  - digitar um número define o valor exato;

  - Enter ou clique esquerdo confirma;

  - Esc ou clique direito cancela e restaura o estado.

- Desfazer/refazer via patches do Immer. Histórico em Editar → Histórico (clicar num item volta até ele). Limite padrão de 100 passos, configurável.

- Atalhos só disparam com o foco na área correspondente e nunca dentro de campos de texto.

## 8. Salvamento e trava de edição

- Autosave 2 s após a última alteração, além de Ctrl+S. Estados visíveis: "Salvo", "Salvando…", "Erro — tentar novamente".

- Documento com schemaVersion: 1 e mecanismo de migração pronto (ainda sem migrações).

- Ao abrir como editor, adquirir a trava. Heartbeat a cada 30 s; a trava expira após 90 s sem heartbeat.

- Se outra pessoa tiver a trava, abrir em somente leitura com o aviso "Em edição por {nome}".

- Leitores e comentaristas sempre abrem em somente leitura.

## 9. Testes (Vitest)

- Registro de comandos, desfazer/refazer, conversão de unidades e migração do documento.

## Critérios de aceite

- [ ] Criar conta, criar um projeto e recarregar a página: projeto e layout continuam iguais.

- [ ] Dividir o viewport em 3 áreas, trocar uma delas para Outliner e recarregar: o layout se mantém.

- [ ] Adicionar um cubo e fazer G → X → 2 → Enter: o cubo se move 2 m em X. Ctrl+Z: ele volta à origem.

- [ ] R → Esc: nada muda.

- [ ] F3 → "esfera" → Enter: uma esfera é criada.

- [ ] Usuário convidado como leitor vê o projeto, mas não edita nada, nem por atalho.

- [ ] Dois editores abrem o mesmo projeto: o segundo entra em somente leitura, com aviso.

- [ ] Um link revogado para de funcionar imediatamente.

- [ ] A barra de status mostra o modo gráfico correto.

- [ ] Nenhum botão sem ação em toda a interface.

## Ao terminar

Liste o que foi feito, o que ficou de fora e as limitações conhecidas.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ec9aef10-42bf-4ed8-9514-d19c6f5197f4).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
