// Módulo de Estadísticas y Conexión MLB API
import { nlTeamsDatabase, resolveTeamLocation } from '../data/teamsData.js';

let currentDivisionFilter = 'all';
let rawStandingsData = null;

export async function loadLiveStandings() {
  const container = document.getElementById('standings-divisions-container');
  const statusText = document.getElementById('stats-status-text');
  if (!container) return;

  container.innerHTML = `
    <div class="p-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-3">
      <i data-lucide="loader-2" class="w-7 h-7 animate-spin text-sky-400"></i>
      <span class="text-sm">Consultando estadísticas oficiales en tiempo real...</span>
    </div>
  `;
  if (window.lucide) lucide.createIcons();

  try {
    const response = await fetch('https://statsapi.mlb.com/api/v1/standings?leagueId=104');
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);

    rawStandingsData = await response.json();
    renderGroupedStandings(rawStandingsData);

    if (statusText) {
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      statusText.innerText = `Actualizado oficialmente a las ${now} • 3 Divisiones sincronizadas`;
      statusText.className = "text-xs text-emerald-400 mt-1";
    }
  } catch (error) {
    console.warn('Error al conectar con MLB API, cargando estructura base:', error);
    renderFallbackStandingsGrouped();
    if (statusText) {
      statusText.innerText = "Modo sin conexión: mostrando estructura divisional predeterminada.";
      statusText.className = "text-xs text-amber-400 mt-1";
    }
  }

  if (window.lucide) lucide.createIcons();
}

