// persistence.js — localStorage progress tracking helpers.
(function () {
  'use strict';

  const KEY_PREFIX = 'arc_session_';

  function sessionKey(studentId, week, sessionNum) {
    return KEY_PREFIX + studentId + '_w' + week + '_s' + sessionNum;
  }

  function isComplete(studentId, week, sessionNum) {
    return localStorage.getItem(sessionKey(studentId, week, sessionNum)) === '1';
  }

  function setComplete(studentId, week, sessionNum, done) {
    const key = sessionKey(studentId, week, sessionNum);
    if (done) localStorage.setItem(key, '1');
    else       localStorage.removeItem(key);
  }

  function countCompleted(studentId, week, totalSessions) {
    let n = 0;
    for (let i = 1; i <= totalSessions; i++) {
      if (isComplete(studentId, week, i)) n++;
    }
    return n;
  }

  window.Persistence = { isComplete, setComplete, countCompleted };
}());
