/**
 * NyayaSim - AI Bridge
 * Abstraction layer for LLM API integration (Gemini/OpenAI)
 * Provides AI-powered suspect dialogue with fallback to scripted mode
 * @module AIBridge
 */

window.NyayaSim = window.NyayaSim || {};

window.NyayaSim.AIBridge = class AIBridge {
  /**
   * @param {Object} eventBus - EventBus instance
   */
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.apiKey = null;
    this.provider = 'gemini'; // 'gemini' | 'openai'
    this.model = 'gemini-2.0-flash';
    this.enabled = false;
    this.responseCache = new Map();
    this.maxCacheSize = 100;
    this.rateLimitDelay = 1000; // ms between requests
    this.lastRequestTime = 0;
  }

  /**
   * Configure the AI bridge
   * @param {Object} config
   * @param {string} config.apiKey - API key
   * @param {string} [config.provider='gemini'] - AI provider
   * @param {string} [config.model] - Model name
   */
  configure(config) {
    this.apiKey = config.apiKey;
    this.provider = config.provider || 'gemini';
    this.model = config.model || (this.provider === 'gemini' ? 'gemini-2.0-flash' : 'gpt-4o-mini');
    this.enabled = !!this.apiKey;
    
    this.eventBus.emit('ai:configured', { enabled: this.enabled, provider: this.provider });
  }

  /**
   * Check if AI mode is available
   * @returns {boolean}
   */
  isAvailable() {
    return this.enabled && !!this.apiKey;
  }

  /**
   * Send a message to the AI and get a response
   * @param {string} systemPrompt - System instructions
   * @param {Array} messages - Conversation history [{role, content}]
   * @param {Object} [options] - Additional options
   * @returns {Promise<Object>} AI response
   */
  async chat(systemPrompt, messages, options = {}) {
    if (!this.isAvailable()) {
      throw new Error('AI is not configured. Please provide an API key.');
    }

    // Rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.rateLimitDelay) {
      await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay - timeSinceLastRequest));
    }

    // Check cache
    const cacheKey = this._getCacheKey(systemPrompt, messages);
    if (this.responseCache.has(cacheKey)) {
      return this.responseCache.get(cacheKey);
    }

    this.eventBus.emit('ai:requestStarted');

    try {
      let response;
      
      if (this.provider === 'gemini') {
        response = await this._callGemini(systemPrompt, messages, options);
      } else {
        response = await this._callOpenAI(systemPrompt, messages, options);
      }

      // Cache response
      this._addToCache(cacheKey, response);
      this.lastRequestTime = Date.now();
      
      this.eventBus.emit('ai:requestCompleted', response);
      return response;

    } catch (error) {
      console.error('[AIBridge] API Error:', error);
      this.eventBus.emit('ai:requestFailed', { error: error.message });
      throw error;
    }
  }

  /**
   * Call Gemini API
   * @private
   */
  async _callGemini(systemPrompt, messages, options) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const contents = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const body = {
      system_instruction: {
        parts: [{ text: systemPrompt }]
      },
      contents,
      generationConfig: {
        temperature: options.temperature || 0.8,
        maxOutputTokens: options.maxTokens || 500,
        topP: 0.9,
        topK: 40
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' }
      ]
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Gemini API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Try to parse as JSON if expected
    if (options.jsonMode) {
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        // Fall through to text response
      }
    }

    return { text, raw: data };
  }

  /**
   * Call OpenAI-compatible API
   * @private
   */
  async _callOpenAI(systemPrompt, messages, options) {
    const url = 'https://api.openai.com/v1/chat/completions';

    const body = {
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      temperature: options.temperature || 0.8,
      max_tokens: options.maxTokens || 500,
      ...(options.jsonMode ? { response_format: { type: 'json_object' } } : {})
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';

    if (options.jsonMode) {
      try {
        return JSON.parse(text);
      } catch (e) {
        return { text };
      }
    }

    return { text, raw: data };
  }

  /**
   * Generate a cache key
   * @private
   */
  _getCacheKey(systemPrompt, messages) {
    const lastMsg = messages[messages.length - 1]?.content || '';
    return `${systemPrompt.substring(0, 100)}|${messages.length}|${lastMsg.substring(0, 50)}`;
  }

  /**
   * Add to cache with size management
   * @private
   */
  _addToCache(key, value) {
    if (this.responseCache.size >= this.maxCacheSize) {
      const firstKey = this.responseCache.keys().next().value;
      this.responseCache.delete(firstKey);
    }
    this.responseCache.set(key, value);
  }

  /**
   * Clear response cache
   */
  clearCache() {
    this.responseCache.clear();
  }

  /**
   * Test API connection
   * @returns {Promise<boolean>}
   */
  async testConnection() {
    try {
      await this.chat('Respond with just "ok"', [{ role: 'user', content: 'test' }], { maxTokens: 10 });
      return true;
    } catch (error) {
      return false;
    }
  }
};
