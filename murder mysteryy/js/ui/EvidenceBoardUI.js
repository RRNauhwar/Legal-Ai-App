/**
 * @file EvidenceBoardUI.js
 * @description Drag-and-connect evidence board for NyayaSim murder mystery.
 * Provides a large canvas with pannable/zoomable workspace, draggable evidence
 * nodes, SVG connection lines between ports, a minimap, and filter toolbar.
 *
 * @namespace window.NyayaSim
 */
(function (ns) {
  'use strict';

  // ── Constants ──────────────────────────────────────────────────────────────

  /** @const {number} */
  const CANVAS_W = 4000;
  /** @const {number} */
  const CANVAS_H = 3000;
  /** @const {number} */
  const MIN_ZOOM = 0.25;
  /** @const {number} */
  const MAX_ZOOM = 2.0;
  /** @const {number} */
  const ZOOM_STEP = 0.05;
  /** @const {number} */
  const MINIMAP_W = 200;
  /** @const {number} */
  const MINIMAP_H = 150;

  /**
   * Icon SVG paths keyed by node type.
   * @const {Object<string, string>}
   */
  const TYPE_ICONS = {
    person:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="7" r="4"/><path d="M5.5 21a6.5 6.5 0 0 1 13 0"/></svg>',
    evidence: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M3 9h18"/></svg>',
    location: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>',
    timeline: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
    weapon:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 3L3 14.5 5.5 17 17 5.5z"/><path d="M14.5 3l3 3-1.5 1.5 3 3 1.5-1.5L22 11l-4 4-6-6z"/></svg>',
    motive:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/></svg>'
  };

  /**
   * Display labels for connection types.
   * @const {Object<string, string>}
   */
  const CONNECTION_LABELS = {
    links:        'Links',
    contradicts:  'Contradicts',
    proves:       'Proves',
    disproves:    'Disproves',
    timeline:     'Timeline'
  };

  /**
   * Filter definitions for the toolbar.
   * @const {Array<{key: string, label: string}>}
   */
  const FILTERS = [
    { key: 'all',      label: 'All' },
    { key: 'person',   label: 'People' },
    { key: 'evidence', label: 'Evidence' },
    { key: 'location', label: 'Locations' },
    { key: 'timeline', label: 'Timeline' },
    { key: 'weapon',   label: 'Weapons' },
    { key: 'motive',   label: 'Motives' }
  ];

  // ── Helpers ────────────────────────────────────────────────────────────────

  /**
   * Create a DOM element with optional class names.
   * @param {string} tag
   * @param {string} [className]
   * @param {string} [html]
   * @returns {HTMLElement}
   */
  function el(tag, className, html) {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  /**
   * Create an SVG element in the SVG namespace.
   * @param {string} tag
   * @param {Object<string, string>} [attrs]
   * @returns {SVGElement}
   */
  function svg(tag, attrs) {
    const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
    if (attrs) Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
    return e;
  }

  /**
   * Generate a short unique id.
   * @returns {string}
   */
  function uid() {
    return 'n_' + Math.random().toString(36).slice(2, 10);
  }

  /**
   * Clamp a number between min and max.
   * @param {number} val
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  // ── EvidenceBoardUI ────────────────────────────────────────────────────────

  /**
   * Interactive evidence board with drag-and-connect functionality.
   *
   * @class EvidenceBoardUI
   * @param {HTMLElement} container - Parent DOM element to render into.
   * @param {Object} eventBus - Event emitter with on/off/emit methods.
   */
  class EvidenceBoardUI {
    /**
     * @param {HTMLElement} container
     * @param {Object} eventBus
     */
    constructor(container, eventBus) {
      /** @type {HTMLElement} */
      this.container = container;
      /** @type {Object} */
      this.bus = eventBus;

      // ── State ──────────────────────────────────────────────────────────
      /** @type {Map<string, BoardNode>} */
      this._nodes = new Map();
      /** @type {Array<Connection>} */
      this._connections = [];
      /** @type {string} */
      this._activeFilter = 'all';
      /** @type {number} */
      this._zoom = 1;
      /** @type {{x: number, y: number}} */
      this._pan = { x: 0, y: 0 };
      /** @type {string|null} */
      this._selectedNodeId = null;

      // Drag / pan state
      /** @private */
      this._isPanning = false;
      /** @private */
      this._panStart = { x: 0, y: 0 };
      /** @private */
      this._panOrigin = { x: 0, y: 0 };
      /** @private */
      this._dragNode = null;
      /** @private */
      this._dragOffset = { x: 0, y: 0 };

      // Connection-drawing state
      /** @private */
      this._drawingConnection = false;
      /** @private */
      this._connSourcePort = null;
      /** @private */
      this._connSourceNodeId = null;
      /** @private */
      this._tempLine = null;

      // DOM refs populated in render()
      /** @type {HTMLElement|null} */
      this._root = null;
      /** @type {HTMLElement|null} */
      this._canvasInner = null;
      /** @type {SVGElement|null} */
      this._svgLayer = null;
      /** @type {HTMLElement|null} */
      this._minimapEl = null;
      /** @type {HTMLElement|null} */
      this._minimapViewport = null;

      // Bound listeners for cleanup
      /** @private */
      this._boundHandlers = {};
    }

    // ── Lifecycle ──────────────────────────────────────────────────────────

    /**
     * Build the entire evidence board DOM and attach event listeners.
     * @returns {void}
     */
    render() {
      this._root = el('div', 'evidence-board');

      // ── Toolbar ──────────────────────────────────────────────────────
      const toolbar = el('div', 'board-toolbar');
      const toolbarLeft = el('div', 'board-toolbar-left');
      const toolbarRight = el('div', 'board-toolbar-right');

      const filterWrap = el('div', 'board-filter');
      FILTERS.forEach(f => {
        const btn = el('button', 'board-filter-btn', f.label);
        btn.dataset.filter = f.key;
        if (f.key === this._activeFilter) btn.classList.add('active');
        btn.addEventListener('click', () => this._setFilter(f.key));
        filterWrap.appendChild(btn);
      });
      toolbarLeft.appendChild(filterWrap);

      // Zoom controls
      const zoomOut = el('button', 'board-filter-btn', '−');
      zoomOut.title = 'Zoom Out';
      zoomOut.addEventListener('click', () => this._setZoom(this._zoom - ZOOM_STEP * 4));
      const zoomIn = el('button', 'board-filter-btn', '+');
      zoomIn.title = 'Zoom In';
      zoomIn.addEventListener('click', () => this._setZoom(this._zoom + ZOOM_STEP * 4));
      const zoomReset = el('button', 'board-filter-btn', 'Reset');
      zoomReset.addEventListener('click', () => { this._setZoom(1); this._pan = { x: 0, y: 0 }; this._applyTransform(); });
      toolbarRight.append(zoomOut, zoomIn, zoomReset);

      toolbar.append(toolbarLeft, toolbarRight);
      this._root.appendChild(toolbar);

      // ── Canvas ───────────────────────────────────────────────────────
      const canvas = el('div', 'board-canvas');
      const inner = el('div', 'board-canvas-inner');
      inner.style.width = CANVAS_W + 'px';
      inner.style.height = CANVAS_H + 'px';

      // SVG connections layer
      const svgEl = svg('svg', {
        class: 'board-connections',
        width: String(CANVAS_W),
        height: String(CANVAS_H)
      });
      inner.appendChild(svgEl);
      this._svgLayer = svgEl;

      this._canvasInner = inner;
      canvas.appendChild(inner);
      this._root.appendChild(canvas);

      // ── Minimap ──────────────────────────────────────────────────────
      const minimap = el('div', 'board-minimap');
      minimap.style.width = MINIMAP_W + 'px';
      minimap.style.height = MINIMAP_H + 'px';
      const viewport = el('div', 'minimap-viewport');
      minimap.appendChild(viewport);
      this._minimapEl = minimap;
      this._minimapViewport = viewport;
      this._root.appendChild(minimap);

      // ── Instructions overlay ─────────────────────────────────────────
      const instructions = el('div', 'board-instructions',
        '<p><strong>Pan</strong> — Drag the background</p>' +
        '<p><strong>Zoom</strong> — Scroll wheel</p>' +
        '<p><strong>Connect</strong> — Drag from port to port</p>' +
        '<p><strong>Select</strong> — Click a node</p>'
      );
      const dismissBtn = el('button', 'board-filter-btn', 'Got it');
      dismissBtn.addEventListener('click', () => instructions.remove());
      instructions.appendChild(dismissBtn);
      this._root.appendChild(instructions);

      // ── Attach to container ──────────────────────────────────────────
      this.container.appendChild(this._root);

      // ── Events ───────────────────────────────────────────────────────
      this._attachCanvasEvents(canvas);
      this._attachBusListeners();
      this._applyTransform();
      this._updateMinimap();
    }

    /**
     * Update the board with new data.
     * @param {Object} data
     * @param {Array<NodeData>} [data.nodes]
     * @param {Array<ConnectionData>} [data.connections]
     * @returns {void}
     */
    update(data) {
      if (!data) return;
      if (data.nodes) {
        // Clear existing nodes
        this._nodes.forEach(n => n.el.remove());
        this._nodes.clear();
        data.nodes.forEach(n => this._addNode(n));
      }
      if (data.connections) {
        this._connections = [];
        this._clearSVG();
        data.connections.forEach(c => this._addConnection(c));
      }
      this._applyFilter();
      this._updateMinimap();
    }

    /**
     * Tear down the board, remove listeners and DOM.
     * @returns {void}
     */
    destroy() {
      this._detachBusListeners();
      if (this._root) {
        this._root.remove();
        this._root = null;
      }
      this._nodes.clear();
      this._connections = [];
    }

    // ── Filter ─────────────────────────────────────────────────────────────

    /**
     * Set the active filter and refresh visibility.
     * @param {string} key
     * @private
     */
    _setFilter(key) {
      this._activeFilter = key;
      this._root.querySelectorAll('.board-filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === key);
      });
      this._applyFilter();
      this.bus.emit('board:filter-changed', { filter: key });
    }

    /**
     * Show/hide nodes based on active filter.
     * @private
     */
    _applyFilter() {
      this._nodes.forEach(node => {
        const visible = this._activeFilter === 'all' || node.type === this._activeFilter;
        node.el.style.display = visible ? '' : 'none';
      });
      this._redrawConnections();
    }

    // ── Zoom / Pan ─────────────────────────────────────────────────────────

    /**
     * Set zoom level and apply transform.
     * @param {number} z
     * @private
     */
    _setZoom(z) {
      this._zoom = clamp(z, MIN_ZOOM, MAX_ZOOM);
      this._applyTransform();
      this._updateMinimap();
    }

    /**
     * Apply current pan + zoom to the inner canvas.
     * @private
     */
    _applyTransform() {
      if (!this._canvasInner) return;
      this._canvasInner.style.transform =
        `translate(${this._pan.x}px, ${this._pan.y}px) scale(${this._zoom})`;
      this._canvasInner.style.transformOrigin = '0 0';
    }

    // ── Canvas Events ──────────────────────────────────────────────────────

    /**
     * Wire up mouse/wheel events on the canvas viewport.
     * @param {HTMLElement} canvas
     * @private
     */
    _attachCanvasEvents(canvas) {
      // Wheel zoom
      canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
        this._setZoom(this._zoom + delta);
      }, { passive: false });

      // Mousedown — decide: pan, drag node, or draw connection
      canvas.addEventListener('mousedown', (e) => {
        // Connection port?
        const port = e.target.closest('.node-port');
        if (port) {
          this._startConnectionDraw(port, e);
          return;
        }

        // Node drag?
        const nodeEl = e.target.closest('.board-node');
        if (nodeEl) {
          this._startNodeDrag(nodeEl, e);
          return;
        }

        // Pan
        this._isPanning = true;
        this._panStart = { x: e.clientX, y: e.clientY };
        this._panOrigin = { ...this._pan };
        canvas.style.cursor = 'grabbing';
      });

      // Mousemove
      const onMove = (e) => {
        if (this._isPanning) {
          this._pan.x = this._panOrigin.x + (e.clientX - this._panStart.x);
          this._pan.y = this._panOrigin.y + (e.clientY - this._panStart.y);
          this._applyTransform();
          this._updateMinimap();
        }
        if (this._dragNode) {
          this._onNodeDrag(e);
        }
        if (this._drawingConnection && this._tempLine) {
          this._onConnectionDraw(e);
        }
      };
      document.addEventListener('mousemove', onMove);
      this._boundHandlers.onMove = onMove;

      // Mouseup
      const onUp = (e) => {
        if (this._isPanning) {
          this._isPanning = false;
          canvas.style.cursor = 'grab';
        }
        if (this._dragNode) {
          this._endNodeDrag();
        }
        if (this._drawingConnection) {
          this._endConnectionDraw(e);
        }
      };
      document.addEventListener('mouseup', onUp);
      this._boundHandlers.onUp = onUp;
    }

    // ── Node Management ────────────────────────────────────────────────────

    /**
     * @typedef {Object} NodeData
     * @property {string} [id]
     * @property {string} type - person|evidence|location|timeline|weapon|motive
     * @property {string} title
     * @property {string} [body]
     * @property {Array<string>} [tags]
     * @property {number} [x]
     * @property {number} [y]
     */

    /**
     * Add a node to the board.
     * @param {NodeData} data
     * @returns {string} The node id.
     * @private
     */
    _addNode(data) {
      const id = data.id || uid();
      const x = data.x ?? Math.random() * (CANVAS_W - 250);
      const y = data.y ?? Math.random() * (CANVAS_H - 180);

      const node = el('div', `board-node type-${data.type}`);
      node.dataset.nodeId = id;
      node.style.left = x + 'px';
      node.style.top = y + 'px';

      // Header
      const header = el('div', 'node-header');
      const icon = el('span', `node-icon ${data.type}`, TYPE_ICONS[data.type] || '');
      const title = el('span', 'node-title', this._escapeHtml(data.title));
      header.append(icon, title);
      node.appendChild(header);

      // Body
      if (data.body) {
        const body = el('div', 'node-body', this._escapeHtml(data.body));
        node.appendChild(body);
      }

      // Tags
      if (data.tags && data.tags.length) {
        const tagsWrap = el('div', 'node-tags');
        data.tags.forEach(t => {
          tagsWrap.appendChild(el('span', 'node-tag', this._escapeHtml(t)));
        });
        node.appendChild(tagsWrap);
      }

      // Ports
      ['top', 'bottom', 'left', 'right'].forEach(pos => {
        const port = el('div', `node-port ${pos}`);
        port.dataset.port = pos;
        node.appendChild(port);
      });

      // Click → select
      node.addEventListener('click', (e) => {
        if (e.target.closest('.node-port')) return;
        this._selectNode(id);
      });

      this._canvasInner.appendChild(node);
      this._nodes.set(id, { id, type: data.type, title: data.title, x, y, el: node, data });
      return id;
    }

    /**
     * Select a node, deselect others.
     * @param {string} id
     * @private
     */
    _selectNode(id) {
      this._nodes.forEach(n => n.el.classList.remove('selected'));
      const node = this._nodes.get(id);
      if (node) {
        node.el.classList.add('selected');
        this._selectedNodeId = id;
        this.bus.emit('board:node-selected', { nodeId: id, data: node.data });
      }
    }

    // ── Node Dragging ──────────────────────────────────────────────────────

    /**
     * Initiate node dragging.
     * @param {HTMLElement} nodeEl
     * @param {MouseEvent} e
     * @private
     */
    _startNodeDrag(nodeEl, e) {
      const id = nodeEl.dataset.nodeId;
      const node = this._nodes.get(id);
      if (!node) return;

      this._dragNode = node;
      nodeEl.classList.add('dragging');

      const rect = nodeEl.getBoundingClientRect();
      this._dragOffset = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }

    /**
     * Handle node drag movement.
     * @param {MouseEvent} e
     * @private
     */
    _onNodeDrag(e) {
      const node = this._dragNode;
      if (!node) return;

      const canvasRect = this._canvasInner.getBoundingClientRect();
      const x = (e.clientX - canvasRect.left - this._dragOffset.x * this._zoom) / this._zoom;
      const y = (e.clientY - canvasRect.top - this._dragOffset.y * this._zoom) / this._zoom;

      const cx = clamp(x, 0, CANVAS_W - 180);
      const cy = clamp(y, 0, CANVAS_H - 120);

      node.x = cx;
      node.y = cy;
      node.el.style.left = cx + 'px';
      node.el.style.top = cy + 'px';

      this._redrawConnections();
      this._updateMinimap();
    }

    /**
     * Finalize node drag.
     * @private
     */
    _endNodeDrag() {
      const node = this._dragNode;
      if (!node) return;
      node.el.classList.remove('dragging');
      this.bus.emit('board:node-moved', { nodeId: node.id, x: node.x, y: node.y });
      this._dragNode = null;
    }

    // ── Connection Drawing ─────────────────────────────────────────────────

    /**
     * @typedef {Object} ConnectionData
     * @property {string} from - Source node id.
     * @property {string} to - Target node id.
     * @property {string} fromPort - top|bottom|left|right
     * @property {string} toPort - top|bottom|left|right
     * @property {string} [type] - links|contradicts|proves|disproves|timeline
     * @property {string} [label]
     */

    /**
     * Start drawing a connection from a port.
     * @param {HTMLElement} portEl
     * @param {MouseEvent} e
     * @private
     */
    _startConnectionDraw(portEl, e) {
      e.stopPropagation();
      const nodeEl = portEl.closest('.board-node');
      if (!nodeEl) return;

      this._drawingConnection = true;
      this._connSourceNodeId = nodeEl.dataset.nodeId;
      this._connSourcePort = portEl.dataset.port;

      const pos = this._getPortCenter(nodeEl.dataset.nodeId, portEl.dataset.port);

      const line = svg('line', {
        x1: String(pos.x), y1: String(pos.y),
        x2: String(pos.x), y2: String(pos.y),
        class: 'connection-links',
        'stroke-dasharray': '6 4'
      });
      this._svgLayer.appendChild(line);
      this._tempLine = line;
    }

    /**
     * Update temp line while drawing.
     * @param {MouseEvent} e
     * @private
     */
    _onConnectionDraw(e) {
      const canvasRect = this._canvasInner.getBoundingClientRect();
      const x = (e.clientX - canvasRect.left) / this._zoom;
      const y = (e.clientY - canvasRect.top) / this._zoom;
      this._tempLine.setAttribute('x2', String(x));
      this._tempLine.setAttribute('y2', String(y));
    }

    /**
     * End connection drawing — check if mouse released over a port.
     * @param {MouseEvent} e
     * @private
     */
    _endConnectionDraw(e) {
      if (this._tempLine) {
        this._tempLine.remove();
        this._tempLine = null;
      }

      const targetPort = e.target.closest('.node-port');
      if (targetPort) {
        const targetNodeEl = targetPort.closest('.board-node');
        if (targetNodeEl && targetNodeEl.dataset.nodeId !== this._connSourceNodeId) {
          const conn = {
            from: this._connSourceNodeId,
            to: targetNodeEl.dataset.nodeId,
            fromPort: this._connSourcePort,
            toPort: targetPort.dataset.port,
            type: 'links',
            label: ''
          };
          this._addConnection(conn);
          this.bus.emit('board:connection-created', conn);
        }
      }

      this._drawingConnection = false;
      this._connSourceNodeId = null;
      this._connSourcePort = null;
    }

    /**
     * Add a connection to the SVG layer and internal list.
     * @param {ConnectionData} conn
     * @private
     */
    _addConnection(conn) {
      this._connections.push(conn);
      this._drawConnection(conn);
    }

    /**
     * Draw a single connection line with optional label.
     * @param {ConnectionData} conn
     * @private
     */
    _drawConnection(conn) {
      const from = this._getPortCenter(conn.from, conn.fromPort || 'bottom');
      const to = this._getPortCenter(conn.to, conn.toPort || 'top');
      if (!from || !to) return;

      const type = conn.type || 'links';
      
      // Calculate control points for smooth cubic bezier curves
      const dx = Math.abs(to.x - from.x) * 0.5;
      const dy = Math.abs(to.y - from.y) * 0.5;
      
      let cp1x = from.x;
      let cp1y = from.y;
      let cp2x = to.x;
      let cp2y = to.y;
      
      const fromPort = conn.fromPort || 'bottom';
      const toPort = conn.toPort || 'top';
      
      if (fromPort === 'bottom') cp1y += dy;
      else if (fromPort === 'top') cp1y -= dy;
      else if (fromPort === 'left') cp1x -= dx;
      else if (fromPort === 'right') cp1x += dx;
      
      if (toPort === 'bottom') cp2y += dy;
      else if (toPort === 'top') cp2y -= dy;
      else if (toPort === 'left') cp2x -= dx;
      else if (toPort === 'right') cp2x += dx;

      const pathData = `M ${from.x} ${from.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${to.x} ${to.y}`;

      const path = svg('path', {
        d: pathData,
        fill: 'none',
        class: `connection-${type} connection-line`,
        style: 'stroke-width: 2.5px; fill: none; transition: stroke-dashoffset 0.8s ease;'
      });
      path.dataset.connFrom = conn.from;
      path.dataset.connTo = conn.to;
      this._svgLayer.appendChild(path);

      // Label
      const labelText = conn.label || CONNECTION_LABELS[type] || '';
      if (labelText) {
        const text = svg('text', {
          x: String((from.x + to.x) / 2),
          y: String((from.y + to.y) / 2 - 6),
          class: 'connection-label'
        });
        text.textContent = labelText;
        text.dataset.connFrom = conn.from;
        text.dataset.connTo = conn.to;
        this._svgLayer.appendChild(text);
      }
    }

    /**
     * Get the absolute centre of a port on a node (in canvas coordinates).
     * @param {string} nodeId
     * @param {string} port - top|bottom|left|right
     * @returns {{x: number, y: number}|null}
     * @private
     */
    _getPortCenter(nodeId, port) {
      const node = this._nodes.get(nodeId);
      if (!node) return null;
      const w = node.el.offsetWidth || 180;
      const h = node.el.offsetHeight || 120;
      switch (port) {
        case 'top':    return { x: node.x + w / 2, y: node.y };
        case 'bottom': return { x: node.x + w / 2, y: node.y + h };
        case 'left':   return { x: node.x,         y: node.y + h / 2 };
        case 'right':  return { x: node.x + w,     y: node.y + h / 2 };
        default:       return { x: node.x + w / 2, y: node.y + h };
      }
    }

    /**
     * Clear all SVG lines and labels.
     * @private
     */
    _clearSVG() {
      while (this._svgLayer.firstChild) {
        this._svgLayer.firstChild.remove();
      }
    }

    /**
     * Redraw all connections (e.g. after node move).
     * @private
     */
    _redrawConnections() {
      this._clearSVG();
      this._connections.forEach(c => this._drawConnection(c));
    }

    // ── Minimap ────────────────────────────────────────────────────────────

    /**
     * Redraw the minimap nodes and viewport indicator.
     * @private
     */
    _updateMinimap() {
      if (!this._minimapEl) return;

      // Clear existing minimap nodes
      this._minimapEl.querySelectorAll('.minimap-node').forEach(n => n.remove());

      const sx = MINIMAP_W / CANVAS_W;
      const sy = MINIMAP_H / CANVAS_H;

      this._nodes.forEach(node => {
        const dot = el('div', 'minimap-node');
        dot.style.left = (node.x * sx) + 'px';
        dot.style.top = (node.y * sy) + 'px';
        dot.style.width = '4px';
        dot.style.height = '4px';
        this._minimapEl.appendChild(dot);
      });

      // Viewport rect
      if (this._minimapViewport && this._root) {
        const canvasViewport = this._root.querySelector('.board-canvas');
        if (canvasViewport) {
          const vw = canvasViewport.clientWidth / this._zoom;
          const vh = canvasViewport.clientHeight / this._zoom;
          const vx = -this._pan.x / this._zoom;
          const vy = -this._pan.y / this._zoom;
          this._minimapViewport.style.left = (vx * sx) + 'px';
          this._minimapViewport.style.top = (vy * sy) + 'px';
          this._minimapViewport.style.width = (vw * sx) + 'px';
          this._minimapViewport.style.height = (vh * sy) + 'px';
        }
      }
    }

    // ── Bus Listeners ──────────────────────────────────────────────────────

    /**
     * Attach event-bus listeners.
     * @private
     */
    _attachBusListeners() {
      this._busHandlers = {
        /**
         * Full board update.
         * @param {Object} data
         */
        'board:update': (data) => this.update(data),

        /**
         * Add a single node.
         * @param {NodeData} data
         */
        'board:add-node': (data) => {
          this._addNode(data);
          this._applyFilter();
          this._updateMinimap();
        },

        /**
         * Add a single connection.
         * @param {ConnectionData} data
         */
        'board:add-connection': (data) => {
          this._addConnection(data);
        }
      };

      Object.entries(this._busHandlers).forEach(([evt, fn]) => {
        this.bus.on(evt, fn);
      });
    }

    /**
     * Detach event-bus listeners.
     * @private
     */
    _detachBusListeners() {
      if (this._busHandlers) {
        Object.entries(this._busHandlers).forEach(([evt, fn]) => {
          this.bus.off(evt, fn);
        });
      }
      if (this._boundHandlers.onMove) {
        document.removeEventListener('mousemove', this._boundHandlers.onMove);
      }
      if (this._boundHandlers.onUp) {
        document.removeEventListener('mouseup', this._boundHandlers.onUp);
      }
    }

    // ── Utilities ──────────────────────────────────────────────────────────

    /**
     * Escape HTML special characters.
     * @param {string} str
     * @returns {string}
     * @private
     */
    _escapeHtml(str) {
      const div = document.createElement('div');
      div.textContent = str || '';
      return div.innerHTML;
    }
  }

  // ── Export ──────────────────────────────────────────────────────────────────
  ns.EvidenceBoardUI = EvidenceBoardUI;

})(window.NyayaSim = window.NyayaSim || {});
