/**
 * @fileoverview Toast — stackable notification toasts for NyayaSim.
 *
 * Features:
 *   • Four types: evidence, clue, warning, info — each with a distinct
 *     left-border colour defined via CSS modifier classes.
 *   • Auto-dismiss after a configurable duration (default 4 s).
 *   • Vertical stacking — newest toast appears at the top.
 *   • Slide-in / slide-out CSS animation via the `.show` class.
 *   • Manual dismiss by clicking the toast.
 *
 * CSS contract:
 *   .toast-container   – fixed-position stack wrapper
 *   .toast             – individual toast element
 *   .toast.show        – visible state (triggers slide-in)
 *   .toast-icon        – leading icon area
 *   .toast-content     – text wrapper
 *   .toast-title       – bold heading
 *   .toast-message     – body text
 *   .toast-evidence    – evidence type modifier
 *   .toast-clue        – clue type modifier
 *   .toast-warning     – warning type modifier
 *   .toast-info        – info type modifier
 *
 * @module ui/components/Toast
 */

window.NyayaSim = window.NyayaSim || {};

(function (ns) {
  'use strict';

  /**
   * @readonly
   * @enum {string}
   */
  const ToastType = Object.freeze({
    EVIDENCE: 'evidence',
    CLUE: 'clue',
    WARNING: 'warning',
    INFO: 'info',
  });

  /**
   * Default icons per toast type (emoji-based; swap for SVG paths as needed).
   * @type {Record<string, string>}
   */
  const TOAST_ICONS = Object.freeze({
    [ToastType.EVIDENCE]: '🔍',
    [ToastType.CLUE]: '💡',
    [ToastType.WARNING]: '⚠️',
    [ToastType.INFO]: 'ℹ️',
  });

  /** Default auto-dismiss duration in milliseconds. */
  const DEFAULT_DURATION_MS = 4000;

  /** Slide-out animation duration in ms — kept in sync with CSS. */
  const SLIDE_OUT_MS = 300;

  /** Maximum number of visible toasts before oldest are evicted. */
  const MAX_VISIBLE = 6;

  /**
   * @typedef {object} ToastEntry
   * @property {string}      id         - Unique identifier.
   * @property {HTMLElement}  element    - DOM node.
   * @property {number|null}  timerId   - Auto-dismiss setTimeout id.
   */

  /**
   * Toast notification manager.
   */
  class Toast {
    /**
     * @param {HTMLElement} container - Parent element (usually `document.body`).
     * @param {import('../../core/EventBus').EventBus} eventBus - Application event bus.
     * @param {object} [options]
     * @param {number}  [options.duration=4000]    - Auto-dismiss duration in ms.
     * @param {number}  [options.maxVisible=6]     - Max simultaneous toasts.
     * @param {string}  [options.position='top-right'] - Reserved for future use.
     */
    constructor(container, eventBus, options = {}) {
      /** @private @type {HTMLElement} */
      this._container = container;

      /** @private @type {import('../../core/EventBus').EventBus} */
      this._eventBus = eventBus;

      /** @private @type {number} */
      this._duration = options.duration ?? DEFAULT_DURATION_MS;

      /** @private @type {number} */
      this._maxVisible = options.maxVisible ?? MAX_VISIBLE;

      /**
       * Ordered list of active toasts (newest first).
       * @private @type {ToastEntry[]}
       */
      this._toasts = [];

      /**
       * Auto-incrementing counter for unique ids.
       * @private @type {number}
       */
      this._idCounter = 0;

      /**
       * The wrapper element that holds all toast DOM nodes.
       * @private @type {HTMLElement|null}
       */
      this._wrapperEl = null;

      /**
       * Bound listeners for teardown.
       * @private @type {Array<{event: string, handler: Function}>}
       */
      this._listeners = [];

      this._init();
    }

    /* ------------------------------------------------------------------
     * Lifecycle
     * ------------------------------------------------------------------ */

    /**
     * Create the toast container wrapper in the DOM.
     */
    render() {
      if (this._wrapperEl) return;

      this._wrapperEl = document.createElement('div');
      this._wrapperEl.className = 'toast-container';
      this._wrapperEl.setAttribute('aria-live', 'polite');
      this._wrapperEl.setAttribute('aria-atomic', 'false');

      this._container.appendChild(this._wrapperEl);
    }

    /**
     * Bulk-show toasts from an external data source.
     *
     * @param {object} data
     * @param {Array<{title: string, message: string, type?: string}>} [data.notifications]
     */
    update(data = {}) {
      if (Array.isArray(data.notifications)) {
        data.notifications.forEach((n) =>
          this.show(n.title, n.message, n.type)
        );
      }
    }

    /**
     * Remove all active toasts and the container element.
     */
    destroy() {
      // Clear all timers
      this._toasts.forEach((t) => {
        if (t.timerId !== null) clearTimeout(t.timerId);
      });
      this._toasts = [];

      // Remove DOM
      if (this._wrapperEl && this._wrapperEl.parentNode) {
        this._wrapperEl.parentNode.removeChild(this._wrapperEl);
      }
      this._wrapperEl = null;

      // Unbind event bus
      this._listeners.forEach(({ event, handler }) => {
        this._eventBus.off(event, handler);
      });
      this._listeners = [];
    }

    /* ------------------------------------------------------------------
     * Public API
     * ------------------------------------------------------------------ */

    /**
     * Display a toast notification.
     *
     * @param {string} title   - Bold heading text.
     * @param {string} message - Body message.
     * @param {string} [type='info'] - One of 'evidence' | 'clue' | 'warning' | 'info'.
     * @param {object} [options]
     * @param {number} [options.duration] - Override default auto-dismiss (ms). Pass 0 for sticky.
     * @returns {string} The unique toast id (can be used with `dismiss`).
     */
    show(title, message, type = ToastType.INFO, options = {}) {
      if (!this._wrapperEl) this.render();

      const id = `toast-${++this._idCounter}`;
      const safeType = Object.values(ToastType).includes(type)
        ? type
        : ToastType.INFO;

      // --- Build DOM ---
      const toastEl = document.createElement('div');
      toastEl.className = `toast toast-${safeType}`;
      toastEl.setAttribute('role', 'status');
      toastEl.dataset.toastId = id;

      // Icon
      const iconEl = document.createElement('span');
      iconEl.className = 'toast-icon';
      iconEl.textContent = TOAST_ICONS[safeType] || TOAST_ICONS[ToastType.INFO];

      // Content wrapper
      const contentEl = document.createElement('div');
      contentEl.className = 'toast-content';

      const titleEl = document.createElement('strong');
      titleEl.className = 'toast-title';
      titleEl.textContent = title;

      const msgEl = document.createElement('p');
      msgEl.className = 'toast-message';
      msgEl.textContent = message;

      contentEl.appendChild(titleEl);
      contentEl.appendChild(msgEl);

      toastEl.appendChild(iconEl);
      toastEl.appendChild(contentEl);

      // Click to dismiss
      toastEl.addEventListener('click', () => this.dismiss(id));

      // Prepend (newest on top)
      this._wrapperEl.prepend(toastEl);

      // Trigger slide-in after one frame so the transition fires
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          toastEl.classList.add('show');
        });
      });

      // Auto-dismiss timer
      const dismissDuration =
        options.duration !== undefined ? options.duration : this._duration;
      let timerId = null;
      if (dismissDuration > 0) {
        timerId = setTimeout(() => this.dismiss(id), dismissDuration);
      }

      /** @type {ToastEntry} */
      const entry = { id, element: toastEl, timerId };
      this._toasts.unshift(entry);

      // Evict oldest if we exceed the cap
      this._evictOverflow();

      this._eventBus.emit('toast:shown', { id, title, type: safeType });

      return id;
    }

    /**
     * Programmatically dismiss a toast by its id.
     *
     * @param {string} id - The toast id returned by `show()`.
     */
    dismiss(id) {
      const idx = this._toasts.findIndex((t) => t.id === id);
      if (idx === -1) return;

      const entry = this._toasts[idx];
      if (entry.timerId !== null) {
        clearTimeout(entry.timerId);
        entry.timerId = null;
      }

      // Slide-out
      entry.element.classList.remove('show');

      setTimeout(() => {
        if (entry.element.parentNode) {
          entry.element.parentNode.removeChild(entry.element);
        }
        this._toasts = this._toasts.filter((t) => t.id !== id);
        this._eventBus.emit('toast:dismissed', { id });
      }, SLIDE_OUT_MS);
    }

    /**
     * Dismiss all active toasts.
     */
    dismissAll() {
      // Copy array because dismiss mutates it
      [...this._toasts].forEach((t) => this.dismiss(t.id));
    }

    /* ------------------------------------------------------------------
     * Convenience shortcuts
     * ------------------------------------------------------------------ */

    /**
     * Show an evidence-type toast.
     * @param {string} title
     * @param {string} message
     * @returns {string} toast id
     */
    evidence(title, message) {
      return this.show(title, message, ToastType.EVIDENCE);
    }

    /**
     * Show a clue-type toast.
     * @param {string} title
     * @param {string} message
     * @returns {string} toast id
     */
    clue(title, message) {
      return this.show(title, message, ToastType.CLUE);
    }

    /**
     * Show a warning-type toast.
     * @param {string} title
     * @param {string} message
     * @returns {string} toast id
     */
    warning(title, message) {
      return this.show(title, message, ToastType.WARNING);
    }

    /**
     * Show an info-type toast.
     * @param {string} title
     * @param {string} message
     * @returns {string} toast id
     */
    info(title, message) {
      return this.show(title, message, ToastType.INFO);
    }

    /* ------------------------------------------------------------------
     * Private helpers
     * ------------------------------------------------------------------ */

    /**
     * Wire up event bus listeners.
     * @private
     */
    _init() {
      /** @param {{title: string, message: string, type?: string}} payload */
      const onToast = ({ title, message, type }) =>
        this.show(title, message, type);

      this._eventBus.on('toast:show', onToast);
      this._listeners.push({ event: 'toast:show', handler: onToast });
    }

    /**
     * Remove excess toasts when the stack exceeds `_maxVisible`.
     * @private
     */
    _evictOverflow() {
      while (this._toasts.length > this._maxVisible) {
        const oldest = this._toasts[this._toasts.length - 1];
        this.dismiss(oldest.id);
      }
    }
  }

  /* ------------------------------------------------------------------
   * Namespace exports
   * ------------------------------------------------------------------ */

  ns.Toast = Toast;
  ns.ToastType = ToastType;
})(window.NyayaSim);
