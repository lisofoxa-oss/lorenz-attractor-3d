import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// ═══════════════════════════════════════════════════════════════
//  КОНФИГУРАЦИЯ
// ═══════════════════════════════════════════════════════════════
const CONFIG = {
    sigma: 10.0,
    rho: 28.0,
    beta: 8.0 / 3.0,
    dt: 0.008,
    numPoints: 25000,
    particleCount: 200,
    bloomStrength: 1.5,
    bloomRadius: 0.4,
    bloomThreshold: 0.1,
    autoRotateSpeed: 0.3,
    particleSpeedMult: 1.0,
    starCount: 3000,
    paused: false,
    currentAttractor: 'lorenz'
};

// Аттракторы
const ATTRACTORS = {
    lorenz: {
        name: 'Лоренц',
        params: { sigma: 10, rho: 28, beta: 8/3 },
        dt: 0.008,
        scale: 1,
        offset: { x: 0, y: 0, z: 25 },
        step: (x, y, z, p, dt) => {
            const dx = p.sigma * (y - x) * dt;
            const dy = (x * (p.rho - z) - y) * dt;
            const dz = (x * y - p.beta * z) * dt;
            return [x + dx, y + dy, z + dz];
        }
    },
    rossler: {
        name: 'Рёсслер',
        params: { a: 0.2, b: 0.2, c: 5.7 },
        dt: 0.02,
        scale: 2,
        offset: { x: 0, y: 0, z: 0 },
        step: (x, y, z, p, dt) => {
            const dx = (-y - z) * dt;
            const dy = (x + p.a * y) * dt;
            const dz = (p.b + z * (x - p.c)) * dt;
            return [x + dx, y + dy, z + dz];
        }
    },
    aizawa: {
        name: 'Айдзава',
        params: { a: 0.95, b: 0.7, c: 0.6, d: 3.5, e: 0.25, f: 0.1 },
        dt: 0.01,
        scale: 3,
        offset: { x: 0, y: 0, z: 0 },
        step: (x, y, z, p, dt) => {
            const dx = ((z - p.b) * x - p.d * y) * dt;
            const dy = (p.d * x + (z - p.b) * y) * dt;
            const dz = (p.c + p.a * z - z*z*z/3 - (x*x + y*y) * (1 + p.e * z) + p.f * z * x*x*x) * dt;
            return [x + dx, y + dy, z + dz];
        }
    },
    thomas: {
        name: 'Томас',
        params: { b: 0.208186 },
        dt: 0.01,
        scale: 4,
        offset: { x: 0, y: 0, z: 0 },
        step: (x, y, z, p, dt) => {
            const dx = (Math.sin(y) - p.b * x) * dt;
            const dy = (Math.sin(z) - p.b * y) * dt;
            const dz = (Math.sin(x) - p.b * z) * dt;
            return [x + dx, y + dy, z + dz];
        }
    }
};

// ═══════════════════════════════════════════════════════════════
//  СЦЕНА
// ═══════════════════════════════════════════════════════════════
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0a0a0f, 0.015);

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
    CONFIG.bloomStrength,
    CONFIG.bloomRadius,
    CONFIG.bloomThreshold
);
composer.addPass(bloomPass);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.autoRotate = true;
controls.autoRotateSpeed = CONFIG.autoRotateSpeed;
controls.minDistance = 10;
controls.maxDistance = 120;

// ═══════════════════════════════════════════════════════════════
//  ГЕНЕРАЦИЯ АТТРАКТОРА
// ═══════════════════════════════════════════════════════════════
let attractorLine, particles, stars;
let lineGeometry, particleGeometry, starsGeometry;
let posAttr;

function generateAttractor(type, count, dt) {
    const attractor = ATTRACTORS[type];
    const points = [];
    const colors = [];
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
    if (attractorLine) {
        scene.remove(attractorLine);
        lineGeometry.dispose();
    }

    const attractor = ATTRACTORS[CONFIG.currentAttractor];
    attractor.params.sigma = CONFIG.sigma;
    attractor.params.rho = CONFIG.rho;
    attractor.params.beta = CONFIG.beta;

    lineGeometry = generateAttractor(CONFIG.currentAttractor, CONFIG.numPoints, attractor.dt);
    const lineMaterial = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.85
    });
    attractorLine = new THREE.Line(lineGeometry, lineMaterial);
    scene.add(attractorLine);
    posAttr = lineGeometry.attributes.position;

    // Пересоздаём частицы
    rebuildParticles();
}

