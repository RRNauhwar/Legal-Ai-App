/**
 * @file InterrogationUI.js
 * @description Interrogation room user interface, suspect selector lists, 
 * conversational dialogue bubble templates, and evidence presentation trays.
 * @version 1.0.0
 */

window.NyayaSim = window.NyayaSim || {};

window.NyayaSim.InterrogationUI = class InterrogationUI {
  /**
   * Create a new InterrogationUI.
   * @param {HTMLElement} container - The DOM container element.
   * @param {Object} eventBus - EventBus instance.
   */
  constructor(container, eventBus) {
    this.container = container;
    this.eventBus = eventBus;

    this.activeSuspectId = null;
    this.selectedEvidenceId = null;

    this._bindEvents();
  }

  /**
   * Bind event listeners.
   * @private
   */
  _bindEvents() {
    this.eventBus.on('dialogue:suspectSelected', (data) => {
      this.activeSuspectId = data.suspectId;
      this.render();
    });

    this.eventBus.on('dialogue:playerMessage', () => this.refreshChat());
    this.eventBus.on('dialogue:suspectResponse', () => this.refreshChat());
    
    this.eventBus.on('dialogue:typing', (data) => {
      if (data.suspectId === this.activeSuspectId) {
        this.toggleTyping(data.isTyping);
      }
    });
  }

  /**
   * Render the interrogation screen layout.
   */
  render() {
    this.container.innerHTML = '';

    const dialogueEngine = window.NyayaSim.appInstance?.gameEngine?.dialogueEngine;
    if (!dialogueEngine) return;

    const suspects = dialogueEngine.getSuspectStates();
    if (suspects.length === 0) {
      this.container.innerHTML = '<div class="empty-state"><div class="empty-state-title">No suspects available.</div></div>';
      return;
    }

    if (!this.activeSuspectId) {
      this.activeSuspectId = suspects[0].id;
    }

    const activeSuspectState = suspects.find(s => s.id === this.activeSuspectId) || suspects[0];
    const activeSuspectData = dialogueEngine.suspects[this.activeSuspectId];

    // Layout
    const layout = document.createElement('div');
    layout.className = 'interrogation-view';

    // 1. Suspect List Left Panel
    const listPanel = document.createElement('div');
    listPanel.className = 'suspect-list-panel';
    listPanel.innerHTML = `<div class="suspect-list-header"><h4 class="suspect-list-title">Suspects</h4></div>`;
    
    const list = document.createElement('div');
    list.className = 'suspect-list';
    
    suspects.forEach(s => {
      const item = document.createElement('div');
      item.className = `suspect-list-item ${s.id === this.activeSuspectId ? 'active' : ''}`;
      
      const moodColor = s.emotionData?.color || 'var(--text-muted)';
      
      item.innerHTML = `
        <div class="suspect-list-avatar">${s.name.charAt(0)}</div>
        <div class="suspect-list-info">
          <div class="suspect-list-name">${s.name}</div>
          <div class="suspect-list-role">${s.emotion.toUpperCase()}</div>
        </div>
        <div class="suspect-status-dot" style="background-color: ${moodColor}"></div>
      `;

      item.addEventListener('click', () => {
        this.eventBus.emit('interrogation:selectSuspect', { suspectId: s.id });
      });

      list.appendChild(item);
    });

    listPanel.appendChild(list);
    layout.appendChild(listPanel);

    // 2. Interrogation Chat Window (Right Panel)
    const chat = document.createElement('div');
    chat.className = 'interrogation-chat';

    // Header
    const activeMoodColor = activeSuspectState.emotionData?.color || 'var(--text-muted)';
    const chatHeader = document.createElement('div');
    chatHeader.className = 'chat-header';
    chatHeader.innerHTML = `
      <div class="chat-suspect-info">
        <div class="chat-suspect-avatar">${activeSuspectData?.name.charAt(0)}</div>
        <div>
          <div class="chat-suspect-name">${activeSuspectData?.name}</div>
          <div class="chat-suspect-mood">
            <div class="mood-indicator" style="background-color: ${activeMoodColor}"></div>
            Mood: ${activeSuspectState.emotion}
          </div>
        </div>
      </div>
    `;
    chat.appendChild(chatHeader);

    // Message Container
    const messageContainer = document.createElement('div');
    messageContainer.className = 'chat-messages';
    messageContainer.id = 'interrogation-messages';
    chat.appendChild(messageContainer);

    // Typing Indicator
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'typing-indicator hidden';
    typingIndicator.id = 'interrogation-typing';
    typingIndicator.innerHTML = `
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    `;
    chat.appendChild(typingIndicator);

    // Input Area
    const inputArea = document.createElement('div');
    inputArea.className = 'chat-input-area';

    // 2a. Evidence tray
    const discoveredEvidence = window.NyayaSim.appInstance?.gameEngine?.stateManager?.get('currentCase.discoveredEvidence') || [];
    const allEvidence = window.NyayaSim.appInstance?.gameEngine?.caseLoader?.getAllEvidence() || [];
    
    const tray = document.createElement('div');
    tray.className = 'evidence-tray';
    
    allEvidence.forEach(ev => {
      if (!discoveredEvidence.includes(ev.id)) return;

      const item = document.createElement('button');
      item.className = `evidence-tray-item ${this.selectedEvidenceId === ev.id ? 'selected' : ''}`;
      item.innerText = `📁 ${ev.name}`;
      
      item.addEventListener('click', () => {
        if (this.selectedEvidenceId === ev.id) {
          this.selectedEvidenceId = null;
        } else {
          this.selectedEvidenceId = ev.id;
        }
        this.render();
      });
      tray.appendChild(item);
    });

    if (tray.children.length > 0) {
      inputArea.appendChild(tray);
    }

    // 2b. Quick Questions
    const quickQuestions = dialogueEngine.getQuickQuestions() || [];
    if (quickQuestions.length > 0) {
      const qContainer = document.createElement('div');
      qContainer.className = 'quick-questions';
      
      quickQuestions.forEach(q => {
        const qBtn = document.createElement('button');
        qBtn.className = 'quick-question';
        qBtn.innerText = q;
        qBtn.addEventListener('click', () => {
          this.eventBus.emit('interrogation:ask', { message: q });
        });
        qContainer.appendChild(qBtn);
      });
      inputArea.appendChild(qContainer);
    }

    // 2c. Input Wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'chat-input-wrapper';

    const input = document.createElement('textarea');
    input.className = 'chat-input';
    input.placeholder = 'Type your question or choose a topic...';
    input.rows = 1;
    
    const sendBtn = document.createElement('button');
    sendBtn.className = 'chat-send-btn';
    sendBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
        <line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
      </svg>
    `;

    const handleSend = () => {
      const text = input.value.trim();
      if (this.selectedEvidenceId) {
        const evidence = allEvidence.find(e => e.id === this.selectedEvidenceId);
        this.eventBus.emit('interrogation:showEvidence', { evidenceId: this.selectedEvidenceId, evidence });
        this.selectedEvidenceId = null;
      } else if (text) {
        this.eventBus.emit('interrogation:ask', { message: text });
        input.value = '';
      }
    };

    sendBtn.addEventListener('click', handleSend);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    });

    wrapper.appendChild(input);
    wrapper.appendChild(sendBtn);
    inputArea.appendChild(wrapper);

    chat.appendChild(inputArea);
    layout.appendChild(chat);

    this.container.appendChild(layout);

    this.refreshChat();
  }

  /**
   * Refreshes the chat dialog screen.
   */
  refreshChat() {
    const messageContainer = this.container.querySelector('#interrogation-messages');
    if (!messageContainer || !this.activeSuspectId) return;

    messageContainer.innerHTML = '';
    const dialogueEngine = window.NyayaSim.appInstance?.gameEngine?.dialogueEngine;
    const history = dialogueEngine?.getHistory(this.activeSuspectId) || [];

    history.forEach(msg => {
      if (msg.role === 'system') {
        const sysEl = document.createElement('div');
        sysEl.className = 'chat-system-message';
        sysEl.innerText = msg.text;
        messageContainer.appendChild(sysEl);
        return;
      }

      const msgEl = document.createElement('div');
      msgEl.className = `chat-message ${msg.role === 'player' ? 'player' : ''}`;
      
      const avatarChar = msg.role === 'player' ? 'D' : dialogueEngine.suspects[this.activeSuspectId]?.name.charAt(0);
      
      msgEl.innerHTML = `
        <div class="chat-message-avatar">${avatarChar}</div>
        <div class="chat-bubble">
          ${msg.emotion ? `<span class="chat-bubble-emotion">${msg.emotion.toUpperCase()}</span>` : ''}
          <div class="chat-bubble-text">${msg.text}</div>
        </div>
      `;
      messageContainer.appendChild(msgEl);
    });

    messageContainer.scrollTop = messageContainer.scrollHeight;
  }

  /**
   * Toggles typing indicator.
   */
  toggleTyping(isTyping) {
    const indicator = this.container.querySelector('#interrogation-typing');
    if (indicator) {
      if (isTyping) {
        indicator.classList.remove('hidden');
      } else {
        indicator.classList.add('hidden');
      }
    }
  }
};
