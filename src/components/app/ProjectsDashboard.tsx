import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  Box,
  Copy,
  FolderPlus,
  LogOut,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  Share2,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  bootstrapUser,
  createProject,
  deleteProject,
  duplicateProject,
  listProjects,
  renameProject,
} from "@/lib/projects.functions";
import { supabase } from "@/integrations/supabase/client";

type Project = Awaited<ReturnType<typeof listProjects>>[number];
const roles: Record<string, string> = {
  owner: "Dono",
  editor: "Editor",
  commenter: "Comentarista",
  viewer: "Leitor",
};
export function ProjectsDashboard() {
  const navigate = useNavigate();
  const get = useServerFn(listProjects),
    boot = useServerFn(bootstrapUser),
    create = useServerFn(createProject),
    rename = useServerFn(renameProject),
    duplicate = useServerFn(duplicateProject),
    remove = useServerFn(deleteProject);
  const [items, setItems] = useState<Project[]>([]),
    [tab, setTab] = useState<"mine" | "shared">("mine"),
    [busy, setBusy] = useState(true),
    [loadError, setLoadError] = useState<string | null>(null),
    [actionError, setActionError] = useState<string | null>(null),
    [menu, setMenu] = useState<string | null>(null);
  async function refresh() {
    setBusy(true);
    setLoadError(null);
    try {
      await boot();
      setItems(await get());
    } catch {
      setLoadError("Não foi possível carregar seus projetos.");
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  const shown = useMemo(
    () => items.filter((p) => (tab === "mine" ? p.role === "owner" : p.role !== "owner")),
    [items, tab],
  );
  async function runAction(message: string, action: () => Promise<void>) {
    setActionError(null);
    try {
      await action();
    } catch {
      setActionError(message);
    }
  }
  async function add() {
    const name = prompt("Nome do projeto", "Projeto sem título");
    if (!name) return;
    await runAction("Não foi possível criar o projeto.", async () => {
      const p = await create({ data: { name } });
      void navigate({
        to: "/project/$projectId",
        params: { projectId: p.id },
        search: { share: false },
      });
    });
  }
  async function doRename(p: Project) {
    const name = prompt("Novo nome", p.name);
    if (!name) return;
    await runAction("Não foi possível renomear o projeto.", async () => {
      await rename({ data: { id: p.id, name } });
      await refresh();
    });
  }
  async function doDelete(p: Project) {
    if (!confirm(`Excluir “${p.name}”? Esta ação não pode ser desfeita.`)) return;
    await runAction("Não foi possível excluir o projeto.", async () => {
      await remove({ data: { id: p.id } });
      await refresh();
    });
  }
  return (
    <main className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-5">
          <div className="flex items-center gap-3 font-semibold">
            <span className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground">
              <Box className="size-4" />
            </span>
            <span className="tracking-[0.2em]">FORMA</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Sair"
              onClick={async () => {
                await supabase.auth.signOut();
                void navigate({ to: "/auth", search: { next: "/projects" } });
              }}
            >
              <LogOut />
            </Button>
          </div>
        </div>
      </header>
      <section className="mx-auto max-w-7xl px-5 py-10">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-primary">
              Seu espaço de trabalho
            </p>
            <h1 className="mt-2 font-display text-5xl uppercase">Projetos</h1>
          </div>
          <Button onClick={add}>
            <FolderPlus />
            Novo projeto
          </Button>
        </div>
        {actionError && (
          <div className="mt-5 flex items-center gap-3 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm">
            <AlertTriangle className="size-4 shrink-0 text-destructive" />
            <span className="flex-1">{actionError}</span>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label="Dispensar"
              onClick={() => setActionError(null)}
            >
              <X />
            </Button>
          </div>
        )}
        <div className="mt-9 flex border-b">
          <button
            onClick={() => setTab("mine")}
            className={`px-1 pb-3 mr-7 text-xs font-medium uppercase tracking-[0.2em] ${tab === "mine" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground"}`}
          >
            Meus projetos
          </button>
          <button
            onClick={() => setTab("shared")}
            className={`px-1 pb-3 text-xs font-medium uppercase tracking-[0.2em] ${tab === "shared" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground"}`}
          >
            Compartilhados comigo
          </button>
        </div>
        {busy ? (
          <p className="py-16 text-center text-muted-foreground">Carregando projetos…</p>
        ) : loadError ? (
          <div className="py-20 text-center">
            <AlertTriangle className="mx-auto size-10 text-destructive" />
            <h2 className="mt-4 font-semibold">{loadError}</h2>
            <Button variant="outline" className="mt-4" onClick={() => void refresh()}>
              <RotateCcw />
              Tentar novamente
            </Button>
          </div>
        ) : shown.length === 0 ? (
          <div className="py-20 text-center">
            <Box className="mx-auto size-10 text-muted-foreground" />
            <h2 className="mt-4 font-semibold">
              {tab === "mine" ? "Crie seu primeiro projeto" : "Nenhum projeto compartilhado"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {tab === "mine"
                ? "Comece com um espaço vazio para modelar."
                : "Projetos compartilhados aparecerão aqui."}
            </p>
          </div>
        ) : (
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((p) => (
              <article
                key={p.id}
                className="group relative rounded-md border bg-card p-5 transition-shadow hover:shadow-md"
              >
                <button
                  className="block w-full text-left"
                  onClick={() =>
                    navigate({
                      to: "/project/$projectId",
                      params: { projectId: p.id },
                      search: { share: false },
                    })
                  }
                >
                  <div className="mb-10 grid size-10 place-items-center rounded-md bg-secondary">
                    <Box className="size-5" />
                  </div>
                  <h2 className="truncate font-semibold">{p.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {p.ownerName} ·{" "}
                    {new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(
                      new Date(p.updatedAt),
                    )}
                  </p>
                  <span className="mt-4 inline-block rounded-sm bg-secondary px-2 py-1 text-[10px] font-medium uppercase tracking-[0.15em]">
                    {roles[p.role]}
                  </span>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-3 top-3"
                  aria-label="Ações do projeto"
                  onClick={() => setMenu(menu === p.id ? null : p.id)}
                >
                  <MoreHorizontal />
                </Button>
                {menu === p.id && (
                  <div className="absolute right-3 top-12 z-10 w-44 rounded-md border bg-popover p-1 shadow-lg">
                    <button
                      className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent"
                      onClick={() => doRename(p)}
                    >
                      <Pencil className="size-4" />
                      Renomear
                    </button>
                    <button
                      className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent"
                      onClick={() =>
                        runAction("Não foi possível duplicar o projeto.", async () => {
                          await duplicate({ data: { id: p.id } });
                          await refresh();
                        })
                      }
                    >
                      <Copy className="size-4" />
                      Duplicar
                    </button>
                    {p.role === "owner" && (
                      <button
                        className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent"
                        onClick={() =>
                          navigate({
                            to: "/project/$projectId",
                            params: { projectId: p.id },
                            search: { share: true },
                          })
                        }
                      >
                        <Share2 className="size-4" />
                        Compartilhar
                      </button>
                    )}
                    <button
                      className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm text-destructive hover:bg-accent"
                      onClick={() => doDelete(p)}
                    >
                      <Trash2 className="size-4" />
                      Excluir
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
