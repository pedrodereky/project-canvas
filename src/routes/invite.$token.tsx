import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { consumeInvite } from "@/lib/projects.functions";
import { supabase } from "@/integrations/supabase/client";
export const Route = createFileRoute("/invite/$token")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Aceitar convite | Wasabii Art" },
      {
        name: "description",
        content: "Aceite um convite para colaborar em um projeto da Wasabii Art.",
      },
      { property: "og:title", content: "Aceitar convite | Wasabii Art" },
      {
        property: "og:description",
        content: "Aceite um convite para colaborar em um projeto da Wasabii Art.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Invite,
});
function Invite() {
  const { token } = Route.useParams(),
    consume = useServerFn(consumeInvite),
    navigate = useNavigate(),
    [state, setState] = useState<"loading" | "auth" | "invalid" | "error">("loading");
  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        setState("auth");
        return;
      }
      let result: Awaited<ReturnType<typeof consume>>;
      try {
        result = await consume({ data: { token } });
      } catch {
        // Falha de rede ou do servidor: sem isso a tela ficava em "Validando convite…" para sempre.
        setState("error");
        return;
      }
      if (result.ok && result.projectId)
        void navigate({
          to: "/project/$projectId",
          params: { projectId: result.projectId },
          search: { share: false },
        });
      else setState("invalid");
    })();
  }, [token]);
  return (
    <main className="grid min-h-screen place-items-center bg-background p-5">
      <section className="w-full max-w-md rounded-md border bg-card p-8 text-center">
        {state === "loading" ? (
          <>
            <Loader2 className="mx-auto animate-spin" />
            <p className="mt-4">Validando convite…</p>
          </>
        ) : state === "auth" ? (
          <>
            <CheckCircle2 className="mx-auto size-10 text-primary" />
            <h1 className="mt-4 text-xl font-semibold">Entre para aceitar o convite</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              O acesso será adicionado à conta usada no login.
            </p>
            <Button asChild className="mt-6">
              <Link to="/auth" search={{ next: `/invite/${token}` }}>
                Entrar ou criar conta
              </Link>
            </Button>
          </>
        ) : state === "error" ? (
          <>
            <XCircle className="mx-auto size-10 text-destructive" />
            <h1 className="mt-4 text-xl font-semibold">Não foi possível validar o convite</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Verifique sua conexão e tente de novo.
            </p>
            <Button className="mt-6" onClick={() => location.reload()}>
              Tentar de novo
            </Button>
          </>
        ) : (
          <>
            <XCircle className="mx-auto size-10 text-destructive" />
            <h1 className="mt-4 text-xl font-semibold">Este convite não é mais válido</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Ele pode ter expirado ou sido revogado.
            </p>
            <Button asChild variant="outline" className="mt-6">
              <Link to="/projects">Voltar aos projetos</Link>
            </Button>
          </>
        )}
      </section>
    </main>
  );
}
