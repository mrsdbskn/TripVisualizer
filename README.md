# 🌍 TripChronicle 3D — Global Timeline Visualizer & Story Creator

> Transform your Google Location History (`Timeline.json`) into high-octane 3D globe animations, interactive temporal scrubbing, and 9:16 vertical Instagram Stories videos.

[![Deploy to GitHub Pages](https://github.com/mrsdb/TripVisualizer/actions/workflows/deploy.yml/badge.svg)](https://github.com/mrsdb/TripVisualizer/actions/workflows/deploy.yml)
[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-r170-black?logo=three.js)](https://threejs.org/)
[![Globe.gl](https://img.shields.io/badge/Globe.gl-2.35-00f0ff)](https://globe.gl/)

---

## ✨ Features

- 🌐 **3D Globe Visualization Engine**: High-performance Earth rendering powered by **Three.js** and **Globe.gl** with customizable themes (*Dark Neon*, *Midnight Blue*, *Realistic Earth*, *Cyberpunk*, and *Topographic*).
- ✈️ **Flight & Transit Arcs**: 3D parabolic curves with animated glowing particle pulses between visited cities and flight destinations.
- 📍 **Pulse Rings & Place Markers**: Real-time pulsing radar rings on semantic locations (Home, Work, Hotels, Cities, Attractions).
- 🔥 **Hexagonal Heatmap Layer**: Density grid showing location frequency and cluster hotspots.
- ⏱️ **Date Frame Setter & Scrubber**: Dual-handle range selector across 2014–2026, preset pickers by Year, Flights, or Custom ranges.
- 🎮 **Playback Simulation & Auto-Director**: Play/Pause, speed multipliers (`1x`, `10x`, `100x`, `500x`, `2500x`), loop mode, and smooth camera fly-to easing.
- 📱 **Instagram Stories Studio (9:16)**:
  - 1-Click toggle to 9:16 vertical story viewport with safe zones.
  - Custom title, subtitle, date stamp, music audio pill, and odometer telemetry HUD.
  - **60fps Video Recorder**: In-browser canvas recording to MP4/WebM with live countdown timer.
  - **HD Story Snapshot**: Instant 1-click PNG export tailored for Instagram Story uploads.
- 🔒 **100% Client-Side & Private**: Your `Timeline.json` is parsed entirely within browser memory and never leaves your device.
- 🚀 **GitHub Pages Ready**: Static zero-backend bundle with automated GitHub Actions CI/CD.

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend Framework** | React 18 + TypeScript + Vite | Reactive state management & ultra-fast build |
| **3D / Globe Rendering** | Three.js + Globe.gl | WebGL Earth, starfield, arcs, pulsing rings, heatmaps |
| **Styling & Design System** | Vanilla CSS + Glassmorphism Tokens | Sleek dark cyber aesthetic with Google Fonts (Outfit, Plus Jakarta Sans, JetBrains Mono) |
| **Data Parser** | Custom Streaming Parser + Web Worker | Non-blocking parsing of 100MB+ Google Takeout `Timeline.json` files |
| **Video Recording & Export** | Canvas MediaRecorder API | 60fps vertical video capture for Instagram Stories |

---

## 🚀 Quick Start (Running Locally)

```bash
# 1. Clone the repository
git clone https://github.com/mrsdb/TripVisualizer.git
cd TripVisualizer

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev
```

Visit `http://localhost:5173/` in your browser.

---

## 📂 Importing Google Takeout Timeline.json

1. Go to [Google Takeout](https://takeout.google.com/).
2. Select **Location History (Timeline)** and export as JSON.
3. In TripChronicle 3D, click **Import JSON** in the top navigation bar.
4. Drag and drop your `Timeline.json` file.
5. The parser will extract all GPS points, visits, activities, and flight arcs, and launch the 3D visualizer!

---

## 🌐 Deploying to GitHub Pages

1. Push this repository to GitHub:
   ```bash
   git add .
   git commit -m "Deploy TripVisualizer 3D"
   git push origin main
   ```
2. In your GitHub repository settings, go to **Settings** ➔ **Pages**.
3. Under **Build and deployment** ➔ **Source**, select **GitHub Actions**.
4. The workflow in `.github/workflows/deploy.yml` will automatically build and publish your site!

---

## 📄 License

MIT License. Crafted with ❤️ for travelers and explorers.
