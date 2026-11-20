/**
 * tests/arc-tests.js
 * Automated tests for Academic Readiness Coach recommendation and scheduling logic.
 * Run with: node tests/arc-tests.js
 */

// ── Minimal browser-environment shim ────────────────────────────────────────
const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

// Build a shared sandbox that acts like a browser window
const sandbox = {
  window: null,
  localStorage: (() => {
    const store = {};
    return {
      getItem:    k  => store[k] ?? null,
      setItem:    (k,v) => { store[k] = String(v); },
      removeItem: k  => { delete store[k]; },
    };
  })(),
  console,
  process,
};
sandbox.window = sandbox;
vm.createContext(sandbox);

// Load modules in dependency order into the shared sandbox.
// Wrapping in an IIFE that assigns to 'this' (the sandbox) works around
// the vm restriction that 'const'/'let' at top level don't set sandbox properties.
function loadFile(rel) {
  const raw = fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
  // Replace top-level `const NAME = ` and `let NAME = ` with `NAME = ` so
  // the values land on the sandbox global object.
  const code = raw.replace(/^(const|let)\s+([A-Z_][A-Za-z0-9_]*)\s*=/gm, '$2 =');
  vm.runInContext(code, sandbox);
}

loadFile('js/config.js');
loadFile('data/case_data.js');
loadFile('js/data.js');
loadFile('js/analysis.js');
loadFile('js/persistence.js');
loadFile('js/scheduler.js');
loadFile('js/resources.js');

// Pull top-level names into local scope for test code
const { CONFIG, DataLoader, Analysis, Persistence, Scheduler, Resources } = sandbox;

// ── Test harness ─────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const failures = [];

function assert(description, condition) {
  if (condition) {
    console.log(`  ✓  ${description}`);
    passed++;
  } else {
    console.error(`  ✗  ${description}`);
    failed++;
    failures.push(description);
  }
}

function assertEq(description, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    console.log(`  ✓  ${description}`);
    passed++;
  } else {
    console.error(`  ✗  ${description}  (got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)})`);
    failed++;
    failures.push(description);
  }
}

function section(title) { console.log(`\n── ${title} ──`); }

// ── Load data ─────────────────────────────────────────────────────────────────
const appData = DataLoader.load();

// ════════════════════════════════════════════════════════════════════════════
section('1. All student profiles load successfully');

const EXPECTED_STUDENTS = ['S1001','S1002','S1003','S1004','S1005'];
assert('Five students loaded', appData.students.length === 5);
EXPECTED_STUDENTS.forEach(id => {
  assert(`Student ${id} present`, appData.students.some(s => s.id === id));
});

// ════════════════════════════════════════════════════════════════════════════
section('2. Enrollment section mapping');

assertEq('S1001 → Section 01', appData.enrollments['S1001'], '01');
assertEq('S1002 → Section 40', appData.enrollments['S1002'], '40');
assertEq('S1003 → Section 01', appData.enrollments['S1003'], '01');
assertEq('S1004 → Section OL1', appData.enrollments['S1004'], 'OL1');
assertEq('S1005 → Section 40', appData.enrollments['S1005'], '40');

EXPECTED_STUDENTS.forEach(id => {
  const student = appData.students.find(s => s.id === id);
  assert(`${id}.section populated on student object`, !!student.section);
});

// ════════════════════════════════════════════════════════════════════════════
section('3. Diagnostic topic scores');

const devonScores = appData.topicScores['S1002'];
assert('Devon has 4 topic scores', devonScores.length === 4);

const devonLinear = devonScores.find(t => t.topic === 'Linear equations');
assertEq('Devon linear equations = 40', devonLinear?.score, 40);

const devonFn = devonScores.find(t => t.topic === 'Functions and notation');
assertEq('Devon functions = 42', devonFn?.score, 42);

