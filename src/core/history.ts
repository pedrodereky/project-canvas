import { applyPatches, enablePatches, produceWithPatches, type Patch } from "immer";
enablePatches();
export type HistoryEntry<T extends object> = {
  label: string;
  patches: Patch[];
  inverse: Patch[];
  snapshot: T;
};
export type History<T extends object> = {
  past: HistoryEntry<T>[];
  present: T;
  future: HistoryEntry<T>[];
  limit: number;
};
export const createHistory = <T extends object>(present: T, limit = 100): History<T> => ({
  past: [],
  present,
  future: [],
  limit,
});
export function change<T extends object>(
  history: History<T>,
  label: string,
  recipe: (draft: T) => void,
): History<T> {
  const [present, patches, inverse] = produceWithPatches(history.present, recipe);
  if (!patches.length) return history;
  const entry = { label, patches, inverse, snapshot: history.present };
  return { ...history, present, past: [...history.past, entry].slice(-history.limit), future: [] };
}
export function undo<T extends object>(history: History<T>): History<T> {
  const entry = history.past.at(-1);
  if (!entry) return history;
  return {
    ...history,
    present: applyPatches(history.present, entry.inverse) as T,
    past: history.past.slice(0, -1),
    future: [entry, ...history.future],
  };
}
export function redo<T extends object>(history: History<T>): History<T> {
  const entry = history.future[0];
  if (!entry) return history;
  return {
    ...history,
    present: applyPatches(history.present, entry.patches) as T,
    past: [...history.past, entry],
    future: history.future.slice(1),
  };
}
export function jumpTo<T extends object>(history: History<T>, index: number): History<T> {
  let next = history;
  while (next.past.length - 1 > index) next = undo(next);
  return next;
}
