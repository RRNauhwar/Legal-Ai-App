/**
 * @file app.js
 * @description Application bootstrap. Orchestrates GameEngine, ScreenManager, 
 * UI views, and global page action elements.
 * @version 1.0.0
 */

window.NyayaSim = window.NyayaSim || {};

class App {
  constructor() {
    this.gameEngine = new window.NyayaSim.GameEngine();
    
    // UI Helpers
    this.modal = new window.NyayaSim.Modal(document.getElementById('modal-overlay'), this.gameEngine.eventBus);
    this.toast = new window.NyayaSim.Toast(document.getElementById('toast-container'), this.gameEngine.eventBus);
    
    this.screenManager = new window.NyayaSim.ScreenManager(
      document.getElementById('app'),
      this.gameEngine.eventBus
    );

    // Screen Views
    this.crimeSceneUI = new window.NyayaSim.CrimeSceneUI(
      document.getElementById('crime-scene-container'),
      this.gameEngine.eventBus
    );
    this.notebookUI = new window.NyayaSim.NotebookUI(
      document.getElementById('notebook-container'),
      this.gameEngine.eventBus
    );
    this.interrogationUI = new window.NyayaSim.InterrogationUI(
      document.getElementById('interrogation-container'),
      this.gameEngine.eventBus
    );
    this.evidenceBoardUI = new window.NyayaSim.EvidenceBoardUI(
      document.getElementById('evidence-board-container'),
      this.gameEngine.eventBus
    );
    this.forensicsUI = new window.NyayaSim.ForensicsUI(
      document.getElementById('forensics-container'),
      this.gameEngine.eventBus
    );
    this.puzzleUI = new window.NyayaSim.PuzzleUI(
      document.getElementById('puzzles-container'),
      this.gameEngine.eventBus
    );

    // Procedural Audio
    this.audio = new window.NyayaSim.AudioManager();

    this._bindEvents();
    this._setupGlobalUI();
  }

  /**
   * Initialize app logic.
   */
  async start() {
    this._setupRainBackground();
    
    // Resume/initialize Web Audio context upon first user click
    const unlockAudio = () => {
      this.audio.init();
      this.audio.startAmbientRain();
      document.removeEventListener('click', unlockAudio);
    };
    document.addEventListener('click', unlockAudio);

    await this.gameEngine.init();
  }

  /**
   * Bind event listeners.
   * @private
   */
  _bindEvents() {
    // Engine events linking to screens
    this.gameEngine.eventBus.on('phase:changed', (data) => {
      this._handlePhaseChange(data.phase);
    });

    this.gameEngine.eventBus.on('timer:tick', (data) => {
      const display = document.getElementById('timer-display');
      if (display) {
        const hrs = String(Math.floor(data.elapsed / 3600)).padStart(2, '0');
        const mins = String(Math.floor((data.elapsed % 3600) / 60)).padStart(2, '0');
        const secs = String(data.elapsed % 60).padStart(2, '0');
        display.innerText = `${hrs}:${mins}:${secs}`;
      }
    });

    this.gameEngine.eventBus.on('state:change', (data) => {
      if (data.path === 'currentCase.discoveredEvidence') {
        const total = this.gameEngine.caseLoader.getCurrentCase()?.evidence?.length || 15;
        document.getElementById('evidence-count').innerText = `${data.value.length}/${total}`;
      }
    });

    this.gameEngine.eventBus.on('game:caseSolved', (data) => {
      this.audio.playNotificationChime();
      this._showCaseSuccessScreen(data);
    });

    this.gameEngine.eventBus.on('game:caseFailed', (data) => {
      this.audio.playFailureBuzz();
      this._showCaseFailedScreen(data);
    });

    this.gameEngine.eventBus.on('game:incorrectAccusation', (data) => {
      this.audio.playFailureBuzz();
      this.toast.show('Accusation Incorrect', `Accuracy score: ${data.accuracy}%. Try another deduction path.`, 'warning');
      document.getElementById('attempts-remaining').innerText = data.attemptsRemaining;
    });

    // Keyboard mechanical key sound feedback during interrogation typing
    this.gameEngine.eventBus.on('dialogue:typing', (data) => {
      if (data.isTyping) {
        // Repeated keypress sounds
        this.typingInterval = setInterval(() => {
          this.audio.playTypeSound();
        }, 120 + Math.random() * 80);
      } else if (this.typingInterval) {
        clearInterval(this.typingInterval);
        this.typingInterval = null;
      }
    });

    this.gameEngine.eventBus.on('hint:unlocked', (data) => {
      this.modal.show('Forensic Hint Unlocked', `<p class="text-secondary" style="font-size: var(--text-md); line-height: 1.6;">${data.hint}</p>`, [
        { text: 'Acknowledge Details', callback: () => this.modal.hide(), type: 'primary' }
      ]);
    });
  }

