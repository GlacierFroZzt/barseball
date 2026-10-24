// Módulo de Filtros y Procesamiento Canvas de Video
const videoEl = document.getElementById('raw-video');
const canvasEl = document.getElementById('processed-canvas');
const ctxCanvas = canvasEl ? canvasEl.getContext('2d', { willReadFrequently: true }) : null;

let currentFilterMode = 'css';
let filterAnimationLoop = null;
let rainbowHue = 0;

export function togglePlayPause() {
  const btnText = document.getElementById('text-play-pause');
  const btnIcon = document.getElementById('icon-play-pause');

  if (videoEl.paused) {
    videoEl.play();
    btnText.innerText = "Pausar";
    btnIcon.setAttribute('data-lucide', 'pause');
  } else {
    videoEl.pause();
    btnText.innerText = "Reproducir";
    btnIcon.setAttribute('data-lucide', 'play');
  }
  lucide.createIcons();
}

export function changeVolume(val) {
  videoEl.volume = parseFloat(val);
  if (videoEl.volume > 0) {
    videoEl.muted = false;
  }
}

export function resetSliders() {
  document.getElementById('slider-brightness').value = 100;
  document.getElementById('slider-contrast').value = 100;
  document.getElementById('slider-hue').value = 0;
}

export function updateColorAdjustments() {
  switchViewMode('css');
  const b = document.getElementById('slider-brightness').value;
  const c = document.getElementById('slider-contrast').value;
  const h = document.getElementById('slider-hue').value;
  videoEl.style.filter = `brightness(${b}%) contrast(${c}%) hue-rotate(${h}deg)`;
}

export function switchViewMode(mode) {
  currentFilterMode = mode;
  if (filterAnimationLoop) cancelAnimationFrame(filterAnimationLoop);

  if (mode === 'css') {
    videoEl.style.opacity = '1';
    canvasEl.classList.add('hidden');
  } else {
    videoEl.style.opacity = '0';
    canvasEl.classList.remove('hidden');
    renderCanvasFilters();
  }
}

export function applyPreset(preset) {
  videoEl.style.filter = 'none';

  switch (preset) {
    case 'normal':
      resetSliders();
      switchViewMode('css');
      break;

    case 'blur':
      switchViewMode('css');
      videoEl.style.filter = 'blur(6px)';
      break;

    case 'pixel':
      switchViewMode('pixel');
      break;

    case 'thermal':
      switchViewMode('thermal');
      break;

    case 'custom':
      switchViewMode('rainbow');
      break;
  }
}

function getAspectRatioDimensions(srcWidth, srcHeight, maxWidth, maxHeight) {
  const ratio = Math.min(maxWidth / srcWidth, maxHeight / srcHeight);
  return {
    width: srcWidth * ratio,
    height: srcHeight * ratio,
    x: (maxWidth - srcWidth * ratio) / 2,
    y: (maxHeight - srcHeight * ratio) / 2
  };
}

function renderCanvasFilters() {
  if (currentFilterMode === 'css') return;

  const containerW = canvasEl.clientWidth || 400;
  const containerH = canvasEl.clientHeight || 300;

  if (canvasEl.width !== containerW || canvasEl.height !== containerH) {
    canvasEl.width = containerW;
    canvasEl.height = containerH;
  }

  if (videoEl.readyState >= 2 && containerW > 0 && containerH > 0) {
    const vW = videoEl.videoWidth || containerW;
    const vH = videoEl.videoHeight || containerH;
    const fit = getAspectRatioDimensions(vW, vH, containerW, containerH);

    ctxCanvas.clearRect(0, 0, containerW, containerH);

    if (currentFilterMode === 'pixel') {
      const pixelSize = 12;
      const smallW = Math.max(1, Math.floor(fit.width / pixelSize));
      const smallH = Math.max(1, Math.floor(fit.height / pixelSize));

      const offscreen = document.createElement('canvas');
      offscreen.width = smallW;
      offscreen.height = smallH;
      const offCtx = offscreen.getContext('2d');

      offCtx.imageSmoothingEnabled = false;
      offCtx.drawImage(videoEl, 0, 0, smallW, smallH);

      ctxCanvas.imageSmoothingEnabled = false;
      ctxCanvas.drawImage(offscreen, 0, 0, smallW, smallH, fit.x, fit.y, fit.width, fit.height);

    } else if (currentFilterMode === 'thermal') {
      const offscreen = document.createElement('canvas');
      offscreen.width = fit.width;
      offscreen.height = fit.height;
      const offCtx = offscreen.getContext('2d');

      offCtx.drawImage(videoEl, 0, 0, fit.width, fit.height);
      const imgData = offCtx.getImageData(0, 0, fit.width, fit.height);
      const d = imgData.data;

      for (let i = 0; i < d.length; i += 4) {
        const intensity = (d[i] + d[i + 1] + d[i + 2]) / 3;
        if (intensity < 64) {
          d[i] = 0; d[i + 1] = 0; d[i + 2] = intensity * 4;
        } else if (intensity < 128) {
          d[i] = 0; d[i + 1] = (intensity - 64) * 4; d[i + 2] = 255 - (intensity - 64) * 4;
        } else if (intensity < 192) {
          d[i] = (intensity - 128) * 4; d[i + 1] = 255; d[i + 2] = 0;
        } else {
          d[i] = 255; d[i + 1] = 255 - (intensity - 192) * 4; d[i + 2] = (intensity - 192) * 4;
        }
      }

      offCtx.putImageData(imgData, 0, 0);
      ctxCanvas.drawImage(offscreen, fit.x, fit.y);

    } else if (currentFilterMode === 'rainbow') {
      rainbowHue = (rainbowHue + 2) % 360;

      ctxCanvas.save();
      ctxCanvas.filter = `hue-rotate(${rainbowHue}deg) saturate(180%)`;
      ctxCanvas.drawImage(videoEl, fit.x, fit.y, fit.width, fit.height);
      ctxCanvas.restore();
    }
  }

  filterAnimationLoop = requestAnimationFrame(renderCanvasFilters);
}