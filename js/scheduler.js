// scheduler.js — weekly study session planner.
// Places sessions into the student's available time windows after removing class conflicts.
// Depends on: config.js, data.js, analysis.js
(function () {
  'use strict';

  /**
   * Build the weekly study plan for a student.
   * @param {object} student        enriched student from AppData.studentMap
   * @param {Array}  rankedTopics   output of analyseTopics()
   * @param {number} week           curriculum week number
   * @returns {Array<{day, start, end, topic, sessionNum}>}
   */
  function buildSchedule(student, rankedTopics, week) {
    const CFG  = window.CONFIG;
    const toM  = window.timeToMin;
    const fM   = window.minToTime;
    const section = student.section || 'OL1';

    // max sessions cap based on work hours
    const workH = student.work_hours_per_week || 0;
    let maxSessions = 2;
    for (const cap of CFG.workloadCaps) {
      if (workH <= cap.maxWorkHours) { maxSessions = cap.maxSessions; break; }
    }

    // class conflicts for this section
    const classTimes = {}; // { Monday: [{start, end}] }
    const schedule   = window.AppData.scheduleBySection[section] || [];
    schedule.forEach(cs => {
      if (cs.day === 'Any' || !cs.start) return;
      if (!classTimes[cs.day]) classTimes[cs.day] = [];
      classTimes[cs.day].push({ start: toM(cs.start), end: toM(cs.end) });
    });

    // rotate topics so sessions are spread across top priorities
    const topTopics = rankedTopics.slice(0, CFG.topTopicsCount);
    if (topTopics.length === 0) return [];

    const sessions = [];
    let topicIdx = 0;

    for (const avail of (student.availability || [])) {
      if (sessions.length >= maxSessions) break;

      const conflicts = classTimes[avail.day] || [];
      let cursor = toM(avail.start);
      const windowEnd = toM(avail.end);

      while (cursor + CFG.minSessionMinutes <= windowEnd &&
             sessions.length < maxSessions) {

        // skip over any class conflict
        let blocked = false;
        for (const c of conflicts) {
          if (cursor < c.end && cursor + CFG.sessionMinutes > c.start) {
            cursor = c.end + CFG.breakMinutes;
            blocked = true;
            break;
          }
        }
        if (blocked) continue;

        const sessionEnd = Math.min(cursor + CFG.sessionMinutes, windowEnd);
        if (sessionEnd - cursor < CFG.minSessionMinutes) break;

        const topic = topTopics[topicIdx % topTopics.length];
        sessions.push({
          day:        avail.day,
          start:      fM(cursor),
          end:        fM(sessionEnd),
          topic:      topic.topic,
          priority:   topic.priority,
          score:      topic.score_percent,
          reasons:    topic.reasons,
          sessionNum: sessions.length + 1
        });

        topicIdx++;
        cursor = sessionEnd + CFG.breakMinutes;
      }
    }

    return sessions;
  }

  window.buildSchedule = buildSchedule;
}());
