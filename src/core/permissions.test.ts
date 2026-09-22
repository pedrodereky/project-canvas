import { describe, expect, it } from "vitest";
import { can } from "./permissions";
describe("can", () => it("allows phase zero features", () => expect(can({}, "edit")).toBe(true)));
