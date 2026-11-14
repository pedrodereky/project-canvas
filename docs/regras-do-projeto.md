# Wasabii Art

Software web comercial de modelagem 3D de vestuário para moda e produção: moldes 2D → costura → simulação física do tecido sobre avatar → gradação, medidas e ficha técnica. Interface e fluxo inspirados no Blender (áreas divisíveis, atalhos, busca de comandos, nós, modificadores, scripts Python). Venda por assinatura; uso individual e em equipe.

- Identidade própria: nunca usar nomes, ícones, layouts ou marcas de CLO, Marvelous Designer ou Blender.
- Origem: projeto iniciado no Lovable e migrado para desenvolvimento local. O backend é um projeto Supabase próprio. Não usar mais o Lovable Cloud.

## Regras invioláveis

1. Nunca simular funcionalidade. Tecido só se move pelo solver físico. Proibido: animação pré-gravada, malha falsa, dados fictícios apresentados como reais.
2. Recurso não implementado aparece desabilitado com o aviso "Disponível na Fase X". Nenhum botão sem ação.
3. Trabalhar somente na fase e na etapa pedidas. Não adiantar fases nem refatorar o que não foi pedido.
4. Não inventar APIs. Antes de usar uma biblioteca, confirmar a assinatura nos tipos instalados em node_modules. Se ainda houver dúvida, isolar a chamada num adaptador e avisar no resumo.
5. Não trocar stack nem arquitetura sem pedido explícito.
6. Ao final de cada etapa, listar: o que foi feito, o que ficou de fora, limitações conhecidas e o que o usuário deve testar no navegador.

## Fluxo de trabalho

- Antes de alterar arquivos, apresentar o plano e esperar aprovação.
- Cada etapa termina com testes, checagem de tipos e lint passando (scripts do package.json; criar os que faltarem) e um commit com mensagem descritiva em português.
- Nunca commitar .env nem segredos. Manter .env.example atualizado, sem valores.
- Mudanças no banco apenas por novo arquivo em supabase/migrations. Nunca editar migração já aplicada. Nunca executar comando destrutivo no banco remoto (reset, drop, truncate) sem pedir.
- Testes no navegador são feitos pelo usuário: descrever os passos exatos de cada teste.

## Stack

- TanStack Start + React + TypeScript (strict) + Tailwind + shadcn/ui.
- Lógica sensível em server functions. Segredos (incluindo a chave secreta do Supabase) apenas no servidor.
- Rotas públicas (entrada, login, convite) podem usar SSR. O editor e todo código com Three.js, WebGPU, Web Workers ou Pyodide rodam só no cliente.
- Servidor sem binários nativos nem processamento pesado (o template foi pensado para Cloudflare Workers; a hospedagem será definida depois).
- Estado: Zustand + Immer (patches para desfazer/refazer).
- 3D: three + @react-three/fiber, com WebGPURenderer e fallback para WebGL2.
- Física (Fase 3): solver XPBD próprio em compute shaders WGSL; fallback em CPU dentro de Web Worker.
- Nós (Fase 5): @xyflow/react. Python (Fase 7): Pyodide em Web Worker, carregado sob demanda.
- Backend: Supabase próprio (Postgres, Auth, Storage). RLS obrigatório em todas as tabelas.
- Testes: Vitest para toda a lógica de domínio.

## Licenças (produto comercial)

- Permitidas: MIT, BSD, ISC, Apache-2.0, MPL-2.0 (sem modificar os arquivos da biblioteca).
- Proibidas: GPL, LGPL, AGPL e qualquer licença não comercial. Exemplos proibidos: Triangle (Shewchuk), CGAL, SMPL, código-fonte ou morph targets do MakeHuman.
- Verificar o LICENSE antes de instalar qualquer pacote e registrar em docs/licenses.md.

## Pastas (dentro do diretório de código do template)

- core/: documento, comandos, unidades, geometria. TypeScript puro, sem React.
- engine/: simulação e malhas. Sem React.
- workers/: Web Workers.
- addons/: API pública para scripts (Fase 7).
- Interface em components/ e routes/, conforme o padrão do template.
- Especificação de cada fase em docs/fase-N.md.

## Convenções

- Unidades: moldes em milímetros; cena 3D em metros. Conversões apenas via core/units. O usuário escolhe a unidade de exibição (mm, cm, pol).
- Eixos: Y para cima, mão direita (padrão three/glTF). Conversão para Z-up só na importação/exportação.
- Toda entidade tem UUID v4.
- Documento do projeto: JSON com schemaVersion e migrações sequenciais. Binários (malhas, texturas) no Storage, referenciados por ID.
- Identificadores de código e valores no banco em inglês; textos da interface em português.

