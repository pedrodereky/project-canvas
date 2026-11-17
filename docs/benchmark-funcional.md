# Benchmark funcional de mercado

Levantamento das **funcionalidades** oferecidas por uma ferramenta madura de
modelagem 3D de vestuário (Marvelous Designer), extraído da página pública de
recursos — todas as 11 versões listadas, de 12.0 a 2026.1 (consulta em
2026-10-04).

**Escopo e limites (importante).** Este documento registra apenas _o quê_ existe
nesse tipo de produto, para informar o roteiro e as decisões de design do
Wasabii. Conforme a regra inviolável do [regras do projeto](regras-do-projeto.md) ("Identidade
própria: nunca usar nomes, ícones, layouts ou marcas de CLO, Marvelous Designer
ou Blender"):

- Não copiar nomes de recurso, rótulos de menu, ícones, disposição de tela nem
  identidade visual. Os nomes em inglês abaixo são só para rastrear a origem do
  levantamento; a nomenclatura do Wasabii é própria e em português na interface.
- Isto não é uma lista de tarefas. É referência. Implementação continua regida
  pelo roteiro de fases e pelas regras do regras do projeto (nada de adiantar fase).

As capacidades estão agrupadas por **tema funcional** (não pela taxonomia de
marketing da fonte) e mapeadas às fases do Wasabii.

---

## 1. Molde 2D e desenho de padrão → Fase 1

| Capacidade                                                                                                                                         | Observação para o Wasabii                                                    |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Desenhar no 3D sobre o avatar e virar molde 2D                                                                                                     | Fluxo "caneta 3D"; avançado, depende de avatar (Fase 2) + molde (Fase 1)     |
| Gerar molde base a partir de medidas/palavras-chave                                                                                                | "Pattern drafter"; útil como acelerador; casa com tabela de medidas (Fase 4) |
| Edição de linhas internas: offset múltiplo, curvas suaves, converter ponto segmento↔curva                                                          | Núcleo do editor 2D da Fase 1                                                |
| Pregas (pleats) em forma/padrão escolhido                                                                                                          | Fase 1                                                                       |
| Espiral como primitiva de molde                                                                                                                    | Fase 1                                                                       |
| Ângulo de dobra variável (início/fim da linha interna)                                                                                             | Refinamento de linha interna, Fase 1                                         |
| Simetria: espelhar metade de molde meio-simétrico, travar cruzamento da linha central, desvincular simetria de linha interna, espelhar piques/pins | Simetria é tema recorrente; planejar desde a Fase 1                          |
| Bainhas/dobras rápidas (roll up de mangas, barras)                                                                                                 | Fase 1                                                                       |
| Casar medidas entre moldes 2D                                                                                                                      | Fase 1/4                                                                     |
| Régua e guias no espaço 2D; exibir profundidade de camada                                                                                          | Usabilidade do editor 2D                                                     |
| Preservar forma 3D ao escalar molde 2D                                                                                                             | Comportamento de gradação/escala; relevante p/ Fase 4                        |
| Otimizar número de pontos de curva                                                                                                                 | Qualidade de malha de molde                                                  |
| Importar OBJ como molde (com preservação de UV/material)                                                                                           | Pipeline de import, Fase 1+                                                  |

**Já previsto no regras do projeto:** molde com contorno (reta/Bézier), linhas internas,
piques, fio do tecido, margem de costura, gradação por tamanho; importação/
exportação DXF-AAMA/ASTM. O benchmark reforça **simetria** e **pregas/espiral/
bainha** como itens de primeira classe.

## 2. Costura e junção → Fase 3 (costura) / Fase 1 (definição de costuras)

| Capacidade                                                  | Observação                                                                |
| ----------------------------------------------------------- | ------------------------------------------------------------------------- |
| Costura automática ao arranjar moldes                       | Acelerador; a definição de costuras (pares de borda) é do modelo de dados |
| Selecionar todos os moldes ligados por costura              | Usabilidade                                                               |
| Clonar forma interna como molde já com costura              | Usabilidade                                                               |
| Rasgar costura em tempo real por força, com esgarçamento    | Depende do solver (Fase 3)                                                |
| Soldar vértices de costura "viradas" na exportação          | Pipeline/exportação                                                       |
| Fita de costura (seam tape), com/sem sobreposição           | Fase 3/5                                                                  |
| Pespontos (topstitch): canto suave, otimização de polígonos | Fase 5 (aparência)                                                        |
| Franzido (puckering) ao longo de contornos/linhas/costuras  | Fase 3/5                                                                  |
| Debrum (piping) com ponta fechada                           | Fase 5                                                                    |

## 3. Simulação física → Fase 3

| Capacidade                                                                                                             | Observação                                                                     |
| ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Simulação em GPU (NVIDIA; Metal no Apple Silicon) com paridade de colisão vs CPU                                       | Casa com o plano: solver XPBD em compute shaders WGSL + fallback CPU em worker |
| Corpo mole (soft body) p/ elasticidade de pele; inclusive avatares custom                                              | Interação tecido↔corpo mais realista; extensão futura do solver                |
| "Beliscar" (pinch) com pincel e seleção suave (falloff); override temporário de valores                                | Modelagem de rugas/dobras; interação de simulação                              |
| Vento com múltiplos controladores                                                                                      | Ambiente de simulação                                                          |
| Parar simulação instantaneamente mesmo sob sobrecarga                                                                  | Requisito de UX do solver                                                      |
| Simulação de aviamentos (trims) com colisão; alinhar direção de colisão à de render                                    | Fase 3/5                                                                       |
| Mapas de deformação cientes do tecido (strain); propriedades de caimento (stress/strain/pressão); mapa de ajuste no 2D | Ponte simulação→produção (Fase 4)                                              |

**Já previsto:** solver XPBD próprio, fallback CPU, propriedades de tecido
(elasticidade trama/urdume, cisalhamento, flexão, gramatura, espessura, atrito).

## 4. Avatar e arranjo → Fase 2

| Capacidade                                                                                  | Observação                                                                          |
| ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Presets de corpo; importar avatares (GLB/FBX/OBJ)                                           | regras do projeto: presets GLB do MakeHuman CC0; import GLB/glTF/OBJ/FBX            |
| Blend shapes para ajustar silhueta/corpo                                                    | regras do projeto prevê paramétrico com morph targets próprios (nunca do MakeHuman) |
| Rigging automático e por template; espelhar pesos; pincel de suavização; editar juntas-alvo | Avançado; necessário para animação/produção                                         |
| IK para ajustar pose; editar/ocultar/dimensionar juntas; visualização de juntas sob a roupa | Edição de pose do avatar                                                            |
| Gerar pose por palavra-chave/imagem (IA); poses de mão                                      | IA — fora do roteiro atual (ver §9)                                                 |
| Converter FBX de motion em movimento do avatar; auto-converter custom em avatar compatível  | Pipeline de animação                                                                |
| Criar "fitting suit" automático ao importar avatar                                          | Auxílio de vestição                                                                 |
| Auto-fitting mantendo topologia e tamanho de textura                                        | Vestir rápido preservando qualidade                                                 |

## 5. Materiais, aviamentos e texturas → Fase 5

| Capacidade                                                                                                                                                       | Observação                              |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| Mapas PBR: gerar a partir de imagem; melhorias de base color/normal/displacement/opacity/reflection                                                              | Fase 5 (grafo de nós de material)       |
| Trocar cor de tecido sólido sem perder acurácia; mesclar estampa/gráfico ao tecido                                                                               | Fase 5                                  |
| Fur (pelo) no 3D; shader toon; render esquemático (tipo croqui)                                                                                                  | Estilos de render; Fase 5+              |
| Travar gráficos; ligar/desligar gráficos no 3D; gráfico fora do molde em translúcido                                                                             | Usabilidade de material                 |
| Botões (presets metálicos padrão YKK), casas de botão (Z-offset), zíper (bidirecional, dentes OBJ custom, editar comprimento, estender ponta, estilo no browser) | Aviamentos; modelo de dados já tem Trim |
| Janela dedicada de aviamentos; converter molde em aviamento/acessório; registrar acessórios (inclusive com rig); categoria "chapéu" que adapta ao avatar         | Organização de aviamentos/acessórios    |
| Carregar todos os mapas de textura da mesma pasta                                                                                                                | Pipeline de import                      |

**Já previsto:** Material como grafo de nós serializado em JSON; Fabric com
materialId; Trim como objeto; pilha de modificadores por objeto.

## 6. Modelagem poligonal, retopologia e UV → Fase 6

| Capacidade                                                                                                                                                                                                | Observação      |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| Escultura (sculpt) na janela 3D                                                                                                                                                                           | Fase 6          |
| Retopologia/quad remesh; melhorias de patch topology; soldar vértices por proximidade (malha "estanque")                                                                                                  | Fase 6          |
| Otimização de polígonos (botões/acessórios/zíper)                                                                                                                                                         | Fase 6/pipeline |
| Editor de UV: empacotamento/nesting, expansão lateral/traseira, coordenadas unificadas, baking de textura, padding ajustável, exibir só UVs do objeto selecionado, selecionar shells de mesma propriedade | Fase 6 (UV)     |

## 7. Pipeline, importação e exportação → transversal (exportação na Fase 4)

| Capacidade                                                                                                       | Observação para o Wasabii                                                                                                      |
| ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| glTF/GLB, USD/USDZ, OBJ                                                                                          | **Alinhado** ao regras do projeto (glTF/GLB, OBJ, USDZ)                                                                        |
| FBX, Alembic                                                                                                     | **Divergência intencional:** regras do projeto define FBX/Alembic como **não suportados**. Manter assim salvo pedido explícito |
| Câmera (import/export); opções de camada USD; exportar dados de animação; faixa de reprodução; bake de keyframes | Pipeline; parte cai na Fase 4 (exportação)                                                                                     |
| Sincronização com Unreal (LiveSync) e conector Omniverse                                                         | Integrações externas; fora do escopo atual                                                                                     |
| Importar MetaHuman (DNA); 18 tipos de corpo MetaHuman                                                            | Avatar/pipeline (Fase 2)                                                                                                       |
| Conversão de eixos na importação/exportação                                                                      | regras do projeto: Y-up mão direita; Z-up só na import/export — **alinhado**                                                   |

## 8. Usabilidade, UI e workflow → Fase 0 + transversal

| Capacidade                                                                                                                  | Observação                                                                                                 |
| --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Busca de comandos no menu                                                                                                   | **= F3 do Wasabii; já na Fase 0**                                                                          |
| Customizar barras de ferramentas; layout de UI próprio salvável; cor de UI por preferência                                  | Áreas divisíveis já previstas; customização de toolbar é extensão                                          |
| Autosave temporal com múltiplas versões e escolha do ponto de recuperação                                                   | Boa adição à persistência (Fase 0); hoje há salvar, não versionado                                         |
| Miniatura no ícone do projeto                                                                                               | Nice-to-have                                                                                               |
| Navegador de objetos (cena/tecido/gráfico/botão/pesponto/...)                                                               | **= outliner; já na Fase 0**                                                                               |
| Isolar seleção; mostrar/ocultar menu de cores de estado; selecionar grupo de pins                                           | Usabilidade de editor                                                                                      |
| Operações aritméticas nos campos numéricos, com atualização em tempo real                                                   | Relevante: soma à lacuna conhecida de "arrastar p/ ajustar" nos campos de Propriedades (ver fase-0-status) |
| Biblioteca modular/unificada; preview na biblioteca ancorada                                                                | Biblioteca de assets; futuro                                                                               |
| Hotkey para alternar layout de viewport; estatísticas da peça; marcadores na timeline; captura de vídeo; keyframe animation | Mistura Fase 0 (layout) e fases de animação                                                                |
| Login unificado por e-mail (uma conta)                                                                                      | **= contas do Wasabii; já na Fase 0**                                                                      |

## 9. Inteligência artificial → fora do roteiro atual

Estúdio de IA com geradores de textura, gráfico e pose, e ativação/desativação
de recursos de IA. O roteiro do Wasabii (Fases 0–7) **não tem fase de IA**.
Registrar como possível direção futura; **não** iniciar sem pedido explícito e
sem revisão de licenças/custos (regra 3 e regra de licenças do regras do projeto).

## 10. Produção (gradação, POM, ficha técnica) → Fase 4

A fonte é forte em design/simulação e mais fraca em documentação de produção.
Itens correlatos observados: mapas de ajuste/caimento, casar medidas, preservar
forma ao escalar. **Gradação por tabela de medidas, POMs e ficha técnica em PDF**
seguem como previstos no regras do projeto e podem ser um **diferencial** do Wasabii, não
só paridade.

---

## Síntese: lacunas e ênfases para o roteiro

Nada aqui muda as fases (isso exigiria pedido explícito — regra 5). São ênfases a
considerar _dentro_ de cada fase quando chegarmos nela:

- **Fase 0 (agora):** busca de comandos, outliner, contas e áreas já cobrem o
  essencial. Candidatos de baixo custo e alto valor: **autosave versionado** e
  **aritmética em tempo real nos campos numéricos** (conecta à lacuna de
  arrastar-para-ajustar já anotada em [fase-0-status.md](fase-0-status.md)).
- **Fase 1:** tratar **simetria** e **pregas/espiral/bainha** como itens de
  primeira classe do editor 2D, além do contorno/linhas internas já previstos.
- **Fase 2:** blend shapes próprios (nunca derivados do MakeHuman), auto-fitting
  preservando topologia, e pipeline de import de avatar.
- **Fase 3:** paridade GPU/CPU do solver e "parar na hora" como requisitos de UX;
  franzido e fita de costura como efeitos de costura.
- **Fase 4:** usar gradação/POM/ficha técnica como **diferencial** frente a
  ferramentas focadas só em design.
- **Fase 5:** grafo de nós de material, troca de cor, estampa mesclada, e um bom
  editor de aviamentos (zíper/botão/casa) — área densa de recursos na concorrência.
- **Fase 6:** escultura, quad remesh e editor de UV completo.
- **Transversal:** manter glTF/GLB/OBJ/USDZ; **não** adicionar FBX/Alembic sem
  pedido; conversão de eixos só na borda (import/export).

**Divergências intencionais a preservar:** sem FBX/Alembic; presets de avatar do
MakeHuman CC0 (não do fluxo proprietário da concorrência); sem segunda cor de
destaque na identidade visual; e nenhuma IA sem decisão explícita.
