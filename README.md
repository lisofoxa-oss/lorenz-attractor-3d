# 🌀 Lorenz Attractor 3D — Interactive Chaos Visualization

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-Посмотреть_онлайн-00e5ff?style=for-the-badge)](https://lisofoxa-oss.github.io/lorenz-attractor-3d/)
[![GitHub](https://img.shields.io/badge/GitHub-Репозиторий-222222?style=for-the-badge&logo=github)](https://github.com/lisofoxa-oss/lorenz-attractor-3d)
[![Three.js](https://img.shields.io/badge/Three.js-r152-000000?style=for-the-badge&logo=three.js)](https://threejs.org)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)

> **Interactive 3D visualization of Lorenz, Rossler, Aizawa and Thomas attractors.**
> 
> 15,000 points, glowing particles, butterfly effect demo, live parameter sliders, 4 attractors, video recording, dark/light themes, presets, mobile support.

[🌐 Live Demo](https://lisofoxa-oss.github.io/lorenz-attractor-3d/) · [📥 Download ZIP](https://github.com/lisofoxa-oss/lorenz-attractor-3d/archive/refs/heads/main.zip)

![Preview](https://lisofoxa-oss.github.io/lorenz-attractor-3d/assets/preview.png)

---

## ✨ Features (What Actually Works)

| Feature | Status | Description |
|---------|--------|-------------|
| **15,000 points** | ✅ | Smooth colored attractor line in real-time |
| **100 particles** | ✅ | Glowing running points with additive blending |
| **2,000 stars** | ✅ | Pulsating starfield background |
| **🦋 Butterfly Effect** | ✅ | Interactive demo: 0.0001 difference → total divergence |
| **🎚️ Live Parameters** | ✅ | Sliders for σ, ρ, β — change and watch in real-time |
| **🔄 4 Attractors** | ✅ | Lorenz, Rössler, Aizawa, Thomas — switch instantly |
| **🎥 Video Recording** | ✅ | Save simulation as WebM directly from browser |
| **🌓 Dark/Light Theme** | ✅ | Toggle between cosmic dark and clean light |
| **💾 Presets + localStorage** | ✅ | 5 presets, settings auto-save and restore |
| **📱 Mobile / Touch** | ✅ | Full touch support with gestures |
| **🎛️ HUD Overlay** | ✅ | Real-time parameter display |
| **🔓 Open Source MIT** | ✅ | Free to use, modify, embed |

### Planned / In Development

| Feature | Status | Note |
|---------|--------|------|
| Bloom + Glow | ⏳ | Post-processing (requires WebGL2) |
| VR Mode | ⏳ | WebXR support |
| Sound Reactive | ⏳ | Microphone input |
| GIF Export | ⏳ | Use video + online converter for now |
| PWA Offline | ⏳ | Service Worker |

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

- **Three.js r152** — WebGL 3D engine (WebGL1 compatible)
- **Custom Shaders** — Particle glow effect
- **MediaRecorder API** — Video capture
- **localStorage** — Settings persistence
- **GitHub Pages** — Free hosting

---

## 📁 Structure

```
.
├── index.html          # Main page with SEO, UI
├── app.js              # Three.js: scene, 4 attractors, particles
├── manifest.json       # PWA manifest (placeholder)
├── sw.js               # Service Worker (placeholder)
├── assets/
│   └── preview.png     # OG image
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
