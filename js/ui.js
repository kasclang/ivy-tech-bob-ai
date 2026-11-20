/**
 * ui.js — All DOM rendering functions.
 * Pure render helpers — no business logic, no data computation.
 */
const UI = (() => {

  // ── Icons (inline SVG) ──────────────────────────────────────────────────
  const icons = {
    user:     `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>`,
    calendar: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    chart:    `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
    clock:    `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    alert:    `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    book:     `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
    check:    `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    info:     `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  };

  // ── Helpers ──────────────────────────────────────────────────────────────
  function el(tag, attrs = {}, ...children) {
    const e = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === 'class') e.className = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k.startsWith('data-')) e.setAttribute(k, v);
      else if (k === 'for') e.htmlFor = v;
      else e[k] = v;
    });
    children.flat().forEach(c => {
      if (c == null) return;
      e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return e;
  }

  function formatDate(isoStr) {
    if (!isoStr) return '';
    const [y, m, d] = isoStr.split('-').map(Number);
    return new Date(Date.UTC(y, m-1, d, 12)).toLocaleDateString('en-US', { month:'short', day:'numeric', weekday:'short', timeZone:'UTC' });
  }

  function formatMinutes(min) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (h === 0) return `${m} min`;
    if (m === 0) return `${h} hr`;
    return `${h} hr ${m} min`;
  }

  function scoreClass(cat) {
    const map = { attention:'score-attention', developing:'score-developing', strong:'score-strong', 'not-assessed':'score-not-assessed' };
    return map[cat] || '';
  }
  function fillClass(cat) {
    const map = { attention:'fill-attention', developing:'fill-developing', strong:'fill-strong', 'not-assessed':'fill-not-assessed' };
    return map[cat] || '';
  }

  // ── Render: Student Selector ─────────────────────────────────────────────
  function renderStudentSelector(students, selectedId, onChange) {
    const sel = el('select', { id: 'student-select', 'aria-label': 'Select student' });
    students.forEach(s => {
      const opt = el('option', { value: s.id });
      opt.textContent = `${s.firstName} (${s.id})`;
      if (s.id === selectedId) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.addEventListener('change', e => onChange(e.target.value));
    return sel;
  }

  // ── Render: Student Profile ──────────────────────────────────────────────
  function renderStudentProfile(student) {
    const sectionLabels = { '01':'Section 01 (MWF)', '40':'Section 40 (T/Th)', 'OL1':'Section OL1 (Online)' };
    const rows = [
      ['Program',       student.program],
      ['Math course',   student.mathCourse],
      ['Support course', student.supportCourse],
      ['Section',       `<span class="section-badge">${sectionLabels[student.section] || student.section || 'Unknown'}</span>`],
      ['Work hours/wk', student.workHours > 0 ? `${student.workHours} hrs` : 'Not employed'],
      ['Modality',      student.modality],
    ];
    const grid = el('div', { class:'profile-grid' });
    rows.forEach(([label, val]) => {
      grid.appendChild(el('span', { class:'profile-label' }, label));
      const v = el('span', { class:'profile-value', html: String(val) });
      grid.appendChild(v);
    });
    return grid;
  }

  // ── Render: Academic Readiness ───────────────────────────────────────────
  function renderAcademicReadiness(prioritizedTopics) {
    const categories = {
      attention:    { label:'Needs Immediate Attention', topics:[] },
      developing:   { label:'Developing Proficiency',   topics:[] },
      strong:       { label:'Strong Foundation',         topics:[] },
      'not-assessed':{ label:'Not Yet Assessed',         topics:[] },
    };
    prioritizedTopics.forEach(t => { (categories[t.category]?.topics || categories['not-assessed'].topics).push(t); });

    const container = document.createDocumentFragment();

    Object.entries(categories).forEach(([catKey, cat]) => {
      if (!cat.topics.length) return;
      const hdr = el('div', { class:'topic-category-header' }, cat.label);
      container.appendChild(hdr);

      cat.topics.forEach(t => {
        const row = el('div', { class:'topic-row' });
        const header = el('div', { class:'topic-row-header' });
        header.appendChild(el('span', { class:'topic-name' }, t.topic));
        const scoreEl = el('span', { class:`topic-score-num ${scoreClass(t.category)}` });
        scoreEl.textContent = t.score !== null ? `${t.score}%` : 'Not assessed';
        header.appendChild(scoreEl);
        row.appendChild(header);

        const bg = el('div', { class:'progress-bar-bg', role:'progressbar', 'aria-valuenow': t.score ?? 0, 'aria-valuemin':'0', 'aria-valuemax':'100' });
        const fill = el('div', { class:`progress-bar-fill ${fillClass(t.category)}` });
        fill.style.width = `${t.score ?? 50}%`;
        bg.appendChild(fill);
        row.appendChild(bg);

        if (t.score !== null) {
          row.appendChild(el('div', { class:'score-source text-muted' }, 'Source: Diagnostic assessment, Weeks 1–4'));
        }

        container.appendChild(row);
      });
    });
    return container;
  }

  // ── Render: Week date range label ────────────────────────────────────────
  function renderWeekLabel(weekNum) {
    const start = DataLoader.weekStartDate(weekNum);
    const end   = new Date(start);
    end.setUTCDate(end.getUTCDate() + 6);
    const fmtOpts = { month:'short', day:'numeric', timeZone:'UTC' };
    const startStr = start.toLocaleDateString('en-US', fmtOpts);
    const endStr   = end.toLocaleDateString('en-US', { ...fmtOpts, year:'numeric' });
    return `Week ${weekNum} · ${startStr}–${endStr}`;
  }

  // ── Render: Weekly Calendar ──────────────────────────────────────────────
  function renderWeeklyCalendar(sessions, weekNum, completedSet, onSessionClick) {
    const weekStart = DataLoader.weekStartDate(weekNum);

    const grid = el('div', { class:'calendar-grid', role:'grid' });

    CONFIG.DAY_ORDER.forEach(day => {
      const dateStr = DataLoader.dateForWeekday(weekStart, day);
      const daySessions = sessions.filter(s => s.day === day);
      const hasAny = daySessions.length > 0;

      const cell = el('div', { class:`cal-day${hasAny ? ' has-sessions' : ''}`, role:'gridcell' });
      cell.appendChild(el('div', { class:'cal-day-name' }, day.slice(0, 3)));

      const [, m, d] = dateStr.split('-');
      cell.appendChild(el('div', { class:'cal-day-date' }, `${Number(m)}/${Number(d)}`));

      daySessions.forEach(sess => {
        const done = completedSet.has(sess.id);
        const chip = el('button', {
          class: `cal-session-chip${done ? ' completed' : ''}`,
          'data-session-id': sess.id,
          type: 'button',
          title: `${sess.topic} · ${sess.startTime}–${sess.endTime}`,
        });
        chip.textContent = `${sess.startTime} ${sess.topic.length > 14 ? sess.topic.slice(0,14)+'…' : sess.topic}`;
        chip.addEventListener('click', () => onSessionClick(sess.id));
        cell.appendChild(chip);
      });

      grid.appendChild(cell);
    });

    return grid;
  }

  // ── Render: Session List ─────────────────────────────────────────────────
  function renderSessionList(sessions, completedSet, onToggle) {
    if (!sessions.length) return el('div', { class:'empty-state' }, 'No study sessions planned for this week.');

    const list = el('div', { class:'session-list' });
    sessions.forEach(sess => {
      const done = completedSet.has(sess.id);
      const card = el('div', { class:`session-card${done ? ' completed' : ''}`, id:`sc-${sess.id}` });

      const checkWrap = el('div', { class:'session-check' });
      const cb = el('input', {
        type: 'checkbox',
        id: `cb-${sess.id}`,
        checked: done,
        'aria-label': `Mark "${sess.topic}" session complete`,
      });
      cb.addEventListener('change', () => onToggle(sess.id, cb.checked));
      checkWrap.appendChild(cb);
      card.appendChild(checkWrap);

      const info = el('div', { class:'session-info' });
      info.appendChild(el('div', { class:'session-time' }, `${sess.day} · ${sess.startTime}–${sess.endTime}`));
      info.appendChild(el('div', { class:'session-topic' }, sess.topic));
      info.appendChild(el('div', { class:'session-activity' }, sess.activity));
      info.appendChild(el('div', { class:'session-reason' }, sess.reason));
      card.appendChild(info);

      card.appendChild(el('div', { class:'session-duration-tag' }, formatMinutes(sess.durationMin)));

      list.appendChild(card);
    });
    return list;
  }

  // ── Render: Deadlines ────────────────────────────────────────────────────
  function renderDeadlines(assignments, currentWeek) {
    if (!assignments.length) return el('div', { class:'empty-state' }, 'No upcoming deadlines found.');

    // Show current week + 2 weeks ahead
    const visible = assignments.filter(a => a.week >= currentWeek && a.week <= currentWeek + 2);
    if (!visible.length) return el('div', { class:'empty-state' }, 'No deadlines in the next 3 weeks.');

    const list = el('div', { class:'deadline-list' });
    visible.forEach(a => {
      const isThisWeek = a.week === currentWeek;
      const card = el('div', { class:`deadline-card${isThisWeek ? ' this-week' : ''}` });

      const typeClass = { Exam:'type-exam', Quiz:'type-quiz', Homework:'type-homework', Practice:'type-practice' }[a.type] || 'type-homework';
      const typeTag = el('span', { class:`deadline-type-tag ${typeClass}` }, a.type);
      card.appendChild(typeTag);

      const info = el('div', { class:'deadline-info' });
      info.appendChild(el('div', { class:'deadline-name' }, a.item));
      info.appendChild(el('div', { class:'deadline-meta' }, `${a.course} · ${a.topic} · ${a.points} pts`));
      card.appendChild(info);

      const dateWrap = el('div', { class:'deadline-date' });
      dateWrap.textContent = formatDate(a.dueDate);
      if (isThisWeek) dateWrap.appendChild(el('span', { class:'this-week-badge', style:'margin-left:.4rem' }, 'This week'));
      card.appendChild(dateWrap);

      list.appendChild(card);
    });
    return list;
  }

  // ── Render: Resource Recommendations ────────────────────────────────────
  function renderResources(recommendations) {
    if (!recommendations.length) return el('div', { class:'empty-state' }, 'No matching resources found.');

    const list = el('div', { class:'resource-list' });
    recommendations.slice(0, 8).forEach(rec => {
      const { resource, availFit, hasConflict, sectionFit, whySelected, availNote, conflictNote, sectionNote, scheduleNote } = rec;
      const unavail = availFit === 'unavailable';

      const card = el('div', { class:`resource-card${unavail ? ' unavailable' : ''}` });

      const header = el('div', { class:'resource-header' });
      header.appendChild(el('span', { class:'resource-name' }, resource.name));

      const badges = el('div', { class:'resource-badges' });
      // Availability badge
      if (availFit === 'available') badges.appendChild(el('span', { class:'badge badge-green' }, '✓ Fits schedule'));
      else if (availFit === 'on-demand') badges.appendChild(el('span', { class:'badge badge-blue' }, 'On demand'));
      else badges.appendChild(el('span', { class:'badge badge-amber' }, 'Schedule conflict'));
      // Modality badge
      badges.appendChild(el('span', { class:`badge ${resource.modality === 'Online' ? 'badge-blue' : 'badge-gray'}` }, resource.modality));
      // Type badge
      badges.appendChild(el('span', { class:'badge badge-gray' }, resource.type));
      header.appendChild(badges);
      card.appendChild(header);

      card.appendChild(el('div', { class:'resource-desc' }, resource.description));
      card.appendChild(el('div', { class:'resource-why' }, `📌 ${whySelected}`));

      const notes = el('div', { class:'resource-notes' });
      notes.appendChild(el('div', {}, `📍 ${resource.location}`));
      notes.appendChild(el('div', {}, `🕐 ${scheduleNote}`));
      notes.appendChild(el('div', {}, availNote));
      if (conflictNote) notes.appendChild(el('div', { class:'note-warn' }, `⚠ ${conflictNote}`));
      if (sectionNote)  notes.appendChild(el('div', { class:'note-warn' }, `⚠ ${sectionNote}`));
      notes.appendChild(el('div', { class:'text-muted', style:'font-style:italic;margin-top:.2rem' }, 'Schedule shown is from dataset only. No appointment is booked.'));
      card.appendChild(notes);

      list.appendChild(card);
    });
    return list;
  }

  // ── Render: Progress Summary ─────────────────────────────────────────────
  function renderProgressSummary(sessions, completedSet) {
    const totalSessions  = sessions.length;
    const doneSessions   = sessions.filter(s => completedSet.has(s.id)).length;
    const totalMin       = sessions.reduce((s, x) => s + x.durationMin, 0);
    const doneMin        = sessions.filter(s => completedSet.has(s.id)).reduce((s, x) => s + x.durationMin, 0);
    const pct            = totalMin > 0 ? Math.round(doneMin / totalMin * 100) : 0;

    const grid = el('div', { class:'progress-summary-grid' });
    [
      [formatMinutes(totalMin), 'Planned'],
      [formatMinutes(doneMin),  'Completed'],
      [`${doneSessions}/${totalSessions}`, 'Sessions done'],
      [`${pct}%`,               'Progress'],
    ].forEach(([num, lbl]) => {
      const stat = el('div', { class:'progress-stat' });
      stat.appendChild(el('div', { class:'stat-num' }, num));
      stat.appendChild(el('div', { class:'stat-label' }, lbl));
      grid.appendChild(stat);
    });

    const barBg = el('div', { class:'progress-bar-week', role:'progressbar', 'aria-valuenow': pct, 'aria-valuemin':'0', 'aria-valuemax':'100' });
    barBg.appendChild(Object.assign(el('div', { class:'progress-bar-week-fill' }), { style: `width:${pct}%` }));

    const disclaimer = el('div', { class:'progress-disclaimer' },
      'Marking a session complete confirms you studied — it does not automatically verify academic mastery.'
    );

    const wrap = document.createDocumentFragment();
    wrap.appendChild(grid);
    wrap.appendChild(barBg);
    wrap.appendChild(el('div', { class:'mt-sm' }));
    wrap.appendChild(disclaimer);
    return wrap;
  }

  // ── Render: Explainability panel ─────────────────────────────────────────
  function renderExplainPanel(student, weekNum, prioritizedTopics, targetMin) {
    const body = el('div', { class:'explain-body' });

    body.innerHTML = `
      <h3>How your plan was created</h3>
      <p>Your plan is built from four types of information: <strong>diagnostic scores</strong> from your first four weeks, the <strong>Week ${weekNum} curriculum</strong>, <strong>upcoming assessments</strong>, and your <strong>recorded study availability</strong>. No external AI model was used — recommendations follow a fixed set of transparent rules.</p>

      <h3>Topic priority formula</h3>
      <p>Each topic receives a priority score between 0 and 1 based on:</p>
      <ul style="margin-left:1.2rem">
        <li><strong>${Math.round(CONFIG.priorityWeights.diagnosticWeakness*100)}%</strong> — how low your diagnostic score was</li>
        <li><strong>${Math.round(CONFIG.priorityWeights.weekRelevance*100)}%</strong> — whether the topic is in this week's coursework</li>
        <li><strong>${Math.round(CONFIG.priorityWeights.examProximity*100)}%</strong> — whether an exam or quiz covers it within 2 weeks</li>
        <li><strong>${Math.round(CONFIG.priorityWeights.homeworkProximity*100)}%</strong> — whether a homework is due this week</li>
      </ul>

      <h3>Scheduling rules</h3>
      <p>Sessions are placed only inside your recorded availability windows. Class meetings are blocked out automatically. Sessions are ${CONFIG.scheduling.minSessionMinutes}–${CONFIG.scheduling.maxSessionMinutes} minutes long, with ${CONFIG.scheduling.breakMinutes}-minute breaks. Your requested target was ${formatMinutes(targetMin)}.</p>

      <h3>Resource matching</h3>
      <p>Resources are matched by topic, your availability, section assignment, and modality preference. A resource is not booked — it is recommended for you to contact or visit directly.</p>

      <h3>What these recommendations are not</h3>
      <p>These suggestions are academic support tools, not official predictions of your grade or placement eligibility. Consult your instructor for personalized academic guidance.</p>

      <h3>Your top priorities this week</h3>
      <ul style="margin-left:1.2rem">
        ${prioritizedTopics.slice(0, 5).map(t => `<li>${t.explanation}</li>`).join('')}
      </ul>
    `;

    const details = el('details', { class:'explain-panel' });
    const summary = el('summary', {}, `${icons.info} How your plan was created`);
    summary.querySelector('svg').style.verticalAlign = 'middle';
    details.appendChild(summary);
    details.appendChild(body);
    return details;
  }

  return {
    icons,
    renderStudentSelector,
    renderStudentProfile,
    renderAcademicReadiness,
    renderWeekLabel,
    renderWeeklyCalendar,
    renderSessionList,
    renderDeadlines,
    renderResources,
    renderProgressSummary,
    renderExplainPanel,
    formatMinutes,
    formatDate,
    el,
  };
})();
