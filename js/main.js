import { nlTeamsDatabase } from './data/teamsData.js';
import { updateAuthUI, handleAuthSubmit, toggleAuthTab, logoutUser, addCoins, recordGameStats, getActiveUser, updateActiveUser } from './modules/auth.js';
import { renderStorePage, renderProfilePage, buyCosmetic, equipCosmetic, setStoreFilter, setProfileTab, claimTestCoins, showToastNotification } from './modules/store.js';
import { togglePlayPause, changeVolume, applyPreset, updateColorAdjustments } from './modules/videoFilters.js';
import { 
  openARModal, 
  closeARModal, 
  toggleARRotation, 
  toggleParticles, 
  arJumpAction, 
  arCustomAction,
  arConfettiAction, 
  arTakePhotoAction, 
  closePhotoPreview, 
  downloadCapturedPhoto,
  openTargetsModal,
  closeTargetsModal,
  viewDetectedTeamHistory,
  toggleARFullscreen,
  toggleARMirroring
} from './modules/arViewer.js';
import { initGameCanvas, startGame, stopGame, swingBat, gameState } from './modules/battingGame.js';
import { loadLiveStandings, filterDivisionTable } from './modules/standings.js';
import { initNewTriviaGame } from './modules/trivia.js';

// Exposición global
window.showPage = showPage;
window.openMobileMenu = openMobileMenu;
window.closeMobileMenu = closeMobileMenu;
window.toggleMobileMenu = toggleMobileMenu;
window.handleAuthSubmit = handleAuthSubmit;
window.toggleAuthTab = toggleAuthTab;
window.logoutUser = logoutUser;

// Tienda, Cosméticos y Recompensas
window.addCoins = addCoins;
window.recordGameStats = recordGameStats;
window.getActiveUser = getActiveUser;
window.updateActiveUser = updateActiveUser;
window.renderStorePage = renderStorePage;
window.renderProfilePage = renderProfilePage;
window.buyCosmetic = buyCosmetic;
window.equipCosmetic = equipCosmetic;
window.setStoreFilter = setStoreFilter;
window.setProfileTab = setProfileTab;
window.claimTestCoins = claimTestCoins;
window.showToastNotification = showToastNotification;

window.togglePlayPause = togglePlayPause;
window.changeVolume = changeVolume;
window.applyPreset = applyPreset;
window.updateColorAdjustments = updateColorAdjustments;

window.openARModal = openARModal;
window.closeARModal = closeARModal;
window.arCustomAction = arCustomAction;
window.arJumpAction = arJumpAction;
window.toggleARRotation = toggleARRotation;
window.toggleParticles = toggleParticles;
window.arConfettiAction = arConfettiAction;
window.arTakePhotoAction = arTakePhotoAction;
window.closePhotoPreview = closePhotoPreview;
window.downloadCapturedPhoto = downloadCapturedPhoto;
window.openTargetsModal = openTargetsModal;
window.closeTargetsModal = closeTargetsModal;
window.viewDetectedTeamHistory = viewDetectedTeamHistory;
window.toggleARFullscreen = toggleARFullscreen;
window.toggleARMirroring = toggleARMirroring;

window.startGame = startGame;
window.swingBat = swingBat;

window.loadLiveStandings = loadLiveStandings;
window.filterDivisionTable = filterDivisionTable;
window.initNewTriviaGame = initNewTriviaGame;

window.openTeamModal = openTeamModal;
window.closeTeamModal = closeTeamModal;
window.changeUserRepresentingTeam = changeUserRepresentingTeam;
window.getUserRepresentingTeam = getUserRepresentingTeam;
window.recordRunsForRepresentedTeam = recordRunsForRepresentedTeam;

// -------------------------------------------------------------
// GESTIÓN DEL TORNEO Y EQUIPO DEL USUARIO
// -------------------------------------------------------------

const STORAGE_KEY_TOURNAMENT = 'barseball_tournament_scores';
const STORAGE_KEY_USER_TEAM = 'barseball_user_team';

