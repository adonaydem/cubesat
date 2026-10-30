const MISSING = "-";

export function formatNumber(value, decimals = 0) {
  if (value === null || value === undefined || !Number.isFinite(value)) return MISSING;
  return value.toFixed(decimals).replace("-", "−");
}

export function formatValue(value, unit, decimals = 0) {
  const number = formatNumber(value, decimals);
  if (number === MISSING) return number;
  return unit === "%" ? `${number}%` : `${number} ${unit}`;
}

export function formatRange([low, high], unit) {
  const range = `${formatNumber(low)} to ${formatNumber(high)}`;
  return unit === "%" ? `${range}%` : `${range} ${unit}`;
}

export function formatClock(ms) {
  if (!ms) return MISSING;
  return new Date(ms).toLocaleTimeString("en-GB", { hour12: false });
}

// Clip position as m:ss.
export function formatClip(seconds) {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) return MISSING;
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

export function formatAge(ms) {
  if (ms === null || ms === undefined) return MISSING;
  const seconds = Math.max(0, Math.round(ms / 1000));
  if (seconds < 60) return `${seconds} s ago`;
  return `${Math.floor(seconds / 60)} min ago`;
}
