import * as React from "react";
import ProjectLinks from "../component/ProjectLink";
import Dashboard from "../component/Dashboard";
import { LINKS, MISSION } from "../config/mission";

const SECTIONS = [
  { id: "live", label: "Live view" },
  { id: "analytics", label: "Analytics" },
  { id: "sensors", label: "Sensors" },
  { id: "log", label: "Log and export" },
];

export default function Home() {
  const links = LINKS.filter((link) => link.href);

  return (
    <main className="page-shell dashboard-shell">
      <header className="dashboard-header">
        <div>
          <h1 className="dashboard-title">{MISSION.name}</h1>
          <p className="dashboard-subtitle">
            {MISSION.code ? `${MISSION.team} (${MISSION.code})` : MISSION.team}, {MISSION.event}
          </p>
        </div>
        {links.length ? <ProjectLinks links={links} /> : null}
      </header>
      <nav aria-label="Sections" className="section-nav">
        {SECTIONS.map((section) => (
          <a href={`#${section.id}`} key={section.id}>
            {section.label}
          </a>
        ))}
      </nav>
      <Dashboard />
    </main>
  );
}