// ═══════════════════════════════════════════════════════════════
//  ЧАСТИЦЫ
// ═══════════════════════════════════════════════════════════════
let particleData = [];

function rebuildParticles() {
    if (particles) {
        scene.remove(particles);
        particleGeometry.dispose();
    }

    particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(CONFIG.particleCount * 3);
    const particleColors = new Float32Array(CONFIG.particleCount * 3);
    const particleSizes = new Float32Array(CONFIG.particleCount);

    particleData = [];
    for (let i = 0; i < CONFIG.particleCount; i++) {
        particleData.push({
            index: Math.floor(Math.random() * CONFIG.numPoints),
            speed: 30 + Math.random() * 80,
            offset: Math.random() * Math.PI * 2
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
}

// ═══════════════════════════════════════════════════════════════
//  ЗВЁЗДЫ
// ═══════════════════════════════════════════════════════════════
function rebuildStars() {
    if (stars) {
        scene.remove(stars);
        starsGeometry.dispose();
    }

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

    const starsMaterial = new THREE.PointsMaterial({
        size: 0.3,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
    });

    stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);
}

// ═══════════════════════════════════════════════════════════════
//  ИНИЦИАЛИЗАЦИЯ
// ═══════════════════════════════════════════════════════════════
rebuildAttractor();
rebuildStars();

const ambientLight = new THREE.AmbientLight(0x404080, 0.5);
scene.add(ambientLight);

// ═══════════════════════════════════════════════════════════════
//  АНИМАЦИЯ
// ═══════════════════════════════════════════════════════════════
const clock = new THREE.Clock();

function updateParticles(time) {
    if (!posAttr) return;
    const positions = particleGeometry.attributes.position.array;
    const colors = particleGeometry.attributes.color.array;

    for (let i = 0; i < CONFIG.particleCount; i++) {
        const data = particleData[i];
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

    if (CONFIG.paused) {
        composer.render();
        return;
    }

    const time = clock.getElapsedTime();

    controls.update();
    updateParticles(time);

    if (stars) {
        stars.material.opacity = 0.6 + Math.sin(time * 0.5) * 0.2;
    }

    bloomPass.strength = CONFIG.bloomStrength + Math.sin(time * 0.8) * 0.3;

    composer.render();
}

// ═══════════════════════════════════════════════════════════════
//  UI / СОБЫТИЯ
// ═══════════════════════════════════════════════════════════════

// Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});

// Theme toggle
const themeToggle = document.getElementById('themeToggle');
let isDark = true;

themeToggle.addEventListener('click', () => {
    isDark = !isDark;
    document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');
    themeToggle.textContent = isDark ? '🌙' : '☀️';

    if (isDark) {
        scene.fog = new THREE.FogExp2(0x0a0a0f, 0.015);
        renderer.setClearColor(0x000000, 0);
    } else {
        scene.fog = new THREE.FogExp2(0xf5f5fa, 0.015);
        renderer.setClearColor(0xf5f5fa, 1);
    }
});

// Navigation scroll effect
const nav = document.querySelector('.nav');
window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 100);
});

// Reveal on scroll
const reveals = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, { threshold: 0.1 });

reveals.forEach(el => revealObserver.observe(el));

// ─── Sliders ───
function updateSlider(id, valueId, value, suffix = '') {
    document.getElementById(valueId).textContent = value + suffix;
}

document.getElementById('sliderSigma').addEventListener('input', (e) => {
    CONFIG.sigma = parseFloat(e.target.value);
    updateSlider('sliderSigma', 'valSigma', CONFIG.sigma.toFixed(1));
    rebuildAttractor();
});

document.getElementById('sliderRho').addEventListener('input', (e) => {
    CONFIG.rho = parseFloat(e.target.value);
    updateSlider('sliderRho', 'valRho', CONFIG.rho.toFixed(1));
    rebuildAttractor();
});

document.getElementById('sliderBeta').addEventListener('input', (e) => {
    CONFIG.beta = parseFloat(e.target.value);
    updateSlider('sliderBeta', 'valBeta', CONFIG.beta.toFixed(3));
    rebuildAttractor();
});

