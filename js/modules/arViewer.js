// Módulo de Realidad Aumentada (MindAR + A-Frame) - 15 Equipos Liga Nacional
export const ASSET_VERSION = '20261025_06';

const STORAGE_KEY_AR_MIRROR = 'barseball_ar_mirrored';
// Por defecto false (sin efecto espejo / vista natural, para lectura de textos y tarjetas)
let isMirrored = typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY_AR_MIRROR) !== null
  ? localStorage.getItem(STORAGE_KEY_AR_MIRROR) === 'true'
  : false;

let isRotating = true;
let isPerformingAction = false;
let particlesVisible = true;
let localConfettiInstance = null;
let currentPhotoDataUrl = null;
let currentDetectedTeam = null;

// Registro de componentes A-Frame
if (typeof AFRAME !== 'undefined' && !AFRAME.components['force-center-mesh']) {
  AFRAME.registerComponent('force-center-mesh', {
    init: function () {
      // Los modelos 3D ya se exportaron de Blender perfectamente centrados en [0, 0, 0].
    }
  });
}

if (typeof AFRAME !== 'undefined' && !AFRAME.components['target-detection-listener']) {
  AFRAME.registerComponent('target-detection-listener', {
    schema: {
      name: { type: 'string' },
      teamId: { type: 'string' },
      slug: { type: 'string' }
    },
    init: function () {
      this.el.addEventListener('targetFound', () => {
        currentDetectedTeam = {
          name: this.data.name,
          teamId: this.data.teamId,
          slug: this.data.slug
        };
        updateDetectedTeamUI(currentDetectedTeam);
      });
      this.el.addEventListener('targetLost', () => {
        const badge = document.getElementById('ar-detection-badge');
        if (badge) {
          badge.classList.add('hidden');
          badge.classList.remove('flex');
        }
      });
    }
  });
}

function updateDetectedTeamUI(team) {
  const badge = document.getElementById('ar-detection-badge');
  const text = document.getElementById('ar-detection-text');
  if (badge && text) {
    text.textContent = 'Detectado: ' + team.name;
    badge.classList.remove('hidden');
    badge.classList.add('flex');
  }

  const btnHistory = document.getElementById('btn-team-history');
  const textHistory = document.getElementById('text-team-history');
  if (textHistory) {
    textHistory.textContent = `Historia (${team.name})`;
  }
  if (btnHistory) {
    btnHistory.classList.add('ring-2', 'ring-white', 'shadow-amber-400/50');
  }
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

if (typeof AFRAME !== 'undefined' && !AFRAME.components['star-particle']) {
  AFRAME.registerComponent('star-particle', {
    schema: {
      color: { type: 'string', default: '#facc15' },
      size: { type: 'number', default: 0.02 }
    },
    init: function () {
      const points = 5;
      const outerRadius = this.data.size;
      const innerRadius = this.data.size * 0.45;
      const shape = new THREE.Shape();

      for (let i = 0; i < points * 2; i++) {
        const r = (i % 2 === 0) ? outerRadius : innerRadius;
        const angle = (i * Math.PI) / points - Math.PI / 2;
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
      }
      shape.closePath();

      const extrudeSettings = {
        depth: this.data.size * 0.25,
        bevelEnabled: true,
        bevelSegments: 1,
        steps: 1,
        bevelSize: this.data.size * 0.08,
        bevelThickness: this.data.size * 0.08
      };

      const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      geometry.center();

      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(this.data.color),
        emissive: new THREE.Color(this.data.color),
        emissiveIntensity: 0.9,
        roughness: 0.2,
        metalness: 0.3,
        transparent: true,
        opacity: 0.95
      });

      const mesh = new THREE.Mesh(geometry, material);
      this.el.setObject3D('mesh', mesh);
    }
  });
}

