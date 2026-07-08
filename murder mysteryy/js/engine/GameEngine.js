/**
 * @file GameEngine.js
 * @description Central orchestration engine for NyayaSim. Coordinates state,
 * loaders, and individual subsystem engines.
 * @version 1.0.0
 */

window.NyayaSim = window.NyayaSim || {};

window.NyayaSim.GameEngine = class GameEngine {
  constructor() {
    this.eventBus = new window.NyayaSim.EventBus();
    this.stateManager = new window.NyayaSim.StateManager({ eventBus: this.eventBus });
    this.caseLoader = new window.NyayaSim.CaseLoader({ basePath: 'cases/', eventBus: this.eventBus });
    this.investigationEngine = new window.NyayaSim.InvestigationEngine(this.eventBus, this.caseLoader);
    this.dialogueEngine = new window.NyayaSim.DialogueEngine(this.eventBus);
    this.deductionEngine = new window.NyayaSim.DeductionEngine(this.eventBus, this.caseLoader);
    this.scoringEngine = new window.NyayaSim.ScoringEngine(this.eventBus, this.stateManager);
    this.hintEngine = new window.NyayaSim.HintEngine(this.eventBus, this.caseLoader, this.stateManager);

    /** @type {number|null} Interval ID for the active game session timer */
    this.timerInterval = null;

    this._bindEvents();
  }

  /**
   * Initialize state manager and bind global app events.
   */
  async init() {
    this.stateManager.load('default');
    
    // Check if there is an active suspended game
    const currentCaseId = this.stateManager.get('currentCase.caseId');
    const phase = this.stateManager.get('currentCase.phase') || 'MENU';
    
    if (currentCaseId && phase !== 'MENU') {
      try {
        await this.resumeCase(currentCaseId);
      } catch (err) {
        console.error("Failed to resume saved case. Falling back to Menu.", err);
        this.setPhase('MENU');
      }
    } else {
      this.setPhase('MENU');
    }
  }

  /**
   * Bind event listeners.
   * @private
   */
  _bindEvents() {
    this.eventBus.on('state:change', (data) => {
      this.stateManager.set(data.path, data.value);
    });

    this.eventBus.on('deduction:solved', (data) => this.handleCaseSolved(data));
    this.eventBus.on('deduction:failed', (data) => this.handleCaseFailed(data));
    this.eventBus.on('deduction:incorrect', (data) => this.handleIncorrectAccusation(data));
  }

  /**
   * Set the current game phase/screen.
   * @param {string} phase
   */
  setPhase(phase) {
    this.stateManager.set('currentCase.phase', phase);
    this.eventBus.emit('phase:changed', { phase });

    if (phase === 'INVESTIGATION' || phase === 'INTERROGATION' || phase === 'FORENSICS' || phase === 'EVIDENCE_BOARD') {
      this.startTimer();
    } else {
      this.stopTimer();
    }
  }

  /**
   * Start a new case.
   * @param {string} caseId
   */
  async startCase(caseId) {
    this.eventBus.emit('game:loading', { message: 'Loading case files...' });
    
    try {
      const caseData = await this.caseLoader.loadCase(caseId);
      
      // Initialize new case state
      this.stateManager.set('currentCase.caseId', caseId);
      this.stateManager.set('currentCase.startTime', Date.now());
      this.stateManager.set('currentCase.elapsedTime', 0);
      this.stateManager.set('currentCase.discoveredEvidence', []);
      this.stateManager.set('currentCase.examinedObjects', []);
      this.stateManager.set('currentCase.interviewedSuspects', []);
      this.stateManager.set('currentCase.visitedScenes', []);
      this.stateManager.set('currentCase.hintsUsed', 0);
      this.stateManager.set('currentCase.hintTimestamps', []);
      this.stateManager.set('currentCase.accusations', []);
      this.stateManager.set('currentCase.notes', []);

      this.investigationEngine.initializeState();
      this.deductionEngine.initializeState();
      this.dialogueEngine.initialize(caseData.suspects);

      // Save initial state immediately
      this.stateManager.save('default');

      // Go to Briefing first
      this.setPhase('BRIEFING');
    } catch (err) {
      console.error("GameEngine failed to start case:", err);
      this.eventBus.emit('game:error', { message: `Failed to load case: ${err.message}` });
    }
  }

  /**
   * Resume an existing save slot case.
   * @param {string} caseId
   */
  async resumeCase(caseId) {
    this.eventBus.emit('game:loading', { message: 'Resuming investigation...' });

    const caseData = await this.caseLoader.loadCase(caseId);

    const discovered = this.stateManager.get('currentCase.discoveredEvidence') || [];
    const examined = this.stateManager.get('currentCase.examinedObjects') || [];
    const visited = this.stateManager.get('currentCase.visitedScenes') || [];
    const accusations = this.stateManager.get('currentCase.accusations') || [];

    this.investigationEngine.initializeState(discovered, examined, visited);
    this.deductionEngine.initializeState(accusations);
    this.dialogueEngine.initialize(caseData.suspects);

    // Restore dialogue histories from state if saved previously
    const currentPhase = this.stateManager.get('currentCase.phase') || 'INVESTIGATION';
    this.setPhase(currentPhase);
  }

  /**
   * Start the timer tracking elapsed seconds.
   */
  startTimer() {
    if (this.timerInterval) return;

    this.timerInterval = setInterval(() => {
      let elapsed = this.stateManager.get('currentCase.elapsedTime') || 0;
      elapsed++;
      this.stateManager.set('currentCase.elapsedTime', elapsed);
      this.eventBus.emit('timer:tick', { elapsed });
    }, 1000);
  }

  /**
   * Stop the active timer.
   */
  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  /**
   * Handle correct accusation.
   */
  handleCaseSolved(result) {
    this.stopTimer();
    const caseData = this.caseLoader.getCurrentCase();
    const caseState = this.stateManager.get('currentCase');

    const evalResult = this.scoringEngine.evaluateCase(caseData, caseState);

    // Update player profile
    let completedCount = this.stateManager.get('player.casesCompleted') || 0;
    completedCount++;
    this.stateManager.set('player.casesCompleted', completedCount);

    let totalScore = this.stateManager.get('player.totalScore') || 0;
    totalScore += evalResult.score;
    this.stateManager.set('player.totalScore', totalScore);

    this.stateManager.set('currentCase.phase', 'RESULTS');
    this.stateManager.save('default');

    this.eventBus.emit('game:caseSolved', {
      evalResult,
      accusationResult: result,
      solution: caseData.solution
    });
  }

  /**
   * Handle out of attempts accusation failure.
   */
  handleCaseFailed(result) {
    this.stopTimer();
    const caseData = this.caseLoader.getCurrentCase();
    
    this.stateManager.set('currentCase.phase', 'RESULTS');
    this.stateManager.save('default');

    this.eventBus.emit('game:caseFailed', {
      accusationResult: result,
      solution: caseData.solution
    });
  }

  /**
   * Handle incorrect accusation but attempts remain.
   */
  handleIncorrectAccusation(result) {
    this.eventBus.emit('game:incorrectAccusation', result);
  }
};