// Verify Devon's two lowest are 'attention' category
[40, 42].forEach(s => {
  assertEq(`Score ${s}% → attention`, Analysis.classifyScore(s), 'attention');
});
assert('Score 70% → developing or strong',
  ['developing','strong'].includes(Analysis.classifyScore(70)));
assert('Score 97% → strong', Analysis.classifyScore(97) === 'strong');
assert('Score null → not-assessed', Analysis.classifyScore(null) === 'not-assessed');

// ════════════════════════════════════════════════════════════════════════════
section('4. Topic prioritization — Devon, Week 1');

const devonTopics = Analysis.prioritizeTopics('S1002', 1, appData);
assert('Topics list is non-empty', devonTopics.length > 0);

// Week 1 covers Linear equations — Devon score 40% should be top priority
const topTopic = devonTopics[0];
assert('Devon Week 1 top priority is Linear equations',
  topTopic.topic === 'Linear equations');
assert('Top topic has highest priority score', topTopic.priority >= devonTopics[1]?.priority);
assert('Each topic has an explanation string', devonTopics.every(t => typeof t.explanation === 'string' && t.explanation.length > 0));

// ════════════════════════════════════════════════════════════════════════════
section('5. Topic prioritization — correctness of explanation');

const linearEntry = devonTopics.find(t => t.topic === 'Linear equations');
assert('Devon linear equations explanation mentions 40%',
  linearEntry?.explanation.includes('40%'));
assert('Devon linear equations explanation mentions Week 1',
  linearEntry?.explanation.toLowerCase().includes('week 1'));

// ════════════════════════════════════════════════════════════════════════════
section('6. Missing diagnostic scores (topics beyond assessed set)');

// Week 5 covers Systems of equations — no diagnostic score for any student
const topicsW5 = Analysis.prioritizeTopics('S1002', 5, appData);
const soe = topicsW5.find(t => t.topic === 'Systems of equations');
assert('Systems of equations present for Week 5', !!soe);
assertEq('Systems of equations is not-assessed', soe?.category, 'not-assessed');
assert('Systems of equations score is null', soe?.score === null);

// ════════════════════════════════════════════════════════════════════════════
section('7. Deadline filtering by selected week');

// Week 1 should show Homework 1 and Skills Practice 1 as "this week"
const thisWeekItems = appData.assignmentCalendar.filter(a => a.week === 1);
assert('Week 1 has 2 assignments', thisWeekItems.length === 2);
assert('Week 1 has Homework 1', thisWeekItems.some(a => a.item.includes('Homework 1')));

// Week 3 should have Exam 1
const week3Items = appData.assignmentCalendar.filter(a => a.week === 3);
assert('Week 3 has Exam 1', week3Items.some(a => a.type === 'Exam'));

// ════════════════════════════════════════════════════════════════════════════
section('8. Scheduling — Devon\'s restricted availability');

// Devon: Wed 20:30–22:00, Sun 14:00–17:00
const devonStudent = appData.students.find(s => s.id === 'S1002');
const devonPlan = Scheduler.buildWeeklyPlan(devonStudent, 1, 90, devonTopics, appData);

assert('Devon plan has sessions', devonPlan.sessions.length > 0);

devonPlan.sessions.forEach(sess => {
  const avail = appData.studyAvailability['S1002'];
  const dayAvail = avail.filter(a => a.day === sess.day);
  assert(`Session on ${sess.day} matches an availability window`,
    dayAvail.length > 0);

  dayAvail.forEach(a => {
    const sessStart = DataLoader.timeToMinutes(sess.startTime);
    const sessEnd   = DataLoader.timeToMinutes(sess.endTime);
    const aStart    = DataLoader.timeToMinutes(a.start);
    const aEnd      = DataLoader.timeToMinutes(a.end);
    // Session must start at or after availability start and end at or before availability end
    if (a.day === sess.day) {
      assert(`Devon session ${sess.id} on ${sess.day} ${sess.startTime}-${sess.endTime} within availability`,
        sessStart >= aStart && sessEnd <= aEnd + 1); // +1 for rounding
    }
  });
});