function generateStarsAuraHTML(count = 35) {
  let html = '';
  const yellowTones = ['#facc15', '#fbbf24', '#fde047', '#f59e0b', '#fef08a'];

  for (let i = 0; i < count; i++) {
    const x = ((Math.random() - 0.5) * 1.6).toFixed(3);
    const y = ((Math.random() - 0.5) * 1.6).toFixed(3);
    const z = (0.02 + Math.random() * 0.55).toFixed(3);

    const size = (0.012 + Math.random() * 0.014).toFixed(3);
    const color = yellowTones[i % yellowTones.length];

    const floatDur = 2200 + Math.floor(Math.random() * 2400);
    const rotDur = 3000 + Math.floor(Math.random() * 4000);
    const pulseDur = 1200 + Math.floor(Math.random() * 1000);
    const offsetY = (parseFloat(y) + (Math.random() * 0.14 - 0.07)).toFixed(3);

    html += `
      <a-entity 
        position="${x} ${y} ${z}"
        star-particle="color: ${color}; size: ${size}"
        animation="property: position; to: ${x} ${offsetY} ${z}; dur: ${floatDur}; dir: alternate; loop: true; easing: easeInOutSine"
        animation__spin="property: rotation; to: 0 0 360; dur: ${rotDur}; loop: true; easing: linear"
        animation__pulse="property: scale; from: 0.8 0.8 0.8; to: 1.25 1.25 1.25; dur: ${pulseDur}; dir: alternate; loop: true; easing: easeInOutQuad">
      </a-entity>
    `;
  }
  return html;
}

// Configuración de los 15 objetivos MindAR (índices 0 al 14 en targets_combined.mind basados en LogosBaseball.mind)
export const AR_TARGETS = [
  { index: 0, slug: 'braves', teamId: '144', name: 'Atlanta Braves', type: 'jersey', modelSrc: './teams/braves/model.glb', scale: '0.66 0.66 0.66', pos: '0 0 0.05', rot: '0 0 0', rotType: 'y' },
  { index: 1, slug: 'brewers', teamId: '158', name: 'Milwaukee Brewers', type: 'jersey', modelSrc: './teams/brewers/model.glb', scale: '0.66 0.66 0.66', pos: '0 0 0.05', rot: '0 0 0', rotType: 'y' },
  { index: 2, slug: 'cardinals', teamId: '138', name: 'St. Louis Cardinals', type: 'helmet', modelSrc: './teams/cardinals/model.glb', scale: '0.38 0.38 0.38', pos: '0 0 0.05', rot: '0 0 0', rotType: 'y' },
  { index: 3, slug: 'cubs', teamId: '112', name: 'Chicago Cubs', type: 'pending', modelSrc: null, scale: '0.4 0.4 0.4', pos: '0 0 0.05', rot: '0 0 0', rotType: 'y' },
  { index: 4, slug: 'diamondbacks', teamId: '109', name: 'Arizona Diamondbacks', type: 'pending', modelSrc: null, scale: '0.4 0.4 0.4', pos: '0 0 0.05', rot: '0 0 0', rotType: 'y' },
  { index: 5, slug: 'dodgers', teamId: '119', name: 'Los Angeles Dodgers', type: 'ball', modelSrc: './teams/dodgers/model.glb', scale: '0.34 0.34 0.34', pos: '0 0 0.05', rot: '0 0 0', rotType: 'y' },
  { index: 6, slug: 'giants', teamId: '137', name: 'San Francisco Giants', type: 'ball', modelSrc: './teams/giants/model.glb', scale: '0.34 0.34 0.34', pos: '0 0 0.05', rot: '0 0 0', rotType: 'y' },
  { index: 7, slug: 'marlins', teamId: '146', name: 'Miami Marlins', type: 'bat', modelSrc: './teams/marlins/model.glb', scale: '0.13 0.13 0.13', pos: '0 0 0.05', rot: '0 0 45', rotType: 'z' },
  { index: 8, slug: 'mets', teamId: '121', name: 'New York Mets', type: 'bat', modelSrc: './teams/mets/model.glb', scale: '0.13 0.13 0.13', pos: '0 0 0.05', rot: '0 0 45', rotType: 'z' },
  { index: 9, slug: 'nationals', teamId: '120', name: 'Washington Nationals', type: 'jersey', modelSrc: './teams/nationals/model.glb', scale: '0.66 0.66 0.66', pos: '0 0 0.05', rot: '0 0 0', rotType: 'y' },
  { index: 10, slug: 'padres', teamId: '135', name: 'San Diego Padres', type: 'ball', modelSrc: './teams/padres/model.glb', scale: '0.34 0.34 0.34', pos: '0 0 0.05', rot: '0 0 0', rotType: 'y' },
  { index: 11, slug: 'phillies', teamId: '143', name: 'Philadelphia Phillies', type: 'bat', modelSrc: './teams/phillies/model.glb', scale: '0.13 0.13 0.13', pos: '0 0 0.05', rot: '0 0 45', rotType: 'z' },
  { index: 12, slug: 'pirates', teamId: '134', name: 'Pittsburgh Pirates', type: 'helmet', modelSrc: './teams/pirates/model.glb', scale: '0.38 0.38 0.38', pos: '0 0 0.05', rot: '0 0 0', rotType: 'y' },
  { index: 13, slug: 'reds', teamId: '113', name: 'Cincinnati Reds', type: 'helmet', modelSrc: './teams/reds/model.glb', scale: '0.38 0.38 0.38', pos: '0 0 0.05', rot: '0 0 0', rotType: 'y' },
  { index: 14, slug: 'rockies', teamId: '115', name: 'Colorado Rockies', type: 'pending', modelSrc: null, scale: '0.4 0.4 0.4', pos: '0 0 0.05', rot: '0 0 0', rotType: 'y' }
];

