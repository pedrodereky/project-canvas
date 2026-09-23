import { describe, expect, it } from "vitest";
import {
  applyMouseDelta,
  backspace,
  computeResult,
  setAxis,
  startTransform,
  typeDigit,
} from "./transformModal";

describe("transformModal", () => {
  it("without an axis locked, nothing changes", () => {
    const state = startTransform("grab", [0, 0, 0]);
    expect(computeResult(state)).toEqual([0, 0, 0]);
  });

  it("G X 2 Enter moves exactly 2m on X", () => {
    let state = startTransform("grab", [0, 0, 0]);
    state = setAxis(state, "x");
    state = typeDigit(state, "2");
    expect(computeResult(state)).toEqual([2, 0, 0]);
  });

  it("pressing the same axis twice unlocks it", () => {
    let state = startTransform("grab", [1, 2, 3]);
    state = setAxis(state, "y");
    state = setAxis(state, "y");
    expect(state.axis).toBeNull();
    expect(computeResult(state)).toEqual([1, 2, 3]);
  });

  it("builds up a multi-digit, decimal, negative number", () => {
    let state = startTransform("grab", [0, 0, 0]);
    state = setAxis(state, "z");
    for (const char of "-12.5") state = typeDigit(state, char);
    expect(state.numericInput).toBe("-12.5");
    expect(computeResult(state)).toEqual([0, 0, -12.5]);
  });

  it("ignores a second minus sign or decimal point", () => {
    let state = startTransform("grab", [0, 0, 0]);
    state = setAxis(state, "x");
    state = typeDigit(state, "-");
    state = typeDigit(state, "1");
    state = typeDigit(state, "-");
    state = typeDigit(state, ".");
    state = typeDigit(state, "5");
    state = typeDigit(state, ".");
    expect(state.numericInput).toBe("-1.5");
  });

  it("backspace removes the last typed character", () => {
    let state = startTransform("grab", [0, 0, 0]);
    state = setAxis(state, "x");
    state = typeDigit(state, "2");
    state = typeDigit(state, "5");
    state = backspace(state);
    expect(state.numericInput).toBe("2");
  });

  it("falls back to the mouse delta when nothing was typed", () => {
    let state = startTransform("grab", [0, 0, 0]);
    state = setAxis(state, "x");
    state = applyMouseDelta(state, 100);
    expect(computeResult(state)).toEqual([1, 0, 0]);
  });

  it("rotate converts the typed degrees to radians", () => {
    let state = startTransform("rotate", [0, 0, 0]);
    state = setAxis(state, "y");
    state = typeDigit(state, "9");
    state = typeDigit(state, "0");
    const [, y] = computeResult(state);
    expect(y).toBeCloseTo(Math.PI / 2);
  });

  it("scale multiplies the origin by 1 + the typed factor", () => {
    let state = startTransform("scale", [2, 2, 2]);
    state = setAxis(state, "x");
    state = typeDigit(state, "1");
    expect(computeResult(state)).toEqual([4, 2, 2]);
  });
});
