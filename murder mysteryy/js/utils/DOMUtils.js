/**
 * @file DOMUtils.js
 * @description DOM manipulation utilities for NyayaSim.
 * Provides convenience wrappers for common DOM operations including
 * element queries, creation, visibility, class manipulation, and event delegation.
 * All methods are static — no instantiation required.
 * @version 1.0.0
 */

window.NyayaSim = window.NyayaSim || {};

window.NyayaSim.DOMUtils = class DOMUtils {

  /**
   * Query a single element using CSS selector (querySelector shorthand).
   *
   * @param {string} selector - CSS selector string.
   * @param {Element|Document} [context=document] - The root element to search within.
   * @returns {Element|null} The first matching element or null.
   *
   * @example
   * const header = DOMUtils.$('.game-header');
   * const btn = DOMUtils.$('#submit-btn', modal);
   */
  static $(selector, context = document) {
    return context.querySelector(selector);
  }

  /**
   * Query all elements matching a CSS selector, returned as an Array.
   *
   * @param {string} selector - CSS selector string.
   * @param {Element|Document} [context=document] - The root element to search within.
   * @returns {Element[]} Array of matching elements (may be empty).
   *
   * @example
   * const items = DOMUtils.$$('.evidence-item');
   * items.forEach(item => item.classList.add('highlight'));
   */
  static $$(selector, context = document) {
    return Array.from(context.querySelectorAll(selector));
  }

  /**
   * Create a DOM element with attributes and children in one call.
   *
   * @param {string} tag - The HTML tag name (e.g. 'div', 'button', 'span').
   * @param {Object} [attrs={}] - Attributes and properties to set on the element.
   *   Special keys:
   *   - `className` or `class`: sets CSS classes
   *   - `style`: can be a string or an object of style properties
   *   - `dataset`: object of data-* attributes
   *   - `on` or `events`: object of { eventName: handler } to attach listeners
   *   - `innerHTML`: sets raw HTML (use with caution)
   *   - All other keys are set as attributes via setAttribute
   * @param {Array<string|Node>} [children=[]] - Child nodes or text strings to append.
   * @returns {Element} The created element.
   *
   * @example
   * const card = DOMUtils.createElement('div', {
   *   className: 'suspect-card',
   *   dataset: { suspectId: 'butler_01' },
   *   style: { opacity: '0' },
   *   on: { click: handleClick }
   * }, [
   *   DOMUtils.createElement('h3', {}, ['Col. Mustard']),
   *   DOMUtils.createElement('p', { className: 'alibi' }, ['Was in the library...'])
   * ]);
   */
  static createElement(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);

    for (const [key, value] of Object.entries(attrs)) {
      switch (key) {
        case 'className':
        case 'class':
          if (typeof value === 'string') {
            el.className = value;
          } else if (Array.isArray(value)) {
            el.className = value.filter(Boolean).join(' ');
          }
          break;

        case 'style':
          if (typeof value === 'string') {
            el.style.cssText = value;
          } else if (typeof value === 'object' && value !== null) {
            Object.assign(el.style, value);
          }
          break;

        case 'dataset':
          if (typeof value === 'object' && value !== null) {
            for (const [dataKey, dataVal] of Object.entries(value)) {
              el.dataset[dataKey] = dataVal;
            }
          }
          break;

        case 'on':
        case 'events':
          if (typeof value === 'object' && value !== null) {
            for (const [eventName, handler] of Object.entries(value)) {
              el.addEventListener(eventName, handler);
            }
          }
          break;

        case 'innerHTML':
          el.innerHTML = value;
          break;

        case 'textContent':
          el.textContent = value;
          break;

        case 'id':
          el.id = value;
          break;

        default:
          // Boolean attributes
          if (typeof value === 'boolean') {
            if (value) {
              el.setAttribute(key, '');
            }
          } else if (value != null) {
            el.setAttribute(key, String(value));
          }
          break;
      }
    }

    // Append children
    for (const child of children) {
      if (child == null) continue;
      if (typeof child === 'string' || typeof child === 'number') {
        el.appendChild(document.createTextNode(String(child)));
      } else if (child instanceof Node) {
        el.appendChild(child);
      }
    }

    return el;
  }

  /**
   * Show an element by removing the 'hidden' class and setting display.
   *
   * @param {Element} el - The element to show.
   * @param {string} [displayValue=''] - Optional display value (e.g. 'flex', 'grid').
   *   Defaults to '' which reverts to CSS-defined display.
   * @returns {void}
   */
  static show(el, displayValue = '') {
    if (!el) return;
    el.classList.remove('hidden');
    el.style.display = displayValue;
  }

  /**
   * Hide an element by adding the 'hidden' class and setting display to none.
   *
   * @param {Element} el - The element to hide.
   * @returns {void}
   */
  static hide(el) {
    if (!el) return;
    el.classList.add('hidden');
    el.style.display = 'none';
  }

  /**
   * Toggle visibility of an element.
   *
   * @param {Element} el - The element to toggle.
   * @param {boolean} [force] - Optional forced state. True = show, false = hide.
   * @returns {boolean} The new visibility state (true = visible).
   */
  static toggle(el, force) {
    if (!el) return false;

    const shouldShow = typeof force === 'boolean'
      ? force
      : el.style.display === 'none' || el.classList.contains('hidden');

    if (shouldShow) {
      DOMUtils.show(el);
    } else {
      DOMUtils.hide(el);
    }

    return shouldShow;
  }

  /**
   * Add one or more CSS classes to an element.
   *
   * @param {Element} el - Target element.
   * @param {...string} classes - CSS class names to add.
   * @returns {void}
   *
   * @example
   * DOMUtils.addClass(card, 'highlighted', 'animate-pulse');
   */
  static addClass(el, ...classes) {
    if (!el) return;
    el.classList.add(...classes.filter(Boolean));
  }

  /**
   * Remove one or more CSS classes from an element.
   *
   * @param {Element} el - Target element.
   * @param {...string} classes - CSS class names to remove.
   * @returns {void}
   */
  static removeClass(el, ...classes) {
    if (!el) return;
    el.classList.remove(...classes.filter(Boolean));
  }

  /**
   * Toggle a CSS class on an element.
   *
   * @param {Element} el - Target element.
   * @param {string} className - The CSS class to toggle.
   * @param {boolean} [force] - Optional forced state.
   * @returns {boolean} Whether the class is now present.
   */
  static toggleClass(el, className, force) {
    if (!el) return false;
    return el.classList.toggle(className, force);
  }

  /**
   * Set up event delegation on a parent element.
   * Only triggers the handler when the event target matches the given selector.
   *
   * @param {Element|string} parent - The parent element or its selector.
   * @param {string} event - The DOM event type (e.g. 'click', 'input').
   * @param {string} selector - CSS selector that child elements must match.
   * @param {Function} handler - Callback invoked with (event, matchedElement).
   * @returns {Function} A cleanup function that removes the delegated listener.
   *
   * @example
   * const cleanup = DOMUtils.delegate(
   *   '#evidence-list', 'click', '.evidence-item',
   *   (e, item) => console.log('Clicked evidence:', item.dataset.id)
   * );
   * // Later: cleanup();
   */
  static delegate(parent, event, selector, handler) {
    const parentEl = typeof parent === 'string'
      ? document.querySelector(parent)
      : parent;

    if (!parentEl) {
      console.warn(`DOMUtils.delegate: Parent element not found: ${parent}`);
      return () => {};
    }

    /** @param {Event} e */
    const delegatedHandler = (e) => {
      const target = e.target.closest(selector);
      if (target && parentEl.contains(target)) {
        handler(e, target);
      }
    };

    parentEl.addEventListener(event, delegatedHandler);

    return () => {
      parentEl.removeEventListener(event, delegatedHandler);
    };
  }

  /**
   * Batch-set multiple CSS styles on an element.
   *
   * @param {Element} el - Target element.
   * @param {Object<string, string>} styles - Object of CSS property-value pairs.
   * @returns {void}
   *
   * @example
   * DOMUtils.setStyles(overlay, {
   *   opacity: '0.8',
   *   transform: 'translateY(0)',
   *   transition: 'all 0.3s ease'
   * });
   */
  static setStyles(el, styles) {
    if (!el || typeof styles !== 'object') return;
    for (const [prop, value] of Object.entries(styles)) {
      el.style[prop] = value;
    }
  }

  /**
   * Animate an element using the Web Animations API.
   *
   * @param {Element} el - The element to animate.
   * @param {Keyframe[]|PropertyIndexedKeyframes} keyframes - Animation keyframes.
   * @param {number|KeyframeAnimationOptions} options - Duration in ms or animation options.
   * @returns {Promise<Animation>} Resolves when the animation finishes.
   *
   * @example
   * await DOMUtils.animate(card, [
   *   { opacity: 0, transform: 'scale(0.8)' },
   *   { opacity: 1, transform: 'scale(1)' }
   * ], { duration: 400, easing: 'ease-out' });
   */
  static animate(el, keyframes, options = {}) {
    if (!el || !el.animate) {
      return Promise.resolve(null);
    }

    const animOptions = typeof options === 'number'
      ? { duration: options, fill: 'forwards' }
      : { fill: 'forwards', ...options };

    const animation = el.animate(keyframes, animOptions);

    return new Promise((resolve, reject) => {
      animation.onfinish = () => resolve(animation);
      animation.oncancel = () => resolve(animation);
    });
  }

  /**
   * Wait for a CSS transition to complete on an element.
   *
   * @param {Element} el - The element to monitor.
   * @param {number} [timeout=2000] - Maximum time to wait in milliseconds.
   * @returns {Promise<void>} Resolves when the transition ends or timeout occurs.
   *
   * @example
   * el.classList.add('slide-in');
   * await DOMUtils.waitForTransition(el);
   * console.log('Transition complete');
   */
  static waitForTransition(el, timeout = 2000) {
    if (!el) return Promise.resolve();

    return new Promise((resolve) => {
      let resolved = false;

      const done = () => {
        if (resolved) return;
        resolved = true;
        el.removeEventListener('transitionend', done);
        resolve();
      };

      el.addEventListener('transitionend', done, { once: true });

      // Fallback timeout in case transitionend never fires
      setTimeout(done, timeout);
    });
  }

  /**
   * Empty all child nodes from an element.
   *
   * @param {Element} el - The element to empty.
   * @returns {void}
   */
  static empty(el) {
    if (!el) return;
    while (el.firstChild) {
      el.removeChild(el.firstChild);
    }
  }

  /**
   * Insert HTML content at a specified position relative to an element.
   *
   * @param {Element} el - The reference element.
   * @param {'beforebegin'|'afterbegin'|'beforeend'|'afterend'} position - Insertion position.
   * @param {string} html - The HTML string to insert.
   * @returns {void}
   */
  static insertHTML(el, position, html) {
    if (!el) return;
    el.insertAdjacentHTML(position, html);
  }

  /**
   * Get or set a data attribute on an element.
   *
   * @param {Element} el - Target element.
   * @param {string} key - Data attribute key (without 'data-' prefix).
   * @param {string} [value] - If provided, sets the data attribute; otherwise reads it.
   * @returns {string|void} The data attribute value when reading, void when setting.
   */
  static data(el, key, value) {
    if (!el) return undefined;
    if (value === undefined) {
      return el.dataset[key];
    }
    el.dataset[key] = value;
  }
};
