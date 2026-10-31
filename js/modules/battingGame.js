// js/modules/battingGame.js

// Lineup oficial de bateadores
const LINEUP = [
  { name: '1. R. Acuña Jr.', number: '13', avg: '.337', hand: 'R' },
  { name: '2. M. Betts', number: '50', avg: '.307', hand: 'R' },
  { name: '3. F. Freeman', number: '5', avg: '.331', hand: 'L' },
  { name: '4. M. Machado', number: '13', avg: '.288', hand: 'R' },
  { name: '5. P. Goldschmidt', number: '46', avg: '.295', hand: 'R' },
  { name: '6. F. Lindor', number: '12', avg: '.274', hand: 'R' },
  { name: '7. C. Carroll', number: '7', avg: '.285', hand: 'L' },
  { name: '8. J. Realmuto', number: '10', avg: '.265', hand: 'R' },
  { name: '9. N. Arenado', number: '28', avg: '.282', hand: 'R' }
];

export const gameState = {
  running: false,
  canvas: null,
  ctx: null,
  animId: null,
  pitchTimeoutId: null,
  ball: {
    startX: 200,
    startY: 170,
    targetX: 200,
    targetY: 350,
    x: 200,
    y: 170,
    radius: 4,
    progress: 0,
    speed: 0.015,
    breakAmount: 0,
    active: false,
    trail: []
  },
  runs: 0,
  hits: 0,
  outs: 0,
  maxOuts: 3,
  balls: 0,
  strikes: 0,
  bases: [false, false, false],
  currentBatterIndex: 0,
  currentPitch: { name: 'Esperando...', color: '#f59e0b', speed: '00', label: '---' },
  batterSwinging: false,
  batterSwingFrame: 0,
  pitcherWindup: 0,
  isPreparingPitch: false,
  particles: [],
  feedbackText: null,
  feedbackTimer: 0
};

// Zona de Strike alineada sobre Home Plate
const strikeZone = {
  x: 162,
  y: 300,
  width: 76,
  height: 98
};

// Quiebres laterales controlados en píxeles
const PITCH_REPERTOIRE = [
  { name: '4-Seam Fastball', speedProg: 0.023, breakPixels: 0, color: '#ef4444', speed: '99' },
  { name: 'Sweeper / Slider', speedProg: 0.018, breakPixels: 18, color: '#fbbf24', speed: '88' },
  { name: '12-6 Curveball', speedProg: 0.016, breakPixels: -16, color: '#38bdf8', speed: '81' },
  { name: 'Screwball', speedProg: 0.017, breakPixels: 20, color: '#c084fc', speed: '84' },
  { name: 'Circle Changeup', speedProg: 0.014, breakPixels: -6, color: '#34d399', speed: '77' },
  { name: 'Heavy Sinker', speedProg: 0.021, breakPixels: -10, color: '#fb923c', speed: '94' }
];

export function initGameCanvas() {
  gameState.canvas = document.getElementById('gameCanvas');
  if (!gameState.canvas) return;
  gameState.ctx = gameState.canvas.getContext('2d');
  updateScoreboard();
  drawGameScene();
  setupButtonListeners();
  checkGameOrientation();
}

export function startGame() {
  // Limpiar estados o ciclos previos
  if (gameState.pitchTimeoutId) {
    clearTimeout(gameState.pitchTimeoutId);
    gameState.pitchTimeoutId = null;
  }
  if (gameState.animId) {
    cancelAnimationFrame(gameState.animId);
    gameState.animId = null;
  }

  gameState.running = true;
  gameState.runs = 0;
  gameState.hits = 0;
  gameState.outs = 0;
  gameState.balls = 0;
  gameState.strikes = 0;
  gameState.bases = [false, false, false];
  gameState.currentBatterIndex = 0;
  gameState.particles = [];
  gameState.feedbackText = null;
  gameState.ball.active = false;
  gameState.batterSwinging = false;
  gameState.batterSwingFrame = 0;

  updateScoreboard();

  const startBtn = document.getElementById('btn-start');
  const stopBtn = document.getElementById('btn-stop');
  const swingBtn = document.getElementById('btn-swing');

  if (startBtn) startBtn.disabled = true;
  if (stopBtn) stopBtn.disabled = false;
  if (swingBtn) swingBtn.disabled = true;

  queueNextPitch(800);
}

