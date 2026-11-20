// ui.js — all DOM rendering functions.
// Depends on: config.js, data.js, analysis.js, persistence.js
(function () {
  'use strict';

  /* ───────────────────────────── helpers ───────────────────────────── */
  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls)  e.className = cls;
    if (html) e.innerHTML = html;
    return e;
  }

  function scoreBar(score) {
    const label = window.scoreLabel(score);
    return `<div class="score-bar-wrap" title="${score}%">
      <div class="score-bar score-bar--${label}" style="width:${score}%"></div>
      <span class="score-num">${score}%</span>
    </div>`;
  }

  function badge(text, type) {
    return `<span class="badge badge--${type}">${text}</span>`;
  }

  /* ───────────────────────── student selector ──────────────────────── */
  function renderStudentSelector(students, selectedId, onSelect) {
    const wrap = document.getElementById('student-selector');
    if (!wrap) return;
    wrap.innerHTML = '';
    students.forEach(s => {
      const btn = el('button', 'student-btn' + (s.student_id === selectedId ? ' student-btn--active' : ''));
      btn.innerHTML = `
        <span class="stu-avatar">${s.first_name[0]}</span>
        <span class="stu-name">${s.first_name}</span>
        <span class="stu-prog">${s.program.replace(/ \(.*\)/, '')}</span>`;
      btn.addEventListener('click', () => onSelect(s.student_id));
      wrap.appendChild(btn);
    });
  }

  /* ─────────────────────────── student card ────────────────────────── */
  function renderStudentCard(student) {
    const wrap = document.getElementById('student-card');
    if (!wrap) return;

    const modalityIcon = { 'In person':'🏫', 'Hybrid':'🔀', 'Online':'💻' };
    const workDesc = student.work_hours_per_week === 0
      ? 'Not working'
      : student.work_hours_per_week + ' hrs/week';

    wrap.innerHTML = `
      <div class="card-header">
        <div class="card-avatar">${student.first_name[0]}</div>
        <div>
          <h2 class="card-name">${student.first_name}</h2>
          <div class="card-meta">${student.program}</div>
        </div>
      </div>
      <div class="card-pills">
        <span class="pill">Section ${student.section}</span>
        <span class="pill">${modalityIcon[student.modality] || ''} ${student.modality}</span>
        <span class="pill">💼 ${workDesc}</span>
      </div>`;
  }

  /* ──────────────────────── week selector ─────────────────────────── */
  function renderWeekSelector(currentWeek, onSelect) {
    const wrap = document.getElementById('week-selector');
    if (!wrap) return;
    wrap.innerHTML = '';
    for (let w = 1; w <= 12; w++) {
      const btn = el('button', 'week-btn' + (w === currentWeek ? ' week-btn--active' : ''), 'Wk ' + w);
      btn.addEventListener('click', () => onSelect(w));
      wrap.appendChild(btn);
    }
  }

  /* ──────────────────────── topic priority cards ───────────────────── */
  function renderTopics(rankedTopics) {
    const wrap = document.getElementById('topics-section');
    if (!wrap) return;
    wrap.innerHTML = '<h3 class="section-title">📊 Topic Priorities</h3>';

    const labelText = { 'needs-focus':'Needs Focus', 'fair':'Fair', 'strong':'Strong' };

    rankedTopics.forEach((t, i) => {
      const lbl = window.scoreLabel(t.score_percent);
      const isTop = i < window.CONFIG.topTopicsCount;
      const card = el('div', 'topic-card topic-card--' + lbl + (isTop ? ' topic-card--top' : ''));
      card.innerHTML = `
        <div class="topic-row">
          <span class="topic-rank">#${i + 1}</span>
          <span class="topic-name">${t.topic}</span>
          ${badge(labelText[lbl], lbl)}
        </div>
        ${scoreBar(t.score_percent)}
        <div class="topic-reasons">${t.reasons.map(r => `<span class="reason">• ${r}</span>`).join('')}</div>
        <div class="topic-priority-num">Priority score: <strong>${(t.priority * 100).toFixed(0)}</strong>/100</div>`;
      wrap.appendChild(card);
    });
  }

  /* ──────────────────────── study schedule ─────────────────────────── */
  function renderSchedule(sessions, student, week) {
    const wrap = document.getElementById('schedule-section');
    if (!wrap) return;
    wrap.innerHTML = '<h3 class="section-title">📅 Your Weekly Study Plan</h3>';

    if (sessions.length === 0) {
      wrap.appendChild(el('p', 'empty-state', 'No availability windows found for this week. Add more free time to get sessions.'));
      return;
    }

    const workH = student.work_hours_per_week || 0;
    const notice = el('p', 'schedule-notice');
    notice.textContent = workH >= 30
      ? `You work ${workH} hrs/week — your plan is kept short so you are not overwhelmed.`
      : `Your plan fits your ${(student.availability || []).length} recorded availability window(s).`;
    wrap.appendChild(notice);

    sessions.forEach(s => {
      const done = window.Persistence.isComplete(student.student_id, week, s.sessionNum);
      const card = el('div', 'session-card' + (done ? ' session-card--done' : ''));
      card.innerHTML = `
        <div class="session-header">
          <span class="session-day">${s.day}</span>
          <span class="session-time">${s.start} – ${s.end}</span>
          <label class="session-check">
            <input type="checkbox" class="check-input" data-session="${s.sessionNum}" ${done ? 'checked' : ''}>
            <span class="check-label">${done ? 'Done ✓' : 'Mark done'}</span>
          </label>
        </div>
        <div class="session-topic">📖 Study: <strong>${s.topic}</strong></div>
        <div class="session-score">Diagnostic score: ${s.score}% — ${s.score < window.CONFIG.weakThreshold ? 'this topic needs practice' : 'keep it sharp'}</div>
        ${s.reasons.length ? '<div class="session-reasons">' + s.reasons.map(r => `<span class="reason">• ${r}</span>`).join('') + '</div>' : ''}`;

      card.querySelector('.check-input').addEventListener('change', function () {
        window.Persistence.setComplete(student.student_id, week, s.sessionNum, this.checked);
        renderProgress(sessions, student, week);
        card.classList.toggle('session-card--done', this.checked);
        card.querySelector('.check-label').textContent = this.checked ? 'Done ✓' : 'Mark done';
      });
      wrap.appendChild(card);
    });

    renderProgress(sessions, student, week);
  }

  function renderProgress(sessions, student, week) {
    let bar = document.getElementById('progress-bar-wrap');
    if (!bar) {
      bar = el('div', '', '');
      bar.id = 'progress-bar-wrap';
      const wrap = document.getElementById('schedule-section');
      if (wrap) wrap.insertBefore(bar, wrap.children[1] || null);
    }
    const done  = window.Persistence.countCompleted(student.student_id, week, sessions.length);
    const pct   = sessions.length ? Math.round((done / sessions.length) * 100) : 0;
    bar.innerHTML = `
      <div class="progress-label">Week ${week} progress: <strong>${done}/${sessions.length}</strong> sessions completed</div>
      <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>`;
  }

  /* ──────────────────────── resources ─────────────────────────────── */
  function renderResources(matched) {
    const wrap = document.getElementById('resources-section');
    if (!wrap) return;
    wrap.innerHTML = '<h3 class="section-title">🎓 Support Resources</h3>';

    if (matched.fits.length === 0 && matched.alternatives.length === 0) {
      wrap.appendChild(el('p', 'empty-state', 'No matching resources found.'));
      return;
    }

    function resourceCard(r, altNote) {
      const typeIcon = {
        'Tutoring':'🧑‍🏫', 'Office hours':'👩‍💼', 'Lab':'🔬',
        'Video':'▶️', 'Practice set':'📝', 'Workshop':'🛠️',
        'Coaching':'💡'
      };
      const icon = typeIcon[r.type] || '📚';
      const timeStr = r.day === 'Any'
        ? 'Available any time'
        : r.day + (r.start ? ` ${r.start}–${r.end}` : '');
      const card = el('div', 'resource-card' + (altNote ? ' resource-card--alt' : ''));
      card.innerHTML = `
        <div class="resource-row">
          <span class="resource-icon">${icon}</span>
          <div class="resource-info">
            <div class="resource-name">${r.name}</div>
            <div class="resource-meta">${r.type} · ${r.modality} · ${r.location}</div>
            <div class="resource-time">${timeStr}</div>
            <div class="resource-desc">${r.description}</div>
            ${r.topics !== 'All' ? `<div class="resource-topics">Topics: ${r.topics}</div>` : ''}
            ${altNote ? `<div class="resource-alt-note">⚠️ ${altNote}</div>` : ''}
          </div>
        </div>`;
      return card;
    }

    if (matched.fits.length > 0) {
      wrap.appendChild(el('h4', 'sub-title', '✅ Fits your schedule'));
      matched.fits.forEach(r => wrap.appendChild(resourceCard(r, null)));
    }
    if (matched.alternatives.length > 0) {
      wrap.appendChild(el('h4', 'sub-title', 'Also available (may not overlap your free time)'));
      matched.alternatives.forEach(r => wrap.appendChild(resourceCard(r, 'Check the time — this may not overlap your recorded availability.')));
    }
  }

  /* ──────────────────────── upcoming assignments ───────────────────── */
  function renderAssignments(week) {
    const wrap = document.getElementById('assignments-section');
    if (!wrap) return;
    wrap.innerHTML = '<h3 class="section-title">📋 Upcoming Assignments</h3>';

    const cal = window.AppData.assignmentCalendar;
    const upcoming = cal.filter(a => a.week >= week && a.week <= week + 2)
                        .sort((a, b) => a.week - b.week);

    if (upcoming.length === 0) {
      wrap.appendChild(el('p', 'empty-state', 'No assignments in the next 2 weeks.'));
      return;
    }

    const typeIcon = { Exam:'🎓', Quiz:'📝', Homework:'📚', Practice:'🔄' };
    upcoming.forEach(a => {
      const card = el('div', 'assign-card assign-card--' + a.type.toLowerCase());
      card.innerHTML = `
        <span class="assign-type">${typeIcon[a.type] || ''} ${a.type}</span>
        <span class="assign-item">${a.item}</span>
        <span class="assign-due">Due ${a.due_date}</span>
        <span class="assign-topic">${a.topic}</span>`;
      wrap.appendChild(card);
    });
  }

  window.UI = {
    renderStudentSelector,
    renderStudentCard,
    renderWeekSelector,
    renderTopics,
    renderSchedule,
    renderResources,
    renderAssignments
  };
}());
