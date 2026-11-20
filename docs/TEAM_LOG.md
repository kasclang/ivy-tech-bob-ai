# Team Log — Academic Readiness Coach

**Ivy Tech IT Challenge 2026 — Case 1**

---

## Team Contributions

| Role | Responsibility |
|---|---|
| Technical Lead / Full-Stack Engineer | Architecture design, all JavaScript modules, test suite |
| UX Designer | Interface layout, CSS stylesheet, accessibility review |
| Data Analyst | Dataset inspection, algorithm validation, documentation |
| IBM Bob (AI development tool) | Code generation, debugging, test execution, documentation drafting |

---

## Development Decisions

### Decision: Browser-only application, no backend

**Rationale:** The dataset is small and provided as a JavaScript file. A backend would add deployment complexity without functional benefit for a prototype. The browser-based approach means judges can open `index.html` directly with zero setup.

### Decision: Transparent rule-based engine, not a machine learning model

**Rationale:** The dataset has five students — far too small for any meaningful model. More importantly, the competition judges are evaluating responsible AI principles. A transparent weighted scoring formula is explainable, auditable, and cannot hallucinate. We document the formula in `js/config.js` and explain it to the user in the "How your plan was created" panel.

### Decision: Modular architecture with centralized config

**Rationale:** The competition includes a "roadblocks" phase where judges will introduce unexpected requirements. By centralizing all thresholds and weights in `js/config.js`, we can respond to most judge feedback in under two minutes without touching any algorithmic code.

### Decision: Availability overlap check instead of day-name matching

**Rationale:** Early draft resource matching compared `resource.day === availability.day`. This incorrectly flagged a resource ending at 19:00 as available for Devon whose window starts at 20:30. The final implementation compares actual time intervals using `timeToMinutes()`.

### Decision: Section OL1 treated as online self-paced with no meeting time conflicts

**Rationale:** The dataset records `MATH 136, OL1, Any, , , "Online, self-paced weekly modules"` — no start/end times. Inferring class meeting times for Marcus would be fabrication. The scheduler correctly returns an empty meetings list for OL1 students.

### Decision: `not-assessed` topics scored at 0.5 weakness, not 0.0

**Rationale:** Assigning zero weakness to an unassessed topic would cause it to rank lower than a topic where the student has a confirmed 59% score — which is backwards. The student may be strong or weak on that topic; we have no evidence either way. The 0.5 neutral value lets week curriculum relevance and exam proximity drive priority for unassessed topics.

---

## IBM Bob Usage Log

| Phase | Task | Outcome |
|---|---|---|
| Step 1 | Read all 8 data files | Confirmed structure, field names, data ranges |
| Step 2 | Generate `js/config.js` | Complete centralized config file |
| Step 2 | Generate `js/data.js` | Full normalization layer with indexing |
| Step 3 | Generate `js/analysis.js` | Topic priority formula with explanations |
| Step 3 | Generate `js/resources.js` | Resource matcher with time-overlap logic |
| Step 4 | Generate `js/scheduler.js` | Constraint-based scheduling algorithm |
| Step 5 | Generate `css/styles.css` | Full responsive stylesheet |
| Step 5–6 | Generate `js/ui.js` | All DOM render functions |
| Step 6 | Generate `js/app.js` | Application controller with state management |
| Step 6 | Generate `index.html` | Complete single-page application |
| Step 8 | Generate `tests/arc-tests.js` | 75 automated tests |
| Step 8 | Debug vm-context scoping issue | Fixed Node.js test runner to use vm sandbox |
| Step 8 | Debug `const` hoisting in scheduler | Moved DataLoader destructuring before use |
| Step 8 | Confirm 75/75 tests pass | Verified |
| Step 9 | Generate `README.md` | Five required sections complete |
| Step 9 | Generate `docs/ARCHITECTURE.md` | Module responsibilities and data flow |
| Step 9 | Generate `docs/IMPACT_STATEMENT.md` | 2030 projections with responsible AI notes |
| Step 9 | Generate `docs/TEAM_LOG.md` | This file |

---

## Notes for Part 3 (Roadblocks)

If judges introduce unexpected requirements, the most likely change points are:

- **Threshold adjustments** → `js/config.js` only
- **New recommendation criteria** → `js/analysis.js` or `js/resources.js`
- **UI layout changes** → `js/ui.js` + `css/styles.css`
- **New data fields** → `js/data.js` + `js/ui.js`
- **Additional student scenarios** → `data/case_data.js`

The test suite in `tests/arc-tests.js` can be re-run after any change to verify correctness.