export function stopGame() {
  // Registrar carreras acumuladas para el equipo si el juego estaba en curso
  if (gameState.running) {
    if (gameState.runs > 0 && typeof window.recordRunsForRepresentedTeam === 'function') {
      window.recordRunsForRepresentedTeam(gameState.runs);
    }
    if (typeof window.recordGameStats === 'function') {
      window.recordGameStats(gameState.runs, gameState.hits);
    }
  }

  gameState.running = false;
  gameState.ball.active = false;
  gameState.isPreparingPitch = false;
  gameState.batterSwinging = false;
  gameState.batterSwingFrame = 0;

  if (gameState.pitchTimeoutId) {
    clearTimeout(gameState.pitchTimeoutId);
    gameState.pitchTimeoutId = null;
  }
  if (gameState.animId) {
    cancelAnimationFrame(gameState.animId);
    gameState.animId = null;
  }

  const startBtn = document.getElementById('btn-start');
  const stopBtn = document.getElementById('btn-stop');
  const swingBtn = document.getElementById('btn-swing');

  if (startBtn) startBtn.disabled = false;
  if (stopBtn) stopBtn.disabled = true;
  if (swingBtn) swingBtn.disabled = true;

  const pitchDisplay = document.getElementById('pitch-type');
  if (pitchDisplay) {
    pitchDisplay.innerHTML = `<span class="text-rose-400 font-bold">Juego Detenido (${gameState.runs} R registradas)</span>`;
  }

  drawGameScene();
  drawStoppedOverlay();
}

function drawStoppedOverlay() {
  const ctx = gameState.ctx;
  if (!ctx || !gameState.canvas) return;

  const w = gameState.canvas.width;
  const h = gameState.canvas.height;

  ctx.save();
  ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = "#ef4444";
  ctx.font = "900 24px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("PARTIDO DETENIDO", w / 2, h / 2 - 10);

  ctx.fillStyle = "#38bdf8";
  ctx.font = "700 20px monospace";
  ctx.fillText(`${gameState.runs} CARRERAS SUMADAS AL TORNEO`, w / 2, h / 2 + 18);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "600 13px system-ui, sans-serif";
  ctx.fillText("Pulsa 'Play Ball / Iniciar' para volver a jugar", w / 2, h / 2 + 48);
  ctx.restore();
}

function queueNextPitch(delayMs = 1800) {
  if (gameState.outs >= gameState.maxOuts || !gameState.running) return;

  gameState.isPreparingPitch = true;
  const swingBtn = document.getElementById('btn-swing');
  if (swingBtn) swingBtn.disabled = true;

  const pitchDisplay = document.getElementById('pitch-type');
  if (pitchDisplay) {
    pitchDisplay.innerHTML = `<span class="text-amber-300 italic">Lanzador preparándose...</span>`;
  }

  if (gameState.pitchTimeoutId) {
    clearTimeout(gameState.pitchTimeoutId);
  }

  gameState.pitchTimeoutId = setTimeout(() => {
    if (!gameState.running) return;
    executePitch();
  }, delayMs);
}

function executePitch() {
  if (gameState.outs >= gameState.maxOuts || !gameState.running) {
    endGame();
    return;
  }

  gameState.isPreparingPitch = false;
  const pitch = PITCH_REPERTOIRE[Math.floor(Math.random() * PITCH_REPERTOIRE.length)];
  gameState.currentPitch = pitch;

  const pitchDisplay = document.getElementById('pitch-type');
  if (pitchDisplay) {
    pitchDisplay.innerHTML = `<span style="color: ${pitch.color}; font-weight: 800;">${pitch.name}</span> <span class="text-xs text-slate-400 font-mono">(${pitch.speed} MPH)</span>`;
  }

  const isIntentionalBall = Math.random() < 0.05; 
  let finalTargetX;
  let finalTargetY;

  if (isIntentionalBall) {
    finalTargetX = Math.random() > 0.5 ? 245 : 155;
    finalTargetY = Math.random() > 0.5 ? 405 : 290;
  } else {
    finalTargetX = 172 + Math.random() * 56;
    finalTargetY = 320 + Math.random() * 55;
  }

  gameState.pitcherWindup = 25;
  gameState.ball.startX = 200;
  gameState.ball.startY = 170;
  gameState.ball.targetX = finalTargetX;
  gameState.ball.targetY = finalTargetY;
  gameState.ball.progress = 0;
  gameState.ball.speed = pitch.speedProg;
  gameState.ball.breakAmount = pitch.breakPixels;
  gameState.ball.radius = 4;
  gameState.ball.x = 200;
  gameState.ball.y = 170;
  gameState.ball.trail = [];
  gameState.ball.active = true;

  const swingBtn = document.getElementById('btn-swing');
  if (swingBtn) swingBtn.disabled = false;

  if (gameState.animId) cancelAnimationFrame(gameState.animId);
  animateGame();
}

