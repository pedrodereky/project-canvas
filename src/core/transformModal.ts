import { degToRad } from "./angles";
import type { Vec3 } from "./document";

export type TransformMode = "grab" | "rotate" | "scale";
export type Axis = "x" | "y" | "z";

// A locked axis is required for the mouse or a typed number to have any
// effect — Fase 0 only needs the axis-locked path (e.g. `G X 2 Enter`); free
// (unlocked) drag along the view plane is a larger 3D-projection feature
// left for a later phase.
export type TransformModalState = {
  mode: TransformMode;
  axis: Axis | null;
  numericInput: string;
  mouseDelta: number;
  origin: Vec3;
};

const MOUSE_SENSITIVITY = 0.01;
const NUMERIC_CHAR = /^[0-9.-]$/;

export function startTransform(mode: TransformMode, origin: Vec3): TransformModalState {
  return { mode, axis: null, numericInput: "", mouseDelta: 0, origin };
}

export function setAxis(state: TransformModalState, axis: Axis): TransformModalState {
  return { ...state, axis: state.axis === axis ? null : axis, mouseDelta: 0 };
}

export function applyMouseDelta(
  state: TransformModalState,
  deltaPixels: number,
): TransformModalState {
  return { ...state, mouseDelta: state.mouseDelta + deltaPixels };
}

export function typeDigit(state: TransformModalState, char: string): TransformModalState {
  if (!NUMERIC_CHAR.test(char)) return state;
  if (char === "-") return state.numericInput === "" ? { ...state, numericInput: "-" } : state;
  if (char === "." && state.numericInput.includes(".")) return state;
  return { ...state, numericInput: state.numericInput + char };
}

export function backspace(state: TransformModalState): TransformModalState {
  return { ...state, numericInput: state.numericInput.slice(0, -1) };
}

function rawValue(state: TransformModalState): number {
  if (state.numericInput !== "" && state.numericInput !== "-") return Number(state.numericInput);
  return state.mouseDelta * MOUSE_SENSITIVITY;
}

export function computeResult(state: TransformModalState): Vec3 {
  if (!state.axis) return state.origin;
  const raw = rawValue(state);
  if (Number.isNaN(raw)) return state.origin;
  const delta = state.mode === "rotate" ? degToRad(raw) : raw;
  const [x, y, z] = state.origin;
  const combine = (base: number) => (state.mode === "scale" ? base * (1 + raw) : base + delta);
  if (state.axis === "x") return [combine(x), y, z];
  if (state.axis === "y") return [x, combine(y), z];
  return [x, y, combine(z)];
}
