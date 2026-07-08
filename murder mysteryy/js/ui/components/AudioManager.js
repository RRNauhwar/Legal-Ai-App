/**
 * @file AudioManager.js
 * @description Procedural audio generator using Web Audio API for NyayaSim/RedString.
 * Generates ambient rain, mechanical keyboard typing, and UI action sounds entirely code-side.
 * @version 1.0.0
 */

window.NyayaSim = window.NyayaSim || {};

window.NyayaSim.AudioManager = class AudioManager {
  constructor() {
    /** @type {AudioContext|null} */
    this.ctx = null;
    
    /** @type {AudioWorkletNode|ScriptProcessorNode|null} */
    this.rainNode = null;
    this.masterVolume = null;
    
    this.enabled = false;
    this.isMuted = false;
  }

  /**
   * Initialize AudioContext on user interaction to bypass browser policies.
   */
  init() {
    if (this.ctx) return;

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContextClass();
      
      // Master gain node
      this.masterVolume = this.ctx.createGain();
      this.masterVolume.gain.setValueAtTime(0.3, this.ctx.currentTime);
      this.masterVolume.connect(this.ctx.destination);
      
      this.enabled = true;
      console.log("[AudioManager] Web Audio initialized successfully.");
    } catch (e) {
      console.warn("[AudioManager] Web Audio API not supported in this browser.", e);
    }
  }

  /**
   * Synthesize procedural rain sound using White Noise and lowpass filter.
   */
  startAmbientRain() {
    if (!this.enabled || this.rainNode) return;
    this.init();

    try {
      const bufferSize = 2 * this.ctx.sampleRate;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      
      // Generate white noise
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoiseSource = this.ctx.createBufferSource();
      whiteNoiseSource.buffer = noiseBuffer;
      whiteNoiseSource.loop = true;

      // Lowpass filter to convert white noise into rain rumbling
      const lowpass = this.ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.setValueAtTime(450, this.ctx.currentTime);
      lowpass.Q.setValueAtTime(1.0, this.ctx.currentTime);

      // Bandpass filter to add the 'pitter-patter' click sound of drops
      const bandpass = this.ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(1200, this.ctx.currentTime);
      bandpass.Q.setValueAtTime(2.0, this.ctx.currentTime);

      const rainVolume = this.ctx.createGain();
      rainVolume.gain.setValueAtTime(0.12, this.ctx.currentTime);

      // Connect nodes
      whiteNoiseSource.connect(lowpass);
      lowpass.connect(rainVolume);
      rainVolume.connect(this.masterVolume);
      
      whiteNoiseSource.start(0);
      this.rainNode = whiteNoiseSource;
      
      console.log("[AudioManager] Procedural rain ambient started.");
    } catch (err) {
      console.error("[AudioManager] Failed to generate ambient rain:", err);
    }
  }

  /**
   * Stop rain ambient sound node.
   */
  stopAmbientRain() {
    if (this.rainNode) {
      try {
        this.rainNode.stop();
      } catch (e) {}
      this.rainNode = null;
    }
  }

  /**
   * Play procedural click tone for mechanical keyboard UI / text.
   */
  playTypeSound() {
    if (!this.enabled || this.isMuted) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'triangle';
      // Randomize pitch slightly to simulate realistic key click variance
      const pitch = 150 + Math.random() * 180;
      osc.frequency.setValueAtTime(pitch, this.ctx.currentTime);
      
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
      
      osc.connect(gain);
      gain.connect(this.masterVolume);
      
      osc.start();
      osc.stop(this.ctx.currentTime + 0.06);
    } catch (e) {}
  }

  /**
   * Synthesize a clean electronic chime for notification/completion.
   */
  playNotificationChime() {
    if (!this.enabled || this.isMuted) return;

    try {
      const time = this.ctx.currentTime;
      
      const playTone = (pitch, delay, duration) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(pitch, time + delay);
        
        gain.gain.setValueAtTime(0.15, time + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, time + delay + duration);
        
        osc.connect(gain);
        gain.connect(this.masterVolume);
        
        osc.start(time + delay);
        osc.stop(time + delay + duration);
      };

      // Play major 7th electronic arpeggio
      playTone(523.25, 0.0, 0.3); // C5
      playTone(659.25, 0.08, 0.3); // E5
      playTone(783.99, 0.16, 0.4); // G5
      playTone(987.77, 0.24, 0.6); // B5
    } catch (e) {}
  }

  /**
   * Play warning/buzz sound for failed options.
   */
  playFailureBuzz() {
    if (!this.enabled || this.isMuted) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(110, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(70, this.ctx.currentTime + 0.25);
      
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
      
      osc.connect(gain);
      gain.connect(this.masterVolume);
      
      osc.start();
      osc.stop(this.ctx.currentTime + 0.35);
    } catch (e) {}
  }

  /**
   * Set master sound level.
   * @param {number} vol - Level from 0.0 to 1.0.
   */
  setVolume(vol) {
    if (!this.masterVolume) return;
    this.masterVolume.gain.setValueAtTime(vol * 0.5, this.ctx?.currentTime || 0);
  }
};
