// analysis.js — topic prioritisation engine.
// Returns scored, ranked topic list for a given student + selected week.
// Depends on: config.js, data.js
(function () {
  'use strict';

  /**
   * Returns topics sorted by priority score (highest first).
   * @param {object} student  - enriched student object from AppData.studentMap
   * @param {number} week     - selected curriculum week (1-12)
   * @returns {Array<{topic, score_percent, priority, reasons}>}
   */
  function analyseTopics(student, week) {
    const W  = window.CONFIG.weights;
    const EW = window.CONFIG.examProximityWeeks;
    const cal = window.AppData.assignmentCalendar;

    // topics with baseline scores
    const topicsWithScores = student.scores || [];

    // what topics appear in this week's assignments
    const thisWeekTopics = new Set();
    cal.filter(a => a.week === week).forEach(a => {
      a.topic.split(',').map(t => t.trim()).forEach(t => thisWeekTopics.add(t));
    });

    // what topics appear in exams/quizzes within the next EW weeks
    const nearExamTopics = new Set();
    cal.filter(a => (a.type === 'Exam' || a.type === 'Quiz') &&
                     a.week > week && a.week <= week + EW)
       .forEach(a => {
         a.topic.split(',').map(t => t.trim()).forEach(t => nearExamTopics.add(t));
       });

    // what topics have homework due this week
    const hwTopics = new Set();
    cal.filter(a => a.type === 'Homework' && a.week === week).forEach(a => {
      a.topic.split(',').map(t => t.trim()).forEach(t => hwTopics.add(t));
    });

    return topicsWithScores.map(ts => {
      const sc = ts.score_percent;
      const weaknessScore = (100 - sc) / 100;
      const curriculumScore = thisWeekTopics.has(ts.topic) ? 1 : 0;
      const examScore      = nearExamTopics.has(ts.topic)  ? 1 : 0;
      const hwScore        = hwTopics.has(ts.topic)        ? 1 : 0;

      const priority =
        W.diagnosticWeakness  * weaknessScore +
        W.curriculumRelevance * curriculumScore +
        W.examProximity       * examScore +
        W.homeworkProximity   * hwScore;

      const reasons = [];
      if (sc < window.CONFIG.weakThreshold)     reasons.push('Low diagnostic score (' + sc + '%)');
      if (curriculumScore)                       reasons.push('Covered in Week ' + week + ' curriculum');
      if (examScore)                             reasons.push('On an upcoming exam/quiz');
      if (hwScore)                               reasons.push('Homework due this week');

      return { topic: ts.topic, score_percent: sc, priority: Math.round(priority * 100) / 100, reasons };
    }).sort((a, b) => b.priority - a.priority);
  }

  /**
   * Classify a score into a label.
   */
  function scoreLabel(score) {
    if (score >= window.CONFIG.strongThreshold) return 'strong';
    if (score >= window.CONFIG.weakThreshold)   return 'fair';
    return 'needs-focus';
  }

  window.analyseTopics = analyseTopics;
  window.scoreLabel    = scoreLabel;
}());
