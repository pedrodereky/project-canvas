import { z } from "zod";

export type Vec3 = [number, number, number];
export type SceneObject = {
  id: string;
  type: "cube" | "sphere" | "plane";
  name: string;
  visible: boolean;
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
};
export type AreaType = "viewport" | "outliner" | "properties";
export type AreaNode =
  | { kind: "area"; id: string; editor: AreaType; size?: number | undefined }
  | { kind: "split"; id: string; direction: "horizontal" | "vertical"; children: AreaNode[] };
export type ProjectDocument = {
  schemaVersion: 1;
  scene: { objects: SceneObject[] };
  selection: string[];
  workspaces: { id: string; name: string; layout: AreaNode }[];
  activeWorkspaceId: string;
};

const vec3 = z.tuple([z.number(), z.number(), z.number()]);
const objectSchema = z.object({
  id: z.string(),
  type: z.enum(["cube", "sphere", "plane"]),
  name: z.string(),
  visible: z.boolean(),
  position: vec3,
  rotation: vec3,
  scale: vec3,
});
const areaSchema: z.ZodType<AreaNode> = z.lazy(() =>
  z.union([
    z.object({
      kind: z.literal("area"),
      id: z.string(),
      editor: z.enum(["viewport", "outliner", "properties"]),
      size: z.number().optional(),
    }),
    z.object({
      kind: z.literal("split"),
      id: z.string(),
      direction: z.enum(["horizontal", "vertical"]),
      children: z.array(areaSchema).min(2),
    }),
  ]),
);
const documentSchema = z.object({
  schemaVersion: z.literal(1),
  scene: z.object({ objects: z.array(objectSchema) }),
  selection: z.array(z.string()),
  workspaces: z.array(z.object({ id: z.string(), name: z.string(), layout: areaSchema })).min(1),
  activeWorkspaceId: z.string(),
});

export function createDocument(): ProjectDocument {
  return {
    schemaVersion: 1,
    scene: { objects: [] },
    selection: [],
    workspaces: [
      {
        id: "modelagem",
        name: "Modelagem",
        layout: { kind: "area", id: "viewport-main", editor: "viewport" },
      },
    ],
    activeWorkspaceId: "modelagem",
  };
}
export function migrateDocument(value: unknown): ProjectDocument {
  return documentSchema.parse(value);
}
