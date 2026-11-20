/**
 * ui.js — All DOM rendering functions.
 * Pure render helpers — no business logic, no data computation.
 * Redesigned for compact dashboard layout with integrated calendar and modal.
 */
const UI = (() => {

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
    return new Date(Date.UTC(y, m-1, d, 12)).toLocaleDateString('en-US',
      { month:'short', day:'numeric', weekday:'short', timeZone:'UTC' });
  }

  function formatDateShort(isoStr) {
    if (!isoStr) return '';
    const [y, m, d] = isoStr.split('-').map(Number);
    return new Date(Date.UTC(y, m-1, d, 12)).toLocaleDateString('en-US',
      { month:'short', day:'numeric', timeZone:'UTC' });
  }

  function formatMinutes(min) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (h === 0) return `${m} min`;
    if (m === 0) return `${h} hr`;
    return `${h} hr ${m} min`;
  }

  function catScoreClass(cat) {
    return { attention:'att', developing:'dev', strong:'str', 'not-assessed':'na' }[cat] || 'na';
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

  // ── Render: Student Profile (compact sidebar) ─────────────────────────────
  function renderStudentProfile(student) {
    const sectionLabels = {
      '01':  'Section 01 — M/W',
      '40':  'Section 40 — T/Th',
      'OL1': 'Section OL1 — Online',
    };
    const frag = document.createDocumentFragment();
    const nameEl = el('div', { class:'student-name-display' }, student.firstName);
    const metaEl = el('div', { class:'student-meta' }, student.program);
    const pillEl = el('div', {});
    pillEl.appendChild(el('span', { class:'section-pill' }, sectionLabels[student.section] || student.section || ''));
    frag.appendChild(nameEl);
    frag.appendChild(metaEl);
    frag.appendChild(pillEl);

    const grid = el('div', { class:'profile-mini', style:'margin-top:.5rem' });
    [
      ['Math', student.mathCourse],
      ['Support', student.supportCourse],
      ['Work hrs', student.workHours > 0 ? `${student.workHours}/wk` : 'None'],
      ['Modality', student.modality],
    ].forEach(([label, val]) => {
      grid.appendChild(el('span', { class:'pl' }, label));
      grid.appendChild(el('span', { class:'pv' }, val));
    });
    frag.appendChild(grid);
    return frag;
  }

  // ── Render: Top 3 Next Steps ──────────────────────────────────────────────
  function renderNextSteps(prioritizedTopics, weekNum, assignmentCalendar, plan) {
    // Return a DocumentFragment so the cards land directly inside the outer
    // #next-steps-body div (which owns the CSS grid), not inside a nested wrapper.
    const container = document.createDocumentFragment();
    if (!prioritizedTopics.length) {
      container.appendChild(el('div', { class:'empty-state' }, 'No priorities computed yet.'));
      return container;
    }

    // Build up to 3 steps from the top prioritized topics
    const weekAssignments = assignmentCalendar.filter(a => a.week === weekNum);
    const steps = [];

    prioritizedTopics.slice(0, 5).forEach(t => {
      if (steps.length >= 3) return;

      // Find relevant deadline
      const related = weekAssignments.find(a => {
        const tl = t.topic.toLowerCase();
        const al = a.topic.toLowerCase();
        return al === tl || al.includes(tl) || tl.includes(al);
      });

      let metaLine = '';
      if (related) {
        metaLine = `${related.type}: ${related.item} · due ${formatDateShort(related.dueDate)}`;
      } else if (plan && plan.sessions) {
        const sess = plan.sessions.find(s => s.topic === t.topic);
        if (sess) metaLine = `Study session: ${sess.day} ${sess.startTime}–${sess.endTime}`;
      }

      steps.push({ topic: t.topic, explanation: t.explanation, meta: metaLine, priority: t.priority });
    });

    // If fewer than 3 topic steps, fill with a study reminder or tutor step
    if (steps.length < 3 && plan && plan.sessions && plan.sessions.length) {
      steps.push({
        topic: 'Study plan',
        explanation: 'Review your study sessions in the Weekly Planner below.',
        meta: `${plan.sessions.length} session(s) scheduled this week`,
        priority: 0,
      });
    }

    steps.slice(0, 3).forEach((step, i) => {
      const card = el('div', { class:'next-step-card' });
      card.appendChild(el('div', { class:'step-num' }, `Priority ${i + 1}`));
      card.appendChild(el('div', { class:'step-title' }, step.topic));
      card.appendChild(el('div', { class:'step-explain' }, step.explanation));
      if (step.meta) card.appendChild(el('div', { class:'step-meta' }, step.meta));
      container.appendChild(card);
    });

    return container;
  }

  // ── Render: Week label ───────────────────────────────────────────────────
  function renderWeekLabel(weekNum) {
    const start = DataLoader.weekStartDate(weekNum);
    const end   = new Date(start);
    end.setUTCDate(end.getUTCDate() + 6);
    const fmtOpts = { month:'short', day:'numeric', timeZone:'UTC' };
    const startStr = start.toLocaleDateString('en-US', fmtOpts);
    const endStr   = end.toLocaleDateString('en-US', { ...fmtOpts, year:'numeric' });
    return `Week ${weekNum} · ${startStr}–${endStr}`;
  }

  // ── Render: Month Calendar ────────────────────────────────────────────────
  /**
   * Builds a full-month calendar grid.
   * - Shows all days in the month that contains the selected week.
   * - Highlights the selected planning week with a background tint.
   * - Places study sessions AND all semester assignments on their real dates.
   * - Below the month grid, renders a compact "Selected Week Details" strip.
   * - Clicking any event opens the detail modal.
   *
   * @param {array}  sessions          — scheduled study sessions for selectedWeek
   * @param {array}  assignmentCalendar — full semester assignment calendar
   * @param {number} weekNum           — selected semester week (1–12)
   * @param {Set}    completedSet
   * @param {function} onEventClick    — callback({ type, data })
   */
  function renderMonthCalendar(sessions, assignmentCalendar, weekNum, completedSet, onEventClick) {
    // ── 1. Derive the month to display ───────────────────────────────────────
    const selectedWeekMonday = DataLoader.weekStartDate(weekNum);
    // Use the month that contains the Monday of the selected week
    const displayYear  = selectedWeekMonday.getUTCFullYear();
    const displayMonth = selectedWeekMonday.getUTCMonth(); // 0-indexed

    // First and last days of the display month
    const monthStart = new Date(Date.UTC(displayYear, displayMonth, 1, 12));
    const monthEnd   = new Date(Date.UTC(displayYear, displayMonth + 1, 0, 12)); // last day

    // ── 2. Build a date-indexed event map covering the full semester ──────────
    // Map: "YYYY-MM-DD" → [eventObj, ...]
    const eventsByDate = {};
    function addEvent(dateStr, evt) {
      if (!eventsByDate[dateStr]) eventsByDate[dateStr] = [];
      eventsByDate[dateStr].push(evt);
    }

    // Study sessions (belong to selectedWeek)
    sessions.forEach(sess => {
      const dateStr = DataLoader.dateForWeekday(selectedWeekMonday, sess.day);
      if (dateStr) addEvent(dateStr, { type:'session', data: sess });
    });

    // All semester assignments/exams (all weeks, so they appear across the whole month)
    assignmentCalendar.forEach(a => {
      addEvent(a.dueDate, { type:'deadline', data: a });
    });

    // ── 3. Determine selected week date range ─────────────────────────────────
    const selWeekStart = selectedWeekMonday;
    const selWeekEndDate = new Date(selWeekStart);
    selWeekEndDate.setUTCDate(selWeekEndDate.getUTCDate() + 6);
    const selWeekStartStr = selWeekStart.toISOString().slice(0, 10);
    const selWeekEndStr   = selWeekEndDate.toISOString().slice(0, 10);

    function isInSelectedWeek(dateStr) {
      return dateStr >= selWeekStartStr && dateStr <= selWeekEndStr;
    }

    // ── 4. Build grid: find the leading Sunday before monthStart ─────────────
    // We use Sun=0 … Sat=6 for the standard calendar grid start
    const dowOfMonthStart = monthStart.getUTCDay(); // 0=Sun
    const gridStart = new Date(monthStart);
    gridStart.setUTCDate(gridStart.getUTCDate() - dowOfMonthStart);

    // We always render 6 weeks (42 cells) to keep a consistent height
    const totalCells = 42;

    // ── 5. Build month header row ─────────────────────────────────────────────
    const monthName = monthStart.toLocaleDateString('en-US', { month:'long', year:'numeric', timeZone:'UTC' });
    const wrapper = el('div', {});

    // Month label above the grid
    const monthLabel = el('div', {
      style: 'font-size:.88rem;font-weight:700;color:var(--text);margin-bottom:.5rem;display:flex;align-items:center;gap:.5rem',
    });
    monthLabel.textContent = monthName;
    // Show selected week label beside month name
    const wkBadge = el('span', { style:'font-size:.72rem;font-weight:600;background:var(--accent);color:#fff;padding:.1rem .5rem;border-radius:999px' });
    wkBadge.textContent = `Week ${weekNum} highlighted`;
    monthLabel.appendChild(wkBadge);
    wrapper.appendChild(monthLabel);

    // ── 6. Build the calendar grid ────────────────────────────────────────────
    const cal = el('div', { class:'month-calendar', role:'grid', 'aria-label':`Calendar for ${monthName}` });

    // Day-of-week header (Sun–Sat)
    const dowLabels = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const dowRow = el('div', { class:'month-dow-row', role:'row' });
    dowLabels.forEach(d => {
      dowRow.appendChild(el('div', { class:'month-dow-cell', role:'columnheader' }, d));
    });
    cal.appendChild(dowRow);

    // Build 6 week rows
    for (let week = 0; week < 6; week++) {
      const rowStart = new Date(gridStart);
      rowStart.setUTCDate(rowStart.getUTCDate() + week * 7);

      // Determine if this 7-day row overlaps the selected week
      const rowEnd = new Date(rowStart);
      rowEnd.setUTCDate(rowEnd.getUTCDate() + 6);
      const rowStartStr = rowStart.toISOString().slice(0, 10);
      const rowEndStr   = rowEnd.toISOString().slice(0, 10);
      // Row is "selected week" if it overlaps [selWeekStart, selWeekEnd]
      const isSelWeekRow = rowStartStr <= selWeekEndStr && rowEndStr >= selWeekStartStr;

      const weekRow = el('div', {
        class: `month-week-row${isSelWeekRow ? ' selected-week' : ''}`,
        role: 'row',
      });

      for (let dow = 0; dow < 7; dow++) {
        const cellDate = new Date(rowStart);
        cellDate.setUTCDate(cellDate.getUTCDate() + dow);
        const cellDateStr = cellDate.toISOString().slice(0, 10);
        const cellDay = cellDate.getUTCDate();
        const isThisMonth = cellDate.getUTCMonth() === displayMonth;

        const cell = el('div', {
          class: `month-day-cell${!isThisMonth ? ' other-month' : ''}`,
          role: 'gridcell',
          'aria-label': cellDateStr,
        });

        // Date number
        const dateNum = el('div', { class:'mdc-date' }, String(cellDay));
        cell.appendChild(dateNum);

        // Events for this date
        const dayEvts = eventsByDate[cellDateStr] || [];
        const evtsContainer = el('div', { class:'month-events' });

        dayEvts.forEach(evt => {
          let btn;
          if (evt.type === 'session') {
            const sess = evt.data;
            const done = completedSet.has(sess.id);
            btn = el('button', {
              class: `cal-evt cal-evt-study${done ? ' completed' : ''}`,
              type: 'button',
              title: `${sess.topic} · ${sess.startTime}–${sess.endTime}`,
            });
            const label = `${sess.startTime} ${sess.topic.length > 14 ? sess.topic.slice(0,14)+'…' : sess.topic}`;
            btn.textContent = label;
            btn.addEventListener('click', () => onEventClick(evt));
          } else {
            // deadline
            const a = evt.data;
            const isExam = a.type === 'Exam' || a.type === 'Quiz';
            btn = el('button', {
              class: `cal-evt ${isExam ? 'cal-evt-exam' : 'cal-evt-assign'}`,
              type: 'button',
              title: `${a.item} · ${a.course} · ${a.points} pts`,
            });
            btn.textContent = a.item.length > 18 ? a.item.slice(0,18)+'…' : a.item;
            btn.addEventListener('click', () => onEventClick(evt));
          }
          evtsContainer.appendChild(btn);
        });

        cell.appendChild(evtsContainer);
        weekRow.appendChild(cell);
      }
      cal.appendChild(weekRow);
    }

    wrapper.appendChild(cal);

    // ── 7. Selected Week Details strip ────────────────────────────────────────
    const strip = buildWeekDetailStrip(sessions, assignmentCalendar, weekNum,
      selWeekStartStr, completedSet, onEventClick);
    wrapper.appendChild(strip);

    return wrapper;
  }

  /**
   * Builds the "Selected Week Details" strip shown below the month calendar.
   * Shows a compact 7-column grid for the selected week only.
   */
  function buildWeekDetailStrip(sessions, assignmentCalendar, weekNum,
      selWeekStartStr, completedSet, onEventClick) {

    const selWeekStart = DataLoader.weekStartDate(weekNum);

    // Format the week date range
    const weekEnd = new Date(selWeekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
    const fmtOpts = { month:'short', day:'numeric', timeZone:'UTC' };
    const startLabel = selWeekStart.toLocaleDateString('en-US', fmtOpts);
    const endLabel   = weekEnd.toLocaleDateString('en-US', { ...fmtOpts, year:'numeric' });

    const strip = el('div', { class:'week-detail-strip' });
    const hdr = el('div', { class:'week-detail-header' });
    hdr.appendChild(el('span', {}, `📅 Week ${weekNum} — ${startLabel}–${endLabel}`));
    const statEl = el('span', { style:'font-size:.72rem;opacity:.85' });
    statEl.textContent = sessions.length
      ? `${sessions.length} study session(s) · click any event for details`
      : 'No study sessions this week · click assignments for details';
    hdr.appendChild(statEl);
    strip.appendChild(hdr);

    // 7-column body, one column per day Mon–Sun
    const body = el('div', { class:'week-detail-body' });
    const weekAssignments = assignmentCalendar.filter(a => a.week === weekNum);

    CONFIG.DAY_ORDER.forEach(day => {
      const dateStr = DataLoader.dateForWeekday(selWeekStart, day);
      const [, m, d] = (dateStr || '').split('-').map(Number);

      const col = el('div', { class:'wds-col' });
      col.appendChild(el('div', { class:'wds-col-head' }, `${day.slice(0,3)} ${m}/${d}`));

      // Study sessions this day
      sessions.filter(s => s.day === day).forEach(sess => {
        const done = completedSet.has(sess.id);
        const btn = el('button', {
          class: `cal-evt cal-evt-study${done ? ' completed' : ''}`,
          type: 'button',
          title: `${sess.topic} · ${sess.startTime}–${sess.endTime}`,
        });
        btn.textContent = `${sess.startTime} ${sess.topic.length > 13 ? sess.topic.slice(0,13)+'…' : sess.topic}`;
        btn.addEventListener('click', () => onEventClick({ type:'session', data: sess }));
        col.appendChild(btn);
      });

      // Assignment deadlines this date
      weekAssignments.filter(a => a.dueDate === dateStr).forEach(a => {
        const isExam = a.type === 'Exam' || a.type === 'Quiz';
        const btn = el('button', {
          class: `cal-evt ${isExam ? 'cal-evt-exam' : 'cal-evt-assign'}`,
          type: 'button',
          title: `${a.item} · ${a.course}`,
        });
        btn.textContent = a.item.length > 18 ? a.item.slice(0,18)+'…' : a.item;
        btn.addEventListener('click', () => onEventClick({ type:'deadline', data: a }));
        col.appendChild(btn);
      });

      body.appendChild(col);
    });
    strip.appendChild(body);
    return strip;
  }

  // Keep old name as alias for backward compatibility with any test references
  const renderIntegratedCalendar = renderMonthCalendar;

  // ── Render: Academic Readiness (compact 2-col grid) ──────────────────────
  function renderAcademicReadiness(prioritizedTopics) {
    const container = document.createDocumentFragment();
    const grid = el('div', { id:'readiness-grid' });

    prioritizedTopics.forEach(t => {
      const sc = catScoreClass(t.category);
      const card = el('div', { class:`topic-card cat-${t.category}` });

      const hdr = el('div', { class:'tc-header' });
      hdr.appendChild(el('span', { class:'tc-name' }, t.topic));
      const scoreEl = el('span', { class:`tc-score ${sc}` });
      scoreEl.textContent = t.score !== null ? `${t.score}%` : 'N/A';
      hdr.appendChild(scoreEl);
      card.appendChild(hdr);

      const barBg = el('div', { class:'tc-bar-bg', role:'progressbar', 'aria-valuenow': t.score ?? 0, 'aria-valuemin':'0', 'aria-valuemax':'100', 'aria-label': t.topic });
      const fill = el('div', { class:`tc-bar-fill ${sc}` });
      fill.style.width = `${t.score ?? 50}%`;
      barBg.appendChild(fill);
      card.appendChild(barBg);

      const catLabels = {
        attention: 'Needs attention',
        developing: 'Developing',
        strong: 'Strong',
        'not-assessed': 'Not assessed',
      };
      card.appendChild(el('div', { class:'tc-category' }, catLabels[t.category] || ''));
      grid.appendChild(card);
    });

    if (!prioritizedTopics.length) {
      grid.appendChild(el('div', { class:'empty-state' }, 'No diagnostic data available.'));
    }

    container.appendChild(grid);
    return container;
  }

  // ── Render: Compact Deadlines ─────────────────────────────────────────────
  function renderDeadlines(assignments, currentWeek, onDeadlineClick) {
    const visible = assignments
      .filter(a => a.week >= currentWeek && a.week <= currentWeek + 2)
      .slice(0, 7);

    if (!visible.length) return el('div', { class:'empty-state' }, 'No upcoming deadlines.');

    const list = el('div', { class:'deadline-compact-list' });
    visible.forEach(a => {
      const isThisWeek = a.week === currentWeek;
      const typeLower  = a.type.toLowerCase();
      const item = el('div', {
        class: `dl-item${isThisWeek ? ' this-week' : ''}`,
        role: 'button',
        tabindex: '0',
        'aria-label': `${a.item}, due ${a.dueDate}`,
      });

      const dot = el('div', { class:`dl-type-dot dl-dot-${typeLower}` });
      item.appendChild(dot);

      const nameEl = el('span', { class:'dl-name' });
      nameEl.textContent = a.item.length > 30 ? a.item.slice(0,30)+'…' : a.item;
      item.appendChild(nameEl);

      item.appendChild(el('span', { class:'dl-date' }, formatDateShort(a.dueDate)));

      if (isThisWeek) {
        item.appendChild(el('span', { class:'dl-week-tag' }, 'This week'));
      }

      item.addEventListener('click', () => onDeadlineClick && onDeadlineClick(a));
      item.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onDeadlineClick && onDeadlineClick(a); } });
      list.appendChild(item);
    });
    return list;
  }

  // ── Render: Resource Center ───────────────────────────────────────────────
  function renderResources(recommendations, onResourceClick, activeFilter) {
    if (!recommendations.length) return el('div', { class:'empty-state' }, 'No matching resources found.');

    const container = document.createDocumentFragment();

    // Filter bar
    const filters = ['All', 'Available', 'Online', 'Tutoring', 'Office hours', 'Video / Practice'];
    const filterBar = el('div', { class:'resource-filters', role:'group', 'aria-label':'Filter resources' });
    filters.forEach(f => {
      const btn = el('button', {
        class: `filter-btn${(!activeFilter || activeFilter === f) && f === 'All' ? ' active' : (activeFilter === f ? ' active' : '')}`,
        type: 'button',
        'data-filter': f,
        'aria-pressed': (activeFilter || 'All') === f ? 'true' : 'false',
      });
      btn.textContent = f;
      filterBar.appendChild(btn);
    });
    container.appendChild(filterBar);

    // Apply filter
    const curFilter = activeFilter || 'All';
    const filtered = recommendations.filter(rec => {
      if (curFilter === 'All') return true;
      if (curFilter === 'Available') return rec.availFit !== 'unavailable';
      if (curFilter === 'Online') return rec.resource.modality === 'Online';
      if (curFilter === 'Tutoring') return rec.resource.type === 'Tutoring';
      if (curFilter === 'Office hours') return rec.resource.type === 'Office hours';
      if (curFilter === 'Video / Practice') return ['Video','Practice set'].includes(rec.resource.type);
      return true;
    });

    // Top 3 featured cards
    const top3 = filtered.slice(0, 3);
    const topGrid = el('div', { class:'resource-center-top' });
    top3.forEach(rec => {
      topGrid.appendChild(renderResourceCard(rec, onResourceClick));
    });
    container.appendChild(topGrid);

    // Expandable "all resources" list
    if (filtered.length > 3) {
      const details = el('details', {});
      const summary = el('summary', { style:'cursor:pointer;font-size:.78rem;font-weight:600;color:var(--accent);padding:.3rem 0;user-select:none' });
      summary.textContent = `▶ See all ${filtered.length} matching resources`;
      details.appendChild(summary);

      const allList = el('div', { class:'all-resources-list', style:'margin-top:.5rem' });
      filtered.slice(3).forEach(rec => {
        const { resource, availFit, whySelected } = rec;
        const row = el('div', {
          class: `all-res-row${availFit === 'unavailable' ? ' unavail' : ''}`,
          role:'button', tabindex:'0',
        });

        // Availability dot
        const dot = el('div', { style:`width:8px;height:8px;border-radius:50%;flex-shrink:0;background:${availFit === 'available' ? '#10b981' : availFit === 'on-demand' ? '#1a56b0' : '#d97706'}` });
        row.appendChild(dot);
        row.appendChild(el('span', { class:'all-res-name' }, resource.name));
        row.appendChild(el('span', { class:'all-res-type' }, resource.type));
        const availLabel = availFit === 'available' ? '✓ Fits schedule' : availFit === 'on-demand' ? 'On demand' : 'Schedule conflict';
        row.appendChild(el('span', { style:'font-size:.68rem;color:var(--muted)' }, availLabel));

        row.addEventListener('click', () => onResourceClick && onResourceClick(rec));
        row.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onResourceClick && onResourceClick(rec); } });
        allList.appendChild(row);
      });
      details.appendChild(allList);
      container.appendChild(details);
    }

    if (!filtered.length) {
      container.appendChild(el('div', { class:'empty-state' }, 'No resources match this filter.'));
    }

    return container;
  }

  function renderResourceCard(rec, onResourceClick) {
    const { resource, availFit, hasConflict, sectionFit, whySelected, availNote, conflictNote, sectionNote, scheduleNote } = rec;
    const fitClass = availFit === 'available' ? 'fit-available' : availFit === 'on-demand' ? 'fit-on-demand' : 'fit-unavailable';

    const card = el('div', { class:`res-card ${fitClass}`, role:'button', tabindex:'0', style:'cursor:pointer' });

    const nameLine = el('div', { class:'res-card-name' }, resource.name);
    card.appendChild(nameLine);

    const badges = el('div', { class:'res-card-badges' });
    if (availFit === 'available') badges.appendChild(el('span', { class:'badge badge-green' }, '✓ Fits schedule'));
    else if (availFit === 'on-demand') badges.appendChild(el('span', { class:'badge badge-blue' }, 'On demand'));
    else badges.appendChild(el('span', { class:'badge badge-amber' }, 'Time conflict'));
    badges.appendChild(el('span', { class:`badge ${resource.modality === 'Online' ? 'badge-blue' : 'badge-gray'}` }, resource.modality));
    badges.appendChild(el('span', { class:'badge badge-gray' }, resource.type));
    card.appendChild(badges);

    card.appendChild(el('div', { class:'res-card-why' }, whySelected));

    if (resource.start) {
      card.appendChild(el('div', { class:'res-card-sched' }, scheduleNote));
    }

    if (resource.location) {
      card.appendChild(el('div', { class:'res-card-location' }, `📍 ${resource.location}`));
    }

    if (hasConflict || !sectionFit) {
      card.appendChild(el('div', { class:'res-card-warning' }, hasConflict ? '⚠ Conflicts with class meeting' : '⚠ Different section'));
    }

    card.appendChild(el('div', { class:'res-card-no-book' }, 'No appointment booked — contact directly.'));

    card.addEventListener('click', () => onResourceClick && onResourceClick(rec));
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onResourceClick && onResourceClick(rec); } });
    return card;
  }

  // ── Render: Progress Summary (compact, sidebar) ───────────────────────────
  function renderProgressSummary(sessions, completedSet) {
    const totalSessions = sessions.length;
    const doneSessions  = sessions.filter(s => completedSet.has(s.id)).length;
    const totalMin      = sessions.reduce((s, x) => s + x.durationMin, 0);
    const doneMin       = sessions.filter(s => completedSet.has(s.id)).reduce((s, x) => s + x.durationMin, 0);
    const pct           = totalMin > 0 ? Math.round(doneMin / totalMin * 100) : 0;

    const frag = document.createDocumentFragment();

    const grid = el('div', { class:'progress-compact' });
    [
      [formatMinutes(totalMin), 'Planned'],
      [formatMinutes(doneMin),  'Done'],
      [`${doneSessions}/${totalSessions}`, 'Sessions'],
      [`${pct}%`, 'Progress'],
    ].forEach(([num, lbl]) => {
      const stat = el('div', { class:'prog-stat' });
      stat.appendChild(el('div', { class:'ps-num' }, num));
      stat.appendChild(el('div', { class:'ps-lbl' }, lbl));
      grid.appendChild(stat);
    });
    frag.appendChild(grid);

    const barBg = el('div', { class:'progress-bar-thin', role:'progressbar', 'aria-valuenow': pct, 'aria-valuemin':'0', 'aria-valuemax':'100' });
    barBg.appendChild(Object.assign(el('div', { class:'progress-bar-thin-fill' }), { style: `width:${pct}%` }));
    frag.appendChild(barBg);

    frag.appendChild(el('div', { class:'progress-disclaimer-sm' },
      'Completing a session confirms you studied — not automatic mastery.'
    ));
    return frag;
  }

  // ── Render: Explainability panel ─────────────────────────────────────────
  function renderExplainPanel(student, weekNum, prioritizedTopics, targetMin) {
    const body = el('div', { class:'explain-body' });
    body.innerHTML = `
      <h3>How your plan was created</h3>
      <p>Built from <strong>diagnostic scores</strong> (Weeks 1–4), the <strong>Week ${weekNum} curriculum</strong>, <strong>upcoming assessments</strong>, and your <strong>recorded availability</strong>. No external AI model — transparent rule-based recommendations only.</p>
      <h3>Topic priority formula</h3>
      <ul>
        <li><strong>${Math.round(CONFIG.priorityWeights.diagnosticWeakness*100)}%</strong> — how low your diagnostic score was</li>
        <li><strong>${Math.round(CONFIG.priorityWeights.weekRelevance*100)}%</strong> — topic in this week's coursework</li>
        <li><strong>${Math.round(CONFIG.priorityWeights.examProximity*100)}%</strong> — exam or quiz within 2 weeks</li>
        <li><strong>${Math.round(CONFIG.priorityWeights.homeworkProximity*100)}%</strong> — homework due this week</li>
      </ul>
      <h3>Scheduling</h3>
      <p>Sessions placed only inside your recorded windows, with class meetings blocked. ${CONFIG.scheduling.minSessionMinutes}–${CONFIG.scheduling.maxSessionMinutes} min sessions, ${CONFIG.scheduling.breakMinutes}-min breaks. Target: ${formatMinutes(targetMin)}.</p>
      <h3>Resources</h3>
      <p>Matched by topic, your availability (exact time-window overlap), section, and modality. Not booked — contact directly.</p>
      <h3>Disclaimer</h3>
      <p>Suggestions are academic support tools, not official predictions of grade or placement eligibility. Consult your instructor for personalized guidance.</p>
      <h3>Your top priorities this week</h3>
      <ul>${prioritizedTopics.slice(0,5).map(t => `<li>${t.explanation}</li>`).join('')}</ul>
    `;

    const details = el('details', { class:'explain-panel' });
    const summary = el('summary', {});
    summary.textContent = 'ℹ How your plan was created';
    details.appendChild(summary);
    details.appendChild(body);
    return details;
  }

  // ── Modal helpers (called by app.js) ─────────────────────────────────────
  /**
   * Build modal content for a study session event.
   * Returns { titleEl, bodyEl, footerEl }
   */
  function buildSessionModal(sess, completedSet, onToggle) {
    const done = completedSet.has(sess.id);

    const body = document.createDocumentFragment();

    // Type bar
    const typeBar = el('div', { class:'modal-type-bar' });
    typeBar.appendChild(el('span', { class:'badge badge-blue' }, '📚 Study Session'));
    if (done) typeBar.appendChild(el('span', { class:'badge badge-green' }, '✓ Completed'));
    body.appendChild(typeBar);

    const rows = [
      ['Day',      sess.day],
      ['Time',     `${sess.startTime} – ${sess.endTime}`],
      ['Duration', formatMinutes(sess.durationMin)],
      ['Topic',    sess.topic],
      ['Activity', sess.activity],
    ];
    rows.forEach(([lbl, val]) => {
      const row = el('div', { class:'modal-row' });
      row.appendChild(el('span', { class:'ml' }, lbl));
      row.appendChild(el('span', { class:'mv' }, val));
      body.appendChild(row);
    });

    body.appendChild(el('div', { class:'modal-reason' }, sess.reason));

    // Footer: completion checkbox
    const footer = document.createDocumentFragment();
    const cb = el('input', {
      type: 'checkbox',
      id: `modal-cb-${sess.id}`,
      checked: done,
      'aria-label': 'Mark session complete',
      style: 'width:1rem;height:1rem;accent-color:var(--green);cursor:pointer',
    });
    cb.addEventListener('change', () => onToggle(sess.id, cb.checked));
    const lbl = el('label', { for: `modal-cb-${sess.id}`, style:'font-size:.82rem;font-weight:600;cursor:pointer;margin:0' },
      done ? 'Marked complete — uncheck to undo' : 'Mark this session complete'
    );
    footer.appendChild(cb);
    footer.appendChild(lbl);

    return { title: `${sess.topic} — ${sess.day}`, body, footer };
  }

  /**
   * Build modal content for a deadline/assignment event.
   */
  function buildDeadlineModal(assignment) {
    const body = document.createDocumentFragment();

    const typeClass = { Exam:'badge-red', Quiz:'badge-amber', Homework:'badge-blue', Practice:'badge-green' }[assignment.type] || 'badge-gray';
    const typeBar = el('div', { class:'modal-type-bar' });
    typeBar.appendChild(el('span', { class:`badge ${typeClass}` }, assignment.type));
    body.appendChild(typeBar);

    const rows = [
      ['Course',    assignment.course],
      ['Due date',  formatDate(assignment.dueDate)],
      ['Topic',     assignment.topic],
      ['Points',    `${assignment.points} pts`],
    ];
    rows.forEach(([lbl, val]) => {
      const row = el('div', { class:'modal-row' });
      row.appendChild(el('span', { class:'ml' }, lbl));
      row.appendChild(el('span', { class:'mv' }, val));
      body.appendChild(row);
    });

    return { title: assignment.item, body, footer: document.createDocumentFragment() };
  }

  /**
   * Build modal content for a resource recommendation.
   */
  function buildResourceModal(rec) {
    const { resource, availFit, hasConflict, sectionFit, whySelected, availNote, conflictNote, sectionNote, scheduleNote } = rec;
    const body = document.createDocumentFragment();

    const typeBar = el('div', { class:'modal-type-bar' });
    typeBar.appendChild(el('span', { class:'badge badge-gray' }, resource.type));
    if (availFit === 'available') typeBar.appendChild(el('span', { class:'badge badge-green' }, '✓ Fits schedule'));
    else if (availFit === 'on-demand') typeBar.appendChild(el('span', { class:'badge badge-blue' }, 'On demand'));
    else typeBar.appendChild(el('span', { class:'badge badge-amber' }, 'Time conflict'));
    typeBar.appendChild(el('span', { class:`badge ${resource.modality === 'Online' ? 'badge-blue' : 'badge-gray'}` }, resource.modality));
    body.appendChild(typeBar);

    body.appendChild(el('div', { class:'modal-row', style:'margin-bottom:.5rem' },
      el('span', { class:'ml' }, 'Why recommended'),
      el('span', { class:'mv' }, whySelected)
    ));

    const rows = [
      ['Topics',    resource.topics.includes('All') ? 'All math topics' : resource.topics.join(', ')],
      ['Schedule',  scheduleNote],
      ['Location',  resource.location],
    ];
    rows.forEach(([lbl, val]) => {
      const row = el('div', { class:'modal-row' });
      row.appendChild(el('span', { class:'ml' }, lbl));
      row.appendChild(el('span', { class:'mv' }, val));
      body.appendChild(row);
    });

    body.appendChild(el('div', { class:'modal-row' },
      el('span', { class:'ml' }, 'Your availability'),
      el('span', { class:'mv' }, availNote)
    ));

    if (conflictNote) {
      body.appendChild(el('div', { class:'modal-reason', style:'border-left-color:var(--amber)' }, `⚠ ${conflictNote}`));
    }
    if (sectionNote) {
      body.appendChild(el('div', { class:'modal-reason', style:'border-left-color:var(--amber)' }, `⚠ ${sectionNote}`));
    }

    body.appendChild(el('div', { class:'modal-reason' }, resource.description));
    body.appendChild(el('p', { style:'font-size:.7rem;color:var(--muted);font-style:italic;margin-top:.6rem' },
      'Schedule information is from the dataset only. No appointment is booked through this tool.'
    ));

    return { title: resource.name, body, footer: document.createDocumentFragment() };
  }

  return {
    el,
    formatDate,
    formatDateShort,
    formatMinutes,
    renderStudentSelector,
    renderStudentProfile,
    renderNextSteps,
    renderWeekLabel,
    renderMonthCalendar,
    renderIntegratedCalendar, // alias → renderMonthCalendar
    renderAcademicReadiness,
    renderDeadlines,
    renderResources,
    renderProgressSummary,
    renderExplainPanel,
    buildSessionModal,
    buildDeadlineModal,
    buildResourceModal,
  };
})();
