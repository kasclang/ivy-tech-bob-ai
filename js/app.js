/**
 * app.js — Main application controller.
 * Coordinates data loading, computation, rendering, and event handling.
 * Redesigned for integrated calendar, modal events, resource filters, and compact layout.
 */
const App = (() => {

  // ── Application state ────────────────────────────────────────────────────
  let state = {
    appData:           null,
    selectedId:        null,
    selectedWeek:      1,
    targetMinutes:     CONFIG.scheduling.defaultTargetMinutes,
    resourceFilter:    'All',
    // computed per render
    student:           null,
    prioritizedTopics: [],
    plan:              null,
    resources:         null,
    completedSet:      new Set(),
  };

  // ── DOM helpers ──────────────────────────────────────────────────────────
  function $id(id) { return document.getElementById(id); }

  function mount(id, node) {
    const container = $id(id);
    if (!container) return;
    container.innerHTML = '';
    if (node instanceof DocumentFragment || node instanceof Node) {
      container.appendChild(node);
    } else {
      container.innerHTML = String(node);
    }
  }

  // ── Compute everything for the current state ──────────────────────────────
  function compute() {
    const { appData, selectedId, selectedWeek, targetMinutes } = state;
    const student = appData.students.find(s => s.id === selectedId);
    state.student = student;
    if (!student) return;

    state.completedSet = Persistence.loadCompleted(selectedId);
    state.prioritizedTopics = Analysis.prioritizeTopics(selectedId, selectedWeek, appData);
    state.plan = Scheduler.buildWeeklyPlan(student, selectedWeek, targetMinutes, state.prioritizedTopics, appData);
    state.resources = Resources.matchResources(student, state.prioritizedTopics, appData);
  }

  // ── Render everything ─────────────────────────────────────────────────────
  function render() {
    const { student, selectedWeek, targetMinutes, prioritizedTopics, plan, resources, completedSet, appData, resourceFilter } = state;
    if (!student) return;

    // A. Student profile (sidebar)
    mount('profile-body', UI.renderStudentProfile(student));

    // B. Top 3 Next Steps
    mount('next-steps-body', UI.renderNextSteps(prioritizedTopics, selectedWeek, appData.assignmentCalendar, plan));

    // C. Week label (toolbar, still present in HTML) & plan stats
    const weekLabelEl = $id('week-label');
    if (weekLabelEl) weekLabelEl.textContent = UI.renderWeekLabel(selectedWeek);

    const statsEl = $id('plan-stats');
    if (statsEl) {
      statsEl.textContent = plan.sessions.length
        ? `${UI.formatMinutes(plan.totalPlannedMin)} planned · ${plan.sessions.length} sessions`
        : 'No sessions scheduled this week';
    }

    // Warning banner
    const warnEl = $id('schedule-warning');
    if (warnEl) {
      warnEl.style.display = plan.warning ? '' : 'none';
      warnEl.textContent = plan.warning || '';
    }

    // D. Month Calendar (replaces weekly grid; also renders selected-week detail strip)
    mount('calendar-container',
      UI.renderMonthCalendar(
        plan.sessions,
        appData.assignmentCalendar,
        selectedWeek,
        completedSet,
        handleCalendarEventClick
      )
    );

    // E. Explainability panel
    mount('explain-container', UI.renderExplainPanel(student, selectedWeek, prioritizedTopics, targetMinutes));

    // F. Academic Readiness
    mount('readiness-grid', UI.renderAcademicReadiness(prioritizedTopics));

    // G. Deadlines
    mount('deadlines-body', UI.renderDeadlines(appData.assignmentCalendar, selectedWeek, handleDeadlineClick));

    // H. Resources
    renderResourceSection();

    // I. Progress (sidebar)
    mount('progress-body', UI.renderProgressSummary(plan.sessions, completedSet));

    // Update study target display
    const targetDisplay = $id('target-display');
    if (targetDisplay) targetDisplay.textContent = UI.formatMinutes(targetMinutes);
  }

  function renderResourceSection() {
    const { resources, resourceFilter } = state;
    mount('resources-body', UI.renderResources(resources, handleResourceClick, resourceFilter));
    // Attach filter button events
    const filterBtns = document.querySelectorAll('#resources-body .filter-btn');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        state.resourceFilter = btn.getAttribute('data-filter') || 'All';
        renderResourceSection();
      });
    });
  }

  // ── Modal ─────────────────────────────────────────────────────────────────
  function openModal({ title, body, footer }) {
    const overlay  = $id('modal-overlay');
    const titleEl  = $id('modal-title-text');
    const bodyEl   = $id('modal-body');
    const footerEl = $id('modal-footer');

    titleEl.textContent = title;
    bodyEl.innerHTML = '';
    footerEl.innerHTML = '';
    if (body)   bodyEl.appendChild(body);
    if (footer) footerEl.appendChild(footer);

    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    $id('modal-close-btn').focus();
  }

  function closeModal() {
    const overlay = $id('modal-overlay');
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
  }

  // ── Calendar event handler ────────────────────────────────────────────────
  function handleCalendarEventClick(evt) {
    if (evt.type === 'session') {
      const modal = UI.buildSessionModal(evt.data, state.completedSet, handleSessionToggleFromModal);
      openModal(modal);
    } else if (evt.type === 'deadline') {
      const modal = UI.buildDeadlineModal(evt.data);
      openModal(modal);
    }
  }

  function handleDeadlineClick(assignment) {
    const modal = UI.buildDeadlineModal(assignment);
    openModal(modal);
  }

  function handleResourceClick(rec) {
    const modal = UI.buildResourceModal(rec);
    openModal(modal);
  }

  // ── Session toggle (from modal) ───────────────────────────────────────────
  function handleSessionToggleFromModal(sessionId, isComplete) {
    if (isComplete) {
      Persistence.markComplete(state.selectedId, sessionId);
      state.completedSet.add(sessionId);
    } else {
      Persistence.markIncomplete(state.selectedId, sessionId);
      state.completedSet.delete(sessionId);
    }
    // Re-render calendar and progress only
    const { plan, completedSet, selectedWeek, appData } = state;
    mount('calendar-container',
      UI.renderMonthCalendar(plan.sessions, appData.assignmentCalendar, selectedWeek, completedSet, handleCalendarEventClick)
    );
    mount('progress-body', UI.renderProgressSummary(plan.sessions, completedSet));
  }

  // ── Student / week / target handlers ─────────────────────────────────────
  function handleStudentChange(id) {
    state.selectedId = id;
    state.resourceFilter = 'All';
    state.completedSet = Persistence.loadCompleted(id);
    savePrefs();
    computeAndRender();
  }

  function handleWeekChange(week) {
    state.selectedWeek = Number(week);
    savePrefs();
    computeAndRender();
  }

  function handleTargetChange(minutes) {
    state.targetMinutes = Number(minutes);
    savePrefs();
    computeAndRender();
  }

  function handleResetProgress() {
    if (!confirm(`Reset all progress for ${state.student?.firstName}? This cannot be undone.`)) return;
    Persistence.resetProgress(state.selectedId);
    state.completedSet = new Set();
    const { plan, completedSet, selectedWeek, appData } = state;
    mount('calendar-container',
      UI.renderMonthCalendar(plan.sessions, appData.assignmentCalendar, selectedWeek, completedSet, handleCalendarEventClick)
    );
    mount('progress-body', UI.renderProgressSummary(plan.sessions, completedSet));
  }

  // ── Preferences ──────────────────────────────────────────────────────────
  function savePrefs() {
    Persistence.savePrefs({
      studentId:     state.selectedId,
      selectedWeek:  state.selectedWeek,
      targetMinutes: state.targetMinutes,
    });
  }

  function computeAndRender() {
    compute();
    render();
  }

  // ── Build sidebar controls ────────────────────────────────────────────────
  function buildSidebarControls() {
    // Student selector
    const selectorEl = $id('student-selector-container');
    if (selectorEl) {
      selectorEl.appendChild(
        UI.renderStudentSelector(state.appData.students, state.selectedId, handleStudentChange)
      );
    }

    // Week selector
    const weekSel = $id('week-select');
    if (weekSel) {
      for (let w = 1; w <= 12; w++) {
        const opt = document.createElement('option');
        opt.value = w;
        opt.textContent = `Week ${w}`;
        if (w === state.selectedWeek) opt.selected = true;
        weekSel.appendChild(opt);
      }
      weekSel.addEventListener('change', e => handleWeekChange(e.target.value));
    }

    // Study target slider
    const slider = $id('target-slider');
    if (slider) {
      slider.min   = CONFIG.scheduling.minTargetMinutes;
      slider.max   = CONFIG.scheduling.maxTargetMinutes;
      slider.step  = 15;
      slider.value = state.targetMinutes;
      slider.addEventListener('input', e => handleTargetChange(e.target.value));
    }

    // Reset progress button
    const resetBtn = $id('reset-progress-btn');
    if (resetBtn) resetBtn.addEventListener('click', handleResetProgress);

    // Modal close button and overlay click
    const closeBtn = $id('modal-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    const overlay = $id('modal-overlay');
    if (overlay) {
      overlay.addEventListener('click', e => {
        if (e.target === overlay) closeModal();
      });
      // Keyboard: Escape closes modal
      document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && overlay.classList.contains('open')) closeModal();
      });
    }

    // Responsive mid-row: stack on mobile
    const midRow = $id('mid-row');
    if (midRow) {
      const updateMidRow = () => {
        midRow.style.gridTemplateColumns = window.innerWidth < 720 ? '1fr' : '1fr 1fr';
      };
      updateMidRow();
      window.addEventListener('resize', updateMidRow);
    }
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  function init() {
    try {
      state.appData = DataLoader.load();
    } catch (err) {
      document.body.innerHTML = `<div style="padding:2rem;color:red"><strong>Error loading data:</strong> ${err.message}</div>`;
      return;
    }

    const prefs = Persistence.loadPrefs();
    state.selectedId    = prefs.studentId    || state.appData.students[0].id;
    state.selectedWeek  = prefs.selectedWeek  || 1;
    state.targetMinutes = prefs.targetMinutes || CONFIG.scheduling.defaultTargetMinutes;

    buildSidebarControls();
    computeAndRender();
  }

  return { init };
})();

// Bootstrap once DOM is ready
document.addEventListener('DOMContentLoaded', App.init);
