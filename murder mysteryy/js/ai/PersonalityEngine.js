/**
 * NyayaSim - Personality Engine
 * Manages NPC emotional states, trust levels, and personality traits
 * @module PersonalityEngine
 */

window.NyayaSim = window.NyayaSim || {};

window.NyayaSim.PersonalityEngine = class PersonalityEngine {
  /** @type {Object} Suspect personality states keyed by suspectId */
  #suspects = {};

  /** Emotional states with transition rules */
  static EMOTIONS = {
    calm: { color: '#10b981', label: 'Calm' },
    nervous: { color: '#f59e0b', label: 'Nervous' },
    angry: { color: '#dc2626', label: 'Angry' },
    defensive: { color: '#8b5cf6', label: 'Defensive' },
    cooperative: { color: '#3b82f6', label: 'Cooperative' },
    scared: { color: '#f59e0b', label: 'Scared' },
    sad: { color: '#64748b', label: 'Sad' },
    confused: { color: '#06b6d4', label: 'Confused' },
    hostile: { color: '#dc2626', label: 'Hostile' },
    resigned: { color: '#475569', label: 'Resigned' }
  };

  /**
   * @param {Object} eventBus - EventBus instance
   */
  constructor(eventBus) {
    this.eventBus = eventBus;
  }

  /**
   * Initialize personality profiles from case data
   * @param {Array} suspects - Suspect data array from case file
   */
  loadSuspects(suspects) {
    this.#suspects = {};
    
    suspects.forEach(suspect => {
      this.#suspects[suspect.id] = {
        id: suspect.id,
        name: suspect.name,
        personality: suspect.personality || {},
        currentEmotion: suspect.initialEmotion || 'calm',
        previousEmotion: null,
        trustLevel: 0,          // -10 to 10
        suspicionLevel: 0,      // 0 to 10 (how suspicious player finds them)
        cooperationLevel: 5,    // 0 to 10
        interactionCount: 0,
        contradictionsFound: 0,
        evidenceShown: [],
        memoryLog: [],          // Key facts mentioned to this suspect
        isGuilty: suspect.isGuilty || false,
        traits: suspect.personality?.traits || [],
        secretRevealed: false,
        alibiChallenged: false,
        lastInteractionTime: null
      };
    });
  }

  /**
   * Get current emotional state of a suspect
   * @param {string} suspectId
   * @returns {Object} Emotional state
   */
  getEmotionalState(suspectId) {
    const state = this.#suspects[suspectId];
    if (!state) return { emotion: 'calm', ...PersonalityEngine.EMOTIONS.calm };
    
    return {
      emotion: state.currentEmotion,
      ...PersonalityEngine.EMOTIONS[state.currentEmotion],
      trustLevel: state.trustLevel,
      cooperationLevel: state.cooperationLevel,
      interactionCount: state.interactionCount
    };
  }

  /**
   * Process an interaction and update emotional state
   * @param {string} suspectId
   * @param {string} interactionType - Type: 'question', 'accusation', 'evidence', 'empathy', 'pressure'
   * @param {Object} context - Additional context
   * @returns {Object} Updated emotional state
   */
  processInteraction(suspectId, interactionType, context = {}) {
    const state = this.#suspects[suspectId];
    if (!state) return null;

    state.interactionCount++;
    state.lastInteractionTime = Date.now();

    switch (interactionType) {
      case 'question':
        this._handleQuestion(state, context);
        break;
      case 'accusation':
        this._handleAccusation(state, context);
        break;
      case 'evidence':
        this._handleEvidencePresentation(state, context);
        break;
      case 'empathy':
        this._handleEmpathy(state, context);
        break;
      case 'pressure':
        this._handlePressure(state, context);
        break;
      case 'contradiction':
        this._handleContradiction(state, context);
        break;
    }

    this.eventBus.emit('personality:stateChanged', {
      suspectId,
      emotion: state.currentEmotion,
      trustLevel: state.trustLevel,
      cooperationLevel: state.cooperationLevel
    });

    return this.getEmotionalState(suspectId);
  }

  /** @private Handle question interaction */
  _handleQuestion(state, context) {
    // Good questions build trust slightly
    if (context.isInsightful) {
      state.trustLevel = Math.min(10, state.trustLevel + 1);
      if (state.currentEmotion === 'defensive') {
        state.currentEmotion = 'nervous';
      }
    }
    
    // Repeated questions annoy
    if (context.isRepeat) {
      state.cooperationLevel = Math.max(0, state.cooperationLevel - 1);
      if (state.cooperationLevel < 3) {
        state.currentEmotion = 'annoyed';
      }
    }
  }

  /** @private Handle direct accusation */
  _handleAccusation(state, context) {
    state.trustLevel = Math.max(-10, state.trustLevel - 3);
    
    if (state.isGuilty) {
      // Guilty suspects become defensive/scared
      state.currentEmotion = state.interactionCount > 5 ? 'scared' : 'defensive';
      state.cooperationLevel = Math.max(0, state.cooperationLevel - 2);
    } else {
      // Innocent suspects become angry
      state.currentEmotion = 'angry';
      state.cooperationLevel = Math.max(0, state.cooperationLevel - 3);
    }
  }

  /** @private Handle evidence presentation */
  _handleEvidencePresentation(state, context) {
    const evidenceId = context.evidenceId;
    if (evidenceId && !state.evidenceShown.includes(evidenceId)) {
      state.evidenceShown.push(evidenceId);
    }

    if (context.isIncriminating) {
      if (state.isGuilty) {
        state.currentEmotion = 'nervous';
        state.cooperationLevel = Math.max(0, state.cooperationLevel - 1);
        // If enough evidence shown, suspect becomes scared
        if (state.evidenceShown.length >= 3) {
          state.currentEmotion = 'scared';
        }
      } else {
        // Innocent suspect is confused by incriminating evidence
        state.currentEmotion = 'confused';
        state.trustLevel = Math.min(10, state.trustLevel + 1); // They try to help
      }
    }
  }

  /** @private Handle empathetic approach */
  _handleEmpathy(state, context) {
    state.trustLevel = Math.min(10, state.trustLevel + 2);
    state.cooperationLevel = Math.min(10, state.cooperationLevel + 1);
    
    if (state.trustLevel > 3) {
      state.currentEmotion = 'cooperative';
    } else if (state.currentEmotion === 'angry') {
      state.currentEmotion = 'defensive';
    }
  }

  /** @private Handle pressure tactics */
  _handlePressure(state, context) {
    state.trustLevel = Math.max(-10, state.trustLevel - 1);
    
    if (state.isGuilty && state.trustLevel < -3) {
      state.currentEmotion = 'scared';
    } else if (!state.isGuilty) {
      state.currentEmotion = state.interactionCount > 3 ? 'hostile' : 'angry';
    } else {
      state.currentEmotion = 'defensive';
    }
  }

  /** @private Handle contradiction discovery */
  _handleContradiction(state, context) {
    state.contradictionsFound++;
    
    if (state.isGuilty) {
      state.currentEmotion = 'nervous';
      state.cooperationLevel = Math.max(0, state.cooperationLevel - 2);
      
      if (state.contradictionsFound >= 3) {
        state.currentEmotion = 'scared';
      }
    } else {
      // Innocent person caught in inconsistency tries to explain
      state.currentEmotion = 'confused';
    }

    this.eventBus.emit('personality:contradictionFound', {
      suspectId: state.id,
      contradictionCount: state.contradictionsFound
    });
  }

  /**
   * Check if suspect is willing to reveal information
   * @param {string} suspectId
   * @param {string} infoType - Type of info requested
   * @returns {boolean}
   */
  willRevealInfo(suspectId, infoType) {
    const state = this.#suspects[suspectId];
    if (!state) return false;

    // High trust = more willing
    if (state.trustLevel >= 5) return true;
    
    // Scared/resigned suspects may reveal
    if (['scared', 'resigned'].includes(state.currentEmotion) && state.isGuilty) {
      return state.contradictionsFound >= 2;
    }

    // Cooperative emotion helps
    if (state.currentEmotion === 'cooperative') return true;

    return false;
  }

  /**
   * Get all suspect states for display
   * @returns {Object[]}
   */
  getAllStates() {
    return Object.values(this.#suspects).map(s => ({
      id: s.id,
      name: s.name,
      emotion: s.currentEmotion,
      emotionData: PersonalityEngine.EMOTIONS[s.currentEmotion],
      trustLevel: s.trustLevel,
      cooperationLevel: s.cooperationLevel,
      contradictionsFound: s.contradictionsFound,
      interactionCount: s.interactionCount,
      evidenceShownCount: s.evidenceShown.length
    }));
  }

  /**
   * Get a specific suspect's full state
   * @param {string} suspectId
   * @returns {Object|null}
   */
  getSuspectState(suspectId) {
    return this.#suspects[suspectId] || null;
  }

  /** Reset all states */
  reset() {
    this.#suspects = {};
  }
};
