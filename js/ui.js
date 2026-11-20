// ui.js v2 — dashboard, Google-Calendar week view, streaks, deadlines, recommendations
// Depends on: config.js, data.js, analysis.js, persistence.js
(function () {
  'use strict';

  /* ─── tiny helpers ─────────────────────────────────────────── */
  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls)  e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  const DAY_ORDER = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

  function daysUntil(dateStr) {
    const today = new Date(); today.setHours(0,0,0,0);
    const due   = new Date(dateStr); due.setHours(0,0,0,0);
    return Math.round((due - today) / 86400000);
  }

  function dueBadge(dateStr) {
    const d = daysUntil(dateStr);
    if (d < 0)  return { cls: 'deadline-due--urgent', label: 'Overdue' };
    if (d === 0) return { cls: 'deadline-due--urgent', label: 'Due TODAY' };
    if (d <= 3)  return { cls: 'deadline-due--urgent', label: `Due in ${d}d` };
    if (d <= 7)  return { cls: 'deadline-due--soon',   label: `Due in ${d}d` };
    return               { cls: 'deadline-due--ok',    label: dateStr };
  }

  /* ─── SIDEBAR: student nav buttons ─────────────────────────── */
  function renderStudentNav(students, selectedId, onSelect) {
    const wrap = document.getElementById('student-nav');
    if (!wrap) return;
    wrap.innerHTML = '';
    students.forEach(s => {
      const btn = el('button', 'student-nav-btn' + (s.student_id === selectedId ? ' active' : ''));
      btn.innerHTML = `
        <span class="snb-avatar">${s.first_name[0]}</span>
        <span class="snb-info">
          <span class="snb-name">${s.first_name}</span>
          <span class="snb-prog">${s.program.replace(/ \(.*\)/, '')}</span>
        </span>`;
      btn.addEventListener('click', () => onSelect(s.student_id));
      wrap.appendChild(btn);
    });
  }

  /* ─── SIDEBAR: week nav ─────────────────────────────────────── */
  function renderWeekNav(currentWeek, onSelect) {
    const wrap = document.getElementById('week-nav');
    if (!wrap) return;
    wrap.innerHTML = '';
    for (let w = 1; w <= 12; w++) {
      const btn = el('button', 'week-nav-btn' + (w === currentWeek ? ' active' : ''), 'Wk ' + w);
      btn.addEventListener('click', () => onSelect(w));
      wrap.appendChild(btn);
    }
  }

  /* ─── TOP BAR: today date ───────────────────────────────────── */
  function renderTopBar() {
    const el2 = document.getElementById('today-date');
    if (!el2) return;
    const now = new Date();
    el2.textContent = now.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' });
  }

  /* ─── STAT CARDS ────────────────────────────────────────────── */
  function renderStats(student, rankedTopics, week) {
    const P      = window.Persistence;
    const streak = P.checkInStreak(student.student_id);
    const xp     = P.getXP(student.student_id);
    const lvl    = P.xpLevel(xp);
    const cal    = window.AppData.assignmentCalendar;

    // next deadline
    const upcoming = cal.filter(a => daysUntil(a.due_date) >= 0)
                        .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
    const next = upcoming[0];
    const nextDays = next ? daysUntil(next.due_date) : null;

    // average score
    const avgScore = rankedTopics.length
      ? Math.round(rankedTopics.reduce((s, t) => s + t.score_percent, 0) / rankedTopics.length)
      : 0;

    const wrap = document.getElementById('stat-cards');
    if (!wrap) return;
    wrap.innerHTML = `
      <div class="stat-card stat-card--streak">
        <div class="stat-label">Study Streak</div>
        <div class="stat-value"><span class="flame">🔥</span> ${streak}</div>
        <div class="stat-sub">${streak === 1 ? 'day — keep going!' : streak > 1 ? 'days in a row!' : 'Start today!'}</div>
      </div>
      <div class="stat-card stat-card--xp">
        <div class="stat-label">XP · ${lvl.title}</div>
        <div class="stat-value">${xp}</div>
        <div class="xp-bar-wrap"><div class="xp-bar-fill" style="width:${lvl.next ? Math.round((xp / lvl.next)*100) : 100}%"></div></div>
        <div class="stat-sub">${lvl.next ? `${lvl.next - xp} XP to next level` : 'Max level!'}</div>
      </div>
      <div class="stat-card stat-card--score">
        <div class="stat-label">Avg Diagnostic</div>
        <div class="stat-value">${avgScore}%</div>
        <div class="stat-sub">${avgScore >= 75 ? 'Looking strong' : avgScore >= 60 ? 'Room to grow' : 'Needs focus'}</div>
      </div>
      <div class="stat-card stat-card--deadline">
        <div class="stat-label">Next Deadline</div>
        <div class="stat-value">${nextDays === null ? '—' : nextDays === 0 ? 'TODAY' : nextDays + 'd'}</div>
        <div class="stat-sub">${next ? next.item : 'All clear'}</div>
      </div>`;
  }

  /* ─── TODAY RECOMMENDATION ──────────────────────────────────── */
  function renderTodayRec(student, rankedTopics, sessions) {
    const wrap = document.getElementById('today-rec');
    if (!wrap) return;

    const today   = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const todaySessions = sessions.filter(s => s.day === today);
    const topTopic = rankedTopics[0];
    const cal      = window.AppData.assignmentCalendar;

    // find the most urgent upcoming item
    const urgent = cal.filter(a => daysUntil(a.due_date) >= 0 && daysUntil(a.due_date) <= 7)
                      .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))[0];

    const workH = student.work_hours_per_week || 0;
    const workNote = workH >= 30 ? `You work ${workH} hrs/week — your plan is intentionally short.` : null;

    let action, why;
    if (todaySessions.length > 0) {
      action = `Today is ${today} — you have ${todaySessions.length} study session${todaySessions.length > 1 ? 's' : ''} scheduled.`;
      why    = `Focus on <strong>${todaySessions[0].topic}</strong> during your ${todaySessions[0].start}–${todaySessions[0].end} window.`;
    } else if (topTopic) {
      action = `No sessions today — but <strong>${topTopic.topic}</strong> is your weakest area (${topTopic.score_percent}%).`;
      why    = `Consider 20 minutes of online practice — it fits any free moment.`;
    } else {
      action = 'Set up your availability to get a personalised plan.';
      why    = '';
    }

    const chips = [];
    if (urgent) chips.push({ text: `⚠️ ${urgent.item} due in ${daysUntil(urgent.due_date)}d`, urgent: true });
    if (topTopic && topTopic.score_percent < 65) chips.push({ text: `📉 Weakest: ${topTopic.topic}`, urgent: false });
    if (workNote) chips.push({ text: `💼 ${workNote}`, urgent: false });

    wrap.innerHTML = `
      <div class="today-rec-label">👋 Your focus for today</div>
      <div class="today-rec-action">${action}</div>
      <div class="today-rec-why">${why}</div>
      <div class="today-rec-chips">
        ${chips.map(c => `<span class="rec-chip${c.urgent ? ' rec-chip--urgent' : ''}">${c.text}</span>`).join('')}
      </div>`;
  }

  /* ─── MOTIVATIONAL BANNER ───────────────────────────────────── */
  function renderMotivation(student, streak) {
    const wrap = document.getElementById('motive-banner');
    if (!wrap) return;
    const msgs = [
      `💪 You've got this, ${student.first_name}! Every session brings you closer to passing.`,
      `🎯 Small steps every day beat cramming the night before — keep showing up!`,
      `🏆 Your ${student.program} future starts with today's practice.`,
      `📈 Even 25 minutes of focused study moves the needle. You can do this!`,
      `✨ The students who succeed are the ones who ask for help early — that's you!`
    ];
    const msg = streak > 3
      ? `🔥 ${streak}-day streak! You're building real momentum, ${student.first_name}!`
      : msgs[Math.floor(Math.random() * msgs.length)];
    wrap.textContent = msg;
  }

  /* ─── GOOGLE-STYLE WEEKLY CALENDAR ─────────────────────────── */
  function renderCalendar(student, sessions, week) {
    const wrap = document.getElementById('cal-wrap');
    if (!wrap) return;

    const section = student.section || 'OL1';
    const classTimes = window.AppData.scheduleBySection[section] || [];
    const cal = window.AppData.assignmentCalendar;
    const toM = window.timeToMin;

    // hours shown: 8am–10pm
    const START_HOUR = 8, END_HOUR = 22;
    const TOTAL_H    = END_HOUR - START_HOUR;
    const PX_PER_H   = 48; // must match .cal-time-slot height

    // header
    const hdr = el('div', 'cal-header');
    hdr.innerHTML = '<div class="cal-time-col"></div>';
    DAY_ORDER.forEach(day => {
      const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
      const isToday = day === today;
      // compute date for this week day
      const semStart = new Date('2027-01-11'); // Monday week 1
      const weekOffset = (week - 1) * 7;
      const dayIdx = DAY_ORDER.indexOf(day);
      const d = new Date(semStart);
      d.setDate(semStart.getDate() + weekOffset + dayIdx);
      const dateNum = d.getDate();

      hdr.innerHTML += `<div class="cal-day-label${isToday ? ' today' : ''}">
        ${day.slice(0,3)}<span class="cal-day-num">${dateNum}</span>
      </div>`;
    });

    // grid
    const grid = el('div', 'cal-grid');

    // time column
    const timeCol = el('div', 'cal-time-col');
    for (let h = START_HOUR; h < END_HOUR; h++) {
      const slot = el('div', 'cal-time-slot', h === 12 ? '12 PM' : h < 12 ? h + ' AM' : (h - 12) + ' PM');
      timeCol.appendChild(slot);
    }
    grid.appendChild(timeCol);

    // day columns
    DAY_ORDER.forEach(day => {
      const col = el('div', 'cal-day-col');
      col.style.height = (TOTAL_H * PX_PER_H) + 'px';

      // hour lines
      for (let h = 0; h < TOTAL_H; h++) {
        const line = el('div', 'cal-hour-line');
        line.style.top = (h * PX_PER_H) + 'px';
        col.appendChild(line);
      }

      // class events
      classTimes.forEach(cs => {
        if (cs.day !== day || !cs.start) return;
        const top  = ((toM(cs.start) / 60) - START_HOUR) * PX_PER_H;
        const h    = ((toM(cs.end) - toM(cs.start)) / 60) * PX_PER_H;
        if (top < 0 || top > TOTAL_H * PX_PER_H) return;
        const ev = el('div', 'cal-event cal-event--class',
          `<div>${cs.course}</div><div style="font-weight:400;font-size:0.65rem">${cs.start}–${cs.end}</div>`);
        ev.style.top    = top + 'px';
        ev.style.height = Math.max(h, 24) + 'px';
        col.appendChild(ev);
      });

      // study sessions
      sessions.filter(s => s.day === day).forEach(s => {
        const top = ((toM(s.start) / 60) - START_HOUR) * PX_PER_H;
        const h   = ((toM(s.end) - toM(s.start)) / 60) * PX_PER_H;
        if (top < 0) return;
        const urgent = s.score < window.CONFIG.weakThreshold;
        const ev = el('div', `cal-event ${urgent ? 'cal-event--study-urgent' : 'cal-event--study'}`,
          `<div>📖 ${s.topic}</div><div style="font-weight:400;font-size:0.65rem">${s.start}–${s.end}</div>`);
        ev.style.top    = top + 'px';
        ev.style.height = Math.max(h, 28) + 'px';
        col.appendChild(ev);
      });

      // deadline markers (all-day style: stack at top)
      const weekDeadlines = cal.filter(a => {
        const semStart = new Date('2027-01-11');
        const weekOffset = (week - 1) * 7;
        const dayIdx = DAY_ORDER.indexOf(day);
        const d = new Date(semStart);
        d.setDate(semStart.getDate() + weekOffset + dayIdx);
        return a.due_date === d.toISOString().slice(0, 10);
      });
      weekDeadlines.forEach((a, i) => {
        const ev = el('div', 'cal-event cal-event--deadline',
          `${a.type === 'Exam' ? '🎓' : a.type === 'Quiz' ? '📝' : '📚'} ${a.item}`);
        ev.style.top    = (i * 22) + 'px';
        ev.style.height = '20px';
        ev.style.left   = '2px';
        ev.style.right  = '2px';
        col.appendChild(ev);
      });

      grid.appendChild(col);
    });

    wrap.innerHTML = '';
    wrap.appendChild(hdr);
    wrap.appendChild(grid);
  }

  /* ─── DEADLINES LIST ────────────────────────────────────────── */
  function renderDeadlines(week) {
    const wrap = document.getElementById('deadlines-list');
    if (!wrap) return;
    wrap.innerHTML = '';

    const cal = window.AppData.assignmentCalendar;
    const items = cal.filter(a => a.week >= week && a.week <= week + 2)
                     .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

    if (items.length === 0) {
      wrap.appendChild(el('p', 'empty', 'No deadlines in the next 2 weeks.'));
      return;
    }

    items.forEach(a => {
      const badge = dueBadge(a.due_date);
      const item  = el('div', 'deadline-item');
      item.innerHTML = `
        <div class="deadline-dot deadline-dot--${a.type.toLowerCase()}"></div>
        <div class="deadline-info">
          <div class="deadline-name">${a.item}</div>
          <div class="deadline-topic">${a.topic}</div>
        </div>
        <span class="deadline-due ${badge.cls}">${badge.label}</span>`;
      wrap.appendChild(item);
    });
  }

  /* ─── TOPIC SCORES ──────────────────────────────────────────── */
  function renderTopicScores(rankedTopics) {
    const wrap = document.getElementById('topic-scores');
    if (!wrap) return;
    wrap.innerHTML = '';

    rankedTopics.forEach(t => {
      const lbl = window.scoreLabel(t.score_percent);
      const row = el('div', 'topic-row-item');
      row.innerHTML = `
        <div class="topic-name-label">${t.topic}</div>
        <div class="topic-track"><div class="topic-fill topic-fill--${lbl}" style="width:${t.score_percent}%"></div></div>
        <div class="topic-score-num">${t.score_percent}%</div>`;
      wrap.appendChild(row);
    });
  }

  /* ─── STUDY SESSIONS LIST ───────────────────────────────────── */
  function renderSessions(sessions, student, week) {
    const wrap = document.getElementById('sessions-list');
    if (!wrap) return;
    wrap.innerHTML = '';

    // progress bar
    const done  = window.Persistence.countCompleted(student.student_id, week, sessions.length);
    const pct   = sessions.length ? Math.round((done / sessions.length) * 100) : 0;
    const prog  = el('div', 'progress-wrap');
    prog.innerHTML = `
      <div class="progress-label"><span>Week ${week} progress</span><strong>${done}/${sessions.length} done</strong></div>
      <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>`;
    wrap.appendChild(prog);

    if (sessions.length === 0) {
      wrap.appendChild(el('p', 'empty', 'No sessions — your availability windows are outside your class-free time, or all slots are filled. Try a different week.'));
      return;
    }

    sessions.forEach(s => {
      const isDone = window.Persistence.isComplete(student.student_id, week, s.sessionNum);
      const urgent = s.score < window.CONFIG.weakThreshold;
      const item   = el('div', 'session-item' + (isDone ? ' session-item--done' : ''));
      item.innerHTML = `
        <div class="session-check-wrap">
          <input type="checkbox" class="session-checkbox" ${isDone ? 'checked' : ''}>
        </div>
        <div class="session-body">
          <div class="session-title">${s.day} ${s.start}–${s.end} · ${s.topic}</div>
          <div class="session-meta">Score: ${s.score}% · Priority: ${(s.priority*100).toFixed(0)}/100</div>
          <div class="session-tags">
            ${urgent ? '<span class="session-tag session-tag--urgent">Needs focus</span>' : '<span class="session-tag">On track</span>'}
            ${s.reasons.map(r => `<span class="session-tag">${r}</span>`).join('')}
          </div>
        </div>`;

      item.querySelector('.session-checkbox').addEventListener('change', function () {
        window.Persistence.setComplete(student.student_id, week, s.sessionNum, this.checked);
        renderSessions(sessions, student, week); // re-render to update progress
        window.UI.renderStats(student, window.analyseTopics(student, week), week);
      });
      wrap.appendChild(item);
    });
  }

  /* ─── RESOURCES ─────────────────────────────────────────────── */
  function renderResources(matched) {
    const wrap = document.getElementById('resources-list');
    if (!wrap) return;
    wrap.innerHTML = '';

    const typeIcon = { 'Tutoring':'🧑‍🏫','Office hours':'👩‍💼','Lab':'🔬','Video':'▶️','Practice set':'📝','Workshop':'🛠️','Coaching':'💡' };
    const all = [...matched.fits.map(r => ({r, fit:true})), ...matched.alternatives.map(r => ({r, fit:false}))];

    if (all.length === 0) {
      wrap.appendChild(el('p', 'empty', 'No matching resources found.'));
      return;
    }

    all.forEach(({ r, fit }) => {
      const timeStr = r.day === 'Any'
        ? 'Available any time (online)'
        : `${r.day}${r.start ? ' ' + r.start + '–' + r.end : ''}`;
      const item = el('div', 'resource-item');
      item.innerHTML = `
        <div class="resource-icon-wrap">${typeIcon[r.type] || '📚'}</div>
        <div class="resource-body" style="flex:1">
          <div class="resource-name">${r.name}</div>
          <div class="resource-meta">${r.type} · ${r.modality} · ${r.location}</div>
          <div class="resource-time">${timeStr}</div>
          <div style="font-size:0.75rem;color:#6b7280;margin-top:2px">${r.description}</div>
        </div>
        <span class="${fit ? 'resource-fit-badge' : 'resource-alt-badge'}">${fit ? '✓ Fits' : 'Alt'}</span>`;
      wrap.appendChild(item);
    });
  }

  window.UI = {
    renderStudentNav,
    renderWeekNav,
    renderTopBar,
    renderStats,
    renderTodayRec,
    renderMotivation,
    renderCalendar,
    renderDeadlines,
    renderTopicScores,
    renderSessions,
    renderResources
  };
}());
