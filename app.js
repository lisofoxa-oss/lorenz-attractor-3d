import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// ═══════════════════════════════════════════════════════════════════
//  КОНФИГУРАЦИЯ
// ═══════════════════════════════════════════════════════════════════
const DEFAULT_CONFIG = {
    sigma: 10.0, rho: 28.0, beta: 8.0 / 3.0,
    dt: 0.008, numPoints: 25000, particleCount: 200,
    bloomStrength: 1.5, bloomRadius: 0.4, bloomThreshold: 0.1,
    autoRotateSpeed: 0.3, particleSpeedMult: 1.0, starCount: 3000,
    paused: false, currentAttractor: 'lorenz',
    dofAmount: 0.0, chromaticAberration: 0.0, cinematicMode: false,
    soundReactive: false, vrMode: false
};

let CONFIG = { ...DEFAULT_CONFIG };

// Загрузка из localStorage
try {
    const saved = localStorage.getItem('lorenz-config');
    if (saved) {
        const parsed = JSON.parse(saved);
        CONFIG = { ...DEFAULT_CONFIG, ...parsed };
    }
} catch (e) {}

const ATTRACTORS = {
    lorenz: {
        name: 'Лоренц', params: { sigma: 10, rho: 28, beta: 8/3 },
        dt: 0.008, scale: 1, offset: { x: 0, y: 0, z: 25 },
        step: (x, y, z, p, dt) => {
            const dx = p.sigma * (y - x) * dt;
            const dy = (x * (p.rho - z) - y) * dt;
            const dz = (x * y - p.beta * z) * dt;
            return [x + dx, y + dy, z + dz];
        }
    },
    rossler: {
        name: 'Рёсслер', params: { a: 0.2, b: 0.2, c: 5.7 },
        dt: 0.02, scale: 2, offset: { x: 0, y: 0, z: 0 },
        step: (x, y, z, p, dt) => {
            const dx = (-y - z) * dt;
            const dy = (x + p.a * y) * dt;
            const dz = (p.b + z * (x - p.c)) * dt;
            return [x + dx, y + dy, z + dz];
        }
    },
    aizawa: {
        name: 'Айдзава', params: { a: 0.95, b: 0.7, c: 0.6, d: 3.5, e: 0.25, f: 0.1 },
        dt: 0.01, scale: 3, offset: { x: 0, y: 0, z: 0 },
        step: (x, y, z, p, dt) => {
            const dx = ((z - p.b) * x - p.d * y) * dt;
            const dy = (p.d * x + (z - p.b) * y) * dt;
            const dz = (p.c + p.a * z - z*z*z/3 - (x*x + y*y) * (1 + p.e * z) + p.f * z * x*x*x) * dt;
            return [x + dx, y + dy, z + dz];
        }
    },
    thomas: {
        name: 'Томас', params: { b: 0.208186 },
        dt: 0.01, scale: 4, offset: { x: 0, y: 0, z: 0 },
        step: (x, y, z, p, dt) => {
            const dx = (Math.sin(y) - p.b * x) * dt;
            const dy = (Math.sin(z) - p.b * y) * dt;
            const dz = (Math.sin(x) - p.b * z) * dt;
            return [x + dx, y + dy, z + dz];
        }
    }
};

const PRESETS = {
    classic: { sigma: 10, rho: 28, beta: 2.667 },
    chaos: { sigma: 10, rho: 45, beta: 2.667 },
    stable: { sigma: 10, rho: 8, beta: 2.667 },
    torus: { sigma: 10, rho: 99.96, beta: 2.667 },
    spiral: { sigma: 14, rho: 28, beta: 2.667 }
};

// ═══════════════════════════════════════════════════════════════════
//  СЦЕНА
// ═══════════════════════════════════════════════════════════════════
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x050508, 0.012);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(35, 25, 45);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ReinhardToneMapping;
renderer.toneMappingExposure = 1.2;
container.appendChild(renderer.domElement);

// Post-processing
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    CONFIG.bloomStrength, CONFIG.bloomRadius, CONFIG.bloomThreshold
);
composer.addPass(bloomPass);

