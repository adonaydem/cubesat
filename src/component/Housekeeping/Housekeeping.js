import React from "react";
import Panel from "../Panel";
import StatusText from "../StatusText";
import TrendChart from "../TrendChart";
import { SENSORS, TELEMETRY } from "../../config/mission";
import { evaluate } from "../../lib/telemetry";
import { formatAge, formatClock, formatNumber, formatRange, formatValue } from "../../lib/format";

const WINDOW_MS = (TELEMETRY.historyLength * 1000) / TELEMETRY.expectedHz;

function SensorCard({ sensor, history, now, current }) {
  const last = history.length ? history[history.length - 1] : null;
  const latest = last ? last.values[sensor.id] : null;
  const { status, label } = evaluate(sensor, latest);
  // A reading can arrive just after the 1 s clock tick; keep it in view.
  const end = now ? Math.max(now, last ? last.receivedAt : 0) : null;
  const format = (v) => formatValue(v, sensor.unit, sensor.decimals);

  return (
    <div className="sensor">
      <div className="sensor-head">
        <h3 className="sensor-label">{sensor.label}</h3>
        <StatusText status={status}>{label}</StatusText>
      </div>
      <p className={current ? "sensor-value" : "sensor-value sensor-value--old"}>{format(latest)}</p>
      <TrendChart
        band={sensor.nominal}
        bandLabel={`Nominal ${formatRange(sensor.nominal, sensor.unit)}`}
        formatX={formatClock}
        formatY={format}
        label={`${sensor.label} over the last ${Math.round(WINDOW_MS / 60000)} minutes`}
        points={history.map((r) => ({ x: r.receivedAt, y: r.values[sensor.id] }))}
        xDomain={end ? [end - WINDOW_MS, end] : [0, 1]}
        yDomain={sensor.chartRange}
      />
    </div>
  );
}

function Housekeeping({ mode, link, history, now, rateHz, canSerial, serialError, onConnect, onDisconnect, onReplay }) {
  const last = history.length ? history[history.length - 1] : null;
  const current = link.status === "live" || link.status === "replay";

  let linkLine = "";
  if (last && current) linkLine = `Updated ${formatAge(now - last.receivedAt)}, ${formatNumber(rateHz, 1)} Hz`;
  else if (last && link.status === "stale") linkLine = `No new data for ${formatAge(now - last.receivedAt).replace(" ago", "")}`;
  else if (last) linkLine = `Last reading at ${formatClock(last.receivedAt)}`;
  else if (mode === "live") linkLine = "Waiting for data";

  const storage = last && last.storageUsedMb !== null ? `${formatNumber(last.storageUsedMb / 1024, 2)} of ${TELEMETRY.storageCapacityGb} GB` : "-";
  const backlog =
    last && last.framesStored !== null && last.framesDownlinked !== null ? last.framesStored - last.framesDownlinked : null;

  return (
    <Panel id="sensors" status={<StatusText status={link.status}>{link.text}</StatusText>} title="Sensors and housekeeping">
      <div className="toolbar">
        {mode === "live" ? (
          <button className="button" onClick={onDisconnect} type="button">
            Disconnect sensor board
          </button>
        ) : (
          <button
            className="button button--primary"
            disabled={!canSerial}
            onClick={onConnect}
            title={canSerial ? undefined : "Requires Chrome or Edge on a desktop computer"}
            type="button"
          >
            Connect sensor board
          </button>
        )}
        {mode === "disconnected" ? (
          <button className="button" onClick={onReplay} type="button">
            Show replay
          </button>
        ) : null}
        {linkLine ? <p className="link-line">{linkLine}</p> : null}
      </div>
      {serialError ? <p className="note note--error">{serialError}</p> : null}

      <div className="sensor-grid">
        {SENSORS.map((sensor) => (
          <SensorCard current={current} history={history} key={sensor.id} now={now} sensor={sensor} />
        ))}
      </div>

      <dl className="stats stats--row">
        <div className="stat">
          <dt>Onboard storage</dt>
          <dd className="stat-text">{storage}</dd>
        </div>
        <div className="stat">
          <dt>Frames stored</dt>
          <dd className="stat-text">{last && last.framesStored !== null ? formatNumber(last.framesStored) : "-"}</dd>
        </div>
        <div className="stat">
          <dt>Frames downlinked</dt>
          <dd className="stat-text">{last && last.framesDownlinked !== null ? formatNumber(last.framesDownlinked) : "-"}</dd>
        </div>
        <div className="stat">
          <dt>Backlog</dt>
          <dd className="stat-text">{backlog !== null ? formatNumber(backlog) : "-"}</dd>
        </div>
      </dl>
    </Panel>
  );
}

export default Housekeeping;
