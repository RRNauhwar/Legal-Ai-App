/**
 * @file ScoringEngine.js
 * @description Computes case completion scores, assigns grades (S-F), 
 * and tracks achievements.
 * @version 1.0.0
 */

window.NyayaSim = window.NyayaSim || {};

window.NyayaSim.ScoringEngine = class ScoringEngine {
  /**
   * Create a new ScoringEngine.
   * @param {Object} eventBus - EventBus instance.
   * @param {Object} stateManager - StateManager instance.
   */
  constructor(eventBus, stateManager) {
    this.eventBus = eventBus;
    this.stateManager = stateManager;

    /** @type {Object[]} Array of achievement definitions */
    this.achievements = this._getAchievementDefinitions();
  }

  /**
   * Calculate score and grade for the current case.
   * @param {Object} caseData - Case content data.
   * @param {Object} caseState - Runtime state details.
   * @returns {Object} Score evaluation.
   */
  evaluateCase(caseData, caseState) {
    // 1. Base Score: 10000 points
    let score = 10000;

    // 2. Time Penalty
    const minutesElapsed = Math.floor(caseState.elapsedTime / 60);
    const expectedTime = caseData.caseInfo?.estimatedTimeMinutes || 45;
    let timePenalty = 0;
    if (minutesElapsed > expectedTime) {
      timePenalty = Math.min(2500, (minutesElapsed - expectedTime) * 50);
      score -= timePenalty;
    }

    // 3. Hints Penalty
    const hintsPenalty = caseState.hintsUsed * 1000;
    score -= hintsPenalty;

    // 4. Accusation Penalty
    const wrongAccusationsCount = caseState.accusations.filter(acc => !acc.isFullyCorrect).length;
    const accusationsPenalty = wrongAccusationsCount * 1500;
    score -= accusationsPenalty;

    // 5. Evidence Discovery Bonus
    const totalEvidenceCount = caseData.evidence?.length || 1;
    const discoveredEvidenceCount = caseState.discoveredEvidence?.length || 0;
    const discoveryRatio = discoveredEvidenceCount / totalEvidenceCount;
    const evidenceBonus = Math.round(discoveryRatio * 2000);
    score += evidenceBonus;

    // Clamp score
    score = Math.max(100, Math.min(12000, score));

    // Determine Grade
    let grade = 'C';
    if (score >= 10500) grade = 'S';
    else if (score >= 9000) grade = 'A';
    else if (score >= 7500) grade = 'B';
    else if (score >= 5000) grade = 'C';
    else if (score >= 3000) grade = 'D';
    else grade = 'F';

    const result = {
      score,
      grade,
      breakdown: {
        baseScore: 10000,
        timePenalty,
        hintsPenalty,
        accusationsPenalty,
        evidenceBonus,
        minutesElapsed
      }
    };

    // Check achievements
    this.checkAchievements(caseData, caseState, result);

    return result;
  }

  /**
   * Check for achievements unlocked during case evaluation.
   * @param {Object} caseData
   * @param {Object} caseState
   * @param {Object} evaluation
   */
  checkAchievements(caseData, caseState, evaluation) {
    const currentAchievements = new Set(this.stateManager.get('player.achievements') || []);
    const newlyUnlocked = [];

    this.achievements.forEach(ach => {
      if (currentAchievements.has(ach.id)) return;

      let unlocked = false;

      switch (ach.id) {
        case 'ach_first_case':
          unlocked = true; // First case completed
          break;
        case 'ach_no_hints':
          unlocked = caseState.hintsUsed === 0;
          break;
        case 'ach_first_try':
          const wrongAccCount = caseState.accusations.filter(acc => !acc.isFullyCorrect).length;
          unlocked = wrongAccCount === 0;
          break;
        case 'ach_speedrun':
          unlocked = caseState.elapsedTime < 600; // < 10 minutes
          break;
        case 'ach_completionist':
          const totalEv = caseData.evidence?.length || 1;
          const foundEv = caseState.discoveredEvidence?.length || 0;
          unlocked = foundEv === totalEv;
          break;
        case 'ach_perfect':
          unlocked = evaluation.grade === 'S';
          break;
        case 'ach_patient_detective':
          unlocked = caseState.elapsedTime > 3600; // > 60 minutes
          break;
        case 'ach_contradiction_hunter':
          unlocked = caseState.examinedObjects?.length > 10;
          break;
      }

      if (unlocked) {
        currentAchievements.add(ach.id);
        newlyUnlocked.push(ach);
        
        this.eventBus.emit('achievement:unlocked', {
          id: ach.id,
          title: ach.title,
          description: ach.description
        });
      }
    });

    if (newlyUnlocked.length > 0) {
      this.stateManager.set('player.achievements', [...currentAchievements]);
    }
  }

  /**
   * Get list of all achievement definitions.
   * @private
   * @returns {Object[]}
   */
  _getAchievementDefinitions() {
    return [
      { id: 'ach_first_case', title: 'First of Many', description: 'Complete your first murder case.' },
      { id: 'ach_no_hints', title: 'Pure Logic', description: 'Solve a case without using any hints.' },
      { id: 'ach_first_try', title: 'Ace Detective', description: 'Solve a case on your very first accusation attempt.' },
      { id: 'ach_speedrun', title: 'Flawless Speed', description: 'Solve a case in under 10 minutes.' },
      { id: 'ach_completionist', title: 'No Stone Unturned', description: 'Find all pieces of evidence in a case before solving it.' },
      { id: 'ach_perfect', title: 'Mastermind', description: 'Obtain an S-grade on any case.' },
      { id: 'ach_patient_detective', title: 'Slow and Steady', description: 'Spend over an hour investigating a single case.' },
      { id: 'ach_contradiction_hunter', title: 'Liar Catcher', description: 'Examine more than 10 objects in your notebook.' }
    ];
  }
};
