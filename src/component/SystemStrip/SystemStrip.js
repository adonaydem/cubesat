import React from "react";
import StatusText from "../StatusText";

// Subsystem boxes in data-flow order, after the team's system diagram.
function SystemStrip({ camera, storage, link, ai, sensor }) {
  const nodes = [
    { key: "camera", label: "Camera", ...camera },
    { key: "storage", label: "Onboard storage", ...storage },
    { key: "link", label: "Ground link", ...link },
    { key: "ai", label: "Ground AI", ...ai },
    { key: "dashboard", label: "Dashboard", status: "live", text: "Online" },
    { key: "sensor", label: "Sensor board", ...sensor },
  ];

  return (
    <section aria-label="System status" className="system-strip">
      {nodes.map((node) => (
        <div className={`system-node system-node--${node.key}`} key={node.key}>
          <span className="system-label">{node.label}</span>
          <StatusText status={node.status}>{node.text}</StatusText>
        </div>
      ))}
    </section>
  );
}

export default SystemStrip;
