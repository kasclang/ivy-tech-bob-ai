// Centralised thresholds, weights and scheduling constraints.
// Edit these values to tune the recommendation engine without touching any other file.
window.CONFIG = {

  // --- Priority scoring weights (must sum to 1.0) ---
  weights: {
    diagnosticWeakness: 0.45,   // (100 - score) / 100
    curriculumRelevance: 0.30,  // topic appears in selected week's assignments
    examProximity:       0.20,  // exam/quiz due within 2 weeks covers this topic
    homeworkProximity:   0.05   // homework due this week covers this topic
  },

  // --- Score thresholds ---
  weakThreshold:   65,   // score below this → needs focus
  strongThreshold: 85,   // score above this → low priority

  // --- Scheduling ---
  sessionMinutes: 40,     // target study session length in minutes
  breakMinutes:   10,     // mandatory break between sessions
  minSessionMinutes: 25,  // minimum useful session length

  // --- Work-load caps: max study sessions per week by work hours ---
  workloadCaps: [
    { maxWorkHours:  0, maxSessions: 6 },
    { maxWorkHours: 15, maxSessions: 5 },
    { maxWorkHours: 25, maxSessions: 4 },
    { maxWorkHours: 35, maxSessions: 3 },
    { maxWorkHours: Infinity, maxSessions: 2 }
  ],

  // --- Exam proximity window (weeks) ---
  examProximityWeeks: 2,

  // --- How many top topics to show sessions for ---
  topTopicsCount: 3,

  // --- How many resources to show as "fits your schedule" ---
  resourceFitCount: 3,

  // --- Semester start (Monday of Week 1) ---
  semesterStart: "2027-01-11"
};
