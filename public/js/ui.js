export function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const screen = document.getElementById(screenId);
  if (screen) screen.classList.add('active');
}

export function updateScore(score) {
  const el = document.getElementById('score-display');
  if (el) el.textContent = score.toLocaleString();
}

export function updateLines(lines) {
  const el = document.getElementById('lines-display');
  if (el) el.textContent = lines;
}

export function updateLevel(level) {
  const el = document.getElementById('level-display');
  if (el) el.textContent = level;
}

export function updateOpponentScore(score) {
  const el = document.getElementById('opponent-score-display');
  if (el) el.textContent = score.toLocaleString();
}

export function showOpponentSection(name) {
  const section = document.getElementById('opponent-section');
  if (section) section.classList.remove('hidden');
  const label = document.getElementById('opponent-name-label');
  if (label) label.textContent = (name || 'OPPONENT').toUpperCase();
}

export function setMyNameLabel(name) {
  const el = document.getElementById('my-name-label');
  if (!el) return;
  el.textContent = name || '';
  el.classList.toggle('hidden', !name);
}

export function hideOpponentSection() {
  const section = document.getElementById('opponent-section');
  if (section) section.classList.add('hidden');
}

export function showTauntLegend() {
  document.getElementById('taunt-legend')?.classList.remove('hidden');
}

export function hideTauntLegend() {
  document.getElementById('taunt-legend')?.classList.add('hidden');
}

let tauntToastTimer = null;
export function showOpponentTaunt(message) {
  const el = document.getElementById('taunt-opp-toast');
  if (!el) return;
  el.textContent = message;
  el.classList.remove('hidden');
  if (tauntToastTimer) clearTimeout(tauntToastTimer);
  tauntToastTimer = setTimeout(() => el.classList.add('hidden'), 2000);
}

export function showCountdown(seconds, callback) {
  const overlay = document.getElementById('overlay-countdown');
  const text = document.getElementById('countdown-text');
  overlay.classList.remove('hidden');

  let count = seconds;
  function tick() {
    if (count > 0) {
      text.textContent = count;
      text.style.animation = 'none';
      text.offsetHeight; // trigger reflow
      text.style.animation = 'countdownPulse 0.5s ease-out';
      count--;
      setTimeout(tick, 1000);
    } else {
      text.textContent = 'GO!';
      text.style.color = 'var(--dk-orange)';
      text.style.animation = 'none';
      text.offsetHeight;
      text.style.animation = 'countdownPulse 0.5s ease-out';
      setTimeout(() => {
        overlay.classList.add('hidden');
        text.style.color = '';
        callback();
      }, 600);
    }
  }
  tick();
}

export function showGameOver(data, isMultiplayer = false, isBotGame = false) {
  const overlay = document.getElementById('overlay-gameover');
  const title = document.getElementById('gameover-title');
  const stats = document.getElementById('gameover-stats');
  const btnPlayAgain = document.getElementById('btn-play-again');
  const btnRematch = document.getElementById('btn-rematch');
  const btnRematchBot = document.getElementById('btn-rematch-bot');

  btnPlayAgain.classList.add('hidden');
  btnRematch.classList.add('hidden');
  btnRematchBot.classList.add('hidden');

  if (isBotGame && data.won !== undefined) {
    title.textContent = data.won ? 'YOU WIN!' : 'YOU LOSE';
    title.style.color = data.won ? 'var(--dk-green)' : 'var(--dk-orange)';
    btnRematchBot.classList.remove('hidden');
  } else if (isMultiplayer && data.won !== undefined) {
    title.textContent = data.won ? 'YOU WIN!' : 'YOU LOSE';
    title.style.color = data.won ? 'var(--dk-green)' : 'var(--dk-orange)';
    btnRematch.classList.remove('hidden');
  } else {
    title.textContent = 'GAME OVER';
    title.style.color = 'var(--dk-orange)';
    btnPlayAgain.classList.remove('hidden');
  }

  stats.innerHTML = `
    <div><span class="stat-label">SCORE</span><br><span class="stat-value">${data.score.toLocaleString()}</span></div>
    <div><span class="stat-label">LINES</span><br><span class="stat-value">${data.lines}</span></div>
    <div><span class="stat-label">LEVEL</span><br><span class="stat-value">${data.level}</span></div>
  `;

  overlay.classList.remove('hidden');
}

export function hideGameOver() {
  document.getElementById('overlay-gameover').classList.add('hidden');
}

export function showHighScoreEntry() {
  document.getElementById('gameover-highscore').classList.remove('hidden');
  document.getElementById('highscore-name').focus();
}

export function hideHighScoreEntry() {
  document.getElementById('gameover-highscore').classList.add('hidden');
}

export function populateHighScores(scores) {
  const tbody = document.getElementById('highscores-body');
  const noMsg = document.getElementById('no-scores-msg');

  if (!scores || scores.length === 0) {
    tbody.innerHTML = '';
    noMsg.classList.remove('hidden');
    return;
  }

  noMsg.classList.add('hidden');
  tbody.innerHTML = scores.map((s, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${escapeHtml(s.name)}</td>
      <td>${s.score.toLocaleString()}</td>
      <td>${s.lines}</td>
      <td>${s.level}</td>
    </tr>
  `).join('');
}

export function showToast(message, duration = 3000) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.remove('hidden');
  setTimeout(() => {
    toast.classList.add('hidden');
  }, duration);
}

// Room info updates
export function showRoomInfo(code) {
  document.getElementById('room-info').classList.remove('hidden');
  document.getElementById('room-code-value').textContent = code;
  // Hide create/join buttons
  document.querySelector('.lobby-actions').classList.add('hidden');
}

export function hideRoomInfo() {
  document.getElementById('room-info').classList.add('hidden');
  document.querySelector('.lobby-actions').classList.remove('hidden');
}

export function updatePlayersList(players, myId) {
  const list = document.getElementById('players-list');
  list.innerHTML = players.map(p => `
    <div class="player-entry">
      <span class="name">${escapeHtml(p.name)}${p.id === myId ? ' (you)' : ''}</span>
      <span class="status ${p.ready ? 'ready' : 'waiting'}">${p.ready ? 'READY' : 'WAITING'}</span>
    </div>
  `).join('');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
