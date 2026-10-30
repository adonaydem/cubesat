# SPECTRA-VIEW Mission Dashboard

Mission dashboard for SPECTRA-VIEW (Team Cuboids, 9CALGS, SatForge UAE 2026).

It shows:

- the RGB camera stream next to the AI-estimated spectral layer
- vegetation analytics
- live sensor housekeeping with nominal ranges and status
- a capture log with CSV export

It is a static site (Next.js export) deployed to GitHub Pages by GitHub Actions. No backend is needed.

## Run locally

```bash
npm ci
npm run dev        # http://localhost:3000
```

## Add the videos

Put the videos in `public/media/`:

| File | What |
|---|---|
| `rgb.mp4` | RGB clip (left pane) |
| `spectral-ndvi.mp4` | Matching spectral clip (right pane, NDVI layer) |
| `spectral-nir.mp4` | Optional, NIR layer |

The RGB and spectral clips must have the same duration and framing; the dashboard keeps them in sync. Use H.264 MP4, well under 100 MB.

To re-encode a clip:

```bash
ffmpeg -i in.mp4 -c:v libx264 -pix_fmt yuv420p -movflags +faststart -an out.mp4
```

Until a file is added, its pane shows "Video not available".

`public/media/analytics.json` holds sample vegetation values; the dashboard shows them for every source until the model is connected. Replace it with real model output when the model runs.

`public/media/housekeeping.json` is a sample sensor log in the board's line format. It plays while no board is connected, and the sensor panel labels it **Replay**.

## Change wording, ranges and links

Everything is in `src/config/mission.js`:

- `SPECTRAL`: pane title, layers, legends, scene classes. To switch from NIR/NDVI to 31-band visible wording, edit only this block.
- `SENSORS`: label, unit, conversion, measurable range and nominal range for each reading.
- `LINKS`: poster, circuit, 3D model and code links. Empty links are hidden.
- `MEDIA`, `MODEL`, `TELEMETRY`, `PROTOTYPE_CAMERA_URL`.

## Sensor board (firmware contract)

The dashboard reads the sensor board directly over USB with Web Serial. This works in Chrome or Edge on a desktop computer.

The board must print **one JSON object per line** at **115200 baud**, about **once per second**:

```json
{"t_ms":12000,"temp_c":27.1,"ldr_adc":630,"alert":false}
```

- `temp_c`: temperature in °C.
- `ldr_adc`: light sensor, 0–1023 analogue reading (shown as %).
- `t_ms`: `millis()`.
- `alert`: optional.

Lines that are not valid JSON are ignored. If no line arrives for 5 s the dashboard shows **Stale**; if the cable is unplugged it shows **Disconnected**. Old readings are never shown as live.

Optional fields from the camera side: `storage_used_mb`, `frames_stored`, `frames_downlinked`.

## Judging-day setup

1. Open the Pages URL in Chrome on the ground laptop and press **Connect sensor board**.
2. For the device camera, choose **Device camera** as the source. This needs HTTPS or localhost.
3. For the ESP32-CAM stream, choose **Prototype camera** and enter the stream address (e.g. `http://192.168.4.1:81/stream`). HTTPS pages block http camera streams, so open the dashboard from a local build instead:

   ```bash
   npm run build && npx serve@14 out    # then open http://localhost:3000
   ```

   With no `.env`, the local build has no base path, so it serves at the root.

## Deploy

1. Create the GitHub repository and push to `main`.
2. In **Settings → Pages**, set **Source: GitHub Actions**.
3. The workflow builds with the repository name as base path. The site is at `https://<owner>.github.io/<repo>/`.

For a local production build under the same base path, create `.env` with `NEXT_PUBLIC_BASE_PATH=/<repo>`. The file is not committed.

## Tech stack

- [Next.js](https://nextjs.org/) static export
- Plain CSS (`src/app/globals.css`)
- Charts are hand-written SVG; no chart library.

Based on the research project page template by Roman Freiberg (MIT); see the footer.
