/**
 * Guardian Desktop ERP - Speech Recognition Service
 * Browser-based speech recognition for voice commands
 */

// Speech Recognition API (with vendor prefixes)
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const SpeechGrammarList = window.SpeechGrammarList || window.webkitSpeechGrammarList;

// Voice Commands Configuration
export const VOICE_COMMANDS = {
  navigation: [
    { phrases: ['go to dashboard', 'show dashboard', 'open dashboard'], action: 'navigate', target: '/dashboard' },
    { phrases: ['go to employees', 'show employees', 'open employees'], action: 'navigate', target: '/employees' },
    { phrases: ['go to attendance', 'show attendance', 'open attendance'], action: 'navigate', target: '/attendance' },
    { phrases: ['go to tasks', 'show tasks', 'open tasks'], action: 'navigate', target: '/tasks' },
    { phrases: ['go to leaves', 'show leaves', 'open leaves'], action: 'navigate', target: '/leaves' },
    { phrases: ['go to expenses', 'show expenses', 'open expenses'], action: 'navigate', target: '/expenses' },
    { phrases: ['go to revenue', 'show revenue', 'open revenue'], action: 'navigate', target: '/revenue' },
    { phrases: ['go to reports', 'show reports', 'open reports'], action: 'navigate', target: '/reports' },
    { phrases: ['go to chat', 'show chat', 'open chat'], action: 'navigate', target: '/chat' },
    { phrases: ['go to settings', 'show settings', 'open settings'], action: 'navigate', target: '/settings' },
    { phrases: ['go back', 'back'], action: 'navigate', target: 'back' },
  ],
  actions: [
    { phrases: ['add employee', 'new employee', 'create employee'], action: 'create', target: 'employee' },
    { phrases: ['add task', 'new task', 'create task'], action: 'create', target: 'task' },
    { phrases: ['add expense', 'new expense', 'create expense'], action: 'create', target: 'expense' },
    { phrases: ['search', 'find'], action: 'search', target: null },
    { phrases: ['refresh', 'reload'], action: 'refresh', target: null },
    { phrases: ['logout', 'sign out', 'log out'], action: 'logout', target: null },
  ],
  controls: [
    { phrases: ['stop', 'cancel', 'stop listening'], action: 'stop', target: null },
    { phrases: ['help', 'what can i say'], action: 'help', target: null },
    { phrases: ['scroll up', 'page up'], action: 'scroll', target: 'up' },
    { phrases: ['scroll down', 'page down'], action: 'scroll', target: 'down' },
  ],
};

// All command phrases for grammar
const allPhrases = [
  ...VOICE_COMMANDS.navigation.flatMap(c => c.phrases),
  ...VOICE_COMMANDS.actions.flatMap(c => c.phrases),
  ...VOICE_COMMANDS.controls.flatMap(c => c.phrases),
];

/**
 * Create a speech recognition instance
 * @param {object} options - Recognition options
 * @returns {object} Recognition controller
 */
export function createSpeechRecognition(options = {}) {
  if (!SpeechRecognition) {
    throw new Error('Speech recognition not supported in this browser');
  }
  
  const recognition = new SpeechRecognition();
  
  // Default configuration
  recognition.continuous = options.continuous ?? false;
  recognition.interimResults = options.interimResults ?? true;
  recognition.lang = options.language ?? 'en-US';
  recognition.maxAlternatives = options.maxAlternatives ?? 3;
  
  // Set grammar if supported
  if (SpeechGrammarList) {
    const grammar = `#JSGF V1.0; grammar commands; public <command> = ${allPhrases.join(' | ')};`;
    const grammarList = new SpeechGrammarList();
    grammarList.addFromString(grammar, 1);
    recognition.grammars = grammarList;
  }
  
  return {
    recognition,
    
    /**
     * Start listening
     * @param {object} handlers - Event handlers
     */
    start(handlers = {}) {
      if (handlers.onStart) recognition.onstart = handlers.onStart;
      if (handlers.onEnd) recognition.onend = handlers.onEnd;
      if (handlers.onError) recognition.onerror = handlers.onError;
      
      recognition.onresult = (event) => {
        const results = event.results;
        const lastResult = results[results.length - 1];
        
        if (lastResult.isFinal) {
          const transcript = lastResult[0].transcript.toLowerCase().trim();
          const confidence = lastResult[0].confidence;
          
          // Parse command
          const command = parseCommand(transcript);
          
          if (handlers.onResult) {
            handlers.onResult({
              transcript,
              confidence,
              command,
              isFinal: true,
            });
          }
        } else if (handlers.onInterim) {
          handlers.onInterim({
            transcript: lastResult[0].transcript,
            isFinal: false,
          });
        }
      };
      
      recognition.start();
    },
    
    /**
     * Stop listening
     */
    stop() {
      recognition.stop();
    },
    
    /**
     * Abort recognition
     */
    abort() {
      recognition.abort();
    },
  };
}

/**
 * Parse transcript into command
 * @param {string} transcript - Recognized text
 * @returns {object|null} Parsed command or null
 */
export function parseCommand(transcript) {
  const text = transcript.toLowerCase().trim();
  
  // Check all command categories
  for (const category of Object.keys(VOICE_COMMANDS)) {
    for (const cmd of VOICE_COMMANDS[category]) {
      for (const phrase of cmd.phrases) {
        if (text.includes(phrase)) {
          return {
            category,
            action: cmd.action,
            target: cmd.target,
            phrase,
            originalText: transcript,
          };
        }
      }
    }
  }
  
  // No command matched - return as free text
  return {
    category: 'freetext',
    action: 'speak',
    target: null,
    phrase: null,
    originalText: transcript,
  };
}

/**
 * Check if speech recognition is supported
 * @returns {boolean} True if supported
 */
export function isSupported() {
  return !!SpeechRecognition;
}

/**
 * Get list of available voice commands
 * @returns {object} Commands by category
 */
export function getAvailableCommands() {
  return {
    navigation: VOICE_COMMANDS.navigation.map(c => ({
      examples: c.phrases.slice(0, 2),
      description: `Navigate to ${c.target}`,
    })),
    actions: VOICE_COMMANDS.actions.map(c => ({
      examples: c.phrases.slice(0, 2),
      description: `${c.action} ${c.target || ''}`.trim(),
    })),
    controls: VOICE_COMMANDS.controls.map(c => ({
      examples: c.phrases.slice(0, 2),
      description: `${c.action} ${c.target || ''}`.trim(),
    })),
  };
}

export default {
  createSpeechRecognition,
  parseCommand,
  isSupported,
  getAvailableCommands,
  VOICE_COMMANDS,
};