// No sessions on Monday, Tuesday, Thursday, Friday for Devon
const invalidDays = ['Monday','Tuesday','Thursday','Friday'];
invalidDays.forEach(day => {
  const badSessions = devonPlan.sessions.filter(s => s.day === day);
  assert(`Devon has no sessions on ${day}`, badSessions.length === 0);
});

// ════════════════════════════════════════════════════════════════════════════
section('9. Scheduling — no overlapping sessions');

function testNoOverlap(studentId, label) {
  const student = appData.students.find(s => s.id === studentId);
  const topics  = Analysis.prioritizeTopics(studentId, 1, appData);
  const plan    = Scheduler.buildWeeklyPlan(student, 1, 120, topics, appData);

  const byDay = {};
  plan.sessions.forEach(s => {
    if (!byDay[s.day]) byDay[s.day] = [];
    byDay[s.day].push(s);
  });

  let overlaps = false;
  Object.entries(byDay).forEach(([day, sessions]) => {
    for (let i = 0; i < sessions.length - 1; i++) {
      const a = sessions[i];
      const b = sessions[i+1];
      const aEnd   = DataLoader.timeToMinutes(a.endTime);
      const bStart = DataLoader.timeToMinutes(b.startTime);
      if (bStart < aEnd) overlaps = true;
    }
  });
  assert(`${label}: no overlapping sessions`, !overlaps);
}

EXPECTED_STUDENTS.forEach(id => {
  testNoOverlap(id, id);
});

// ════════════════════════════════════════════════════════════════════════════
section('10. Scheduling — no sessions during class meetings (Section 01, Monday 09:00–10:15)');

const mayaStudent = appData.students.find(s => s.id === 'S1001');
const mayaTopics  = Analysis.prioritizeTopics('S1001', 1, appData);
const mayaPlan    = Scheduler.buildWeeklyPlan(mayaStudent, 1, 180, mayaTopics, appData);

mayaPlan.sessions.forEach(sess => {
  if (sess.day === 'Monday') {
    const sessStart = DataLoader.timeToMinutes(sess.startTime);
    const sessEnd   = DataLoader.timeToMinutes(sess.endTime);
    // MATH 136/01 Monday 09:00–10:15 and MATH 036/01 Monday 10:30–11:20
    const conflicts = [
      { s: DataLoader.timeToMinutes('09:00'), e: DataLoader.timeToMinutes('10:15') },
      { s: DataLoader.timeToMinutes('10:30'), e: DataLoader.timeToMinutes('11:20') },
    ];
    const hasConflict = conflicts.some(c => sessStart < c.e && sessEnd > c.s);
    assert(`Maya Monday session ${sess.startTime}-${sess.endTime} does not overlap class meeting`, !hasConflict);
  }
});

// ════════════════════════════════════════════════════════════════════════════
section('11. Scheduling — Marcus online section (OL1 = no fixed meetings)');

const marcusStudent = appData.students.find(s => s.id === 'S1004');
const marcusTopics  = Analysis.prioritizeTopics('S1004', 1, appData);
const marcusMeetings = Scheduler.getCourseMeetings(marcusStudent, appData);

assertEq('Marcus OL1 has no fixed course meetings', marcusMeetings.length, 0);

const marcusPlan = Scheduler.buildWeeklyPlan(marcusStudent, 1, 120, marcusTopics, appData);
assert('Marcus plan generates sessions', marcusPlan.sessions.length > 0);

// ════════════════════════════════════════════════════════════════════════════
section('12. Resource matching — topic relevance');

// R09 covers Linear equations and Inequalities
const devonResources = Resources.matchResources(devonStudent, devonTopics, appData);
assert('Devon gets resource recommendations', devonResources.length > 0);

