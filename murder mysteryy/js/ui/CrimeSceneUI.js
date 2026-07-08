/**
 * @file CrimeSceneUI.js
 * @description Renders the interactive crime scene, hotspot markers, 
 * zoom options, and inspection card overlays.
 * @version 1.0.0
 */

window.NyayaSim = window.NyayaSim || {};

window.NyayaSim.CrimeSceneUI = class CrimeSceneUI {
  /**
   * Create a new CrimeSceneUI.
   * @param {HTMLElement} container - The DOM container element.
   * @param {Object} eventBus - EventBus instance.
   */
  constructor(container, eventBus) {
    this.container = container;
    this.eventBus = eventBus;
    
    this.activeSceneData = null;
    this.zoomScale = 1.0;

    this._bindEvents();
  }

  /**
   * Bind event listeners.
   * @private
   */
  _bindEvents() {
    this.eventBus.on('investigation:sceneLoaded', (data) => this.render(data));
    this.eventBus.on('investigation:objectExamined', (data) => this.showInspectionOverlay(data));
  }

  /**
   * Render the active crime scene interface.
   * @param {Object} data - Scene details.
   */
  render(data) {
    this.activeSceneData = data.scene;
    this.container.innerHTML = '';

    // Create Main Structure
    const layout = document.createElement('div');
    layout.className = 'crime-scene-view';

    // 1. Navigation bar
    const navBar = document.createElement('div');
    navBar.className = 'scene-nav';
    
    // We should display all scenes in the current case for navigation
    // Let's ask the game state/loader for all scenes
    const allScenes = window.NyayaSim.appInstance?.gameEngine?.caseLoader?.getAllScenes() || [];
    allScenes.forEach(scene => {
      const navItem = document.createElement('button');
      navItem.className = `scene-nav-item ${scene.id === data.sceneId ? 'active' : ''} ${data.visitedScenes.includes(scene.id) ? 'visited' : ''}`;
      navItem.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="margin-right: 4px;">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
        ${scene.name}
      `;
      navItem.addEventListener('click', () => {
        this.eventBus.emit('investigation:selectScene', { sceneId: scene.id });
      });
      navBar.appendChild(navItem);
    });

    layout.appendChild(navBar);

    // 2. Viewport
    const viewport = document.createElement('div');
    viewport.className = 'scene-viewport';

    // Room Layout (illustrated container)
    const roomLayout = document.createElement('div');
    roomLayout.className = 'room-layout';
    roomLayout.style.transform = `scale(${this.zoomScale})`;
    roomLayout.style.transition = 'transform 0.2s ease-out';
    
    if (this.activeSceneData.backgroundImage) {
      roomLayout.style.backgroundImage = `url('${this.activeSceneData.backgroundImage}')`;
      roomLayout.style.backgroundSize = 'cover';
    }

    // Render interactive elements/hotspots
    if (this.activeSceneData.objects) {
      this.activeSceneData.objects.forEach(obj => {
        if (obj.hidden) return;

        const el = document.createElement('div');
        el.className = `room-element ${data.examinedObjects.includes(obj.id) ? 'examined' : ''} ${obj.evidenceId ? 'has-evidence' : ''}`;
        el.style.left = obj.x || '10%';
        el.style.top = obj.y || '10%';
        el.style.width = obj.width || '80px';
        el.style.height = obj.height || '80px';
        
        el.innerHTML = `
          <div class="hotspot-indicator"></div>
          <div class="element-label">${obj.name}</div>
        `;

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          this.eventBus.emit('investigation:examine', { objectId: obj.id });
        });

        roomLayout.appendChild(el);
      });
    }

    viewport.appendChild(roomLayout);

    // 3. Zoom controls
    const zoomControls = document.createElement('div');
    zoomControls.className = 'zoom-controls';
    
    const zoomIn = document.createElement('button');
    zoomIn.className = 'zoom-btn';
    zoomIn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;
    zoomIn.addEventListener('click', () => {
      this.zoomScale = Math.min(2.0, this.zoomScale + 0.15);
      roomLayout.style.transform = `scale(${this.zoomScale})`;
    });

    const zoomOut = document.createElement('button');
    zoomOut.className = 'zoom-btn';
    zoomOut.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;
    zoomOut.addEventListener('click', () => {
      this.zoomScale = Math.max(0.7, this.zoomScale - 0.15);
      roomLayout.style.transform = `scale(${this.zoomScale})`;
    });

    zoomControls.appendChild(zoomIn);
    zoomControls.appendChild(zoomOut);
    viewport.appendChild(zoomControls);

    layout.appendChild(viewport);

    // 4. Status bar
    const statusBar = document.createElement('div');
    statusBar.className = 'scene-statusbar';
    statusBar.innerHTML = `
      <div class="scene-status-left">
        <span>Investigation progress: ${data.scene.name}</span>
      </div>
      <div class="scene-status-right">
        <span style="font-size: var(--text-xs); color: var(--text-muted);">Double click objects to examine closely</span>
      </div>
    `;
    layout.appendChild(statusBar);

    this.container.appendChild(layout);

    // Add Overlay for detail inspection
    this.overlay = document.createElement('div');
    this.overlay.className = 'evidence-inspect-overlay';
    this.container.appendChild(this.overlay);
  }

  /**
   * Show inspection popup modal/overlay when examining an object.
   */
  showInspectionOverlay(data) {
    const obj = data.object;
    this.overlay.innerHTML = '';
    this.overlay.className = 'evidence-inspect-overlay active';

    const card = document.createElement('div');
    card.className = 'evidence-inspect-card';

    // Set structure
    card.innerHTML = `
      <div class="evidence-inspect-header">
        <div class="flex items-center gap-4">
          <div class="evidence-inspect-icon">🔍</div>
          <div>
            <h4 class="evidence-inspect-title">${obj.name}</h4>
            <span class="evidence-inspect-type">${obj.evidenceId ? 'CORPUS EVIDENCE' : 'SCENE DETAIL'}</span>
          </div>
        </div>
        <button class="modal-close" id="inspect-close-btn" style="background: none; border: none; cursor: pointer;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="evidence-inspect-body">
        <p>${obj.description || 'No detailed description available.'}</p>
        ${data.newlyDiscoveredEvidence ? `
          <div class="evidence-tag mt-4">
            <span>🔑 EVIDENCE ADDED: ${data.newlyDiscoveredEvidence.name}</span>
          </div>
        ` : ''}
      </div>
      <div class="evidence-inspect-actions">
        <button class="btn btn-primary" id="inspect-confirm-btn">Resume Investigation</button>
      </div>
    `;

    this.overlay.appendChild(card);

    const closeOverlay = () => {
      this.overlay.className = 'evidence-inspect-overlay';
      // Trigger dynamic toast if evidence was discovered
      if (data.newlyDiscoveredEvidence) {
        window.NyayaSim.appInstance?.toast?.show(
          'Evidence Discovered',
          data.newlyDiscoveredEvidence.name,
          'evidence'
        );
      }
    };

    card.querySelector('#inspect-close-btn').addEventListener('click', closeOverlay);
    card.querySelector('#inspect-confirm-btn').addEventListener('click', closeOverlay);
  }
};