## Modelo de dados (definido já, implementado por fases)

- Project → Scene → Objects: Avatar | Garment | Trim | Mesh | Camera | Light.
- Garment → Patterns, Seams, Sizes.
- Pattern: contorno (pontos + segmentos reta/Bézier), linhas internas, piques, fio do tecido, margem de costura, fabricId, desvios de gradação por tamanho.
- Seam: pares de segmentos de borda, direção, tipo.
- Fabric: elasticidade trama/urdume, cisalhamento, flexão trama/urdume, gramatura (g/m²), espessura (mm), atrito, materialId.
- Material: grafo de nós serializado em JSON.
- Todo objeto 3D tem transform + pilha de modificadores (lista ordenada; cada item com tipo, parâmetros e ativo/inativo).
- Avatar: origem (preset | parametric | imported), medidas, esqueleto.
- Recursos por plano: toda verificação passa por can(user, feature). A cobrança terá fase própria.
- Preferências do usuário (ex.: emular teclado numérico, limite do histórico) ficam em user_preferences, nunca no documento do projeto.

## Identidade visual

Referência: sites editoriais/de artista com fotografia dramática e tipografia como elemento de composição — não um dashboard SaaS genérico. Vale para o sistema inteiro, incluindo o editor, mas adaptado à densidade de cada tela (ver último item).

- Fundo neutro quase preto (não cinza-azulado de admin). Muita área negativa contrastando com poucos blocos de informação densa.
- Uma única cor de destaque em todo o produto: o verde já usado na marca "Wasabii Art", num tom vivo o bastante para funcionar como bloco sólido (não só contorno) sobre o fundo escuro. Reservada para a ação principal de cada tela e para foco/seleção; nunca introduzir uma segunda cor de destaque.
- Par tipográfico: uma fonte de exibição condensada e pesada para títulos, wordmark e números de destaque; uma fonte de interface neutra para todo o resto, incluindo o editor denso. Rótulos secundários (navegação, abas, eyebrows) em caixa alta com tracking aberto.
- Elementos de composição a reaproveitar onde fizer sentido: rótulos girados/em arco como assinatura decorativa; cartões "flutuantes" com cantos arredondados e fundo translúcido para informação contextual; bloco de cor sólida (não só contorno) na ação mais importante da tela.
- No editor, essa linguagem vale para cor, tipografia e cantos — não para o tamanho dos elementos. Outliner, propriedades e barra de status continuam compactos e de alta densidade, fonte de interface 12–13px, como pede a Fase 0. Tipografia grande e composição editorial ficam para telas de vitrine (entrada, painel de projetos), não para dentro das áreas de trabalho.

## UX estilo Blender

- Toda ação é um comando registrado (id, rótulo, atalho, contexto, disponibilidade, handler, desfazível). Esse registro alimenta menus, atalhos, busca F3, desfazer e a futura API Python.
- Áreas divisíveis e redimensionáveis; cada área escolhe seu tipo de editor.
- Workspaces em abas: Moldes, Simulação, Materiais, Produção, Scripting.
- Atalhos base: G/R/S com X/Y/Z para travar eixo e valor digitado; Tab alterna modo; Shift+A adicionar; F3 busca; N painel lateral; Ctrl+Z / Ctrl+Shift+Z; Ctrl+S; teclado numérico para vistas.

## Colaboração

- Papéis: owner, editor, commenter, viewer (rótulos na interface: dono, editor, comentarista, leitor).
- Acesso por convite de e-mail ou link com papel definido, revogável e com validade opcional. Abrir link exige login.
- Um editor por vez por projeto (trava por sessão/aba com heartbeat). Os demais abrem em somente leitura. Edição simultânea está fora do escopo.

## Avatares

- Presets: GLB exportados da versão oficial do MakeHuman (CC0), com crédito em docs/licenses.md.
- Paramétrico: malha base própria com morph targets ou deformação regional própria (definido na Fase 2). Nunca derivar morphs do MakeHuman.
- Importado: GLB/glTF, OBJ e FBX (apenas importação).

## Exportação

- 3D: glTF/GLB, OBJ, USDZ. FBX e Alembic não são suportados.
- Moldes: DXF-AAMA/ASTM.
- Ficha técnica: PDF.

## Roteiro de fases

0. Fundação: contas, projetos, compartilhamento, trava, casca do editor, comandos (docs/fase-0.md).

1. Editor 2D de moldes, com importação e exportação DXF.
2. Avatar e arranjo.
3. Costura e simulação.
4. Produção: gradação, POMs, tabela de medidas, mapas de ajuste, ficha técnica, variações de cor.
5. Materiais, nós e modificadores.
6. Modelagem poligonal e escultura.
7. Addons e Python.
