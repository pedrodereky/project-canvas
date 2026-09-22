import { describe, expect, it } from "vitest";
import { change, createHistory, redo, undo } from "./history";
describe("history", () =>
  it("undoes and redoes patches", () => {
    const a = createHistory({ x: 0 });
    const b = change(a, "move", (d) => {
      d.x = 2;
    });
    expect(undo(b).present.x).toBe(0);
    expect(redo(undo(b)).present.x).toBe(2);
  }));
