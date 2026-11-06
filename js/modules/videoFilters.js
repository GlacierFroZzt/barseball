// Módulo de Filtros y Procesamiento Canvas de Video con Grabación y Exportación
import { saveGalleryItem } from './galleryStorage.js';
import { showToastNotification } from './store.js';

const videoEl = document.getElementById('raw-video');
const canvasEl = document.getElementById('processed-canvas');
const ctxCanvas = canvasEl ? canvasEl.getContext('2d', { willReadFrequently: true }) : null;

let currentFilterMode = 'css';
let currentPresetName = 'normal';
let filterAnimationLoop = null;
let rainbowHue = 0;

// Estado de grabación de video
let isRecording = false;
let mediaRecorder = null;
let recordedChunks = [];
let recordingTimerInterval = null;
let recordingSeconds = 0;
let recordingCanvas = null;
let recordingCtx = null;
let recordingAnimLoop = null;
let quickClipTimeout = null;
let currentRecordedVideoUrl = null;

// Lienzos temporales para efectos
let offscreenPixelCanvas = null;
let offscreenThermalCanvas = null;

export function togglePlayPause() {
  const btnText = document.getElementById('text-play-pause');
  const btnIcon = document.getElementById('icon-play-pause');

  if (videoEl.paused) {
    videoEl.play();
    if (btnText) btnText.innerText = "Pausar";
    if (btnIcon) btnIcon.setAttribute('data-lucide', 'pause');
  } else {
    videoEl.pause();
    if (btnText) btnText.innerText = "Reproducir";
    if (btnIcon) btnIcon.setAttribute('data-lucide', 'play');
  }
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

export function changeVolume(val) {
  videoEl.volume = parseFloat(val);
  if (videoEl.volume > 0) {
    videoEl.muted = false;
  }
}

export function resetSliders() {
  const b = document.getElementById('slider-brightness');
  const c = document.getElementById('slider-contrast');
  const h = document.getElementById('slider-hue');
  if (b) b.value = 100;
  if (c) c.value = 100;
  if (h) h.value = 0;
}

export function updateColorAdjustments() {
  currentPresetName = 'custom_color';
  switchViewMode('css');
  const b = document.getElementById('slider-brightness')?.value || 100;
  const c = document.getElementById('slider-contrast')?.value || 100;
  const h = document.getElementById('slider-hue')?.value || 0;
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
  currentPresetName = preset;
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

// ---------------------------------------------------------------------
// FUNCIÓN 1: GRABAR Y GUARDAR VIDEOS CON LOS FILTROS APLICADOS
// ---------------------------------------------------------------------

/**
 * Dibuja un fotograma completo en el lienzo de grabación con el filtro actual
 */
function drawFrameToCanvas(ctx, targetW, targetH) {
  if (videoEl.readyState < 2) return;

  ctx.clearRect(0, 0, targetW, targetH);

  if (currentFilterMode === 'css') {
    ctx.save();
    ctx.filter = videoEl.style.filter || 'none';
    ctx.drawImage(videoEl, 0, 0, targetW, targetH);
    ctx.restore();
  } else if (currentFilterMode === 'pixel') {
    const pixelSize = Math.max(8, Math.floor(targetW / 40));
    const smallW = Math.max(1, Math.floor(targetW / pixelSize));
    const smallH = Math.max(1, Math.floor(targetH / pixelSize));

    if (!offscreenPixelCanvas) offscreenPixelCanvas = document.createElement('canvas');
    if (offscreenPixelCanvas.width !== smallW || offscreenPixelCanvas.height !== smallH) {
      offscreenPixelCanvas.width = smallW;
      offscreenPixelCanvas.height = smallH;
    }
    const offCtx = offscreenPixelCanvas.getContext('2d');
    offCtx.imageSmoothingEnabled = false;
    offCtx.drawImage(videoEl, 0, 0, smallW, smallH);

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(offscreenPixelCanvas, 0, 0, smallW, smallH, 0, 0, targetW, targetH);

  } else if (currentFilterMode === 'thermal') {
    if (!offscreenThermalCanvas) offscreenThermalCanvas = document.createElement('canvas');
    if (offscreenThermalCanvas.width !== targetW || offscreenThermalCanvas.height !== targetH) {
      offscreenThermalCanvas.width = targetW;
      offscreenThermalCanvas.height = targetH;
    }
    const offCtx = offscreenThermalCanvas.getContext('2d', { willReadFrequently: true });
    offCtx.drawImage(videoEl, 0, 0, targetW, targetH);

    const imgData = offCtx.getImageData(0, 0, targetW, targetH);
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
    ctx.drawImage(offscreenThermalCanvas, 0, 0);

  } else if (currentFilterMode === 'rainbow') {
    rainbowHue = (rainbowHue + 2) % 360;
    ctx.save();
    ctx.filter = `hue-rotate(${rainbowHue}deg) saturate(180%)`;
    ctx.drawImage(videoEl, 0, 0, targetW, targetH);
    ctx.restore();
  }
}

/**
 * Obtiene el nombre legible del filtro actual
 */
export function getCurrentFilterDisplayName() {
  switch (currentPresetName) {
    case 'blur': return 'Desenfoque';
    case 'pixel': return 'Pixelados';
    case 'thermal': return 'Cámara Térmica';
    case 'custom': return 'Arcoíris (Ciclo)';
    case 'custom_color': return 'Ajuste de Color';
    case 'normal':
    default:
      if (videoEl && videoEl.style.filter && videoEl.style.filter !== 'none') {
        return 'Personalizado';
      }
      return 'Sin Filtro';
  }
}

/**
 * Inicia o detiene la grabación del video editado
 */
export function toggleVideoRecording() {
  if (isRecording) {
    stopVideoRecording();
  } else {
    startVideoRecording();
  }
}

/**
 * Inicia la grabación del video con filtros
 */
export function startVideoRecording() {
  if (typeof window.MediaRecorder === 'undefined') {
    alert("Tu navegador no soporta grabación directa de video con MediaRecorder. Puedes usar la función 'Capturar Foto' para guardar imágenes filtradas.");
    return;
  }

  // Si el video está pausado, lo reproducimos para que la grabación capture movimiento
  if (videoEl.paused) {
    videoEl.play();
    const btnText = document.getElementById('text-play-pause');
    const btnIcon = document.getElementById('icon-play-pause');
    if (btnText) btnText.innerText = "Pausar";
    if (btnIcon) btnIcon.setAttribute('data-lucide', 'pause');
  }

  // Dimensiones del lienzo de grabación (calidad nativa del video o 1280x720)
  const targetW = videoEl.videoWidth || 1280;
  const targetH = videoEl.videoHeight || 720;

  recordingCanvas = document.createElement('canvas');
  recordingCanvas.width = targetW;
  recordingCanvas.height = targetH;
  recordingCtx = recordingCanvas.getContext('2d', { willReadFrequently: true });

  // Bucle de renderizado para alimentar el stream de grabación
  const renderRecordingFrame = () => {
    if (isRecording) {
      drawFrameToCanvas(recordingCtx, targetW, targetH);
      recordingAnimLoop = requestAnimationFrame(renderRecordingFrame);
    }
  };

  // Capturar stream a 30 FPS
  const stream = recordingCanvas.captureStream(30);

  // Intentar capturar audio si está disponible
  try {
    const audioStream = videoEl.captureStream ? videoEl.captureStream() : (videoEl.mozCaptureStream ? videoEl.mozCaptureStream() : null);
    if (audioStream) {
      const audioTracks = audioStream.getAudioTracks();
      if (audioTracks && audioTracks.length > 0) {
        stream.addTrack(audioTracks[0]);
      }
    }
  } catch (e) {
    console.warn('Audio no disponible para captura de video:', e);
  }

  // Seleccionar codec soportado
  const supportedTypes = [
    'video/mp4;codecs=avc1',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm'
  ];
  const mimeType = supportedTypes.find(type => MediaRecorder.isTypeSupported(type)) || '';

  try {
    mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
  } catch (err) {
    console.error("Error al instanciar MediaRecorder:", err);
    alert("No se pudo iniciar la grabadora de video en este dispositivo.");
    return;
  }

  recordedChunks = [];
  mediaRecorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      recordedChunks.push(event.data);
    }
  };

  mediaRecorder.onstop = handleRecordingComplete;

  isRecording = true;
  recordingSeconds = 0;
  renderRecordingFrame();
  mediaRecorder.start(250);

  updateRecordingUI(true);

  // Contador de segundos
  recordingTimerInterval = setInterval(() => {
    recordingSeconds++;
    updateRecordingTimerUI();

    // Límite máximo de seguridad: 60 segundos
    if (recordingSeconds >= 60) {
      stopVideoRecording();
      showToastNotification('Límite de grabación alcanzado (60s). Guardando...', 'info');
    }
  }, 1000);

  showToastNotification('🔴 Grabando video con filtros aplicados...', 'info');
}

