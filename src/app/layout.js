import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "SPECTRA-VIEW Dashboard",
  description: "Mission dashboard for SPECTRA-VIEW: RGB imaging, spectral estimates and sensor housekeeping. Team Cuboids, SatForge UAE 2026.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
