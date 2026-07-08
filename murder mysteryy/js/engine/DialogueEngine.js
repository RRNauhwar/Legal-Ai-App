/**
 * NyayaSim - Dialogue Engine
 * Manages all suspect conversations, combining AI and scripted dialogue
 * @module DialogueEngine
 */

window.NyayaSim = window.NyayaSim || {};

window.NyayaSim.DialogueEngine = class DialogueEngine {
  /**
   * @param {Object} eventBus - EventBus instance
   */
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.scriptedDialogue = new NyayaSim.ScriptedDialogue(eventBus);
    this.personalityEngine = new NyayaSim.PersonalityEngine(eventBus);
    this.aiBridge = new NyayaSim.AIBridge(eventBus);
    
    /** @type {boolean} Whether to use AI for responses */
    this.useAI = false;
    /** @type {Object} Case suspects data */
    this.suspects = {};
    /** @type {Object} Conversation histories keyed by suspectId */
    this.histories = {};
    /** @type {string|null} Currently selected suspect */
    this.activeSuspectId = null;

    this._bindEvents();
  }

  /** Bind to relevant events */
  _bindEvents() {
    this.eventBus.on('interrogation:ask', (data) => this.handlePlayerMessage(data));
    this.eventBus.on('interrogation:showEvidence', (data) => this.handleEvidencePresentation(data));
    this.eventBus.on('interrogation:selectSuspect', (data) => this.selectSuspect(data.suspectId));
  }

  /**
   * Initialize dialogue system with case data
   * @param {Array} suspects - Suspect data array from case file
   * @param {Object} [aiConfig] - Optional AI configuration
   */
  initialize(suspects, aiConfig = null) {
    this.suspects = {};
    this.histories = {};

    suspects.forEach(suspect => {
      this.suspects[suspect.id] = suspect;
      this.histories[suspect.id] = [];
    });

    // Initialize sub-systems
    this.scriptedDialogue.loadDialogues(suspects);
    this.personalityEngine.loadSuspects(suspects);

    // Configure AI if provided
    if (aiConfig && aiConfig.apiKey) {
      this.aiBridge.configure(aiConfig);
      this.useAI = true;
    }

    if (suspects.length > 0) {
      this.activeSuspectId = suspects[0].id;
    }

    this.eventBus.emit('dialogue:initialized', {
      suspects: suspects.map(s => ({
        id: s.id,
        name: s.name,
        role: s.role,
        available: true
      }))
    });
  }

  /**
   * Select a suspect to talk to
   * @param {string} suspectId
   */
  selectSuspect(suspectId) {
    if (!this.suspects[suspectId]) return;
    
    this.activeSuspectId = suspectId;
    const history = this.histories[suspectId] || [];
    const state = this.personalityEngine.getEmotionalState(suspectId);
    const quickQuestions = this.scriptedDialogue.getQuickQuestions(suspectId, this._getContext());

    this.eventBus.emit('dialogue:suspectSelected', {
      suspectId,
      suspect: this.suspects[suspectId],
      history,
      emotionalState: state,
      quickQuestions
    });
  }

  /**
   * Handle a player message to the current suspect
   * @param {Object} data
   * @param {string} data.message - Player's question
   * @param {string} [data.suspectId] - Override suspect (defaults to active)
   */
  async handlePlayerMessage(data) {
    const suspectId = data.suspectId || this.activeSuspectId;
    if (!suspectId || !this.suspects[suspectId]) return;

    const suspect = this.suspects[suspectId];
    const message = data.message.trim();
    if (!message) return;

    // Record player message
    const playerMsg = {
      role: 'player',
      text: message,
      timestamp: Date.now()
    };
    
    if (!this.histories[suspectId]) this.histories[suspectId] = [];
    this.histories[suspectId].push(playerMsg);

    // Emit player message for UI
    this.eventBus.emit('dialogue:playerMessage', { suspectId, message: playerMsg });

    // Update personality for question type
    const interactionType = this._classifyInteraction(message);
    this.personalityEngine.processInteraction(suspectId, interactionType, {
      isInsightful: message.length > 50,
      isRepeat: this._isRepeatQuestion(suspectId, message)
    });

    // Show typing indicator
    this.eventBus.emit('dialogue:typing', { suspectId, isTyping: true });

    try {
      let response;

      if (this.useAI && this.aiBridge.isAvailable()) {
        response = await this._getAIResponse(suspectId, message);
      } else {
        // Simulate thinking delay for scripted responses
        await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));
        response = this.scriptedDialogue.getResponse(suspectId, message, this._getContext());
      }

      // Record suspect response
      const suspectMsg = {
        role: 'suspect',
        text: response.text || response.dialogue,
        emotion: response.emotion || 'neutral',
        timestamp: Date.now(),
        metadata: {
          type: response.type,
          revealsInfo: response.revealsInfo,
          contradiction: response.contradiction,
          isLying: response.isLying
        }
      };

      this.histories[suspectId].push(suspectMsg);

      // Stop typing indicator
      this.eventBus.emit('dialogue:typing', { suspectId, isTyping: false });

      // Emit response
      this.eventBus.emit('dialogue:suspectResponse', {
        suspectId,
        message: suspectMsg,
        emotionalState: this.personalityEngine.getEmotionalState(suspectId)
      });

      // Handle special events from response
      if (response.contradiction) {
        this.eventBus.emit('dialogue:contradictionDetected', {
          suspectId,
          contradiction: response.contradiction
        });
      }

      if (response.revealsInfo) {
        this.eventBus.emit('dialogue:infoRevealed', {
          suspectId,
          info: response.revealsInfo
        });
      }

    } catch (error) {
      console.error('[DialogueEngine] Response error:', error);
      this.eventBus.emit('dialogue:typing', { suspectId, isTyping: false });
      
      // Fallback to scripted
      const fallback = this.scriptedDialogue.getResponse(suspectId, message, this._getContext());
      const fallbackMsg = {
        role: 'suspect',
        text: fallback.text,
        emotion: fallback.emotion || 'nervous',
        timestamp: Date.now()
      };
      this.histories[suspectId].push(fallbackMsg);
      this.eventBus.emit('dialogue:suspectResponse', {
        suspectId,
        message: fallbackMsg,
        emotionalState: this.personalityEngine.getEmotionalState(suspectId)
      });
    }
  }

  /**
   * Handle evidence presentation to current suspect
   * @param {Object} data
   * @param {string} data.evidenceId
   * @param {string} [data.suspectId]
   */
  async handleEvidencePresentation(data) {
    const suspectId = data.suspectId || this.activeSuspectId;
    if (!suspectId) return;

    const evidence = data.evidence || { id: data.evidenceId, name: 'Evidence' };

    // Record evidence presentation
    const systemMsg = {
      role: 'system',
      text: `[Detective presents evidence: ${evidence.name}]`,
      timestamp: Date.now(),
      type: 'evidence_shown',
      evidenceId: data.evidenceId
    };
    
    if (!this.histories[suspectId]) this.histories[suspectId] = [];
    this.histories[suspectId].push(systemMsg);

    this.eventBus.emit('dialogue:evidencePresented', { suspectId, evidence });

    // Update personality
    this.personalityEngine.processInteraction(suspectId, 'evidence', {
      evidenceId: data.evidenceId,
      isIncriminating: evidence.linkedSuspects && evidence.linkedSuspects.includes(suspectId)
    });

    // Get reaction
    this.eventBus.emit('dialogue:typing', { suspectId, isTyping: true });
    
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
    
    const context = this._getContext();
    context.shownEvidenceId = data.evidenceId;
    
    const response = this.scriptedDialogue.getResponse(suspectId, `[showing evidence: ${evidence.name}]`, context);

    const suspectMsg = {
      role: 'suspect',
      text: response.text,
      emotion: response.emotion || 'nervous',
      timestamp: Date.now(),
      metadata: { type: 'evidence_reaction', evidenceId: data.evidenceId }
    };

    this.histories[suspectId].push(suspectMsg);
    
    this.eventBus.emit('dialogue:typing', { suspectId, isTyping: false });
    this.eventBus.emit('dialogue:suspectResponse', {
      suspectId,
      message: suspectMsg,
      emotionalState: this.personalityEngine.getEmotionalState(suspectId)
    });
  }

  /**
   * Get AI-powered response
   * @private
   */
  async _getAIResponse(suspectId, message) {
    const suspect = this.suspects[suspectId];
    const personalityState = this.personalityEngine.getSuspectState(suspectId);
    const context = this._getContext();

    const systemPrompt = NyayaSim.PromptBuilder.buildSuspectPrompt(suspect, personalityState, context);
    const messages = NyayaSim.PromptBuilder.condenseHistory(this.histories[suspectId]);
    
    // Add current message
    messages.push({ role: 'user', content: message });

    const response = await this.aiBridge.chat(systemPrompt, messages, {
      jsonMode: true,
      temperature: 0.8,
      maxTokens: 300
    });

    return {
      text: response.dialogue || response.text,
      emotion: response.emotion || 'neutral',
      revealsInfo: response.revealsInfo || false,
      isLying: response.isLying || false,
      type: 'ai_generated'
    };
  }

  /**
   * Classify the type of player interaction
   * @private
   */
  _classifyInteraction(message) {
    const lower = message.toLowerCase();
    
    if (lower.includes('you killed') || lower.includes('you did it') || lower.includes('murderer') || lower.includes('confess')) {
      return 'accusation';
    }
    if (lower.includes('understand') || lower.includes('must be hard') || lower.includes('sorry') || lower.includes('i believe')) {
      return 'empathy';
    }
    if (lower.includes('lying') || lower.includes('contradict') || lower.includes('doesn\'t match') || lower.includes('but you said')) {
      return 'contradiction';
    }
    if (lower.includes('better tell') || lower.includes('or else') || lower.includes('cooperate') || lower.includes('we know')) {
      return 'pressure';
    }
    return 'question';
  }

  /**
   * Check if this question has been asked before
   * @private
   */
  _isRepeatQuestion(suspectId, message) {
    const history = this.histories[suspectId] || [];
    const playerMessages = history.filter(h => h.role === 'player');
    
    return playerMessages.some(m => {
      const similarity = this._similarityScore(m.text.toLowerCase(), message.toLowerCase());
      return similarity > 0.7;
    });
  }

  /**
   * Simple similarity score between two strings
   * @private
   */
  _similarityScore(a, b) {
    const wordsA = new Set(a.split(/\s+/));
    const wordsB = new Set(b.split(/\s+/));
    const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
    const union = new Set([...wordsA, ...wordsB]);
    return intersection.size / union.size;
  }

  /**
   * Get current game context for dialogue
   * @private
   */
  _getContext() {
    return {
      discoveredEvidence: [],  // Will be populated by GameEngine
      shownEvidenceId: null,
      suspectState: this.activeSuspectId ? this.personalityEngine.getSuspectState(this.activeSuspectId) : null
    };
  }

  /**
   * Get conversation history for a suspect
   * @param {string} suspectId
   * @returns {Array}
   */
  getHistory(suspectId) {
    return this.histories[suspectId] || [];
  }

  /**
   * Get all suspect states
   * @returns {Object[]}
   */
  getSuspectStates() {
    return this.personalityEngine.getAllStates();
  }

  /**
   * Get quick questions for current suspect
   * @returns {string[]}
   */
  getQuickQuestions() {
    if (!this.activeSuspectId) return [];
    return this.scriptedDialogue.getQuickQuestions(this.activeSuspectId, this._getContext());
  }

  /** Reset everything */
  reset() {
    this.histories = {};
    this.suspects = {};
    this.activeSuspectId = null;
    this.scriptedDialogue.reset();
    this.personalityEngine.reset();
    this.aiBridge.clearCache();
  }
};