document.getElementById('sliderSpeed').addEventListener('input', (e) => {
    CONFIG.particleSpeedMult = parseFloat(e.target.value);
    updateSlider('sliderSpeed', 'valSpeed', CONFIG.particleSpeedMult.toFixed(1), 'x');
});

document.getElementById('sliderBloom').addEventListener('input', (e) => {
    CONFIG.bloomStrength = parseFloat(e.target.value);
    updateSlider('sliderBloom', 'valBloom', CONFIG.bloomStrength.toFixed(1));
});

document.getElementById('sliderStars').addEventListener('input', (e) => {
    CONFIG.starCount = parseInt(e.target.value);
    updateSlider('sliderStars', 'valStars', CONFIG.starCount);
    rebuildStars();
});

// ─── Buttons ───
document.getElementById('btnReset').addEventListener('click', () => {
    CONFIG.sigma = 10.0;
    CONFIG.rho = 28.0;
    CONFIG.beta = 8.0 / 3.0;
    CONFIG.bloomStrength = 1.5;
    CONFIG.particleSpeedMult = 1.0;

    document.getElementById('sliderSigma').value = 10;
    document.getElementById('sliderRho').value = 28;
    document.getElementById('sliderBeta').value = 2.667;
    document.getElementById('sliderBloom').value = 1.5;
    document.getElementById('sliderSpeed').value = 1;

    updateSlider('sliderSigma', 'valSigma', '10.0');
    updateSlider('sliderRho', 'valRho', '28.0');
    updateSlider('sliderBeta', 'valBeta', '2.667');
    updateSlider('sliderBloom', 'valBloom', '1.5');
    updateSlider('sliderSpeed', 'valSpeed', '1.0', 'x');

    rebuildAttractor();
});

const btnPause = document.getElementById('btnPause');
btnPause.addEventListener('click', () => {
    CONFIG.paused = !CONFIG.paused;
    btnPause.textContent = CONFIG.paused ? '▶ Продолжить' : '⏸ Пауза';
});

// ─── Attractor Tabs ───
document.querySelectorAll('.attractor-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.attractor-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        CONFIG.currentAttractor = tab.dataset.attractor;
        rebuildAttractor();
    });
});

// ─── Video Recording ───
let mediaRecorder = null;
let recordedChunks = [];
const btnRecord = document.getElementById('btnRecord');

btnRecord.addEventListener('click', async () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        btnRecord.innerHTML = '🔴 Запись';
        btnRecord.classList.remove('btn-primary');
        btnRecord.classList.add('btn-secondary');
        return;
    }

    const canvas = renderer.domElement;
    const stream = canvas.captureStream(60);

    try {
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
        recordedChunks = [];

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) recordedChunks.push(e.data);
        };

        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `lorenz-attractor-${Date.now()}.webm`;
            a.click();
            URL.revokeObjectURL(url);
        };

        mediaRecorder.start();
        btnRecord.innerHTML = '⏹ Остановить';
        btnRecord.classList.remove('btn-secondary');
        btnRecord.classList.add('btn-primary');
    } catch (err) {
        alert('Запись видео не поддерживается в этом браузере');
    }
});

// ═══════════════════════════════════════════════════════════════
//  ЭФФЕКТ БАБОЧКИ (2D Canvas)
// ═══════════════════════════════════════════════════════════════
const bfCanvas = document.getElementById('butterflyCanvas');
const bfCtx = bfCanvas.getContext('2d');
let bfAnimation = null;

function resizeButterflyCanvas() {
    const rect = bfCanvas.getBoundingClientRect();
    bfCanvas.width = rect.width * window.devicePixelRatio;
    bfCanvas.height = rect.height * window.devicePixelRatio;
    bfCtx.scale(window.devicePixelRatio, window.devicePixelRatio);
}

resizeButterflyCanvas();
window.addEventListener('resize', resizeButterflyCanvas);

