/**
 * NyayaSim - Scripted Dialogue System
 * Fallback dialogue system using pre-written dialogue trees
 * @module ScriptedDialogue
 */

window.NyayaSim = window.NyayaSim || {};

window.NyayaSim.ScriptedDialogue = class ScriptedDialogue {
  /**
   * @param {Object} eventBus - EventBus instance
   */
  constructor(eventBus) {
    this.eventBus = eventBus;
    /** @type {Object} Loaded dialogue trees keyed by suspectId */
    this.dialogueTrees = {};
    /** @type {Object} Conversation history keyed by suspectId */
    this.conversationHistory = {};
    /** @type {Object} Current node per suspect */
    this.currentNodes = {};
  }

  /**
   * Load dialogue trees from case data
   * @param {Object} suspects - Array of suspect data with dialogue trees
   */
  loadDialogues(suspects) {
    this.dialogueTrees = {};
    this.conversationHistory = {};
    this.currentNodes = {};
    
    if (!suspects) return;
    
    suspects.forEach(suspect => {
      if (suspect.dialogueTree) {
        this.dialogueTrees[suspect.id] = suspect.dialogueTree;
        this.conversationHistory[suspect.id] = [];
        this.currentNodes[suspect.id] = suspect.dialogueTree.startNode || 'greeting';
      }
    });
  }

  /**
   * Get a response from a suspect based on player input
   * @param {string} suspectId - The suspect to talk to
   * @param {string} playerMessage - What the player said
   * @param {Object} context - Current game context
   * @param {string[]} context.discoveredEvidence - Evidence IDs the player has found
   * @param {string|null} context.shownEvidenceId - Evidence being presented
   * @param {Object} context.suspectState - Suspect's current emotional/trust state
   * @returns {Object} Response object with text, emotion, and metadata
   */
  getResponse(suspectId, playerMessage, context = {}) {
    const tree = this.dialogueTrees[suspectId];
    if (!tree) {
      return this._defaultResponse(suspectId);
    }

    const history = this.conversationHistory[suspectId] || [];
    const lowerMessage = playerMessage.toLowerCase();

    // Record player message
    history.push({ role: 'player', text: playerMessage, timestamp: Date.now() });

    let response;

    // Priority 1: Evidence presentation
    if (context.shownEvidenceId && tree.evidenceReactions) {
      response = this._getEvidenceReaction(tree, context.shownEvidenceId, context);
    }

    // Priority 2: Keyword matching against dialogue nodes
    if (!response && tree.nodes) {
      response = this._matchKeywords(tree, lowerMessage, context);
    }

    // Priority 3: Topic matching
    if (!response && tree.topics) {
      response = this._matchTopic(tree, lowerMessage, context);
    }

    // Priority 4: Fallback responses
    if (!response) {
      response = this._getFallbackResponse(tree, history.length, context);
    }

    // Record response
    history.push({ role: 'suspect', text: response.text, emotion: response.emotion, timestamp: Date.now() });
    this.conversationHistory[suspectId] = history;

    return response;
  }

  /**
   * Match against evidence reactions
   * @private
   */
  _getEvidenceReaction(tree, evidenceId, context) {
    const reactions = tree.evidenceReactions;
    if (!reactions || !reactions[evidenceId]) {
      return {
        text: "I... I don't know what that is. Where did you get that?",
        emotion: 'nervous',
        type: 'evidence_reaction',
        evidenceId
      };
    }

    const reaction = reactions[evidenceId];
    // Some reactions have conditions
    if (reaction.conditions) {
      const meetsConditions = reaction.conditions.every(cond => {
        if (cond.hasEvidence) {
          return context.discoveredEvidence && context.discoveredEvidence.includes(cond.hasEvidence);
        }
        return true;
      });
      if (!meetsConditions && reaction.defaultResponse) {
        return {
          text: reaction.defaultResponse,
          emotion: reaction.defaultEmotion || 'neutral',
          type: 'evidence_reaction',
          evidenceId
        };
      }
    }

    return {
      text: reaction.text || reaction.response,
      emotion: reaction.emotion || 'nervous',
      type: 'evidence_reaction',
      evidenceId,
      revealsInfo: reaction.revealsInfo || null,
      contradiction: reaction.contradiction || null
    };
  }

  /**
   * Match player message against keyword-triggered nodes
   * @private
   */
  _matchKeywords(tree, lowerMessage, context) {
    const nodes = tree.nodes;
    let bestMatch = null;
    let bestScore = 0;

    for (const [nodeId, node] of Object.entries(nodes)) {
      if (!node.keywords) continue;

      let score = 0;
      for (const keyword of node.keywords) {
        if (lowerMessage.includes(keyword.toLowerCase())) {
          score += keyword.length; // Longer matches score higher
        }
      }

      // Check conditions
      if (score > 0 && node.conditions) {
        const meetsConditions = node.conditions.every(cond => {
          if (cond.hasEvidence) {
            return context.discoveredEvidence && context.discoveredEvidence.includes(cond.hasEvidence);
          }
          if (cond.previousNode) {
            return this.currentNodes[tree.suspectId] === cond.previousNode;
          }
          return true;
        });
        if (!meetsConditions) score = 0;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = node;
      }
    }

    if (bestMatch) {
      // Pick a random response if multiple are available
      const responses = bestMatch.responses || [bestMatch.response || bestMatch.text];
      const text = responses[Math.floor(Math.random() * responses.length)];
      
      return {
        text,
        emotion: bestMatch.emotion || 'neutral',
        type: 'keyword_match',
        nodeId: bestMatch.id,
        revealsInfo: bestMatch.revealsInfo || null,
        contradiction: bestMatch.contradiction || null,
        trustChange: bestMatch.trustChange || 0
      };
    }

    return null;
  }

  /**
   * Match against broader topics
   * @private
   */
  _matchTopic(tree, lowerMessage, context) {
    const topics = tree.topics;
    
    const topicKeywords = {
      alibi: ['where were you', 'alibi', 'that night', 'what time', 'where you were', 'monday night', 'evening'],
      relationship: ['relationship', 'know the victim', 'know rohan', 'friends', 'how long', 'knew him', 'knew her'],
      motive: ['why would', 'motive', 'reason', 'benefit', 'gain', 'money', 'inheritance'],
      accusation: ['did you kill', 'murderer', 'you killed', 'guilty', 'confess', 'admit'],
      general: ['tell me', 'what happened', 'what do you know', 'anything else', 'help me']
    };

    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(kw => lowerMessage.includes(kw))) {
        if (topics && topics[topic]) {
          const topicData = topics[topic];
          const responses = Array.isArray(topicData) ? topicData : [topicData];
          const response = responses[Math.floor(Math.random() * responses.length)];
          
          return {
            text: typeof response === 'string' ? response : response.text,
            emotion: typeof response === 'string' ? 'neutral' : (response.emotion || 'neutral'),
            type: 'topic_match',
            topic,
            revealsInfo: typeof response === 'object' ? response.revealsInfo : null
          };
        }
      }
    }

    return null;
  }

  /**
   * Get a fallback response when no match is found
   * @private
   */
  _getFallbackResponse(tree, conversationLength, context) {
    const fallbacks = tree.fallbacks || [
      { text: "I've already told you everything I know.", emotion: 'annoyed' },
      { text: "I don't understand what you're asking.", emotion: 'confused' },
      { text: "Can we move on? I have nothing more to say about that.", emotion: 'defensive' },
      { text: "Look, I'm cooperating. But you need to ask the right questions.", emotion: 'frustrated' },
      { text: "I... I'd rather not discuss that.", emotion: 'nervous' },
      { text: "Why do you keep asking me these things? Talk to someone else.", emotion: 'angry' }
    ];

    // Escalate defensiveness as conversation goes on
    const index = Math.min(Math.floor(conversationLength / 3), fallbacks.length - 1);
    const fallback = fallbacks[index];

    return {
      text: typeof fallback === 'string' ? fallback : fallback.text,
      emotion: typeof fallback === 'string' ? 'neutral' : (fallback.emotion || 'neutral'),
      type: 'fallback'
    };
  }

  /**
   * Default response for unknown suspects
   * @private
   */
  _defaultResponse(suspectId) {
    return {
      text: "I have nothing to say right now.",
      emotion: 'neutral',
      type: 'default'
    };
  }

  /**
   * Get conversation history for a suspect
   * @param {string} suspectId
   * @returns {Array} Conversation history
   */
  getHistory(suspectId) {
    return this.conversationHistory[suspectId] || [];
  }

  /**
   * Get available quick questions for a suspect based on context
   * @param {string} suspectId
   * @param {Object} context
   * @returns {string[]} Suggested questions
   */
  getQuickQuestions(suspectId, context = {}) {
    const tree = this.dialogueTrees[suspectId];
    if (!tree || !tree.quickQuestions) {
      return [
        "Where were you on the night of the murder?",
        "What is your relationship with the victim?",
        "Did you notice anything unusual recently?",
        "Is there anyone who would want to hurt the victim?",
        "Do you have anyone who can verify your alibi?"
      ];
    }

    // Filter questions based on what's been discovered
    return tree.quickQuestions.filter(q => {
      if (q.condition) {
        if (q.condition.hasEvidence) {
          return context.discoveredEvidence && context.discoveredEvidence.includes(q.condition.hasEvidence);
        }
      }
      return true;
    }).map(q => typeof q === 'string' ? q : q.text);
  }

  /**
   * Reset all conversation state
   */
  reset() {
    this.dialogueTrees = {};
    this.conversationHistory = {};
    this.currentNodes = {};
  }
};
