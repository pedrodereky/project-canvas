# Licenças dos pacotes

Todas as dependências diretas do projeto (produção e desenvolvimento), conferidas em `node_modules/<pacote>/package.json`. Nenhuma é GPL, LGPL, AGPL ou não-comercial — todas permitidas pelo `regras-do-projeto.md` (MIT, ISC ou Apache-2.0).

## Produção

| Pacote                          | Licença    |
| ------------------------------- | ---------- |
| @hookform/resolvers             | MIT        |
| @radix-ui/react-accordion       | MIT        |
| @radix-ui/react-alert-dialog    | MIT        |
| @radix-ui/react-aspect-ratio    | MIT        |
| @radix-ui/react-avatar          | MIT        |
| @radix-ui/react-checkbox        | MIT        |
| @radix-ui/react-collapsible     | MIT        |
| @radix-ui/react-context-menu    | MIT        |
| @radix-ui/react-dialog          | MIT        |
| @radix-ui/react-dropdown-menu   | MIT        |
| @radix-ui/react-hover-card      | MIT        |
| @radix-ui/react-label           | MIT        |
| @radix-ui/react-menubar         | MIT        |
| @radix-ui/react-navigation-menu | MIT        |
| @radix-ui/react-popover         | MIT        |
| @radix-ui/react-progress        | MIT        |
| @radix-ui/react-radio-group     | MIT        |
| @radix-ui/react-scroll-area     | MIT        |
| @radix-ui/react-select          | MIT        |
| @radix-ui/react-separator       | MIT        |
| @radix-ui/react-slider          | MIT        |
| @radix-ui/react-slot            | MIT        |
| @radix-ui/react-switch          | MIT        |
| @radix-ui/react-tabs            | MIT        |
| @radix-ui/react-toggle          | MIT        |
| @radix-ui/react-toggle-group    | MIT        |
| @radix-ui/react-tooltip         | MIT        |
| @react-three/drei               | MIT        |
| @react-three/fiber              | MIT        |
| @supabase/supabase-js           | MIT        |
| @tailwindcss/vite               | MIT        |
| @tanstack/react-query           | MIT        |
| @tanstack/react-router          | MIT        |
| @tanstack/react-start           | MIT        |
| @tanstack/router-plugin         | MIT        |
| class-variance-authority        | Apache-2.0 |
| clsx                            | MIT        |
| cmdk                            | MIT        |
| date-fns                        | MIT        |
| embla-carousel-react            | MIT        |
| immer                           | MIT        |
| input-otp                       | MIT        |
| lucide-react                    | ISC        |
| react                           | MIT        |
| react-day-picker                | MIT        |
| react-dom                       | MIT        |
| react-hook-form                 | MIT        |
| react-resizable-panels          | MIT        |
| recharts                        | MIT        |
| sonner                          | MIT        |
| tailwind-merge                  | MIT        |
| tailwindcss                     | MIT        |
| three                           | MIT        |
| tw-animate-css                  | MIT        |
| vaul                            | MIT        |
| vite-tsconfig-paths             | MIT        |
| zod                             | MIT        |
| zustand                         | MIT        |

## Desenvolvimento

| Pacote                            | Licença    |
| --------------------------------- | ---------- |
| @eslint/js                        | MIT        |
| @lovable.dev/vite-tanstack-config | MIT        |
| @types/node                       | MIT        |
| @types/react                      | MIT        |
| @types/react-dom                  | MIT        |
| @types/three                      | MIT        |
| @vitejs/plugin-react              | MIT        |
| eslint                            | MIT        |
| eslint-config-prettier            | MIT        |
| eslint-plugin-prettier            | MIT        |
| eslint-plugin-react-hooks         | MIT        |
| eslint-plugin-react-refresh       | MIT        |
| globals                           | MIT        |
| nitro                             | MIT        |
| prettier                          | MIT        |
| typescript                        | Apache-2.0 |
| typescript-eslint                 | MIT        |
| vite                              | MIT        |
| vitest                            | MIT        |

`@lovable.dev/vite-tanstack-config` continua em uso em `vite.config.ts` por decisão registrada em `docs/fase-0-status.md` (trocá-lo é mudança de arquitetura maior, fora do escopo da limpeza de resíduos do Lovable); sua licença MIT não é um problema.

## Avatares (créditos, não licença de pacote npm)

Presets de avatar planejados para a Fase 2 usarão GLB exportados da versão oficial do [MakeHuman](http://www.makehuman.org/) (CC0), conforme o `regras-do-projeto.md`. Nenhum morph target ou código-fonte do MakeHuman será incorporado ao projeto — apenas as malhas exportadas.