function animateGame() {
  if (!gameState.running) return;

  for (let i = gameState.particles.length - 1; i >= 0; i--) {
    const p = gameState.particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.alpha -= 0.03;
    if (p.alpha <= 0) gameState.particles.splice(i, 1);
  }

  if (gameState.pitcherWindup > 0) gameState.pitcherWindup--;

  if (gameState.ball.active) {
    gameState.ball.progress += gameState.ball.speed;
    const t = gameState.ball.progress;

    const curveOffset = Math.sin(t * Math.PI) * gameState.ball.breakAmount;
    gameState.ball.x = (gameState.ball.startX + (gameState.ball.targetX - gameState.ball.startX) * t) + curveOffset;
    gameState.ball.y = gameState.ball.startY + (gameState.ball.targetY - gameState.ball.startY) * t;

    gameState.ball.radius = 4 + t * 14;

    gameState.ball.trail.push({ x: gameState.ball.x, y: gameState.ball.y, r: gameState.ball.radius });
    if (gameState.ball.trail.length > 7) gameState.ball.trail.shift();

    if (t >= 1.0) {
      gameState.ball.active = false;

      const inZoneX = gameState.ball.x >= strikeZone.x && gameState.ball.x <= (strikeZone.x + strikeZone.width);
      const inZoneY = gameState.ball.y >= strikeZone.y && gameState.ball.y <= (strikeZone.y + strikeZone.height);

      if (inZoneX && inZoneY) {
        handleStrike(true);
      } else {
        handleBall();
      }

      updateScoreboard();
      if (gameState.outs < gameState.maxOuts) {
        queueNextPitch(1600);
      } else {
        endGame();
      }
      return;
    }
  }

  if (gameState.batterSwinging) {
    gameState.batterSwingFrame++;
    if (gameState.batterSwingFrame > 14) {
      gameState.batterSwinging = false;
      gameState.batterSwingFrame = 0;
    }
  }

  drawGameScene();
  gameState.animId = requestAnimationFrame(animateGame);
}

export function swingBat() {
  if (!gameState.running || !gameState.ball.active) return;

  const swingBtn = document.getElementById('btn-swing');
  if (swingBtn) swingBtn.disabled = true;

  gameState.batterSwinging = true;
  gameState.batterSwingFrame = 1;

  const bx = gameState.ball.x;
  const by = gameState.ball.y;

  gameState.ball.active = false;

  const inStrikeY = by >= strikeZone.y - 10 && by <= (strikeZone.y + strikeZone.height + 15);
  const inStrikeX = bx >= strikeZone.x - 12 && bx <= (strikeZone.x + strikeZone.width + 12);

  if (inStrikeX && inStrikeY) {
    createImpactSparks(bx, by);

    const hitRnd = Math.random();
    if (hitRnd < 0.60) {
      handleHit(1);
    } else if (hitRnd < 0.85) {
      handleHit(2);
    } else if (hitRnd < 0.95) {
      handleHit(4);
    } else {
      handleFlyOut();
    }
  } else {
    handleStrike(false);
  }

  updateScoreboard();
  if (gameState.outs < gameState.maxOuts) {
    queueNextPitch(1600);
  } else {
    endGame();
  }
}

function handleBall() {
  gameState.balls++;
  if (gameState.balls >= 4) {
    triggerFeedback("¡BASE POR BOLAS!", "#10b981");
    advanceRunnersWalk();
    nextBatter();
  } else {
    triggerFeedback("¡BOLA!", "#10b981");
  }
}

function handleStrike(isCalled) {
  gameState.strikes++;
  if (gameState.strikes >= 3) {
    gameState.outs++;
    triggerFeedback("¡PONCHE! OUT", "#f43f5e");
    nextBatter();
  } else {
    triggerFeedback(isCalled ? "STRIKE CANTADO" : "¡SWING Y STRIKE!", "#f43f5e");
  }
}

function handleFlyOut() {
  gameState.outs++;
  triggerFeedback("¡ELEVADO DE OUT!", "#f43f5e");
  nextBatter();
}