const r09 = devonResources.find(r => r.resource.id === 'R09');
assert('R09 (Solving equations video) recommended for Devon', !!r09);
assert('R09 is on-demand', r09?.availFit === 'on-demand');

// R10 covers Functions and notation
const r10 = devonResources.find(r => r.resource.id === 'R10');
assert('R10 (Functions practice) recommended for Devon', !!r10);

// ════════════════════════════════════════════════════════════════════════════
section('13. Resource matching — availability conflict detection');

// Devon availability: Wed 20:30–22:00, Sun 14:00–17:00
// R06 = Section 01 office hours Wednesday 11:30–12:30 — not in Devon's window
const r06 = devonResources.find(r => r.resource.id === 'R06');
if (r06) {
  assert('R06 not available for Devon (outside time window or wrong section)', r06.availFit !== 'available');
}

// Math Tutoring Center (R01) Monday 08:00–16:00 — Devon has no Monday availability
const r01 = devonResources.find(r => r.resource.id === 'R01');
if (r01) {
  assert('R01 Monday tutoring not available for Devon (no Monday availability)', r01.availFit !== 'available');
}

// ════════════════════════════════════════════════════════════════════════════
section('14. Persistence — completion state keyed per student');

// Mark a fake session for S1002
Persistence.markComplete('S1002', 'session-1');
assert('Session marked complete for S1002', Persistence.loadCompleted('S1002').has('session-1'));

// S1001 should NOT have that completion
assert('S1001 completion isolated from S1002', !Persistence.loadCompleted('S1001').has('session-1'));

// Reset S1002
Persistence.resetProgress('S1002');
assert('S1002 progress reset', Persistence.loadCompleted('S1002').size === 0);

// ════════════════════════════════════════════════════════════════════════════
section('15. Plan stability — same inputs produce same output');

const plan1 = Scheduler.buildWeeklyPlan(devonStudent, 1, 90, devonTopics, appData);
const plan2 = Scheduler.buildWeeklyPlan(devonStudent, 1, 90, devonTopics, appData);
assertEq('Devon plan is deterministic', JSON.stringify(plan1.sessions), JSON.stringify(plan2.sessions));

// ════════════════════════════════════════════════════════════════════════════
section('16. Changing selected student updates recommendations');

const lenaTopics   = Analysis.prioritizeTopics('S1003', 1, appData);
const devonTopics2 = Analysis.prioritizeTopics('S1002', 1, appData);

// Lena has very high linear equations score (97%) — should not be top priority
const lenaTop = lenaTopics[0];
const devonTop = devonTopics2[0];

assert('Lena and Devon have different top priorities', lenaTop?.topic !== devonTop?.topic || lenaTop?.priority !== devonTop?.priority);

// Lena's weakest diagnostic topic is Inequalities (63%) or Graphing (73%)
const lenaIneq = lenaTopics.find(t => t.topic === 'Inequalities');
assert('Lena inequalities present in topics', !!lenaIneq);
assert('Lena inequalities is developing (63%)', lenaIneq?.category === 'developing');

// ════════════════════════════════════════════════════════════════════════════
section('17. Total planned time ≤ total available time');

EXPECTED_STUDENTS.forEach(id => {
  const student = appData.students.find(s => s.id === id);
  const topics  = Analysis.prioritizeTopics(id, 1, appData);
  const plan    = Scheduler.buildWeeklyPlan(student, 1, 999, topics, appData);
  assert(`${id}: planned (${plan.totalPlannedMin}) ≤ available (${plan.totalAvailableMin})`,
    plan.totalPlannedMin <= plan.totalAvailableMin + 1); // +1 for rounding tolerance
});

// ════════════════════════════════════════════════════════════════════════════
// Summary
// ════════════════════════════════════════════════════════════════════════════
console.log(`\n${'═'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error('\nFailed tests:');
  failures.forEach(f => console.error(`  • ${f}`));
  process.exit(1);
} else {
  console.log('All tests passed. ✓');
}
