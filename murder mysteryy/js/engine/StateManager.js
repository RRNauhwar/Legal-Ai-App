/**
 * @file StateManager.js
 * @description Centralized game state management for NyayaSim.
 * Handles state persistence via localStorage, dot-notation path access,
 * multiple save slots, auto-save, and state import/export.
 * @version 1.0.0
 */

window.NyayaSim = window.NyayaSim || {};

window.NyayaSim.StateManager = class StateManager {

  /**
   * Default state schema for a new game.
   * @type {Object}
   * @readonly
   */
  static get DEFAULT_STATE() {
    return {
      player: {
        name: '',
        rank: 'Rookie Detective',
        casesCompleted: 0,
        totalScore: 0,
        achievements: []
      },
      currentCase: {
        caseId: null,
        phase: 'MENU',
        startTime: null,
        elapsedTime: 0,
        discoveredEvidence: [],
        examinedObjects: [],
        interviewedSuspects: [],
        hintsUsed: 0,
        hintTimestamps: [],
        accusations: [],
        notes: [],
        visitedScenes: []
      },
      settings: {
        musicVolume: 0.7,
        sfxVolume: 0.8,
        textSpeed: 'normal',
        autoSave: true,
        theme: 'dark'
      },
      meta: {
        version: '1.0.0',
        lastSaved: null,
        totalPlayTime: 0
      }
    };
  }

  /**
   * Create a new StateManager.
   *
   * @param {Object} [config={}] - Configuration options.
   * @param {number} [config.autoSaveInterval=60000] - Auto-save interval in ms (default 60s).
   * @param {number} [config.maxSlots=5] - Maximum number of save slots.
   * @param {string} [config.storagePrefix='nyayasim_'] - localStorage key prefix.
   * @param {EventBus} [config.eventBus=null] - EventBus instance for state change notifications.
   */
  constructor(config = {}) {
    /** @type {number} */
    this.autoSaveInterval = config.autoSaveInterval || 60000;

    /** @type {number} */
    this.maxSlots = config.maxSlots || 5;

    /** @type {string} */
    this.storagePrefix = config.storagePrefix || 'nyayasim_';

    /** @type {EventBus|null} */
    this.eventBus = config.eventBus || null;

    /** @type {Object} The current in-memory game state. */
    this._state = this._deepClone(StateManager.DEFAULT_STATE);

    /** @type {number|null} Auto-save timer ID. */
    this._autoSaveTimer = null;
  }

  // ─── Path-based State Access ─────────────────────────────────────────

  /**
   * Get a value from the state using dot-notation path.
   *
   * @param {string} path - Dot-separated path (e.g. 'player.name', 'currentCase.discoveredEvidence').
   * @returns {*} The value at the path, or undefined if not found.
   *
   * @example
   * const name = stateManager.get('player.name');
   * const evidence = stateManager.get('currentCase.discoveredEvidence');
   */
  get(path) {
    if (!path || typeof path !== 'string') {
      return this._deepClone(this._state);
    }

    const keys = path.split('.');
    let current = this._state;

    for (const key of keys) {
      if (current == null || typeof current !== 'object') {
        return undefined;
      }
      current = current[key];
    }

    // Return a deep clone for objects/arrays to prevent external mutation
    if (typeof current === 'object' && current !== null) {
      return this._deepClone(current);
    }

    return current;
  }

  /**
   * Set a value in the state using dot-notation path.
   * Emits 'state:changed' event via EventBus if available.
   *
   * @param {string} path - Dot-separated path (e.g. 'player.name').
   * @param {*} value - The value to set.
   * @returns {void}
   * @throws {Error} If the path is invalid.
   *
   * @example
   * stateManager.set('player.name', 'Detective Sharma');
   * stateManager.set('currentCase.phase', 'INVESTIGATION');
   */
  set(path, value) {
    if (!path || typeof path !== 'string') {
      throw new Error('StateManager.set: path must be a non-empty string.');
    }

    const keys = path.split('.');
    let current = this._state;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (current[key] == null || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    const finalKey = keys[keys.length - 1];
    const oldValue = current[finalKey];
    current[finalKey] = value;

    // Emit change event
    if (this.eventBus) {
      this.eventBus.emit('state:changed', {
        path,
        oldValue,
        newValue: value
      });
    }
  }

  // ─── Persistence ─────────────────────────────────────────────────────

  /**
   * Save the current state to a localStorage slot.
   *
   * @param {number} [slotIndex=0] - The save slot index (0-based).
   * @returns {boolean} True if saved successfully.
   * @throws {RangeError} If slot index is out of range.
   *
   * @example
   * stateManager.save(0); // Save to slot 0
   */
  save(slotIndex = 0) {
    if (slotIndex < 0 || slotIndex >= this.maxSlots) {
      throw new RangeError(`StateManager.save: slot index must be 0-${this.maxSlots - 1}.`);
    }

    try {
      this._state.meta.lastSaved = new Date().toISOString();

      const key = `${this.storagePrefix}save_${slotIndex}`;
      const serialized = JSON.stringify(this._state);
      localStorage.setItem(key, serialized);

      // Save slot metadata separately for quick listing
      const metaKey = `${this.storagePrefix}slot_meta_${slotIndex}`;
      const slotMeta = {
        slotIndex,
        playerName: this._state.player.name || 'Unknown',
        caseId: this._state.currentCase.caseId,
        phase: this._state.currentCase.phase,
        lastSaved: this._state.meta.lastSaved,
        playTime: this._state.meta.totalPlayTime,
        version: this._state.meta.version
      };
      localStorage.setItem(metaKey, JSON.stringify(slotMeta));

      if (this.eventBus) {
        this.eventBus.emit('state:saved', { slotIndex });
      }

      return true;
    } catch (err) {
      console.error('StateManager.save: Failed to save state:', err);
      return false;
    }
  }

  /**
   * Load state from a localStorage slot.
   * Missing fields are filled with defaults via deep merge.
   *
   * @param {number} [slotIndex=0] - The save slot index to load.
   * @returns {boolean} True if loaded successfully.
   *
   * @example
   * if (stateManager.load(0)) {
   *   console.log('Game loaded from slot 0');
   * }
   */
  load(slotIndex = 0) {
    if (slotIndex < 0 || slotIndex >= this.maxSlots) {
      console.error(`StateManager.load: slot index must be 0-${this.maxSlots - 1}.`);
      return false;
    }

    try {
      const key = `${this.storagePrefix}save_${slotIndex}`;
      const serialized = localStorage.getItem(key);

      if (!serialized) {
        console.warn(`StateManager.load: No save data found in slot ${slotIndex}.`);
        return false;
      }

      const savedState = JSON.parse(serialized);
      // Merge with defaults so any newly added fields are present
      this._state = this._deepMerge(this._deepClone(StateManager.DEFAULT_STATE), savedState);

      if (this.eventBus) {
        this.eventBus.emit('state:loaded', { slotIndex });
      }

      return true;
    } catch (err) {
      console.error('StateManager.load: Failed to load state:', err);
      return false;
    }
  }

  /**
   * Get metadata for all save slots.
   *
   * @returns {Array<Object|null>} Array of slot metadata objects (null for empty slots).
   *
   * @example
   * const slots = stateManager.getSaveSlots();
   * slots.forEach((slot, i) => {
   *   if (slot) console.log(`Slot ${i}: ${slot.playerName} - ${slot.phase}`);
   * });
   */
  getSaveSlots() {
    const slots = [];

    for (let i = 0; i < this.maxSlots; i++) {
      try {
        const metaKey = `${this.storagePrefix}slot_meta_${i}`;
        const raw = localStorage.getItem(metaKey);
        slots.push(raw ? JSON.parse(raw) : null);
      } catch (err) {
        console.error(`StateManager.getSaveSlots: Error reading slot ${i}:`, err);
        slots.push(null);
      }
    }

    return slots;
  }

  /**
   * Delete a save slot from localStorage.
   *
   * @param {number} slotIndex - The slot to delete.
   * @returns {boolean} True if the slot was deleted.
   */
  deleteSave(slotIndex) {
    if (slotIndex < 0 || slotIndex >= this.maxSlots) {
      return false;
    }

    try {
      localStorage.removeItem(`${this.storagePrefix}save_${slotIndex}`);
      localStorage.removeItem(`${this.storagePrefix}slot_meta_${slotIndex}`);

      if (this.eventBus) {
        this.eventBus.emit('state:deleted', { slotIndex });
      }

      return true;
    } catch (err) {
      console.error('StateManager.deleteSave: Failed to delete slot:', err);
      return false;
    }
  }

  // ─── State Lifecycle ─────────────────────────────────────────────────

  /**
   * Reset state to defaults. Does NOT clear localStorage.
   *
   * @returns {void}
   */
  reset() {
    this._state = this._deepClone(StateManager.DEFAULT_STATE);

    if (this.eventBus) {
      this.eventBus.emit('state:reset');
    }
  }

  /**
   * Reset only the current case state while preserving player profile and settings.
   *
   * @returns {void}
   */
  resetCase() {
    this._state.currentCase = this._deepClone(StateManager.DEFAULT_STATE.currentCase);

    if (this.eventBus) {
      this.eventBus.emit('state:caseReset');
    }
  }

  // ─── Auto-Save ───────────────────────────────────────────────────────

  /**
   * Start auto-saving at the configured interval.
   *
   * @param {number} [interval] - Override interval in ms.
   * @returns {void}
   */
  startAutoSave(interval) {
    this.stopAutoSave();

    const ms = interval || this.autoSaveInterval;

    this._autoSaveTimer = setInterval(() => {
      if (this._state.settings.autoSave) {
        this.save(0);
      }
    }, ms);
  }

  /**
   * Stop auto-saving.
   *
   * @returns {void}
   */
  stopAutoSave() {
    if (this._autoSaveTimer !== null) {
      clearInterval(this._autoSaveTimer);
      this._autoSaveTimer = null;
    }
  }

  // ─── Import / Export ─────────────────────────────────────────────────

  /**
   * Export the current state as a JSON string.
   *
   * @returns {string} JSON representation of the full state.
   */
  exportState() {
    return JSON.stringify(this._state, null, 2);
  }

  /**
   * Import state from a JSON string.
   *
   * @param {string} json - JSON string of a valid game state.
   * @returns {boolean} True if import succeeded.
   * @throws {SyntaxError} If JSON is malformed.
   */
  importState(json) {
    try {
      const imported = JSON.parse(json);

      // Basic validation: ensure it has the top-level keys
      const requiredKeys = ['player', 'currentCase', 'settings', 'meta'];
      for (const key of requiredKeys) {
        if (!(key in imported)) {
          console.error(`StateManager.importState: Missing required key "${key}".`);
          return false;
        }
      }

      this._state = this._deepMerge(this._deepClone(StateManager.DEFAULT_STATE), imported);

      if (this.eventBus) {
        this.eventBus.emit('state:imported');
      }

      return true;
    } catch (err) {
      console.error('StateManager.importState: Failed to import state:', err);
      return false;
    }
  }

  // ─── Internal Helpers ────────────────────────────────────────────────

  /**
   * Create a deep clone of a value using structured clone or JSON fallback.
   *
   * @param {*} obj - The value to clone.
   * @returns {*} A deep clone of the value.
   * @private
   */
  _deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;

    try {
      return structuredClone(obj);
    } catch {
      return JSON.parse(JSON.stringify(obj));
    }
  }

  /**
   * Deep merge source into target. Arrays in source replace target arrays.
   *
   * @param {Object} target - The target object (will be mutated).
   * @param {Object} source - The source object to merge from.
   * @returns {Object} The merged target object.
   * @private
   */
  _deepMerge(target, source) {
    if (!source || typeof source !== 'object') return target;
    if (!target || typeof target !== 'object') return this._deepClone(source);

    for (const key of Object.keys(source)) {
      const sourceVal = source[key];
      const targetVal = target[key];

      if (
        sourceVal && typeof sourceVal === 'object' && !Array.isArray(sourceVal) &&
        targetVal && typeof targetVal === 'object' && !Array.isArray(targetVal)
      ) {
        target[key] = this._deepMerge(targetVal, sourceVal);
      } else {
        target[key] = this._deepClone(sourceVal);
      }
    }

    return target;
  }
};