/**
 * Detiene la grabación
 */
export function stopVideoRecording() {
  if (!isRecording) return;
  isRecording = false;

  if (quickClipTimeout) {
    clearTimeout(quickClipTimeout);
    quickClipTimeout = null;
  }

  if (recordingTimerInterval) {
    clearInterval(recordingTimerInterval);
    recordingTimerInterval = null;
  }

  if (recordingAnimLoop) {
    cancelAnimationFrame(recordingAnimLoop);
    recordingAnimLoop = null;
  }

  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }

  updateRecordingUI(false);
}

/**
 * Procesa la finalización de la grabación: descarga y guarda en la Galería
 */
async function handleRecordingComplete() {
  const mimeType = mediaRecorder.mimeType || 'video/webm';
  const isMp4 = mimeType.includes('mp4');
  const ext = isMp4 ? 'mp4' : 'webm';
  const fileName = `bARseball-video-editado-${Date.now()}.${ext}`;

  const blob = new Blob(recordedChunks, { type: mimeType });
  const downloadUrl = URL.createObjectURL(blob);
  currentRecordedVideoUrl = downloadUrl;

  // 1. Descarga automática al dispositivo
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // 2. Guardar en la Galería (IndexedDB)
  const filterDisplayName = getCurrentFilterDisplayName();
  try {
    await saveGalleryItem({
      type: 'video',
      blob: blob,
      title: `Video con Filtro: ${filterDisplayName}`,
      metadata: {
        filter: currentFilterMode,
        filterName: filterDisplayName,
        duration: recordingSeconds,
        mimeType: mimeType
      }
    });

    showToastNotification(`🎬 ¡Video guardado en tu Galería y descargado!`, 'success');
  } catch (err) {
    console.error("Error guardando video en la galería:", err);
  }

  // 3. Abrir modal con vista previa del video guardado
  showVideoSavedModal(downloadUrl, fileName, filterDisplayName, recordingSeconds);
}

