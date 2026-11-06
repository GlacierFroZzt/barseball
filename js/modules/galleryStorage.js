// Módulo de Almacenamiento Persistente para la Galería (IndexedDB con fallback a localStorage)
const DB_NAME = 'bARseballGalleryDB';
const DB_VERSION = 1;
const STORE_NAME = 'media_items';
const FALLBACK_KEY = 'barseball_gallery_items_fallback';

let dbPromise = null;

/**
 * Inicializa y abre la base de datos IndexedDB
 */
export function getGalleryDB() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      console.warn('IndexedDB no disponible, usando fallback a localStorage.');
      return resolve(null);
    }

    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        resolve(event.target.result);
      };

      request.onerror = (event) => {
        console.warn('Error al abrir IndexedDB:', event.target.error);
        resolve(null); // Fallback amigable
      };
    } catch (e) {
      console.warn('Excepción al inicializar IndexedDB:', e);
      resolve(null);
    }
  });

  return dbPromise;
}

/**
 * Guarda un elemento multimedia (foto o video) en la base de datos
 * @param {Object} item - { type: 'photo'|'video', title, dataUrl, blob, metadata }
 */
export async function saveGalleryItem({ type = 'photo', title = 'Captura', dataUrl = null, blob = null, metadata = {} }) {
  const db = await getGalleryDB();
  const id = 'media_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
  const now = new Date();
  const formattedDate = now.toLocaleDateString('es-ES', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const record = {
    id,
    type,
    title,
    dataUrl: dataUrl || null,
    blob: blob || null,
    metadata: metadata || {},
    createdAt: now.getTime(),
    formattedDate
  };

  if (db) {
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction([STORE_NAME], 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(record);

        req.onsuccess = () => resolve(record);
        req.onerror = (e) => {
          console.warn('Error guardando en IndexedDB:', e.target.error);
          saveToLocalStorageFallback(record);
          resolve(record);
        };
      } catch (err) {
        console.warn('Fallo transacción IndexedDB:', err);
        saveToLocalStorageFallback(record);
        resolve(record);
      }
    });
  } else {
    saveToLocalStorageFallback(record);
    return record;
  }
}

/**
 * Obtiene todos los elementos de la galería ordenados del más reciente al más antiguo
 * @param {string} filterType - 'all' | 'photo' | 'video'
 */
export async function getAllGalleryItems(filterType = 'all') {
  const db = await getGalleryDB();

  if (db) {
    return new Promise((resolve) => {
      try {
        const tx = db.transaction([STORE_NAME], 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();

        req.onsuccess = (e) => {
          let items = e.target.result || [];
          items.sort((a, b) => b.createdAt - a.createdAt);

          if (filterType !== 'all') {
            items = items.filter(i => i.type === filterType);
          }
          resolve(items);
        };

        req.onerror = () => {
          resolve(getFromLocalStorageFallback(filterType));
        };
      } catch (err) {
        resolve(getFromLocalStorageFallback(filterType));
      }
    });
  }

  return getFromLocalStorageFallback(filterType);
}

/**
 * Elimina un elemento de la galería por ID
 */
export async function deleteGalleryItem(id) {
  const db = await getGalleryDB();

  if (db) {
    return new Promise((resolve) => {
      try {
        const tx = db.transaction([STORE_NAME], 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(id);

        req.onsuccess = () => {
          deleteFromLocalStorageFallback(id);
          resolve(true);
        };
        req.onerror = () => {
          deleteFromLocalStorageFallback(id);
          resolve(true);
        };
      } catch (e) {
        deleteFromLocalStorageFallback(id);
        resolve(true);
      }
    });
  }

  deleteFromLocalStorageFallback(id);
  return true;
}

/**
 * Vacía por completo todos los elementos de la galería
 */
export async function clearAllGalleryItems() {
  const db = await getGalleryDB();

  if (db) {
    return new Promise((resolve) => {
      try {
        const tx = db.transaction([STORE_NAME], 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.clear();

        req.onsuccess = () => {
          localStorage.removeItem(FALLBACK_KEY);
          resolve(true);
        };
        req.onerror = () => {
          localStorage.removeItem(FALLBACK_KEY);
          resolve(true);
        };
      } catch (e) {
        localStorage.removeItem(FALLBACK_KEY);
        resolve(true);
      }
    });
  }

  localStorage.removeItem(FALLBACK_KEY);
  return true;
}

/**
 * Estadísticas de conteo de la galería
 */
export async function getGalleryCounts() {
  const all = await getAllGalleryItems('all');
  const photos = all.filter(i => i.type === 'photo').length;
  const videos = all.filter(i => i.type === 'video').length;
  return { total: all.length, photos, videos };
}

// ---------------------------------------------------------------------
// HELPERS PARA FALLBACK EN LOCALSTORAGE
// ---------------------------------------------------------------------

function getFromLocalStorageFallback(filterType = 'all') {
  try {
    const raw = localStorage.getItem(FALLBACK_KEY);
    if (!raw) return [];
    let items = JSON.parse(raw);
    items.sort((a, b) => b.createdAt - a.createdAt);
    if (filterType !== 'all') {
      items = items.filter(i => i.type === filterType);
    }
    return items;
  } catch (e) {
    return [];
  }
}

function saveToLocalStorageFallback(record) {
  try {
    // Si contiene blob, no podemos serializarlo a JSON directamente en localStorage;
    // conservamos dataUrl o quitamos blob
    const safeRecord = { ...record, blob: null };
    const items = getFromLocalStorageFallback('all');
    items.unshift(safeRecord);
    // Limitar a los 20 más recientes para no agotar cuota de localStorage
    const trimmed = items.slice(0, 20);
    localStorage.setItem(FALLBACK_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.warn('No se pudo guardar en localStorage fallback:', e);
  }
}

function deleteFromLocalStorageFallback(id) {
  try {
    const items = getFromLocalStorageFallback('all').filter(i => i.id !== id);
    localStorage.setItem(FALLBACK_KEY, JSON.stringify(items));
  } catch (e) {}
}
