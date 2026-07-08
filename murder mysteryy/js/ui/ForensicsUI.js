/**
 * @file ForensicsUI.js
 * @description Forensic analysis screen, test selector panels, 
 * report cards, and overlay matching graphics.
 * @version 1.0.0
 */

window.NyayaSim = window.NyayaSim || {};

window.NyayaSim.ForensicsUI = class ForensicsUI {
  /**
   * Create a new ForensicsUI.
   * @param {HTMLElement} container - The DOM container element.
   * @param {Object} eventBus - EventBus instance.
   */
  constructor(container, eventBus) {
    this.container = container;
    this.eventBus = eventBus;

    this.activeTestId = null;
    this.fingerprintMatched = false;

    this._bindEvents();
  }

  /**
   * Bind event listeners.
   * @private
   */
  _bindEvents() {
    // Re-render when active
    this.eventBus.on('state:change', () => {
      if (this.container.offsetParent !== null) {
        this.render();
      }
    });
  }

  /**
   * Render the forensics lab screen.
   */
  render() {
    this.container.innerHTML = '';

    const caseData = window.NyayaSim.appInstance?.gameEngine?.caseLoader?.getCurrentCase();
    if (!caseData || !caseData.forensics) {
      this.container.innerHTML = '<div class="empty-state"><div class="empty-state-title">Forensic reports unavailable.</div></div>';
      return;
    }

    const discovered = window.NyayaSim.appInstance?.gameEngine?.stateManager?.get('currentCase.discoveredEvidence') || [];

    // Layout structure
    const layout = document.createElement('div');
    layout.className = 'forensics-view';

    // 1. Left Panel (Test Menu)
    const listPanel = document.createElement('div');
    listPanel.className = 'forensics-list-panel';
    listPanel.innerHTML = `<div class="forensics-list-header"><h4 class="forensics-list-title">Lab Analysis</h4></div>`;

    const list = document.createElement('div');
    list.className = 'forensics-list';

    caseData.forensics.forEach(report => {
      // Check if report requires specific evidence to be unlocked
      const isUnlocked = !report.linkedEvidence || report.linkedEvidence.every(evId => discovered.includes(evId));
      
      const item = document.createElement('div');
      item.className = `forensics-item ${this.activeTestId === report.id ? 'active' : ''} ${!isUnlocked ? 'disabled' : ''}`;
      
      if (!this.activeTestId && isUnlocked) {
        this.activeTestId = report.id;
      }

      item.innerHTML = `
        <div class="forensics-item-icon">${isUnlocked ? '🔬' : '🔒'}</div>
        <div>
          <div class="forensics-item-name">${report.title}</div>
          <div class="forensics-item-status">${isUnlocked ? 'Available' : 'Awaiting evidence'}</div>
        </div>
      `;

      if (isUnlocked) {
        item.addEventListener('click', () => {
          this.activeTestId = report.id;
          this.render();
        });
      }

      list.appendChild(item);
    });

    listPanel.appendChild(list);
    layout.appendChild(listPanel);

    // 2. Right Panel (Workspace)
    const workspace = document.createElement('div');
    workspace.className = 'forensics-workspace';

    const activeReport = caseData.forensics.find(r => r.id === this.activeTestId);

    if (activeReport) {
      // Header
      const header = document.createElement('div');
      header.className = 'forensics-workspace-header';
      header.innerHTML = `
        <h3 class="forensics-workspace-title">${activeReport.title}</h3>
        <p class="forensics-workspace-desc">${activeReport.description || 'Forensic lab details'}</p>
      `;
      workspace.appendChild(header);

      // Body (Different views per report type)
      const body = document.createElement('div');
      body.className = 'forensics-workspace-body';

      if (activeReport.type === 'fingerprints') {
        this._renderFingerprintAnalysis(body, activeReport);
      } else {
        this._renderStandardReport(body, activeReport);
      }
      
      workspace.appendChild(body);
    } else {
      workspace.innerHTML = '<div class="empty-state"><div class="empty-state-title">Select a test from the left panel.</div></div>';
    }

    layout.appendChild(workspace);
    this.container.appendChild(layout);
  }

  /**
   * Render fingerprint matching mini-game interface.
   * @private
   */
  _renderFingerprintAnalysis(container, report) {
    const main = document.createElement('div');
    main.className = 'fingerprint-compare';

    main.innerHTML = `
      <div class="fingerprint-card">
        <div class="fingerprint-label">Latent Print (From Weapon)</div>
        <div class="fingerprint-image">🌀</div>
        <div class="fingerprint-source">Wiped, partial print recovered.</div>
      </div>
      <div class="fingerprint-card">
        <div class="fingerprint-label">Suspect Print: Arjun Mehta</div>
        <div class="fingerprint-image" id="suspect-print-cell" style="cursor: pointer;">🔍</div>
        <div class="fingerprint-source">Click to compare candidate samples.</div>
      </div>
      <div class="match-result match hidden" id="match-success">
        <div class="match-result-text">MATCH CONVENTIONAL (99.8%)</div>
        <div class="match-percentage">The partial print matches the right little finger of Arjun Mehta.</div>
      </div>
    `;

    const printCell = main.querySelector('#suspect-print-cell');
    const successResult = main.querySelector('#match-success');

    if (this.fingerprintMatched) {
      printCell.innerText = '🌀';
      successResult.classList.remove('hidden');
    }

    printCell.addEventListener('click', () => {
      this.fingerprintMatched = true;
      printCell.innerText = '🌀';
      successResult.classList.remove('hidden');
      
      // Auto-unlock notebook note or evidence triggers
      this.eventBus.emit('investigation:collect', { evidenceId: 'EV-15' }); // Unlock/collect autopsy/fingerprints report
      window.NyayaSim.appInstance?.toast?.show('Analysis Complete', 'Fingerprint matched to Arjun Mehta', 'info');
    });

    container.appendChild(main);
  }

  /**
   * Render standard textual/tabular report.
   * @private
   */
  _renderStandardReport(container, report) {
    const card = document.createElement('div');
    card.className = 'forensic-report';

    let tableRows = '';
    if (report.results) {
      Object.entries(report.results).forEach(([key, val]) => {
        tableRows += `
          <tr>
            <td><strong>${key.toUpperCase()}</strong></td>
            <td>${val}</td>
          </tr>
        `;
      });
    }

    card.innerHTML = `
      <div class="report-header">
        <span class="report-type">${report.type.toUpperCase()}</span>
        <span class="report-id">LAB-ID: ${report.id.toUpperCase()}</span>
      </div>
      <div class="report-body">
        <table class="report-table">
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        <div class="report-conclusion">
          <div class="report-conclusion-title">Conclusion</div>
          <div class="report-conclusion-text">${report.conclusion || 'No summary conclusion.'}</div>
        </div>
      </div>
    `;

    container.appendChild(card);
  }
};
