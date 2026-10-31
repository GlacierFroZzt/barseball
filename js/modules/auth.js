// Módulo de Autenticación de Usuario, Monedas y Perfil
const STORAGE_USERS_KEY = 'barseball_users';
const STORAGE_SESSION_KEY = 'barseball_current_user';
const STORAGE_GUEST_KEY = 'barseball_guest_data';

function getDefaultUserData(name = 'Invitado', email = null) {
  return {
    id: email ? Date.now() : 'guest',
    name,
    email,
    registeredAt: email ? new Date().toISOString() : null,
    coins: 0,
    inventory: {
      avatars: ['avatar_default'],
      frames: ['frame_default'],
      titles: ['title_novato']
    },
    equipped: {
      avatar: 'avatar_default',
      frame: 'frame_default',
      title: 'title_novato'
    },
    stats: {
      careerRuns: 0,
      careerHits: 0,
      gamesPlayed: 0
    }
  };
}

function sanitizeUserData(user) {
  if (!user) return getDefaultUserData();
  if (typeof user.coins !== 'number') user.coins = 0;
  if (!user.inventory) {
    user.inventory = {
      avatars: ['avatar_default'],
      frames: ['frame_default'],
      titles: ['title_novato']
    };
  }
  if (!user.inventory.avatars) user.inventory.avatars = ['avatar_default'];
  if (!user.inventory.frames) user.inventory.frames = ['frame_default'];
  if (!user.inventory.titles) user.inventory.titles = ['title_novato'];

  if (!user.equipped) {
    user.equipped = {
      avatar: 'avatar_default',
      frame: 'frame_default',
      title: 'title_novato'
    };
  }
  if (!user.equipped.avatar) user.equipped.avatar = 'avatar_default';
  if (!user.equipped.frame) user.equipped.frame = 'frame_default';
  if (!user.equipped.title) user.equipped.title = 'title_novato';

  if (!user.stats) {
    user.stats = {
      careerRuns: 0,
      careerHits: 0,
      gamesPlayed: 0
    };
  }
  return user;
}

export function getStoredUsers() {
  const users = localStorage.getItem(STORAGE_USERS_KEY);
  return users ? JSON.parse(users).map(sanitizeUserData) : [];
}

export function saveUsers(users) {
  localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
}

export function getActiveSession() {
  const session = localStorage.getItem(STORAGE_SESSION_KEY);
  return session ? JSON.parse(session) : null;
}

export function getGuestData() {
  const guest = localStorage.getItem(STORAGE_GUEST_KEY);
  if (guest) {
    try {
      return sanitizeUserData(JSON.parse(guest));
    } catch (e) {}
  }
  const defaultGuest = getDefaultUserData('Invitado', null);
  localStorage.setItem(STORAGE_GUEST_KEY, JSON.stringify(defaultGuest));
  return defaultGuest;
}

export function saveGuestData(guestData) {
  localStorage.setItem(STORAGE_GUEST_KEY, JSON.stringify(guestData));
}

// Obtener usuario activo (autenticado o invitado)
export function getActiveUser() {
  const session = getActiveSession();
  if (session && session.email) {
    const users = getStoredUsers();
    const found = users.find(u => u.email.toLowerCase() === session.email.toLowerCase());
    if (found) return sanitizeUserData(found);
  }
  return getGuestData();
}

// Actualizar usuario activo
export function updateActiveUser(updatedData) {
  const session = getActiveSession();
  if (session && session.email) {
    const users = getStoredUsers();
    const index = users.findIndex(u => u.email.toLowerCase() === session.email.toLowerCase());
    if (index !== -1) {
      users[index] = { ...users[index], ...updatedData };
      saveUsers(users);
    }
  } else {
    const currentGuest = getGuestData();
    const merged = { ...currentGuest, ...updatedData };
    saveGuestData(merged);
  }
  updateAuthUI();
}

