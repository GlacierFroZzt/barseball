// Módulo de Tienda de Cosméticos, Inventario y Perfil
import { getActiveUser, updateActiveUser, addCoins } from './auth.js';

export const COSMETICS_CATALOG = {
  avatars: [
    {
      id: 'avatar_default',
      name: 'Pelota Clásica',
      price: 0,
      iconEmoji: '⚾',
      gradient: 'from-slate-700 to-slate-900',
      description: 'El clásico y confiable cuero blanco del diamante.'
    },
    {
      id: 'avatar_batter',
      name: 'Bateador Pro',
      price: 10,
      iconEmoji: '⚡',
      gradient: 'from-blue-600 to-indigo-900',
      description: 'Enfoque de acero y swing demoledor en cada turno.'
    },
    {
      id: 'avatar_pitcher',
      name: 'Pitcher As',
      price: 15,
      iconEmoji: '🔥',
      gradient: 'from-emerald-600 to-teal-900',
      description: 'Lanzamientos a más de 100 MPH difíciles de descifrar.'
    },
    {
      id: 'avatar_golden',
      name: 'Guante de Oro',
      price: 25,
      iconEmoji: '🧤',
      gradient: 'from-amber-500 to-yellow-700',
      description: 'Defensa legendaria e impenetrable en el cuadro.'
    },
    {
      id: 'avatar_legend',
      name: 'Bateador de Fuego',
      price: 40,
      iconEmoji: '☄️',
      gradient: 'from-rose-600 via-orange-600 to-amber-700',
      description: 'Poder mítico capaz de enviar la pelota fuera del parque.'
    }
  ],
  frames: [
    {
      id: 'frame_default',
      name: 'Clásico Gris',
      price: 0,
      borderClass: 'border-2 border-slate-600',
      description: 'Borde sobrio y reglamentario de la liga.'
    },
    {
      id: 'frame_emerald',
      name: 'Neón Esmeralda',
      price: 12,
      borderClass: 'border-2 border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.55)]',
      description: 'Brillo radioactivo inspirado en el césped de Grandes Ligas.'
    },
    {
      id: 'frame_flame',
      name: 'Fuego Carmesí',
      price: 20,
      borderClass: 'border-2 border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.65)] animate-pulse',
      description: 'Aura ardiente para bateadores con swing caliente.'
    },
    {
      id: 'frame_gold',
      name: 'Oro Diamante MLB',
      price: 35,
      borderClass: 'border-2 border-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.75)] ring-2 ring-amber-500/50',
      description: 'Exclusivo para la élite y campeones del torneo.'
    }
  ],
  titles: [
    {
      id: 'title_novato',
      name: 'Novato',
      price: 0,
      badgeClass: 'bg-slate-800 text-slate-300 border-slate-700',
      description: 'Dando sus primeros pasos en la caja de bateo.'
    },
    {
      id: 'title_slugger',
      name: 'Jonronero Implacable',
      price: 10,
      badgeClass: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
      description: 'Cada contacto pone a temblar a los jardineros.'
    },
    {
      id: 'title_mvp',
      name: 'MVP de la Temporada',
      price: 25,
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold',
      description: 'El jugador más valioso y determinante de la franquicia.'
    },
    {
      id: 'title_legend',
      name: 'Leyenda del Diamante',
      price: 50,
      badgeClass: 'bg-purple-500/25 text-purple-300 border-purple-500/50 font-black tracking-wider shadow-sm',
      description: 'Nombre inmortalizado con letras doradas en el Salón de la Fama.'
    }
  ]
};

export function getCosmeticItem(type, itemId) {
  const list = COSMETICS_CATALOG[type] || [];
  return list.find(item => item.id === itemId);
}

// ---------------------------------------------------------------------
// RENDERIZADO DE LA TIENDA
// ---------------------------------------------------------------------
let activeStoreFilter = 'all';

export function setStoreFilter(filter) {
  activeStoreFilter = filter;
  renderStorePage();
}

