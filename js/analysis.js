/**
 * analysis.js — Academic readiness analysis and topic prioritization.
 * Uses transparent, deterministic rule-based scoring.
 */
const Analysis = (() => {

  /**
   * Classify a topic score into a readiness category.
   * Returns 'attention' | 'developing' | 'strong' | 'not-assessed'
   */
  function classifyScore(score) {
    if (score === null || score === undefined) return 'not-assessed';
    if (score < CONFIG.thresholds.needsAttention)      return 'attention';
    if (score < CONFIG.thresholds.developingProficiency) return 'developing';
    return 'strong';
  }

  /**
   * Compute priority score for a topic given student data and selected week.
   * Returns a value in [0, 1] plus a human-readable explanation array.
   */
  function computeTopicPriority(topic, score, weekAssignments, weekNum, allAssignments) {
    const w = CONFIG.priorityWeights;
    const reasons = [];
    let total = 0;

    // 1. Diagnostic weakness contribution
    let weaknessScore = 0;
    if (score !== null && score !== undefined) {
      weaknessScore = Math.max(0, (100 - score) / 100);
      total += w.diagnosticWeakness * weaknessScore;
      if (score < CONFIG.thresholds.needsAttention) {
        reasons.push(`Diagnostic score is ${score}% (needs immediate attention).`);
      } else if (score < CONFIG.thresholds.developingProficiency) {
        reasons.push(`Diagnostic score is ${score}% (developing proficiency).`);
      } else {
        reasons.push(`Diagnostic score is ${score}% (strong foundation).`);
      }
    } else {
      // Not assessed — treat as curriculum-relevant but unknown
      total += w.diagnosticWeakness * 0.5;
      reasons.push('No diagnostic score available; proficiency is unconfirmed.');
    }

    // 2. Week relevance — does this week's curriculum cover this topic?
    const thisWeekTopics = weekAssignments.map(a => a.topic.toLowerCase());
    const topicLower = topic.toLowerCase();
    const isInWeek = thisWeekTopics.some(t =>
      t === topicLower || t.includes(topicLower) || topicLower.includes(t)
    );
    if (isInWeek) {
      total += w.weekRelevance * 1.0;
      reasons.push(`This topic is covered in Week ${weekNum} curriculum.`);
    } else {
      total += w.weekRelevance * 0.0;
    }

    // 3. Exam/quiz proximity — any exam or quiz within examProximityWeeks?
    const examTypes = ['Exam', 'Quiz'];
    const nearExams = allAssignments.filter(a => {
      if (!examTypes.includes(a.type)) return false;
      const aw = a.week;
      return aw >= weekNum && aw <= weekNum + CONFIG.examProximityWeeks;
    });
    const examTopicMatch = nearExams.some(a => {
      const at = a.topic.toLowerCase();
      return at === topicLower || at.includes(topicLower) || topicLower.includes(at);
    });
    if (examTopicMatch) {
      total += w.examProximity * 1.0;
      const examNames = nearExams
        .filter(a => { const at = a.topic.toLowerCase(); return at === topicLower || at.includes(topicLower) || topicLower.includes(at); })
        .map(a => `${a.item} (Week ${a.week})`);
      reasons.push(`Upcoming assessment: ${examNames.join(', ')}.`);
    } else {
      total += w.examProximity * 0.0;
    }

    // 4. Homework proximity — homework due this week
    const hwMatch = weekAssignments.some(a => {
      if (a.type !== 'Homework' && a.type !== 'Practice') return false;
      const at = a.topic.toLowerCase();
      return at === topicLower || at.includes(topicLower) || topicLower.includes(at);
    });
    if (hwMatch) {
      total += w.homeworkProximity * 1.0;
      reasons.push(`Homework or practice assignment is due this week.`);
    }

    return { priority: total, reasons };
  }

  /**
   * Build a prioritized list of topics for a student and selected week.
   * Returns sorted array of topic objects with priority score and explanation.
   */
  function prioritizeTopics(studentId, weekNum, appData) {
    const { topicScores, assignmentCalendar } = appData;

    // All assignments for this week
    const weekAssignments = assignmentCalendar.filter(a => a.week === weekNum);

    // All 12-week assignments for exam proximity
    const allAssignments = assignmentCalendar;

    // Collect all topic names mentioned in diagnostics or in the week calendar
    const knownTopics = new Set();
    (topicScores[studentId] || []).forEach(t => knownTopics.add(t.topic));
    weekAssignments.forEach(a => {
      a.topic.split(',').map(t => t.trim()).forEach(t => knownTopics.add(t));
    });

    // Build score lookup
    const scoreLookup = {};
    (topicScores[studentId] || []).forEach(t => { scoreLookup[t.topic] = t.score; });

    const prioritized = [];
    knownTopics.forEach(topic => {
      const score = scoreLookup.hasOwnProperty(topic) ? scoreLookup[topic] : null;
      const { priority, reasons } = computeTopicPriority(
        topic, score, weekAssignments, weekNum, allAssignments
      );

      // Build human-readable explanation
      let explanation = `${topic} is prioritized because: `;
      if (score !== null) {
        explanation += `your diagnostic score was ${score}%`;
      } else {
        explanation += `no diagnostic score is available`;
      }
      const isInWeek = weekAssignments.some(a => {
        const at = a.topic.toLowerCase();
        const tl = topic.toLowerCase();
        return at === tl || at.includes(tl) || tl.includes(at);
      });
      if (isInWeek) explanation += ` and it is covered by Week ${weekNum} coursework`;
      explanation += '.';

      prioritized.push({
        topic,
        score,
        category:    classifyScore(score),
        priority,
        reasons,
        explanation,
      });
    });

    // Sort by priority descending; break ties by score ascending (lower score = higher urgency)
    prioritized.sort((a, b) => {
      if (Math.abs(b.priority - a.priority) > 0.001) return b.priority - a.priority;
      const aS = a.score ?? 50;
      const bS = b.score ?? 50;
      return aS - bS;
    });

    return prioritized;
  }

  return { prioritizeTopics, classifyScore };
})();
