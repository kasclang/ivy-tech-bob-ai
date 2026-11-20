/**
 * resources.js — Support resource matching engine.
 * Matches resources by topic relevance, availability overlap, section, and modality.
 */
const Resources = (() => {

  /**
   * Check whether a resource's day/time window overlaps a student's availability.
   * Returns 'available' | 'unavailable' | 'on-demand'
   */
  function checkAvailabilityFit(resource, studentAvail) {
    const { timeToMinutes } = DataLoader;
    // On-demand resources (no schedule)
    if (!resource.start && !resource.end) return 'on-demand';

    // "Any" day — check if any student window overlaps the time
    if (resource.day === 'Any') {
      const rStart = timeToMinutes(resource.start);
      const rEnd   = timeToMinutes(resource.end);
      for (const a of studentAvail) {
        const aStart = timeToMinutes(a.start);
        const aEnd   = timeToMinutes(a.end);
        if (rStart < aEnd && rEnd > aStart) return 'available';
      }
      return 'unavailable';
    }

    // Specific day
    const dayAvail = studentAvail.filter(a => a.day === resource.day);
    if (!dayAvail.length) return 'unavailable';
    const rStart = timeToMinutes(resource.start);
    const rEnd   = timeToMinutes(resource.end);
    for (const a of dayAvail) {
      const aStart = timeToMinutes(a.start);
      const aEnd   = timeToMinutes(a.end);
      // Overlap requires: resource starts before student ends AND resource ends after student starts
      if (rStart < aEnd && rEnd > aStart) return 'available';
    }
    return 'unavailable';
  }

  /**
   * Check whether a resource conflicts with any course meeting on the same day.
   * Returns true if conflict exists.
   */
  function checkScheduleConflict(resource, courseMeetings) {
    const { timeToMinutes } = DataLoader;
    if (!resource.start || resource.day === 'Any') return false;
    const rDay   = resource.day;
    const rStart = timeToMinutes(resource.start);
    const rEnd   = timeToMinutes(resource.end);
    return courseMeetings.some(m => {
      if (m.day !== rDay) return false;
      return rStart < m.endMin && rEnd > m.startMin;
    });
  }

  /**
   * Check whether a resource is relevant to a given topic.
   */
  function isTopicMatch(resource, topic) {
    if (resource.topics.includes('All')) return true;
    const tl = topic.toLowerCase();
    return resource.topics.some(rt => {
      const rtl = rt.toLowerCase();
      return rtl === tl || rtl.includes(tl) || tl.includes(rtl);
    });
  }

  /**
   * Check section applicability.
   * Section 01 office hours should not go to Section 40 students (and vice versa),
   * but mark the conflict clearly rather than hiding the resource.
   */
  function checkSectionFit(resource, studentSection) {
    if (resource.name.includes('Section 01') && studentSection !== '01') return false;
    if (resource.name.includes('Section 40') && studentSection !== '40') return false;
    return true;
  }

  /**
   * Match and score resources for the student's top priority topics.
   *
   * @param {object} student
   * @param {array}  prioritizedTopics  — from Analysis.prioritizeTopics
   * @param {object} appData
   * @returns {array} of resource recommendations, sorted by fit score
   */
  function matchResources(student, prioritizedTopics, appData) {
    const { supportResources, studyAvailability } = appData;
    const courseMeetings = Scheduler.getCourseMeetings(student, appData);
    const studentAvail   = studyAvailability[student.id] || [];

    // Build a set of the student's top topics (all prioritized topics)
    const topTopics = prioritizedTopics.map(t => t.topic);

    const recommendations = [];

    supportResources.forEach(resource => {
      // Find matching topics
      const matchedTopics = topTopics.filter(t => isTopicMatch(resource, t));
      if (!matchedTopics.length && !resource.topics.includes('All')) return;

      const availFit      = checkAvailabilityFit(resource, studentAvail);
      const hasConflict   = checkScheduleConflict(resource, courseMeetings);
      const sectionFit    = checkSectionFit(resource, student.section);
      const modalityMatch = resource.modality === student.modality ||
                            resource.modality === 'Online' ||
                            student.modality  === 'Online';

      // Compute relevance score
      let score = 0;
      if (availFit === 'available' || availFit === 'on-demand') score += 3;
      if (!hasConflict) score += 2;
      if (sectionFit)   score += 2;
      if (modalityMatch) score += 1;

      // Priority boost for 'All' resources that are most accessible
      if (resource.topics.includes('All') && availFit !== 'unavailable') score += 1;

      // Build reason string
      const addressedTopics = resource.topics.includes('All')
        ? (matchedTopics.length ? matchedTopics : topTopics.slice(0, 3))
        : matchedTopics;

      let whySelected = '';
      if (resource.topics.includes('All')) {
        whySelected = `Covers all math topics, including your current focus areas.`;
      } else {
        whySelected = `Addresses ${addressedTopics.join(', ')}.`;
      }

      let availNote = '';
      if (availFit === 'on-demand') {
        availNote = 'Available on-demand; no scheduling needed.';
      } else if (availFit === 'available') {
        availNote = `Schedule overlaps your availability on ${resource.day}.`;
      } else {
        availNote = `Schedule does not overlap your recorded availability window${resource.day ? ` on ${resource.day}` : ''}.`;
      }

      let conflictNote = hasConflict
        ? `Note: this resource's time conflicts with one of your class meetings.`
        : '';

      let sectionNote = !sectionFit
        ? `This resource is intended for a different course section; check with your instructor before attending.`
        : '';

      let scheduleNote = (resource.start && resource.end)
        ? `Hours: ${resource.day !== 'Any' ? resource.day + ' ' : ''}${resource.start}–${resource.end}.`
        : 'On-demand — access any time.';

      recommendations.push({
        resource,
        matchedTopics: addressedTopics,
        availFit,
        hasConflict,
        sectionFit,
        modalityMatch,
        score,
        whySelected,
        availNote,
        conflictNote,
        sectionNote,
        scheduleNote,
      });
    });

    // Sort: available & section-fit first, then by score, then alphabetical
    recommendations.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.resource.name.localeCompare(b.resource.name);
    });

    return recommendations;
  }

  return { matchResources, checkAvailabilityFit };
})();
