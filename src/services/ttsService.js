/**
 * Guardian Desktop ERP - Text-to-Speech Service
 * Browser-based speech synthesis for accessibility
 */

// Available voices cache
let availableVoices = [];
let voicesLoaded = false;

// TTS Settings
const DEFAULT_SETTINGS = {
  rate: 1.0,      // 0.1 to 10
  pitch: 1.0,     // 0 to 2
  volume: 1.0,    // 0 to 1
  voice: null,    // Voice object or null for default
  language: 'en-US',
};

// Load voices when speech synthesis is ready
if ('speechSynthesis' in window) {
  const loadVoices = () => {
    availableVoices = window.speechSynthesis.getVoices();
    voicesLoaded = true;
  };
  
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

/**
 * Get available voices filtered by language
 * @param {string} language - Language code (e.g., 'en-US')
 * @returns {SpeechSynthesisVoice[]} Array of available voices
 */
export function getAvailableVoices(language = null) {
  if (!('speechSynthesis' in window)) return [];
  
  if (!voicesLoaded) {
    availableVoices = window.speechSynthesis.getVoices();
  }
  
  if (language) {
    return availableVoices.filter(v => v.lang.startsWith(language.split('-')[0]));
  }
  
  return availableVoices;
}

/**
 * Get preferred voice for a language
 * @param {string} language - Language code
 * @returns {SpeechSynthesisVoice|null} Preferred voice or null
 */
export function getPreferredVoice(language = 'en-US') {
  const voices = getAvailableVoices(language);
  
  // Prefer local voices over remote ones
  const localVoice = voices.find(v => v.localService);
  if (localVoice) return localVoice;
  
  // Fallback to any matching voice
  return voices[0] || null;
}

/**
 * Speak text using browser's speech synthesis
 * @param {string} text - Text to speak
 * @param {object} options - TTS options
 * @returns {Promise<void>} Resolves when speech completes
 */
export function speak(text, options = {}) {
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      reject(new Error('Speech synthesis not supported'));
      return;
    }
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const settings = { ...DEFAULT_SETTINGS, ...options };
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Apply settings
    utterance.rate = settings.rate;
    utterance.pitch = settings.pitch;
    utterance.volume = settings.volume;
    utterance.lang = settings.language;
    
    // Set voice
    if (settings.voice) {
      utterance.voice = settings.voice;
    } else {
      const preferredVoice = getPreferredVoice(settings.language);
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
    }
    
    // Event handlers
    utterance.onend = () => resolve();
    utterance.onerror = (event) => reject(new Error(`Speech error: ${event.error}`));
    
    // Start speaking
    window.speechSynthesis.speak(utterance);
  });
}

/**
 * Stop current speech
 */
export function stopSpeaking() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Pause current speech
 */
export function pauseSpeaking() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.pause();
  }
}

/**
 * Resume paused speech
 */
export function resumeSpeaking() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.resume();
  }
}

/**
 * Check if currently speaking
 * @returns {boolean} True if speaking
 */
export function isSpeaking() {
  if ('speechSynthesis' in window) {
    return window.speechSynthesis.speaking;
  }
  return false;
}

/**
 * Check if speech is paused
 * @returns {boolean} True if paused
 */
export function isPaused() {
  if ('speechSynthesis' in window) {
    return window.speechSynthesis.paused;
  }
  return false;
}

/**
 * Check if speech synthesis is supported
 * @returns {boolean} True if supported
 */
export function isSupported() {
  return 'speechSynthesis' in window;
}

/**
 * Read page content aloud
 * @param {string} selector - CSS selector for content
 * @param {object} options - TTS options
 */
export async function readPageContent(selector = 'main', options = {}) {
  const element = document.querySelector(selector);
  if (!element) {
    throw new Error(`Element not found: ${selector}`);
  }
  
  // Extract text content, skipping hidden elements
  const text = element.innerText || element.textContent;
  if (text) {
    await speak(text.trim(), options);
  }
}

/**
 * Announce message for accessibility (screen reader friendly)
 * @param {string} message - Message to announce
 * @param {string} priority - 'polite' or 'assertive'
 */
export function announceForScreenReader(message, priority = 'polite') {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.style.cssText = 'position:absolute;left:-10000px;width:1px;height:1px;overflow:hidden;';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

export default {
  speak,
  stopSpeaking,
  pauseSpeaking,
  resumeSpeaking,
  isSpeaking,
  isPaused,
  isSupported,
  getAvailableVoices,
  getPreferredVoice,
  readPageContent,
  announceForScreenReader,
};