export function getTournamentScores() {
  const saved = localStorage.getItem(STORAGE_KEY_TOURNAMENT);
  if (saved) {
    try { return JSON.parse(saved); } catch (e) {}
  }
  
  const initial = {};
  Object.keys(nlTeamsDatabase).forEach((id, idx) => {
    initial[id] = {
      runs: Math.max(0, 14 - idx * 2),
      inningsPlayed: Math.max(1, 6 - Math.floor(idx / 3))
    };
  });
  localStorage.setItem(STORAGE_KEY_TOURNAMENT, JSON.stringify(initial));
  return initial;
}

export function getUserRepresentingTeam() {
  return localStorage.getItem(STORAGE_KEY_USER_TEAM) || '144'; // 144 = Atlanta Braves
}

export function changeUserRepresentingTeam(teamId) {
  localStorage.setItem(STORAGE_KEY_USER_TEAM, teamId);
  updateActiveTeamBadge();
  renderTournamentTable();
}

export function recordRunsForRepresentedTeam(runsScored) {
  const teamId = getUserRepresentingTeam();
  const scores = getTournamentScores();
  if (!scores[teamId]) scores[teamId] = { runs: 0, inningsPlayed: 0 };

  scores[teamId].runs += runsScored;
  scores[teamId].inningsPlayed += 1;

  localStorage.setItem(STORAGE_KEY_TOURNAMENT, JSON.stringify(scores));
  renderTournamentTable();
}

function updateActiveTeamBadge() {
  const teamId = getUserRepresentingTeam();
  const team = nlTeamsDatabase[teamId];
  const badge = document.getElementById('active-team-badge');
  if (badge && team) {
    badge.textContent = `Representando a: ${team.fullName}`;
  }
}

function populateTeamSelector() {
  const selector = document.getElementById('team-selector');
  if (!selector) return;

  const current = getUserRepresentingTeam();
  selector.innerHTML = '';

  Object.entries(nlTeamsDatabase).forEach(([id, team]) => {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = `${team.fullName} (${team.div})`;
    if (id === current) opt.selected = true;
    selector.appendChild(opt);
  });
}

export function renderTournamentTable() {
  const tbody = document.getElementById('tournament-table-body');
  const leaderCard = document.getElementById('tournament-leader-card');
  if (!tbody) return;

  const scores = getTournamentScores();
  const userTeamId = getUserRepresentingTeam();

  const ranking = Object.entries(nlTeamsDatabase).map(([id, info]) => {
    const teamScore = scores[id] || { runs: 0, inningsPlayed: 0 };
    return {
      id,
      name: info.fullName,
      div: info.div,
      city: info.city,
      runs: teamScore.runs,
      innings: teamScore.inningsPlayed,
      isUserTeam: id === userTeamId
    };
  }).sort((a, b) => b.runs - a.runs || a.innings - b.innings);

  if (leaderCard && ranking.length > 0) {
    const leader = ranking[0];
    leaderCard.innerHTML = `
      <div class="flex items-center space-x-4">
        <div class="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-black text-2xl shadow-lg">
          👑
        </div>
        <div>
          <span class="text-xs uppercase font-bold text-amber-400 tracking-wider">Líder del Torneo</span>
          <h3 class="text-2xl font-black text-slate-100">${leader.name}</h3>
          <p class="text-xs text-slate-400">${leader.city} • División ${leader.div}</p>
        </div>
      </div>
      <div class="text-right">
        <span class="text-3xl font-black text-amber-400 font-mono">${leader.runs}</span>
        <span class="text-xs text-slate-400 block font-medium">Carreras Totales</span>
      </div>
    `;
  }

  tbody.innerHTML = '';
  ranking.forEach((team, index) => {
    const isFirst = index === 0;
    const highlightClass = team.isUserTeam 
      ? 'bg-orange-500/10 hover:bg-orange-500/20 border-l-4 border-l-orange-500' 
      : 'hover:bg-slate-700/40';

    tbody.innerHTML += `
      <tr class="${highlightClass} transition duration-150">
        <td class="py-3 px-4 text-center font-bold ${isFirst ? 'text-amber-400 font-black text-base' : 'text-slate-400'}">
          ${isFirst ? '🥇 1' : index + 1}
        </td>
        <td class="py-3 px-4 font-bold text-slate-100 flex items-center space-x-2">
          <span>${team.name}</span>
          ${team.isUserTeam ? '<span class="text-[10px] bg-orange-500 text-slate-950 font-black px-2 py-0.5 rounded-full">TU EQUIPO</span>' : ''}
        </td>
        <td class="py-3 px-4 text-xs text-slate-400">${team.div}</td>
        <td class="py-3 px-4 text-center font-mono text-slate-300">${team.innings}</td>
        <td class="py-3 px-4 text-center font-mono font-black text-base ${isFirst ? 'text-amber-400' : 'text-slate-200'}">
          ${team.runs}
        </td>
        <td class="py-3 px-4 text-right pr-6">
          <button onclick="changeUserRepresentingTeam('${team.id}')" class="text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-600 hover:border-orange-500 hover:bg-orange-500 hover:text-slate-900 transition text-slate-300">
            ${team.isUserTeam ? 'Seleccionado' : 'Elegir'}
          </button>
        </td>
      </tr>
    `;
  });
}

