import React from "react";

function Panel({ id, title, status, children }) {
  return (
    <section className="panel" id={id}>
      <header className="panel-header">
        <h2 className="panel-title">{title}</h2>
        {status}
      </header>
      {children}
    </section>
  );
}

export default Panel;
