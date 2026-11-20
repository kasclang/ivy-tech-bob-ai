/**
 * persistence.js — localStorage-based progress tracking.
 * Completion state is keyed by student ID to prevent cross-student leakage.
 */
const Persistence = (() => {

  const PREFIX = 'arc_'; // Academic Readiness Coach

  function storageKey(studentId) {
    return `${PREFIX}${studentId}`;
  }

  function prefsKey() {
    return `${PREFIX}prefs`;
  }

  /** Load completed session IDs for a student. Returns Set<string>. */
  function loadCompleted(studentId) {
    try {
      const raw = localStorage.getItem(storageKey(studentId));
      return new Set(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set();
    }
  }

  /** Save completed session IDs for a student. */
  function saveCompleted(studentId, completedSet) {
    try {
      localStorage.setItem(storageKey(studentId), JSON.stringify([...completedSet]));
    } catch { /* ignore */ }
  }

  /** Mark a session as complete. */
  function markComplete(studentId, sessionId) {
    const set = loadCompleted(studentId);
    set.add(sessionId);
    saveCompleted(studentId, set);
  }

  /** Unmark a session as complete. */
  function markIncomplete(studentId, sessionId) {
    const set = loadCompleted(studentId);
    set.delete(sessionId);
    saveCompleted(studentId, set);
  }

  /** Reset all progress for a student. */
  function resetProgress(studentId) {
    try {
      localStorage.removeItem(storageKey(studentId));
    } catch { /* ignore */ }
  }

  /** Save user preferences (last selected student, week, target). */
  function savePrefs(prefs) {
    try {
      localStorage.setItem(prefsKey(), JSON.stringify(prefs));
    } catch { /* ignore */ }
  }

  /** Load user preferences. */
  function loadPrefs() {
    try {
      const raw = localStorage.getItem(prefsKey());
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  return { loadCompleted, markComplete, markIncomplete, resetProgress, savePrefs, loadPrefs };
})();