// Añadir monedas (usado al batear carreras o con el botón temporal)
export function addCoins(amount, feedbackMessage = null) {
  const user = getActiveUser();
  user.coins = Math.max(0, (user.coins || 0) + amount);
  updateActiveUser(user);

  // Actualizar displays visuales directos si existen
  const navCoins = document.getElementById('nav-coins-count');
  if (navCoins) navCoins.textContent = user.coins;

  const drawerCoins = document.getElementById('drawer-coins-count');
  if (drawerCoins) drawerCoins.textContent = user.coins;

  const storeCoins = document.getElementById('store-user-coins');
  if (storeCoins) storeCoins.textContent = user.coins;

  // Notificación opcional
  if (feedbackMessage && typeof window.showToastNotification === 'function') {
    window.showToastNotification(feedbackMessage, 'success');
  }

  // Animación sutil de moneda ganada
  triggerCoinAwardEffect(amount);
}

// Registrar estadísticas de carreras y hits en el perfil
export function recordGameStats(runs = 0, hits = 0) {
  const user = getActiveUser();
  user.stats.careerRuns = (user.stats.careerRuns || 0) + runs;
  user.stats.careerHits = (user.stats.careerHits || 0) + hits;
  user.stats.gamesPlayed = (user.stats.gamesPlayed || 0) + 1;
  updateActiveUser(user);
}

// Efecto visual flotante de moneda
function triggerCoinAwardEffect(amount) {
  const coinContainer = document.getElementById('floating-coin-container');
  if (!coinContainer) return;

  const badge = document.createElement('div');
  badge.className = 'text-amber-400 font-mono font-black text-sm sm:text-base animate-bounce flex items-center space-x-1 bg-amber-500/20 px-3 py-1 rounded-full border border-amber-400/50 shadow-lg';
  badge.innerHTML = `<span>+${amount}</span><span>🪙</span>`;

  coinContainer.appendChild(badge);
  setTimeout(() => {
    badge.remove();
  }, 1600);
}

export function setAuthAlert(message, type = 'error') {
  const alertBox = document.getElementById('auth-alert');
  if (!alertBox) return;

  alertBox.classList.remove('hidden', 'bg-rose-500/20', 'border-rose-500', 'text-rose-300', 'bg-emerald-500/20', 'border-emerald-500', 'text-emerald-300');
  
  if (type === 'error') {
    alertBox.classList.add('bg-rose-500/20', 'border-rose-500', 'text-rose-300');
  } else {
    alertBox.classList.add('bg-emerald-500/20', 'border-emerald-500', 'text-emerald-300');
  }
  
  alertBox.innerText = message;
}

export function clearAuthAlert() {
  const alertBox = document.getElementById('auth-alert');
  if (alertBox) alertBox.classList.add('hidden');
}

export function toggleAuthTab(tab) {
  clearAuthAlert();
  const loginForm = document.getElementById('form-login');
  const registerForm = document.getElementById('form-register');
  const loginBtn = document.getElementById('tab-login-btn');
  const registerBtn = document.getElementById('tab-register-btn');

  if (tab === 'login') {
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    loginBtn.className = "flex-1 text-center font-bold text-orange-400 border-b-2 border-orange-500 pb-2 transition";
    registerBtn.className = "flex-1 text-center font-bold text-slate-400 pb-2 hover:text-slate-200 transition";
  } else {
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
    registerBtn.className = "flex-1 text-center font-bold text-orange-400 border-b-2 border-orange-500 pb-2 transition";
    loginBtn.className = "flex-1 text-center font-bold text-slate-400 pb-2 hover:text-slate-200 transition";
  }
}