export function renderGroupedStandings(data) {
  const container = document.getElementById('standings-divisions-container');
  if (!container || !data || !data.records) return;

  container.innerHTML = '';

  const divMeta = {
    204: { key: 'este', title: 'División Este', badge: 'border-sky-500/30 text-sky-400 bg-sky-500/10' },
    205: { key: 'central', title: 'División Central', badge: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' },
    203: { key: 'oeste', title: 'División Oeste', badge: 'border-amber-500/30 text-amber-400 bg-amber-500/10' }
  };

  data.records.forEach(divRecord => {
    const meta = divMeta[divRecord.division.id] || { key: 'otra', title: 'División', badge: 'border-slate-600 text-slate-300' };
    const isVisible = currentDivisionFilter === 'all' || currentDivisionFilter === meta.key;

    const divWrapper = document.createElement('div');
    divWrapper.className = `division-card division-${meta.key} bg-slate-900/60 rounded-xl border border-slate-700/70 overflow-hidden ${isVisible ? '' : 'hidden'}`;

    let tableRows = '';

    divRecord.teamRecords.forEach((teamData, index) => {
      const teamId = teamData.team.id;
      const apiTeamName = teamData.team.name || '';
      const wins = teamData.wins;
      const losses = teamData.losses;
      const pct = teamData.winningPercentage || '.000';
      const gb = teamData.gamesBack === '-' || teamData.gamesBack === '0.0' ? '-' : teamData.gamesBack;
      const streak = teamData.streak ? teamData.streak.streakCode : '-';
      const isLeader = index === 0;

      const info = resolveTeamLocation(teamId, apiTeamName);

      tableRows += `
        <tr class="hover:bg-slate-800/50 transition border-b border-slate-800/60 ${isLeader ? 'bg-slate-800/30' : ''}">
          <td class="p-3 sm:p-3.5 font-bold text-slate-100 flex items-center space-x-2">
            <span class="w-5 text-center font-mono text-xs ${isLeader ? 'text-orange-400 font-black' : 'text-slate-500'}">${index + 1}</span>
            <span>${info.fullName}</span>
            ${isLeader ? '<span class="text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/30 px-1.5 py-0.5 rounded font-semibold tracking-wider uppercase">Líder</span>' : ''}
          </td>
          <td class="p-3 sm:p-3.5 text-slate-400 text-xs sm:text-sm">${info.state}</td>
          <td class="p-3 sm:p-3.5 text-center font-mono font-bold text-emerald-400">${wins}</td>
          <td class="p-3 sm:p-3.5 text-center font-mono font-bold text-rose-400">${losses}</td>
          <td class="p-3 sm:p-3.5 text-center font-mono text-amber-300 font-semibold">${pct}</td>
          <td class="p-3 sm:p-3.5 text-center font-mono text-xs sm:text-sm ${isLeader ? 'text-orange-400 font-bold' : 'text-slate-300'}">${gb}</td>
          <td class="p-3 sm:p-3.5 text-center font-mono text-xs font-semibold ${streak.startsWith('W') ? 'text-emerald-400' : 'text-rose-400'}">${streak}</td>
        </tr>
      `;
    });

    divWrapper.innerHTML = `
      <div class="px-4 py-2.5 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
        <span class="font-black text-sm uppercase tracking-wider ${meta.badge} border px-2.5 py-1 rounded-lg">${meta.title}</span>
        <span class="text-xs text-slate-400">Liga Nacional</span>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-xs sm:text-sm">
          <thead>
            <tr class="border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider bg-slate-950/40">
              <th class="p-3">Equipo</th>
              <th class="p-3">Estado</th>
              <th class="p-3 text-center">G</th>
              <th class="p-3 text-center">P</th>
              <th class="p-3 text-center">PCT</th>
              <th class="p-3 text-center">DIF</th>
              <th class="p-3 text-center">Racha</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/40">
            ${tableRows}
          </tbody>
        </table>
      </div>
    `;

    container.appendChild(divWrapper);
  });
}

export function filterDivisionTable(divKey) {
  currentDivisionFilter = divKey;

  ['all', 'este', 'central', 'oeste'].forEach(k => {
    const btn = document.getElementById(`tab-div-${k}`);
    if (!btn) return;
    if (k === divKey) {
      btn.className = "px-3 py-1.5 rounded-lg bg-orange-500 text-slate-900 transition font-bold";
    } else {
      btn.className = "px-3 py-1.5 rounded-lg text-slate-400 hover:text-white transition";
    }
  });

  if (rawStandingsData) {
    renderGroupedStandings(rawStandingsData);
  }
}

function renderFallbackStandingsGrouped() {
  const container = document.getElementById('standings-divisions-container');
  if (!container) return;

  const fallbackDivs = [
    { title: "División Este", teams: [144, 146, 121, 143, 120] },
    { title: "División Central", teams: [112, 113, 158, 134, 138] },
    { title: "División Oeste", teams: [109, 115, 119, 135, 137] }
  ];

  container.innerHTML = '';
  fallbackDivs.forEach(div => {
    let rows = '';
    div.teams.forEach((id, idx) => {
      const item = nlTeamsDatabase[id];
      rows += `
        <tr class="border-b border-slate-800/40">
          <td class="p-3 font-semibold text-white flex items-center space-x-2">
            <span class="w-5 text-center font-mono text-xs text-slate-500">${idx + 1}</span>
            <span>${item.fullName}</span>
          </td>
          <td class="p-3 text-slate-400 text-xs sm:text-sm">${item.state}</td>
          <td class="p-3 text-center font-mono font-bold text-emerald-400">0</td>
          <td class="p-3 text-center font-mono font-bold text-rose-400">0</td>
          <td class="p-3 text-center font-mono text-amber-300 font-semibold">.000</td>
          <td class="p-3 text-center font-mono text-slate-300 text-xs sm:text-sm">-</td>
          <td class="p-3 text-center font-mono text-xs text-slate-500">-</td>
        </tr>
      `;
    });

    container.innerHTML += `
      <div class="bg-slate-900/60 rounded-xl border border-slate-700/70 overflow-hidden">
        <div class="px-4 py-2.5 bg-slate-800/80 border-b border-slate-700">
          <span class="font-black text-sm uppercase tracking-wider text-slate-200">${div.title}</span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr class="border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider bg-slate-950/40">
                <th class="p-3">Equipo</th>
                <th class="p-3">Estado</th>
                <th class="p-3 text-center">G</th>
                <th class="p-3 text-center">P</th>
                <th class="p-3 text-center">PCT</th>
                <th class="p-3 text-center">DIF</th>
                <th class="p-3 text-center">Racha</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/40">${rows}</tbody>
          </table>
        </div>
      </div>
    `;
  });
}