export async function openARModal() {
  const modal = document.getElementById('ar-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  currentDetectedTeam = null;
  const btnHistory = document.getElementById('btn-team-history');
  const textHistory = document.getElementById('text-team-history');
  if (textHistory) textHistory.textContent = "Ver Historia";
  if (btnHistory) btnHistory.classList.remove('ring-2', 'ring-white', 'shadow-amber-400/50');

  // Detener y limpiar cámaras o escenas previas para evitar NotReadableError
  const oldScene = document.querySelector('a-scene');
  if (oldScene && oldScene.systems && oldScene.systems['mindar-image-system']) {
    try {
      oldScene.systems['mindar-image-system'].stop();
    } catch (e) {}
  }

  const orphanedVideos = document.querySelectorAll('video:not(#raw-video)');
  orphanedVideos.forEach(v => {
    try {
      if (v.srcObject) {
        v.srcObject.getTracks().forEach(track => track.stop());
      }
      v.remove();
    } catch (e) {}
  });

  const container = document.getElementById('ar-container');
  if (!container) return;
  container.innerHTML = '';

  isRotating = true;
  particlesVisible = true;
  updateRotateButtonUI(true);

  // Generar entidades para los 15 objetivos
  const entitiesHTML = AR_TARGETS.map(t => {
    const isZRot = t.rotType === 'z';
    const rotTo = isZRot ? '0 0 360' : '0 360 0';
    const rotDur = isZRot ? 3000 : 3600;

    let contentHTML = '';
    if (t.modelSrc) {
      contentHTML = `
        <a-gltf-model 
          id="model-${t.slug}" 
          src="${t.modelSrc}?v=${ASSET_VERSION}" 
          position="0 0 0" 
          scale="${t.scale}">
        </a-gltf-model>
      `;
    } else {
      // Indicador holográfico para los 3 equipos pendientes
      contentHTML = `
        <a-entity position="0 0 0">
          <a-ring radius-inner="0.22" radius-outer="0.25" material="color: #38bdf8; side: double; emissive: #0284c7; emissiveIntensity: 0.8" rotation="0 0 0"></a-ring>
          <a-ring radius-inner="0.14" radius-outer="0.16" material="color: #facc15; side: double; emissive: #eab308; emissiveIntensity: 0.8" rotation="0 0 45"></a-ring>
          <a-text value="${t.name}\n[ 3D PROXIMAMENTE ]" align="center" position="0 0 0.05" scale="0.32 0.32 0.32" color="#ffffff"></a-text>
        </a-entity>
      `;
    }

    return `
      <!-- OBJETIVO ${t.index}: ${t.name} -->
      <a-entity id="ar-target-${t.slug}" mindar-image-target="targetIndex: ${t.index}" target-detection-listener="name: ${t.name}; teamId: ${t.teamId}; slug: ${t.slug}">
        <a-entity id="anchor-${t.slug}" class="ar-anchor" data-rot-type="${t.rotType}" position="${t.pos}" rotation="${t.rot}">
          <a-entity id="rotator-${t.slug}" class="ar-rotator" data-rot-to="${rotTo}" data-rot-dur="${rotDur}" animation="property: rotation; to: ${rotTo}; dur: ${rotDur}; easing: linear; loop: true">
            ${contentHTML}
          </a-entity>
        </a-entity>

        <a-entity id="particles-${t.slug}" class="particles-cloud" animation="property: rotation; to: 0 0 360; dur: 50000; easing: linear; loop: true">
          ${generateStarsAuraHTML(32)}
        </a-entity>
      </a-entity>
    `;
  }).join('\n');

  container.innerHTML = `
    <!-- BADGE DE DETECCIÓN EN VIVO INTERACTIVO -->
    <div id="ar-detection-badge" class="absolute top-20 sm:top-24 left-1/2 -translate-x-1/2 bg-slate-900/95 text-white border border-emerald-500/50 px-4 py-2 rounded-full text-xs font-bold shadow-2xl hidden z-30 pointer-events-auto items-center gap-2.5 backdrop-blur-md cursor-pointer hover:bg-slate-800 transition" onclick="window.viewDetectedTeamHistory()">
      <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
      <span id="ar-detection-text"></span>
      <span class="bg-orange-500 text-slate-950 text-[10px] px-2 py-0.5 rounded-full font-black ml-1 flex items-center gap-1">
        <span>Historia</span>
        <i data-lucide="chevron-right" class="w-3 h-3"></i>
      </span>
    </div>

    <a-scene
      style="transform: ${isMirrored ? 'scaleX(-1)' : 'none'}; -webkit-transform: ${isMirrored ? 'scaleX(-1)' : 'none'}; width: 100%; height: 100%;"
      embedded
      vr-mode-ui="enabled: false"
      device-orientation-permission-ui="enabled: false"
      mindar-image="imageTargetSrc: ./targets_combined.mind?v=${ASSET_VERSION}; autoStart: true; uiLoading: no; uiError: no; uiScanning: no;"
      color-space="sRGB"
      renderer="preserveDrawingBuffer: true;">

      <a-camera position="0 0 0" look-controls="enabled: false"></a-camera>

      ${entitiesHTML}
    </a-scene>

    <canvas id="confetti-canvas" class="absolute inset-0 pointer-events-none w-full h-full z-20"></canvas>
  `;

  const checkVideoInterval = setInterval(() => {
    const mindarVideo = container.querySelector('video') || document.querySelector('video:not(#raw-video)');
    if (mindarVideo) {
      applyMirroringTransforms();
      clearInterval(checkVideoInterval);
    }
  }, 100);

  updateMirrorButtonUI();

  const confettiCanvas = document.getElementById('confetti-canvas');
  if (confettiCanvas && typeof confetti !== 'undefined') {
    localConfettiInstance = confetti.create(confettiCanvas, {
      resize: true,
      useWorker: true
    });
  }

  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

export function closeARModal() {
  const modal = document.getElementById('ar-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }

  const scene = document.querySelector('a-scene');
  if (scene && scene.systems && scene.systems['mindar-image-system']) {
    try {
      scene.systems['mindar-image-system'].stop();
    } catch(e) {}
  }

  const orphanedVideos = document.querySelectorAll('video:not(#raw-video)');
  orphanedVideos.forEach(v => {
    try {
      if (v.srcObject) {
        v.srcObject.getTracks().forEach(track => track.stop());
      }
      v.remove();
    } catch(e) {}
  });

  const container = document.getElementById('ar-container');
  if (container) {
    container.innerHTML = '';
  }
  localConfettiInstance = null;
}

export function toggleARRotation() {
  const rotators = document.querySelectorAll('.ar-rotator');
  if (rotators.length === 0) return;

  if (isRotating) {
    rotators.forEach(r => r.removeAttribute('animation'));
    isRotating = false;
    updateRotateButtonUI(false);
  } else {
    rotators.forEach(r => {
      const rotTo = r.getAttribute('data-rot-to') || '0 360 0';
      const rotDur = r.getAttribute('data-rot-dur') || '3500';
      r.setAttribute('animation', `property: rotation; to: ${rotTo}; dur: ${rotDur}; easing: linear; loop: true`);
    });
    isRotating = true;
    updateRotateButtonUI(true);
  }
}

function updateRotateButtonUI(rotating) {
  const text = document.getElementById('text-toggle-rotate');
  const icon = document.getElementById('icon-toggle-rotate');
  if (!text || !icon) return;

  if (rotating) {
    text.innerText = "Pausar Rotación";
    icon.setAttribute('data-lucide', 'pause');
  } else {
    text.innerText = "Reanudar Rotación";
    icon.setAttribute('data-lucide', 'play');
  }
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

export function toggleParticles() {
  const clouds = document.querySelectorAll('.particles-cloud');
  particlesVisible = !particlesVisible;
  clouds.forEach(cloud => {
    cloud.setAttribute('visible', particlesVisible);
  });
}

export function arCustomAction() {
  if (isPerformingAction) return;
  isPerformingAction = true;

  const anchors = document.querySelectorAll('.ar-anchor');
  const rotators = document.querySelectorAll('.ar-rotator');

  rotators.forEach(r => r.removeAttribute('animation'));

  anchors.forEach(a => {
    const rotType = a.getAttribute('data-rot-type');
    if (rotType === 'z') {
      a.setAttribute('animation__swing', {
        property: 'rotation',
        to: '0 0 405',
        dur: 900,
        easing: 'easeInOutQuad'
      });
    } else {
      a.setAttribute('animation__jump', {
        property: 'position',
        to: '0 0.28 0.05',
        dur: 400,
        dir: 'alternate',
        loop: 2,
        easing: 'easeOutQuad'
      });
      a.setAttribute('animation__spin', {
        property: 'rotation',
        to: '0 360 0',
        dur: 800,
        easing: 'easeInOutCubic'
      });
    }
  });

  setTimeout(() => {
    anchors.forEach(a => {
      a.removeAttribute('animation__swing');
      a.removeAttribute('animation__jump');
      a.removeAttribute('animation__spin');
      const rotType = a.getAttribute('data-rot-type');
      a.setAttribute('position', '0 0 0.05');
      a.setAttribute('rotation', rotType === 'z' ? '0 0 45' : '0 0 0');
    });

    if (isRotating) {
      rotators.forEach(r => {
        const rotTo = r.getAttribute('data-rot-to') || '0 360 0';
        const rotDur = r.getAttribute('data-rot-dur') || '3500';
        r.setAttribute('animation', `property: rotation; to: ${rotTo}; dur: ${rotDur}; easing: linear; loop: true`);
      });
    }
    isPerformingAction = false;
  }, 1000);
}

export const arJumpAction = arCustomAction;

export function arConfettiAction() {
  const fire = localConfettiInstance || (typeof confetti !== 'undefined' ? confetti : null);
  if (!fire) return;

  fire({
    particleCount: 55,
    angle: 60,
    spread: 60,
    origin: { x: 0.15, y: 0.85 },
    colors: ['#f97316', '#e11d48', '#fbbf24', '#10b981', '#ec4899', '#ff0055']
  });

  fire({
    particleCount: 55,
    angle: 120,
    spread: 60,
    origin: { x: 0.85, y: 0.85 },
    colors: ['#f97316', '#e11d48', '#fbbf24', '#10b981', '#ec4899', '#ff0055']
  });
}

export function arTakePhotoAction() {
  const container = document.getElementById('ar-container');
  const video = container.querySelector('video');
  const aScene = container.querySelector('a-scene');

  if (!video || !aScene) {
    alert("La cámara aún no está lista.");
    return;
  }

  if (aScene.render) {
    aScene.render();
  } else if (aScene.renderer && aScene.camera) {
    aScene.renderer.render(aScene.object3D, aScene.camera);
  }

  const aCanvas = aScene.querySelector('canvas') || aScene.canvas;
  if (!aCanvas) {
    alert("Esperando renderizado 3D...");
    return;
  }

  const targetW = aCanvas.width || container.clientWidth || 1280;
  const targetH = aCanvas.height || container.clientHeight || 720;

  const captureCanvas = document.createElement('canvas');
  captureCanvas.width = targetW;
  captureCanvas.height = targetH;
  const ctx = captureCanvas.getContext('2d');

  const vW = video.videoWidth || targetW;
  const vH = video.videoHeight || targetH;
  const vRatio = vW / vH;
  const targetRatio = targetW / targetH;
  let sW, sH, sX, sY;

  if (vRatio > targetRatio) {
    sH = vH;
    sW = vH * targetRatio;
    sX = (vW - sW) / 2;
    sY = 0;
  } else {
    sW = vW;
    sH = vW / targetRatio;
    sX = 0;
    sY = (vH - sH) / 2;
  }

  if (isMirrored) {
    ctx.save();
    ctx.translate(targetW, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, sX, sY, sW, sH, 0, 0, targetW, targetH);
    ctx.restore();

    ctx.save();
    ctx.translate(targetW, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(aCanvas, 0, 0, targetW, targetH);
    ctx.restore();
  } else {
    ctx.drawImage(video, sX, sY, sW, sH, 0, 0, targetW, targetH);
    ctx.drawImage(aCanvas, 0, 0, targetW, targetH);
  }

  const confettiCanvas = document.getElementById('confetti-canvas');
  if (confettiCanvas && confettiCanvas.width > 0 && confettiCanvas.height > 0) {
    ctx.drawImage(confettiCanvas, 0, 0, targetW, targetH);
  }

  currentPhotoDataUrl = captureCanvas.toDataURL('image/png');
  const previewImg = document.getElementById('photo-preview-img');
  const previewModal = document.getElementById('photo-preview-modal');

  previewImg.src = currentPhotoDataUrl;
  previewModal.classList.remove('hidden');
  previewModal.classList.add('flex');
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

export function closePhotoPreview() {
  const previewModal = document.getElementById('photo-preview-modal');
  if (previewModal) {
    previewModal.classList.add('hidden');
    previewModal.classList.remove('flex');
  }
}

export function downloadCapturedPhoto() {
  if (!currentPhotoDataUrl) return;

  const link = document.createElement('a');
  link.download = `bARseball-captura-${Date.now()}.png`;
  link.href = currentPhotoDataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Modal para Visualizar y Descargar las 15 Tarjetas (1280x720)
export function openTargetsModal() {
  const modal = document.getElementById('targets-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    renderTargetsGallery();
  }
}

export function closeTargetsModal() {
  const modal = document.getElementById('targets-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

export function renderTargetsGallery() {
  const grid = document.getElementById('targets-gallery-grid');
  if (!grid) return;

  grid.innerHTML = AR_TARGETS.map(t => {
    const is3DActive = !!t.modelSrc;
    let badgeText = '';
    let badgeColor = '';

    if (t.type === 'jersey') {
      badgeText = 'Jersey 3D';
      badgeColor = 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    } else if (t.type === 'bat') {
      badgeText = 'Bate 3D';
      badgeColor = 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    } else if (t.type === 'helmet') {
      badgeText = 'Casco 3D';
      badgeColor = 'bg-rose-500/20 text-rose-400 border-rose-500/30';
    } else if (t.type === 'ball') {
      badgeText = 'Pelota 3D';
      badgeColor = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    } else {
      badgeText = '3D Próximamente';
      badgeColor = 'bg-slate-700/50 text-slate-400 border-slate-600';
    }

    return `
      <div class="bg-slate-900 border border-slate-800 hover:border-orange-500/50 rounded-2xl overflow-hidden p-3 transition flex flex-col group">
        <div class="relative w-full aspect-[16/9] rounded-xl overflow-hidden bg-slate-950 mb-2.5 cursor-pointer" onclick="window.viewTargetCardFullscreen('./targets_1280x720/${t.slug}_1280x720.png', '${t.name}')">
          <img src="./targets_1280x720/${t.slug}_1280x720.png" alt="${t.name}" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">
          <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
            <span class="bg-slate-950/90 text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-white/20 flex items-center gap-1.5">
              <i data-lucide="maximize" class="w-3.5 h-3.5"></i>
              <span>Ver Completa</span>
            </span>
          </div>
        </div>

        <div class="flex items-center justify-between gap-2 mt-auto">
          <div>
            <div class="text-xs font-black text-slate-100 truncate">${t.name}</div>
            <span class="text-[10px] uppercase font-bold border px-1.5 py-0.5 rounded-md inline-block mt-1 ${badgeColor}">
              ${badgeText}
            </span>
          </div>
          <div class="flex items-center gap-1.5">
            <button onclick="window.openTeamModal('${t.teamId}')" class="p-2 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-300 rounded-xl transition" title="Ver Historia de ${t.name}">
              <i data-lucide="book-open" class="w-4 h-4"></i>
            </button>
            <a href="./targets_1280x720/${t.slug}_1280x720.png" download="${t.slug}_target_1280x720.png" class="p-2 bg-slate-800 hover:bg-orange-500 hover:text-slate-950 text-slate-300 rounded-xl transition" title="Descargar 1280x720 PNG">
              <i data-lucide="download" class="w-4 h-4"></i>
            </a>
          </div>
        </div>
      </div>
    `;
  }).join('');

  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

// Visualizador de historia del equipo detectado en AR
export function viewDetectedTeamHistory() {
  if (currentDetectedTeam && currentDetectedTeam.teamId) {
    if (typeof window.openTeamModal === 'function') {
      window.openTeamModal(currentDetectedTeam.teamId);
    }
  } else {
    alert("¡Apunta la cámara a una tarjeta de equipo para ver su historia en tiempo real!");
  }
}

// Alternar pantalla completa real en el Visor AR
export function toggleARFullscreen() {
  const modal = document.getElementById('ar-modal');
  const icon = document.getElementById('icon-ar-fullscreen');
  if (!document.fullscreenElement) {
    if (modal && modal.requestFullscreen) {
      modal.requestFullscreen().catch(err => {
        console.warn('Error al activar pantalla completa:', err);
      });
    } else if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
    if (icon) icon.setAttribute('data-lucide', 'minimize');
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen().catch(err => {
        console.warn('Error al salir de pantalla completa:', err);
      });
    }
    if (icon) icon.setAttribute('data-lucide', 'maximize');
  }
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

// Alternar modo espejo (invertir horizontalmente o vista natural)
export function toggleARMirroring() {
  isMirrored = !isMirrored;
  try {
    localStorage.setItem(STORAGE_KEY_AR_MIRROR, isMirrored ? 'true' : 'false');
  } catch (e) {}
  applyMirroringTransforms();
}

// Aplicar transformaciones CSS de espejeado en vivo
export function applyMirroringTransforms() {
  const container = document.getElementById('ar-container');
  const transformVal = isMirrored ? 'scaleX(-1)' : 'none';

  if (container) {
    const scene = container.querySelector('a-scene');
    if (scene) {
      scene.style.transform = transformVal;
      scene.style.webkitTransform = transformVal;
    }
  }

  const videos = document.querySelectorAll('video:not(#raw-video)');
  videos.forEach(v => {
    v.style.transform = transformVal;
    v.style.webkitTransform = transformVal;
  });

  updateMirrorButtonUI();
}

// Actualizar textos, colores e iconos del botón de espejo
export function updateMirrorButtonUI() {
  const text = document.getElementById('text-toggle-mirror');
  const icon = document.getElementById('icon-toggle-mirror');
  const btn = document.getElementById('btn-toggle-mirror');

  if (text) {
    text.textContent = isMirrored ? 'Espejo: Sí' : 'Espejo: No';
  }
  if (btn) {
    if (isMirrored) {
      btn.classList.add('border-cyan-500/60', 'text-cyan-300');
      btn.classList.remove('border-white/20', 'text-slate-300');
      btn.setAttribute('title', 'Modo espejo activado (haz clic para no espejear / vista normal)');
    } else {
      btn.classList.remove('border-cyan-500/60', 'text-cyan-300');
      btn.classList.add('border-white/20', 'text-slate-300');
      btn.setAttribute('title', 'Modo espejo desactivado (haz clic para activar espejo)');
    }
  }
  if (icon) {
    icon.setAttribute('data-lucide', 'flip-horizontal');
    if (isMirrored) {
      icon.classList.add('text-cyan-400');
      icon.classList.remove('text-slate-400');
    } else {
      icon.classList.remove('text-cyan-400');
      icon.classList.add('text-slate-400');
    }
  }
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('fullscreenchange', () => {
    const icon = document.getElementById('icon-ar-fullscreen');
    if (!icon) return;
    if (document.fullscreenElement) {
      icon.setAttribute('data-lucide', 'minimize');
    } else {
      icon.setAttribute('data-lucide', 'maximize');
    }
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  });
}

window.viewTargetCardFullscreen = function(imgSrc, title) {
  const viewer = document.getElementById('single-card-viewer');
  const img = document.getElementById('single-card-img');
  const nameEl = document.getElementById('single-card-title');
  if (viewer && img) {
    img.src = imgSrc;
    if (nameEl) nameEl.innerText = title;
    viewer.classList.remove('hidden');
    viewer.classList.add('flex');
  }
};

window.closeSingleCardViewer = function() {
  const viewer = document.getElementById('single-card-viewer');
  if (viewer) {
    viewer.classList.add('hidden');
    viewer.classList.remove('flex');
  }
};