// Chromatic Aberration Shader
const chromaticShader = {
    uniforms: {
        tDiffuse: { value: null },
        amount: { value: 0.0 }
    },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float amount;
        varying vec2 vUv;
        void main() {
            vec2 center = vUv - 0.5;
            float dist = length(center);
            vec2 dir = normalize(center);
            vec2 offset = dir * amount * dist;
            float r = texture2D(tDiffuse, vUv + offset).r;
            float g = texture2D(tDiffuse, vUv).g;
            float b = texture2D(tDiffuse, vUv - offset).b;
            gl_FragColor = vec4(r, g, b, 1.0);
        }
    `
};

const chromaticPass = new ShaderPass(chromaticShader);
composer.addPass(chromaticPass);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.autoRotate = true;
controls.autoRotateSpeed = CONFIG.autoRotateSpeed;
controls.minDistance = 10;
controls.maxDistance = 120;

// ═══════════════════════════════════════════════════════════════════
//  ГЕНЕРАЦИЯ АТТРАКТОРА
// ═══════════════════════════════════════════════════════════════════
let attractorLine, particles, stars;
let lineGeometry, particleGeometry, starsGeometry;
let posAttr;

function generateAttractor(type, count, dt) {
    const attractor = ATTRACTORS[type];
    const points = [];
    let x = 0.1, y = 0.0, z = 0.0;
    let minSpeed = Infinity, maxSpeed = -Infinity;
    const tempPoints = [];

    for (let i = 0; i < count; i++) {
        const [nx, ny, nz] = attractor.step(x, y, z, attractor.params, dt);
        const dx = nx - x, dy = ny - y, dz = nz - z;
        x = nx; y = ny; z = nz;
        const speed = Math.sqrt(dx*dx + dy*dy + dz*dz);
        tempPoints.push({ 
            x: x * attractor.scale + attractor.offset.x, 
            y: y * attractor.scale + attractor.offset.y, 
            z: z * attractor.scale + attractor.offset.z, 
            speed 
        });
        minSpeed = Math.min(minSpeed, speed);
        maxSpeed = Math.max(maxSpeed, speed);
    }

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colorsArr = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
        const p = tempPoints[i];
        positions[i * 3] = p.x;
        positions[i * 3 + 1] = p.y;
        positions[i * 3 + 2] = p.z;
        const t = (p.speed - minSpeed) / (maxSpeed - minSpeed + 0.001);
        const hue = 0.55 + t * 0.35;
        const color = new THREE.Color().setHSL(hue, 0.9, 0.5 + t * 0.3);
        colorsArr[i * 3] = color.r;
        colorsArr[i * 3 + 1] = color.g;
        colorsArr[i * 3 + 2] = color.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colorsArr, 3));
    return geometry;
}

function rebuildAttractor() {
    if (attractorLine) { scene.remove(attractorLine); lineGeometry.dispose(); }
    const attractor = ATTRACTORS[CONFIG.currentAttractor];
    attractor.params.sigma = CONFIG.sigma;
    attractor.params.rho = CONFIG.rho;
    attractor.params.beta = CONFIG.beta;
    lineGeometry = generateAttractor(CONFIG.currentAttractor, CONFIG.numPoints, attractor.dt);
    const lineMaterial = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85 });
    attractorLine = new THREE.Line(lineGeometry, lineMaterial);
    scene.add(attractorLine);
    posAttr = lineGeometry.attributes.position;
    rebuildParticles();
    updateHUD();
}

// ═══════════════════════════════════════════════════════════════════
//  ЧАСТИЦЫ
// ═══════════════════════════════════════════════════════════════════
let particleData = [];

function rebuildParticles() {
    if (particles) { scene.remove(particles); particleGeometry.dispose(); }
    particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(CONFIG.particleCount * 3);
    const particleColors = new Float32Array(CONFIG.particleCount * 3);
    const particleSizes = new Float32Array(CONFIG.particleCount);
    particleData = [];
    for (let i = 0; i < CONFIG.particleCount; i++) {
        particleData.push({ index: Math.floor(Math.random() * CONFIG.numPoints), speed: 30 + Math.random() * 80, offset: Math.random() * Math.PI * 2 });
        particleSizes[i] = 1.5 + Math.random() * 2;
    }
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
    particleGeometry.setAttribute('size', new THREE.BufferAttribute(particleSizes, 1));
    const particleMaterial = new THREE.ShaderMaterial({
        uniforms: { time: { value: 0 } },
        vertexShader: `attribute float size; varying vec3 vColor; void main() { vColor = color; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); gl_PointSize = size * (300.0 / -mvPosition.z); gl_Position = projectionMatrix * mvPosition; }`,
        fragmentShader: `varying vec3 vColor; void main() { float dist = length(gl_PointCoord - vec2(0.5)); if (dist > 0.5) discard; float glow = 1.0 - smoothstep(0.0, 0.5, dist); glow = pow(glow, 1.5); gl_FragColor = vec4(vColor * 1.5, glow); }`,
        transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, vertexColors: true
    });
    particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);
}

// ═══════════════════════════════════════════════════════════════════
//  ЗВЁЗДЫ
// ═══════════════════════════════════════════════════════════════════
function rebuildStars() {
    if (stars) { scene.remove(stars); starsGeometry.dispose(); }
    starsGeometry = new THREE.BufferGeometry();
    const starsPositions = new Float32Array(CONFIG.starCount * 3);
    const starsColors = new Float32Array(CONFIG.starCount * 3);
    for (let i = 0; i < CONFIG.starCount; i++) {
        const r = 80 + Math.random() * 120;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        starsPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        starsPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        starsPositions[i * 3 + 2] = r * Math.cos(phi);
        const brightness = 0.3 + Math.random() * 0.7;
        const tint = Math.random();
        starsColors[i * 3] = brightness * (0.8 + tint * 0.2);
        starsColors[i * 3 + 1] = brightness * (0.8 + tint * 0.3);
        starsColors[i * 3 + 2] = brightness;
    }
    starsGeometry.setAttribute('position', new THREE.BufferAttribute(starsPositions, 3));
    starsGeometry.setAttribute('color', new THREE.BufferAttribute(starsColors, 3));
    const starsMaterial = new THREE.PointsMaterial({ size: 0.3, vertexColors: true, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending });
    stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);
}

// ═══════════════════════════════════════════════════════════════════
//  ИНИЦИАЛИЗАЦИЯ
// ═══════════════════════════════════════════════════════════════════
rebuildAttractor();
rebuildStars();
const ambientLight = new THREE.AmbientLight(0x404080, 0.5);
scene.add(ambientLight);

// ═══════════════════════════════════════════════════════════════════
//  АУДИО (Sound Reactive)
// ═══════════════════════════════════════════════════════════════════
let audioContext = null;
let analyser = null;
let audioData = new Uint8Array(128);
let audioReactive = false;

async function initAudio() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const source = audioContext.createMediaStreamSource(stream);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        audioReactive = true;
        showToast('🔊', 'Микрофон подключен! Частицы реагируют на звук');
    } catch (e) {
        showToast('⚠️', 'Не удалось получить доступ к микрофону');
    }
}

// ═══════════════════════════════════════════════════════════════════
//  АНИМАЦИЯ
// ═══════════════════════════════════════════════════════════════════
const clock = new THREE.Clock();
const fpsHistory = [];

function updateParticles(time) {
    if (!posAttr) return;
    const positions = particleGeometry.attributes.position.array;
    const colors = particleGeometry.attributes.color.array;
    let audioMult = 1;
    if (audioReactive && analyser) {
        analyser.getByteFrequencyData(audioData);
        const avg = audioData.reduce((a, b) => a + b, 0) / audioData.length;
        audioMult = 1 + avg / 255 * 3;
    }
    for (let i = 0; i < CONFIG.particleCount; i++) {
        const data = particleData[i];
        data.index = (data.index + data.speed * 0.016 * CONFIG.particleSpeedMult * audioMult) % CONFIG.numPoints;
        const idx = Math.floor(data.index);
        positions[i * 3] = posAttr.getX(idx);
        positions[i * 3 + 1] = posAttr.getY(idx);
        positions[i * 3 + 2] = posAttr.getZ(idx);
        const t = (i / CONFIG.particleCount + time * 0.1) % 1;
        const color = new THREE.Color().setHSL(0.5 + t * 0.4, 1.0, 0.7);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
    }
    particleGeometry.attributes.position.needsUpdate = true;
    particleGeometry.attributes.color.needsUpdate = true;
}

// Кинематографичная камера
let cinematicTime = 0;
function updateCinematicCamera(time) {
    if (!CONFIG.cinematicMode) return;
    cinematicTime += 0.005;
    const r = 50 + Math.sin(cinematicTime * 0.3) * 20;
    camera.position.x = Math.sin(cinematicTime) * r;
    camera.position.y = 20 + Math.sin(cinematicTime * 0.7) * 15;
    camera.position.z = Math.cos(cinematicTime) * r;
    camera.lookAt(0, 0, 20);
}

function animate() {
    requestAnimationFrame(animate);
    if (CONFIG.paused) { composer.render(); return; }
    const time = clock.getElapsedTime();
    const delta = clock.getDelta();

    controls.update();
    updateParticles(time);
    updateCinematicCamera(time);

    if (stars) stars.material.opacity = 0.6 + Math.sin(time * 0.5) * 0.2;
    bloomPass.strength = CONFIG.bloomStrength + Math.sin(time * 0.8) * 0.3;
    chromaticPass.uniforms.amount.value = CONFIG.chromaticAberration;

    // FPS
    const fps = Math.round(1 / (delta || 0.016));
    fpsHistory.push(fps);
    if (fpsHistory.length > 60) fpsHistory.shift();
    if (Math.floor(time * 10) % 5 === 0) updateFPSHUD(fps);

    composer.render();
}

// ═══════════════════════════════════════════════════════════════════
//  HUD
// ═══════════════════════════════════════════════════════════════════
function updateHUD() {
    document.getElementById('hudSigma').textContent = CONFIG.sigma.toFixed(1);
    document.getElementById('hudRho').textContent = CONFIG.rho.toFixed(1);
    document.getElementById('hudBeta').textContent = CONFIG.beta.toFixed(3);
    document.getElementById('hudAttractor').textContent = ATTRACTORS[CONFIG.currentAttractor].name;
    document.getElementById('hudPoints').textContent = CONFIG.numPoints;
    document.getElementById('hudParticles').textContent = CONFIG.particleCount;
}

function updateFPSHUD(fps) {
    const el = document.getElementById('hudFps');
    el.textContent = fps;
    el.className = 'hud-value' + (fps < 30 ? ' danger' : fps < 50 ? ' warn' : '');
    document.getElementById('hudTime').textContent = clock.getElapsedTime().toFixed(1) + 's';

    // График FPS
    const canvas = document.getElementById('fpsGraph');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width = canvas.offsetWidth;
    const h = canvas.height = canvas.offsetHeight;
    ctx.clearRect(0, 0, w, h);
    ctx.beginPath();
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 2;
    for (let i = 0; i < fpsHistory.length; i++) {
        const x = (i / (fpsHistory.length - 1)) * w;
        const y = h - (fpsHistory[i] / 120) * h;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
}

// ═══════════════════════════════════════════════════════════════════
//  TOAST
// ═══════════════════════════════════════════════════════════════════
function showToast(icon, text) {
    const toast = document.getElementById('toast');
    document.getElementById('toastIcon').textContent = icon;
    document.getElementById('toastText').textContent = text;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// ═══════════════════════════════════════════════════════════════════
//  UI / СОБЫТИЯ
// ═══════════════════════════════════════════════════════════════════
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});

// Theme
document.getElementById('themeToggle').addEventListener('click', () => {
    const isDark = document.body.getAttribute('data-theme') !== 'light';
    document.body.setAttribute('data-theme', isDark ? 'light' : 'dark');
    document.getElementById('themeToggle').textContent = isDark ? '☀️' : '🌙';
    scene.fog = new THREE.FogExp2(isDark ? 0xf0f0f8 : 0x050508, 0.012);
    renderer.setClearColor(isDark ? 0xf0f0f8 : 0x000000, isDark ? 1 : 0);
});

// Nav scroll
const nav = document.querySelector('.nav');
window.addEventListener('scroll', () => nav.classList.toggle('scrolled', window.scrollY > 100));

// Reveal on scroll
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('visible'); });
}, { threshold: 0.1 });
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// Sliders
function updateSlider(id, valueId, value, suffix = '') {
    document.getElementById(valueId).textContent = value + suffix;
}

['Sigma', 'Rho', 'Beta'].forEach(param => {
    const slider = document.getElementById('slider' + param);
    if (slider) {
        slider.addEventListener('input', (e) => {
            CONFIG[param.toLowerCase()] = parseFloat(e.target.value);
            updateSlider('slider' + param, 'val' + param, CONFIG[param.toLowerCase()].toFixed(param === 'Beta' ? 3 : 1));
            rebuildAttractor();
            saveConfig();
        });
    }
});

document.getElementById('sliderSpeed')?.addEventListener('input', (e) => {
    CONFIG.particleSpeedMult = parseFloat(e.target.value);
    updateSlider('sliderSpeed', 'valSpeed', CONFIG.particleSpeedMult.toFixed(1), 'x');
    saveConfig();
});

document.getElementById('sliderBloom')?.addEventListener('input', (e) => {
    CONFIG.bloomStrength = parseFloat(e.target.value);
    updateSlider('sliderBloom', 'valBloom', CONFIG.bloomStrength.toFixed(1));
    saveConfig();
});

document.getElementById('sliderStars')?.addEventListener('input', (e) => {
    CONFIG.starCount = parseInt(e.target.value);
    updateSlider('sliderStars', 'valStars', CONFIG.starCount);
    rebuildStars();
    saveConfig();
});

document.getElementById('sliderDof')?.addEventListener('input', (e) => {
    CONFIG.dofAmount = parseFloat(e.target.value);
    updateSlider('sliderDof', 'valDof', CONFIG.dofAmount.toFixed(2));
    saveConfig();
});

document.getElementById('sliderChroma')?.addEventListener('input', (e) => {
    CONFIG.chromaticAberration = parseFloat(e.target.value);
    updateSlider('sliderChroma', 'valChroma', CONFIG.chromaticAberration.toFixed(3));
    saveConfig();
});

document.getElementById('sliderCam')?.addEventListener('input', (e) => {
    CONFIG.cinematicMode = parseInt(e.target.value) === 1;
    document.getElementById('valCam').textContent = CONFIG.cinematicMode ? 'Кино' : 'Свободная';
    controls.autoRotate = !CONFIG.cinematicMode;
    saveConfig();
});

// Save config
function saveConfig() {
    try { localStorage.setItem('lorenz-config', JSON.stringify(CONFIG)); } catch (e) {}
}

// Reset
document.getElementById('btnReset')?.addEventListener('click', () => {
    CONFIG = { ...DEFAULT_CONFIG };
    ['Sigma', 'Rho', 'Beta', 'Bloom', 'Speed', 'Stars', 'Dof', 'Chroma'].forEach(p => {
        const el = document.getElementById('slider' + p);
        if (el) {
            const def = DEFAULT_CONFIG[p.toLowerCase()] || DEFAULT_CONFIG[p.toLowerCase() === 'dof' ? 'dofAmount' : p.toLowerCase() === 'chroma' ? 'chromaticAberration' : p.toLowerCase()];
            el.value = def;
        }
    });
    updateSlider('sliderSigma', 'valSigma', '10.0');
    updateSlider('sliderRho', 'valRho', '28.0');
    updateSlider('sliderBeta', 'valBeta', '2.667');
    updateSlider('sliderBloom', 'valBloom', '1.5');
    updateSlider('sliderSpeed', 'valSpeed', '1.0', 'x');
    updateSlider('sliderStars', 'valStars', '3000');
    updateSlider('sliderDof', 'valDof', '0.00');
    updateSlider('sliderChroma', 'valChroma', '0.000');
    document.getElementById('valCam').textContent = 'Свободная';
    rebuildAttractor();
    saveConfig();
    showToast('↺', 'Настройки сброшены');
});

// Pause
const btnPause = document.getElementById('btnPause');
btnPause?.addEventListener('click', () => {
    CONFIG.paused = !CONFIG.paused;
    btnPause.textContent = CONFIG.paused ? '▶ Продолжить' : '⏸ Пауза';
    showToast(CONFIG.paused ? '⏸' : '▶', CONFIG.paused ? 'Пауза' : 'Продолжение');
});

// Presets
document.querySelectorAll('.preset-chip').forEach(chip => {
    chip.addEventListener('click', () => {
        document.querySelectorAll('.preset-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const preset = PRESETS[chip.dataset.preset];
        if (preset) {
            CONFIG.sigma = preset.sigma;
            CONFIG.rho = preset.rho;
            CONFIG.beta = preset.beta;
            document.getElementById('sliderSigma').value = preset.sigma;
            document.getElementById('sliderRho').value = preset.rho;
            document.getElementById('sliderBeta').value = preset.beta;
            updateSlider('sliderSigma', 'valSigma', preset.sigma.toFixed(1));
            updateSlider('sliderRho', 'valRho', preset.rho.toFixed(1));
            updateSlider('sliderBeta', 'valBeta', preset.beta.toFixed(3));
            rebuildAttractor();
            saveConfig();
            showToast('💾', 'Пресет загружен: ' + chip.dataset.preset);
        }
    });
});

// Attractor tabs
document.querySelectorAll('.attractor-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.attractor-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        CONFIG.currentAttractor = tab.dataset.attractor;
        rebuildAttractor();
        saveConfig();
        showToast('🌀', 'Аттрактор: ' + ATTRACTORS[CONFIG.currentAttractor].name);
    });
});

// Video Recording
let mediaRecorder = null;
let recordedChunks = [];
const btnRecord = document.getElementById('btnRecord');

btnRecord?.addEventListener('click', async () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        btnRecord.innerHTML = '🔴 Запись';
        btnRecord.classList.remove('btn-primary');
        btnRecord.classList.add('btn-secondary');
        document.querySelector('.nav-btn#btnRecord')?.classList.remove('recording');
        return;
    }
    const canvas = renderer.domElement;
    const stream = canvas.captureStream(60);
    try {
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
        recordedChunks = [];
        mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) recordedChunks.push(e.data); };
        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `lorenz-${Date.now()}.webm`;
            a.click();
            URL.revokeObjectURL(url);
            showToast('🎥', 'Видео сохранено!');
        };
        mediaRecorder.start();
        btnRecord.innerHTML = '⏹ Остановить';
        btnRecord.classList.remove('btn-secondary');
        btnRecord.classList.add('btn-primary');
        showToast('🔴', 'Запись началась');
    } catch (err) {
        showToast('⚠️', 'Запись не поддерживается');
    }
});

// GIF Export (simplified)
document.getElementById('btnGif')?.addEventListener('click', () => {
    showToast('🎞', 'GIF экспорт: используйте запись видео и конвертируйте онлайн');
});

// Sound Reactive
document.getElementById('btnSound')?.addEventListener('click', () => {
    if (!audioReactive) { initAudio(); }
    else {
        audioReactive = false;
        showToast('🔇', 'Звуковая реакция отключена');
    }
});

// VR
document.getElementById('btnVR')?.addEventListener('click', async () => {
    if ('xr' in navigator) {
        try {
            const session = await navigator.xr.requestSession('immersive-vr');
            showToast('🥽', 'VR режим активирован');
        } catch (e) {
            showToast('⚠️', 'VR не доступен');
        }
    } else {
        showToast('⚠️', 'WebXR не поддерживается');
    }
});

// ═══════════════════════════════════════════════════════════════════
//  BUTTERFLY EFFECT
// ═══════════════════════════════════════════════════════════════════
const bfCanvas = document.getElementById('butterflyCanvas');
const bfCtx = bfCanvas?.getContext('2d');
let bfAnimation = null;

function resizeButterfly() {
    if (!bfCanvas) return;
    const rect = bfCanvas.getBoundingClientRect();
    bfCanvas.width = rect.width * window.devicePixelRatio;
    bfCanvas.height = rect.height * window.devicePixelRatio;
    bfCtx?.scale(window.devicePixelRatio, window.devicePixelRatio);
}
resizeButterfly();
window.addEventListener('resize', resizeButterfly);

function runButterfly() {
    if (bfAnimation) cancelAnimationFrame(bfAnimation);
    if (!bfCanvas || !bfCtx) return;
    const w = bfCanvas.width / window.devicePixelRatio;
    const h = bfCanvas.height / window.devicePixelRatio;
    let x1 = 0.1, y1 = 0.0, z1 = 0.0;
    let x2 = 0.1001, y2 = 0.0, z2 = 0.0;
    const pointsA = [], pointsB = [];
    const maxPoints = 2000;
    let frame = 0;

    function step() {
        bfCtx.fillStyle = 'rgba(5, 5, 8, 0.05)';
        bfCtx.fillRect(0, 0, w, h);
        for (let i = 0; i < 5; i++) {
            const dx1 = CONFIG.sigma * (y1 - x1) * 0.01;
            const dy1 = (x1 * (CONFIG.rho - z1) - y1) * 0.01;
            const dz1 = (x1 * y1 - CONFIG.beta * z1) * 0.01;
            x1 += dx1; y1 += dy1; z1 += dz1;
            const dx2 = CONFIG.sigma * (y2 - x2) * 0.01;
            const dy2 = (x2 * (CONFIG.rho - z2) - y2) * 0.01;
            const dz2 = (x2 * y2 - CONFIG.beta * z2) * 0.01;
            x2 += dx2; y2 += dy2; z2 += dz2;
            pointsA.push({ x: x1, y: y1, z: z1 });
            pointsB.push({ x: x2, y: y2, z: z2 });
            if (pointsA.length > maxPoints) { pointsA.shift(); pointsB.shift(); }
        }
        const scale = 3, ox = w / 2, oy = h / 2 + 20;
        bfCtx.beginPath();
        bfCtx.strokeStyle = 'rgba(0, 229, 255, 0.6)';
        bfCtx.lineWidth = 1.5;
        for (let i = 0; i < pointsA.length - 1; i++) {
            const p1 = pointsA[i], p2 = pointsA[i + 1];
            bfCtx.moveTo(ox + p1.x * scale, oy - p1.y * scale + p1.z * 0.5);
            bfCtx.lineTo(ox + p2.x * scale, oy - p2.y * scale + p2.z * 0.5);
        }
        bfCtx.stroke();
        bfCtx.beginPath();
        bfCtx.strokeStyle = 'rgba(255, 42, 109, 0.6)';
        bfCtx.lineWidth = 1.5;
        for (let i = 0; i < pointsB.length - 1; i++) {
            const p1 = pointsB[i], p2 = pointsB[i + 1];
            bfCtx.moveTo(ox + p1.x * scale, oy - p1.y * scale + p1.z * 0.5);
            bfCtx.lineTo(ox + p2.x * scale, oy - p2.y * scale + p2.z * 0.5);
        }
        bfCtx.stroke();
        if (pointsA.length > 0) {
            const lastA = pointsA[pointsA.length - 1];
            const lastB = pointsB[pointsB.length - 1];
            bfCtx.fillStyle = '#00e5ff';
            bfCtx.beginPath();
            bfCtx.arc(ox + lastA.x * scale, oy - lastA.y * scale + lastA.z * 0.5, 4, 0, Math.PI * 2);
            bfCtx.fill();
            bfCtx.fillStyle = '#ff2a6d';
            bfCtx.beginPath();
            bfCtx.arc(ox + lastB.x * scale, oy - lastB.y * scale + lastB.z * 0.5, 4, 0, Math.PI * 2);
            bfCtx.fill();
            const dist = Math.sqrt((lastA.x - lastB.x)**2 + (lastA.y - lastB.y)**2 + (lastA.z - lastB.z)**2);
            document.getElementById('butterflyDistance').textContent = `Расхождение: ${dist.toFixed(4)}`;
        }
        frame++;
        if (frame < 2000) bfAnimation = requestAnimationFrame(step);
    }
    step();
}

document.getElementById('btnButterfly')?.addEventListener('click', runButterfly);

// ═══════════════════════════════════════════════════════════════════
//  LOADING & START
// ═══════════════════════════════════════════════════════════════════
const loaderStatus = document.getElementById('loaderStatus');
const loadingScreen = document.getElementById('loading');

const loadSteps = [
    'Загрузка Three.js...',
    'Компиляция шейдеров...',
    'Генерация аттрактора...',
    'Инициализация частиц...',
    'Настройка постобработки...',
    'Готово!'
];

let stepIndex = 0;
const loadInterval = setInterval(() => {
    stepIndex++;
    if (loaderStatus && stepIndex < loadSteps.length) {
        loaderStatus.textContent = loadSteps[stepIndex];
    }
    if (stepIndex >= loadSteps.length) {
        clearInterval(loadInterval);
        setTimeout(() => {
            loadingScreen.style.opacity = '0';
            setTimeout(() => { loadingScreen.style.display = 'none'; }, 1000);
        }, 500);
    }
}, 400);

// Touch gestures
let touchStartX = 0, touchStartY = 0;
renderer.domElement.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
}, { passive: true });

renderer.domElement.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1) {
        const dx = e.touches[0].clientX - touchStartX;
        const dy = e.touches[0].clientY - touchStartY;
        controls.autoRotate = false;
    }
}, { passive: true });

// Double tap to reset
document.addEventListener('dblclick', () => {
    controls.reset();
    camera.position.set(35, 25, 45);
    showToast('🎯', 'Камера сброшена');
});

// Init
updateHUD();
animate();