function handleHit(basesToAdvance) {
  gameState.hits++;

  if (basesToAdvance === 4) {
    let scored = 1;
    for (let i = 0; i < 3; i++) {
      if (gameState.bases[i]) {
        scored++;
        gameState.bases[i] = false;
      }
    }
    gameState.runs += scored;
    if (typeof window.addCoins === 'function') {
      window.addCoins(scored, `¡HOME RUN! (+${scored} R, +${scored} 🪙)`);
    }
    triggerFeedback(`¡HOME RUN! (+${scored} R, +${scored} 🪙)`, "#fbbf24");
  } else if (basesToAdvance === 2) {
    let scored = 0;
    if (gameState.bases[2]) { scored++; gameState.bases[2] = false; }
    if (gameState.bases[1]) { scored++; gameState.bases[1] = false; }
    if (gameState.bases[0]) { gameState.bases[2] = true; gameState.bases[0] = false; }
    gameState.bases[1] = true;
    gameState.runs += scored;
    if (scored > 0 && typeof window.addCoins === 'function') {
      window.addCoins(scored, `¡DOBLETE IMPULSOR! (+${scored} 🪙)`);
    }
    triggerFeedback(scored > 0 ? `¡DOBLETE! (+${scored} R, +${scored} 🪙)` : "¡DOBLE!", "#38bdf8");
  } else {
    let scored = 0;
    if (gameState.bases[2]) { scored++; gameState.bases[2] = false; }
    if (gameState.bases[1]) { gameState.bases[2] = true; gameState.bases[1] = false; }
    if (gameState.bases[0]) { gameState.bases[1] = true; gameState.bases[0] = false; }
    gameState.bases[0] = true;
    gameState.runs += scored;
    if (scored > 0 && typeof window.addCoins === 'function') {
      window.addCoins(scored, `¡HIT IMPULSOR! (+${scored} 🪙)`);
    }
    triggerFeedback(scored > 0 ? `¡HIT IMPULSOR! (+${scored} R, +${scored} 🪙)` : "¡SENCILLO!", "#fbbf24");
  }

  nextBatter();
}

function advanceRunnersWalk() {
  if (gameState.bases[0]) {
    if (gameState.bases[1]) {
      if (gameState.bases[2]) {
        gameState.runs++;
        if (typeof window.addCoins === 'function') {
          window.addCoins(1, "¡Carrera impulsada por Base por Bolas! (+1 🪙)");
        }
      } else {
        gameState.bases[2] = true;
      }
    } else {
      gameState.bases[1] = true;
    }
  }
  gameState.bases[0] = true;
}

function nextBatter() {
  gameState.balls = 0;
  gameState.strikes = 0;
  gameState.currentBatterIndex = (gameState.currentBatterIndex + 1) % LINEUP.length;
}

function createImpactSparks(x, y) {
  for (let i = 0; i < 24; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 5;
    gameState.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1.5,
      alpha: 1,
      color: Math.random() > 0.4 ? '#fbbf24' : '#ffffff',
      size: 2 + Math.random() * 2.5
    });
  }
}

function triggerFeedback(text, color) {
  gameState.feedbackText = { text, color };
  gameState.feedbackTimer = 60;
}

function updateScoreboard() {
  const runs = document.getElementById('score-runs');
  const hits = document.getElementById('score-hits');
  const outs = document.getElementById('score-outs');
  const balls = document.getElementById('ball-count');
  const strikes = document.getElementById('strike-count');
  const batterName = document.getElementById('current-batter-name');
  const batterAvg = document.getElementById('current-batter-avg');

  if (runs) runs.textContent = gameState.runs;
  if (hits) hits.textContent = gameState.hits;
  if (outs) outs.textContent = `${gameState.outs}/3`;
  if (balls) balls.textContent = gameState.balls;
  if (strikes) strikes.textContent = gameState.strikes;

  const cur = LINEUP[gameState.currentBatterIndex];
  if (batterName) batterName.textContent = cur.name;
  if (batterAvg) batterAvg.textContent = `${cur.avg} AVG`;

  const b1 = document.getElementById('base-indicator-1');
  const b2 = document.getElementById('base-indicator-2');
  const b3 = document.getElementById('base-indicator-3');

  if (b1) toggleBaseClass(b1, gameState.bases[0]);
  if (b2) toggleBaseClass(b2, gameState.bases[1]);
  if (b3) toggleBaseClass(b3, gameState.bases[2]);
}

function toggleBaseClass(el, active) {
  if (active) {
    el.className = "px-2.5 py-1 rounded bg-amber-500 text-slate-950 font-black border border-amber-400 shadow-md shadow-amber-500/30";
  } else {
    el.className = "px-2.5 py-1 rounded bg-slate-900 text-slate-500 border border-slate-700";
  }
}

