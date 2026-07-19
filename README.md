# 🌀 Lorenz Attractor 3D — Ultimate Chaos Visualization

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-Посмотреть_онлайн-00e5ff?style=for-the-badge)](https://lisofoxa-oss.github.io/lorenz-attractor-3d/)
[![GitHub](https://img.shields.io/badge/GitHub-Репозиторий-222222?style=for-the-badge&logo=github)](https://github.com/lisofoxa-oss/lorenz-attractor-3d)
[![Three.js](https://img.shields.io/badge/Three.js-r160-000000?style=for-the-badge&logo=three.js)](https://threejs.org)
[![PWA](https://img.shields.io/badge/PWA-Offline_Ready-5a0fc8?style=for-the-badge)](https://web.dev/progressive-web-apps/)
[![VR](https://img.shields.io/badge/WebXR-VR_Ready-ff006e?style=for-the-badge)](https://immersiveweb.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)

> **The most advanced interactive 3D chaos visualization on the web.**

[🌐 Live Demo](https://lisofoxa-oss.github.io/lorenz-attractor-3d/) · [📥 Download ZIP](https://github.com/lisofoxa-oss/lorenz-attractor-3d/archive/refs/heads/main.zip)

![Preview](https://lisofoxa-oss.github.io/lorenz-attractor-3d/assets/preview.png)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **25,000 points** | Smooth colored attractor line in real-time |
| **200 particles** | Glowing running points with bloom effect |
| **3,000 stars** | Pulsating starfield background |
| **🦋 Butterfly Effect** | Interactive demo: 0.0001 difference → total divergence |
| **🎚️ Live Parameters** | Sliders for σ, ρ, β — change and watch in real-time |
| **🔄 4 Attractors** | Lorenz, Rössler, Aizawa, Thomas — switch instantly |
| **🎥 Video Recording** | Save simulation as WebM directly from browser |
| **🎞 GIF Export** | Export frames for GIF creation |
| **🌓 Themes** | Dark cosmic & light for presentations |
| **🥽 WebXR / VR** | Immersive VR mode via WebXR API |
| **🔊 Sound Reactive** | Particles react to microphone input |
| **📱 PWA + Offline** | Install as app, works without internet |
| **🎬 Cinematic Camera** | Automatic smooth camera movements |
| **💾 Presets + localStorage** | Save favorite settings, auto-restore |
| **✨ Bloom + SSAO + DOF** | Cinematic post-processing |
| **🌈 Chromatic Aberration** | RGB shift effect |
| **📊 FPS Graph HUD** | Real-time performance monitoring |
| **🎛️ 5 Parameter Presets** | Classic, Chaos, Stable, Torus, Spiral |
| **📱 Touch Gestures** | Full mobile support with gestures |
| **🔓 Open Source MIT** | Free to use, modify, embed |

---

## 🚀 Quick Start

### Online
Open: **[lisofoxa-oss.github.io/lorenz-attractor-3d](https://lisofoxa-oss.github.io/lorenz-attractor-3d/)**

### Local
```bash
git clone https://github.com/lisofoxa-oss/lorenz-attractor-3d.git
cd lorenz-attractor-3d
python -m http.server 8000
```

---

## 🎮 Controls

| Action | Input |
|--------|-------|
| Rotate | 🖱️ Left click + drag |
| Pan | 🖱️ Right click + drag |
| Zoom | 🖱️ Scroll wheel |
| Reset camera | Double click |
| Auto-rotate | Enabled by default |
| Touch | Single finger rotate, pinch zoom |

---

## 🔬 Mathematics

### Lorenz Equations
```
dx/dt = σ(y − x)
dy/dt = x(ρ − z) − y
dz/dt = xy − βz
```

| Parameter | Value | Meaning |
|-----------|-------|---------|
| **σ** | 10.0 | Prandtl number — viscosity |
| **ρ** | 28.0 | Rayleigh number — heating |
| **β** | 8/3 | Geometric aspect ratio |

---

## 🛠 Tech Stack

- **Three.js r160** — WebGL 3D engine
- **EffectComposer** — Post-processing pipeline
- **UnrealBloomPass** — Bloom glow effect
- **Custom Shaders** — Chromatic aberration, particles
- **MediaRecorder API** — Video capture
- **WebXR** — VR support
- **Web Audio API** — Sound reactivity
- **Service Worker** — Offline PWA
- **localStorage** — Settings persistence
- **GitHub Pages** — Free hosting

---

## 📁 Structure

```
.
├── index.html          # Main page with SEO, UI, animations
├── app.js              # Three.js: scene, 4 attractors, particles, effects
├── manifest.json       # PWA manifest
├── sw.js               # Service Worker for offline
├── assets/
│   └── preview.png     # OG image for social
├── README.md           # This file
├── LICENSE             # MIT
├── CNAME               # Custom domain config
└── .gitignore
```

---

## 📝 License

MIT License — free to use, modify, distribute.

---

<p align="center">
  🌀 Built with chaos and passion by <a href="https://github.com/lisofoxa-oss">lisofoxa-oss</a>
</p>