export function handleAuthSubmit(event, type) {
  event.preventDefault();
  clearAuthAlert();

  const users = getStoredUsers();

  if (type === 'register') {
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim().toLowerCase();
    const pass = document.getElementById('reg-password').value;
    const confirmPass = document.getElementById('reg-confirm-password').value;

    if (pass !== confirmPass) {
      setAuthAlert('Las contraseñas no coinciden.', 'error');
      return;
    }

    const emailExists = users.some(u => u.email === email);
    if (emailExists) {
      setAuthAlert('Este correo ya se encuentra registrado.', 'error');
      return;
    }

    // Si el usuario tenía progreso como invitado, transferirlo
    const guestData = getGuestData();

    const newUser = {
      ...getDefaultUserData(name, email),
      id: Date.now(),
      name,
      email,
      password: pass,
      registeredAt: new Date().toISOString(),
      coins: Math.max(0, guestData.coins || 0),
      stats: { ...guestData.stats },
      inventory: { ...guestData.inventory },
      equipped: { ...guestData.equipped }
    };

    users.push(newUser);
    saveUsers(users);

    localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify({ name: newUser.name, email: newUser.email }));
    setAuthAlert('¡Registro exitoso! Iniciando sesión...', 'success');

    setTimeout(() => {
      document.getElementById('form-register').reset();
      updateAuthUI();
      if (typeof window.showPage === 'function') window.showPage('perfil');
    }, 700);

  } else if (type === 'login') {
    const email = document.getElementById('login-email').value.trim().toLowerCase();
    const pass = document.getElementById('login-password').value;

    const matchedUser = users.find(u => u.email === email && u.password === pass);

    if (!matchedUser) {
      setAuthAlert('Correo electrónico o contraseña incorrectos.', 'error');
      return;
    }

    localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify({ name: matchedUser.name, email: matchedUser.email }));
    setAuthAlert('¡Bienvenido de nuevo!', 'success');

    setTimeout(() => {
      document.getElementById('form-login').reset();
      updateAuthUI();
      if (typeof window.showPage === 'function') window.showPage('perfil');
    }, 600);
  }
}

export function logoutUser() {
  localStorage.removeItem(STORAGE_SESSION_KEY);
  updateAuthUI();
  if (typeof window.showPage === 'function') window.showPage('inicio');
}

