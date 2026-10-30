import { SENSORS, TELEMETRY } from "../config/mission";

function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

// Turns one line from the sensor board, or one entry of the replay log, into a
// reading. Replay and live data both go through here.
export function parseLine(line, receivedAt = Date.now()) {
  let raw = line;
  if (typeof line === "string") {
    try {
      raw = JSON.parse(line);
    } catch {
      return null;
    }
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;

  const values = {};
  let hasValue = false;
  for (const sensor of SENSORS) {
    const value = toNumber(raw[sensor.field]);
    values[sensor.id] = value === null ? null : sensor.convert ? sensor.convert(value) : value;
    if (value !== null) hasValue = true;
  }
  if (!hasValue) return null;

  return {
    receivedAt,
    boardMs: toNumber(raw.t_ms),
    values,
    alert: raw.alert === true,
    storageUsedMb: toNumber(raw.storage_used_mb),
    framesStored: toNumber(raw.frames_stored),
    framesDownlinked: toNumber(raw.frames_downlinked),
  };
}

// Compares a value with the sensor's measurable and nominal ranges.
export function evaluate(sensor, value) {
  if (value === null || value === undefined) return { status: "none", label: "No data" };
  const [sensorMin, sensorMax] = sensor.sensorRange;
  if (value < sensorMin || value > sensorMax) return { status: "fault", label: "Sensor fault" };
  const [low, high] = sensor.nominal;
  if (value > high) return { status: "high", label: "High" };
  if (value < low) return { status: "low", label: "Low" };
  return { status: "ok", label: "Within range" };
}

export function serialSupported() {
  return typeof navigator !== "undefined" && "serial" in navigator;
}

// Opens the sensor board over Web Serial (Chrome/Edge desktop) and reads one
// JSON object per line. Returns a function that closes the connection.
export async function connectSerial({ onReading, onClose }) {
  const port = await navigator.serial.requestPort();
  await port.open({ baudRate: TELEMETRY.baudRate });

  const decoder = new TextDecoderStream();
  const pipeClosed = port.readable.pipeTo(decoder.writable).catch(() => {});
  const reader = decoder.readable.getReader();
  let closedByUser = false;

  (async () => {
    let buffer = "";
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop();
        // A board printing without newlines should not grow the buffer forever.
        if (buffer.length > 4096) buffer = "";
        for (const line of lines) {
          const reading = parseLine(line.trim());
          if (reading) onReading(reading);
        }
      }
    } catch {
      // The board was unplugged or the port failed.
    } finally {
      reader.releaseLock();
      await pipeClosed;
      await port.close().catch(() => {});
      onClose({ unplugged: !closedByUser });
    }
  })();

  return async function disconnect() {
    closedByUser = true;
    await reader.cancel().catch(() => {});
  };
}

// Plays the replay log at the expected rate, starting at `startIndex`.
export function replayLog(lines, onReading, startIndex = 0) {
  let index = startIndex;
  const id = setInterval(() => {
    const reading = parseLine(lines[index % lines.length]);
    index += 1;
    if (reading) onReading(reading);
  }, 1000 / TELEMETRY.expectedHz);
  return () => clearInterval(id);
}

// Readings for the first `count` log lines, timestamped as if they arrived
// over the last `count` steps up to now, so the charts are not empty on load.
export function replayBacklog(lines, count, now = Date.now()) {
  const step = 1000 / TELEMETRY.expectedHz;
  return lines
    .slice(0, count)
    .map((line, i) => parseLine(line, now - (count - 1 - i) * step))
    .filter(Boolean);
}
