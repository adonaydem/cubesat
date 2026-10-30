import { SPECTRAL } from "../config/mission";
import { formatNumber } from "./format";

export function vegetationClass(meanIndex) {
  if (meanIndex === null || meanIndex === undefined) return null;
  return SPECTRAL.classes.find((c) => meanIndex >= c.min) || null;
}

// One plain sentence for the current vegetation sample.
export function describeVegetation(sample, first) {
  const cls = vegetationClass(sample.mean_index);
  const change = sample.vegetation_cover_pct - first.vegetation_cover_pct;
  const changeText =
    Math.abs(change) < 1 ? "about the same as at the start" : `${change > 0 ? "up" : "down"} ${formatNumber(Math.abs(change))} points since the start`;
  return `Vegetation cover is ${formatNumber(sample.vegetation_cover_pct)}% (${cls.label.toLowerCase()}), ${changeText}.`;
}