function runButterflyEffect() {
    if (bfAnimation) cancelAnimationFrame(bfAnimation);

    const w = bfCanvas.width / window.devicePixelRatio;
    const h = bfCanvas.height / window.devicePixelRatio;

    let x1 = 0.1, y1 = 0.0, z1 = 0.0;
    let x2 = 0.1001, y2 = 0.0, z2 = 0.0;

    const pointsA = [];
    const pointsB = [];
    const maxPoints = 2000;
    let frame = 0;

    function step() {
        bfCtx.fillStyle = 'rgba(10, 10, 15, 0.05)';
        bfCtx.fillRect(0, 0, w, h);

        for (let i = 0; i < 5; i++) {
            // Траектория A
            const dx1 = CONFIG.sigma * (y1 - x1) * 0.01;
            const dy1 = (x1 * (CONFIG.rho - z1) - y1) * 0.01;
            const dz1 = (x1 * y1 - CONFIG.beta * z1) * 0.01;
            x1 += dx1; y1 += dy1; z1 += dz1;

            // Траектория B (с разницей 0.0001)
            const dx2 = CONFIG.sigma * (y2 - x2) * 0.01;
            const dy2 = (x2 * (CONFIG.rho - z2) - y2) * 0.01;
            const dz2 = (x2 * y2 - CONFIG.beta * z2) * 0.01;
            x2 += dx2; y2 += dy2; z2 += dz2;

            pointsA.push({ x: x1, y: y1, z: z1 });
            pointsB.push({ x: x2, y: y2, z: z2 });

            if (pointsA.length > maxPoints) {
                pointsA.shift();
                pointsB.shift();
            }
        }

        // Рисуем
        const scale = 3;
        const ox = w / 2;
        const oy = h / 2 + 20;

        // Траектория A
        bfCtx.beginPath();
        bfCtx.strokeStyle = 'rgba(0, 212, 255, 0.6)';
        bfCtx.lineWidth = 1.5;
        for (let i = 0; i < pointsA.length - 1; i++) {
            const p1 = pointsA[i];
            const p2 = pointsA[i + 1];
            bfCtx.moveTo(ox + p1.x * scale, oy - p1.y * scale + p1.z * 0.5);
            bfCtx.lineTo(ox + p2.x * scale, oy - p2.y * scale + p2.z * 0.5);
        }
        bfCtx.stroke();

        // Траектория B
        bfCtx.beginPath();
        bfCtx.strokeStyle = 'rgba(255, 0, 110, 0.6)';
        bfCtx.lineWidth = 1.5;
        for (let i = 0; i < pointsB.length - 1; i++) {
            const p1 = pointsB[i];
            const p2 = pointsB[i + 1];
            bfCtx.moveTo(ox + p1.x * scale, oy - p1.y * scale + p1.z * 0.5);
            bfCtx.lineTo(ox + p2.x * scale, oy - p2.y * scale + p2.z * 0.5);
        }
        bfCtx.stroke();

        // Точки
        if (pointsA.length > 0) {
            const lastA = pointsA[pointsA.length - 1];
            const lastB = pointsB[pointsB.length - 1];

            bfCtx.fillStyle = '#00d4ff';
            bfCtx.beginPath();
            bfCtx.arc(ox + lastA.x * scale, oy - lastA.y * scale + lastA.z * 0.5, 4, 0, Math.PI * 2);
            bfCtx.fill();

            bfCtx.fillStyle = '#ff006e';
            bfCtx.beginPath();
            bfCtx.arc(ox + lastB.x * scale, oy - lastB.y * scale + lastB.z * 0.5, 4, 0, Math.PI * 2);
            bfCtx.fill();

            // Расстояние
            const dist = Math.sqrt(
                (lastA.x - lastB.x)**2 + 
                (lastA.y - lastB.y)**2 + 
                (lastA.z - lastB.z)**2
            );
            document.getElementById('butterflyDistance').textContent = 
                `Расхождение: ${dist.toFixed(4)}`;
        }

        frame++;
        if (frame < 2000) {
            bfAnimation = requestAnimationFrame(step);
        }
    }

    step();
}

document.getElementById('btnButterfly').addEventListener('click', runButterflyEffect);

// ═══════════════════════════════════════════════════════════════
//  СКРЫТЬ ЗАГРУЗКУ
// ═══════════════════════════════════════════════════════════════
setTimeout(() => {
    document.getElementById('loading').style.opacity = '0';
    setTimeout(() => {
        document.getElementById('loading').style.display = 'none';
    }, 800);
}, 1500);

// Старт
animate();
