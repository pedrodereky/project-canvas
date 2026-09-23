import type { AreaNode, AreaType } from "./document";

export function listAreas(node: AreaNode): Extract<AreaNode, { kind: "area" }>[] {
  return node.kind === "area" ? [node] : node.children.flatMap(listAreas);
}

export function hasSibling(node: AreaNode, areaId: string): boolean {
  if (node.kind !== "split") return false;
  return (
    node.children.some((c) => c.id === areaId) || node.children.some((c) => hasSibling(c, areaId))
  );
}

export function splitArea(
  node: AreaNode,
  areaId: string,
  direction: "horizontal" | "vertical",
  ids: { splitId: string; newAreaId: string },
): AreaNode {
  if (node.kind === "area") {
    if (node.id !== areaId) return node;
    return {
      kind: "split",
      id: ids.splitId,
      direction,
      children: [
        { ...node, size: 50 },
        { kind: "area", id: ids.newAreaId, editor: node.editor, size: 50 },
      ],
    };
  }
  return { ...node, children: node.children.map((c) => splitArea(c, areaId, direction, ids)) };
}

// Only collapses binary splits (the only shape splitArea ever produces); a
// split found with a different child count is left untouched.
export function joinArea(node: AreaNode, areaId: string): AreaNode {
  if (node.kind !== "split") return node;
  const index = node.children.findIndex((c) => c.id === areaId);
  if (index !== -1 && node.children.length === 2) {
    return node.children[1 - index] as AreaNode;
  }
  return { ...node, children: node.children.map((c) => joinArea(c, areaId)) };
}

export function setAreaEditor(node: AreaNode, areaId: string, editor: AreaType): AreaNode {
  if (node.kind === "area") return node.id === areaId ? { ...node, editor } : node;
  return { ...node, children: node.children.map((c) => setAreaEditor(c, areaId, editor)) };
}

export function resizeSplit(
  node: AreaNode,
  splitId: string,
  sizes: Record<string, number>,
): AreaNode {
  if (node.kind !== "split") return node;
  if (node.id === splitId) {
    return {
      ...node,
      children: node.children.map((c) => (c.id in sizes ? { ...c, size: sizes[c.id] } : c)),
    };
  }
  return { ...node, children: node.children.map((c) => resizeSplit(c, splitId, sizes)) };
}
