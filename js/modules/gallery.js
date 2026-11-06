// Módulo de Interfaz y Lógica de la Galería Multimedia
import { getAllGalleryItems, deleteGalleryItem, clearAllGalleryItems, getGalleryCounts } from './galleryStorage.js';
import { showToastNotification } from './store.js';

let currentGalleryFilter = 'all';
let activeGalleryItem = null;
let activeObjectUrls = new Map();

/**
 * Renderiza la galería con los elementos guardados (Fotos AR y Videos editados)
 */
export async function renderGallery() {
  const galleryGrid = document.getElementById('gallery-grid');
  const countBadge = document.getElementById('gallery-count-badge');
  if (!galleryGrid) return;

  // Actualizar conteos
  const counts = await getGalleryCounts();
  if (countBadge) {
    countBadge.textContent = `${counts.total} ${counts.total === 1 ? 'elemento' : 'elementos'}`;
  }

  // Actualizar botones de filtro
  updateFilterButtonsUI(counts);

  // Obtener elementos según filtro
  const items = await getAllGalleryItems(currentGalleryFilter);

  // Limpiar URLs de objetos anteriores para evitar fugas de memoria
  activeObjectUrls.forEach((url) => {
    try { URL.revokeObjectURL(url); } catch (e) {}
  });
  activeObjectUrls.clear();

  if (items.length === 0) {
    renderEmptyState(galleryGrid);
    return;
  }

  galleryGrid.innerHTML = items.map((item) => {
    const isVideo = item.type === 'video';
    let mediaSrc = item.dataUrl;

    if (item.blob) {
      mediaSrc = URL.createObjectURL(item.blob);
      activeObjectUrls.set(item.id, mediaSrc);
    }

    const typeBadge = isVideo
      ? `<span class="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-md text-[10px] font-black uppercase flex items-center gap-1">
           <i data-lucide="video" class="w-3 h-3"></i> Video Editado
         </span>`
      : `<span class="bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-md text-[10px] font-black uppercase flex items-center gap-1">
           <i data-lucide="camera" class="w-3 h-3"></i> Foto AR 3D
         </span>`;

    const thumbnailHtml = isVideo
      ? `
        <div class="relative w-full aspect-video bg-black rounded-xl overflow-hidden cursor-pointer group-hover:ring-2 group-hover:ring-amber-500/60 transition" onclick="window.openGalleryItemModal('${item.id}')">
          <video src="${mediaSrc}" class="w-full h-full object-cover pointer-events-none opacity-80 group-hover:opacity-100 transition" preload="metadata"></video>
          <div class="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/20 transition">
            <div class="w-11 h-11 rounded-full bg-amber-500/90 text-slate-950 flex items-center justify-center shadow-lg transform group-hover:scale-110 transition">
              <i data-lucide="play" class="w-5 h-5 fill-slate-950 ml-0.5"></i>
            </div>
          </div>
          ${item.metadata && item.metadata.duration ? `<span class="absolute bottom-2 right-2 bg-slate-950/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded border border-white/10">${item.metadata.duration}s</span>` : ''}
        </div>
      `
      : `
        <div class="relative w-full aspect-[4/3] bg-black rounded-xl overflow-hidden cursor-pointer group-hover:ring-2 group-hover:ring-rose-500/60 transition" onclick="window.openGalleryItemModal('${item.id}')">
          <img src="${mediaSrc}" alt="${item.title}" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">
          <div class="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
            <span class="bg-slate-950/90 text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-white/20 flex items-center gap-1.5 shadow-xl">
              <i data-lucide="maximize" class="w-3.5 h-3.5"></i>
              <span>Ver Completa</span>
            </span>
          </div>
        </div>
      `;

    return `
      <div class="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-3 flex flex-col justify-between group shadow-xl hover:shadow-2xl transition duration-200">
        <div>
          ${thumbnailHtml}
          
          <div class="mt-3 space-y-1">
            <div class="flex items-center justify-between gap-1">
              ${typeBadge}
              <span class="text-[10px] text-slate-400 font-medium">${item.formattedDate || ''}</span>
            </div>
            <h4 class="text-sm font-black text-slate-100 truncate mt-1" title="${item.title}">${item.title}</h4>
            ${item.metadata && item.metadata.team ? `<p class="text-xs text-orange-400 font-semibold truncate">⚾ ${item.metadata.team}</p>` : ''}
            ${item.metadata && item.metadata.filterName ? `<p class="text-xs text-amber-400 font-semibold truncate">🎨 Filtro: ${item.metadata.filterName}</p>` : ''}
          </div>
        </div>

        <div class="pt-3 mt-3 border-t border-slate-800/80 flex items-center justify-between gap-1.5">
          <button onclick="window.openGalleryItemModal('${item.id}')" class="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1" title="Ver en tamaño completo">
            <i data-lucide="${isVideo ? 'play' : 'eye'}" class="w-3.5 h-3.5"></i>
            <span>${isVideo ? 'Reproducir' : 'Ver'}</span>
          </button>
          
          <button onclick="window.downloadGalleryItem('${item.id}')" class="p-2 bg-slate-800 hover:bg-orange-500 hover:text-slate-950 text-slate-300 rounded-xl transition" title="Descargar al dispositivo">
            <i data-lucide="download" class="w-4 h-4"></i>
          </button>

          <button onclick="window.deleteGalleryItemById('${item.id}')" class="p-2 bg-slate-800 hover:bg-rose-500 hover:text-white text-slate-400 rounded-xl transition" title="Eliminar de la galería">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');

  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

/**
 * Muestra el estado vacío si la galería no tiene elementos
 */
function renderEmptyState(container) {
  const isFiltered = currentGalleryFilter !== 'all';
  const filterMsg = currentGalleryFilter === 'photo' 
    ? 'No tienes fotos guardadas aún.' 
    : currentGalleryFilter === 'video' 
      ? 'No tienes videos guardados aún.' 
      : 'Tu galería está vacía.';

  container.innerHTML = `
    <div class="col-span-full py-12 px-6 bg-slate-900/60 border border-slate-800/80 rounded-3xl text-center flex flex-col items-center justify-center space-y-4">
      <div class="w-20 h-20 rounded-3xl bg-gradient-to-tr from-rose-500/20 via-orange-500/20 to-amber-500/20 border border-rose-500/30 flex items-center justify-center text-4xl shadow-inner shadow-rose-500/10">
        ${currentGalleryFilter === 'video' ? '🎬' : '📸'}
      </div>

      <div class="space-y-1.5 max-w-md">
        <h3 class="text-xl font-black text-slate-100">${filterMsg}</h3>
        <p class="text-xs sm:text-sm text-slate-400">
          ${isFiltered 
            ? 'Prueba cambiando el filtro o captura contenido nuevo.' 
            : 'Toma fotos de los 15 modelos 3D en Realidad Aumentada o graba videos interactivos con los 5 filtros para verlos aquí.'}
        </p>
      </div>

      <div class="flex flex-wrap gap-3 pt-2">
        <button onclick="window.openARModal()" class="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs sm:text-sm flex items-center space-x-2 shadow-lg shadow-orange-500/25 active:scale-95 transition">
          <i data-lucide="camera" class="w-4 h-4"></i>
          <span>Tomar Fotos en AR</span>
        </button>

        <button onclick="window.showPage('inicio')" class="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold px-5 py-2.5 rounded-xl text-xs sm:text-sm flex items-center space-x-2 transition">
          <i data-lucide="video" class="w-4 h-4 text-orange-400"></i>
          <span>Grabar Videos con Filtros</span>
        </button>
      </div>
    </div>
  `;

  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

/**
 * Actualiza la UI de los botones de filtro (Todos, Fotos, Videos)
 */
function updateFilterButtonsUI(counts) {
  const btnAll = document.getElementById('btn-filter-all');
  const btnPhotos = document.getElementById('btn-filter-photos');
  const btnVideos = document.getElementById('btn-filter-videos');

  if (btnAll) {
    btnAll.textContent = `Todos (${counts.total})`;
    setButtonActive(btnAll, currentGalleryFilter === 'all');
  }
  if (btnPhotos) {
    btnPhotos.textContent = `📸 Fotos (${counts.photos})`;
    setButtonActive(btnPhotos, currentGalleryFilter === 'photo');
  }
  if (btnVideos) {
    btnVideos.textContent = `🎬 Videos (${counts.videos})`;
    setButtonActive(btnVideos, currentGalleryFilter === 'video');
  }
}

function setButtonActive(btn, isActive) {
  if (isActive) {
    btn.className = 'px-3.5 py-1.5 rounded-xl text-xs font-black transition bg-orange-500 text-slate-950 shadow-md shadow-orange-500/25';
  } else {
    btn.className = 'px-3.5 py-1.5 rounded-xl text-xs font-bold transition bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700/60';
  }
}

/**
 * Cambia el filtro de la galería
 */
export function filterGallery(type) {
  currentGalleryFilter = type;
  renderGallery();
}

/**
 * Abre el visor modal para ver una foto en grande o reproducir un video
 */
export async function openGalleryItemModal(id) {
  const items = await getAllGalleryItems('all');
  const item = items.find(i => i.id === id);
  if (!item) return;

  activeGalleryItem = item;

  const modal = document.getElementById('gallery-item-modal');
  const titleEl = document.getElementById('gallery-item-title');
  const dateEl = document.getElementById('gallery-item-date');
  const badgeEl = document.getElementById('gallery-item-badge');
  const contentContainer = document.getElementById('gallery-item-content');

  if (!modal || !contentContainer) return;

  if (titleEl) titleEl.textContent = item.title;
  if (dateEl) dateEl.textContent = item.formattedDate || '';

  const isVideo = item.type === 'video';
  if (badgeEl) {
    badgeEl.innerHTML = isVideo
      ? `<span class="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full text-xs font-black">🎬 Video Editado</span>`
      : `<span class="bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2.5 py-0.5 rounded-full text-xs font-black">📸 Foto AR 3D</span>`;
  }

  let src = item.dataUrl;
  if (item.blob) {
    src = activeObjectUrls.get(item.id) || URL.createObjectURL(item.blob);
    activeObjectUrls.set(item.id, src);
  }

  if (isVideo) {
    contentContainer.innerHTML = `
      <video src="${src}" controls autoplay playsinline class="max-h-[70vh] w-auto max-w-full rounded-2xl shadow-2xl border border-slate-800 bg-black"></video>
    `;
  } else {
    contentContainer.innerHTML = `
      <img src="${src}" alt="${item.title}" class="max-h-[70vh] w-auto max-w-full rounded-2xl shadow-2xl border border-slate-800 object-contain">
    `;
  }

  modal.classList.remove('hidden');
  modal.classList.add('flex');

  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

/**
 * Cierra el modal de vista completa
 */
export function closeGalleryItemModal() {
  const modal = document.getElementById('gallery-item-modal');
  const contentContainer = document.getElementById('gallery-item-content');

  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }

  if (contentContainer) {
    const video = contentContainer.querySelector('video');
    if (video) {
      video.pause();
      video.src = '';
    }
    contentContainer.innerHTML = '';
  }

  activeGalleryItem = null;
}

/**
 * Descarga el elemento activo o por ID
 */
export async function downloadGalleryItem(id) {
  let item = activeGalleryItem;
  if (id) {
    const items = await getAllGalleryItems('all');
    item = items.find(i => i.id === id);
  }
  if (!item) return;

  const isVideo = item.type === 'video';
  const ext = isVideo ? (item.metadata?.mimeType?.includes('mp4') ? 'mp4' : 'webm') : 'png';
  const filename = `${item.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}.${ext}`;

  let downloadUrl = item.dataUrl;
  if (item.blob) {
    downloadUrl = URL.createObjectURL(item.blob);
  }

  if (!downloadUrl) return;

  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  showToastNotification(`📥 Descarga iniciada: ${filename}`, 'info');
}

/**
 * Elimina un elemento por ID con confirmación
 */
export async function deleteGalleryItemById(id) {
  if (!confirm('¿Seguro que deseas eliminar este elemento de tu galería?')) return;

  await deleteGalleryItem(id);
  showToastNotification('🗑️ Elemento eliminado de la galería.', 'info');

  if (activeGalleryItem && activeGalleryItem.id === id) {
    closeGalleryItemModal();
  }

  renderGallery();
}

/**
 * Vacía la galería completa
 */
export async function confirmClearGallery() {
  const counts = await getGalleryCounts();
  if (counts.total === 0) {
    showToastNotification('Tu galería ya está vacía.', 'info');
    return;
  }

  if (!confirm(`¿Estás seguro de que deseas eliminar TODOS los ${counts.total} elementos de tu galería? Esta acción no se puede deshacer.`)) {
    return;
  }

  await clearAllGalleryItems();
  showToastNotification('✨ Galería vaciada por completo.', 'info');
  renderGallery();
}
