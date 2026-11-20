// data.js — loads and cross-references CASE_DATA into convenient lookup maps.
// Depends on: data/case_data.js (window.CASE_DATA)
(function () {
  'use strict';

  function loadData() {
    const D = window.CASE_DATA;

    // ---- keyed maps ----
    const studentMap = {};
    D.students.forEach(s => { studentMap[s.student_id] = Object.assign({}, s); });

    // attach section
    D.enrollments.forEach(e => {
      if (studentMap[e.student_id]) studentMap[e.student_id].section = e.section;
    });

    // attach scores array  { topic, score_percent }
    D.topic_scores.forEach(ts => {
      const s = studentMap[ts.student_id];
      if (!s) return;
      if (!s.scores) s.scores = [];
      s.scores.push({ topic: ts.topic, score_percent: ts.score_percent });
    });

    // attach availability windows
    D.study_availability.forEach(av => {
      const s = studentMap[av.student_id];
      if (!s) return;
      if (!s.availability) s.availability = [];
      s.availability.push({ day: av.day, start: av.start, end: av.end });
    });

    // ---- course schedule keyed by section ----
    const scheduleBySection = {};
    D.course_schedule.forEach(cs => {
      if (!scheduleBySection[cs.section]) scheduleBySection[cs.section] = [];
      scheduleBySection[cs.section].push(cs);
    });

    return {
      students: D.students.map(s => studentMap[s.student_id]),
      studentMap,
      scheduleBySection,
      assignmentCalendar: D.assignment_calendar,
      supportResources:   D.support_resources
    };
  }

  // helper: convert "HH:MM" to minutes-since-midnight
  function toMin(hhmm) {
    if (!hhmm) return 0;
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  }

  // helper: convert minutes-since-midnight to "HH:MM"
  function fromMin(min) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0');
  }

  window.AppData   = loadData();
  window.timeToMin = toMin;
  window.minToTime = fromMin;
}());