  /**
   * Connect phase transitions to screen visibilities.
   * @private
   */
  _handlePhaseChange(phase) {
    if (phase === 'MENU') {
      this.screenManager.navigateTo('menu');
      
      // Toggle Continue state
      const currentCase = this.gameEngine.stateManager.get('currentCase.caseId');
      document.getElementById('btn-continue').style.display = currentCase ? 'flex' : 'none';

    } else if (phase === 'CASE_SELECT') {
      this.screenManager.navigateTo('case-select');
      this._renderCaseGrid();

    } else if (phase === 'BRIEFING') {
      this.screenManager.navigateTo('briefing');
      this._renderBriefingScreen();

    } else if (phase === 'RESULTS') {
      this.screenManager.navigateTo('results');

    } else {
      // In-game views inside game screen
      this.screenManager.navigateTo('game');
      this._switchGameTab(phase.toLowerCase().replace('_', '-'));
    }
  }

  /**
   * Bind static UI action controls (menus, settings, navigations).
   * @private
   */
  _setupGlobalUI() {
    // Menu Buttons
    document.getElementById('btn-new-game').addEventListener('click', () => {
      this.gameEngine.setPhase('CASE_SELECT');
    });

    document.getElementById('btn-continue').addEventListener('click', () => {
      const id = this.gameEngine.stateManager.get('currentCase.caseId');
      if (id) this.gameEngine.resumeCase(id);
    });

    document.getElementById('btn-case-files').addEventListener('click', () => {
      this.gameEngine.setPhase('CASE_SELECT');
    });

    document.getElementById('btn-back-menu').addEventListener('click', () => {
      this.gameEngine.setPhase('MENU');
    });

    // In-game sidebar tab switching
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    sidebarItems.forEach(item => {
      item.addEventListener('click', () => {
        const view = item.getAttribute('data-view');
        
        sidebarItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');

        this._switchGameTab(view);
      });
    });

    // Hints
    document.getElementById('btn-hint').addEventListener('click', () => {
      const res = this.gameEngine.hintEngine.requestHint();
      if (!res.success) {
        this.toast.show('Forensic Processing', res.message, 'warning');
      }
    });

    // Accusation triggering
    const accModal = document.getElementById('accusation-overlay');
    document.getElementById('btn-accuse').addEventListener('click', () => {
      this._populateAccusationDropdowns();
      accModal.className = 'modal-overlay active';
    });

    document.getElementById('accusation-close').addEventListener('click', () => {
      accModal.className = 'modal-overlay';
    });
    document.getElementById('acc-cancel').addEventListener('click', () => {
      accModal.className = 'modal-overlay';
    });

    document.getElementById('acc-submit').addEventListener('click', () => {
      const murderer = document.getElementById('acc-murderer').value;
      const weapon = document.getElementById('acc-weapon').value;
      const method = document.getElementById('acc-method').value;
      const motive = document.getElementById('acc-motive').value;
      
      const checkBoxes = document.querySelectorAll('#acc-evidence input:checked');
      const evidence = Array.from(checkBoxes).map(box => box.value);

      if (!murderer || !weapon || !method || !motive) {
        this.toast.show('Missing Accusation Details', 'You must fill in all fields before accusing suspects.', 'warning');
        return;
      }

      this.gameEngine.deductionEngine.submitAccusation({
        murderer, weapon, method, motive, evidence
      });
      accModal.className = 'modal-overlay';
    });

    // Settings Configuration
    document.getElementById('btn-settings').addEventListener('click', () => this._showSettingsModal());
    document.getElementById('btn-game-settings').addEventListener('click', () => this._showSettingsModal());
  }

  /**
   * Switch the visible panel tab inside game screen.
   * @private
   */
  _switchGameTab(viewId) {
    const views = document.querySelectorAll('.view');
    views.forEach(v => v.classList.remove('active'));

    const activeView = document.getElementById(`view-${viewId}`);
    if (activeView) activeView.classList.add('active');

    // Trigger subcomponent render/update on show
    if (viewId === 'crime-scene' && this.gameEngine.investigationEngine.activeSceneId) {
      this.gameEngine.investigationEngine.loadScene(this.gameEngine.investigationEngine.activeSceneId);
    } else if (viewId === 'notebook') {
      this.notebookUI.render();
    } else if (viewId === 'interrogation' && this.gameEngine.dialogueEngine.activeSuspectId) {
      this.gameEngine.dialogueEngine.selectSuspect(this.gameEngine.dialogueEngine.activeSuspectId);
    } else if (viewId === 'evidence-board') {
      this.evidenceBoardUI.render();
    } else if (viewId === 'forensics') {
      this.forensicsUI.render();
    } else if (viewId === 'puzzles') {
      this.puzzleUI.render();
    }
  }

