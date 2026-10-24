// Módulo de Realidad Aumentada (MindAR + A-Frame)
let isRotating = true;
let isPerformingAction = false;
let particlesVisible = true;
let localConfettiInstance = null;
let currentPhotoDataUrl = null;

// Registro de componentes A-Frame
if (typeof AFRAME !== 'undefined' && !AFRAME.components['force-center-mesh']) {
  AFRAME.registerComponent('force-center-mesh', {
    init: function () {
      this.el.addEventListener('model-loaded', () => {
        const obj = this.el.getObject3D('mesh');
        if (!obj) return;
        obj.traverse((child) => {
          if (child.isMesh && child.geometry) {
            child.geometry.computeBoundingBox();
            child.geometry.center();
          }
        });
      });
    }
  });
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

function generateStarsAuraHTML(count = 45) {
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

export async function openARModal() {
  const modal = document.getElementById('ar-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

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

  // Escena con detector automático de ambos objetivos (targetIndex 0 = Bate, targetIndex 1 = Model 1)
  container.innerHTML = `
    <a-scene
      style="transform: scaleX(-1); -webkit-transform: scaleX(-1); width: 100%; height: 100%;"
      embedded
      vr-mode-ui="enabled: false"
      device-orientation-permission-ui="enabled: false"
      mindar-image="imageTargetSrc: ./targets_combined.mind; autoStart: true; uiLoading: no; uiError: no; uiScanning: no; filterMinCF: 0.0001; filterBeta: 0.001;"
      color-space="sRGB"
      renderer="preserveDrawingBuffer: true;">
      
      <a-assets>
        <a-asset-item id="bateModel" src="./bate/bate.glb"></a-asset-item>
        <a-asset-item id="model1Asset" src="./Model1/P1.0.glb"></a-asset-item>
        <a-asset-item id="model2Asset" src="./Model2/P2.glb"></a-asset-item>
        <a-asset-item id="model3Asset" src="./Model3/P3.glb"></a-asset-item>
      </a-assets>

      <a-camera position="0 0 0" look-controls="enabled: false"></a-camera>

      <!-- OBJETIVO 0: BATE DE BÉISBOL -->
      <a-entity id="ar-target-bate" mindar-image-target="targetIndex: 0">
        <a-entity id="bate-anchor" position="0 0 0.05" rotation="0 0 45">
          <a-entity id="bate-rotator" class="ar-rotator" animation="property: rotation; to: 0 0 360; dur: 3000; easing: linear; loop: true">
            <a-gltf-model 
              id="bate-3d-model" 
              src="#bateModel" 
              position="0 0 0" 
              scale="0.14 0.14 0.14"
              force-center-mesh>
            </a-gltf-model>
          </a-entity>
        </a-entity>

        <a-entity id="particles-bate" class="particles-cloud" animation="property: rotation; to: 0 0 360; dur: 50000; easing: linear; loop: true">
          ${generateStarsAuraHTML(35)}
        </a-entity>
      </a-entity>

      <!-- OBJETIVO 1: MODEL 1 (HUMANO) -->
      <a-entity id="ar-target-model1" mindar-image-target="targetIndex: 1">
        <a-entity id="model1-anchor" position="0 0 0.05" rotation="0 0 0">
          <a-entity id="model1-rotator" class="ar-rotator" animation="property: rotation; to: 0 360 0; dur: 3500; easing: linear; loop: true">
            <a-gltf-model 
              id="model1-3d-model" 
              src="#model1Asset" 
              position="0 0 0" 
              scale="0.35 0.35 0.35"
              force-center-mesh>
            </a-gltf-model>
          </a-entity>
        </a-entity>

        <a-entity id="particles-model1" class="particles-cloud" animation="property: rotation; to: 0 0 360; dur: 50000; easing: linear; loop: true">
          ${generateStarsAuraHTML(35)}
        </a-entity>
      </a-entity>

      <!-- OBJETIVO 2: MODEL 2 (HUMANO) -->
      <a-entity id="ar-target-model2" mindar-image-target="targetIndex: 2">
        <a-entity id="model2-anchor" position="0 0 0.05" rotation="0 0 0">
          <a-entity id="model2-rotator" class="ar-rotator" animation="property: rotation; to: 0 360 0; dur: 3500; easing: linear; loop: true">
            <a-gltf-model 
              id="model2-3d-model" 
              src="#model2Asset" 
              position="0 0 0" 
              scale="0.35 0.35 0.35"
              force-center-mesh>
            </a-gltf-model>
          </a-entity>
        </a-entity>

        <a-entity id="particles-model2" class="particles-cloud" animation="property: rotation; to: 0 0 360; dur: 50000; easing: linear; loop: true">
          ${generateStarsAuraHTML(35)}
        </a-entity>
      </a-entity>

      <!-- OBJETIVO 3: MODEL 3 (HUMANO) -->
      <a-entity id="ar-target-model3" mindar-image-target="targetIndex: 3">
        <a-entity id="model3-anchor" position="0 0 0.05" rotation="0 0 0">
          <a-entity id="model3-rotator" class="ar-rotator" animation="property: rotation; to: 0 360 0; dur: 3500; easing: linear; loop: true">
            <a-gltf-model 
              id="model3-3d-model" 
              src="#model3Asset" 
              position="0 0 0" 
              scale="0.35 0.35 0.35"
              force-center-mesh>
            </a-gltf-model>
          </a-entity>
        </a-entity>

        <a-entity id="particles-model3" class="particles-cloud" animation="property: rotation; to: 0 0 360; dur: 50000; easing: linear; loop: true">
          ${generateStarsAuraHTML(35)}
        </a-entity>
      </a-entity>
    </a-scene>

    <canvas id="confetti-canvas" class="absolute inset-0 pointer-events-none w-full h-full z-20"></canvas>
  `;

  const checkVideoInterval = setInterval(() => {
    const mindarVideo = container.querySelector('video') || document.querySelector('video:not(#raw-video)');
    if (mindarVideo) {
      mindarVideo.style.transform = 'scaleX(-1)';
      mindarVideo.style.webkitTransform = 'scaleX(-1)';
      clearInterval(checkVideoInterval);
    }
  }, 100);

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
    const bateRotator = document.getElementById('bate-rotator');
    if (bateRotator) {
      bateRotator.setAttribute('animation', 'property: rotation; to: 0 0 360; dur: 3000; easing: linear; loop: true');
    }
    const model1Rotator = document.getElementById('model1-rotator');
    if (model1Rotator) {
      model1Rotator.setAttribute('animation', 'property: rotation; to: 0 360 0; dur: 3500; easing: linear; loop: true');
    }
    const model2Rotator = document.getElementById('model2-rotator');
    if (model2Rotator) {
      model2Rotator.setAttribute('animation', 'property: rotation; to: 0 360 0; dur: 3500; easing: linear; loop: true');
    }
    const model3Rotator = document.getElementById('model3-rotator');
    if (model3Rotator) {
      model3Rotator.setAttribute('animation', 'property: rotation; to: 0 360 0; dur: 3500; easing: linear; loop: true');
    }

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

  const bateRotator = document.getElementById('bate-rotator');
  const bateAnchor = document.getElementById('bate-anchor');
  const model1Rotator = document.getElementById('model1-rotator');
  const model1Anchor = document.getElementById('model1-anchor');
  const model2Rotator = document.getElementById('model2-rotator');
  const model2Anchor = document.getElementById('model2-anchor');
  const model3Rotator = document.getElementById('model3-rotator');
  const model3Anchor = document.getElementById('model3-anchor');

  isPerformingAction = true;

  // Animación para Bate (Swing)
  if (bateRotator && bateAnchor) {
    bateRotator.removeAttribute('animation');
    bateRotator.setAttribute('rotation', '0 0 0');
    bateAnchor.setAttribute('animation', {
      property: 'rotation',
      to: '0 0 405',
      dur: 1000,
      easing: 'easeInOutQuad'
    });
  }

  // Animación para Model 1 (Salto y giro 3D)
  if (model1Rotator && model1Anchor) {
    model1Rotator.removeAttribute('animation');
    model1Anchor.setAttribute('animation__jump', {
      property: 'position',
      to: '0 0.28 0.05',
      dur: 400,
      dir: 'alternate',
      loop: 2,
      easing: 'easeOutQuad'
    });

    model1Anchor.setAttribute('animation__spin', {
      property: 'rotation',
      to: '0 360 0',
      dur: 800,
      easing: 'easeInOutCubic'
    });
  }

  // Animación para Model 2 (Salto y giro 3D)
  if (model2Rotator && model2Anchor) {
    model2Rotator.removeAttribute('animation');
    model2Anchor.setAttribute('animation__jump', {
      property: 'position',
      to: '0 0.28 0.05',
      dur: 400,
      dir: 'alternate',
      loop: 2,
      easing: 'easeOutQuad'
    });

    model2Anchor.setAttribute('animation__spin', {
      property: 'rotation',
      to: '0 360 0',
      dur: 800,
      easing: 'easeInOutCubic'
    });
  }

  // Animación para Model 3 (Salto y giro 3D)
  if (model3Rotator && model3Anchor) {
    model3Rotator.removeAttribute('animation');
    model3Anchor.setAttribute('animation__jump', {
      property: 'position',
      to: '0 0.28 0.05',
      dur: 400,
      dir: 'alternate',
      loop: 2,
      easing: 'easeOutQuad'
    });

    model3Anchor.setAttribute('animation__spin', {
      property: 'rotation',
      to: '0 360 0',
      dur: 800,
      easing: 'easeInOutCubic'
    });
  }

  setTimeout(() => {
    if (bateAnchor && bateRotator) {
      bateAnchor.removeAttribute('animation');
      bateAnchor.setAttribute('rotation', '0 0 45');
      if (isRotating) {
        bateRotator.setAttribute('animation', 'property: rotation; to: 0 0 360; dur: 3000; easing: linear; loop: true');
      }
    }

    if (model1Anchor && model1Rotator) {
      model1Anchor.removeAttribute('animation__jump');
      model1Anchor.removeAttribute('animation__spin');
      model1Anchor.setAttribute('position', '0 0 0.05');
      model1Anchor.setAttribute('rotation', '0 0 0');
      if (isRotating) {
        model1Rotator.setAttribute('animation', 'property: rotation; to: 0 360 0; dur: 3500; easing: linear; loop: true');
      }
    }

    if (model2Anchor && model2Rotator) {
      model2Anchor.removeAttribute('animation__jump');
      model2Anchor.removeAttribute('animation__spin');
      model2Anchor.setAttribute('position', '0 0 0.05');
      model2Anchor.setAttribute('rotation', '0 0 0');
      if (isRotating) {
        model2Rotator.setAttribute('animation', 'property: rotation; to: 0 360 0; dur: 3500; easing: linear; loop: true');
      }
    }

    if (model3Anchor && model3Rotator) {
      model3Anchor.removeAttribute('animation__jump');
      model3Anchor.removeAttribute('animation__spin');
      model3Anchor.setAttribute('position', '0 0 0.05');
      model3Anchor.setAttribute('rotation', '0 0 0');
      if (isRotating) {
        model3Rotator.setAttribute('animation', 'property: rotation; to: 0 360 0; dur: 3500; easing: linear; loop: true');
      }
    }

    isPerformingAction = false;
  }, 1050);
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
  lucide.createIcons();
}

export function closePhotoPreview() {
  const previewModal = document.getElementById('photo-preview-modal');
  previewModal.classList.add('hidden');
  previewModal.classList.remove('flex');
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