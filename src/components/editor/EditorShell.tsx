import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Box,
  ChevronDown,
  Download,
  Eye,
  EyeOff,
  Loader2,
  Maximize2,
  Plus,
  RotateCcw,
  Save,
  Share2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  acquireLock,
  getPreferences,
  heartbeatLock,
  loadProject,
  releaseLock,
  saveProject,
} from "@/lib/projects.functions";
import { useEditorStore } from "./store";
import { CommandRegistry, type CommandContext } from "@/core/commands";
import type { AreaType, ProjectDocument, SceneObject, Vec3 } from "@/core/document";
const Viewport = lazy(() => import("./Viewport"));
const editorNames: Record<AreaType, string> = {
  viewport: "Viewport 3D",
  outliner: "Outliner",
  properties: "Propriedades",
};
const roleNames: Record<string, string> = {
  owner: "Dono",
  editor: "Editor",
  commenter: "Comentarista",
  viewer: "Leitor",
};
const futureEditors = [
  { label: "Moldes 2D", phase: "Fase 1" },
  { label: "Tabela de Medidas", phase: "Fase 4" },
  { label: "Nós", phase: "Fase 5" },
  { label: "Console Python", phase: "Fase 7" },
];
export function EditorShell({ projectId }: { projectId: string }) {
  const navigate = useNavigate(),
    load = useServerFn(loadProject),
    prefs = useServerFn(getPreferences),
    acquire = useServerFn(acquireLock),
    heartbeat = useServerFn(heartbeatLock),
    release = useServerFn(releaseLock),
    save = useServerFn(saveProject);
  const store = useEditorStore();
  const [project, setProject] = useState<{ name: string; role: string; version: number } | null>(
      null,
    ),
    [loading, setLoading] = useState(true),
    [areas, setAreas] = useState<AreaType[]>(["viewport", "outliner", "properties"]),
    [lock, setLock] = useState<"owned" | "other" | "self" | "readonly">("readonly"),
    [notice, setNotice] = useState(""),
    [graphics, setGraphics] = useState("Modo compatível — WebGL2"),
    [palette, setPalette] = useState(false),
    [search, setSearch] = useState("");
  const sessionId = useRef(crypto.randomUUID());
  const document = store.history.present;
  useEffect(() => {
    void (async () => {
      const [result, preferences] = await Promise.all([load({ data: { id: projectId } }), prefs()]);
      setProject(result.project);
      store.setDocument(result.document, preferences.historyLimit ?? 100);
      const canEdit = result.project.role === "owner" || result.project.role === "editor";
      if (canEdit) {
        const r = await acquire({
          data: { projectId, sessionId: sessionId.current, takeover: false },
        });
        const status = String((r as { status?: string }).status ?? r);
        if (status.includes("acquired")) {
          setLock("owned");
          store.setEditable(true);
        } else if (status.includes("same_user")) {
          setLock("self");
          store.setEditable(false);
        } else {
          setLock("other");
          store.setEditable(false);
        }
      } else {
        setLock("readonly");
        store.setEditable(false);
      }
      setLoading(false);
      const nav = navigator as Navigator & { gpu?: unknown };
      if (nav.gpu) setGraphics("WebGPU");
    })();
  }, [projectId]);
  useEffect(() => {
    if (lock !== "owned") return;
    const timer = setInterval(async () => {
      const ok = await heartbeat({ data: { projectId, sessionId: sessionId.current } });
      if (!ok) {
        setLock("readonly");
        store.setEditable(false);
        setNotice("Suas últimas alterações não foram salvas porque outra sessão assumiu a edição");
      }
    }, 30000);
    return () => clearInterval(timer);
  }, [lock, projectId]);
  useEffect(
    () => () => {
      void release({ data: { projectId, sessionId: sessionId.current } });
    },
    [projectId],
  );
  async function persist() {
    if (!project || !store.dirty || lock !== "owned") return;
    store.setSaveState("saving");
    const result = await save({
      data: { id: projectId, sessionId: sessionId.current, version: project.version, document },
    });
    if (result.ok) {
      setProject({ ...project, version: result.version });
      store.markSaved();
    } else {
      store.setSaveState("error");
      store.setEditable(false);
      setLock("readonly");
      setNotice("Suas últimas alterações não foram salvas porque outra sessão assumiu a edição");
    }
  }
  const registryRef = useRef<CommandRegistry | undefined>(undefined);
  if (!registryRef.current) registryRef.current = new CommandRegistry();
  const registry = registryRef.current;
  // Commands close over `latest` (via a ref) instead of `project`/`document`/`persist`
  // directly, so registration can happen once without the closures going stale.
  const latestRef = useRef({ project, document, persist, editable: store.editable });
  latestRef.current = { project, document, persist, editable: store.editable };
  useEffect(() => {
    const unregister = [
      registry.register({
        id: "add-cube",
        name: "Adicionar cubo",
        needsEdit: true,
        run: () => store.add("cube"),
      }),
      registry.register({
        id: "add-sphere",
        name: "Adicionar esfera",
        needsEdit: true,
        run: () => store.add("sphere"),
      }),
      registry.register({
        id: "add-plane",
        name: "Adicionar plano",
        needsEdit: true,
        run: () => store.add("plane"),
      }),
      registry.register({
        id: "undo",
        name: "Desfazer",
        shortcut: "Ctrl+Z",
        needsEdit: true,
        run: () => store.undo(),
      }),
      registry.register({
        id: "redo",
        name: "Refazer",
        shortcut: "Ctrl+Shift+Z",
        needsEdit: true,
        run: () => store.redo(),
      }),
      registry.register({
        id: "save",
        name: "Salvar",
        shortcut: "Ctrl+S",
        needsEdit: true,
        run: () => void latestRef.current.persist(),
      }),
      registry.register({
        id: "download",
        name: "Baixar cópia (.json)",
        run: () => {
          const latest = latestRef.current;
          if (latest.project) download(latest.document, latest.project.name);
        },
      }),
      registry.register({
        id: "shortcuts",
        name: "Atalhos e comandos",
        shortcut: "F3",
        run: () => setPalette(true),
      }),
    ];
    return () => unregister.forEach((off) => off());
  }, [registry, store]);
  useEffect(() => {
    if (!store.dirty || lock !== "owned") return;
    const timer = setTimeout(() => void persist(), 2000);
    return () => clearTimeout(timer);
  }, [store.dirty, document, lock]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.matches("input,textarea,[contenteditable=true]")) return;
      if (e.key === "F3") {
        e.preventDefault();
        setPalette(true);
      }
      const context: CommandContext = { editable: latestRef.current.editable, focusedArea: null };
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        registry.execute("save", context);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        registry.execute(e.shiftKey ? "redo" : "undo", context);
      }
    };
    addEventListener("keydown", key);
    return () => removeEventListener("keydown", key);
  }, [registry]);
  const commandContext: CommandContext = { editable: store.editable, focusedArea: null };
  if (loading || !project)
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="animate-spin" />
      </div>
    );
  return (
    <main className="flex h-screen min-h-0 flex-col overflow-hidden bg-background text-sm">
      <header className="flex h-11 shrink-0 items-center border-b bg-card px-2">
        <Link to="/projects" className="mr-3 flex items-center gap-2 font-semibold">
          <span className="grid size-7 place-items-center rounded bg-primary text-primary-foreground">
            <Box className="size-4" />
          </span>
          Forma
        </Link>
        <nav className="flex h-full items-center">
          <EditorMenu
            label="Arquivo"
            ids={["save", "download"]}
            registry={registry}
            context={commandContext}
          />
          <EditorMenu
            label="Editar"
            ids={["undo", "redo"]}
            registry={registry}
            context={commandContext}
          />
          <EditorMenu
            label="Adicionar"
            ids={["add-cube", "add-sphere", "add-plane"]}
            registry={registry}
            context={commandContext}
          />
          <button
            className="h-full px-3 text-muted-foreground/50"
            disabled
            title="Em construção nesta fase"
          >
            Visualizar
          </button>
          <button
            className="h-full px-3 text-muted-foreground/50"
            disabled
            title="Em construção nesta fase"
          >
            Janela
          </button>
          <EditorMenu
            label="Ajuda"
            ids={["shortcuts"]}
            registry={registry}
            context={commandContext}
          />
        </nav>
        <span className="ml-auto truncate px-3 font-medium">{project.name}</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => registry.execute("save", commandContext)}
          disabled={!commandContext.editable}
          aria-label="Salvar"
        >
          <Save />
        </Button>
        {project.role === "owner" && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Compartilhar"
            onClick={() =>
              navigate({
                to: "/project/$projectId",
                params: { projectId },
                search: { share: true },
              })
            }
          >
            <Share2 />
          </Button>
        )}
      </header>
      <div className="flex h-9 shrink-0 items-end border-b bg-sidebar px-2">
        <button className="h-8 border-x border-t bg-background px-5 text-xs font-medium">
          Modelagem
        </button>
        <Button
          variant="ghost"
          size="icon"
          className="ml-1 size-8"
          aria-label="Novo workspace"
          title="Em construção nesta fase"
          disabled
        >
          <Plus />
        </Button>
      </div>
      {notice && (
        <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-sm">
          <strong>{notice}</strong>
          <Button size="sm" variant="outline" onClick={() => download(document, project.name)}>
            <Download />
            Baixar cópia (.json)
          </Button>
          <Button size="sm" variant="outline" onClick={() => location.reload()}>
            <RotateCcw />
            Recarregar projeto
          </Button>
        </div>
      )}
      {lock === "self" && (
        <div className="flex shrink-0 items-center justify-center gap-3 border-b bg-secondary px-4 py-2">
          <span>Este projeto está aberto em outra aba.</span>
          <Button
            size="sm"
            onClick={async () => {
              const r = await acquire({
                data: { projectId, sessionId: sessionId.current, takeover: true },
              });
              if (String((r as { status?: string }).status ?? r).includes("acquired")) {
                setLock("owned");
                store.setEditable(true);
              }
            }}
          >
            Assumir edição nesta aba
          </Button>
        </div>
      )}
      {lock === "other" && (
        <div className="shrink-0 border-b bg-secondary px-4 py-2 text-center">
          Em edição por outra pessoa · somente leitura
        </div>
      )}
      <ResizablePanelGroup orientation="horizontal" className="min-h-0 flex-1">
        {areas.map((type, i) => (
          <span className="contents" key={`${type}-${i}`}>
            <ResizablePanel minSize={15}>
              <EditorArea
                type={type}
                setType={(value) => setAreas((a) => a.map((x, n) => (n === i ? value : x)))}
              />
            </ResizablePanel>
            {i < areas.length - 1 && <ResizableHandle />}
          </span>
        ))}
      </ResizablePanelGroup>
      <footer className="flex h-7 shrink-0 items-center border-t bg-card px-3 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{project.name}</span>
        <span className="mx-3">
          {store.saveState === "saved"
            ? "Salvo"
            : store.saveState === "saving"
              ? "Salvando…"
              : "Erro — tentar novamente"}
        </span>
        <span className="ml-auto">{graphics}</span>
        <span className="ml-4">{roleNames[project.role]}</span>
      </footer>
      {palette && (
        <div
          className="fixed inset-0 z-50 flex justify-center bg-foreground/30 pt-[15vh]"
          onMouseDown={() => setPalette(false)}
        >
          <div
            className="h-fit w-[520px] rounded-md border bg-popover p-2 shadow-xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <input
              autoFocus
              placeholder="Buscar comando…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setPalette(false);
                if (e.key === "Enter") {
                  const first = registry.search(search, commandContext)[0];
                  if (first) registry.execute(first.id, commandContext);
                  setPalette(false);
                }
              }}
              className="h-11 w-full border-b bg-transparent px-3 outline-none"
            />
            {registry.search(search, commandContext).map((c) => (
              <button
                key={c.id}
                className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left hover:bg-accent"
                onClick={() => {
                  registry.execute(c.id, commandContext);
                  setPalette(false);
                }}
              >
                <span className="flex-1 truncate">{c.name}</span>
                {c.shortcut && <span className="text-xs text-muted-foreground">{c.shortcut}</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
function EditorMenu({
  label,
  ids,
  registry,
  context,
}: {
  label: string;
  ids: string[];
  registry: CommandRegistry;
  context: CommandContext;
}) {
  const items = registry.list(context).filter((c) => ids.includes(c.id));
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="h-full px-3 outline-none hover:bg-accent">
        {label}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {items.map((c) => (
          <DropdownMenuItem key={c.id} onSelect={() => registry.execute(c.id, context)}>
            {c.name}
            {c.shortcut && <DropdownMenuShortcut>{c.shortcut}</DropdownMenuShortcut>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
function EditorArea({ type, setType }: { type: AreaType; setType: (v: AreaType) => void }) {
  return (
    <section className="flex h-full min-h-0 flex-col bg-background">
      <header className="flex h-8 shrink-0 items-center border-b bg-card px-1">
        <label className="relative">
          <select
            className="h-7 appearance-none bg-transparent pl-2 pr-7 text-xs font-medium outline-none"
            value={type}
            onChange={(e) => setType(e.target.value as AreaType)}
          >
            {Object.entries(editorNames).map(([v, n]) => (
              <option value={v} key={v}>
                {n}
              </option>
            ))}
            {futureEditors.map((f) => (
              <option key={f.label} value={f.label} disabled>
                {f.label} — Disponível na {f.phase}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-1 top-1.5 size-3" />
        </label>
        <Button variant="ghost" size="icon" className="ml-auto size-7" aria-label="Maximizar área">
          <Maximize2 />
        </Button>
      </header>
      <div className="min-h-0 flex-1">
        {type === "viewport" ? (
          <Suspense
            fallback={
              <div className="grid h-full place-items-center bg-muted">Carregando viewport…</div>
            }
          >
            <Viewport />
          </Suspense>
        ) : type === "outliner" ? (
          <Outliner />
        ) : (
          <Properties />
        )}
      </div>
    </section>
  );
}
function Outliner() {
  const objects = useEditorStore((s) => s.history.present.scene.objects),
    selection = useEditorStore((s) => s.history.present.selection),
    select = useEditorStore((s) => s.select),
    toggle = useEditorStore((s) => s.toggleVisible),
    rename = useEditorStore((s) => s.rename);
  return (
    <div className="p-2">
      <p className="mb-2 px-2 text-xs font-medium text-muted-foreground">COLEÇÃO DA CENA</p>
      {objects.map((o) => (
        <div
          key={o.id}
          className={`flex items-center rounded-sm ${selection.includes(o.id) ? "bg-accent" : ""}`}
        >
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => toggle(o.id)}
            aria-label={o.visible ? "Ocultar" : "Mostrar"}
          >
            {o.visible ? <Eye /> : <EyeOff />}
          </Button>
          <button
            className="flex-1 truncate py-1 text-left"
            onClick={(e) => select(o.id, e.shiftKey)}
            onDoubleClick={() => {
              const n = prompt("Nome", o.name);
              if (n) rename(o.id, n);
            }}
          >
            {o.name}
          </button>
        </div>
      ))}
    </div>
  );
}
function Properties() {
  const doc = useEditorStore((s) => s.history.present),
    setVector = useEditorStore((s) => s.setVector);
  const o = doc.scene.objects.find((x) => x.id === doc.selection[0]);
  if (!o)
    return (
      <div className="grid h-full place-items-center text-muted-foreground">Nada selecionado</div>
    );
  return (
    <div className="p-3">
      <h3 className="mb-4 font-semibold">{o.name}</h3>
      {(["position", "rotation", "scale"] as const).map((k) => (
        <VectorFields
          key={k}
          label={k === "position" ? "Posição" : k === "rotation" ? "Rotação" : "Escala"}
          object={o}
          field={k}
          set={setVector}
        />
      ))}
    </div>
  );
}
function VectorFields({
  label,
  object,
  field,
  set,
}: {
  label: string;
  object: SceneObject;
  field: "position" | "rotation" | "scale";
  set: (id: string, k: "position" | "rotation" | "scale", v: Vec3) => void;
}) {
  return (
    <fieldset className="mb-4">
      <legend className="mb-2 text-xs font-medium text-muted-foreground">{label}</legend>
      <div className="grid grid-cols-3 gap-1">
        {object[field].map((v, i) => (
          <label key={i} className="text-xs">
            {"XYZ"[i]}
            <input
              type="number"
              step="0.1"
              value={field === "rotation" ? ((v * 180) / Math.PI).toFixed(1) : v}
              onChange={(e) => {
                const n = Number(e.target.value);
                const next = [...object[field]] as Vec3;
                next[i] = field === "rotation" ? (n * Math.PI) / 180 : n;
                set(object.id, field, next);
              }}
              className="mt-1 w-full rounded-sm border bg-background px-2 py-1"
            />
          </label>
        ))}
      </div>
    </fieldset>
  );
}
function download(doc: ProjectDocument, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(
    new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" }),
  );
  a.download = `${name}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}
