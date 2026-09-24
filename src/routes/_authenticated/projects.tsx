import { createFileRoute } from "@tanstack/react-router";
import { ProjectsDashboard } from "@/components/app/ProjectsDashboard";
export const Route = createFileRoute("/_authenticated/projects")({
  head: () => ({
    meta: [
      { title: "Projetos | Wasabii Art" },
      { name: "description", content: "Organize seus projetos de modelagem 3D." },
      { property: "og:title", content: "Projetos | Wasabii Art" },
      { property: "og:description", content: "Organize seus projetos de modelagem 3D." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProjectsDashboard,
});
