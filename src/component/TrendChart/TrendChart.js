"use client";
import React, { useEffect, useRef, useState } from "react";

const HEIGHT = 168;
const MARGIN = { top: 12, right: 60, bottom: 26, left: 44 };

function niceTicks(min, max, count = 4) {
  const raw = (max - min) / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw);
  const ticks = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) {
    ticks.push(Number(v.toFixed(6)));
  }
  return ticks;
}

// Single-series line chart: hairline grid, optional nominal-range band,
// optional playhead, crosshair readout on hover and arrow keys.
function TrendChart({ label, points, xDomain, yDomain, band, bandLabel = "Nominal", playheadX, formatX, formatY }) {
  const wrapRef = useRef(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState(null);

  useEffect(() => {
    const element = wrapRef.current;
    if (!element) return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const [x0, x1] = xDomain;
  const [y0, y1] = yDomain;
  const innerWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
  const innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const sx = (x) => MARGIN.left + (x1 === x0 ? 0 : ((x - x0) / (x1 - x0)) * innerWidth);
  const sy = (y) => MARGIN.top + innerHeight - ((Math.min(Math.max(y, y0), y1) - y0) / (y1 - y0)) * innerHeight;

  const visible = points.filter((p) => p.y !== null && p.x >= x0 && p.x <= x1);
  const hasPlayhead = playheadX !== null && playheadX !== undefined && playheadX >= x0 && playheadX <= x1;
  const labelled = hasPlayhead
    ? visible.filter((p) => p.x <= playheadX).pop() || visible[0]
    : visible[visible.length - 1];
  const activePoint = active !== null ? visible[Math.min(active, visible.length - 1)] : null;

  let path = "";
  let penDown = false;
  for (const p of points) {
    if (p.y === null || p.x < x0 || p.x > x1) {
      penDown = false;
      continue;
    }
    path += `${penDown ? "L" : "M"}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`;
    penDown = true;
  }

  function nearest(px) {
    let best = null;
    let bestDistance = Infinity;
    visible.forEach((p, i) => {
      const distance = Math.abs(sx(p.x) - px);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = i;
      }
    });
    return best;
  }

  function handlePointer(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    setActive(nearest(event.clientX - rect.left));
  }

  function handleKey(event) {
    if (!visible.length) return;
    const current = active === null ? visible.length - 1 : active;
    if (event.key === "ArrowLeft") setActive(Math.max(0, current - 1));
    else if (event.key === "ArrowRight") setActive(Math.min(visible.length - 1, current + 1));
    else return;
    event.preventDefault();
  }

  const yTicks = niceTicks(y0, y1);
  const xTicks = [x0, (x0 + x1) / 2, x1];
  const tooltipLeft = activePoint ? Math.min(Math.max(sx(activePoint.x), 56), width - 56) : 0;

  return (
    <div
      aria-label={`${label}. Use the left and right arrow keys to read values.`}
      className="chart"
      onBlur={() => setActive(null)}
      onFocus={() => setActive(visible.length ? visible.length - 1 : null)}
      onKeyDown={handleKey}
      ref={wrapRef}
      role="group"
      tabIndex={0}
    >
      {width > 0 ? (
        <svg
          aria-hidden="true"
          height={HEIGHT}
          onPointerLeave={() => setActive(null)}
          onPointerMove={handlePointer}
          width={width}
        >
          {band ? (
            <rect
              className="chart-band"
              height={Math.max(0, sy(band[0]) - sy(band[1]))}
              width={innerWidth}
              x={MARGIN.left}
              y={sy(band[1])}
            />
          ) : null}
          {yTicks.map((tick) => (
            <g key={tick}>
              <line
                className={tick === y0 ? "chart-axis" : "chart-grid"}
                x1={MARGIN.left}
                x2={MARGIN.left + innerWidth}
                y1={sy(tick)}
                y2={sy(tick)}
              />
              <text className="chart-tick" textAnchor="end" x={MARGIN.left - 8} y={sy(tick) + 4}>
                {tick}
              </text>
            </g>
          ))}
          {band ? (
            <text className="chart-band-label" x={MARGIN.left + 6} y={sy(band[1]) + 13}>
              {bandLabel}
            </text>
          ) : null}
          {xTicks.map((tick, i) => (
            <text
              className="chart-tick"
              key={i}
              textAnchor={["start", "middle", "end"][i]}
              x={sx(tick)}
              y={HEIGHT - 6}
            >
              {formatX(tick)}
            </text>
          ))}
          {hasPlayhead ? (
            <line
              className="chart-playhead"
              x1={sx(playheadX)}
              x2={sx(playheadX)}
              y1={MARGIN.top}
              y2={MARGIN.top + innerHeight}
            />
          ) : null}
          {path ? <path className="chart-line" d={path} /> : null}
          {labelled ? (
            <g>
              <circle className="chart-dot" cx={sx(labelled.x)} cy={sy(labelled.y)} r={4} />
              <text
                className="chart-end-label"
                textAnchor={hasPlayhead && sx(labelled.x) > MARGIN.left + innerWidth - 40 ? "end" : "start"}
                x={hasPlayhead && sx(labelled.x) > MARGIN.left + innerWidth - 40 ? sx(labelled.x) - 10 : sx(labelled.x) + 10}
                y={hasPlayhead ? sy(labelled.y) - 8 : sy(labelled.y) + 4}
              >
                {formatY(labelled.y)}
              </text>
            </g>
          ) : null}
          {activePoint ? (
            <g>
              <line
                className="chart-crosshair"
                x1={sx(activePoint.x)}
                x2={sx(activePoint.x)}
                y1={MARGIN.top}
                y2={MARGIN.top + innerHeight}
              />
              <circle className="chart-dot" cx={sx(activePoint.x)} cy={sy(activePoint.y)} r={4} />
            </g>
          ) : null}
          {!visible.length ? (
            <text className="chart-tick" textAnchor="middle" x={MARGIN.left + innerWidth / 2} y={MARGIN.top + innerHeight / 2}>
              No data yet
            </text>
          ) : null}
        </svg>
      ) : (
        <div style={{ height: HEIGHT }} />
      )}
      {activePoint ? (
        <div aria-live="polite" className="chart-tooltip" style={{ left: tooltipLeft }}>
          <strong>{formatY(activePoint.y)}</strong>
          <span>{formatX(activePoint.x)}</span>
        </div>
      ) : null}
    </div>
  );
}

export default TrendChart;