/**
 * Graba un clip rápido de N segundos automáticamente
 */
export function recordQuickClip(seconds = 5) {
  if (isRecording) {
    stopVideoRecording();
    return;
  }

  startVideoRecording();
  showToastNotification(`⏱️ Grabando clip de ${seconds} segundos...`, 'info');

  quickClipTimeout = setTimeout(() => {
    if (isRecording) {
      stopVideoRecording();
    }
  }, seconds * 1000);
}

/**
 * Captura una foto instantánea del fotograma actual del video con filtros
 */
export async function captureVideoSnapshot() {
  const targetW = videoEl.videoWidth || 1280;
  const targetH = videoEl.videoHeight || 720;

  const snapCanvas = document.createElement('canvas');
  snapCanvas.width = targetW;
  snapCanvas.height = targetH;
  const snapCtx = snapCanvas.getContext('2d', { willReadFrequently: true });

  drawFrameToCanvas(snapCtx, targetW, targetH);

  const dataUrl = snapCanvas.toDataURL('image/png');
  const filterDisplayName = getCurrentFilterDisplayName();
  const fileName = `bARseball-captura-video-${Date.now()}.png`;

  // Descarga directa
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // Guardar en Galería
  snapCanvas.toBlob(async (blob) => {
    try {
      await saveGalleryItem({
        type: 'photo',
        dataUrl: dataUrl,
        blob: blob,
        title: `Captura de Video: ${filterDisplayName}`,
        metadata: {
          source: 'video_filter',
          filterName: filterDisplayName
        }
      });
      showToastNotification(`📸 ¡Captura con filtro guardada en Galería y descargada!`, 'success');
    } catch (e) {
      console.warn('Error al guardar captura de video en galería:', e);
    }
  }, 'image/png');
}

