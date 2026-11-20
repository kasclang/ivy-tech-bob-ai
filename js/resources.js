// resources.js — support resource matching engine.
// Depends on: config.js, data.js
(function () {
  'use strict';

  /**
   * Match resources to a student's topics, schedule, and modality.
   * @param {object} student       enriched student
   * @param {Array}  rankedTopics  output of analyseTopics()
   * @returns {{ fits: Array, alternatives: Array }}
   *   fits        — resources that overlap the student's availability
   *   alternatives — online/anytime resources that don't require schedule overlap
   */
  function matchResources(student, rankedTopics) {
    const toM      = window.timeToMin;
    const avail    = student.availability || [];
    const section  = student.section || '';
    const modality = student.modality || '';
    const topTopics = new Set(
      rankedTopics.slice(0, window.CONFIG.topTopicsCount).map(t => t.topic)
    );

    const resources = window.AppData.supportResources;

    function topicMatch(resource) {
      if (resource.topics === 'All') return true;
      const rTopics = resource.topics.split(',').map(t => t.trim());
      for (const rt of rTopics) {
        if (topTopics.has(rt)) return true;
      }
      return false;
    }

    // section-specific office hours: only show if section matches
    function sectionMatch(resource) {
      if (!resource.name.toLowerCase().includes('office hours')) return true;
      if (resource.name.includes('Section 01') && section === '01')  return true;
      if (resource.name.includes('Section 40') && section === '40')  return true;
      if (!resource.name.includes('Section'))                         return true;
      return false;
    }

    function scheduleOverlap(resource) {
      if (resource.day === 'Any') return true;
      return avail.some(av => {
        if (av.day !== resource.day) return false;
        return toM(av.start) < toM(resource.end) &&
               toM(av.end)   > toM(resource.start);
      });
    }

    const fits        = [];
    const alternatives = [];

    for (const r of resources) {
      if (!topicMatch(r))   continue;
      if (!sectionMatch(r)) continue;

      if (r.day === 'Any' || scheduleOverlap(r)) {
        fits.push(r);
      } else {
        // in-person resources that don't fit schedule → show as alternatives
        if (r.modality === 'Online' || fits.length < window.CONFIG.resourceFitCount) {
          alternatives.push(r);
        } else {
          alternatives.push(r);
        }
      }
    }

    // cap fits to avoid overwhelming the student
    return {
      fits:         fits.slice(0, window.CONFIG.resourceFitCount + 2),
      alternatives: alternatives.slice(0, 4)
    };
  }

  window.matchResources = matchResources;
}());
