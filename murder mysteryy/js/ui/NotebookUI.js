/**
 * @file NotebookUI.js
 * @description Renders the tabbed notebook interface including evidence catalog, 
 * suspect alibis, timeline progression, map locations, and handwritten notes.
 * @version 1.0.0
 */

window.NyayaSim = window.NyayaSim || {};

window.NyayaSim.NotebookUI = class NotebookUI {
  /**
   * Create a new NotebookUI.
   * @param {HTMLElement} container - The DOM container element.
   * @param {Object} eventBus - EventBus instance.
   */
  constructor(container, eventBus) {
    this.container = container;
    this.eventBus = eventBus;
    
    this.activeTab = 'evidence';
    this.searchQuery = '';

    this._bindEvents();
  }

  /**
   * Bind event listeners.
   * @private
   */
  _bindEvents() {
    // Listen for state changes to refresh if active
    this.eventBus.on('state:change', () => {
      if (this.container.offsetParent !== null) {
        this.render();
      }
    });
  }

  /**
   * Render the notebook screen.
   */
  render() {
    this.container.innerHTML = '';

    const layout = document.createElement('div');
    layout.className = 'notebook-view';

    // 1. Notebook Tabs
    const tabsContainer = document.createElement('div');
    tabsContainer.className = 'notebook-tabs';
    
    const tabs = [
      { id: 'evidence', label: 'Evidence' },
      { id: 'suspects', label: 'Suspects' },
      { id: 'timeline', label: 'Timeline' },
      { id: 'map', label: 'Map' },
      { id: 'notes', label: 'Notes' }
    ];

    tabs.forEach(tab => {
      const tabBtn = document.createElement('button');
      tabBtn.className = `notebook-tab ${tab.id === this.activeTab ? 'active' : ''}`;
      tabBtn.innerText = tab.label;
      tabBtn.addEventListener('click', () => {
        this.activeTab = tab.id;
        this.render();
      });
      tabsContainer.appendChild(tabBtn);
    });

    layout.appendChild(tabsContainer);

    // 2. Notebook Content Area
    const contentArea = document.createElement('div');
    contentArea.className = 'notebook-content';

    // Add search bar for tabs except Notes
    if (this.activeTab !== 'notes' && this.activeTab !== 'map') {
      const search = document.createElement('div');
      search.className = 'notebook-search';
      search.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
          <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input type="text" placeholder="Search entries..." id="notebook-search-input" value="${this.searchQuery}">
      `;
      
      const input = search.querySelector('#notebook-search-input');
      input.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase();
        this._filterContent(contentArea);
      });
      
      layout.appendChild(search);
    }

    // Populate actual content
    this._populateTabContent(contentArea);
    layout.appendChild(contentArea);

    this.container.appendChild(layout);
  }

  /**
   * Filter visible tab contents based on search query.
   * @private
   */
  _filterContent(container) {
    this._populateTabContent(container);
  }

  /**
   * Populates content based on active tab.
   * @private
   */
  _populateTabContent(container) {
    container.innerHTML = '';
    const caseData = window.NyayaSim.appInstance?.gameEngine?.caseLoader?.getCurrentCase();
    const caseState = window.NyayaSim.appInstance?.gameEngine?.stateManager?.get('currentCase') || {};

    if (!caseData) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-title">No Case Loaded</div></div>';
      return;
    }

    switch (this.activeTab) {
      case 'evidence':
        this._renderEvidenceTab(container, caseData, caseState);
        break;
      case 'suspects':
        this._renderSuspectsTab(container, caseData, caseState);
        break;
      case 'timeline':
        this._renderTimelineTab(container, caseData, caseState);
        break;
      case 'map':
        this._renderMapTab(container, caseData, caseState);
        break;
      case 'notes':
        this._renderNotesTab(container, caseState);
        break;
    }
  }

  /** @private Render Evidence Tab */
  _renderEvidenceTab(container, caseData, caseState) {
    const discovered = caseState.discoveredEvidence || [];
    const list = document.createElement('div');
    list.className = 'evidence-list';

    const filteredEvidence = (caseData.evidence || []).filter(e => {
      const isDiscovered = discovered.includes(e.id);
      const matchesSearch = e.name.toLowerCase().includes(this.searchQuery) || e.description.toLowerCase().includes(this.searchQuery);
      return isDiscovered && matchesSearch;
    });

    if (filteredEvidence.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-title">No evidence found matching search.</div></div>';
      return;
    }

    filteredEvidence.forEach(e => {
      const item = document.createElement('div');
      item.className = 'evidence-item';
      item.innerHTML = `
        <div class="evidence-item-icon">📂</div>
        <div class="evidence-item-info">
          <div class="evidence-item-name">${e.name}</div>
          <div class="evidence-item-location">${e.description}</div>
        </div>
      `;
      list.appendChild(item);
    });

    container.appendChild(list);
  }

  /** @private Render Suspects Tab */
  _renderSuspectsTab(container, caseData, caseState) {
    const list = document.createElement('div');
    list.className = 'flex flex-col gap-4';

    const suspects = (caseData.suspects || []).filter(s => {
      return s.name.toLowerCase().includes(this.searchQuery) || s.relationship.toLowerCase().includes(this.searchQuery);
    });

    suspects.forEach(s => {
      const card = document.createElement('div');
      card.className = 'suspect-profile';
      card.innerHTML = `
        <div class="suspect-profile-header">
          <div class="suspect-profile-avatar">${s.name.charAt(0)}</div>
          <div class="suspect-profile-meta">
            <div class="suspect-profile-name">${s.name}</div>
            <div class="suspect-profile-role">${s.relationship} | Age: ${s.age || 'Unknown'}</div>
          </div>
        </div>
        <div class="suspect-profile-section">
          <div class="suspect-profile-section-title">Claimed Alibi</div>
          <div class="suspect-alibi">${s.alibi?.claimed || 'No alibi provided.'}</div>
        </div>
        ${s.motive ? `
          <div class="suspect-profile-section">
            <div class="suspect-profile-section-title">Observed Motive</div>
            <div class="suspect-alibi" style="border-left-color: var(--amber);">${s.motive}</div>
          </div>
        ` : ''}
      `;
      list.appendChild(card);
    });

    container.appendChild(list);
  }

  /** @private Render Timeline Tab */
  _renderTimelineTab(container, caseData, caseState) {
    const timeline = document.createElement('div');
    timeline.className = 'timeline';

    const events = (caseData.timeline || []).filter(evt => {
      return evt.description.toLowerCase().includes(this.searchQuery);
    });

    if (events.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-title">No timeline events found.</div></div>';
      return;
    }

    events.forEach(evt => {
      const item = document.createElement('div');
      item.className = 'timeline-event confirmed';
      item.innerHTML = `
        <div class="timeline-time">${evt.time || 'Unknown Time'}</div>
        <div class="timeline-text">${evt.description}</div>
      `;
      timeline.appendChild(item);
    });

    container.appendChild(timeline);
  }

  /** @private Render Map Tab */
  _renderMapTab(container, caseData, caseState) {
    const grid = document.createElement('div');
    grid.className = 'location-map';

    const scenes = caseData.scenes || [];
    scenes.forEach(scene => {
      const isVisited = caseState.visitedScenes?.includes(scene.id);
      
      const item = document.createElement('div');
      item.className = `map-location ${isVisited ? 'visited' : ''}`;
      item.innerHTML = `
        <div class="map-location-icon">📍</div>
        <div class="map-location-name">${scene.name}</div>
        <div class="map-location-clues">${isVisited ? 'Visited' : 'Locked/Unvisited'}</div>
      `;
      grid.appendChild(item);
    });

    container.appendChild(grid);
  }

  /** @private Render Notes Tab */
  _renderNotesTab(container, caseState) {
    const notesText = caseState.notes || '';
    
    const textarea = document.createElement('textarea');
    textarea.className = 'notes-area';
    textarea.placeholder = 'Jot down your deductions, questions, and evidence conflicts...';
    textarea.value = notesText;
    
    textarea.addEventListener('input', (e) => {
      this.eventBus.emit('state:change', {
        path: 'currentCase.notes',
        value: e.target.value
      });
    });

    container.appendChild(textarea);
  }
};
