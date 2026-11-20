# Architecture Notes — Academic Readiness Coach

## Guiding Principles

1. **No external dependencies.** The application runs fully offline after setup.
2. **Transparent recommendations.** Every suggestion includes a plain-language explanation.
3. **Modular for easy modification.** Judge feedback can be addressed by editing one module.
4. **Deterministic.** Same student + same week + same target = identical plan every time.

---

## Module Responsibilities

### `js/config.js` — The Single Knob Panel

All recommendation thresholds, priority weights, and scheduling constraints live here. To adjust how the system behaves:

- Change score thresholds (`needsAttention`, `developingProficiency`) to shift category boundaries.
- Change `priorityWeights` to rebalance the topic scoring formula.
- Change `scheduling.*` to adjust session lengths or break durations.
- Change `semesterStartDate` if the academic calendar shifts.

No other file needs editing to change these behaviors.

### `js/data.js` — Data Normalization

Reads from `window.CASE_DATA` (populated by `data/case_data.js`). Normalizes field names, converts strings to numbers, indexes by student ID for O(1) lookup, and exposes date/time utilities.

Key utilities:
- `timeToMinutes(str)` — "HH:MM" → minutes since midnight
- `minutesToTime(n)` — minutes → "HH:MM"
- `weekStartDate(weekNum)` — returns the Monday `Date` for a given week number
- `dateForWeekday(weekStart, dayName)` — ISO date string for a named weekday in a given week

### `js/analysis.js` — Topic Prioritization

Implements the five-factor priority formula. Returns a sorted array of topic objects, each with:
- `priority` — numeric score [0, 1]
- `category` — `'attention'` | `'developing'` | `'strong'` | `'not-assessed'`
- `explanation` — human-readable string
- `reasons` — array of contributing reason strings

Topics without diagnostic scores are marked `not-assessed` and scored as 0.5 on the weakness axis. They are **not** given a fake score of zero.

### `js/scheduler.js` — Study Session Scheduler

```
buildWeeklyPlan(student, weekNum, targetMinutes, prioritizedTopics, appData)
  → { sessions[], totalAvailableMin, totalPlannedMin, warning? }
```

Algorithm:
1. Retrieve student availability windows.
2. Retrieve course meeting times for enrolled section. OL1 → empty list.
3. Subtract course meetings from each availability window → free sub-windows.
4. Allocate topic time proportionally to priority score, subject to min/max session bounds.
5. Walk free windows in weekday order, placing sessions with break gaps between them.
6. If target exceeds total available time, clamp and add a warning.

### `js/resources.js` — Resource Matcher

```
matchResources(student, prioritizedTopics, appData)
  → sorted recommendations[]
```

Each recommendation includes:
- `availFit`: `'available'` | `'on-demand'` | `'unavailable'`
- `hasConflict`: boolean — resource time overlaps a class meeting
- `sectionFit`: boolean — resource intended for student's section
- Reason strings for every match and non-match

Availability is checked by exact time-interval overlap, not by weekday name alone.

### `js/persistence.js` — localStorage

Completion state is stored under key `arc_{studentId}` as a JSON array of session IDs. User preferences (selected student, week, target) are stored under `arc_prefs`. Student data is never mixed — loading S1002 never reads S1001's completions.

### `js/ui.js` — DOM Renderers

Pure functions that take data and return DOM nodes. No business logic. Each section (profile, readiness, calendar, sessions, deadlines, resources, progress, explainability) has its own render function.

### `js/app.js` — Application Controller

Manages a single `state` object. On any user action:
1. Update `state`.
2. Call `compute()` → runs analysis, scheduler, resource matcher.
3. Call `render()` → rebuilds affected DOM sections.

Completion toggles only re-render the affected sections (calendar, session list, progress bar), not the full page.

---

## Data Flow Diagram

```
window.CASE_DATA (case_data.js)
        │
        ▼
  DataLoader.load()
        │
        ├── students[]          ──►  UI: Student Profile
        ├── topicScores{}       ──►  Analysis.prioritizeTopics()
        ├── studyAvailability{} ──►  Scheduler.buildWeeklyPlan()
        ├── courseSchedule[]    ──►  Scheduler (block class meetings)
        ├── assignmentCalendar[]──►  Analysis + UI: Deadlines
        └── supportResources[]  ──►  Resources.matchResources()
                │
                ▼
        Analysis.prioritizeTopics(studentId, weekNum)
                │
                ├── prioritizedTopics[]  ──►  Scheduler.buildWeeklyPlan()
                │                        ──►  Resources.matchResources()
                │                        ──►  UI: Readiness bars
                │
                ▼
        Scheduler.buildWeeklyPlan()
                │
                └── sessions[]  ──►  UI: Calendar + Session List
                                 ──►  Persistence: completion state
```

---

## Adapting to Judge Feedback

The architecture is designed for rapid modification:

| Likely feedback | File(s) to change |
|---|---|
| Adjust risk thresholds | `js/config.js` only |
| Change priority formula weights | `js/config.js` only |
| Add a new data field to student profiles | `js/data.js` + `js/ui.js` |
| Add a new resource matching rule | `js/resources.js` |
| Adjust session lengths or break times | `js/config.js` only |
| Add a new UI section | `js/ui.js` + `index.html` + `js/app.js` |
| Support more than 12 weeks | `js/config.js` semesterStartDate + `js/app.js` loop |
