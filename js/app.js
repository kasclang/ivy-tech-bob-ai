/**
 * app.js — Main application controller.
 * Coordinates data loading, computation, rendering, and event handling.
 */
const App = (() => {

  // ── Application state ────────────────────────────────────────────────────
  let state = {
    appData:       null,
    selectedId:    null,
    selectedWeek:  1,
    targetMinutes: CONFIG.scheduling.defaultTargetMinutes,
    // computed per render
    student:        null,
    prioritizedTopics: [],
    plan:           null,
    resources:      null,
    completedSet:   new Set(),
  };

  // ── Selectors ────────────────────────────────────────────────────────────
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

    // Load completed sessions from localStorage
    state.completedSet = Persistence.loadCompleted(selectedId);

    // 1. Topic prioritization
    state.prioritizedTopics = Analysis.prioritizeTopics(selectedId, selectedWeek, appData);

    // 2. Schedule
    state.plan = Scheduler.buildWeeklyPlan(student, selectedWeek, targetMinutes, state.prioritizedTopics, appData);

    // 3. Resource matching
    state.resources = Resources.matchResources(student, state.prioritizedTopics, appData);
  }

  // ── Render everything ─────────────────────────────────────────────────────
  function render() {
    const { student, selectedWeek, targetMinutes, prioritizedTopics, plan, resources, completedSet } = state;
    if (!student) return;

    // A. Student profile
    mount('profile-body', UI.renderStudentProfile(student));

    // B. Academic readiness
    mount('readiness-body', UI.renderAcademicReadiness(prioritizedTopics));

    // C. Week label
    const weekLabelEl = $id('week-label');
    if (weekLabelEl) weekLabelEl.textContent = UI.renderWeekLabel(selectedWeek);

    // Warning banner
    const warnEl = $id('schedule-warning');
    if (warnEl) {
      warnEl.style.display = plan.warning ? '' : 'none';
      warnEl.textContent = plan.warning || '';
    }

    // Calendar
    mount('calendar-grid-container',
      UI.renderWeeklyCalendar(plan.sessions, selectedWeek, completedSet, handleSessionChipClick)
    );

    // Session list
    mount('session-list-container',
      UI.renderSessionList(plan.sessions, completedSet, handleSessionToggle)
    );

    // Plan stats
    const statsEl = $id('plan-stats');
    if (statsEl) {
      const avail = plan.totalAvailableMin;
      const planned = plan.totalPlannedMin;
      statsEl.textContent = `${UI.formatMinutes(planned)} planned · ${UI.formatMinutes(avail)} total availability`;
    }

    // D. Deadlines
    const { assignmentCalendar } = state.appData;
    mount('deadlines-body', UI.renderDeadlines(assignmentCalendar, selectedWeek));

    // E. Resources
    mount('resources-body', UI.renderResources(resources));

    // F. Progress
    mount('progress-body', UI.renderProgressSummary(plan.sessions, completedSet));

    // G. Explainability
    mount('explain-container', UI.renderExplainPanel(student, selectedWeek, prioritizedTopics, targetMinutes));

    // Update study target display
    const targetDisplay = $id('target-display');
    if (targetDisplay) targetDisplay.textContent = UI.formatMinutes(targetMinutes);
  }

  // ── Event handlers ───────────────────────────────────────────────────────
  function handleStudentChange(id) {
    state.selectedId = id;
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

  function handleSessionChipClick(sessionId) {
    // Toggle completion from calendar chip
    if (state.completedSet.has(sessionId)) {
      Persistence.markIncomplete(state.selectedId, sessionId);
      state.completedSet.delete(sessionId);
    } else {
      Persistence.markComplete(state.selectedId, sessionId);
      state.completedSet.add(sessionId);
    }
    // Re-render affected sections only (calendar, session list, progress)
    const { plan, completedSet, selectedWeek } = state;
    mount('calendar-grid-container',
      UI.renderWeeklyCalendar(plan.sessions, selectedWeek, completedSet, handleSessionChipClick)
    );
    mount('session-list-container',
      UI.renderSessionList(plan.sessions, completedSet, handleSessionToggle)
    );
    mount('progress-body', UI.renderProgressSummary(plan.sessions, completedSet));
  }

  function handleSessionToggle(sessionId, isComplete) {
    if (isComplete) {
      Persistence.markComplete(state.selectedId, sessionId);
      state.completedSet.add(sessionId);
    } else {
      Persistence.markIncomplete(state.selectedId, sessionId);
      state.completedSet.delete(sessionId);
    }
    // Re-render affected sections
    const { plan, completedSet, selectedWeek } = state;
    // Update calendar chip
    mount('calendar-grid-container',
      UI.renderWeeklyCalendar(plan.sessions, selectedWeek, completedSet, handleSessionChipClick)
    );
    mount('progress-body', UI.renderProgressSummary(plan.sessions, completedSet));
    // Update session card styling
    const card = document.getElementById(`sc-${sessionId}`);
    if (card) {
      card.classList.toggle('completed', isComplete);
    }
  }

  function handleResetProgress() {
    if (!confirm(`Reset all progress for ${state.student?.firstName}? This cannot be undone.`)) return;
    Persistence.resetProgress(state.selectedId);
    state.completedSet = new Set();
    const { plan, selectedWeek } = state;
    mount('calendar-grid-container',
      UI.renderWeeklyCalendar(plan.sessions, selectedWeek, state.completedSet, handleSessionChipClick)
    );
    mount('session-list-container',
      UI.renderSessionList(plan.sessions, state.completedSet, handleSessionToggle)
    );
    mount('progress-body', UI.renderProgressSummary(plan.sessions, state.completedSet));
  }

  // ── Preferences ──────────────────────────────────────────────────────────
  function savePrefs() {
    Persistence.savePrefs({
      studentId:     state.selectedId,
      selectedWeek:  state.selectedWeek,
      targetMinutes: state.targetMinutes,
    });
  }

  // ── Compute and full re-render ─────────────────────────────────────────────
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
      slider.min  = CONFIG.scheduling.minTargetMinutes;
      slider.max  = CONFIG.scheduling.maxTargetMinutes;
      slider.step = 15;
      slider.value = state.targetMinutes;
      slider.addEventListener('input', e => handleTargetChange(e.target.value));
    }

    // Reset progress button
    const resetBtn = $id('reset-progress-btn');
    if (resetBtn) resetBtn.addEventListener('click', handleResetProgress);
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  function init() {
    try {
      state.appData = DataLoader.load();
    } catch (err) {
      document.body.innerHTML = `<div style="padding:2rem;color:red"><strong>Error loading data:</strong> ${err.message}</div>`;
      return;
    }

    // Restore preferences
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
