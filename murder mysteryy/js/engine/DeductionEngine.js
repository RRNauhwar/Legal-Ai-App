/**
 * @file DeductionEngine.js
 * @description Validates player accusations against the case solution,
 * manages accusation limits, and calculates accuracy.
 * @version 1.0.0
 */

window.NyayaSim = window.NyayaSim || {};

window.NyayaSim.DeductionEngine = class DeductionEngine {
  /**
   * Create a new DeductionEngine.
   * @param {Object} eventBus - EventBus instance.
   * @param {Object} caseLoader - CaseLoader instance.
   */
  constructor(eventBus, caseLoader) {
    this.eventBus = eventBus;
    this.caseLoader = caseLoader;
    
    /** @type {number} */
    this.MAX_ATTEMPTS = 3;
    
    /** @type {Array<Object>} Accusation history */
    this.accusations = [];
    
    this._bindEvents();
  }

  /**
   * Bind event listeners.
   * @private
   */
  _bindEvents() {
    this.eventBus.on('deduction:accuse', (data) => this.submitAccusation(data.accusation));
  }

  /**
   * Initialize state.
   * @param {Array<Object>} accusations - Accusation history.
   */
  initializeState(accusations = []) {
    this.accusations = [...accusations];
  }

  /**
   * Submit a murder accusation.
   * @param {Object} accusation - Player's theory.
   * @param {string} accusation.murderer - Suspect ID.
   * @param {string} accusation.weapon - Evidence ID (murder weapon).
   * @param {string} accusation.method - Text description of the method.
   * @param {string} accusation.motive - Text description of the motive.
   * @param {string[]} accusation.evidence - Array of evidence IDs.
   * @returns {Object} Result of the accusation.
   */
  submitAccusation(accusation) {
    if (this.accusations.length >= this.MAX_ATTEMPTS) {
      return {
        success: false,
        error: "No accusation attempts remaining. The case remains cold.",
        attemptsRemaining: 0
      };
    }

    const solution = this.caseLoader.getSolution();
    if (!solution) {
      return {
        success: false,
        error: "Case solution not loaded.",
        attemptsRemaining: this.MAX_ATTEMPTS - this.accusations.length
      };
    }

    // Accusation fields checking
    const feedback = {
      murderer: false,
      weapon: false,
      method: false,
      motive: false,
      evidence: []
    };

    // 1. Validate murderer
    if (accusation.murderer === solution.murderer) {
      feedback.murderer = true;
    }

    // 2. Validate weapon
    if (accusation.weapon === solution.weapon) {
      feedback.weapon = true;
    }

    // 3. Validate method (semantic check fallback to fuzzy substring matching)
    const normalizedMethod = (accusation.method || '').toLowerCase().trim();
    const solutionMethods = Array.isArray(solution.method) ? solution.method : [solution.method];
    feedback.method = solutionMethods.some(solMethod => {
      const solLower = solMethod.toLowerCase();
      return normalizedMethod.includes(solLower) || solLower.includes(normalizedMethod) || this._similarity(normalizedMethod, solLower) > 0.6;
    });

    // 4. Validate motive
    const normalizedMotive = (accusation.motive || '').toLowerCase().trim();
    const solutionMotives = Array.isArray(solution.motive) ? solution.motive : [solution.motive];
    feedback.motive = solutionMotives.some(solMotive => {
      const solLower = solMotive.toLowerCase();
      return normalizedMotive.includes(solLower) || solLower.includes(normalizedMotive) || this._similarity(normalizedMotive, solLower) > 0.6;
    });

    // 5. Validate evidence
    const solutionEvidence = new Set(solution.requiredEvidence || []);
    const playerEvidence = accusation.evidence || [];
    let correctEvidenceCount = 0;
    
    playerEvidence.forEach(evId => {
      const isCorrect = solutionEvidence.has(evId);
      if (isCorrect) correctEvidenceCount++;
      feedback.evidence.push({ id: evId, correct: isCorrect });
    });

    // Determine completeness
    const totalRequiredEvCount = solutionEvidence.size;
    const evidenceScore = totalRequiredEvCount > 0 ? (correctEvidenceCount / totalRequiredEvCount) : 1;
    const isEvidenceCorrect = evidenceScore >= 0.8; // At least 80% of required evidence must be linked

    const isFullyCorrect = feedback.murderer && feedback.weapon && feedback.method && feedback.motive && isEvidenceCorrect;

    // Record the attempt
    const attempt = {
      timestamp: Date.now(),
      accusation,
      feedback,
      isFullyCorrect,
      accuracy: this._calculateAccuracyScore(feedback, evidenceScore)
    };

    this.accusations.push(attempt);
    this.eventBus.emit('state:change', { path: 'currentCase.accusations', value: this.accusations });

    const attemptsRemaining = this.MAX_ATTEMPTS - this.accusations.length;

    const result = {
      success: isFullyCorrect,
      feedback,
      accuracy: attempt.accuracy,
      attemptsRemaining,
      attemptNumber: this.accusations.length
    };

    if (isFullyCorrect) {
      this.eventBus.emit('deduction:solved', result);
    } else if (attemptsRemaining === 0) {
      this.eventBus.emit('deduction:failed', result);
    } else {
      this.eventBus.emit('deduction:incorrect', result);
    }

    return result;
  }

  /**
   * Get remaining attempts.
   * @returns {number}
   */
  getAttemptsRemaining() {
    return this.MAX_ATTEMPTS - this.accusations.length;
  }

  /**
   * Calculate string similarity score (0 to 1).
   * @private
   */
  _similarity(s1, s2) {
    let longer = s1;
    let shorter = s2;
    if (s1.length < s2.length) {
      longer = s2;
      shorter = s1;
    }
    const longerLength = longer.length;
    if (longerLength === 0) {
      return 1.0;
    }
    return (longerLength - this._editDistance(longer, shorter)) / parseFloat(longerLength);
  }

  /**
   * Levenshtein Distance calculation.
   * @private
   */
  _editDistance(s1, s2) {
    const costs = [];
    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else {
          if (j > 0) {
            let newValue = costs[j - 1];
            if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
              newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
            }
            costs[j - 1] = lastValue;
            lastValue = newValue;
          }
        }
      }
      if (i > 0) {
        costs[s2.length] = lastValue;
      }
    }
    return costs[s2.length];
  }

  /**
   * Calculate cumulative accuracy percentage.
   * @private
   */
  _calculateAccuracyScore(feedback, evidenceScore) {
    let score = 0;
    if (feedback.murderer) score += 30; // Murderer is critical
    if (feedback.weapon) score += 20;    // Weapon is highly critical
    if (feedback.method) score += 15;
    if (feedback.motive) score += 15;
    score += evidenceScore * 20;       // Evidence weight
    return Math.round(score);
  }

  /** Reset internal state */
  reset() {
    this.accusations = [];
  }
};
