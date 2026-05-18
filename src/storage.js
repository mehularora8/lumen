// Thin localStorage wrapper so the rest of the app doesn't worry about JSON / try/catch.
const KEY_COMPLETED = 'arcadeEscape:completed';
const KEY_LEADERBOARD = 'arcadeEscape:leaderboard';

function safeGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode — ignore */
  }
}

export function loadCompleted() {
  return safeGet(KEY_COMPLETED, false) === true;
}

export function saveCompleted(value) {
  safeSet(KEY_COMPLETED, value);
}

export function loadLeaderboard() {
  const list = safeGet(KEY_LEADERBOARD, []);
  return Array.isArray(list) ? list : [];
}

export function addLeaderboardEntry(entry) {
  const list = loadLeaderboard();
  list.push(entry);
  list.sort((a, b) => a.timeMs - b.timeMs);
  const top = list.slice(0, 10);
  safeSet(KEY_LEADERBOARD, top);
  return top;
}

export function clearAll() {
  try {
    localStorage.removeItem(KEY_COMPLETED);
    localStorage.removeItem(KEY_LEADERBOARD);
  } catch {}
}
