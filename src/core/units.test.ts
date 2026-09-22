import { describe, expect, it } from "vitest"; import { fromDisplay, mmToM, mToMm, toDisplay } from "./units";
describe("units", () => { it("converts mm and m", () => { expect(mmToM(2000)).toBe(2); expect(mToMm(2)).toBe(2000); expect(toDisplay(1.5,"mm")).toBe(1500); expect(fromDisplay(500,"mm")).toBe(.5); }); });
