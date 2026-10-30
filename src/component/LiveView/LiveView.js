"use client";
import React, { useEffect, useRef, useState } from "react";
import StatusText from "../StatusText";
import { MEDIA, PROTOTYPE_CAMERA_URL, SPECTRAL } from "../../config/mission";
import { withBasePath } from "../../lib/asset";
import { frameToPng } from "../../lib/export";

export const SOURCES = [
  { id: "video", label: "Video" },
  { id: "camera", label: "Device camera" },
  { id: "prototype", label: "Prototype camera" },
];

const DRIFT_LIMIT_S = 0.2;
const VIDEO_STATE = { status: "replay", text: "Video" };

function Legend({ legend, label }) {
  return (
    <div className="legend">
      <span className="legend-label">{label}</span>
      <span>{legend.min}</span>
      <span
        aria-hidden="true"
        className="legend-bar"
        style={{ background: `linear-gradient(to right, ${legend.stops.join(", ")})` }}
      />
      <span>{legend.max}</span>
    </div>
  );
}

function LiveView({ source, onSourceChange, layer, onLayerChange, cameraState, onCameraState, onTime, onCapture }) {
  const rgbRef = useRef(null);
  const spectralRef = useRef(null);
  const [rgbError, setRgbError] = useState(null);
  const [spectralError, setSpectralError] = useState(false);
  const [streamInput, setStreamInput] = useState(PROTOTYPE_CAMERA_URL);
  const [streamUrl, setStreamUrl] = useState(null);
  const [isHttpsPage, setIsHttpsPage] = useState(false);

  useEffect(() => {
    setIsHttpsPage(window.location.protocol === "https:");
  }, []);

  useEffect(() => {
    setRgbError(null);
    const media = rgbRef.current;
    if (source !== "video") onTime(null, null);
    if (source === "video") {
      const ready = media && media.readyState >= 2;
      onCameraState(ready ? VIDEO_STATE : { status: "none", text: "Loading" });
    }
    if (source === "prototype") onCameraState({ status: "off", text: "Not connected" });
  }, [source, onCameraState, onTime]);

  useEffect(() => {
    setSpectralError(false);
  }, [layer.id]);

  // Device camera: open on select, release on switch.
  useEffect(() => {
    if (source !== "camera") return undefined;
    let stream = null;
    let cancelled = false;
    onCameraState({ status: "none", text: "Connecting" });

    if (!navigator.mediaDevices?.getUserMedia) {
      setRgbError("Camera not available on this page.");
      onCameraState({ status: "off", text: "Offline" });
      return undefined;
    }

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = s;
        const video = rgbRef.current;
        if (video) {
          video.srcObject = s;
          video.play().catch(() => {});
        }
        onCameraState({ status: "live", text: "Live" });
      })
      .catch((error) => {
        if (cancelled) return;
        setRgbError(error?.name === "NotAllowedError" ? "Camera permission denied." : "No camera found.");
        onCameraState({ status: "off", text: "Offline" });
      });

    return () => {
      cancelled = true;
      if (stream) stream.getTracks().forEach((track) => track.stop());
    };
  }, [source, onCameraState]);

  // Prototype camera: an MJPEG <img> has no reliable load event, so poll for a frame.
  useEffect(() => {
    if (source !== "prototype" || !streamUrl) return undefined;
    onCameraState({ status: "none", text: "Connecting" });
    const id = setInterval(() => {
      const image = rgbRef.current;
      if (image && image.naturalWidth > 0) {
        onCameraState({ status: "live", text: "Live" });
        clearInterval(id);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [source, streamUrl, onCameraState]);

  // Keep the spectral video on the same frame as the RGB video.
  useEffect(() => {
    const rgb = rgbRef.current;
    const spectral = spectralRef.current;
    if (source !== "video" || rgbError || spectralError || !rgb || !spectral) return undefined;

    const align = () => {
      spectral.currentTime = rgb.currentTime;
    };
    const play = () => {
      align();
      spectral.play().catch(() => {});
    };
    const pause = () => spectral.pause();
    const rate = () => {
      spectral.playbackRate = rgb.playbackRate;
    };
    const drift = () => {
      if (Math.abs(spectral.currentTime - rgb.currentTime) > DRIFT_LIMIT_S) align();
    };
    const follow = () => {
      align();
      if (rgb.paused) spectral.pause();
      else spectral.play().catch(() => {});
    };

    rgb.addEventListener("play", play);
    rgb.addEventListener("pause", pause);
    rgb.addEventListener("seeked", align);
    rgb.addEventListener("ratechange", rate);
    rgb.addEventListener("timeupdate", drift);
    spectral.addEventListener("loadeddata", follow);
    if (spectral.readyState >= 2) follow();

    return () => {
      rgb.removeEventListener("play", play);
      rgb.removeEventListener("pause", pause);
      rgb.removeEventListener("seeked", align);
      rgb.removeEventListener("ratechange", rate);
      rgb.removeEventListener("timeupdate", drift);
      spectral.removeEventListener("loadeddata", follow);
    };
  }, [source, layer.id, rgbError, spectralError]);

  function handleCapture() {
    const rgb = rgbRef.current;
    onCapture({
      rgbPng: frameToPng(rgb),
      spectralPng: source === "video" && !spectralError ? frameToPng(spectralRef.current) : null,
      clipTime: source === "video" && rgb ? rgb.currentTime : null,
    });
  }

  function handleConnect(event) {
    event.preventDefault();
    setRgbError(null);
    setStreamUrl(streamInput.trim() || null);
  }

  const blockedStream = isHttpsPage && streamInput.trim().startsWith("http:");

  return (
    <div className="live-view">
      <div className="controls">
        <label className="field">
          <span>Source</span>
          <select onChange={(e) => onSourceChange(e.target.value)} value={source}>
            {SOURCES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Layer</span>
          <select disabled={source !== "video"} onChange={(e) => onLayerChange(e.target.value)} value={layer.id}>
            {SPECTRAL.layers.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
        {source === "prototype" ? (
          <form className="field field--grow" onSubmit={handleConnect}>
            <label htmlFor="stream-url">Stream address</label>
            <div className="field-row">
              <input
                id="stream-url"
                onChange={(e) => setStreamInput(e.target.value)}
                spellCheck={false}
                type="url"
                value={streamInput}
              />
              <button className="button" type="submit">
                Connect
              </button>
            </div>
          </form>
        ) : null}
        <button className="button button--primary controls-end" onClick={handleCapture} type="button">
          Capture
        </button>
      </div>
      {source === "prototype" && blockedStream ? (
        <p className="note">Browsers block http camera streams on HTTPS pages. Open the local build instead.</p>
      ) : null}

      <div className="pane-pair">
        <div className="pane">
          <div className="pane-head">
            <h3 className="pane-title">RGB camera</h3>
            {source !== "video" ? <StatusText status={cameraState.status}>{cameraState.text}</StatusText> : null}
          </div>
          <div className="pane-media">
            {rgbError ? <div className="pane-empty">{rgbError}</div> : null}
            {!rgbError && source === "video" ? (
              <video
                autoPlay
                controls
                key="video"
                loop
                muted
                onError={() => {
                  setRgbError("Video not available.");
                  onCameraState({ status: "off", text: "No video" });
                }}
                onLoadedData={() => onCameraState(VIDEO_STATE)}
                onTimeUpdate={(e) => onTime(e.target.currentTime, e.target.duration)}
                playsInline
                ref={rgbRef}
                src={withBasePath(MEDIA.rgbVideo)}
              />
            ) : null}
            {!rgbError && source === "camera" ? (
              <video
                autoPlay
                key="camera"
                muted
                playsInline
                ref={rgbRef}
              />
            ) : null}
            {!rgbError && source === "prototype" && streamUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt="Prototype camera stream"
                key={streamUrl}
                onError={() => {
                  setRgbError("Camera not reachable.");
                  onCameraState({ status: "off", text: "Offline" });
                }}
                ref={rgbRef}
                src={streamUrl}
              />
            ) : null}
            {!rgbError && source === "prototype" && !streamUrl ? (
              <div className="pane-empty">Enter the stream address and press Connect.</div>
            ) : null}
          </div>
        </div>

        <div className="pane">
          <div className="pane-head">
            <h3 className="pane-title">{SPECTRAL.title}</h3>
            {source !== "video" ? <StatusText status="off">Not connected</StatusText> : null}
          </div>
          <div className="pane-media">
            {source !== "video" ? (
              <div className="pane-empty">Not connected</div>
            ) : spectralError ? (
              <div className="pane-empty">Video not available.</div>
            ) : (
              <video
                autoPlay
                key={layer.id}
                loop
                muted
                onError={() => setSpectralError(true)}
                playsInline
                ref={spectralRef}
                src={withBasePath(layer.video)}
              />
            )}
          </div>
          {source === "video" && !spectralError ? <Legend label={layer.label} legend={layer.legend} /> : null}
        </div>
      </div>
    </div>
  );
}

export default LiveView;
