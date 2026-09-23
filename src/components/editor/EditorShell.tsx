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
  Minimize2,
  Plus,
  RotateCcw,
  Save,
  Share2,
  SplitSquareHorizontal,
  SplitSquareVertical,
  Trash2,
  X,
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
  savePreferences,
} from "@/lib/projects.functions";
import { useEditorStore } from "./store";
import { CommandRegistry, type CommandContext } from "@/core/commands";
import { listAreas } from "@/core/areas";
import { degToRad, radToDeg } from "@/core/angles";
import type { AreaNode, AreaType, ProjectDocument, SceneObject, Vec3 } from "@/core/document";
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
    [maximizedAreaId, setMaximizedAreaId] = useState<string | null>(null),
    [lock, setLock] = useState<"owned" | "other" | "self" | "readonly">("readonly"),
    [notice, setNotice] = useState(""),
    [palette, setPalette] = useState(false),
    [preferencesOpen, setPreferencesOpen] = useState(false),
    [historyOpen, setHistoryOpen] = useState(false),
    [search, setSearch] = useState("");
  const sessionId = useRef(crypto.randomUUID());
  const document = store.history.present;
  useEffect(() => {
    void (async () => {
      const [result, preferences] = await Promise.all([load({ data: { id: projectId } }), prefs()]);
      setProject(result.project);
      store.setDocument(result.document, preferences.historyLimit ?? 100);
      store.setEmulateNumpad(preferences.emulateNumpad ?? false);
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
      registry.register({
        id: "history",
        name: "Histórico",
        run: () => setHistoryOpen(true),
      }),
      registry.register({
        id: "preferences",
        name: "Preferências",
        run: () => setPreferencesOpen(true),
      }),
      registry.register({
        id: "view-front",
        name: "Vista frontal",
        shortcut: "Numpad1",
        run: () => store.requestView("front", false),
      }),
      registry.register({
        id: "view-right",
        name: "Vista direita",
        shortcut: "Numpad3",
        run: () => store.requestView("right", false),
      }),
      registry.register({
        id: "view-top",
        name: "Vista de topo",
        shortcut: "Numpad7",
        run: () => store.requestView("top", false),
      }),
      registry.register({
        id: "view-toggle-ortho",
        name: "Perspectiva/Ortográfica",
        shortcut: "Numpad5",
        run: () => store.requestToggleOrtho(),
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
            ids={["undo", "redo", "history", "preferences"]}
            registry={registry}
            context={commandContext}
          />
          <EditorMenu
            label="Adicionar"
            ids={["add-cube", "add-sphere", "add-plane"]}
            registry={registry}
            context={commandContext}
          />
          <EditorMenu
            label="Visualizar"
            ids={["view-front", "view-right", "view-top", "view-toggle-ortho"]}
            registry={registry}
            context={commandContext}
          />
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
      <div className="min-h-0 flex-1">
        {(() => {
          const workspace =
            document.workspaces.find((w) => w.id === document.activeWorkspaceId) ??
            document.workspaces[0]!;
          const maximized = maximizedAreaId
            ? listAreas(workspace.layout).find((a) => a.id === maximizedAreaId)
            : undefined;
          return maximized ? (
            <EditorArea
              area={maximized}
              hasParent
              maximized
              onMaximize={() => setMaximizedAreaId(null)}
              onSplit={() => {}}
              onJoin={() => {}}
              onSetEditor={(editor) => store.setAreaEditor(maximized.id, editor)}
            />
          ) : (
            <AreaTree node={workspace.layout} hasParent={false} onMaximize={setMaximizedAreaId} />
          );
        })()}
      </div>
      <footer className="flex h-7 shrink-0 items-center border-t bg-card px-3 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{project.name}</span>
        <span className="mx-3">
          {store.saveState === "saved"
            ? "Salvo"
            : store.saveState === "saving"
              ? "Salvando…"
              : "Erro — tentar novamente"}
        </span>
        <span className="ml-auto">{store.graphicsMode}</span>
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
      {historyOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-foreground/30"
          onMouseDown={() => setHistoryOpen(false)}
        >
          <div
            className="flex h-full w-72 flex-col border-l bg-popover shadow-xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <header className="flex items-center justify-between border-b px-3 py-2">
              <h2 className="text-sm font-semibold">Histórico</h2>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label="Fechar histórico"
                onClick={() => setHistoryOpen(false)}
              >
                <X />
              </Button>
            </header>
            <ol className="flex-1 overflow-auto p-2">
              {(() => {
                const timeline = [...store.history.past, ...store.history.future];
                const currentIndex = store.history.past.length - 1;
                const entries = [{ label: "Estado inicial" }, ...timeline];
                return entries.map((entry, i) => {
                  const index = i - 1;
                  return (
                    <li key={index}>
                      <button
                        className={`block w-full rounded-sm px-3 py-2 text-left text-sm hover:bg-accent ${
                          index === currentIndex ? "bg-accent font-medium" : ""
                        }`}
                        disabled={!store.editable}
                        onClick={() => store.jumpTo(index)}
                      >
                        {entry.label}
                      </button>
                    </li>
                  );
                });
              })()}
            </ol>
          </div>
        </div>
      )}
      {preferencesOpen && <PreferencesDialog onClose={() => setPreferencesOpen(false)} />}
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
function PreferencesDialog({ onClose }: { onClose: () => void }) {
  const getPrefs = useServerFn(getPreferences),
    savePrefs = useServerFn(savePreferences),
    setStoreEmulateNumpad = useEditorStore((s) => s.setEmulateNumpad),
    setStoreHistoryLimit = useEditorStore((s) => s.setHistoryLimit);
  const [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [emulateNumpad, setEmulateNumpad] = useState(false),
    [historyLimit, setHistoryLimit] = useState(100);
  useEffect(() => {
    void (async () => {
      const p = await getPrefs();
      setEmulateNumpad(p.emulateNumpad ?? false);
      setHistoryLimit(p.historyLimit ?? 100);
      setLoading(false);
    })();
  }, []);
  async function save() {
    setSaving(true);
    await savePrefs({ data: { emulateNumpad, historyLimit } });
    setStoreEmulateNumpad(emulateNumpad);
    setStoreHistoryLimit(historyLimit);
    setSaving(false);
    onClose();
  }
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-sm rounded-md border bg-popover p-5 shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-semibold">Preferências</h2>
        {loading ? (
          <Loader2 className="animate-spin" />
        ) : (
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={emulateNumpad}
                onChange={(e) => setEmulateNumpad(e.target.checked)}
              />
              Emular teclado numérico
            </label>
            <label className="block text-sm">
              Limite do histórico
              <input
                type="number"
                min={1}
                max={1000}
                value={historyLimit}
                onChange={(e) => setHistoryLimit(Number(e.target.value))}
                className="mt-1.5 h-9 w-full rounded-md border bg-background px-3"
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button onClick={() => void save()} disabled={saving}>
                {saving && <Loader2 className="animate-spin" />}
                Salvar
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
function AreaTree({
  node,
  hasParent,
  onMaximize,
}: {
  node: AreaNode;
  hasParent: boolean;
  onMaximize: (id: string) => void;
}) {
  const split = useEditorStore((s) => s.splitArea);
  const join = useEditorStore((s) => s.joinArea);
  const setEditor = useEditorStore((s) => s.setAreaEditor);
  const resize = useEditorStore((s) => s.resizeSplit);
  if (node.kind === "area") {
    return (
      <EditorArea
        area={node}
        hasParent={hasParent}
        onMaximize={() => onMaximize(node.id)}
        onSplit={(direction) => split(node.id, direction)}
        onJoin={() => join(node.id)}
        onSetEditor={(editor) => setEditor(node.id, editor)}
      />
    );
  }
  return (
    <ResizablePanelGroup
      orientation={node.direction}
      className="h-full min-h-0"
      onLayoutChanged={(layout, meta) => {
        // Skip the mount/programmatic firing — only persist drags the user actually made.
        if (meta.isUserInteraction) resize(node.id, layout);
      }}
    >
      {node.children.map((child, i) => (
        <span className="contents" key={child.id}>
          {i > 0 && <ResizableHandle />}
          <ResizablePanel
            id={child.id}
            defaultSize={String(child.size ?? 100 / node.children.length)}
            minSize="10"
          >
            <AreaTree node={child} hasParent onMaximize={onMaximize} />
          </ResizablePanel>
        </span>
      ))}
    </ResizablePanelGroup>
  );
}
function EditorArea({
  area,
  hasParent,
  maximized = false,
  onMaximize,
  onSplit,
  onJoin,
  onSetEditor,
}: {
  area: Extract<AreaNode, { kind: "area" }>;
  hasParent: boolean;
  maximized?: boolean;
  onMaximize: () => void;
  onSplit: (direction: "horizontal" | "vertical") => void;
  onJoin: () => void;
  onSetEditor: (editor: AreaType) => void;
}) {
  return (
    <section className="flex h-full min-h-0 flex-col bg-background">
      <header className="flex h-8 shrink-0 items-center border-b bg-card px-1">
        <label className="relative">
          <select
            className="h-7 appearance-none bg-transparent pl-2 pr-7 text-xs font-medium outline-none"
            value={area.editor}
            onChange={(e) => onSetEditor(e.target.value as AreaType)}
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
        {!maximized && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto size-7"
              aria-label="Dividir na horizontal"
              title="Dividir na horizontal"
              onClick={() => onSplit("horizontal")}
            >
              <SplitSquareHorizontal />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label="Dividir na vertical"
              title="Dividir na vertical"
              onClick={() => onSplit("vertical")}
            >
              <SplitSquareVertical />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label="Juntar com área vizinha"
              title="Juntar com área vizinha"
              onClick={onJoin}
              disabled={!hasParent}
            >
              <X />
            </Button>
          </>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={maximized ? "ml-auto size-7" : "size-7"}
          aria-label={maximized ? "Restaurar área" : "Maximizar área"}
          onClick={onMaximize}
        >
          {maximized ? <Minimize2 /> : <Maximize2 />}
        </Button>
      </header>
      <div className="min-h-0 flex-1">
        {area.editor === "viewport" ? (
          <Suspense
            fallback={
              <div className="grid h-full place-items-center bg-muted">Carregando viewport…</div>
            }
          >
            <Viewport />
          </Suspense>
        ) : area.editor === "outliner" ? (
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
    preview = useEditorStore((s) => s.transformPreview),
    setVector = useEditorStore((s) => s.setVector);
  const found = doc.scene.objects.find((x) => x.id === doc.selection[0]);
  if (!found)
    return (
      <div className="grid h-full place-items-center text-muted-foreground">Nada selecionado</div>
    );
  // Reflects a G/R/S drag still in progress in the Viewport, live.
  const o = preview?.id === found.id ? { ...found, [preview.key]: preview.value } : found;
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
              value={field === "rotation" ? radToDeg(v).toFixed(1) : v}
              onChange={(e) => {
                const n = Number(e.target.value);
                const next = [...object[field]] as Vec3;
                next[i] = field === "rotation" ? degToRad(n) : n;
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
