// app.js — application controller: state management and event wiring.
// Depends on: all other js/* modules
(function () {
  'use strict';

  /* ── state ── */
  let selectedStudentId = null;
  let selectedWeek      = 1;

  function getStudent() {
    return window.AppData.studentMap[selectedStudentId];
  }

  /* ── render full plan ── */
  function renderPlan() {
    const student = getStudent();
    if (!student) return;

    const ranked  = window.analyseTopics(student, selectedWeek);
    const sessions = window.buildSchedule(student, ranked, selectedWeek);
    const matched  = window.matchResources(student, ranked);

    window.UI.renderStudentCard(student);
    window.UI.renderTopics(ranked);
    window.UI.renderSchedule(sessions, student, selectedWeek);
    window.UI.renderResources(matched);
    window.UI.renderAssignments(selectedWeek);

    // scroll to plan
    document.getElementById('plan-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ── student selection ── */
  function selectStudent(id) {
    selectedStudentId = id;
    window.UI.renderStudentSelector(window.AppData.students, id, selectStudent);
    window.UI.renderWeekSelector(selectedWeek, selectWeek);
    document.getElementById('plan-container').style.display = 'block';
    renderPlan();
  }

  /* ── week selection ── */
  function selectWeek(w) {
    selectedWeek = w;
    window.UI.renderWeekSelector(w, selectWeek);
    renderPlan();
  }

  /* ── boot ── */
  function init() {
    const students = window.AppData.students;
    // default: first student, week 1
    window.UI.renderStudentSelector(students, students[0].student_id, selectStudent);
    window.UI.renderWeekSelector(1, selectWeek);

    // hide plan until a student is selected explicitly on first load
    // but auto-select first student so the page is immediately useful
    selectStudent(students[0].student_id);
  }

  document.addEventListener('DOMContentLoaded', init);
}());
