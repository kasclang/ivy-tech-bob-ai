// app.js v2 — application controller
(function () {
  'use strict';

  let selectedStudentId = null;
  let selectedWeek      = 1;

  function student() { return window.AppData.studentMap[selectedStudentId]; }

  function renderAll() {
    const s        = student();
    const ranked   = window.analyseTopics(s, selectedWeek);
    const sessions = window.buildSchedule(s, ranked, selectedWeek);
    const matched  = window.matchResources(s, ranked);
    const streak   = window.Persistence.getStreak(s.student_id);

    window.UI.renderStats(s, ranked, selectedWeek);
    window.UI.renderTodayRec(s, ranked, sessions);
    window.UI.renderMotivation(s, streak);
    window.UI.renderCalendar(s, sessions, selectedWeek);
    window.UI.renderDeadlines(selectedWeek);
    window.UI.renderTopicScores(ranked);
    window.UI.renderSessions(sessions, s, selectedWeek);
    window.UI.renderResources(matched);
  }

  function selectStudent(id) {
    selectedStudentId = id;
    window.UI.renderStudentNav(window.AppData.students, id, selectStudent);
    renderAll();
  }

  function selectWeek(w) {
    selectedWeek = w;
    window.UI.renderWeekNav(w, selectWeek);
    renderAll();
  }

  function init() {
    window.UI.renderTopBar();
    window.UI.renderStudentNav(window.AppData.students, null, selectStudent);
    window.UI.renderWeekNav(1, selectWeek);
    selectStudent(window.AppData.students[0].student_id);
  }

  document.addEventListener('DOMContentLoaded', init);
}());
