/**
 * config.js — Centralized thresholds, weights, and scheduling constraints.
 * Modify here to adjust recommendation behavior without touching algorithm logic.
 */
const CONFIG = {

  // ── Diagnostic score thresholds ──────────────────────────────────────────
  thresholds: {
    needsAttention:      60,   // score < 60 → "Needs immediate attention"
    developingProficiency: 80, // 60 ≤ score < 80 → "Developing proficiency"
    // score ≥ 80 → "Strong foundation"
  },

  // ── Topic priority scoring weights (must sum to 1.0) ─────────────────────
  priorityWeights: {
    diagnosticWeakness:   0.45,  // how low is the diagnostic score
    weekRelevance:        0.30,  // topic appears in this week's assignments
    examProximity:        0.20,  // exam/quiz due within 2 weeks
    homeworkProximity:    0.05,  // homework due this week
  },

  // ── Scheduling constraints ────────────────────────────────────────────────
  scheduling: {
    minSessionMinutes:   25,   // shortest acceptable session
    maxSessionMinutes:   60,   // longest session before a break
    breakMinutes:        10,   // break inserted between consecutive sessions
    defaultTargetMinutes: 90,  // default weekly study-time goal
    minTargetMinutes:    30,
    maxTargetMinutes:    240,
  },

  // ── Exam proximity window (weeks) ─────────────────────────────────────────
  examProximityWeeks: 2,

  // ── Week 1 start date (Monday) ────────────────────────────────────────────
  semesterStartDate: '2027-01-11',   // Week 1 Monday

  // ── Days of week ordering ────────────────────────────────────────────────
  DAY_ORDER: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
};