export function updateAuthUI() {
  const container = document.getElementById('auth-nav-container');
  const drawerContainer = document.getElementById('auth-drawer-container');

  const session = getActiveSession();
  const user = getActiveUser();

  const avatarEmojiMap = {
    avatar_default: '⚾',
    avatar_batter: '⚡',
    avatar_pitcher: '🔥',
    avatar_golden: '🧤',
    avatar_legend: '☄️'
  };
  const currentAvatarIcon = avatarEmojiMap[user.equipped.avatar] || '⚾';

  // Sincronizar contador de monedas si existe en el drawer
  const drawerCoins = document.getElementById('drawer-coins-count');
  if (drawerCoins) drawerCoins.textContent = user.coins;

  // 1. Renderizar contenedor de barra superior (Desktop)
  if (container) {
    if (session) {
      const firstName = session.name.split(' ')[0];
      container.innerHTML = `
        <div class="flex items-center space-x-2">
          <!-- Balance de monedas en navbar -->
          <div onclick="showPage('tienda')" title="Ir a la Tienda de Cosméticos" class="flex items-center space-x-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-3 py-1.5 rounded-xl text-amber-400 text-xs sm:text-sm font-bold shadow-sm cursor-pointer transition">
            <i data-lucide="coins" class="w-4 h-4 text-amber-400"></i>
            <span id="nav-coins-count" class="font-mono text-amber-300 font-black">${user.coins}</span>
          </div>

          <!-- Botón Temporal +10 Monedas (Test) -->
          <button onclick="claimTestCoins(10)" title="Botón Temporal: Ganar +10 Monedas sin jugar" class="px-2.5 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 flex items-center space-x-1 shadow-md shadow-amber-500/20 active:scale-95 transition">
            <span>+10</span>
            <span>🪙</span>
            <span class="hidden sm:inline text-[10px] uppercase font-bold opacity-80">(Test)</span>
          </button>

          <!-- Botón de Mi Perfil -->
          <button onclick="showPage('perfil')" title="Ver Mi Perfil" class="flex items-center space-x-2 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-orange-500/50 py-1.5 px-3 rounded-xl text-sm transition">
            <div class="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs border border-orange-500/40">
              ${currentAvatarIcon}
            </div>
            <span class="font-bold text-slate-200 hidden sm:inline">${firstName}</span>
          </button>

          <!-- Cerrar Sesión -->
          <button onclick="logoutUser()" title="Cerrar Sesión" class="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition">
            <i data-lucide="log-out" class="w-4 h-4"></i>
          </button>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div class="flex items-center space-x-2">
          <!-- Balance de monedas en navbar para invitado -->
          <div onclick="showPage('tienda')" title="Ir a la Tienda de Cosméticos" class="flex items-center space-x-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-3 py-1.5 rounded-xl text-amber-400 text-xs sm:text-sm font-bold shadow-sm cursor-pointer transition">
            <i data-lucide="coins" class="w-4 h-4 text-amber-400"></i>
            <span id="nav-coins-count" class="font-mono text-amber-300 font-black">${user.coins}</span>
          </div>

          <!-- Botón Temporal +10 Monedas (Test) -->
          <button onclick="claimTestCoins(10)" title="Botón Temporal: Ganar +10 Monedas sin jugar" class="px-2.5 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 flex items-center space-x-1 shadow-md shadow-amber-500/20 active:scale-95 transition">
            <span>+10</span>
            <span>🪙</span>
            <span class="hidden sm:inline text-[10px] uppercase font-bold opacity-80">(Test)</span>
          </button>

          <!-- Botón Mi Perfil Invitado -->
          <button onclick="showPage('perfil')" title="Ver Mi Perfil" class="p-2 rounded-xl text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition">
            <i data-lucide="user" class="w-4 h-4"></i>
          </button>

          <!-- Botón Ingresar -->
          <button onclick="showPage('login')" class="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 hover:text-white transition">
            Ingresar
          </button>
        </div>
      `;
    }
  }

  // 2. Renderizar contenedor de usuario en Menú Lateral (Drawer Móvil)
  if (drawerContainer) {
    if (session) {
      drawerContainer.innerHTML = `
        <div class="space-y-3">
          <div class="flex items-center space-x-3 bg-slate-950/70 p-3 rounded-2xl border border-white/10">
            <div class="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 p-0.5 flex items-center justify-center shadow-lg shadow-orange-500/20 flex-shrink-0">
              <div class="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center text-lg">
                ${currentAvatarIcon}
              </div>
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center space-x-1.5">
                <span class="font-black text-sm text-slate-100 truncate">${session.name}</span>
                <span class="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded-full font-bold">Activo</span>
              </div>
              <p class="text-xs text-slate-400 truncate">${session.email}</p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <button onclick="showPage('perfil')" class="flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-200 transition">
              <i data-lucide="user" class="w-3.5 h-3.5 text-orange-400"></i>
              <span>Mi Perfil</span>
            </button>
            <button onclick="logoutUser()" class="flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-xs font-bold text-rose-300 transition">
              <i data-lucide="log-out" class="w-3.5 h-3.5"></i>
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      `;
    } else {
      drawerContainer.innerHTML = `
        <div class="space-y-3">
          <div class="flex items-center space-x-3 bg-slate-950/70 p-3 rounded-2xl border border-white/10">
            <div class="w-11 h-11 rounded-2xl bg-slate-800 border border-white/10 flex items-center justify-center text-lg flex-shrink-0 text-slate-400">
              ⚾
            </div>
            <div class="min-w-0 flex-1">
              <span class="font-black text-sm text-slate-200 block">Modo Invitado</span>
              <p class="text-xs text-slate-400">Inicia sesión para guardar tu progreso</p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <button onclick="showPage('login')" class="flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-xs font-black text-slate-950 transition shadow-md shadow-orange-500/20">
              <i data-lucide="log-in" class="w-3.5 h-3.5"></i>
              <span>Ingresar</span>
            </button>
            <button onclick="showPage('perfil')" class="flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-200 transition">
              <i data-lucide="user" class="w-3.5 h-3.5 text-slate-400"></i>
              <span>Perfil</span>
            </button>
          </div>
        </div>
      `;
    }
  }

  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    lucide.createIcons();
  }
}
