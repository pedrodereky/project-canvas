import { describe, expect, it, vi } from "vitest";
import { CommandRegistry } from "./commands";
describe("commands", () =>
  it("searches and respects edit context", () => {
    const r = new CommandRegistry(),
      fn = vi.fn();
    r.register({ id: "sphere", name: "Adicionar esfera", needsEdit: true, run: fn });
    expect(r.search("esfera", { editable: true, focusedArea: "a" })).toHaveLength(1);
    expect(r.execute("sphere", { editable: false, focusedArea: "a" })).toBe(false);
    expect(fn).not.toHaveBeenCalled();
  }));
