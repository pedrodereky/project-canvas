import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/projects" });
  },
  head: () => ({
    meta: [
      { title: "Wasabii Art — Modelagem colaborativa" },
      { name: "description", content: "Crie e compartilhe projetos de modelagem 3D no navegador." },
      { property: "og:title", content: "Wasabii Art — Modelagem colaborativa" },
      {
        property: "og:description",
        content: "Crie e compartilhe projetos de modelagem 3D no navegador.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});
