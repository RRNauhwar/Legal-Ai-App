/**
 * @file CaseLoader.js
 * @description Loads, validates, caches, and provides lookup helpers for NyayaSim case data.
 * Case files are JSON documents describing a murder mystery: victim, suspects, scenes,
 * evidence, solution, and hints.
 * @version 1.0.0
 */

window.NyayaSim = window.NyayaSim || {};

window.NyayaSim.CaseLoader = class CaseLoader {

  /**
   * Create a new CaseLoader.
   *
   * @param {Object} [config={}] - Configuration options.
   * @param {string} [config.basePath='data/cases/'] - Base URL path for case JSON files.
   * @param {EventBus} [config.eventBus=null] - EventBus instance for notifications.
   */
  constructor(config = {}) {
    /** @type {string} */
    this.basePath = config.basePath || 'data/cases/';

    /** @type {EventBus|null} */
    this.eventBus = config.eventBus || null;

    /**
     * Cache of loaded case data keyed by caseId.
     * @type {Map<string, Object>}
     * @private
     */
    this._cache = new Map();

    /**
     * The currently active/loaded case.
     * @type {Object|null}
     * @private
     */
    this._currentCase = null;
  }

  // ─── Loading ─────────────────────────────────────────────────────────

  /**
   * Load and parse a case JSON file by its ID.
   * Returns cached data if previously loaded.
   *
   * @param {string} caseId - Unique identifier of the case (used as filename).
   * @returns {Promise<Object>} The parsed and validated case data.
   * @throws {Error} If fetching fails or validation finds critical errors.
   *
   * @example
   * const caseData = await caseLoader.loadCase('mansion_murder');
   * console.log(caseData.title); // "Murder at Ravenwood Manor"
   */
  async loadCase(caseId) {
    if (!caseId || typeof caseId !== 'string') {
      throw new Error('CaseLoader.loadCase: caseId must be a non-empty string.');
    }

    // Check cache first
    if (this._cache.has(caseId)) {
      this._currentCase = this._cache.get(caseId);
      if (this.eventBus) {
        this.eventBus.emit('case:loaded', { caseId, fromCache: true });
      }
      return this._currentCase;
    }

    // Fetch the case file
    const url = `${this.basePath}${caseId}.json`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const caseData = await response.json();

      // Validate structure
      const validation = this.validateCase(caseData);
      if (!validation.valid) {
        const errorMsg = `Case "${caseId}" validation failed:\n  - ${validation.errors.join('\n  - ')}`;
        console.error(errorMsg);
        throw new Error(errorMsg);
      }

      // Cache and set as current
      this._cache.set(caseId, caseData);
      this._currentCase = caseData;

      if (this.eventBus) {
        this.eventBus.emit('case:loaded', { caseId, fromCache: false });
      }

      return caseData;
    } catch (err) {
      const error = new Error(`CaseLoader.loadCase: Failed to load case "${caseId}" from ${url}: ${err.message}`);
      console.error(error.message);

      if (this.eventBus) {
        this.eventBus.emit('case:loadError', { caseId, error: err.message });
      }

      throw error;
    }
  }

  // ─── Validation ──────────────────────────────────────────────────────

  /**
   * Validate a case data object against the required schema.
   *
   * @param {Object} caseData - The case data object to validate.
   * @returns {{ valid: boolean, errors: string[] }} Validation result.
   *
   * @example
   * const result = caseLoader.validateCase(myCaseData);
   * if (!result.valid) {
   *   console.error('Errors:', result.errors);
   * }
   */
  validateCase(caseData) {
    /** @type {string[]} */
    const errors = [];

    if (!caseData || typeof caseData !== 'object') {
      return { valid: false, errors: ['Case data must be a non-null object.'] };
    }

    // ── Top-level required fields ──
    const requiredStrings = ['id', 'title', 'description', 'briefing'];
    for (const field of requiredStrings) {
      if (!caseData[field] || typeof caseData[field] !== 'string') {
        errors.push(`Missing or invalid top-level field: "${field}" (expected non-empty string).`);
      }
    }

    // Difficulty
    if (typeof caseData.difficulty !== 'number' || caseData.difficulty < 1 || caseData.difficulty > 5) {
      errors.push('Field "difficulty" must be a number between 1 and 5.');
    }

    // ── Victim ──
    if (!caseData.victim || typeof caseData.victim !== 'object') {
      errors.push('Missing required object: "victim".');
    } else {
      const victimFields = ['name', 'age', 'occupation', 'causeOfDeath', 'timeOfDeath', 'location'];
      for (const field of victimFields) {
        if (caseData.victim[field] == null) {
          errors.push(`Missing victim field: "victim.${field}".`);
        }
      }
    }

    // ── Suspects ──
    if (!Array.isArray(caseData.suspects) || caseData.suspects.length === 0) {
      errors.push('Field "suspects" must be a non-empty array.');
    } else {
      const suspectFields = ['id', 'name', 'relationship', 'alibi', 'motive'];
      let guiltyCount = 0;

      caseData.suspects.forEach((suspect, i) => {
        for (const field of suspectFields) {
          if (suspect[field] == null) {
            errors.push(`Missing field "suspects[${i}].${field}" (suspect: ${suspect.name || suspect.id || i}).`);
          }
        }
        if (suspect.isGuilty === true) guiltyCount++;
      });

      if (guiltyCount === 0) {
        errors.push('At least one suspect must have "isGuilty: true".');
      }
    }

    // ── Scenes ──
    if (!Array.isArray(caseData.scenes) || caseData.scenes.length === 0) {
      errors.push('Field "scenes" must be a non-empty array.');
    } else {
      caseData.scenes.forEach((scene, i) => {
        if (!scene.id || !scene.name) {
          errors.push(`Scene at index ${i} is missing "id" or "name".`);
        }
        if (!Array.isArray(scene.objects)) {
          errors.push(`Scene "${scene.id || i}" is missing "objects" array.`);
        }
      });
    }

    // ── Evidence ──
    if (!Array.isArray(caseData.evidence) || caseData.evidence.length === 0) {
      errors.push('Field "evidence" must be a non-empty array.');
    } else {
      caseData.evidence.forEach((ev, i) => {
        if (!ev.id || !ev.name) {
          errors.push(`Evidence at index ${i} is missing "id" or "name".`);
        }
      });
    }

    // ── Solution ──
    if (!caseData.solution || typeof caseData.solution !== 'object') {
      errors.push('Missing required object: "solution".');
    } else {
      const solutionFields = ['murderer', 'weapon', 'method', 'motive'];
      for (const field of solutionFields) {
        if (!caseData.solution[field]) {
          errors.push(`Missing solution field: "solution.${field}".`);
        }
      }
    }

    // ── Hints (optional but validate if present) ──
    if (caseData.hints && !Array.isArray(caseData.hints)) {
      errors.push('Field "hints" must be an array if present.');
    }

    // ── Time limit (optional) ──
    if (caseData.timeLimit != null && (typeof caseData.timeLimit !== 'number' || caseData.timeLimit <= 0)) {
      errors.push('Field "timeLimit" must be a positive number (in minutes) if present.');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // ─── Lookup Helpers ──────────────────────────────────────────────────

  /**
   * Get a specific scene by ID from the currently loaded case.
   *
   * @param {string} sceneId - The scene's unique identifier.
   * @returns {Object|null} The scene object, or null if not found.
   */
  getScene(sceneId) {
    if (!this._currentCase || !this._currentCase.scenes) return null;
    return this._currentCase.scenes.find(s => s.id === sceneId) || null;
  }

  /**
   * Get a specific suspect by ID from the currently loaded case.
   *
   * @param {string} suspectId - The suspect's unique identifier.
   * @returns {Object|null} The suspect object, or null if not found.
   */
  getSuspect(suspectId) {
    if (!this._currentCase || !this._currentCase.suspects) return null;
    return this._currentCase.suspects.find(s => s.id === suspectId) || null;
  }

  /**
   * Get a specific piece of evidence by ID from the currently loaded case.
   *
   * @param {string} evidenceId - The evidence's unique identifier.
   * @returns {Object|null} The evidence object, or null if not found.
   */
  getEvidence(evidenceId) {
    if (!this._currentCase || !this._currentCase.evidence) return null;
    return this._currentCase.evidence.find(e => e.id === evidenceId) || null;
  }

  /**
   * Get all scenes in the currently loaded case.
   *
   * @returns {Object[]} Array of scene objects (empty if no case loaded).
   */
  getAllScenes() {
    if (!this._currentCase || !this._currentCase.scenes) return [];
    return [...this._currentCase.scenes];
  }

  /**
   * Get all suspects in the currently loaded case.
   *
   * @returns {Object[]} Array of suspect objects (empty if no case loaded).
   */
  getAllSuspects() {
    if (!this._currentCase || !this._currentCase.suspects) return [];
    return [...this._currentCase.suspects];
  }

  /**
   * Get all evidence in the currently loaded case.
   *
   * @returns {Object[]} Array of evidence objects (empty if no case loaded).
   */
  getAllEvidence() {
    if (!this._currentCase || !this._currentCase.evidence) return [];
    return [...this._currentCase.evidence];
  }

  /**
   * Get scenes that are currently unlocked based on the player's discovered evidence.
   * A scene is unlocked if:
   * - it has no unlockCondition, or
   * - its unlockCondition evidence IDs are all in the discoveredEvidence array.
   *
   * @param {string[]} discoveredEvidence - Array of evidence IDs the player has found.
   * @returns {Object[]} Array of unlocked scene objects.
   *
   * @example
   * const unlocked = caseLoader.getUnlockedScenes(['bloody_knife', 'torn_letter']);
   */
  getUnlockedScenes(discoveredEvidence = []) {
    if (!this._currentCase || !this._currentCase.scenes) return [];

    const discovered = new Set(discoveredEvidence);

    return this._currentCase.scenes.filter(scene => {
      // No lock condition — always accessible
      if (!scene.unlockCondition) return true;
      if (!scene.isLocked) return true;

      // unlockCondition can be a string (single evidence ID) or array
      const conditions = Array.isArray(scene.unlockCondition)
        ? scene.unlockCondition
        : [scene.unlockCondition];

      return conditions.every(condId => discovered.has(condId));
    });
  }

  /**
   * Get the currently loaded case data.
   *
   * @returns {Object|null} The full case object, or null if nothing is loaded.
   */
  getCurrentCase() {
    return this._currentCase;
  }

  /**
   * Get the case solution (if a case is loaded).
   *
   * @returns {Object|null} The solution object, or null.
   */
  getSolution() {
    return this._currentCase ? this._currentCase.solution : null;
  }

  /**
   * Get hints defined in the current case.
   *
   * @returns {Object[]} Array of hint objects.
   */
  getHints() {
    if (!this._currentCase || !this._currentCase.hints) return [];
    return [...this._currentCase.hints];
  }

  /**
   * Get the victim info for the current case.
   *
   * @returns {Object|null} The victim object, or null.
   */
  getVictim() {
    return this._currentCase ? this._currentCase.victim : null;
  }

  // ─── Cache Management ────────────────────────────────────────────────

  /**
   * Clear the case cache. Forces fresh fetches on next loadCase call.
   *
   * @returns {void}
   */
  clearCache() {
    this._cache.clear();
  }

  /**
   * Check if a case is cached.
   *
   * @param {string} caseId - The case identifier.
   * @returns {boolean} True if the case is in the cache.
   */
  isCached(caseId) {
    return this._cache.has(caseId);
  }

  /**
   * Get the list of cached case IDs.
   *
   * @returns {string[]} Array of cached case identifiers.
   */
  getCachedCaseIds() {
    return [...this._cache.keys()];
  }
};
