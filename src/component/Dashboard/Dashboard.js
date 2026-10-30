"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SystemStrip from "../SystemStrip";
import Panel from "../Panel";
import LiveView, { SOURCES } from "../LiveView";
import Analytics from "../Analytics";
import Housekeeping from "../Housekeeping";
import CaptureLog from "../CaptureLog";
import { MEDIA, MODEL, SENSORS, SPECTRAL, TELEMETRY } from "../../config/mission";
import { withBasePath } from "../../lib/asset";
import { connectSerial, evaluate, replayBacklog, replayLog, serialSupported } from "../../lib/telemetry";
import { downloadCsv, fileStamp } from "../../lib/export";
import { formatNumber } from "../../lib/format";

const REPLAY_PREFILL = 60;

function sensorColumn(sensor) {
  return `${sensor.id}_${sensor.unit === "%" ? "pct" : sensor.unit.replace("°", "")}`;
}

function Dashboard() {
  const [source, setSource] = useState("video");
  const [layerId, setLayerId] = useState(SPECTRAL.layers[0].id);
  const [clip, setClip] = useState({ time: null, duration: null });
  const [cameraState, setCameraState] = useState({ status: "none", text: "Loading" });
  const [samples, setSamples] = useState(null);
  const [sensorMode, setSensorMode] = useState("replay");
  const [history, setHistory] = useState([]);
  const [serialError, setSerialError] = useState(null);
  const [canSerial, setCanSerial] = useState(false);
  const [now, setNow] = useState(null);
  const [sourceStart, setSourceStart] = useState(null);
  const [captures, setCaptures] = useState([]);
  const replayLinesRef = useRef(null);
  const stopReplayRef = useRef(null);
  const disconnectRef = useRef(null);

  const layer = SPECTRAL.layers.find((l) => l.id === layerId) || SPECTRAL.layers[0];

  // Clock for data age and the moving chart window. Set after mount so the
  // static HTML does not bake in a build-time timestamp.
  useEffect(() => {
    setCanSerial(serialSupported());
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setSourceStart(Date.now());
  }, [source]);

  useEffect(() => {
    fetch(withBasePath(MEDIA.analytics))
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => setSamples(Array.isArray(json?.samples) ? json.samples : []))
      .catch(() => setSamples([]));
  }, []);

  const pushReading = useCallback((reading) => {
    setHistory((h) => [...h.slice(-(TELEMETRY.historyLength - 1)), reading]);
  }, []);

  const handleTime = useCallback((time, duration) => setClip({ time, duration }), []);

  // The replay log feeds the same reading pipeline as the sensor board.
  useEffect(() => {
    if (sensorMode !== "replay") return undefined;
    let cancelled = false;

    const start = (lines) => {
      if (cancelled || !lines.length) return;
      const prefill = Math.min(REPLAY_PREFILL, lines.length);
      setHistory(replayBacklog(lines, prefill));
      stopReplayRef.current = replayLog(lines, pushReading, prefill);
    };

    if (replayLinesRef.current) start(replayLinesRef.current);
    else {
      fetch(withBasePath(MEDIA.housekeeping))
        .then((res) => (res.ok ? res.json() : { lines: [] }))
        .then((json) => {
          replayLinesRef.current = Array.isArray(json.lines) ? json.lines : [];
          start(replayLinesRef.current);
        })
        .catch(() => {
          replayLinesRef.current = [];
        });
    }

    return () => {
      cancelled = true;
      if (stopReplayRef.current) stopReplayRef.current();
      stopReplayRef.current = null;
    };
  }, [sensorMode, pushReading]);

  useEffect(() => () => disconnectRef.current?.(), []);

  async function handleConnect() {
    setSerialError(null);
    try {
      const disconnect = await connectSerial({
        onReading: pushReading,
        onClose: () => {
          disconnectRef.current = null;
          setSensorMode("disconnected");
        },
      });
      // Stop the replay before clearing, so no replayed reading lands in live data.
      if (stopReplayRef.current) stopReplayRef.current();
      disconnectRef.current = disconnect;
      setHistory([]);
      setSensorMode("live");
    } catch (error) {
      if (error?.name !== "NotFoundError") {
        setSerialError("Could not open the sensor board. Check the cable and that no other program is using the port.");
      }
    }
  }

  // Sensor link state; old data is never shown as live.
  const last = history.length ? history[history.length - 1] : null;
  const age = last && now ? now - last.receivedAt : null;
  let link = { status: "live", text: "Live" };
  if (sensorMode === "replay") link = { status: "replay", text: "Replay" };
  else if (sensorMode === "disconnected") link = { status: "off", text: "Disconnected" };
  else if (!last) link = { status: "none", text: "Waiting for data" };
  else if (age > TELEMETRY.staleAfterMs) link = { status: "stale", text: "Stale" };
  const linkCurrent = link.status === "live" || link.status === "replay";

  // Achieved rate over the last 10 s, from the spacing between readings.
  const recent = now ? history.filter((r) => r.receivedAt > now - 10000) : [];
  const rateHz =
    recent.length > 1
      ? ((recent.length - 1) * 1000) / (recent[recent.length - 1].receivedAt - recent[0].receivedAt)
      : null;

  // Vegetation values follow the clip for the video source and cycle through
  // the sample timeline for live sources.
  const lastT = samples?.length ? samples[samples.length - 1].t : 0;
  let analyticsTime = null;
  if (source === "video") analyticsTime = clip.time ?? 0;
  else if (now && sourceStart && lastT > 0) analyticsTime = ((now - sourceStart) / 1000) % lastT;
  const currentSample = useMemo(() => {
    if (!samples?.length) return null;
    const t = analyticsTime ?? 0;
    let match = samples[0];
    for (const s of samples) {
      if (s.t <= t) match = s;
      else break;
    }
    return match;
  }, [samples, analyticsTime]);

  const sourceLabel = SOURCES.find((s) => s.id === source).label;

  function handleCapture({ rgbPng, spectralPng, clipTime }) {
    const reading = linkCurrent ? last : null;
    setCaptures((list) => [
      ...list,
      {
        id: list.length + 1,
        time: Date.now(),
        source: sourceLabel,
        clipTime,
        cover: currentSample ? currentSample.vegetation_cover_pct : null,
        meanIndex: currentSample ? currentSample.mean_index : null,
        sensors: Object.fromEntries(SENSORS.map((s) => [s.id, reading ? reading.values[s.id] : null])),
        dataMode: link.text,
        rgbPng,
        spectralPng,
      },
    ]);
  }

  function exportLog() {
    downloadCsv(
      captures.map((c) => ({
        capture: c.id,
        time: new Date(c.time).toISOString(),
        source: c.source,
        clip_time_s: c.clipTime !== null ? c.clipTime.toFixed(2) : "",
        vegetation_cover_pct: c.cover ?? "",
        mean_index: c.meanIndex ?? "",
        ...Object.fromEntries(
          SENSORS.map((s) => [sensorColumn(s), c.sensors[s.id] !== null ? formatNumber(c.sensors[s.id], s.decimals) : ""])
        ),
        sensor_data: c.dataMode,
      })),
      `spectra-view-captures-${fileStamp()}.csv`
    );
  }

  function exportSensors() {
    downloadCsv(
      history.map((r) => ({
        time: new Date(r.receivedAt).toISOString(),
        board_ms: r.boardMs ?? "",
        ...Object.fromEntries(
          SENSORS.flatMap((s) => [
            [sensorColumn(s), r.values[s.id] !== null ? formatNumber(r.values[s.id], s.decimals) : ""],
            [`${s.id}_status`, evaluate(s, r.values[s.id]).label],
          ])
        ),
        alert: r.alert,
        storage_used_mb: r.storageUsedMb ?? "",
        frames_stored: r.framesStored ?? "",
        frames_downlinked: r.framesDownlinked ?? "",
        data_mode: link.text,
      })),
      `spectra-view-sensors-${fileStamp()}.csv`
    );
  }

  const backlog = last && last.framesStored !== null && last.framesDownlinked !== null ? last.framesStored - last.framesDownlinked : null;

  return (
    <>
      <SystemStrip
        ai={{ status: "off", text: MODEL.status }}
        camera={cameraState}
        link={backlog !== null && linkCurrent ? { status: link.status, text: `Backlog ${backlog}` } : link}
        sensor={sensorMode === "live" && link.status === "live" ? { status: "live", text: "Connected" } : link}
        storage={
          last && last.storageUsedMb !== null && linkCurrent
            ? { status: link.status, text: `${formatNumber(last.storageUsedMb / 1024, 1)} of ${TELEMETRY.storageCapacityGb} GB` }
            : { status: "none", text: "No data" }
        }
      />
      <Panel id="live" title="Live view">
        <LiveView
          cameraState={cameraState}
          layer={layer}
          onCameraState={setCameraState}
          onCapture={handleCapture}
          onLayerChange={setLayerId}
          onSourceChange={setSource}
          onTime={handleTime}
          source={source}
        />
      </Panel>
      <Analytics
        current={currentSample}
        duration={source === "video" ? clip.duration : null}
        samples={samples}
        time={analyticsTime}
      />
      <Housekeeping
        canSerial={canSerial}
        history={history}
        link={link}
        mode={sensorMode}
        now={now}
        onConnect={handleConnect}
        onDisconnect={() => disconnectRef.current?.()}
        onReplay={() => setSensorMode("replay")}
        rateHz={rateHz}
        serialError={serialError}
      />
      <CaptureLog
        captures={captures}
        onExportLog={exportLog}
        onExportSensors={exportSensors}
        sensorCount={history.length}
      />
    </>
  );
}

export default Dashboard;
