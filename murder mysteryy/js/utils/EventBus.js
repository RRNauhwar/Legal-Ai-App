/**
 * @file EventBus.js
 * @description Pub/sub event system for NyayaSim game engine.
 * Provides decoupled communication between game modules via events.
 * Supports wildcard listeners, one-time subscriptions, and namespaced events.
 * @version 1.0.0
 */

window.NyayaSim = window.NyayaSim || {};

window.NyayaSim.EventBus = class EventBus {

  /**
   * Create a new EventBus instance.
   */
  constructor() {
    /**
     * Map of event names to Sets of callback functions.
     * @type {Map<string, Set<Function>>}
     * @private
     */
    this._listeners = new Map();

    /**
     * Set of one-time listener wrappers for cleanup tracking.
     * Maps the original callback to its wrapper so `off` still works.
     * @type {Map<string, Map<Function, Function>>}
     * @private
     */
    this._onceWrappers = new Map();

    /**
     * Event emission history for debugging (last N events).
     * @type {Array<{event: string, timestamp: number, data: *}>}
     * @private
     */
    this._history = [];

    /**
     * Maximum number of events to retain in history.
     * @type {number}
     * @private
     */
    this._historyLimit = 100;
  }

  /**
   * Subscribe to an event.
   *
   * @param {string} event - The event name to listen for. Use '*' to listen to all events.
   * @param {Function} callback - The callback function to invoke when the event is emitted.
   *   Receives (data, eventName) as arguments.
   * @returns {Function} An unsubscribe function. Call it to remove this listener.
   * @throws {TypeError} If event is not a string or callback is not a function.
   *
   * @example
   * const unsub = eventBus.on('player:moved', (data) => {
   *   console.log('Player moved to', data.position);
   * });
   * // Later: unsub();
   */
  on(event, callback) {
    if (typeof event !== 'string' || event.length === 0) {
      throw new TypeError('EventBus.on: event must be a non-empty string.');
    }
    if (typeof callback !== 'function') {
      throw new TypeError('EventBus.on: callback must be a function.');
    }

    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }

    this._listeners.get(event).add(callback);

    // Return an unsubscribe function
    return () => this.off(event, callback);
  }

  /**
   * Unsubscribe a callback from an event.
   *
   * @param {string} event - The event name to unsubscribe from.
   * @param {Function} callback - The callback to remove.
   * @returns {boolean} True if the callback was found and removed, false otherwise.
   *
   * @example
   * eventBus.off('player:moved', myHandler);
   */
  off(event, callback) {
    if (typeof event !== 'string' || typeof callback !== 'function') {
      return false;
    }

    const listeners = this._listeners.get(event);
    if (!listeners) return false;

    // Check if this callback was registered as a `once` listener
    const onceMap = this._onceWrappers.get(event);
    if (onceMap && onceMap.has(callback)) {
      const wrapper = onceMap.get(callback);
      listeners.delete(wrapper);
      onceMap.delete(callback);
      if (onceMap.size === 0) {
        this._onceWrappers.delete(event);
      }
      return true;
    }

    const deleted = listeners.delete(callback);

    // Clean up empty sets
    if (listeners.size === 0) {
      this._listeners.delete(event);
    }

    return deleted;
  }

  /**
   * Emit an event, notifying all subscribed listeners.
   * Wildcard ('*') listeners are also notified for every event.
   *
   * @param {string} event - The event name to emit.
   * @param {*} [data] - Optional data payload to pass to listeners.
   * @returns {number} The number of listeners that were invoked.
   *
   * @example
   * eventBus.emit('evidence:collected', { evidenceId: 'knife_01', scene: 'kitchen' });
   */
  emit(event, data) {
    if (typeof event !== 'string' || event.length === 0) {
      throw new TypeError('EventBus.emit: event must be a non-empty string.');
    }

    let invokedCount = 0;

    // Record in history
    this._history.push({
      event,
      timestamp: Date.now(),
      data
    });
    if (this._history.length > this._historyLimit) {
      this._history.shift();
    }

    // Notify direct listeners
    const listeners = this._listeners.get(event);
    if (listeners) {
      for (const callback of [...listeners]) {
        try {
          callback(data, event);
          invokedCount++;
        } catch (err) {
          console.error(`EventBus: Error in listener for "${event}":`, err);
        }
      }
    }

    // Notify wildcard listeners (skip if the event itself is '*')
    if (event !== '*') {
      const wildcardListeners = this._listeners.get('*');
      if (wildcardListeners) {
        for (const callback of [...wildcardListeners]) {
          try {
            callback(data, event);
            invokedCount++;
          } catch (err) {
            console.error(`EventBus: Error in wildcard listener for "${event}":`, err);
          }
        }
      }
    }

    return invokedCount;
  }

  /**
   * Subscribe to an event, but only fire the callback once.
   * The listener is automatically removed after the first invocation.
   *
   * @param {string} event - The event name to listen for.
   * @param {Function} callback - The callback function to invoke once.
   * @returns {Function} An unsubscribe function in case you want to cancel before it fires.
   *
   * @example
   * eventBus.once('case:loaded', (caseData) => {
   *   console.log('Case loaded:', caseData.title);
   * });
   */
  once(event, callback) {
    if (typeof event !== 'string' || event.length === 0) {
      throw new TypeError('EventBus.once: event must be a non-empty string.');
    }
    if (typeof callback !== 'function') {
      throw new TypeError('EventBus.once: callback must be a function.');
    }

    /** @type {Function} */
    const wrapper = (data, eventName) => {
      this.off(event, wrapper);
      // Clean up once wrapper mapping
      const onceMap = this._onceWrappers.get(event);
      if (onceMap) {
        onceMap.delete(callback);
        if (onceMap.size === 0) {
          this._onceWrappers.delete(event);
        }
      }
      callback(data, eventName);
    };

    // Store mapping so off(event, originalCallback) still works
    if (!this._onceWrappers.has(event)) {
      this._onceWrappers.set(event, new Map());
    }
    this._onceWrappers.get(event).set(callback, wrapper);

    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(wrapper);

    return () => this.off(event, callback);
  }

  /**
   * Remove all listeners for a specific event, or all listeners entirely.
   *
   * @param {string} [event] - Optional event name. If omitted, removes ALL listeners.
   * @returns {void}
   *
   * @example
   * // Remove all listeners for a specific event
   * eventBus.removeAllListeners('player:moved');
   *
   * // Remove absolutely all listeners
   * eventBus.removeAllListeners();
   */
  removeAllListeners(event) {
    if (typeof event === 'string') {
      this._listeners.delete(event);
      this._onceWrappers.delete(event);
    } else {
      this._listeners.clear();
      this._onceWrappers.clear();
    }
  }

  /**
   * Get the number of listeners for a specific event.
   *
   * @param {string} event - The event name to count listeners for.
   * @returns {number} The number of registered listeners.
   */
  listenerCount(event) {
    const listeners = this._listeners.get(event);
    return listeners ? listeners.size : 0;
  }

  /**
   * Get all registered event names (excluding wildcard).
   *
   * @returns {string[]} Array of event names that have at least one listener.
   */
  eventNames() {
    return [...this._listeners.keys()];
  }

  /**
   * Get recent event emission history for debugging.
   *
   * @param {number} [count=10] - Number of recent events to return.
   * @returns {Array<{event: string, timestamp: number, data: *}>}
   */
  getHistory(count = 10) {
    return this._history.slice(-count);
  }

  /**
   * Clear event emission history.
   * @returns {void}
   */
  clearHistory() {
    this._history = [];
  }
};
