import { createFileRoute } from "@tanstack/react-router";
import { AuthScreen } from "@/components/app/AuthScreen";
export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({
    next:
      typeof s["next"] === "string" && s["next"].startsWith("/") && !s["next"].startsWith("//")
        ? s["next"]
        : "/projects",
  }),
  head: () => ({
    meta: [
      { title: "Wasabii Art" },
      { name: "description", content: "Entre ou crie sua conta na Wasabii Art." },
      { property: "og:title", content: "Wasabii Art" },
      { property: "og:description", content: "Entre ou crie sua conta na Wasabii Art." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthScreen,
});
