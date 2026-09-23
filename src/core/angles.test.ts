import { describe, expect, it } from "vitest";
import { degToRad, radToDeg } from "./angles";

describe("angles", () => {
  it("converts radians and degrees", () => {
    expect(radToDeg(Math.PI)).toBe(180);
    expect(degToRad(180)).toBeCloseTo(Math.PI);
    expect(radToDeg(degToRad(90))).toBeCloseTo(90);
  });
});
