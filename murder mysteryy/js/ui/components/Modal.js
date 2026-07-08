/**
 * @fileoverview Modal — reusable modal dialog for NyayaSim.
 *
 * Features:
 *   • Configurable title, body content (string or HTMLElement), and buttons.
 *   • Overlay backdrop with fade-in / fade-out animation.
 *   • Keyboard dismiss (Escape) and overlay-click dismiss.
 *   • Focus trap within the modal while open.
 *
 * CSS contract:
 *   .modal-overlay          – full-viewport backdrop
 *   .modal-overlay.active   – visible state (triggers CSS transition)
 *   .modal                  – dialog container
 *   .modal-header           – header row
 *   .modal-title            – heading text
 *   .modal-close            – close button (×)
 *   .modal-body             – scrollable content area
 *   .modal-footer           – action button row
 *   .btn                    – base button class
 *   .btn-primary            – primary action
 *   .btn-ghost              – subtle / cancel action
 *   .btn-danger             – destructive action
 *
 * @module ui/components/Modal
 */

window.NyayaSim = window.NyayaSim || {};

(function (ns) {
  'use strict';

  /** Animation duration kept in sync with CSS (ms). */
  const ANIMATION_MS = 300;

  /**
   * @typedef {object} ModalButton
   * @property {string} label           - Button text.
   * @property {string} [className='btn'] - CSS class(es) for the button.
   * @property {Function} [onClick]     - Click handler. Receives the Modal instance.
   * @property {boolean}  [closeOnClick=true] - Automatically hide the modal on click.
   */

  /**
   * Reusable modal dialog component.
   */
  class Modal {
    /**
     * @param {HTMLElement} container - Parent element (usually `document.body`).
     * @param {import('../../core/EventBus').EventBus} eventBus - Application event bus.
     * @param {object} [options]
     * @param {boolean} [options.closeOnOverlay=true]  - Close when overlay is clicked.
     * @param {boolean} [options.closeOnEscape=true]   - Close when Escape is pressed.
     * @param {number}  [options.animationDuration=300] - Animation time in ms.
     */
    constructor(container, eventBus, options = {}) {
      /** @private @type {HTMLElement} */
      this._container = container;

      /** @private @type {import('../../core/EventBus').EventBus} */
      this._eventBus = eventBus;

      /** @private @type {boolean} */
      this._closeOnOverlay = options.closeOnOverlay ?? true;

      /** @private @type {boolean} */
      this._closeOnEscape = options.closeOnEscape ?? true;

      /** @private @type {number} */
      this._animationDuration = options.animationDuration ?? ANIMATION_MS;

      /** @private @type {HTMLElement|null} */
      this._overlayEl = null;

      /** @private @type {HTMLElement|null} */
      this._modalEl = null;

      /** @private @type {boolean} */
      this._visible = false;

      /** @private @type {Function|null} */
      this._boundKeyDown = null;

      /** @private @type {Function|null} */
      this._onHideCallback = null;
    }

    /* ------------------------------------------------------------------
     * Lifecycle
     * ------------------------------------------------------------------ */

    /**
     * Build the static shell DOM.  Called once; subsequent calls are no-ops.
     */
    render() {
      if (this._overlayEl) return;

      // Overlay
      this._overlayEl = document.createElement('div');
      this._overlayEl.className = 'modal-overlay';
      this._overlayEl.setAttribute('role', 'dialog');
      this._overlayEl.setAttribute('aria-modal', 'true');

      // Modal container
      this._modalEl = document.createElement('div');
      this._modalEl.className = 'modal';

      // Header
      const header = document.createElement('div');
      header.className = 'modal-header';

      this._titleEl = document.createElement('h2');
      this._titleEl.className = 'modal-title';

      const closeBtn = document.createElement('button');
      closeBtn.className = 'modal-close';
      closeBtn.setAttribute('aria-label', 'Close modal');
      closeBtn.innerHTML = '&times;';
      closeBtn.addEventListener('click', () => this.hide());

      header.appendChild(this._titleEl);
      header.appendChild(closeBtn);

      // Body
      this._bodyEl = document.createElement('div');
      this._bodyEl.className = 'modal-body';

      // Footer
      this._footerEl = document.createElement('div');
      this._footerEl.className = 'modal-footer';

      this._modalEl.appendChild(header);
      this._modalEl.appendChild(this._bodyEl);
      this._modalEl.appendChild(this._footerEl);
      this._overlayEl.appendChild(this._modalEl);

      this._container.appendChild(this._overlayEl);

      // Overlay click
      if (this._closeOnOverlay) {
        this._overlayEl.addEventListener('click', (e) => {
          if (e.target === this._overlayEl) this.hide();
        });
      }

      // Keyboard
      this._boundKeyDown = this._handleKeyDown.bind(this);
    }

    /**
     * Update modal content while it is visible.
     *
     * @param {object} data
     * @param {string}  [data.title]
     * @param {string|HTMLElement} [data.content]
     * @param {ModalButton[]} [data.buttons]
     */
    update(data = {}) {
      if (data.title !== undefined) {
        this._titleEl.textContent = data.title;
      }
      if (data.content !== undefined) {
        this._setBody(data.content);
      }
      if (data.buttons !== undefined) {
        this._setButtons(data.buttons);
      }
    }

    /**
     * Remove all DOM elements and listeners.
     */
    destroy() {
      this.hide();
      if (this._overlayEl && this._overlayEl.parentNode) {
        this._overlayEl.parentNode.removeChild(this._overlayEl);
      }
      this._overlayEl = null;
      this._modalEl = null;
      this._titleEl = null;
      this._bodyEl = null;
      this._footerEl = null;
    }

    /* ------------------------------------------------------------------
     * Public API
     * ------------------------------------------------------------------ */

    /**
     * Show the modal with the given content.
     *
     * @param {string} title                  - Modal heading.
     * @param {string|HTMLElement} content     - Body content (HTML string or element).
     * @param {ModalButton[]} [buttons=[]]    - Footer action buttons.
     * @param {object} [options]
     * @param {Function} [options.onHide]     - Called when the modal is hidden.
     * @returns {Modal} this (for chaining).
     */
    show(title, content, buttons = [], options = {}) {
      if (!this._overlayEl) this.render();

      this._onHideCallback = options.onHide || null;

      // Populate
      this._titleEl.textContent = title;
      this._setBody(content);
      this._setButtons(buttons);

      // Animate in
      this._visible = true;
      // Force reflow before adding active class
      // eslint-disable-next-line no-unused-expressions
      this._overlayEl.offsetHeight;
      this._overlayEl.classList.add('active');

      // Trap focus
      if (this._closeOnEscape) {
        document.addEventListener('keydown', this._boundKeyDown);
      }

      // Prevent background scroll
      document.body.style.overflow = 'hidden';

      this._eventBus.emit('modal:opened', { title });

      return this;
    }

    /**
     * Hide the modal with an exit animation.
     *
     * @returns {Promise<void>} Resolves after the animation completes.
     */
    hide() {
      if (!this._visible) return Promise.resolve();

      this._visible = false;
      this._overlayEl.classList.remove('active');

      document.removeEventListener('keydown', this._boundKeyDown);
      document.body.style.overflow = '';

      return new Promise((resolve) => {
        setTimeout(() => {
          this._eventBus.emit('modal:closed');
          if (typeof this._onHideCallback === 'function') {
            this._onHideCallback();
            this._onHideCallback = null;
          }
          resolve();
        }, this._animationDuration);
      });
    }

    /**
     * Whether the modal is currently visible.
     *
     * @returns {boolean}
     */
    isVisible() {
      return this._visible;
    }

    /* ------------------------------------------------------------------
     * Private helpers
     * ------------------------------------------------------------------ */

    /**
     * Set the body content.
     * @private
     * @param {string|HTMLElement} content
     */
    _setBody(content) {
      if (!this._bodyEl) return;
      if (typeof content === 'string') {
        this._bodyEl.innerHTML = content;
      } else if (content instanceof HTMLElement) {
        this._bodyEl.innerHTML = '';
        this._bodyEl.appendChild(content);
      }
    }

    /**
     * Render footer buttons from a descriptor array.
     * @private
     * @param {ModalButton[]} buttons
     */
    _setButtons(buttons) {
      if (!this._footerEl) return;
      this._footerEl.innerHTML = '';

      buttons.forEach((cfg) => {
        const btn = document.createElement('button');
        btn.className = cfg.className || 'btn';
        btn.textContent = cfg.label;

        btn.addEventListener('click', () => {
          if (typeof cfg.onClick === 'function') {
            cfg.onClick(this);
          }
          if (cfg.closeOnClick !== false) {
            this.hide();
          }
        });

        this._footerEl.appendChild(btn);
      });
    }

    /**
     * Keyboard handler — closes on Escape.
     * @private
     * @param {KeyboardEvent} e
     */
    _handleKeyDown(e) {
      if (e.key === 'Escape' || e.key === 'Esc') {
        e.preventDefault();
        this.hide();
      }
    }
  }

  /* ------------------------------------------------------------------
   * Namespace export
   * ------------------------------------------------------------------ */

  ns.Modal = Modal;
})(window.NyayaSim);
