import { create } from "zustand";
import { createHistory, change, undo, redo, type History } from "@/core/history";
import {
  createDocument,
  type AreaType,
  type ProjectDocument,
  type SceneObject,
  type Vec3,
} from "@/core/document";
import {
  joinArea as joinAreaNode,
  resizeSplit as resizeSplitNode,
  setAreaEditor as setAreaEditorNode,
  splitArea as splitAreaNode,
} from "@/core/areas";

type EditorState = {
  history: History<ProjectDocument>;
  dirty: boolean;
  editable: boolean;
  saveState: "saved" | "saving" | "error";
  setDocument: (doc: ProjectDocument, limit: number) => void;
  setEditable: (v: boolean) => void;
  setSaveState: (v: EditorState["saveState"]) => void;
  markSaved: () => void;
  add: (type: SceneObject["type"]) => void;
  select: (id: string, additive?: boolean) => void;
  toggleVisible: (id: string) => void;
  rename: (id: string, name: string) => void;
  setVector: (id: string, key: "position" | "rotation" | "scale", value: Vec3) => void;
  splitArea: (areaId: string, direction: "horizontal" | "vertical") => void;
  joinArea: (areaId: string) => void;
  setAreaEditor: (areaId: string, editor: AreaType) => void;
  resizeSplit: (splitId: string, sizes: Record<string, number>) => void;
  undo: () => void;
  redo: () => void;
};
const names = { cube: "Cubo", sphere: "Esfera", plane: "Plano" };
export const useEditorStore = create<EditorState>((set, get) => ({
  history: createHistory(createDocument()),
  dirty: false,
  editable: true,
  saveState: "saved",
  setDocument: (doc, limit) => set({ history: createHistory(doc, limit), dirty: false }),
  setEditable: (editable) => set({ editable }),
  setSaveState: (saveState) => set({ saveState }),
  markSaved: () => set({ dirty: false, saveState: "saved" }),
  add: (type) => {
    if (!get().editable) return;
    set((s) => ({
      history: change(s.history, `Adicionar ${names[type]}`, (d) => {
        d.scene.objects.push({
          id: crypto.randomUUID(),
          type,
          name: names[type],
          visible: true,
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
        });
      }),
      dirty: true,
    }));
  },
  select: (id, additive = false) =>
    set((s) => ({
      history: change(s.history, "Selecionar", (d) => {
        d.selection = additive
          ? d.selection.includes(id)
            ? d.selection.filter((x) => x !== id)
            : [...d.selection, id]
          : [id];
      }),
    })),
  toggleVisible: (id) => {
    if (!get().editable) return;
    set((s) => ({
      history: change(s.history, "Visibilidade", (d) => {
        const o = d.scene.objects.find((x) => x.id === id);
        if (o) o.visible = !o.visible;
      }),
      dirty: true,
    }));
  },
  rename: (id, name) => {
    if (!get().editable) return;
    set((s) => ({
      history: change(s.history, "Renomear", (d) => {
        const o = d.scene.objects.find((x) => x.id === id);
        if (o) o.name = name;
      }),
      dirty: true,
    }));
  },
  setVector: (id, key, value) => {
    if (!get().editable) return;
    set((s) => ({
      history: change(s.history, `Alterar ${key}`, (d) => {
        const o = d.scene.objects.find((x) => x.id === id);
        if (o) o[key] = value;
      }),
      dirty: true,
    }));
  },
  // Layout actions run regardless of `editable`: readers may rearrange areas for
  // their own session, but persist() only ever saves while the caller holds the
  // lock, so a non-owner's changes never reach the server (spec: layout changes
  // in read-only mode are session-only and revert on reload).
  splitArea: (areaId, direction) =>
    set((s) => ({
      history: change(s.history, "Dividir área", (d) => {
        const ws = d.workspaces.find((w) => w.id === d.activeWorkspaceId);
        if (!ws) return;
        ws.layout = splitAreaNode(ws.layout, areaId, direction, {
          splitId: crypto.randomUUID(),
          newAreaId: crypto.randomUUID(),
        });
      }),
      dirty: true,
    })),
  joinArea: (areaId) =>
    set((s) => ({
      history: change(s.history, "Juntar áreas", (d) => {
        const ws = d.workspaces.find((w) => w.id === d.activeWorkspaceId);
        if (ws) ws.layout = joinAreaNode(ws.layout, areaId);
      }),
      dirty: true,
    })),
  setAreaEditor: (areaId, editor) =>
    set((s) => ({
      history: change(s.history, "Trocar editor da área", (d) => {
        const ws = d.workspaces.find((w) => w.id === d.activeWorkspaceId);
        if (ws) ws.layout = setAreaEditorNode(ws.layout, areaId, editor);
      }),
      dirty: true,
    })),
  resizeSplit: (splitId, sizes) =>
    set((s) => ({
      history: change(s.history, "Redimensionar área", (d) => {
        const ws = d.workspaces.find((w) => w.id === d.activeWorkspaceId);
        if (ws) ws.layout = resizeSplitNode(ws.layout, splitId, sizes);
      }),
      dirty: true,
    })),
  undo: () => {
    if (get().editable) set((s) => ({ history: undo(s.history), dirty: true }));
  },
  redo: () => {
    if (get().editable) set((s) => ({ history: redo(s.history), dirty: true }));
  },
}));
