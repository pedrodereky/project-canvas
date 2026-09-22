import { create } from "zustand";
import { createHistory, change, undo, redo, type History } from "@/core/history";
import { createDocument, type ProjectDocument, type SceneObject, type Vec3 } from "@/core/document";

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
  undo: () => {
    if (get().editable) set((s) => ({ history: undo(s.history), dirty: true }));
  },
  redo: () => {
    if (get().editable) set((s) => ({ history: redo(s.history), dirty: true }));
  },
}));