  /**
   * Renders the Case select screen catalogue cards.
   * @private
   */
  _renderCaseGrid() {
    const grid = document.getElementById('case-grid');
    grid.innerHTML = '';

    const casesCompleted = this.gameEngine.stateManager.get('player.casesCompleted') || 0;

    const cases = [
      { id: 'case-01-silent-roommate', title: 'The Silent Roommate', level: 1, desc: 'A university student is found dead in their shared apartment. Staged break-in suspected.', locked: false },
      { id: 'case-02-inheritance-game', title: 'The Inheritance Game', level: 2, desc: 'Wealthy patriarch Devraj Singhania is found dead in his study the morning after changing his will.', locked: casesCompleted < 1 }
    ];

    cases.forEach(c => {
      const card = document.createElement('div');
      card.className = `case-card ${c.locked ? 'locked' : ''}`;
      card.innerHTML = `
        <div class="case-card-number">0${c.level}</div>
        <div class="case-card-level">
          <span class="badge ${c.locked ? 'badge-crimson' : 'badge-amber'}">${c.locked ? 'Locked' : 'Available'}</span>
        </div>
        <div class="case-card-title">${c.title}</div>
        <div class="case-card-desc">${c.desc}</div>
        <div class="case-card-meta">
          <span>🕒 30-45 mins</span>
          <span>🔍 ${c.level === 1 ? '15 clues' : '1 clue'}</span>
        </div>
      `;
      if (!c.locked) {
        card.addEventListener('click', () => {
          this.gameEngine.startCase(c.id);
        });
      }
      grid.appendChild(card);
    });
  }

  /**
   * Renders briefing files.
   * @private
   */
  _renderBriefingScreen() {
    const container = document.getElementById('briefing-container');
    const caseData = this.gameEngine.caseLoader.getCurrentCase();
    if (!caseData) return;

    container.innerHTML = `
      <div class="briefing-file slide-in-up">
        <div class="briefing-file-header">
          <div class="briefing-file-label">⚠️ CASE INITIATION</div>
          <div class="briefing-classified">CLASSIFIED</div>
        </div>
        <div class="briefing-file-body">
          <h2 class="briefing-case-title">${caseData.title}</h2>
          <div class="briefing-case-subtitle">Location: ${caseData.caseInfo?.setting?.locale || 'Pune locale'}</div>
          <p class="briefing-text">${caseData.description || caseData.synopsis}</p>
          
          <div class="briefing-details">
            <div class="briefing-detail">
              <div class="briefing-detail-label">VICTIM</div>
              <div class="briefing-detail-value">${caseData.victim?.name || 'Rohan Kapoor'}</div>
            </div>
            <div class="briefing-detail">
              <div class="briefing-detail-label">ESTIMATED TIME</div>
              <div class="briefing-detail-value">30-45 MINUTES</div>
            </div>
          </div>
          
          <div class="briefing-actions">
            <button class="btn btn-primary" id="btn-briefing-start">Accept Assignment</button>
          </div>
        </div>
      </div>
    `;

    container.querySelector('#btn-briefing-start').addEventListener('click', () => {
      // Set active scene first
      if (caseData.scenes && caseData.scenes.length > 0) {
        this.gameEngine.investigationEngine.loadScene(caseData.scenes[0].id);
      }
      this.gameEngine.setPhase('INVESTIGATION');
    });
  }

  /**
   * Setup floating background rain effect particles.
   * @private
   */
  _setupRainBackground() {
    const container = document.getElementById('rain-container');
    if (!container) return;

    for (let i = 0; i < 40; i++) {
      const drop = document.createElement('div');
      drop.className = 'raindrop';
      drop.style.left = `${Math.random() * 100}vw`;
      drop.style.animationDuration = `${0.5 + Math.random() * 0.8}s`;
      drop.style.animationDelay = `${Math.random() * 2}s`;
      drop.style.height = `${10 + Math.random() * 20}px`;
      container.appendChild(drop);
    }
  }

