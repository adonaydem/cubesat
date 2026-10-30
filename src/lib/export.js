function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function csvCell(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows) {
  if (!rows.length) return "";
  const columns = Object.keys(rows[0]);
  return [columns.join(","), ...rows.map((row) => columns.map((c) => csvCell(row[c])).join(","))].join("\n");
}

export function downloadCsv(rows, filename) {
  download(new Blob([toCsv(rows)], { type: "text/csv" }), filename);
}

export function downloadJson(data, filename) {
  download(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }), filename);
}

// Current frame of a <video> or <img> as a PNG data URL, or null when the
// frame is not ready or the source is cross-origin without CORS.
export function frameToPng(element) {
  if (!element) return null;
  const width = element.videoWidth || element.naturalWidth;
  const height = element.videoHeight || element.naturalHeight;
  if (!width || !height) return null;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d").drawImage(element, 0, 0, width, height);
  try {
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

export function fileStamp(ms = Date.now()) {
  return new Date(ms).toISOString().slice(0, 19).replace(/:/g, "-");
}