function endGame() {
  // Guardamos las carreras antes de reiniciar/detener
  const finalRuns = gameState.runs;

  stopGame();
  const pitchDisplay = document.getElementById('pitch-type');
  if (pitchDisplay) pitchDisplay.textContent = 'Inning Terminado';

  const ctx = gameState.ctx;
  if (!ctx) return;

  ctx.save();
  ctx.fillStyle = "rgba(10, 15, 30, 0.95)";
  ctx.roundRect(30, 115, 340, 230, 16);
  ctx.fill();
  ctx.strokeStyle = "#f59e0b";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.font = "900 24px system-ui, sans-serif";
  ctx.fillStyle = "#fbbf24";
  ctx.textAlign = "center";
  ctx.fillText("¡3 OUTS - ENTRADA TERMINADA!", 200, 165);

  ctx.font = "700 32px monospace";
  ctx.fillStyle = "#38bdf8";
  ctx.fillText(`${finalRuns} CARRERAS`, 200, 215);

  ctx.font = "600 15px system-ui, sans-serif";
  ctx.fillStyle = "#f8fafc";
  ctx.fillText(`Hits totales: ${gameState.hits}`, 200, 255);

  ctx.font = "13px system-ui, sans-serif";
  ctx.fillStyle = "#94a3b8";
  ctx.fillText("Pulsa 'Play Ball' para jugar otra entrada", 200, 295);
  ctx.restore();
}