/**
 * Actualiza la UI de los botones e indicador de grabación
 */
function updateRecordingUI(recording) {
  const btn = document.getElementById('btn-record-video');
  const text = document.getElementById('text-record-video');
  const icon = document.getElementById('icon-record-video');
  const indicator = document.getElementById('video-recording-indicator');

  if (recording) {
    if (btn) {
      btn.classList.add('bg-rose-700', 'animate-pulse', 'border', 'border-white/40');
      btn.classList.remove('bg-red-600', 'hover:bg-red-500');
    }
    if (text) text.textContent = "Detener y Guardar (00:00)";
    if (icon) icon.setAttribute('data-lucide', 'square');
    if (indicator) {
      indicator.classList.remove('hidden');
      indicator.classList.add('flex');
    }
  } else {
    if (btn) {
      btn.classList.remove('bg-rose-700', 'animate-pulse', 'border', 'border-white/40');
      btn.classList.add('bg-red-600', 'hover:bg-red-500');
    }
    if (text) text.textContent = "Grabar Video con Filtros";
    if (icon) icon.setAttribute('data-lucide', 'video');
    if (indicator) {
      indicator.classList.add('hidden');
      indicator.classList.remove('flex');
    }
  }

  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

/**
 * Actualiza el segundero mientras graba
 */
function updateRecordingTimerUI() {
  const mins = Math.floor(recordingSeconds / 60).toString().padStart(2, '0');
  const secs = (recordingSeconds % 60).toString().padStart(2, '0');
  const formatted = `${mins}:${secs}`;

  const text = document.getElementById('text-record-video');
  const timerBadge = document.getElementById('recording-timer-text');

  if (text) text.textContent = `Detener y Guardar (${formatted})`;
  if (timerBadge) timerBadge.textContent = formatted;
}

/**
 * Muestra el modal con la vista previa del video recién grabado
 */
function showVideoSavedModal(videoUrl, fileName, filterName, duration) {
  const modal = document.getElementById('video-saved-modal');
  const player = document.getElementById('video-saved-player');
  const infoEl = document.getElementById('video-saved-info');

  if (!modal || !player) return;

  player.src = videoUrl;
  if (infoEl) {
    infoEl.innerHTML = `
      <span>🎨 Filtro: <strong>${filterName}</strong></span> • 
      <span>⏱️ Duración: <strong>${duration}s</strong></span> • 
      <span>📁 Archivo: <strong>${fileName}</strong></span>
    `;
  }

  modal.classList.remove('hidden');
  modal.classList.add('flex');

  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

export function closeVideoSavedModal() {
  const modal = document.getElementById('video-saved-modal');
  const player = document.getElementById('video-saved-player');

  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  if (player) {
    player.pause();
    player.src = '';
  }
}

export function downloadAgainRecordedVideo() {
  if (!currentRecordedVideoUrl) return;
  const a = document.createElement('a');
  a.href = currentRecordedVideoUrl;
  a.download = `bARseball-video-${Date.now()}.webm`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToastNotification('📥 Descargando video nuevamente...', 'info');
}
