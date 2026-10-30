import React from "react";

// Status is always an icon plus a word, never colour alone.
const ICONS = {
  ok: "✓",
  live: "●",
  replay: "○",
  high: "▲",
  low: "▼",
  stale: "!",
  fault: "!",
  off: "×",
  none: "–",
};

function StatusText({ status, children }) {
  return (
    <span className={`status status--${status}`}>
      <span aria-hidden="true" className="status-icon">
        {ICONS[status] || ICONS.none}
      </span>
      {children}
    </span>
  );
}

export default StatusText;
