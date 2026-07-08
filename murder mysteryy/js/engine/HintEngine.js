/**
 * @file HintEngine.js
 * @description Manages progressive hint generation and time-gating constraints.
 * @version 1.0.0
 */

window.NyayaSim = window.NyayaSim || {};

window.NyayaSim.HintEngine = class HintEngine {
  /**
   * Create a new HintEngine.
   * @param {Object} eventBus - EventBus instance.
   * @param {Object} caseLoader - CaseLoader instance.
   * @param {Object} stateManager - StateManager instance.
   */
  constructor(eventBus, caseLoader, stateManager) {
    this.eventBus = eventBus;
    this.caseLoader = caseLoader;
    this.stateManager = stateManager;

    /** Time delay between hints in milliseconds (e.g. 1 minute for faster debugging/testing, or 5 minutes for production) */
    this.HINT_TIME_GATE = 15000; // 15 seconds for fluid debugging, change to 300000 for 5 minutes if needed
  }

  /**
   * Request the next progressive hint.
   * @returns {Object} Hint evaluation details.
   */
  requestHint() {
    const caseData = this.caseLoader.getCurrentCase();
    if (!caseData) {
      return { success: false, message: "No case active." };
    }

    const hints = caseData.hints || [];
    if (hints.length === 0) {
      return { success: false, message: "No hints available for this case." };
    }

    const hintsUsed = this.stateManager.get('currentCase.hintsUsed') || 0;
    if (hintsUsed >= hints.length) {
      return {
        success: false,
        message: "You have unlocked all available hints for this case.",
        allUnlocked: true
      };
    }

    // Time gate validation
    const now = Date.now();
    const timestamps = this.stateManager.get('currentCase.hintTimestamps') || [];
    if (timestamps.length > 0) {
      const lastHintTime = timestamps[timestamps.length - 1];
      const elapsed = now - lastHintTime;
      if (elapsed < this.HINT_TIME_GATE) {
        const secondsRemaining = Math.ceil((this.HINT_TIME_GATE - elapsed) / 1000);
        return {
          success: false,
          timeLocked: true,
          message: `The forensic lab is still processing. Next hint available in ${secondsRemaining} seconds.`,
          secondsRemaining
        };
      }
    }

    // Grant hint
    const nextHintIndex = hintsUsed;
    const hint = hints[nextHintIndex];

    const nextHintsUsed = hintsUsed + 1;
    timestamps.push(now);

    this.stateManager.set('currentCase.hintsUsed', nextHintsUsed);
    this.stateManager.set('currentCase.hintTimestamps', timestamps);

    const result = {
      success: true,
      hint: typeof hint === 'string' ? hint : hint.text,
      tier: nextHintsUsed,
      totalAvailable: hints.length
    };

    this.eventBus.emit('hint:unlocked', result);

    return result;
  }

  /**
   * Get all hints unlocked so far.
   * @returns {string[]}
   */
  getUnlockedHints() {
    const caseData = this.caseLoader.getCurrentCase();
    if (!caseData || !caseData.hints) return [];

    const hintsUsed = this.stateManager.get('currentCase.hintsUsed') || 0;
    const hints = caseData.hints.slice(0, hintsUsed);
    
    return hints.map(h => typeof h === 'string' ? h : h.text);
  }
};
