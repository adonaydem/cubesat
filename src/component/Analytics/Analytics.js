import React from "react";
import Panel from "../Panel";
import StatusText from "../StatusText";
import TrendChart from "../TrendChart";
import { SPECTRAL } from "../../config/mission";
import { formatClip, formatNumber } from "../../lib/format";
import { describeVegetation, vegetationClass } from "../../lib/interpret";

function Analytics({ samples, current, time, duration }) {
  const loaded = Array.isArray(samples) && samples.length > 0;
  // Clips are often shorter than the sample timeline; chart only the clip.
  const lastT = loaded ? samples[samples.length - 1].t : 0;
  const chartEnd = Number.isFinite(duration) && duration > 0 ? Math.min(duration, lastT) : lastT;
  const cls = current ? vegetationClass(current.mean_index) : null;

  return (
    <Panel
      id="analytics"
      status={samples && !loaded ? <StatusText status="off">No data</StatusText> : null}
      title="Vegetation analytics"
    >
      <div className="analytics">
        <dl className="stats">
          <div className="stat">
            <dt>Vegetation cover</dt>
            <dd>{current ? `${formatNumber(current.vegetation_cover_pct)}%` : "-"}</dd>
          </div>
          <div className="stat">
            <dt>{SPECTRAL.index.label}</dt>
            <dd>{current ? formatNumber(current.mean_index, SPECTRAL.index.decimals) : "-"}</dd>
          </div>
          <div className="stat">
            <dt>Scene class</dt>
            <dd className="stat-text">{cls ? cls.label : "-"}</dd>
          </div>
        </dl>
        {loaded ? (
          <div className="analytics-chart">
            <p className="chart-title">Vegetation cover (%)</p>
            <TrendChart
              formatX={formatClip}
              formatY={(v) => `${formatNumber(v)}%`}
              label="Vegetation cover over time"
              playheadX={time}
              points={samples.map((s) => ({ x: s.t, y: s.vegetation_cover_pct }))}
              xDomain={[0, chartEnd]}
              yDomain={[0, 100]}
            />
          </div>
        ) : null}
      </div>
      {current && loaded ? <p className="interpretation">{describeVegetation(current, samples[0])}</p> : null}
    </Panel>
  );
}

export default Analytics;
