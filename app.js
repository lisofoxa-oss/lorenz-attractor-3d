import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ═══════════════════════════════════════════════════════════════════
//  КОНФИГУРАЦИЯ
// ═══════════════════════════════════════════════════════════════════
const DEFAULT_CONFIG = {
    sigma: 10.0, rho: 28.0, beta: 8.0 / 3.0,
    dt: 0.008, numPoints: 15000, particleCount: 100,
    bloomStrength: 1.2, autoRotateSpeed: 0.3,
    particleSpeedMult: 1.0, starCount: 2000,
    paused: false, currentAttractor: 'lorenz',
    cinematicMode: false
};

let CONFIG = { ...DEFAULT_CONFIG };

try {
    const saved = localStorage.getItem('lorenz-config-v2');
    if (saved) CONFIG = { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
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
//  СЦЕНА (совместимая с WebGL1)
// ═══════════════════════════════════════════════════════════════════
const container = document.getElementById('canvas-container');
if (!container) {
    console.error('Canvas container not found');
    throw new Error('Canvas container not found');
}

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x050508, 0.012);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(35, 25, 45);

// WebGL1 fallback renderer
const renderer = new THREE.WebGLRenderer({ 
    antialias: true, 
    alpha: true,
    powerPreference: 'high-performance'
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x000000, 0);
container.appendChild(renderer.domElement);

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
    const tempPoints = [];
    let x = 0.1, y = 0.0, z = 0.0;
    let minSpeed = Infinity, maxSpeed = -Infinity;

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
    try {
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
    } catch (e) {
        console.error('rebuildAttractor error:', e);
    }
}

// ═══════════════════════════════════════════════════════════════════
//  ЧАСТИЦЫ
// ═══════════════════════════════════════════════════════════════════
let particleData = [];

function rebuildParticles() {
    try {
        if (particles) { scene.remove(particles); particleGeometry.dispose(); }
        particleGeometry = new THREE.BufferGeometry();
        const particlePositions = new Float32Array(CONFIG.particleCount * 3);
        const particleColors = new Float32Array(CONFIG.particleCount * 3);
        const particleSizes = new Float32Array(CONFIG.particleCount);
        particleData = [];
        for (let i = 0; i < CONFIG.particleCount; i++) {
            particleData.push({ 
                index: Math.floor(Math.random() * CONFIG.numPoints), 
                speed: 30 + Math.random() * 80 
            });
            particleSizes[i] = 1.5 + Math.random() * 2;
        }
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
        particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
        particleGeometry.setAttribute('size', new THREE.BufferAttribute(particleSizes, 1));

        const particleMaterial = new THREE.ShaderMaterial({
            uniforms: { time: { value: 0 } },
            vertexShader: `
                attribute float size;
                varying vec3 vColor;
                void main() {
                    vColor = color;
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size * (300.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                void main() {
                    float dist = length(gl_PointCoord - vec2(0.5));
                    if (dist > 0.5) discard;
                    float glow = 1.0 - smoothstep(0.0, 0.5, dist);
                    glow = pow(glow, 1.5);
                    gl_FragColor = vec4(vColor * 1.5, glow);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            vertexColors: true
        });
        particles = new THREE.Points(particleGeometry, particleMaterial);
        scene.add(particles);
    } catch (e) {
        console.error('rebuildParticles error:', e);
    }
}

// ═══════════════════════════════════════════════════════════════════
//  ЗВЁЗДЫ
// ═══════════════════════════════════════════════════════════════════
function rebuildStars() {
    try {
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
            starsColors[i * 3] = brightness;
            starsColors[i * 3 + 1] = brightness * 0.9;
            starsColors[i * 3 + 2] = brightness;
        }
        starsGeometry.setAttribute('position', new THREE.BufferAttribute(starsPositions, 3));
        starsGeometry.setAttribute('color', new THREE.BufferAttribute(starsColors, 3));
        const starsMaterial = new THREE.PointsMaterial({ 
            size: 0.3, vertexColors: true, transparent: true, 
            opacity: 0.8, blending: THREE.AdditiveBlending 
        });
        stars = new THREE.Points(starsGeometry, starsMaterial);
        scene.add(stars);
    } catch (e) {
        console.error('rebuildStars error:', e);
    }
}

// ═══════════════════════════════════════════════════════════════════
//  ИНИЦИАЛИЗАЦИЯ
// ═══════════════════════════════════════════════════════════════════
try {
    rebuildAttractor();
    rebuildStars();
} catch (e) {
    console.error('Init error:', e);
}

const ambientLight = new THREE.AmbientLight(0x404080, 0.5);
scene.add(ambientLight);

// ═══════════════════════════════════════════════════════════════════
//  АНИМАЦИЯ
// ═══════════════════════════════════════════════════════════════════
const clock = new THREE.Clock();

function updateParticles(time) {
    if (!posAttr || !particleGeometry) return;
    const positions = particleGeometry.attributes.position.array;
    const colors = particleGeometry.attributes.color.array;
    for (let i = 0; i < CONFIG.particleCount; i++) {
        const data = particleData[i];
        if (!data) continue;
        data.index = (data.index + data.speed * 0.016 * CONFIG.particleSpeedMult) % CONFIG.numPoints;
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

function animate() {
    requestAnimationFrame(animate);
    if (CONFIG.paused) { renderer.render(scene, camera); return; }

    const time = clock.getElapsedTime();
    controls.update();
    updateParticles(time);

    if (stars && stars.material) {
        stars.material.opacity = 0.6 + Math.sin(time * 0.5) * 0.2;
    }

    renderer.render(scene, camera);
}

// ═══════════════════════════════════════════════════════════════════
//  HUD
// ═══════════════════════════════════════════════════════════════════
function updateHUD() {
    const set = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };
    set('hudSigma', CONFIG.sigma.toFixed(1));
    set('hudRho', CONFIG.rho.toFixed(1));
    set('hudBeta', CONFIG.beta.toFixed(3));
    set('hudAttractor', ATTRACTORS[CONFIG.currentAttractor]?.name || '—');
    set('hudPoints', CONFIG.numPoints);
    set('hudParticles', CONFIG.particleCount);
}

// ═══════════════════════════════════════════════════════════════════
//  TOAST
// ═══════════════════════════════════════════════════════════════════
function showToast(icon, text) {
    const toast = document.getElementById('toast');
    const iconEl = document.getElementById('toastIcon');
    const textEl = document.getElementById('toastText');
    if (!toast || !iconEl || !textEl) {
        console.log(`[Toast] ${icon} ${text}`);
        return;
    }
    iconEl.textContent = icon;
    textEl.textContent = text;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// ═══════════════════════════════════════════════════════════════════
//  UI / СОБЫТИЯ
// ═══════════════════════════════════════════════════════════════════
window.addEventListener('resize', () => {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Theme
const themeBtn = document.getElementById('themeToggle');
if (themeBtn) {
    themeBtn.addEventListener('click', () => {
        const isDark = document.body.getAttribute('data-theme') !== 'light';
        document.body.setAttribute('data-theme', isDark ? 'light' : 'dark');
        themeBtn.textContent = isDark ? '☀️' : '🌙';
        if (scene && scene.fog) {
            scene.fog.color.setHex(isDark ? 0xf0f0f8 : 0x050508);
        }
        renderer.setClearColor(isDark ? 0xf0f0f8 : 0x000000, isDark ? 1 : 0);
    });
}

// Nav scroll
const nav = document.querySelector('.nav');
if (nav) {
    window.addEventListener('scroll', () => nav.classList.toggle('scrolled', window.scrollY > 100));
}

// Reveal on scroll
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('visible'); });
}, { threshold: 0.1 });
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// Sliders
function updateSlider(id, valueId, value, suffix = '') {
    const el = document.getElementById(valueId);
    if (el) el.textContent = value + suffix;
}

function bindSlider(name, configKey, decimals = 1, suffix = '') {
    const slider = document.getElementById('slider' + name);
    if (!slider) return;
    slider.addEventListener('input', (e) => {
        CONFIG[configKey] = parseFloat(e.target.value);
        updateSlider('slider' + name, 'val' + name, CONFIG[configKey].toFixed(decimals), suffix);
        if (configKey === 'sigma' || configKey === 'rho' || configKey === 'beta') {
            rebuildAttractor();
        } else if (configKey === 'starCount') {
            rebuildStars();
        }
        try { localStorage.setItem('lorenz-config-v2', JSON.stringify(CONFIG)); } catch (e) {}
    });
}

bindSlider('Sigma', 'sigma', 1);
bindSlider('Rho', 'rho', 1);
bindSlider('Beta', 'beta', 3);
bindSlider('Speed', 'particleSpeedMult', 1, 'x');
bindSlider('Bloom', 'bloomStrength', 1);
bindSlider('Stars', 'starCount', 0);

// Reset
const btnReset = document.getElementById('btnReset');
if (btnReset) {
    btnReset.addEventListener('click', () => {
        CONFIG = { ...DEFAULT_CONFIG };
        ['Sigma', 'Rho', 'Beta', 'Bloom', 'Speed', 'Stars'].forEach(p => {
            const el = document.getElementById('slider' + p);
            if (el) el.value = DEFAULT_CONFIG[p.toLowerCase() === 'speed' ? 'particleSpeedMult' : p.toLowerCase() === 'stars' ? 'starCount' : p.toLowerCase()];
        });
        updateSlider('sliderSigma', 'valSigma', '10.0');
        updateSlider('sliderRho', 'valRho', '28.0');
        updateSlider('sliderBeta', 'valBeta', '2.667');
        updateSlider('sliderBloom', 'valBloom', '1.2');
        updateSlider('sliderSpeed', 'valSpeed', '1.0', 'x');
        updateSlider('sliderStars', 'valStars', '2000');
        rebuildAttractor();
        showToast('↺', 'Настройки сброшены');
    });
}

// Pause
const btnPause = document.getElementById('btnPause');
if (btnPause) {
    btnPause.addEventListener('click', () => {
        CONFIG.paused = !CONFIG.paused;
        btnPause.textContent = CONFIG.paused ? '▶ Продолжить' : '⏸ Пауза';
    });
}

// Presets
document.querySelectorAll('.preset-chip').forEach(chip => {
    chip.addEventListener('click', () => {
        document.querySelectorAll('.preset-chip').forEach(c => {
            c.classList.remove('active');
            c.style.transform = '';
            c.style.boxShadow = '';
        });
        chip.classList.add('active');
        chip.style.transform = 'translateY(-2px)';
        chip.style.boxShadow = '0 0 20px rgba(0,229,255,0.15)';
        const preset = PRESETS[chip.dataset.preset];
        if (!preset) return;
        CONFIG.sigma = preset.sigma;
        CONFIG.rho = preset.rho;
        CONFIG.beta = preset.beta;
        const sS = document.getElementById('sliderSigma');
        const sR = document.getElementById('sliderRho');
        const sB = document.getElementById('sliderBeta');
        if (sS) sS.value = preset.sigma;
        if (sR) sR.value = preset.rho;
        if (sB) sB.value = preset.beta;
        updateSlider('sliderSigma', 'valSigma', preset.sigma.toFixed(1));
        updateSlider('sliderRho', 'valRho', preset.rho.toFixed(1));
        updateSlider('sliderBeta', 'valBeta', preset.beta.toFixed(3));
        rebuildAttractor();
        showToast('💾', 'Пресет: ' + chip.dataset.preset);
    });
});

// Attractor tabs
document.querySelectorAll('.attractor-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.attractor-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        CONFIG.currentAttractor = tab.dataset.attractor;
        rebuildAttractor();
        showToast('🌀', ATTRACTORS[CONFIG.currentAttractor]?.name || '—');
    });
});

// Video Recording
let mediaRecorder = null;
let recordedChunks = [];
const btnRecord = document.getElementById('btnRecord');
if (btnRecord) {
    btnRecord.addEventListener('click', async () => {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
            btnRecord.innerHTML = '🔴 Запись';
            showToast('⏹', 'Запись остановлена');
            return;
        }
        const canvas = renderer.domElement;
        const stream = canvas.captureStream(30);
        try {
            mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
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
            showToast('🔴', 'Запись началась');
        } catch (err) {
            showToast('⚠️', 'Запись не поддерживается');
        }
    });
}

// GIF
const btnGif = document.getElementById('btnGif');
if (btnGif) {
    btnGif.addEventListener('click', () => {
        showToast('🎞', 'Сохрани видео и конвертируй в GIF онлайн');
    });
}

// Sound
const btnSound = document.getElementById('btnSound');
if (btnSound) {
    btnSound.addEventListener('click', () => {
        showToast('🔊', 'Звуковая реакция: используйте видео с музыкой');
    });
}

// VR
const btnVR = document.getElementById('btnVR');
if (btnVR) {
    btnVR.addEventListener('click', () => {
        showToast('🥽', 'WebXR: откройте на VR-устройстве');
    });
}

// ═══════════════════════════════════════════════════════════════════
//  BUTTERFLY EFFECT
// ═══════════════════════════════════════════════════════════════════
const bfCanvas = document.getElementById('butterflyCanvas');
const bfCtx = bfCanvas?.getContext('2d');
let bfAnimation = null;

function resizeButterfly() {
    if (!bfCanvas) return;
    const rect = bfCanvas.getBoundingClientRect();
    bfCanvas.width = rect.width * Math.min(window.devicePixelRatio, 2);
    bfCanvas.height = rect.height * Math.min(window.devicePixelRatio, 2);
    if (bfCtx) bfCtx.scale(Math.min(window.devicePixelRatio, 2), Math.min(window.devicePixelRatio, 2));
}
resizeButterfly();
window.addEventListener('resize', resizeButterfly);

function runButterfly() {
    if (bfAnimation) cancelAnimationFrame(bfAnimation);
    if (!bfCanvas || !bfCtx) return;
    const w = bfCanvas.width / Math.min(window.devicePixelRatio, 2);
    const h = bfCanvas.height / Math.min(window.devicePixelRatio, 2);
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
            const dist = Math.sqrt((lastA.x-lastB.x)**2 + (lastA.y-lastB.y)**2 + (lastA.z-lastB.z)**2);
            const distEl = document.getElementById('butterflyDistance');
            if (distEl) distEl.textContent = `Расхождение: ${dist.toFixed(4)}`;
        }
        frame++;
        if (frame < 2000) bfAnimation = requestAnimationFrame(step);
    }
    step();
}

const btnButterfly = document.getElementById('btnButterfly');
const btnButterflyStop = document.getElementById('btnButterflyStop');

if (btnButterfly) {
    btnButterfly.addEventListener('click', () => {
        runButterfly();
        btnButterfly.style.display = 'none';
        if (btnButterflyStop) btnButterflyStop.style.display = 'inline-flex';
    });
}

if (btnButterflyStop) {
    btnButterflyStop.addEventListener('click', () => {
        if (bfAnimation) {
            cancelAnimationFrame(bfAnimation);
            bfAnimation = null;
        }
        btnButterflyStop.style.display = 'none';
        if (btnButterfly) btnButterfly.style.display = 'inline-flex';
        showToast('⏹', 'Эффект бабочки остановлен');
    });
}

// ═══════════════════════════════════════════════════════════════════
//  LOADING & START
// ═══════════════════════════════════════════════════════════════════
const loadingScreen = document.getElementById('loading');
const loaderStatus = document.getElementById('loaderStatus');

const loadSteps = [
    'Загрузка Three.js...',
    'Компиляция шейдеров...',
    'Генерация аттрактора...',
    'Инициализация частиц...',
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
            if (loadingScreen) {
                loadingScreen.style.opacity = '0';
                setTimeout(() => { if (loadingScreen) loadingScreen.style.display = 'none'; }, 1000);
            }
        }, 300);
    }
}, 300);

// Fallback: скрыть загрузку через 5 секунд в любом случае
setTimeout(() => {
    if (loadingScreen && loadingScreen.style.display !== 'none') {
        loadingScreen.style.opacity = '0';
        setTimeout(() => { if (loadingScreen) loadingScreen.style.display = 'none'; }, 1000);
    }
}, 5000);

// Double tap to reset camera
document.addEventListener('dblclick', () => {
    if (controls) {
        controls.reset();
        camera.position.set(35, 25, 45);
        showToast('🎯', 'Камера сброшена');
    }
});

// Init
console.log("%c🌀 Lorenz Attractor 3D v2.1.0", "color:#00e5ff;font-size:16px;font-weight:bold;");
    console.log("%cBuild: 2026-07-19 | Three.js r152 | WebGL1 Mode", "color:#505070;font-size:12px;");
    console.log("%cGitHub: lisofoxa-oss/lorenz-attractor-3d", "color:#9d4edd;font-size:11px;");
    updateHUD();
    animate();
    setTimeout(() => showToast("🌀", "Lorenz 3D v2.1.0 загружен!"), 1000);