// -------------------------------------------------------------
// CONTROLADOR DE NAVEGACIÓN Y MODALES
// -------------------------------------------------------------

export function openMobileMenu() {
  const drawer = document.getElementById('mobile-drawer');
  const backdrop = document.getElementById('mobile-drawer-backdrop');
  if (!drawer || !backdrop) return;

  backdrop.classList.remove('hidden');
  void backdrop.offsetWidth;
  backdrop.classList.add('backdrop-active');
  drawer.classList.add('drawer-open');
  document.body.classList.add('menu-open');
}

export function closeMobileMenu() {
  const drawer = document.getElementById('mobile-drawer');
  const backdrop = document.getElementById('mobile-drawer-backdrop');
  if (!drawer || !backdrop) return;

  drawer.classList.remove('drawer-open');
  backdrop.classList.remove('backdrop-active');
  document.body.classList.remove('menu-open');

  setTimeout(() => {
    if (!drawer.classList.contains('drawer-open')) {
      backdrop.classList.add('hidden');
    }
  }, 300);
}

export function toggleMobileMenu() {
  const drawer = document.getElementById('mobile-drawer');
  if (drawer && drawer.classList.contains('drawer-open')) {
    closeMobileMenu();
  } else {
    openMobileMenu();
  }
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeMobileMenu();
  }
});

export function showPage(pageId) {
  closeMobileMenu();

  document.querySelectorAll('.page-content').forEach(el => el.classList.add('hidden'));
  const targetPage = document.getElementById(`page-${pageId}`);
  if (targetPage) targetPage.classList.remove('hidden');

  if (pageId !== 'juego' && gameState.running) {
    stopGame();
  }

  if (pageId === 'juego') {
    setTimeout(initGameCanvas, 50);
    setTimeout(() => {
      if (typeof window.checkGameOrientation === 'function') {
        window.checkGameOrientation();
      }
    }, 80);
    updateActiveTeamBadge();
  }
  if (pageId === 'torneo') {
    populateTeamSelector();
    renderTournamentTable();
  }
  if (pageId === 'estadisticas') loadLiveStandings();
  if (pageId === 'tienda') renderStorePage();
  if (pageId === 'perfil') renderProfilePage();

  // Actualizar clase activa en barra de navegacion de escritorio
  document.querySelectorAll('.nav-link').forEach(btn => {
    btn.classList.remove('active', 'text-white', 'bg-white/10');
    btn.classList.add('text-slate-400');
    const onclickAttr = btn.getAttribute('onclick') || '';
    if (onclickAttr.includes(`'${pageId}'`)) {
      btn.classList.add('active', 'text-white', 'bg-white/10');
      btn.classList.remove('text-slate-400');
    }
  });

  // Actualizar clase activa en enlaces del menu lateral movil
  document.querySelectorAll('.mobile-nav-link').forEach(btn => {
    btn.classList.remove('active', 'text-orange-400', 'bg-orange-500/10', 'border-orange-500/30');
    btn.classList.add('text-slate-300');
    const onclickAttr = btn.getAttribute('onclick') || '';
    if (onclickAttr.includes(`'${pageId}'`)) {
      btn.classList.add('active', 'text-orange-400', 'bg-orange-500/10', 'border-orange-500/30');
      btn.classList.remove('text-slate-300');
    }
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });

  refreshIcons();
}
export function refreshIcons() {
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}
window.refreshIcons = refreshIcons;

