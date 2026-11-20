/**
 * scheduler.js — Weekly study-session scheduling algorithm.
 * Deterministic: same inputs always produce the same plan.
 */
const Scheduler = (() => {

  /**
   * Get the student's course meetings for their enrolled section.
   * Returns [{ day, startMin, endMin }]  — only meetings with fixed times.
   */
  function getCourseMeetings(student, appData) {
    const { timeToMinutes } = DataLoader;
    const { courseSchedule } = appData;
    const section = student.section;
    // OL1 is online self-paced — no fixed meeting times
    if (!section || section === 'OL1') return [];

    return courseSchedule
      .filter(c => c.section === section && c.start && c.end)
      .map(c => ({
        day:      c.day,
        startMin: timeToMinutes(c.start),
        endMin:   timeToMinutes(c.end),
      }));
  }

  /**
   * Subtract blocked intervals (course meetings on the same day) from an availability window.
   * Returns array of free sub-windows: [{ startMin, endMin }]
   */
  function subtractMeetings(avail, meetings) {
    let free = [{ startMin: avail.startMin, endMin: avail.endMin }];
    meetings.forEach(mtg => {
      const next = [];
      free.forEach(slot => {
        // No overlap
        if (mtg.endMin <= slot.startMin || mtg.startMin >= slot.endMin) {
          next.push(slot);
          return;
        }
        // Overlap — split
        if (slot.startMin < mtg.startMin) {
          next.push({ startMin: slot.startMin, endMin: mtg.startMin });
        }
        if (slot.endMin > mtg.endMin) {
          next.push({ startMin: mtg.endMin, endMin: slot.endMin });
        }
      });
      free = next;
    });
    return free.filter(s => s.endMin - s.startMin >= CONFIG.scheduling.minSessionMinutes);
  }

  /**
   * Given ordered prioritized topics and remaining minutes needed,
   * allocate session durations to topics.
   * Returns [{ topic, durationMin }]
   */
  function allocateTopicTime(prioritizedTopics, totalMinutes) {
    if (!prioritizedTopics.length || totalMinutes <= 0) return [];

    // Distribute time proportionally to priority, minimum one session per top-3 topic
    const top = prioritizedTopics.slice(0, Math.min(5, prioritizedTopics.length));
    const sumPri = top.reduce((s, t) => s + (t.priority || 0.1), 0) || top.length;
    const allocations = top.map(t => ({
      topic:       t.topic,
      durationMin: Math.round((t.priority / sumPri) * totalMinutes / 10) * 10,
      explanation: t.explanation,
    }));

    // Ensure each topic gets at least minSessionMinutes
    allocations.forEach(a => {
      if (a.durationMin < CONFIG.scheduling.minSessionMinutes) {
        a.durationMin = CONFIG.scheduling.minSessionMinutes;
      }
    });

    // Trim total if overshooting
    let runningTotal = allocations.reduce((s, a) => s + a.durationMin, 0);
    let i = allocations.length - 1;
    while (runningTotal > totalMinutes && i >= 0) {
      const excess = runningTotal - totalMinutes;
      const trim = Math.min(excess, allocations[i].durationMin - CONFIG.scheduling.minSessionMinutes);
      if (trim > 0) {
        allocations[i].durationMin -= trim;
        runningTotal -= trim;
      }
      i--;
    }

    return allocations.filter(a => a.durationMin >= CONFIG.scheduling.minSessionMinutes);
  }

  /**
   * Choose recommended activity for a topic based on its category.
   */
  function recommendActivity(topic, category) {
    switch (category) {
      case 'attention':   return `Review worked examples, then attempt practice problems for ${topic}`;
      case 'developing':  return `Complete practice problems and check errors for ${topic}`;
      case 'strong':      return `Quick review; focus on problem variations for ${topic}`;
      case 'not-assessed': return `Work through the Week module material on ${topic}`;
      default:            return `Study ${topic}`;
    }
  }

  /**
   * Build the full weekly schedule for a student.
   *
   * @param {object} student
   * @param {number} weekNum
   * @param {number} targetMinutes - desired study time (may be clamped)
   * @param {array}  prioritizedTopics
   * @param {object} appData
   * @returns { sessions[], totalAvailableMin, totalPlannedMin, warning? }
   */
  function buildWeeklyPlan(student, weekNum, targetMinutes, prioritizedTopics, appData) {
    const { timeToMinutes, minutesToTime, weekStartDate, dateForWeekday } = DataLoader;
    const { minSessionMinutes, maxSessionMinutes, breakMinutes } = CONFIG.scheduling;

    const { studyAvailability } = appData;
    const avail = studyAvailability[student.id] || [];
    const meetings = getCourseMeetings(student, appData);
    const weekStart = weekStartDate(weekNum);

    // ── Compute all free study slots across the week ──────────────────────────
    const allSlots = []; // { day, startMin, endMin, dateStr }
    CONFIG.DAY_ORDER.forEach(day => {
      const dayAvail = avail.filter(a => a.day === day);
      if (!dayAvail.length) return;
      const dayMeetings = meetings.filter(m => m.day === day);
      dayAvail.forEach(a => {
        const raw = { startMin: timeToMinutes(a.start), endMin: timeToMinutes(a.end) };
        const freeSlots = subtractMeetings(raw, dayMeetings);
        const dateStr = dateForWeekday(weekStart, day);
        freeSlots.forEach(s => allSlots.push({ day, startMin: s.startMin, endMin: s.endMin, dateStr }));
      });
    });

    const totalAvailableMin = allSlots.reduce((s, slot) => s + (slot.endMin - slot.startMin), 0);

    // Clamp target to actual available time
    let warning = null;
    let plannedTarget = targetMinutes;
    if (targetMinutes > totalAvailableMin) {
      warning = `Your requested study time of ${targetMinutes} min exceeds your available ${totalAvailableMin} min this week. Plan adjusted to available time.`;
      plannedTarget = totalAvailableMin;
    }
    if (plannedTarget <= 0) {
      return { sessions: [], totalAvailableMin, totalPlannedMin: 0, warning: 'No available study windows found this week.' };
    }

    // Allocate topic time within the planned target
    const topicAllocations = allocateTopicTime(prioritizedTopics, plannedTarget);
    if (!topicAllocations.length) {
      return { sessions: [], totalAvailableMin, totalPlannedMin: 0, warning };
    }

    // ── Assign topic slots to available time windows ──────────────────────────
    const sessions = [];
    let totalPlannedMin = 0;

    // Build a queue of topics (each entry = { topic, remainingMin, explanation, category })
    const topicQueue = topicAllocations.map(ta => {
      const pt = prioritizedTopics.find(t => t.topic === ta.topic) || {};
      return {
        topic:       ta.topic,
        remainingMin: ta.durationMin,
        explanation: ta.explanation,
        category:    pt.category || 'not-assessed',
      };
    });

    let topicIdx = 0;
    let lastSessionEndMin = -1;
    let lastDay = null;

    for (const slot of allSlots) {
      if (topicIdx >= topicQueue.length) break;

      let cursor = slot.startMin;

      // Optionally add break if previous session ended close on same day
      if (slot.day === lastDay && sessions.length > 0) {
        cursor = Math.max(cursor, lastSessionEndMin + breakMinutes);
      }

      while (cursor + minSessionMinutes <= slot.endMin && topicIdx < topicQueue.length) {
        const tq = topicQueue[topicIdx];
        // Session duration: min(remaining, maxSession, slot remaining)
        const slotRemaining = slot.endMin - cursor;
        const sessionDur = Math.min(tq.remainingMin, maxSessionMinutes, slotRemaining);
        if (sessionDur < minSessionMinutes) break;

        const startTime = minutesToTime(cursor);
        const endTime   = minutesToTime(cursor + sessionDur);

        sessions.push({
          id:        `session-${sessions.length + 1}`,
          day:       slot.day,
          date:      slot.dateStr,
          startTime,
          endTime,
          durationMin: sessionDur,
          topic:     tq.topic,
          category:  tq.category,
          activity:  recommendActivity(tq.topic, tq.category),
          reason:    tq.explanation,
        });

        totalPlannedMin += sessionDur;
        tq.remainingMin -= sessionDur;
        if (tq.remainingMin <= 0) topicIdx++;

        cursor += sessionDur + breakMinutes;
        lastSessionEndMin = cursor - breakMinutes;
        lastDay = slot.day;
      }
    }

    return { sessions, totalAvailableMin, totalPlannedMin, warning };
  }

  return { buildWeeklyPlan, getCourseMeetings };
})();
