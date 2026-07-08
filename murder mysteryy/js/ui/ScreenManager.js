/**
 * @fileoverview ScreenManager — manages screen visibility, transitions, and
 * back-navigation for NyayaSim.
 *
 * Screens: loading, menu, case-select, briefing, game, results.
 *
 * CSS contract:
 *   .screen              – base class for every screen element
 *   .screen.active        – currently visible screen
 *   .screen-enter         – entrance transition class (added on show)
 *   .screen-exit          – exit transition class (added on hide)
 *   .loading-screen       – loading splash
 *   .menu-screen          – main menu
 *   .case-select-screen   – case catalogue
 *   .briefing-screen      – pre-game briefing
 *   .game-layout          – main investigation view
 *   .results-screen       – end-of-case results
 *
 * @module ui/ScreenManager
 */

window.NyayaSim = window.NyayaSim || {};

(function (ns) {
  'use strict';

  /**
   * @readonly
   * @enum {string}
   */
  const ScreenId = Object.freeze({
    LOADING: 'loading',
    MENU: 'menu',
    CASE_SELECT: 'case-select',
    BRIEFING: 'briefing',
    GAME: 'game',
    RESULTS: 'results',
  });

  /**
   * Maps a ScreenId to its corresponding CSS class.
   * @type {Record<string, string>}
   */
  const SCREEN_CSS_MAP = Object.freeze({
    [ScreenId.LOADING]: 'loading-screen',
    [ScreenId.MENU]: 'menu-screen',
    [ScreenId.CASE_SELECT]: 'case-select-screen',
    [ScreenId.BRIEFING]: 'briefing-screen',
    [ScreenId.GAME]: 'game-layout',
    [ScreenId.RESULTS]: 'results-screen',
  });

  /** Default transition duration in ms — kept in sync with CSS. */
  const TRANSITION_DURATION_MS = 400;

  /**
   * Manages screen visibility with animated transitions and a history stack
   * for back-navigation.
   */
  class ScreenManager {
    /**
     * @param {HTMLElement} container - Root DOM element that contains all screens.
     * @param {import('../core/EventBus').EventBus} eventBus - Application event bus.
     * @param {object} [options]
     * @param {number} [options.transitionDuration=400] - Transition time in ms.
     */
    constructor(container, eventBus, options = {}) {
      /** @private @type {HTMLElement} */
      this._container = container;

      /** @private @type {import('../core/EventBus').EventBus} */
      this._eventBus = eventBus;

      /** @private @type {number} */
      this._transitionDuration =
        options.transitionDuration ?? TRANSITION_DURATION_MS;

      /**
       * Registry of screen elements keyed by ScreenId.
       * @private @type {Map<string, HTMLElement>}
       */
      this._screens = new Map();

      /**
       * Currently active screen id.
       * @private @type {string|null}
       */
      this._activeScreenId = null;

      /**
       * History stack for back navigation (does NOT include current screen).
       * @private @type {string[]}
       */
      this._history = [];

      /**
       * Guard flag to prevent overlapping transitions.
       * @private @type {boolean}
       */
      this._transitioning = false;

      /**
       * Bound listeners kept for teardown.
       * @private @type {Array<{event: string, handler: Function}>}
       */
      this._listeners = [];

      this._init();
    }

    /* ------------------------------------------------------------------
     * Lifecycle
     * ------------------------------------------------------------------ */

    /**
     * Renders the initial screen state (all hidden).  Call once after
     * construction to set up DOM references.
     */
    render() {
      // Ensure every screen starts hidden
      this._screens.forEach((el) => {
        el.classList.remove('active', 'screen-enter', 'screen-exit');
      });
    }

    /**
     * Update the manager with external data (e.g. forced screen change
     * from a parent controller).
     *
     * @param {object} data
     * @param {string} [data.screen] - Screen id to navigate to.
     * @param {boolean} [data.clearHistory] - Clear the history stack first.
     */
    update(data = {}) {
      if (data.clearHistory) {
        this._history = [];
      }
      if (data.screen) {
        this.navigateTo(data.screen);
      }
    }

    /**
     * Tears down all listeners and internal references.
     */
    destroy() {
      this._listeners.forEach(({ event, handler }) => {
        this._eventBus.off(event, handler);
      });
      this._listeners = [];
      this._screens.clear();
      this._history = [];
      this._activeScreenId = null;
    }

    /* ------------------------------------------------------------------
     * Public API
     * ------------------------------------------------------------------ */

    /**
     * Navigate to a screen by id.  The current screen (if any) is pushed
     * onto the history stack before transitioning.
     *
     * @param {string} screenId - One of ScreenId values.
     * @param {object} [options]
     * @param {boolean} [options.pushHistory=true] - Push current screen to history.
     * @returns {Promise<void>} Resolves when the transition completes.
     */
    async navigateTo(screenId, { pushHistory = true } = {}) {
      if (this._transitioning) return;
      if (screenId === this._activeScreenId) return;

      const target = this._screens.get(screenId);
      if (!target) {
        console.warn(`[ScreenManager] Unknown screen: "${screenId}"`);
        return;
      }

      this._transitioning = true;

      const previous = this._activeScreenId
        ? this._screens.get(this._activeScreenId)
        : null;

      // Push old screen onto history
      if (pushHistory && this._activeScreenId) {
        this._history.push(this._activeScreenId);
      }

      this._eventBus.emit('screen:before-change', {
        from: this._activeScreenId,
        to: screenId,
      });

      // --- Exit current screen ---
      if (previous) {
        previous.classList.add('screen-exit');
        await this._waitForTransition(previous, 'screen-exit');
        previous.classList.remove('active', 'screen-exit');
      }

      // --- Enter new screen ---
      target.classList.add('active', 'screen-enter');
      this._activeScreenId = screenId;

      // Force reflow so the browser picks up the starting state
      // eslint-disable-next-line no-unused-expressions
      target.offsetHeight;

      await this._waitForTransition(target, 'screen-enter');
      target.classList.remove('screen-enter');

      this._transitioning = false;

      this._eventBus.emit('screen:changed', {
        from: this._activeScreenId,
        to: screenId,
      });
    }

    /**
     * Navigate back through the history stack.
     *
     * @returns {Promise<void>}
     */
    async goBack() {
      if (this._history.length === 0) return;
      const previousId = this._history.pop();
      await this.navigateTo(previousId, { pushHistory: false });
    }

    /**
     * Returns the currently active screen id.
     *
     * @returns {string|null}
     */
    getActiveScreen() {
      return this._activeScreenId;
    }

    /**
     * Returns a shallow copy of the history stack.
     *
     * @returns {string[]}
     */
    getHistory() {
      return [...this._history];
    }

    /**
     * Returns true if there is at least one entry in the history stack.
     *
     * @returns {boolean}
     */
    canGoBack() {
      return this._history.length > 0;
    }

    /**
     * Programmatically register a screen element.  Useful for lazily
     * created screens that don't exist at init time.
     *
     * @param {string} screenId
     * @param {HTMLElement} element
     */
    registerScreen(screenId, element) {
      if (!element) return;
      element.classList.add('screen');
      this._screens.set(screenId, element);
    }

    /* ------------------------------------------------------------------
     * Private helpers
     * ------------------------------------------------------------------ */

    /**
     * Discover and cache screen elements, wire up event bus listeners.
     * @private
     */
    _init() {
      // Auto-discover screens from the DOM via the CSS-class map
      Object.entries(SCREEN_CSS_MAP).forEach(([id, cssClass]) => {
        const el = this._container.querySelector(`.${cssClass}`);
        if (el) {
          el.classList.add('screen');
          this._screens.set(id, el);
        }
      });

      // Wire event bus shortcuts
      /** @param {{screen: string}} payload */
      const onNavigate = ({ screen }) => this.navigateTo(screen);
      this._eventBus.on('screen:navigate', onNavigate);
      this._listeners.push({ event: 'screen:navigate', handler: onNavigate });

      const onBack = () => this.goBack();
      this._eventBus.on('screen:back', onBack);
      this._listeners.push({ event: 'screen:back', handler: onBack });
    }

    /**
     * Returns a promise that resolves after the CSS transition finishes on
     * the element, or after the configured timeout — whichever fires first.
     *
     * @private
     * @param {HTMLElement} element
     * @param {string} _animClass - Currently unused; reserved for future per-class durations.
     * @returns {Promise<void>}
     */
    _waitForTransition(element, _animClass) {
      return new Promise((resolve) => {
        let settled = false;

        const done = () => {
          if (settled) return;
          settled = true;
          element.removeEventListener('transitionend', onEnd);
          element.removeEventListener('animationend', onEnd);
          resolve();
        };

        /** @param {TransitionEvent|AnimationEvent} e */
        const onEnd = (e) => {
          if (e.target !== element) return;
          done();
        };

        element.addEventListener('transitionend', onEnd);
        element.addEventListener('animationend', onEnd);

        // Safety timeout in case the CSS transition / animation is missing
        setTimeout(done, this._transitionDuration + 50);
      });
    }
  }

  /* ------------------------------------------------------------------
   * Namespace exports
   * ------------------------------------------------------------------ */

  ns.ScreenManager = ScreenManager;
  ns.ScreenId = ScreenId;
})(window.NyayaSim);
