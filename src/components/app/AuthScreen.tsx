import { useEffect, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Box, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export function AuthScreen() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [recovery, setRecovery] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const { next } = useSearch({ from: "/auth" });
  function goNext() {
    void navigate({ href: next });
  }

  // Supabase estabelece a sessão de recuperação a partir do link do e-mail e
  // dispara este evento; é assim que detectamos "chegou aqui para trocar a senha".
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setMessage("");
        setPassword("");
        setRecovery(true);
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name }, emailRedirectTo: `${window.location.origin}${next}` },
      });
      setMessage(error ? error.message : "Confira seu e-mail para confirmar a conta.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(error.message);
      else goNext();
    }
    setBusy(false);
  }
  async function sendRecoveryEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth?next=${encodeURIComponent(next)}`,
    });
    setMessage(
      error
        ? error.message
        : "Se existir uma conta com esse e-mail, enviamos um link de redefinição.",
    );
    setBusy(false);
  }
  async function confirmNewPassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setMessage(error.message);
    else goNext();
    setBusy(false);
  }
  async function google() {
    setBusy(true);
    setMessage("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}${next}` },
    });
    if (error) {
      setMessage(error.message);
      setBusy(false);
    }
    // Sem erro: o navegador é redirecionado para o Google, então não há mais nada a fazer aqui.
  }
  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-[1.05fr_.95fr]">
      <section className="relative hidden overflow-hidden border-r border-border bg-sidebar lg:flex lg:flex-col lg:justify-between p-12">
        <div className="flex items-center gap-3 text-lg font-semibold">
          <span className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground">
            <Box className="size-5" />
          </span>
          Forma
        </div>
        <div className="max-w-xl">
          <p className="mb-4 text-sm font-medium uppercase text-primary">Modelagem colaborativa</p>
          <h1 className="text-5xl font-semibold leading-tight">
            Um espaço preciso para dar forma às suas ideias.
          </h1>
          <p className="mt-6 max-w-lg text-lg text-muted-foreground">
            Organize projetos, colabore com sua equipe e trabalhe em um editor 3D criado para a web.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">Fase 0 · Fundação</p>
      </section>
      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-9 lg:hidden flex items-center gap-3 text-lg font-semibold">
            <span className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground">
              <Box className="size-5" />
            </span>
            Forma
          </div>
          {recovery ? (
            <>
              <h2 className="text-3xl font-semibold">Defina uma nova senha</h2>
              <p className="mt-2 text-muted-foreground">Escolha a nova senha da sua conta.</p>
              <form onSubmit={confirmNewPassword} className="mt-8 space-y-4">
                <label className="block text-sm font-medium">
                  Nova senha
                  <span className="relative mt-1.5 block">
                    <input
                      type={show ? "text" : "password"}
                      minLength={6}
                      className="h-11 w-full rounded-md border bg-background px-3 pr-10 outline-none focus:ring-2 focus:ring-ring"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1"
                      onClick={() => setShow(!show)}
                      aria-label={show ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {show ? <EyeOff /> : <Eye />}
                    </Button>
                  </span>
                </label>
                {message && <p className="rounded-md bg-muted p-3 text-sm">{message}</p>}
                <Button className="h-11 w-full" disabled={busy}>
                  {busy && <Loader2 className="animate-spin" />}
                  Salvar nova senha
                </Button>
              </form>
            </>
          ) : mode === "forgot" ? (
            <>
              <h2 className="text-3xl font-semibold">Recuperar senha</h2>
              <p className="mt-2 text-muted-foreground">
                Informe seu e-mail para receber o link de redefinição.
              </p>
              <form onSubmit={sendRecoveryEmail} className="mt-8 space-y-4">
                <label className="block text-sm font-medium">
                  E-mail
                  <input
                    type="email"
                    className="mt-1.5 h-11 w-full rounded-md border bg-background px-3 outline-none focus:ring-2 focus:ring-ring"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </label>
                {message && <p className="rounded-md bg-muted p-3 text-sm">{message}</p>}
                <Button className="h-11 w-full" disabled={busy}>
                  {busy && <Loader2 className="animate-spin" />}
                  Enviar link de redefinição
                </Button>
              </form>
              <p className="mt-6 text-center text-sm text-muted-foreground">
                <button
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                  onClick={() => {
                    setMode("login");
                    setMessage("");
                  }}
                >
                  Voltar para entrar
                </button>
              </p>
            </>
          ) : (
            <>
              <h2 className="text-3xl font-semibold">
                {mode === "login" ? "Boas-vindas" : "Crie sua conta"}
              </h2>
              <p className="mt-2 text-muted-foreground">
                {mode === "login"
                  ? "Entre para continuar seus projetos."
                  : "Comece seu primeiro projeto 3D."}
              </p>
              <Button
                variant="outline"
                className="mt-8 h-11 w-full"
                onClick={google}
                disabled={busy}
              >
                Continuar com Google
              </Button>
              <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                ou use seu e-mail
                <span className="h-px flex-1 bg-border" />
              </div>
              <form onSubmit={submit} className="space-y-4">
                {mode === "signup" && (
                  <label className="block text-sm font-medium">
                    Nome
                    <input
                      className="mt-1.5 h-11 w-full rounded-md border bg-background px-3 outline-none focus:ring-2 focus:ring-ring"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </label>
                )}
                <label className="block text-sm font-medium">
                  E-mail
                  <input
                    type="email"
                    className="mt-1.5 h-11 w-full rounded-md border bg-background px-3 outline-none focus:ring-2 focus:ring-ring"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </label>
                <label className="block text-sm font-medium">
                  Senha
                  <span className="relative mt-1.5 block">
                    <input
                      type={show ? "text" : "password"}
                      minLength={6}
                      className="h-11 w-full rounded-md border bg-background px-3 pr-10 outline-none focus:ring-2 focus:ring-ring"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1"
                      onClick={() => setShow(!show)}
                      aria-label={show ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {show ? <EyeOff /> : <Eye />}
                    </Button>
                  </span>
                </label>
                {mode === "login" && (
                  <button
                    type="button"
                    className="block text-sm text-muted-foreground underline-offset-4 hover:underline"
                    onClick={() => {
                      setMode("forgot");
                      setMessage("");
                    }}
                  >
                    Esqueci minha senha
                  </button>
                )}
                {message && <p className="rounded-md bg-muted p-3 text-sm">{message}</p>}
                <Button className="h-11 w-full" disabled={busy}>
                  {busy && <Loader2 className="animate-spin" />}
                  {mode === "login" ? "Entrar" : "Criar conta"}
                </Button>
              </form>
              <p className="mt-6 text-center text-sm text-muted-foreground">
                {mode === "login" ? "Ainda não tem conta?" : "Já tem uma conta?"}{" "}
                <button
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                  onClick={() => {
                    setMode(mode === "login" ? "signup" : "login");
                    setMessage("");
                  }}
                >
                  {mode === "login" ? "Cadastre-se" : "Entrar"}
                </button>
              </p>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