export function renderStorePage() {
  const container = document.getElementById('store-content-container');
  const coinsDisplay = document.getElementById('store-user-coins');
  if (!container) return;

  const user = getActiveUser();
  if (coinsDisplay) {
    coinsDisplay.textContent = user.coins;
  }

  // Filtrado de artículos
  let sections = [];
  if (activeStoreFilter === 'all' || activeStoreFilter === 'avatars') {
    sections.push({ title: 'Avatares de Béisbol', type: 'avatars', icon: 'user-check', items: COSMETICS_CATALOG.avatars });
  }
  if (activeStoreFilter === 'all' || activeStoreFilter === 'frames') {
    sections.push({ title: 'Marcos de Perfil', type: 'frames', icon: 'shield', items: COSMETICS_CATALOG.frames });
  }
  if (activeStoreFilter === 'all' || activeStoreFilter === 'titles') {
    sections.push({ title: 'Títulos de Jugador', type: 'titles', icon: 'award', items: COSMETICS_CATALOG.titles });
  }

  let html = '';

  sections.forEach(sec => {
    html += `
      <div class="space-y-4">
        <div class="flex items-center space-x-2 border-b border-slate-700/80 pb-2">
          <i data-lucide="${sec.icon}" class="w-5 h-5 text-orange-400"></i>
          <h3 class="text-lg font-black text-slate-100 tracking-wide">${sec.title}</h3>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
    `;

    sec.items.forEach(item => {
      const isOwned = (user.inventory[sec.type] || []).includes(item.id);
      const isEquipped = user.equipped[sec.type === 'avatars' ? 'avatar' : sec.type === 'frames' ? 'frame' : 'title'] === item.id;
      const canAfford = user.coins >= item.price;

      // Vista previa visual del artículo
      let previewHtml = '';
      if (sec.type === 'avatars') {
        previewHtml = `
          <div class="w-20 h-20 rounded-full bg-gradient-to-tr ${item.gradient} flex items-center justify-center text-3xl shadow-md border-2 border-slate-700 group-hover:scale-105 transition-transform">
            ${item.iconEmoji}
          </div>
        `;
      } else if (sec.type === 'frames') {
        previewHtml = `
          <div class="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center text-2xl ${item.borderClass}">
            ⚾
          </div>
        `;
      } else {
        previewHtml = `
          <div class="px-4 py-2 rounded-xl border text-sm font-bold ${item.badgeClass}">
            ${item.name}
          </div>
        `;
      }

      // Botón de acción
      let actionBtn = '';
      if (isEquipped) {
        actionBtn = `
          <button disabled class="w-full py-2 px-3 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-black flex items-center justify-center space-x-1 cursor-default">
            <i data-lucide="check" class="w-4 h-4"></i>
            <span>EQUIPADO</span>
          </button>
        `;
      } else if (isOwned) {
        actionBtn = `
          <button onclick="equipCosmetic('${sec.type}', '${item.id}')" class="w-full py-2 px-3 rounded-xl bg-slate-700 hover:bg-orange-500 text-slate-100 hover:text-slate-950 font-bold text-xs transition flex items-center justify-center space-x-1 shadow-sm">
            <i data-lucide="sparkles" class="w-3.5 h-3.5"></i>
            <span>Equipar</span>
          </button>
        `;
      } else {
        actionBtn = `
          <button onclick="buyCosmetic('${sec.type}', '${item.id}')" 
            ${!canAfford ? 'disabled' : ''} 
            class="w-full py-2 px-3 rounded-xl font-black text-xs transition flex items-center justify-center space-x-1.5 ${
              canAfford 
                ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-md shadow-amber-400/20 active:scale-95' 
                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
            }">
            <span>Comprar por</span>
            <span class="font-mono text-sm">${item.price}</span>
            <span class="text-sm">🪙</span>
          </button>
        `;
      }

      html += `
        <div class="bg-slate-800/90 hover:bg-slate-800 p-5 rounded-2xl border border-slate-700/80 hover:border-orange-500/40 flex flex-col justify-between space-y-4 shadow-lg transition group">
          <div class="flex flex-col items-center text-center space-y-3">
            <div class="h-24 flex items-center justify-center">
              ${previewHtml}
            </div>
            <div>
              <div class="flex items-center justify-center gap-1.5">
                <h4 class="font-bold text-slate-100 text-base">${item.name}</h4>
                ${item.price === 0 ? '<span class="text-[10px] bg-slate-700 text-slate-300 font-bold px-2 py-0.5 rounded-full">Gratis</span>' : ''}
              </div>
              <p class="text-xs text-slate-400 mt-1 line-clamp-2">${item.description}</p>
            </div>
          </div>
          <div>
            ${actionBtn}
          </div>
        </div>
      `;
    });

    html += `
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
  if (window.lucide) lucide.createIcons();
}

// ---------------------------------------------------------------------
// COMPRAR Y EQUIPAR COSMÉTICOS
// ---------------------------------------------------------------------
export function buyCosmetic(type, itemId) {
  const user = getActiveUser();
  const item = getCosmeticItem(type, itemId);
  if (!item) return;

  if (user.coins < item.price) {
    showToastNotification(`No tienes suficientes monedas (${user.coins}/${item.price} 🪙).`, 'error');
    return;
  }

  // Descontar monedas
  user.coins -= item.price;

  // Agregar al inventario
  if (!user.inventory[type]) user.inventory[type] = [];
  if (!user.inventory[type].includes(itemId)) {
    user.inventory[type].push(itemId);
  }

  // Equipar automáticamente al comprar
  const equippedKey = type === 'avatars' ? 'avatar' : type === 'frames' ? 'frame' : 'title';
  user.equipped[equippedKey] = itemId;

  updateActiveUser(user);
  showToastNotification(`¡Adquiriste y equipaste: ${item.name}! 🎉`, 'success');

  renderStorePage();
  renderProfilePage();
}

export function equipCosmetic(type, itemId) {
  const user = getActiveUser();
  const item = getCosmeticItem(type, itemId);
  if (!item) return;

  const equippedKey = type === 'avatars' ? 'avatar' : type === 'frames' ? 'frame' : 'title';
  user.equipped[equippedKey] = itemId;

  updateActiveUser(user);
  showToastNotification(`Equipado: ${item.name}`, 'info');

  renderStorePage();
  renderProfilePage();
}

// ---------------------------------------------------------------------
// RENDERIZADO DE LA PÁGINA DE PERFIL
// ---------------------------------------------------------------------
let activeProfileTab = 'avatars';

export function setProfileTab(tab) {
  activeProfileTab = tab;
  renderProfilePage();
}

export function renderProfilePage() {
  const user = getActiveUser();
  const cardContainer = document.getElementById('profile-card-container');
  const inventoryContainer = document.getElementById('profile-inventory-container');
  if (!cardContainer || !inventoryContainer) return;

  // Cosméticos equipados actuales
  const avatar = getCosmeticItem('avatars', user.equipped.avatar) || COSMETICS_CATALOG.avatars[0];
  const frame = getCosmeticItem('frames', user.equipped.frame) || COSMETICS_CATALOG.frames[0];
  const title = getCosmeticItem('titles', user.equipped.title) || COSMETICS_CATALOG.titles[0];

  // Renderizar Tarjeta de Perfil
  cardContainer.innerHTML = `
    <div class="relative bg-gradient-to-br from-slate-800 via-slate-850 to-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden">
      <!-- Glow decorativo de fondo -->
      <div class="absolute -top-16 -right-16 w-56 h-56 bg-orange-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute -bottom-16 -left-16 w-56 h-56 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div class="relative flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left">
        <!-- Avatar y Marco Decorativo -->
        <div class="relative">
          <div class="w-28 h-28 rounded-full bg-gradient-to-tr ${avatar.gradient} flex items-center justify-center text-5xl shadow-xl ${frame.borderClass} transition-all">
            ${avatar.iconEmoji}
          </div>
          <div class="absolute -bottom-2 -right-2 bg-slate-900 border border-slate-700 rounded-full p-1.5 shadow-md text-amber-400" title="Cosmético Equipado">
            <i data-lucide="sparkles" class="w-4 h-4"></i>
          </div>
        </div>

        <!-- Información del Jugador -->
        <div class="flex-1 space-y-2">
          <div class="flex flex-col sm:flex-row sm:items-center gap-2 justify-center md:justify-start">
            <h2 class="text-2xl sm:text-3xl font-black text-slate-100">${user.name}</h2>
            <span class="inline-block text-xs uppercase px-3 py-1 rounded-full font-bold border ${title.badgeClass}">
              ${title.name}
            </span>
          </div>

          <p class="text-xs sm:text-sm text-slate-400">
            ${user.email ? user.email : 'Cuenta de Invitado Local'} • Miembro desde ${user.registeredAt ? new Date(user.registeredAt).toLocaleDateString() : 'Hoy'}
          </p>

          <!-- Estadísticas y Balance de Monedas -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
            <div class="bg-slate-950/50 border border-slate-800 rounded-2xl p-3 text-center">
              <span class="text-xs text-slate-400 block font-medium">Monedas</span>
              <div class="flex items-center justify-center space-x-1 mt-0.5">
                <span class="text-amber-400 text-base">🪙</span>
                <span class="text-xl font-mono font-black text-amber-300">${user.coins}</span>
              </div>
            </div>

            <div class="bg-slate-950/50 border border-slate-800 rounded-2xl p-3 text-center">
              <span class="text-xs text-slate-400 block font-medium">Carreras Bateadas</span>
              <span class="text-xl font-mono font-black text-orange-400 block mt-0.5">${user.stats.careerRuns || 0}</span>
            </div>

            <div class="bg-slate-950/50 border border-slate-800 rounded-2xl p-3 text-center">
              <span class="text-xs text-slate-400 block font-medium">Hits Conectados</span>
              <span class="text-xl font-mono font-black text-sky-400 block mt-0.5">${user.stats.careerHits || 0}</span>
            </div>

            <div class="bg-slate-950/50 border border-slate-800 rounded-2xl p-3 text-center">
              <span class="text-xs text-slate-400 block font-medium">Partidas</span>
              <span class="text-xl font-mono font-black text-emerald-400 block mt-0.5">${user.stats.gamesPlayed || 0}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Banner de invitado si no ha iniciado sesión -->
      ${!user.email ? `
        <div class="mt-6 p-4 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm text-orange-200">
          <div class="flex items-center space-x-2">
            <i data-lucide="info" class="w-5 h-5 text-orange-400 shrink-0"></i>
            <span>Estás jugando como invitado. <strong>Crea una cuenta</strong> para conservar tus cosméticos y carreras de forma segura.</span>
          </div>
          <button onclick="showPage('login')" class="bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold px-4 py-2 rounded-xl transition whitespace-nowrap">
            Crear Cuenta / Iniciar
          </button>
        </div>
      ` : ''}
    </div>
  `;

  // Renderizar Inventario del usuario según la pestaña activa
  const ownedItemIds = user.inventory[activeProfileTab] || [];
  const catalogItems = COSMETICS_CATALOG[activeProfileTab] || [];
  const ownedItems = catalogItems.filter(item => ownedItemIds.includes(item.id));

  let inventoryHtml = '';
  if (ownedItems.length === 0) {
    inventoryHtml = `
      <div class="p-8 text-center bg-slate-800/50 rounded-2xl border border-slate-700/60 text-slate-400 space-y-3">
        <i data-lucide="package" class="w-10 h-10 mx-auto text-slate-600"></i>
        <p class="text-sm">Aún no tienes elementos en esta categoría.</p>
        <button onclick="showPage('tienda')" class="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-slate-950 font-bold rounded-xl text-xs transition">
          Ir a la Tienda
        </button>
      </div>
    `;
  } else {
    inventoryHtml = `<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">`;

    ownedItems.forEach(item => {
      const equippedKey = activeProfileTab === 'avatars' ? 'avatar' : activeProfileTab === 'frames' ? 'frame' : 'title';
      const isEquipped = user.equipped[equippedKey] === item.id;

      let preview = '';
      if (activeProfileTab === 'avatars') {
        preview = `
          <div class="w-16 h-16 rounded-full bg-gradient-to-tr ${item.gradient} flex items-center justify-center text-3xl shadow">
            ${item.iconEmoji}
          </div>
        `;
      } else if (activeProfileTab === 'frames') {
        preview = `
          <div class="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-2xl ${item.borderClass}">
            ⚾
          </div>
        `;
      } else {
        preview = `
          <div class="px-3 py-1.5 rounded-lg border text-xs font-bold ${item.badgeClass}">
            ${item.name}
          </div>
        `;
      }

      inventoryHtml += `
        <div class="bg-slate-800/80 p-4 rounded-2xl border ${isEquipped ? 'border-orange-500 bg-orange-500/5' : 'border-slate-700/70'} flex flex-col justify-between space-y-3">
          <div class="flex items-center space-x-3">
            ${preview}
            <div>
              <h5 class="font-bold text-slate-200 text-sm">${item.name}</h5>
              <p class="text-xs text-slate-400 mt-0.5">${item.description}</p>
            </div>
          </div>

          <div>
            ${isEquipped ? `
              <div class="w-full py-1.5 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs font-bold flex items-center justify-center space-x-1">
                <i data-lucide="check" class="w-3.5 h-3.5"></i>
                <span>En uso</span>
              </div>
            ` : `
              <button onclick="equipCosmetic('${activeProfileTab}', '${item.id}')" class="w-full py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-xs transition">
                Equipar
              </button>
            `}
          </div>
        </div>
      `;
    });

    inventoryHtml += `</div>`;
  }

  inventoryContainer.innerHTML = inventoryHtml;
  if (window.lucide) lucide.createIcons();
}

// ---------------------------------------------------------------------
// BOTÓN TEMPORAL DE MONEDAS DE PRUEBA
// ---------------------------------------------------------------------
export function claimTestCoins(amount = 10) {
  addCoins(amount, `¡Has recibido +${amount} monedas de prueba! 🪙`);
  renderStorePage();
  renderProfilePage();
}

// ---------------------------------------------------------------------
// NOTIFICACIONES TOAST FLOTANTES
// ---------------------------------------------------------------------
export function showToastNotification(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'fixed bottom-5 right-5 z-50 flex flex-col space-y-2 pointer-events-none';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  const bg = type === 'success' ? 'bg-emerald-600' : type === 'error' ? 'bg-rose-600' : 'bg-slate-800 border border-orange-500';
  toast.className = `${bg} text-white text-xs sm:text-sm font-bold px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-2 transform translate-y-4 opacity-0 transition-all duration-300 pointer-events-auto`;
  toast.innerHTML = `
    <span>${message}</span>
  `;

  container.appendChild(toast);

  // Animación entrada
  setTimeout(() => {
    toast.classList.remove('translate-y-4', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');
  }, 20);

  // Animación salida
  setTimeout(() => {
    toast.classList.remove('opacity-100');
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 2800);
}
