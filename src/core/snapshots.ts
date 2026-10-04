// Pure domain logic for versioned autosave (recovery points). No I/O here —
// the server functions call these to decide WHEN to archive a snapshot and
// WHICH ones to prune. Keeping it pure lets Vitest cover the policy directly.

export type SnapshotKind = "autosave" | "manual";

export interface SnapshotMeta {
  id: string;
  kind: SnapshotKind;
  createdAt: string; // ISO timestamp
}

// How often an autosave snapshot may be taken, and how many to keep. Manual
// snapshots ignore both: they are never throttled and never pruned here.
export const AUTOSAVE_CADENCE_MS = 5 * 60 * 1000;
export const AUTOSAVE_RETENTION = 20;

// An autosave snapshot is due when none exists yet, or the latest one is older
// than the cadence. `lastAt` is the newest autosave's timestamp (null = none).
export function isSnapshotDue(
  lastAt: Date | null,
  now: Date,
  cadenceMs: number = AUTOSAVE_CADENCE_MS,
): boolean {
  if (!lastAt) return true;
  return now.getTime() - lastAt.getTime() >= cadenceMs;
}

// Given all snapshots of a project, return the ids of the autosave ones that
// fall outside the retention window (keeping the `keep` most recent). Manual
// snapshots are never returned.
export function snapshotsToPrune(
  snapshots: SnapshotMeta[],
  keep: number = AUTOSAVE_RETENTION,
): string[] {
  const autosaves = snapshots
    .filter((s) => s.kind === "autosave")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return autosaves.slice(Math.max(keep, 0)).map((s) => s.id);
}

export function snapshotStoragePath(projectId: string, snapshotId: string): string {
  return `${projectId}/snapshots/${snapshotId}.json`;
}
