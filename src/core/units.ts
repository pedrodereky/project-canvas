export type DisplayUnit = "m" | "mm";
export const mmToM = (value: number) => value / 1000;
export const mToMm = (value: number) => value * 1000;
export function toDisplay(valueMeters: number, unit: DisplayUnit) {
  return unit === "mm" ? mToMm(valueMeters) : valueMeters;
}
export function fromDisplay(value: number, unit: DisplayUnit) {
  return unit === "mm" ? mmToM(value) : value;
}