function drawGameScene() {
  const ctx = gameState.ctx;
  if (!ctx || !gameState.canvas) return;

  const w = gameState.canvas.width;
  const h = gameState.canvas.height;

  ctx.clearRect(0, 0, w, h);

  const sky = ctx.createLinearGradient(0, 0, 0, 120);
  sky.addColorStop(0, '#030712');
  sky.addColorStop(1, '#0f172a');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, 120);

  drawVolumetricBeam(ctx, 35, 30, 110, 180);
  drawVolumetricBeam(ctx, 365, 30, 290, 180);

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 85, w, 30);
  for (let i = 0; i < w; i += 6) {
    ctx.fillStyle = (i % 12 === 0) ? '#475569' : '#334155';
    ctx.fillRect(i, 88 + (i % 4), 3.5, 18);
  }

  ctx.fillStyle = '#064e3b';
  ctx.fillRect(0, 115, w, 28);
  ctx.fillStyle = '#facc15';
  ctx.fillRect(0, 115, w, 3);

  drawStadiumLight(ctx, 35, 30);
  drawStadiumLight(ctx, 365, 30);

  ctx.fillStyle = '#14532d';
  ctx.fillRect(0, 143, w, 110);
  ctx.fillStyle = '#15803d';
  for (let x = 0; x < w; x += 36) {
    if ((x / 36) % 2 === 0) {
      ctx.fillRect(x, 143, 36, 110);
    }
  }

  ctx.fillStyle = '#78350f';
  ctx.beginPath();
  ctx.moveTo(200, 160);
  ctx.lineTo(395, 255);
  ctx.lineTo(330, 460);
  ctx.lineTo(70, 460);
  ctx.lineTo(5, 255);
  ctx.closePath();
  ctx.fill();

  const grassInfield = ctx.createLinearGradient(0, 180, 0, 310);
  grassInfield.addColorStop(0, '#166534');
  grassInfield.addColorStop(1, '#14532d');
  ctx.fillStyle = grassInfield;
  ctx.beginPath();
  ctx.ellipse(200, 235, 115, 45, 0, 0, Math.PI);
  ctx.fill();

  ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
  ctx.lineWidth = 2.5;

  ctx.beginPath();
  ctx.moveTo(200, 415);
  ctx.lineTo(5, 255);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(200, 415);
  ctx.lineTo(395, 255);
  ctx.stroke();

  ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(5, 255);
  ctx.lineTo(200, 160);
  ctx.lineTo(395, 255);
  ctx.stroke();

  drawBasePlate(ctx, 200, 160, 9, 5, gameState.bases[1]);
  drawBasePlate(ctx, 10, 255, 12, 7, gameState.bases[2]);
  drawBasePlate(ctx, 390, 255, 12, 7, gameState.bases[0]);

  const moundGrad = ctx.createRadialGradient(200, 182, 4, 200, 182, 32);
  moundGrad.addColorStop(0, '#a16207');
  moundGrad.addColorStop(1, '#78350f');
  ctx.fillStyle = moundGrad;
  ctx.beginPath();
  ctx.ellipse(200, 185, 34, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(193, 182, 14, 2.5);

  drawPitcherPro(ctx, 200, 178, gameState.pitcherWindup > 0 || gameState.isPreparingPitch);

  ctx.strokeStyle = "rgba(255, 255, 255, 0.65)";
  ctx.lineWidth = 1.8;
  ctx.strokeRect(122, 365, 38, 72);
  ctx.strokeRect(240, 365, 38, 72);

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(184, 400);
  ctx.lineTo(216, 400);
  ctx.lineTo(216, 414);
  ctx.lineTo(200, 426);
  ctx.lineTo(184, 414);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = "rgba(245, 158, 11, 0.08)";
  ctx.fillRect(strikeZone.x, strikeZone.y, strikeZone.width, strikeZone.height);

  ctx.strokeStyle = "rgba(245, 158, 11, 0.9)";
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 4]);
  ctx.strokeRect(strikeZone.x, strikeZone.y, strikeZone.width, strikeZone.height);
  ctx.setLineDash([]);

  ctx.strokeStyle = "rgba(245, 158, 11, 0.25)";
  ctx.lineWidth = 1;
  const colW = strikeZone.width / 3;
  const rowH = strikeZone.height / 3;
  ctx.strokeRect(strikeZone.x + colW, strikeZone.y, colW, strikeZone.height);
  ctx.strokeRect(strikeZone.x, strikeZone.y + rowH, strikeZone.width, rowH);

  drawBatterPro(ctx, 260, 368);

  if (gameState.ball.active) {
    gameState.ball.trail.forEach((pos, idx) => {
      const alpha = (idx / gameState.ball.trail.length) * 0.4;
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, pos.r * 0.8, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
    ctx.beginPath();
    ctx.ellipse(gameState.ball.x, 418, gameState.ball.radius * 0.85, gameState.ball.radius * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();

    const ballGrad = ctx.createRadialGradient(
      gameState.ball.x - gameState.ball.radius * 0.3,
      gameState.ball.y - gameState.ball.radius * 0.3,
      1,
      gameState.ball.x,
      gameState.ball.y,
      gameState.ball.radius
    );
    ballGrad.addColorStop(0, '#ffffff');
    ballGrad.addColorStop(0.85, '#e2e8f0');
    ballGrad.addColorStop(1, '#94a3b8');

    ctx.fillStyle = ballGrad;
    ctx.beginPath();
    ctx.arc(gameState.ball.x, gameState.ball.y, gameState.ball.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#dc2626";
    ctx.lineWidth = Math.max(1, gameState.ball.radius * 0.12);
    ctx.beginPath();
    ctx.arc(gameState.ball.x - (gameState.ball.radius * 0.35), gameState.ball.y, gameState.ball.radius * 0.65, -0.6, 0.6);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(gameState.ball.x + (gameState.ball.radius * 0.35), gameState.ball.y, gameState.ball.radius * 0.65, Math.PI - 0.6, Math.PI + 0.6);
    ctx.stroke();
  }

  gameState.particles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  drawBroadcastOverlay(ctx);

  if (gameState.feedbackText && gameState.feedbackTimer > 0) {
    gameState.feedbackTimer--;
    ctx.save();
    ctx.font = "900 28px system-ui, sans-serif";
    ctx.fillStyle = gameState.feedbackText.color;
    ctx.textAlign = "center";
    ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
    ctx.shadowBlur = 12;
    ctx.fillText(gameState.feedbackText.text, 200, 245);
    ctx.restore();
  }
}

function drawBasePlate(ctx, cx, cy, w, h, isOccupied) {
  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
  ctx.beginPath();
  ctx.ellipse(cx, cy + 2, w, h * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = isOccupied ? '#f59e0b' : '#f8fafc';
  ctx.strokeStyle = isOccupied ? '#d97706' : '#cbd5e1';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx, cy - h);
  ctx.lineTo(cx + w, cy);
  ctx.lineTo(cx + h, cy);
  ctx.lineTo(cx - w, cy);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  if (isOccupied) {
    ctx.fillStyle = '#1e3a8a';
    ctx.beginPath();
    ctx.arc(cx, cy - h - 5, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ea580c';
    ctx.fillRect(cx - 2, cy - h - 10, 4, 3);
  }

  ctx.restore();
}

function drawPitcherPro(ctx, x, y, isWindup) {
  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
  ctx.beginPath();
  ctx.ellipse(x, y + 6, 9, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f1f5f9';
  if (isWindup) {
    ctx.fillRect(x - 3, y - 5, 2.5, 9);
    ctx.beginPath();
    ctx.moveTo(x + 1, y - 5);
    ctx.lineTo(x + 5, y - 9);
    ctx.lineTo(x + 7, y - 5);
    ctx.lineTo(x + 3, y - 2);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillRect(x - 3, y - 5, 2.5, 9);
    ctx.fillRect(x + 0.5, y - 5, 2.5, 9);
  }

  ctx.fillStyle = '#1d4ed8';
  ctx.beginPath();
  ctx.ellipse(x, y - 11, 5.5, 7.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.arc(x, y - 20, 3.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#1e3a8a';
  ctx.fillRect(x - 2, y - 23, 4, 2);
  ctx.restore();
}

function drawBatterPro(ctx, bx, by) {
  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
  ctx.beginPath();
  ctx.ellipse(bx + 10, by + 58, 17, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f8fafc";
  ctx.beginPath();
  ctx.moveTo(bx + 3, by + 28);
  ctx.lineTo(bx - 3, by + 56);
  ctx.lineTo(bx + 4, by + 56);
  ctx.lineTo(bx + 9, by + 30);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(bx + 13, by + 28);
  ctx.lineTo(bx + 17, by + 56);
  ctx.lineTo(bx + 24, by + 56);
  ctx.lineTo(bx + 19, by + 30);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#ea580c";
  ctx.fillRect(bx + 3, by + 26, 17, 3);

  ctx.fillStyle = "#1e3a8a";
  ctx.beginPath();
  ctx.moveTo(bx + 2, by + 26);
  ctx.lineTo(bx, by + 6);
  ctx.lineTo(bx + 20, by + 6);
  ctx.lineTo(bx + 20, by + 26);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#ea580c";
  ctx.beginPath();
  ctx.arc(bx + 8, by - 4, 8.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#c2410c";
  ctx.beginPath();
  ctx.ellipse(bx + 2, by - 3, 5.5, 2.2, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(bx + 5, by - 2, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  let swingAngle = -0.55;
  const pivotX = bx + 4;
  const pivotY = by + 7;

  if (gameState.batterSwinging) {
    swingAngle = -0.55 - (gameState.batterSwingFrame / 14) * 2.2;
  }

  ctx.translate(pivotX, pivotY);
  ctx.rotate(swingAngle);

  const batGrad = ctx.createLinearGradient(0, 0, 0, -58);
  batGrad.addColorStop(0, '#78350f');
  batGrad.addColorStop(0.3, '#d97706');
  batGrad.addColorStop(1, '#fef08a');
  ctx.fillStyle = batGrad;

  ctx.beginPath();
  ctx.moveTo(-2, 0);
  ctx.lineTo(-4, -58);
  ctx.lineTo(4, -58);
  ctx.lineTo(2, 0);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(0, 0, 3.6, 0, Math.PI * 2);
  ctx.arc(0, -5, 3.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
  ctx.restore();
}

function drawBroadcastOverlay(ctx) {
  ctx.save();

  ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
  ctx.roundRect(280, 12, 108, 38, 8);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.font = "800 11px system-ui, sans-serif";
  ctx.fillStyle = "#94a3b8";
  ctx.fillText("RADAR STATCAST", 288, 26);

  ctx.font = "900 16px monospace";
  ctx.fillStyle = gameState.currentPitch.color || "#fbbf24";
  ctx.fillText(`${gameState.currentPitch.speed || '00'} MPH`, 288, 43);

  ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
  ctx.roundRect(12, 12, 130, 48, 8);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
  ctx.stroke();

  drawMiniDiamond(ctx, 32, 34);

  ctx.font = "900 10px monospace";

  ctx.fillStyle = "#94a3b8";
  ctx.fillText("B", 58, 24);
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i < gameState.balls ? "#10b981" : "#334155";
    ctx.beginPath();
    ctx.arc(70 + i * 9, 21, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#94a3b8";
  ctx.fillText("S", 58, 36);
  for (let i = 0; i < 2; i++) {
    ctx.fillStyle = i < gameState.strikes ? "#ef4444" : "#334155";
    ctx.beginPath();
    ctx.arc(70 + i * 9, 33, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#94a3b8";
  ctx.fillText("O", 58, 48);
  for (let i = 0; i < 2; i++) {
    ctx.fillStyle = i < gameState.outs ? "#f59e0b" : "#334155";
    ctx.beginPath();
    ctx.arc(70 + i * 9, 45, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawMiniDiamond(ctx, x, y) {
  ctx.fillStyle = gameState.bases[1] ? '#f59e0b' : '#334155';
  ctx.fillRect(x - 3, y - 10, 6, 6);

  ctx.fillStyle = gameState.bases[2] ? '#f59e0b' : '#334155';
  ctx.fillRect(x - 10, y - 3, 6, 6);

  ctx.fillStyle = gameState.bases[0] ? '#f59e0b' : '#334155';
  ctx.fillRect(x + 4, y - 3, 6, 6);
}

function drawStadiumLight(ctx, x, y) {
  ctx.save();
  ctx.fillStyle = '#475569';
  ctx.fillRect(x - 2, y, 4, 85);
  ctx.fillStyle = '#64748b';
  ctx.fillRect(x - 14, y - 10, 28, 10);

  ctx.fillStyle = '#fef08a';
  for (let i = -10; i <= 10; i += 7) {
    ctx.beginPath();
    ctx.arc(x + i, y - 5, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawVolumetricBeam(ctx, x, y, targetX, targetY) {
  ctx.save();
  const beam = ctx.createRadialGradient(x, y, 5, targetX, targetY, 180);
  beam.addColorStop(0, 'rgba(254, 240, 138, 0.15)');
  beam.addColorStop(1, 'rgba(254, 240, 138, 0)');
  ctx.fillStyle = beam;
  ctx.beginPath();
  ctx.moveTo(x - 12, y);
  ctx.lineTo(targetX - 70, targetY);
  ctx.lineTo(targetX + 70, targetY);
  ctx.lineTo(x + 12, y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// Vinculación directa de eventos del DOM
function setupButtonListeners() {
  const startBtn = document.getElementById('btn-start');
  const stopBtn = document.getElementById('btn-stop');
  const swingBtn = document.getElementById('btn-swing');

  if (startBtn) {
    startBtn.onclick = null;
    startBtn.addEventListener('click', startGame);
  }
  if (stopBtn) {
    stopBtn.onclick = null;
    stopBtn.addEventListener('click', stopGame);
  }
  if (swingBtn) {
    swingBtn.onclick = null;
    swingBtn.addEventListener('click', swingBat);
  }
}


// -------------------------------------------------------------
// CONTROLADOR DE ORIENTACIÓN LANDSCAPE Y PANTALLA COMPLETA
// -------------------------------------------------------------

export async function launchGameFullscreen() {
  const gameSection = document.getElementById('page-juego');
  if (!gameSection) return;

  try {
    if (!document.fullscreenElement) {
      if (gameSection.requestFullscreen) {
        await gameSection.requestFullscreen();
      } else if (gameSection.webkitRequestFullscreen) {
        await gameSection.webkitRequestFullscreen();
      }
    }
  } catch (err) {
    console.warn('Fullscreen request:', err);
  }

  try {
    if (screen.orientation && screen.orientation.lock) {
      await screen.orientation.lock('landscape');
    }
  } catch (err) {
    console.warn('Orientation lock:', err);
  }

  checkGameOrientation();
}

export function toggleGameFullscreen() {
  if (document.fullscreenElement) {
    if (document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    }
  } else {
    launchGameFullscreen();
  }
}

export function checkGameOrientation() {
  const blocker = document.getElementById('game-orientation-blocker');
  if (!blocker) return;

  const isPortraitMobile = window.matchMedia('(orientation: portrait) and (max-width: 1024px)').matches;
  if (isPortraitMobile) {
    blocker.classList.remove('hidden');
    blocker.classList.add('flex');
    if (gameState.running) {
      stopGame();
    }
  } else {
    blocker.classList.add('hidden');
    blocker.classList.remove('flex');
  }
}

function handleFullscreenChange() {
  const btn = document.getElementById('btn-game-fullscreen');
  const icon = document.getElementById('icon-game-fullscreen');
  if (!btn || !icon) return;

  if (document.fullscreenElement) {
    icon.innerHTML = `
      <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
    `;
    btn.setAttribute('title', 'Salir de Pantalla Completa');
  } else {
    icon.innerHTML = `
      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
    `;
    btn.setAttribute('title', 'Pantalla Completa');
  }
}

window.addEventListener('resize', checkGameOrientation);
window.addEventListener('orientationchange', checkGameOrientation);
if (screen.orientation) {
  screen.orientation.addEventListener('change', checkGameOrientation);
}
document.addEventListener('fullscreenchange', handleFullscreenChange);
document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

// Exposición global a window (asegura compatibilidad total con llamadas inline y módulos ES6)
window.startGame = startGame;
window.stopGame = stopGame;
window.swingBat = swingBat;
window.initGameCanvas = initGameCanvas;
window.launchGameFullscreen = launchGameFullscreen;
window.toggleGameFullscreen = toggleGameFullscreen;
window.checkGameOrientation = checkGameOrientation;

// Auto-inicialización cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGameCanvas);
} else {
  initGameCanvas();
}