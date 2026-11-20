# Academic Readiness Coach

**Ivy Tech IT Challenge 2026 — Case 1: AI Academic Readiness Coach**

> *Know what to study. Know when to get help.*

---

## 1. Problem Statement

First-semester students enrolled in co-requisite college mathematics (MATH 136 College Algebra + MATH 036 Algebra Support) often do not discover they need help until after they have failed their first exam. Without a clear picture of their own weaknesses, upcoming deadlines, and available resources, students arrive underprepared and lack a concrete action plan.

This prototype addresses that gap **proactively** by giving each student a personalized weekly study plan before the first assessment — not after.

---

## 2. Solution Description

**Academic Readiness Coach** is a browser-based single-page application that:

- Analyzes each student's diagnostic math scores across four initial topics (linear equations, inequalities, functions and notation, graphing lines).
- Prioritizes topics based on diagnostic weakness, upcoming curriculum, and exam proximity.
- Generates a realistic weekly study schedule inside each student's recorded availability windows, respecting all class meetings.
- Recommends relevant tutoring and academic support resources matched to student topics, schedule, and section.
- Tracks weekly session completion with localStorage persistence.
- Explains every recommendation in plain language a first-semester student can understand.

The prototype fulfills the minimum user story end-to-end:

> *"As a first-semester student in co-requisite math, I can get a weekly study plan with tutoring options so that I pass my first college math course."*

---

## 3. Technical Approach and Architecture

### Technology Stack

| Layer | Choice | Rationale |
|---|---|---|
| Presentation | HTML5 + CSS3 | Zero dependencies, fully offline |
| Logic | Vanilla JavaScript (ES6+) | No build step required |
| Data | `data/case_data.js` via `window.CASE_DATA` | Pre-loaded, no backend needed |
| Persistence | `localStorage` | Client-side, no auth required |

### Module Architecture

```
index.html
├── js/config.js          Centralized thresholds, weights, scheduling constraints
├── js/data.js            Data loading, normalization, enrollment mapping
├── js/analysis.js        Topic prioritization (rule-based scoring)
├── js/scheduler.js       Weekly study-session scheduling algorithm
├── js/resources.js       Support resource matching engine
├── js/persistence.js     localStorage progress tracking
├── js/ui.js              All DOM rendering functions
├── js/app.js             Application controller (state, events)
├── css/styles.css        UI stylesheet
└── data/case_data.js     Source dataset
```

### Recommendation Engine

The system uses a **transparent, deterministic, rule-based scoring engine** — not a machine-learning model. Each topic receives a priority score computed from four weighted factors:

| Factor | Weight | Description |
|---|---|---|
| Diagnostic weakness | 45% | `(100 − score) / 100` — lower scores rank higher |
| Week curriculum relevance | 30% | Topic appears in selected week's assignments |
| Exam/quiz proximity | 20% | Assessment due within 2 weeks covers this topic |
| Homework proximity | 5% | Homework due this week covers this topic |

All weights are configurable in [`js/config.js`](js/config.js).

### Scheduling Algorithm

Sessions are placed into available time windows (from `study_availability.csv`) after subtracting enrolled course meetings (from `course_schedule.csv`). Session durations are 25–60 minutes with 10-minute breaks. The algorithm is deterministic: identical inputs always produce the same plan.

Section OL1 (Marcus) is treated as online/self-paced with no fixed meeting time conflicts.

### Resource Matching

Resources are matched by exact time-window overlap (not just day matching), topic relevance, section applicability, and student modality preference. Resources that do not overlap the student's recorded availability are shown as alternatives with a clear disclosure.

---

## 4. Strategic Alignment

| | |
|---|---|
| **Pillar** | Academic & Instructional Quality |
| **Statewide Strategy** | Optimize Student Placement & Academic Readiness |
| **Focus Area** | Learning and study support |
| **Primary 2030 Metric** | Gateway course success rate |

This prototype directly targets the gateway course success metric by providing proactive, personalized academic support before students fall behind in their first college math course.

---

## 5. How IBM Bob Was Used

IBM Bob (AI-assisted development) was used throughout the entire development session:

- **Architecture design**: Bob proposed the modular architecture separating data, analysis, scheduling, resource matching, and UI layers.
- **Code generation**: All JavaScript modules, CSS, HTML, and test file were written by Bob based on the data files and requirements.
- **Data inspection**: Bob read and analyzed all eight source CSV files and `case_data.js` to confirm structure before writing any application code.
- **Algorithm implementation**: Bob designed and implemented the transparent weighted scoring formula for topic prioritization and the constraint-based scheduling algorithm.
- **Debugging**: Bob diagnosed and resolved a Node.js vm-context scoping issue that prevented the test runner from accessing module-level `const` declarations.
- **Testing**: Bob wrote 75 automated tests covering every required scenario and ran them to confirm all pass before final delivery.
- **Documentation**: Bob wrote this README, the architecture notes, Impact Statement, and team log.

---

## Running the Application

### Option A: Open directly in a browser (simplest)

```bash
# No server required — open index.html directly:
open index.html
# or on Linux:
xdg-open index.html
```

### Option B: Serve with a local HTTP server

```bash
# Python 3
python3 -m http.server 8080
# Then visit http://localhost:8080
```

### Running tests

```bash
node tests/arc-tests.js
# Expected: 75 passed, 0 failed
```

---

## File Map

```
ivy-tech-bob-ai/
├── index.html                 Main application entry point
├── css/styles.css             Application stylesheet
├── js/
│   ├── config.js              ← MODIFY HERE to adjust weights/thresholds
│   ├── data.js                Data loading and normalization
│   ├── analysis.js            Topic prioritization engine
│   ├── scheduler.js           Study session scheduler
│   ├── resources.js           Resource matcher
│   ├── persistence.js         localStorage helpers
│   ├── ui.js                  DOM renderers
│   └── app.js                 Application controller
├── data/
│   ├── case_data.js           Source dataset (window.CASE_DATA)
│   ├── students.csv
│   ├── topic_scores.csv
│   ├── study_availability.csv
│   ├── course_schedule.csv
│   ├── enrollments.csv
│   ├── assignment_calendar.csv
│   └── support_resources.csv
├── tests/
│   └── arc-tests.js           Automated test suite (Node.js)
├── docs/
│   ├── ARCHITECTURE.md        Architecture notes
│   ├── IMPACT_STATEMENT.md    Draft 2030 impact statement
│   └── TEAM_LOG.md            Team contributions and decisions
└── README.md                  This file
```

---

## Limitations and Known Constraints (Prototype)

- Uses fictional sample data only. No real student records.
- No server-side component; `localStorage` does not persist across browsers or devices.
- Diagnostic scores cover only four initial topics. Topics in Weeks 5–12 have no proficiency baseline.
- Work hours are used as a workload indicator only; specific employment hours are not known.
- Resource recommendations are not bookings. Students must contact resources directly.
- No authentication. This prototype is not suitable for production deployment as-is.
