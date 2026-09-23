import { describe, expect, it } from "vitest";
import { change, createHistory, jumpTo, redo, undo } from "./history";
describe("history", () => {
  it("undoes and redoes patches", () => {
    const a = createHistory({ x: 0 });
    const b = change(a, "move", (d) => {
      d.x = 2;
    });
    expect(undo(b).present.x).toBe(0);
    expect(redo(undo(b)).present.x).toBe(2);
  });
  it("jumpTo navigates both backward and forward", () => {
    let h = createHistory({ x: 0 });
    h = change(h, "1", (d) => {
      d.x = 1;
    });
    h = change(h, "2", (d) => {
      d.x = 2;
    });
    h = change(h, "3", (d) => {
      d.x = 3;
    });
    expect(jumpTo(h, 0).present.x).toBe(1);
    expect(jumpTo(jumpTo(h, 0), 2).present.x).toBe(3);
    expect(jumpTo(h, -1).present.x).toBe(0);
  });
});
