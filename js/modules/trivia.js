// Módulo de Trivia de Béisbol
import { baseballQuestionsBank } from '../data/triviaQuestions.js';

let currentQuizQuestions = [];
let currentQuizIndex = 0;
let triviaScore = 0;
const QUIZ_LENGTH = 10;

export function initNewTriviaGame() {
  const shuffled = [...baseballQuestionsBank].sort(() => Math.random() - 0.5);
  currentQuizQuestions = shuffled.slice(0, QUIZ_LENGTH);
  currentQuizIndex = 0;
  triviaScore = 0;
  renderQuestion();
}

function renderQuestion() {
  const q = currentQuizQuestions[currentQuizIndex];
  if (!q) return;

  const progressEl = document.getElementById('trivia-progress');
  const questionEl = document.getElementById('trivia-question');
  const optionsContainer = document.getElementById('trivia-options');

  if (progressEl) progressEl.innerText = `Pregunta ${currentQuizIndex + 1} de ${QUIZ_LENGTH} • Aciertos: ${triviaScore}`;
  if (questionEl) questionEl.innerText = q.q;
  if (!optionsContainer) return;

  optionsContainer.innerHTML = '';

  q.options.forEach((opt, index) => {
    const btn = document.createElement('button');
    btn.className = "w-full text-left bg-slate-700/50 hover:bg-slate-700 p-4 rounded-xl border border-slate-600 transition font-medium flex items-center justify-between";
    btn.innerHTML = `<span>${opt}</span><i data-lucide="circle" class="w-4 h-4 text-slate-500"></i>`;
    
    btn.onclick = () => handleTriviaAnswer(index, btn);
    optionsContainer.appendChild(btn);
  });

  if (window.lucide) lucide.createIcons();
}

function handleTriviaAnswer(selectedIndex, clickedBtn) {
  const currentQ = currentQuizQuestions[currentQuizIndex];
  const optionsContainer = document.getElementById('trivia-options');
  const allButtons = optionsContainer.querySelectorAll('button');

  allButtons.forEach(b => b.disabled = true);

  if (selectedIndex === currentQ.correct) {
    triviaScore++;
    clickedBtn.classList.remove('bg-slate-700/50', 'hover:bg-slate-700');
    clickedBtn.classList.add('bg-emerald-600/80', 'border-emerald-500', 'text-white');
  } else {
    clickedBtn.classList.remove('bg-slate-700/50', 'hover:bg-slate-700');
    clickedBtn.classList.add('bg-rose-600/80', 'border-rose-500', 'text-white');

    const correctBtn = allButtons[currentQ.correct];
    if (correctBtn) {
      correctBtn.classList.remove('bg-slate-700/50');
      correctBtn.classList.add('bg-emerald-600/50', 'border-emerald-500');
    }
  }

  setTimeout(() => {
    if (currentQuizIndex < QUIZ_LENGTH - 1) {
      currentQuizIndex++;
      renderQuestion();
    } else {
      showTriviaResults();
    }
  }, 900);
}

function showTriviaResults() {
  const progressEl = document.getElementById('trivia-progress');
  const questionEl = document.getElementById('trivia-question');
  const optionsContainer = document.getElementById('trivia-options');

  if (progressEl) progressEl.innerText = `Juego Finalizado`;
  if (questionEl) {
    questionEl.innerText = `¡Completaste el Desafío! Marcador: ${triviaScore} / ${QUIZ_LENGTH}`;
  }

  if (optionsContainer) {
    optionsContainer.innerHTML = `
      <div class="text-center py-4 space-y-4">
        <p class="text-slate-300 text-sm">
          ${triviaScore >= 8 ? '🔥 ¡Excelente conocimiento de la Liga Nacional y béisbol!' : triviaScore >= 5 ? '⚾ ¡Buen juego! Conoces bastante del diamante.' : '💪 ¡Sigue practicando tus conocimientos de béisbol!'}
        </p>
        <button onclick="initNewTriviaGame()" class="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-bold py-3 rounded-xl transition flex items-center justify-center space-x-2">
          <i data-lucide="refresh-cw" class="w-5 h-5"></i>
          <span>Jugar Otra Ronda (10 Nuevas)</span>
        </button>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
  }
}