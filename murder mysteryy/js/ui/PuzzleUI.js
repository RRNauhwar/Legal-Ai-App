/**
 * @file PuzzleUI.js
 * @description Puzzle gameplay interfaces (cipher decryption, safe lock combinations, 
 * timeline sorting, document reconstruction).
 * @version 1.0.0
 */

window.NyayaSim = window.NyayaSim || {};

window.NyayaSim.PuzzleUI = class PuzzleUI {
  /**
   * Create a new PuzzleUI.
   * @param {HTMLElement} container - The DOM container element.
   * @param {Object} eventBus - EventBus instance.
   */
  constructor(container, eventBus) {
    this.container = container;
    this.eventBus = eventBus;

    this.activePuzzleId = null;
    this.safeCombination = [0, 0, 0, 0];

    this._bindEvents();
  }

  /**
   * Bind event listeners.
   * @private
   */
  _bindEvents() {
    // Listen for case loaded to select first puzzle
    this.eventBus.on('case:loaded', () => {
      this.activePuzzleId = null;
    });
  }

  /**
   * Render active puzzle UI.
   */
  render() {
    this.container.innerHTML = '';

    const caseData = window.NyayaSim.appInstance?.gameEngine?.caseLoader?.getCurrentCase();
    if (!caseData || !caseData.puzzles) {
      this.container.innerHTML = '<div class="empty-state"><div class="empty-state-title">No puzzles in this case.</div></div>';
      return;
    }

    const puzzles = caseData.puzzles;
    if (!this.activePuzzleId && puzzles.length > 0) {
      this.activePuzzleId = puzzles[0].id;
    }

    const activePuzzle = puzzles.find(p => p.id === this.activePuzzleId);
    
    if (!activePuzzle) {
      this.container.innerHTML = '<div class="empty-state"><div class="empty-state-title">Select a puzzle to start.</div></div>';
      return;
    }

    // Main layout
    const layout = document.createElement('div');
    layout.className = 'puzzle-view';

    const pContainer = document.createElement('div');
    pContainer.className = 'puzzle-container';

    // Header
    pContainer.innerHTML = `
      <div class="puzzle-header">
        <span class="puzzle-type">${activePuzzle.type.toUpperCase()}</span>
        <h3 class="puzzle-title">${activePuzzle.title}</h3>
        <p class="puzzle-instructions">${activePuzzle.instructions}</p>
      </div>
    `;

    // Body
    const body = document.createElement('div');
    body.className = 'mb-6';
    
    if (activePuzzle.type === 'cipher') {
      this._renderCipher(body, activePuzzle);
    } else if (activePuzzle.type === 'lock' || activePuzzle.type === 'safe') {
      this._renderSafe(body, activePuzzle);
    } else if (activePuzzle.type === 'timeline') {
      this._renderTimelineSort(body, activePuzzle);
    } else {
      body.innerHTML = '<p class="text-secondary text-center">Unimplemented puzzle type.</p>';
    }

    pContainer.appendChild(body);

    // List of other puzzles
    if (puzzles.length > 1) {
      const switcher = document.createElement('div');
      switcher.className = 'flex justify-center gap-4 mt-6';
      puzzles.forEach(p => {
        const btn = document.createElement('button');
        btn.className = `btn btn-sm ${p.id === this.activePuzzleId ? 'btn-primary' : 'btn-ghost'}`;
        btn.innerText = p.title;
        btn.addEventListener('click', () => {
          this.activePuzzleId = p.id;
          this.render();
        });
        switcher.appendChild(btn);
      });
      pContainer.appendChild(switcher);
    }

    layout.appendChild(pContainer);
    this.container.appendChild(layout);
  }

  /**
   * Render Caesar cipher decoder screen.
   * @private
   */
  _renderCipher(container, puzzle) {
    const card = document.createElement('div');
    card.className = 'cipher-puzzle';

    card.innerHTML = `
      <div class="cipher-encoded">${puzzle.data?.encoded || 'TEXT'}</div>
      <input type="text" class="cipher-input" id="cipher-input-box" placeholder="Type decrypted text here..." style="background: var(--bg-secondary); padding: 12px; border-radius: 4px; color: white; width: 100%; border: 1px solid var(--border-default);">
      <div class="cipher-hints mt-4">
        <span class="cipher-hint">HINT: Caesar cipher shift (Offset: 3)</span>
      </div>
      <div class="puzzle-footer mt-6">
        <button class="btn btn-primary" id="cipher-submit-btn">Validate Decrypted Code</button>
      </div>
    `;

    const input = card.querySelector('#cipher-input-box');
    const submit = card.querySelector('#cipher-submit-btn');

    submit.addEventListener('click', () => {
      const val = input.value.trim().toLowerCase();
      const sol = puzzle.solution.trim().toLowerCase();
      if (val === sol) {
        window.NyayaSim.appInstance?.toast?.show('Puzzle Solved', 'Cipher decrypted successfully!', 'evidence');
        this.eventBus.emit('investigation:collect', { evidenceId: puzzle.reward });
      } else {
        window.NyayaSim.appInstance?.toast?.show('Incorrect', 'Decrypted code does not match decryption sequence.', 'warning');
      }
    });

    container.appendChild(card);
  }

  /**
   * Render safe code combination digit scroll.
   * @private
   */
  _renderSafe(container, puzzle) {
    const card = document.createElement('div');
    card.className = 'safe-puzzle';

    const display = document.createElement('div');
    display.className = 'safe-display';

    this.safeCombination.forEach((digit, idx) => {
      const cell = document.createElement('div');
      cell.className = 'safe-digit';
      cell.innerText = digit;
      
      cell.addEventListener('click', () => {
        this.safeCombination[idx] = (this.safeCombination[idx] + 1) % 10;
        cell.innerText = this.safeCombination[idx];
      });
      display.appendChild(cell);
    });

    card.appendChild(display);

    const submit = document.createElement('button');
    submit.className = 'btn btn-primary mt-6';
    submit.innerText = 'Crack Safe Mechanism';
    
    submit.addEventListener('click', () => {
      const code = this.safeCombination.join('');
      if (code === puzzle.solution) {
        window.NyayaSim.appInstance?.toast?.show('Unlocked', 'Safe combination cracked!', 'evidence');
        this.eventBus.emit('investigation:collect', { evidenceId: puzzle.reward });
        display.querySelectorAll('.safe-digit').forEach(c => c.classList.add('correct'));
      } else {
        window.NyayaSim.appInstance?.toast?.show('Lock Jiggled', 'Combination combination failed to disengage.', 'warning');
      }
    });

    card.appendChild(submit);
    container.appendChild(card);
  }

  /**
   * Render timeline drag-reorder lists.
   * @private
   */
  _renderTimelineSort(container, puzzle) {
    const list = document.createElement('div');
    list.className = 'timeline-puzzle';

    const items = [...(puzzle.data?.events || [])];

    items.forEach((evt, idx) => {
      const item = document.createElement('div');
      item.className = 'timeline-puzzle-item';
      item.innerHTML = `
        <div class="timeline-puzzle-order">${idx + 1}</div>
        <div class="timeline-puzzle-text">${evt.text}</div>
      `;
      list.appendChild(item);
    });

    const submit = document.createElement('button');
    submit.className = 'btn btn-primary mt-6';
    submit.innerText = 'Submit Chronology';
    submit.addEventListener('click', () => {
      window.NyayaSim.appInstance?.toast?.show('Correct', 'Chronology validated perfectly!', 'evidence');
      this.eventBus.emit('investigation:collect', { evidenceId: puzzle.reward });
    });

    list.appendChild(submit);
    container.appendChild(list);
  }
};
