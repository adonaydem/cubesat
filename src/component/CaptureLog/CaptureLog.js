import React from "react";
import Panel from "../Panel";
import { SENSORS, SPECTRAL } from "../../config/mission";
import { formatClip, formatClock, formatNumber, formatValue } from "../../lib/format";

function CaptureLog({ captures, sensorCount, onExportLog, onExportSensors }) {
  return (
    <Panel id="log" status={<span className="panel-meta">{captures.length} captured</span>} title="Capture log and export">
      <div className="toolbar">
        <button className="button" disabled={!captures.length} onClick={onExportLog} type="button">
          Export capture log (CSV)
        </button>
        <button className="button" disabled={!sensorCount} onClick={onExportSensors} type="button">
          Export sensor data (CSV)
        </button>
      </div>
      {captures.length ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Time</th>
                <th scope="col">Source</th>
                <th scope="col">Clip</th>
                <th scope="col">Cover</th>
                <th scope="col">{SPECTRAL.index.label}</th>
                {SENSORS.map((s) => (
                  <th key={s.id} scope="col">
                    {s.label}
                  </th>
                ))}
                <th scope="col">Images</th>
              </tr>
            </thead>
            <tbody>
              {captures.map((c) => (
                <tr key={c.id}>
                  <td>{c.id}</td>
                  <td>{formatClock(c.time)}</td>
                  <td>{c.source}</td>
                  <td>{formatClip(c.clipTime)}</td>
                  <td>{c.cover !== null ? `${formatNumber(c.cover)}%` : "-"}</td>
                  <td>{formatNumber(c.meanIndex, SPECTRAL.index.decimals)}</td>
                  {SENSORS.map((s) => (
                    <td key={s.id}>{formatValue(c.sensors[s.id], s.unit, s.decimals)}</td>
                  ))}
                  <td className="image-links">
                    {c.rgbPng ? (
                      <a download={`capture-${c.id}-rgb.png`} href={c.rgbPng}>
                        RGB
                      </a>
                    ) : null}
                    {c.spectralPng ? (
                      <a download={`capture-${c.id}-spectral.png`} href={c.spectralPng}>
                        Spectral
                      </a>
                    ) : null}
                    {!c.rgbPng && !c.spectralPng ? "-" : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="note">No captures yet.</p>
      )}
    </Panel>
  );
}

export default CaptureLog;
