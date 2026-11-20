// persistence.js — streak tracking, session completion, XP, last-login
(function () {
  'use strict';

  const KEY = {
    session:    (sid, w, n) => `arc_s_${sid}_w${w}_${n}`,
    streak:     sid => `arc_streak_${sid}`,
    lastLogin:  sid => `arc_last_${sid}`,
    xp:         sid => `arc_xp_${sid}`,
    weekDone:   (sid, w) => `arc_wdone_${sid}_w${w}`
  };

  /* ── session completion ── */
  function isComplete(sid, week, num) {
    return localStorage.getItem(KEY.session(sid, week, num)) === '1';
  }
  function setComplete(sid, week, num, done) {
    const k = KEY.session(sid, week, num);
    if (done) { localStorage.setItem(k, '1'); addXP(sid, 25); }
    else       localStorage.removeItem(k);
  }
  function countCompleted(sid, week, total) {
    let n = 0;
    for (let i = 1; i <= total; i++) if (isComplete(sid, week, i)) n++;
    return n;
  }

  /* ── XP ── */
  function getXP(sid) { return parseInt(localStorage.getItem(KEY.xp(sid)) || '0', 10); }
  function addXP(sid, pts) {
    localStorage.setItem(KEY.xp(sid), getXP(sid) + pts);
  }
  function xpLevel(xp) {
    if (xp >= 500) return { level: 5, title: 'Math Legend',   next: null };
    if (xp >= 300) return { level: 4, title: 'Pro Solver',    next: 500 };
    if (xp >= 150) return { level: 3, title: 'Rising Star',   next: 300 };
    if (xp >= 50)  return { level: 2, title: 'Getting There', next: 150 };
    return          { level: 1, title: 'Just Starting',       next: 50  };
  }

  /* ── streaks ── */
  function todayStr() {
    return new Date().toISOString().slice(0, 10);
  }
  function checkInStreak(sid) {
    const today    = todayStr();
    const lastStr  = localStorage.getItem(KEY.lastLogin(sid));
    const streakN  = parseInt(localStorage.getItem(KEY.streak(sid)) || '0', 10);

    if (lastStr === today) return streakN; // already checked in today

    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const newStreak = lastStr === yesterday ? streakN + 1 : 1;

    localStorage.setItem(KEY.streak(sid),    newStreak);
    localStorage.setItem(KEY.lastLogin(sid), today);
    addXP(sid, 10); // daily check-in XP
    return newStreak;
  }
  function getStreak(sid) {
    return parseInt(localStorage.getItem(KEY.streak(sid)) || '0', 10);
  }

  window.Persistence = {
    isComplete, setComplete, countCompleted,
    getXP, addXP, xpLevel,
    checkInStreak, getStreak, todayStr
  };
}());
