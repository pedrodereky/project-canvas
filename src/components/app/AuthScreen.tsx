import { useEffect, useId, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Eye, EyeOff, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

// A label that curves gently along an arc, like a stamped badge — the
// "‹ Latest Release ›" style eyebrow above the floating cards.
function ArcLabel({ text }: { text: string }) {
  const pathId = useId();
  return (
    <svg viewBox="0 0 220 56" className="h-9 w-56 overflow-visible">
      <path id={pathId} d="M 10 46 A 400 400 0 0 1 210 46" fill="none" />
      <text className="fill-muted-foreground text-[11px] uppercase tracking-[0.3em]">
        <textPath href={`#${pathId}`} startOffset="50%" textAnchor="middle">
          ‹ {text} ›
        </textPath>
      </text>
    </svg>
  );
}

export function AuthScreen() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [recovery, setRecovery] = useState(false);
  const [showForm, setShowForm] = useState(false);
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
  function openForm(nextMode: "login" | "signup") {
    setMode(nextMode);
    setMessage("");
    setShowForm(true);
  }

  // Supabase estabelece a sessão de recuperação a partir do link do e-mail e
  // dispara este evento; é assim que detectamos "chegou aqui para trocar a senha".
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setMessage("");
        setPassword("");
        setRecovery(true);
        setShowForm(true);
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
    <main className="relative min-h-screen overflow-hidden bg-background">
      <img
        src="/auth-hero.webp"
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover object-top"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/20" />
      <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-background/40" />
      <div className="bg-grain pointer-events-none absolute inset-0" />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-[16%] select-none whitespace-nowrap text-center font-display text-[15vw] uppercase leading-none text-foreground/[0.09]"
      >
        WASABII
      </span>

      <header className="relative z-10 flex items-center justify-between px-6 py-6 sm:px-12">
        <span className="font-brand text-3xl tracking-wide">WASABII</span>
        <Button
          className="rounded-full border border-white/30 bg-white/15 px-7 font-sans text-sm font-medium uppercase tracking-wide text-white backdrop-blur-md hover:bg-white/25"
          onClick={() => openForm("login")}
        >
          Entrar
        </Button>
      </header>

      <div className="relative z-10 flex min-h-[85vh] flex-col items-center justify-end px-6 pb-16 text-center">
        <p className="mb-4 text-xs uppercase tracking-[0.4em] text-primary">
          Modelagem 3D para moda
        </p>
        <h1 className="font-display text-6xl uppercase leading-[0.9] sm:text-8xl">
          Do molde <span className="text-primary">ao render.</span>
        </h1>
        <p className="mt-6 max-w-md text-muted-foreground">
          Organize projetos, colabore com sua equipe e trabalhe em um editor 3D criado para a web.
        </p>
        <Button size="lg" className="mt-8 rounded-full px-8" onClick={() => openForm("signup")}>
          Criar conta
        </Button>
      </div>

      <div className="relative z-10 flex flex-col items-center px-6 pb-10 sm:absolute sm:bottom-10 sm:left-12 sm:px-0">
        <ArcLabel text="Em desenvolvimento" />
        <div className="-mt-1 w-60 rounded-2xl border border-border bg-card/80 p-5 text-center backdrop-blur">
          <p className="text-lg font-semibold">Fase 0</p>
          <p className="text-sm text-muted-foreground">Fundação do produto</p>
        </div>
      </div>
      <div className="relative z-10 flex flex-col items-center px-6 pb-10 sm:absolute sm:bottom-10 sm:right-12 sm:px-0">
        <ArcLabel text="Comece agora" />
        <div className="-mt-1 w-60 rounded-2xl border border-border bg-card/80 p-5 text-center backdrop-blur">
          <p className="text-lg font-semibold">Criar conta</p>
          <p className="text-sm text-muted-foreground">Grátis, sem cartão</p>
          <Button
            variant="outline"
            className="mt-4 w-full rounded-full uppercase tracking-wide"
            onClick={() => openForm("signup")}
          >
            Começar
          </Button>
        </div>
      </div>

      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm"
          onMouseDown={() => !recovery && setShowForm(false)}
        >
          <div
            className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {!recovery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-3 top-3"
                aria-label="Fechar"
                onClick={() => setShowForm(false)}
              >
                <X />
              </Button>
            )}
            {recovery ? (
              <>
                <h2 className="font-display text-3xl uppercase">Defina uma nova senha</h2>
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
                <h2 className="font-display text-3xl uppercase">Recuperar senha</h2>
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
                <h2 className="font-display text-3xl uppercase">
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
                <div className="my-6 flex items-center gap-3 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
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
        </div>
      )}
    </main>
  );
}
