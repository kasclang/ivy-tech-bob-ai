/**
 * data.js — Data loading, normalization, and validation.
 * Reads from window.CASE_DATA (populated by data/case_data.js).
 */
const DataLoader = (() => {

  function load() {
    const raw = window.CASE_DATA;
    if (!raw) throw new Error('CASE_DATA not found. Ensure data/case_data.js is loaded.');

    // Index students
    const students = raw.students.map(s => ({
      id:            s.student_id,
      firstName:     s.first_name,
      program:       s.program,
      mathCourse:    s.math_course,
      supportCourse: s.support_course,
      workHours:     Number(s.work_hours_per_week),
      modality:      s.modality,
    }));

    // Index enrollments: { studentId → section }
    const enrollments = {};
    raw.enrollments.forEach(e => { enrollments[e.student_id] = e.section; });

    // Enrich students with section
    students.forEach(s => { s.section = enrollments[s.id] || null; });

    // Index topic scores: { studentId → [{ topic, score, source }] }
    const topicScores = {};
    raw.topic_scores.forEach(t => {
      if (!topicScores[t.student_id]) topicScores[t.student_id] = [];
      topicScores[t.student_id].push({
        topic:  t.topic,
        score:  Number(t.score_percent),
        source: t.source,
      });
    });

    // Index study availability: { studentId → [{ day, start, end }] }
    const studyAvailability = {};
    raw.study_availability.forEach(a => {
      if (!studyAvailability[a.student_id]) studyAvailability[a.student_id] = [];
      studyAvailability[a.student_id].push({
        day:   a.day,
        start: a.start,
        end:   a.end,
      });
    });

    // Course schedule: [{ course, section, day, start, end, location }]
    const courseSchedule = raw.course_schedule.map(c => ({
      course:   c.course,
      section:  c.section,
      day:      c.day,
      start:    c.start || null,
      end:      c.end   || null,
      location: c.location,
    }));

    // Assignment calendar: [{ course, week, dueDate, item, type, topic, points }]
    const assignmentCalendar = raw.assignment_calendar.map(a => ({
      course:   a.course,
      week:     Number(a.week),
      dueDate:  a.due_date,
      item:     a.item,
      type:     a.type,
      topic:    a.topic,
      points:   Number(a.points),
    }));

    // Support resources: [{ id, name, type, topics[], day, start, end, modality, location, description }]
    const supportResources = raw.support_resources.map(r => ({
      id:          r.resource_id,
      name:        r.name,
      type:        r.type,
      topics:      r.topics === 'All' ? ['All'] : r.topics.split(',').map(t => t.trim()),
      day:         r.day || null,
      start:       r.start || null,
      end:         r.end   || null,
      modality:    r.modality,
      location:    r.location,
      description: r.description,
    }));

    return { students, enrollments, topicScores, studyAvailability, courseSchedule, assignmentCalendar, supportResources };
  }

  // ── Utility: convert "HH:MM" to minutes since midnight ───────────────────
  function timeToMinutes(t) {
    if (!t) return null;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  }

  // ── Utility: minutes since midnight → "HH:MM" ─────────────────────────────
  function minutesToTime(m) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    return `${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}`;
  }

  // ── Utility: parse "YYYY-MM-DD" → Date (UTC noon to avoid TZ issues) ──────
  function parseDate(str) {
    const [y, mo, d] = str.split('-').map(Number);
    return new Date(Date.UTC(y, mo - 1, d, 12, 0, 0));
  }

  // ── Compute the Monday of a given week number (1-indexed) ─────────────────
  function weekStartDate(weekNum) {
    const base = parseDate(CONFIG.semesterStartDate);
    base.setUTCDate(base.getUTCDate() + (weekNum - 1) * 7);
    return base;
  }

  // ── Get ISO date string for a day offset from weekStart ───────────────────
  function dateForWeekday(weekStart, dayName) {
    const idx = CONFIG.DAY_ORDER.indexOf(dayName);
    if (idx === -1) return null;
    const d = new Date(weekStart);
    d.setUTCDate(d.getUTCDate() + idx);
    return d.toISOString().slice(0, 10);
  }

  return { load, timeToMinutes, minutesToTime, parseDate, weekStartDate, dateForWeekday };
})();
