const STORAGE_KEY = 'tetris-highscores';
const MAX_ENTRIES = 10;

export function getHighScores() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function addHighScore(name, score, lines, level) {
  const scores = getHighScores();
  scores.push({ name, score, lines, level, date: Date.now() });
  scores.sort((a, b) => b.score - a.score);
  scores.splice(MAX_ENTRIES);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
  return scores;
}

export function isHighScore(score) {
  const scores = getHighScores();
  if (scores.length < MAX_ENTRIES) return true;
  return score > scores[scores.length - 1].score;
}
