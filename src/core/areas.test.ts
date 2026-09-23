import { describe, expect, it } from "vitest";
import { hasSibling, joinArea, listAreas, resizeSplit, setAreaEditor, splitArea } from "./areas";
import type { AreaNode } from "./document";

const root: AreaNode = { kind: "area", id: "a", editor: "viewport" };
const ids = { splitId: "s1", newAreaId: "b" };

describe("areas", () => {
  it("splits a leaf into a binary split, keeping the original id", () => {
    const tree = splitArea(root, "a", "horizontal", ids);
    expect(tree).toEqual({
      kind: "split",
      id: "s1",
      direction: "horizontal",
      children: [
        { kind: "area", id: "a", editor: "viewport", size: 50 },
        { kind: "area", id: "b", editor: "viewport", size: 50 },
      ],
    });
  });

  it("lists every leaf area in a tree", () => {
    const tree = splitArea(root, "a", "vertical", ids);
    expect(listAreas(tree).map((a) => a.id)).toEqual(["a", "b"]);
  });

  it("reports a sibling only for areas inside a split", () => {
    expect(hasSibling(root, "a")).toBe(false);
    const tree = splitArea(root, "a", "horizontal", ids);
    expect(hasSibling(tree, "a")).toBe(true);
    expect(hasSibling(tree, "b")).toBe(true);
  });

  it("joins a binary split back into the sibling area", () => {
    const tree = splitArea(root, "a", "horizontal", ids);
    expect(joinArea(tree, "b")).toEqual({ kind: "area", id: "a", editor: "viewport", size: 50 });
  });

  it("changes only the targeted area's editor", () => {
    const tree = splitArea(root, "a", "horizontal", ids);
    const next = setAreaEditor(tree, "b", "outliner");
    expect(listAreas(next).map((a) => a.editor)).toEqual(["viewport", "outliner"]);
  });

  it("applies new sizes to a split's direct children", () => {
    const tree = splitArea(root, "a", "horizontal", ids);
    const next = resizeSplit(tree, "s1", { a: 30, b: 70 });
    expect(listAreas(next).map((a) => a.size)).toEqual([30, 70]);
  });

  it("splitting a nested area only affects that branch", () => {
    const tree = splitArea(root, "a", "horizontal", ids);
    const nested = splitArea(tree, "b", "vertical", { splitId: "s2", newAreaId: "c" });
    expect(listAreas(nested).map((a) => a.id)).toEqual(["a", "b", "c"]);
  });
});
