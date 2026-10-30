// Single place for wording, ranges and data paths. Change the dashboard here,
// not inside the components.

export const MISSION = {
  name: "SPECTRA-VIEW",
  team: "Team Cuboids",
  code: "",
  event: "SatForge UAE 2026",
};

// Links under the header. Entries with an empty href are hidden.
export const LINKS = [
  { iconId: "archive", label: "Poster", href: "" },
  { iconId: "cpu", label: "Circuit", href: "" },
  { iconId: "layers", label: "3D model", href: "" },
  { iconId: "github", label: "Code", href: "" },
];

// Files under public/. The videos are supplied by the team.
export const MEDIA = {
  rgbVideo: "/media/rgb.mp4",
  analytics: "/media/analytics.json",
  housekeeping: "/media/housekeeping.json",
};

// Spectral output. Wording is kept here so the team can switch between
// NIR/NDVI and 31-band visible labels without touching components.
export const SPECTRAL = {
  title: "Spectral estimate",
  layers: [
    {
      id: "ndvi",
      label: "NDVI (est.)",
      video: "/media/spectral-ndvi.mp4",
      // Must match the colours used in the spectral video: brown at -1,
      // grey for bare ground (0 to 0.15), full green from 0.8.
      legend: { stops: ["#8c510a 0%", "#f0efec 50%", "#f0efec 57.5%", "#1a7f37 90%"], min: "-1", max: "+1" },
    },
    {
      id: "nir",
      label: "NIR (est.)",
      video: "/media/spectral-nir.mp4",
      legend: { stops: ["#111111", "#ffffff"], min: "Low", max: "High" },
    },
  ],
  index: { label: "Mean NDVI (est.)", decimals: 2 },
  // Scene class by mean index, checked top to bottom.
  classes: [
    { min: 0.5, label: "Dense vegetation" },
    { min: 0.2, label: "Sparse vegetation" },
    { min: -Infinity, label: "Little or no vegetation" },
  ],
};

export const MODEL = {
  status: "Not connected",
};

// Sensor board readings. `field` is the key in each JSON line the board sends,
// e.g. {"t_ms":12000,"temp_c":27.1,"ldr_adc":630,"alert":false}
export const SENSORS = [
  {
    id: "temperature",
    label: "Temperature",
    unit: "°C",
    field: "temp_c",
    decimals: 1,
    // LM35 datasheet range; change for a DS18B20 (-55 to 125 °C).
    sensorRange: [-55, 150],
    nominal: [10, 45],
    chartRange: [0, 60],
  },
  {
    id: "light",
    label: "Light level",
    unit: "%",
    field: "ldr_adc",
    // 10-bit analogue reading from the light sensor divider.
    convert: (adc) => (adc / 1023) * 100,
    decimals: 0,
    sensorRange: [0, 100],
    nominal: [30, 95],
    chartRange: [0, 100],
  },
];

export const TELEMETRY = {
  baudRate: 115200,
  expectedHz: 1,
  staleAfterMs: 5000,
  // Number of readings kept for charts and export (about 2 minutes at 1 Hz).
  historyLength: 120,
  storageCapacityGb: 16,
};

// ESP32-CAM CameraWebServer stream. Port 81 serves /stream in the stock example.
export const PROTOTYPE_CAMERA_URL = "http://192.168.4.1:81/stream";
