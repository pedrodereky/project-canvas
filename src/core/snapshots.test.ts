import { describe, expect, it } from "vitest";
import {
  AUTOSAVE_CADENCE_MS,
  isSnapshotDue,
  snapshotStoragePath,
  snapshotsToPrune,
  type SnapshotMeta,
} from "./snapshots";

const auto = (id: string, createdAt: string): SnapshotMeta => ({ id, kind: "autosave", createdAt });
const manual = (id: string, createdAt: string): SnapshotMeta => ({ id, kind: "manual", createdAt });

describe("isSnapshotDue", () => {
  const now = new Date("2026-01-01T12:00:00.000Z");

  it("is due when there is no previous snapshot", () => {
    expect(isSnapshotDue(null, now)).toBe(true);
  });

  it("is due once the cadence has elapsed", () => {
    const old = new Date(now.getTime() - AUTOSAVE_CADENCE_MS);
    expect(isSnapshotDue(old, now)).toBe(true);
  });

  it("is not due before the cadence elapses", () => {
    const recent = new Date(now.getTime() - (AUTOSAVE_CADENCE_MS - 1));
    expect(isSnapshotDue(recent, now)).toBe(false);
  });

  it("honors a custom cadence", () => {
    const at = new Date(now.getTime() - 1000);
    expect(isSnapshotDue(at, now, 500)).toBe(true);
    expect(isSnapshotDue(at, now, 2000)).toBe(false);
  });
});

describe("snapshotsToPrune", () => {
  it("keeps the most recent autosaves and prunes the rest", () => {
    const list = [
      auto("a", "2026-01-01T10:00:00.000Z"),
      auto("b", "2026-01-01T11:00:00.000Z"),
      auto("c", "2026-01-01T12:00:00.000Z"),
    ];
    expect(snapshotsToPrune(list, 2)).toEqual(["a"]);
  });

  it("never prunes manual snapshots", () => {
    const list = [
      manual("m1", "2026-01-01T09:00:00.000Z"),
      manual("m2", "2026-01-01T08:00:00.000Z"),
      auto("a", "2026-01-01T10:00:00.000Z"),
      auto("b", "2026-01-01T11:00:00.000Z"),
    ];
    expect(snapshotsToPrune(list, 1)).toEqual(["a"]);
  });

  it("returns nothing when under the retention limit", () => {
    expect(snapshotsToPrune([auto("a", "2026-01-01T10:00:00.000Z")], 20)).toEqual([]);
  });

  it("prunes everything past retention regardless of input order", () => {
    const list = [
      auto("newest", "2026-01-03T00:00:00.000Z"),
      auto("oldest", "2026-01-01T00:00:00.000Z"),
      auto("middle", "2026-01-02T00:00:00.000Z"),
    ];
    expect([...snapshotsToPrune(list, 1)].sort()).toEqual(["middle", "oldest"]);
  });
});

describe("snapshotStoragePath", () => {
  it("builds a path under the project's snapshots folder", () => {
    expect(snapshotStoragePath("proj", "snap")).toBe("proj/snapshots/snap.json");
  });
});