export function openTeamModal(teamId) {
  const team = nlTeamsDatabase[teamId];
  if (!team) return;

  document.getElementById('modal-team-div').textContent = team.div;
  document.getElementById('modal-team-founded').textContent = `Fundación: ${team.founded}`;
  document.getElementById('modal-team-name').textContent = team.fullName;
  document.getElementById('modal-team-city').textContent = `${team.city} (${team.state})`;
  document.getElementById('modal-team-stadium').textContent = team.stadium;
  document.getElementById('modal-team-titles').textContent = team.titles;
  document.getElementById('modal-team-history').textContent = team.history;

  const modal = document.getElementById('team-modal');
  if (modal) modal.classList.remove('hidden');
  refreshIcons();
}

export function closeTeamModal() {
  const modal = document.getElementById('team-modal');
  if (modal) modal.classList.add('hidden');
}

function renderTeamsHistory() {
  const container = document.getElementById('teams-history-grid');
  if (!container) return;

  container.innerHTML = '';
  Object.entries(nlTeamsDatabase).forEach(([id, info]) => {
    container.innerHTML += `
      <div onclick="openTeamModal('${id}')" class="bg-slate-800 hover:bg-slate-750 p-5 rounded-2xl border border-slate-700 hover:border-orange-500/50 flex flex-col justify-between space-y-3 shadow-lg cursor-pointer transform hover:-translate-y-1 transition group">
        <div>
          <div class="flex items-center justify-between">
            <span class="text-[11px] uppercase tracking-wider font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-md border border-orange-500/20">${info.div}</span>
            <span class="text-xs font-medium text-slate-400 flex items-center gap-1">
              <i data-lucide="map-pin" class="w-3.5 h-3.5 text-slate-500 group-hover:text-orange-400 transition"></i>
              ${info.state}
            </span>
          </div>
          <h3 class="text-lg font-black text-slate-100 mt-2 group-hover:text-amber-300 transition">${info.fullName}</h3>
          <p class="text-xs text-slate-400 mt-0.5">Sede: <span class="text-slate-300 font-medium">${info.city}</span></p>
        </div>

        <div class="pt-2 border-t border-slate-700/60 flex items-center justify-between text-xs text-orange-400 font-semibold">
          <span>Ver historia completa</span>
          <i data-lucide="chevron-right" class="w-4 h-4 transform group-hover:translate-x-1 transition"></i>
        </div>
      </div>
    `;
  });
}

function renderGallery() {
  const galleryGrid = document.getElementById('gallery-grid');
  if (!galleryGrid) return;

  galleryGrid.innerHTML = '';
  for (let i = 1; i <= 8; i++) {
    galleryGrid.innerHTML += `
      <div class="aspect-square bg-slate-800 rounded-xl border border-slate-700 flex flex-col items-center justify-center text-slate-500 p-4 text-center">
        <i data-lucide="image" class="w-8 h-8 mb-2"></i>
        <span class="text-xs">Espacio para Imagen #${i}</span>
      </div>
    `;
  }
}

const startApp = () => {
  updateAuthUI();
  populateTeamSelector();
  updateActiveTeamBadge();
  renderTournamentTable();
  initNewTriviaGame();
  renderTeamsHistory();
  renderGallery();
  loadLiveStandings();
  refreshIcons();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}