  /**
   * Populate dropdown boxes on accusation modal.
   * @private
   */
  _populateAccusationDropdowns() {
    const caseData = this.gameEngine.caseLoader.getCurrentCase();
    const discovered = this.gameEngine.stateManager.get('currentCase.discoveredEvidence') || [];

    const murdererSelect = document.getElementById('acc-murderer');
    murdererSelect.innerHTML = '<option value="">Select suspect...</option>';
    (caseData?.suspects || []).forEach(s => {
      murdererSelect.innerHTML += `<option value="${s.id}">${s.name}</option>`;
    });

    const weaponSelect = document.getElementById('acc-weapon');
    weaponSelect.innerHTML = '<option value="">Select evidence...</option>';
    (caseData?.evidence || []).forEach(e => {
      if (discovered.includes(e.id)) {
        weaponSelect.innerHTML += `<option value="${e.id}">${e.name}</option>`;
      }
    });

    const checkGrid = document.getElementById('acc-evidence');
    checkGrid.innerHTML = '';
    (caseData?.evidence || []).forEach(e => {
      if (discovered.includes(e.id)) {
        checkGrid.innerHTML += `
          <label style="display: flex; align-items: center; gap: 6px; padding: 6px 12px; background: var(--bg-surface); border-radius: 4px; cursor: pointer;">
            <input type="checkbox" value="${e.id}">
            <span style="font-size: var(--text-xs); color: var(--text-secondary);">${e.name}</span>
          </label>
        `;
      }
    });

    const attemptsRemaining = this.gameEngine.deductionEngine.getAttemptsRemaining();
    document.getElementById('attempts-remaining').innerText = attemptsRemaining;
  }

  /**
   * Display case success screen details.
   * @private
   */
  _showCaseSuccessScreen(data) {
    const container = document.getElementById('results-container');
    container.innerHTML = `
      <div class="results-grade grade-${data.evalResult.grade.toLowerCase()}">${data.evalResult.grade}</div>
      <h2 class="results-title">CASE SOLVED PERFECTLY</h2>
      <p class="results-subtitle">You have successfully uncovered the truth. Arjun Mehta has been taken into custody.</p>
      
      <div class="results-stats">
        <div class="results-stat">
          <div class="results-stat-value">${data.evalResult.score}</div>
          <div class="results-stat-label">Final Score</div>
        </div>
        <div class="results-stat">
          <div class="results-stat-value">${data.evalResult.breakdown.minutesElapsed}m</div>
          <div class="results-stat-label">Time Taken</div>
        </div>
        <div class="results-stat">
          <div class="results-stat-value">${data.evalResult.breakdown.hintsPenalty / 1000}</div>
          <div class="results-stat-label">Hints Used</div>
        </div>
      </div>
      
      <div class="results-actions">
        <button class="btn btn-primary" id="btn-results-menu">Return to Menu</button>
      </div>
    `;

    container.querySelector('#btn-results-menu').addEventListener('click', () => {
      this.gameEngine.setPhase('MENU');
    });
  }

  /**
   * Display case failure screen details.
   * @private
   */
  _showCaseFailedScreen(data) {
    const container = document.getElementById('results-container');
    container.innerHTML = `
      <div class="results-grade grade-f">F</div>
      <h2 class="results-title">CASE CLOSED UNRESOLVED</h2>
      <p class="results-subtitle">The suspect got away. The investigation attempts were exhausted.</p>
      
      <div class="results-actions">
        <button class="btn btn-danger" id="btn-results-failed-menu">Return to Menu</button>
      </div>
    `;

    container.querySelector('#btn-results-failed-menu').addEventListener('click', () => {
      this.gameEngine.setPhase('MENU');
    });
  }

  /**
   * Display settings controls popup modal.
   * @private
   */
  _showSettingsModal() {
    this.modal.show('Settings', `
      <div class="flex flex-col gap-4">
        <div class="input-group">
          <label class="input-label">Gemini API Key (Interrogation Mode)</label>
          <input type="password" class="input" id="settings-api-key" placeholder="Enter Gemini Key..." value="${this.gameEngine.dialogueEngine.aiBridge.apiKey || ''}" style="background: var(--bg-secondary); padding: 12px 16px;">
        </div>
        <div style="font-size: var(--text-xs); color: var(--text-muted); line-height: 1.4;">
          Leave key blank to use the local scripted dialogue trees. Entering a key unlocks fully dynamic interrogation dialogue powered by Gemini.
        </div>
      </div>
    `, [
      { text: 'Cancel', callback: () => this.modal.hide(), type: 'ghost' },
      { text: 'Save Configuration', callback: () => {
        const key = document.getElementById('settings-api-key').value.trim();
        this.gameEngine.dialogueEngine.aiBridge.configure({ apiKey: key });
        this.gameEngine.dialogueEngine.useAI = !!key;
        this.modal.hide();
        this.toast.show('Settings Saved', key ? 'Gemini AI mode activated!' : 'Scripted dialogue mode active.', 'info');
      }, type: 'primary' }
    ]);
  }
}

// Instantiate on load
window.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  window.NyayaSim.appInstance = app;
  app.start().then(() => {
    // Hide loading screen
    document.getElementById('screen-loading').classList.remove('active');
  });
});
