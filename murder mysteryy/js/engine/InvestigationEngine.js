/**
 * @file InvestigationEngine.js
 * @description Manages crime scene interaction logic, object examination,
 * prerequisite unlocking, and evidence collection.
 * @version 1.0.0
 */

window.NyayaSim = window.NyayaSim || {};

window.NyayaSim.InvestigationEngine = class InvestigationEngine {
  /**
   * Create a new InvestigationEngine.
   * @param {Object} eventBus - EventBus instance.
   * @param {Object} caseLoader - CaseLoader instance.
   */
  constructor(eventBus, caseLoader) {
    this.eventBus = eventBus;
    this.caseLoader = caseLoader;
    
    /** @type {string|null} */
    this.activeSceneId = null;
    
    /** @type {Set<string>} Set of discovered evidence IDs */
    this.discoveredEvidence = new Set();
    
    /** @type {Set<string>} Set of examined object IDs */
    this.examinedObjects = new Set();
    
    /** @type {Set<string>} Set of visited scene IDs */
    this.visitedScenes = new Set();

    this._bindEvents();
  }

  /**
   * Bind event listeners.
   * @private
   */
  _bindEvents() {
    this.eventBus.on('investigation:examine', (data) => this.examineObject(data.objectId));
    this.eventBus.on('investigation:collect', (data) => this.collectEvidence(data.evidenceId));
    this.eventBus.on('investigation:selectScene', (data) => this.loadScene(data.sceneId));
  }

  /**
   * Initialize state for a new case.
   * @param {string[]} discoveredEvidence - Loaded discovered evidence.
   * @param {string[]} examinedObjects - Loaded examined objects.
   * @param {string[]} visitedScenes - Loaded visited scenes.
   */
  initializeState(discoveredEvidence = [], examinedObjects = [], visitedScenes = []) {
    this.discoveredEvidence = new Set(discoveredEvidence);
    this.examinedObjects = new Set(examinedObjects);
    this.visitedScenes = new Set(visitedScenes);
    this.activeSceneId = null;
  }

  /**
   * Load/activate a crime scene location.
   * @param {string} sceneId - Unique scene identifier.
   */
  loadScene(sceneId) {
    const scene = this.caseLoader.getScene(sceneId);
    if (!scene) {
      console.error(`[InvestigationEngine] Scene "${sceneId}" not found.`);
      return;
    }

    this.activeSceneId = sceneId;
    this.visitedScenes.add(sceneId);

    // Emit event that scene is loaded
    this.eventBus.emit('investigation:sceneLoaded', {
      sceneId,
      scene,
      visitedScenes: [...this.visitedScenes],
      discoveredEvidence: [...this.discoveredEvidence],
      examinedObjects: [...this.examinedObjects]
    });
  }

  /**
   * Examine an object inside the active scene.
   * @param {string} objectId - Unique object identifier.
   */
  examineObject(objectId) {
    if (!this.activeSceneId) return;

    const scene = this.caseLoader.getScene(this.activeSceneId);
    if (!scene) return;

    const obj = scene.objects.find(o => o.id === objectId);
    if (!obj) {
      console.error(`[InvestigationEngine] Object "${objectId}" not found in scene "${this.activeSceneId}".`);
      return;
    }

    // Check prerequisites
    if (obj.prerequisites && obj.prerequisites.length > 0) {
      const meetsPrereqs = obj.prerequisites.every(reqId => this.discoveredEvidence.has(reqId) || this.examinedObjects.has(reqId));
      if (!meetsPrereqs) {
        this.eventBus.emit('investigation:examineFailed', {
          objectId,
          reason: obj.lockedMessage || "You don't know what to look for here yet."
        });
        return;
      }
    }

    this.examinedObjects.add(objectId);
    this.eventBus.emit('state:change', { path: 'currentCase.examinedObjects', value: [...this.examinedObjects] });

    // Handle evidence discovery
    let newlyDiscoveredEvidence = null;
    if (obj.evidenceId) {
      const evidence = this.caseLoader.getEvidence(obj.evidenceId);
      if (evidence && !this.discoveredEvidence.has(obj.evidenceId)) {
        this.discoveredEvidence.add(obj.evidenceId);
        newlyDiscoveredEvidence = evidence;
        this.eventBus.emit('state:change', { path: 'currentCase.discoveredEvidence', value: [...this.discoveredEvidence] });
        
        // Notify of evidence discovery
        this.eventBus.emit('investigation:evidenceDiscovered', {
          evidenceId: obj.evidenceId,
          evidence
        });
      }
    }

    this.eventBus.emit('investigation:objectExamined', {
      objectId,
      object: obj,
      newlyDiscoveredEvidence,
      sceneComplete: this.isSceneComplete(this.activeSceneId)
    });
  }

  /**
   * Explicitly collect a piece of evidence.
   * @param {string} evidenceId - Unique evidence identifier.
   */
  collectEvidence(evidenceId) {
    if (this.discoveredEvidence.has(evidenceId)) return;

    const evidence = this.caseLoader.getEvidence(evidenceId);
    if (!evidence) return;

    this.discoveredEvidence.add(evidenceId);
    this.eventBus.emit('state:change', { path: 'currentCase.discoveredEvidence', value: [...this.discoveredEvidence] });

    this.eventBus.emit('investigation:evidenceCollected', {
      evidenceId,
      evidence
    });
  }

  /**
   * Check if all examineable objects in a scene have been examined.
   * @param {string} sceneId
   * @returns {boolean}
   */
  isSceneComplete(sceneId) {
    const scene = this.caseLoader.getScene(sceneId);
    if (!scene || !scene.objects) return false;

    // Filter down to objects that are examineable
    const examineable = scene.objects.filter(o => !o.hidden);
    if (examineable.length === 0) return true;

    return examineable.every(o => this.examinedObjects.has(o.id));
  }

  /**
   * Get total progress of crime scene investigation.
   * @returns {Object}
   */
  getProgress() {
    const scenes = this.caseLoader.getAllScenes();
    let totalObjects = 0;
    let examinedCount = 0;

    scenes.forEach(scene => {
      if (scene.objects) {
        scene.objects.forEach(o => {
          if (!o.hidden) {
            totalObjects++;
            if (this.examinedObjects.has(o.id)) {
              examinedCount++;
            }
          }
        });
      }
    });

    return {
      totalObjects,
      examinedCount,
      percentage: totalObjects > 0 ? Math.round((examinedCount / totalObjects) * 100) : 100
    };
  }

  /** Reset internal state */
  reset() {
    this.activeSceneId = null;
    this.discoveredEvidence.clear();
    this.examinedObjects.clear();
    this.visitedScenes.clear();
  }
};
