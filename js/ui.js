// ui.js v3 — Google/Apple-style dashboard UI with tutor names, pills instead of prose
(function () {
  'use strict';

  /* ── helpers ── */
  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls)  e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }
  const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

  function daysUntil(d) {
    const t = new Date(); t.setHours(0,0,0,0);
    const x = new Date(d); x.setHours(0,0,0,0);
    return Math.round((x - t) / 86400000);
  }
  function urgencyPill(dateStr) {
    const d = daysUntil(dateStr);
    if (d < 0)   return { cls:'pill--red',   label:'Overdue' };
    if (d === 0) return { cls:'pill--red',   label:'Due today' };
    if (d <= 3)  return { cls:'pill--red',   label:`${d}d left` };
    if (d <= 7)  return { cls:'pill--amber', label:`${d}d left` };
    return               { cls:'pill--green',label: dateStr };
  }
  function scoreFill(s) {
    if (s >= window.CONFIG.strongThreshold) return 'score-fill--green';
    if (s >= window.CONFIG.weakThreshold)   return 'score-fill--amber';
    return 'score-fill--red';
  }

  /* ══ TOP BAR ══════════════════════════════════════════ */
  function renderTopBar() {
    const e = document.getElementById('today-date');
    if (!e) return;
    e.textContent = new Date().toLocaleDateString('en-US',
      { weekday:'short', month:'short', day:'numeric', year:'numeric' });
  }

  /* ══ SIDEBAR — students ═══════════════════════════════ */
  function renderStudentNav(students, selectedId, onSelect) {
    const wrap = document.getElementById('student-nav');
    if (!wrap) return;
    wrap.innerHTML = '';
    students.forEach(s => {
      const mod = s.modality.toLowerCase();
      const avClass = mod === 'hybrid' ? 'snb-av snb-av--hybrid'
                    : mod === 'online' ? 'snb-av snb-av--online'
                    : 'snb-av';
      const btn = el('button', 'student-nav-btn' + (s.student_id === selectedId ? ' active' : ''));
      btn.innerHTML = `
        <span class="${avClass}">${s.first_name[0]}</span>
        <span>
          <div class="snb-txt-name">${s.first_name}</div>
          <div class="snb-txt-prog">${s.program.replace(/ \(.*\)/, '')}</div>
        </span>`;
      btn.addEventListener('click', () => onSelect(s.student_id));
      wrap.appendChild(btn);
    });
  }

  /* ══ SIDEBAR — weeks ══════════════════════════════════ */
  function renderWeekNav(current, onSelect) {
    const wrap = document.getElementById('week-nav');
    if (!wrap) return;
    wrap.innerHTML = '';
    for (let w = 1; w <= 12; w++) {
      const p = el('button', 'week-pill' + (w === current ? ' active' : ''), 'W' + w);
      p.addEventListener('click', () => onSelect(w));
      wrap.appendChild(p);
    }
  }

  /* ══ STAT TILES ═══════════════════════════════════════ */
  function renderStats(student, ranked, week) {
    const P      = window.Persistence;
    const streak = P.checkInStreak(student.student_id);
    const xp     = P.getXP(student.student_id);
    const lvl    = P.xpLevel(xp);
    const cal    = window.AppData.assignmentCalendar;
    const nxt    = cal.filter(a => daysUntil(a.due_date) >= 0)
                      .sort((a,b) => new Date(a.due_date)-new Date(b.due_date))[0];
    const nxtD   = nxt ? daysUntil(nxt.due_date) : null;
    const avg    = ranked.length
      ? Math.round(ranked.reduce((s,t)=>s+t.score_percent,0)/ranked.length) : 0;

    const wrap = document.getElementById('stat-row');
    if (!wrap) return;
    wrap.innerHTML = `
      <div class="stat-tile stat-tile--streak">
        <div class="stat-tile-icon stat-tile-icon--streak">🔥</div>
        <div class="stat-tile-lbl">Streak</div>
        <div class="stat-tile-val"><span class="flame">${streak}</span></div>
        <div class="stat-tile-sub">${streak === 1 ? 'day — keep it up!' : streak > 1 ? 'days in a row' : 'Start today!'}</div>
      </div>
      <div class="stat-tile stat-tile--xp">
        <div class="stat-tile-icon stat-tile-icon--xp">⚡</div>
        <div class="stat-tile-lbl">XP · ${lvl.title}</div>
        <div class="stat-tile-val">${xp}</div>
        <div class="xp-mini-bar"><div class="xp-mini-fill" style="width:${lvl.next?Math.min(100,Math.round(xp/lvl.next*100)):100}%"></div></div>
        <div class="stat-tile-sub">${lvl.next ? lvl.next-xp+' XP to level up' : 'Max level!'}</div>
      </div>
      <div class="stat-tile stat-tile--score">
        <div class="stat-tile-icon stat-tile-icon--score">📈</div>
        <div class="stat-tile-lbl">Avg Score</div>
        <div class="stat-tile-val">${avg}%</div>
        <div class="stat-tile-sub">${avg>=75?'Looking strong':avg>=60?'Room to grow':'Needs work'}</div>
      </div>
      <div class="stat-tile stat-tile--dead">
        <div class="stat-tile-icon stat-tile-icon--dead">⏰</div>
        <div class="stat-tile-lbl">Next Due</div>
        <div class="stat-tile-val">${nxtD===null?'—':nxtD===0?'Today':nxtD+'d'}</div>
        <div class="stat-tile-sub">${nxt?nxt.item:'All clear'}</div>
      </div>`;
  }

  /* ══ TODAY CARD ═══════════════════════════════════════ */
  function renderTodayCard(student, ranked, sessions) {
    const wrap = document.getElementById('today-card');
    if (!wrap) return;
    const todayName = new Date().toLocaleDateString('en-US',{weekday:'long'});
    const todaySess = sessions.filter(s=>s.day===todayName);
    const topTopic  = ranked[0];
    const cal       = window.AppData.assignmentCalendar;
    const urgent    = cal.filter(a=>daysUntil(a.due_date)>=0&&daysUntil(a.due_date)<=7)
                        .sort((a,b)=>new Date(a.due_date)-new Date(b.due_date))[0];

    let heading, sub;
    if (todaySess.length) {
      heading = `${todayName} — ${todaySess.length} session${todaySess.length>1?'s':''} scheduled`;
      sub     = `Study <strong>${todaySess[0].topic}</strong> · ${todaySess[0].start}–${todaySess[0].end}`;
    } else if (topTopic) {
      heading = `No sessions today — focus on <strong>${topTopic.topic}</strong>`;
      sub     = `Your score is ${topTopic.score_percent}% — 20 min of practice moves the needle.`;
    } else {
      heading = 'Set your availability to get a personalised plan';
      sub     = '';
    }

    const pills = [];
    if (urgent) pills.push({ txt:`⚠️ ${urgent.item} — ${daysUntil(urgent.due_date)}d`, red:true });
    if (topTopic && topTopic.score_percent < 65) pills.push({ txt:`📉 Weakest: ${topTopic.topic}`, red:false });
    if (student.work_hours_per_week >= 30) pills.push({ txt:`💼 ${student.work_hours_per_week} hrs/wk — plan capped`, red:false });

    wrap.innerHTML = `
      <div class="today-eyebrow">👋 Today's focus · ${student.first_name}</div>
      <div class="today-heading">${heading}</div>
      ${sub ? `<div class="today-sub">${sub}</div>` : ''}
      <div class="today-pills">
        ${pills.map(p=>`<span class="today-pill${p.red?' today-pill--red':''}">${p.txt}</span>`).join('')}
      </div>`;
  }

  /* ══ MOTIVE BANNER ════════════════════════════════════ */
  function renderMotive(student, streak) {
    const wrap = document.getElementById('motive-banner');
    if (!wrap) return;
    const msgs = [
      `💪 You've got this, ${student.first_name}! Every session brings you closer to passing.`,
      `🎯 Small steps beat cramming. Keep showing up!`,
      `🏆 Your ${student.program.replace(/ \(.*\)/,'')} future starts with today's practice.`,
      `✨ The students who succeed ask for help early — that's you.`
    ];
    wrap.textContent = streak > 3
      ? `🔥 ${streak}-day streak! Keep the momentum, ${student.first_name}!`
      : msgs[new Date().getDay() % msgs.length];
  }

  /* ══ CALENDAR ════════════════════════════════════════ */
  function renderCalendar(student, sessions, week) {
    const wrap = document.getElementById('cal-wrap');
    if (!wrap) return;
    const section    = student.section || 'OL1';
    const classTimes = window.AppData.scheduleBySection[section] || [];
    const cal        = window.AppData.assignmentCalendar;
    const toM        = window.timeToMin;
    const SH = 8, EH = 21;   // 8am–9pm
    const PH = 44;            // px per hour (matches .cal-time-label height)

    /* header */
    const hdr = el('div','cal-header');
    hdr.innerHTML = '<div></div>'; // time gutter placeholder
    const semMon = new Date('2027-01-11');
    DAYS.forEach((day, di) => {
      const todayName = new Date().toLocaleDateString('en-US',{weekday:'long'});
      const d = new Date(semMon);
      d.setDate(semMon.getDate() + (week-1)*7 + di);
      const isToday = day === todayName;
      hdr.innerHTML += `<div class="cal-day-col-hd${isToday?' today-col':''}">
        ${day.slice(0,3)}<span class="cal-day-num">${d.getDate()}</span>
      </div>`;
    });

    /* grid */
    const grid = el('div','cal-grid');

    /* time column */
    const timeCol = el('div','cal-time-col-body');
    for (let h = SH; h < EH; h++) {
      const lbl = h === 12 ? '12 PM' : h < 12 ? h+' AM' : (h-12)+' PM';
      timeCol.appendChild(el('div','cal-time-label',lbl));
    }
    grid.appendChild(timeCol);

    /* day columns */
    DAYS.forEach((day, di) => {
      const col = el('div','cal-day-body');
      col.style.height = ((EH-SH)*PH)+'px';

      /* hour lines */
      for (let h = 0; h < EH-SH; h++) {
        const ln = el('div','cal-h-line'); ln.style.top=(h*PH)+'px'; col.appendChild(ln);
      }

      /* class events */
      classTimes.forEach(cs => {
        if (cs.day !== day || !cs.start) return;
        const top = ((toM(cs.start)/60)-SH)*PH;
        const ht  = ((toM(cs.end)-toM(cs.start))/60)*PH;
        if (top < 0) return;
        const ev = el('div','cal-ev cal-ev--class');
        ev.innerHTML = `<div>${cs.course}</div><div style="font-weight:400">${cs.start}–${cs.end}</div>`;
        ev.style.cssText = `top:${top}px;height:${Math.max(ht,22)}px`;
        col.appendChild(ev);
      });

      /* study sessions */
      sessions.filter(s=>s.day===day).forEach(s => {
        const top = ((toM(s.start)/60)-SH)*PH;
        const ht  = ((toM(s.end)-toM(s.start))/60)*PH;
        if (top < 0) return;
        const urgent = s.score < window.CONFIG.weakThreshold;
        const ev = el('div',`cal-ev ${urgent?'cal-ev--urgent':'cal-ev--study'}`);
        ev.innerHTML = `<div>📖 ${s.topic}</div><div style="font-weight:400">${s.start}–${s.end}</div>`;
        ev.style.cssText = `top:${top}px;height:${Math.max(ht,26)}px`;
        col.appendChild(ev);
      });

      /* deadline markers */
      const semMon2 = new Date('2027-01-11');
      const colDate = new Date(semMon2);
      colDate.setDate(semMon2.getDate()+(week-1)*7+di);
      const colDateStr = colDate.toISOString().slice(0,10);
      cal.filter(a=>a.due_date===colDateStr).forEach((a,i) => {
        const ev = el('div','cal-ev cal-ev--dead');
        ev.textContent = (a.type==='Exam'?'🎓 ':a.type==='Quiz'?'📝 ':'📚 ')+a.item;
        ev.style.cssText = `top:${i*20}px;height:18px`;
        col.appendChild(ev);
      });

      grid.appendChild(col);
    });

    wrap.innerHTML = '';
    const outer = el('div','cal-outer');
    outer.appendChild(hdr);
    outer.appendChild(grid);
    wrap.appendChild(outer);
  }

  /* ══ DEADLINES ═══════════════════════════════════════ */
  function renderDeadlines(week) {
    const wrap = document.getElementById('deadlines-list');
    if (!wrap) return;
    wrap.innerHTML = '';
    const items = window.AppData.assignmentCalendar
      .filter(a => a.week >= week && a.week <= week+2)
      .sort((a,b)=>new Date(a.due_date)-new Date(b.due_date));

    if (!items.length) { wrap.appendChild(el('p','empty','No deadlines in the next 2 weeks.')); return; }

    items.forEach(a => {
      const p = urgencyPill(a.due_date);
      const item = el('div','deadline-item');
      item.innerHTML = `
        <div class="di-dot di-dot--${a.type.toLowerCase()}"></div>
        <div class="di-body">
          <div class="di-name">${a.item}</div>
          <div class="di-topic">${a.topic}</div>
        </div>
        <span class="pill ${p.cls}">${p.label}</span>`;
      wrap.appendChild(item);
    });
  }

  /* ══ TOPIC SCORES ════════════════════════════════════ */
  function renderTopicScores(ranked) {
    const wrap = document.getElementById('topic-scores');
    if (!wrap) return;
    wrap.innerHTML = '';
    ranked.forEach(t => {
      const row = el('div','score-row');
      row.innerHTML = `
        <div class="score-label">${t.topic}</div>
        <div class="score-track"><div class="score-fill ${scoreFill(t.score_percent)}" style="width:${t.score_percent}%"></div></div>
        <div class="score-num">${t.score_percent}%</div>`;
      wrap.appendChild(row);
    });
  }

  /* ══ SESSIONS CHECKLIST ══════════════════════════════ */
  function renderSessions(sessions, student, week) {
    const wrap = document.getElementById('sessions-list');
    if (!wrap) return;
    wrap.innerHTML = '';

    /* progress */
    const done = window.Persistence.countCompleted(student.student_id, week, sessions.length);
    const pct  = sessions.length ? Math.round(done/sessions.length*100) : 0;
    const prog = el('div','prog-wrap');
    prog.innerHTML = `
      <div class="prog-row">
        <span class="prog-label">Week ${week}</span>
        <span class="prog-frac">${done}/${sessions.length}</span>
      </div>
      <div class="prog-track"><div class="prog-fill${pct===100?' prog-fill--done':''}" style="width:${pct}%"></div></div>`;
    wrap.appendChild(prog);

    if (!sessions.length) {
      wrap.appendChild(el('p','empty','No sessions fit this week — your free windows may overlap class time, or the week is fully scheduled. Try another week.'));
      return;
    }

    sessions.forEach(s => {
      const isDone = window.Persistence.isComplete(student.student_id, week, s.sessionNum);
      const urgent = s.score < window.CONFIG.weakThreshold;
      const item   = el('div','session-item'+(isDone?' done':''));
      item.innerHTML = `
        <input type="checkbox" class="si-cb" ${isDone?'checked':''}>
        <div class="si-body">
          <div class="si-title">${s.day} · ${s.start}–${s.end}</div>
          <div class="si-meta">${s.topic} · Score: ${s.score}%</div>
          <div class="si-pills">
            <span class="pill ${urgent?'pill--red':'pill--green'}">${urgent?'Needs focus':'On track'}</span>
            ${s.reasons.map(r=>`<span class="pill pill--grey">${r}</span>`).join('')}
          </div>
        </div>`;
      item.querySelector('.si-cb').addEventListener('change', function () {
        window.Persistence.setComplete(student.student_id, week, s.sessionNum, this.checked);
        renderSessions(sessions, student, week);
        window.UI.renderStats(student, window.analyseTopics(student, week), week);
      });
      wrap.appendChild(item);
    });
  }

  /* ══ RESOURCES ═══════════════════════════════════════ */
  function renderResources(matched) {
    const wrap = document.getElementById('resources-list');
    if (!wrap) return;
    wrap.innerHTML = '';
    const icons = {'Tutoring':'🧑‍🏫','Office hours':'👩‍💼','Lab':'🔬','Video':'▶️','Practice set':'📝','Workshop':'🛠️','Coaching':'💡'};
    const all   = [...matched.fits.map(r=>({r,fit:true})), ...matched.alternatives.map(r=>({r,fit:false}))];

    if (!all.length) { wrap.appendChild(el('p','empty','No matching resources found.')); return; }

    all.forEach(({r, fit}) => {
      const timeStr = r.day==='Any' ? 'Any time · Online'
        : `${r.day}${r.start ? ' '+r.start+'–'+r.end : ''}`;
      const item = el('div','resource-item');
      item.innerHTML = `
        <div class="ri-icon">${icons[r.type]||'📚'}</div>
        <div class="ri-body">
          <div class="ri-name">${r.name}</div>
          <div class="ri-tutor">👤 ${r.tutor}</div>
          <div class="ri-time">🕐 ${timeStr} · ${r.location}</div>
          <div class="ri-pills">
            <span class="pill pill--${r.modality==='Online'?'teal':'blue'}">${r.modality}</span>
            <span class="pill pill--grey">${r.type}</span>
            ${r.topics!=='All'?r.topics.split(',').slice(0,2).map(t=>`<span class="pill pill--purple">${t.trim()}</span>`).join(''):''}
          </div>
        </div>
        <span class="${fit?'ri-fit':'ri-alt'}">${fit?'✓ Fits':'Alt'}</span>`;
      wrap.appendChild(item);
    });
  }

  window.UI = {
    renderTopBar, renderStudentNav, renderWeekNav,
    renderStats, renderTodayCard, renderMotive,
    renderCalendar, renderDeadlines, renderTopicScores,
    renderSessions, renderResources
  };
}());
