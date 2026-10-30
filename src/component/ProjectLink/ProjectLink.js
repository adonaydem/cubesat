import React from "react";
import Icon from "../Icon/Icon";

function ProjectLinks({ links }) {
  return (
    <nav aria-label="Project links" className="project-links">
      {links.map((link) => (
        <a
          key={link.label}
          className="project-link"
          href={link.href}
        >
          <Icon size="20" id={link.iconId} />
          {link.label}
        </a>
      ))}
    </nav>
  );
}
export default ProjectLinks;
