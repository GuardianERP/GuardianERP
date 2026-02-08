/**
 * Guardian Desktop ERP - Voice Control Component
 * Floating voice control button with visual feedback
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Settings,
  X,
  ChevronUp,
  ChevronDown,
  Loader2,
  Info,
  Keyboard,
} from 'lucide-react';
import { useVoice } from '../hooks/useVoice';

function VoiceControl() {
  const { tts, stt } = useVoice();
  const location = useLocation();
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCommands, setShowCommands] = useState(false);
  const [notification, setNotification] = useState(null);
  const [feedbackText, setFeedbackText] = useState('');
  
  // Handle voice command callback
  const handleCommand = useCallback((command, executed) => {
    if (executed) {
      setNotification(`Executed: ${command.phrase}`);
      // Speak confirmation
      tts.speak(`Navigating to ${command.target?.replace('/', '') || 'requested page'}`);
    } else if (command.category === 'freetext') {
      setNotification('Try saying: "Go to dashboard" or "Show tasks"');
    }
    
    setTimeout(() => setNotification(null), 3000);
  }, [tts]);
  
  // Start listening with command handler
  const toggleListening = () => {
    if (stt.isListening) {
      stt.stopListening();
    } else {
      stt.startListening(handleCommand);
    }
  };
  
  // Update feedback text when interim transcript changes
  useEffect(() => {
    if (stt.interimTranscript) {
      setFeedbackText(stt.interimTranscript);
    } else if (stt.transcript) {
      setFeedbackText(stt.transcript);
    } else if (stt.isListening) {
      setFeedbackText('Listening...');
    }
  }, [stt.interimTranscript, stt.transcript, stt.isListening]);
  
  // Clear feedback when not listening
  useEffect(() => {
    if (!stt.isListening) {
      const timer = setTimeout(() => setFeedbackText(''), 2000);
      return () => clearTimeout(timer);
    }
  }, [stt.isListening]);
  
  // Announce page changes - DISABLED to prevent unwanted voice announcements
  // This was causing voice to speak on every click/navigation
  // useEffect(() => {
  //   if (tts.settings.volume > 0) {
  //     const pageName = location.pathname.replace('/', '') || 'dashboard';
  //     tts.speak(`${pageName} page`);
  //   }
  // }, [location.pathname]);
  
  // Check if voice features are supported
  const isSupported = stt.isSupported || tts.isSupported;
  
  if (!isSupported) {
    return null;
  }
  
  return (
    <>
      {/* Floating Voice Button */}
      <div className="fixed bottom-6 right-6 z-50">
        {/* Notification Toast */}
        {notification && (
          <div className="absolute bottom-full right-0 mb-2 px-4 py-2 bg-gray-800 text-white text-sm rounded-lg shadow-lg whitespace-nowrap animate-fade-in">
            {notification}
          </div>
        )}
        
        {/* Voice Feedback */}
        {feedbackText && stt.isListening && (
          <div className="absolute bottom-full right-0 mb-2 max-w-xs px-4 py-2 bg-blue-600 text-white text-sm rounded-lg shadow-lg animate-pulse">
            <p className="truncate">{feedbackText}</p>
          </div>
        )}
        
        {/* Expanded Controls */}
        {isExpanded && (
          <div className="absolute bottom-full right-0 mb-4 w-72 bg-gray-900 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden animate-slide-up">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
              <h3 className="font-semibold text-white">Voice Controls</h3>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            
            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Voice Input Section */}
              {stt.isSupported && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Voice Input</span>
                    <button
                      onClick={() => setShowCommands(!showCommands)}
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      {showCommands ? 'Hide commands' : 'Show commands'}
                    </button>
                  </div>
                  
                  <button
                    onClick={toggleListening}
                    className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl transition-colors ${
                      stt.isListening
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-blue-600 hover:bg-blue-700'
                    } text-white`}
                  >
                    {stt.isListening ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Stop Listening</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-5 h-5" />
                        <span>Start Listening</span>
                      </>
                    )}
                  </button>
                  
                  {/* Available Commands */}
                  {showCommands && (
                    <div className="mt-3 p-3 bg-gray-800 rounded-xl max-h-48 overflow-y-auto">
                      <p className="text-xs text-gray-400 mb-2">Available commands:</p>
                      <div className="space-y-2">
                        {Object.entries(stt.availableCommands).map(([category, commands]) => (
                          <div key={category}>
                            <p className="text-xs font-medium text-gray-500 uppercase mb-1">
                              {category}
                            </p>
                            {commands.slice(0, 3).map((cmd, i) => (
                              <p key={i} className="text-xs text-gray-300">
                                "{cmd.examples[0]}"
                              </p>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {stt.error && (
                    <p className="mt-2 text-xs text-red-400">{stt.error}</p>
                  )}
                </div>
              )}
              
              {/* TTS Section */}
              {tts.isSupported && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Text-to-Speech</span>
                    <button
                      onClick={() => setShowSettings(!showSettings)}
                      className="p-1 hover:bg-gray-700 rounded transition-colors"
                    >
                      <Settings className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => tts.isSpeaking ? tts.stop() : tts.speak('Hello, I am your Guardian ERP assistant.')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-colors ${
                        tts.isSpeaking
                          ? 'bg-orange-600 hover:bg-orange-700'
                          : 'bg-gray-700 hover:bg-gray-600'
                      } text-white`}
                    >
                      {tts.isSpeaking ? (
                        <>
                          <VolumeX className="w-4 h-4" />
                          <span>Stop</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-4 h-4" />
                          <span>Test Voice</span>
                        </>
                      )}
                    </button>
                  </div>
                  
                  {/* TTS Settings */}
                  {showSettings && (
                    <div className="mt-3 p-3 bg-gray-800 rounded-xl space-y-3">
                      {/* Rate */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-400">Speed</span>
                          <span className="text-xs text-gray-500">{tts.settings.rate.toFixed(1)}x</span>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="2"
                          step="0.1"
                          value={tts.settings.rate}
                          onChange={(e) => tts.updateSettings({ rate: parseFloat(e.target.value) })}
                          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                      
                      {/* Pitch */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-400">Pitch</span>
                          <span className="text-xs text-gray-500">{tts.settings.pitch.toFixed(1)}</span>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="2"
                          step="0.1"
                          value={tts.settings.pitch}
                          onChange={(e) => tts.updateSettings({ pitch: parseFloat(e.target.value) })}
                          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                      
                      {/* Volume */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-400">Volume</span>
                          <span className="text-xs text-gray-500">{Math.round(tts.settings.volume * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={tts.settings.volume}
                          onChange={(e) => tts.updateSettings({ volume: parseFloat(e.target.value) })}
                          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Keyboard Shortcut Hint */}
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Keyboard className="w-3 h-3" />
                <span>Press Ctrl+Shift+V to toggle voice</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Main Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all ${
            stt.isListening
              ? 'bg-red-600 animate-pulse'
              : isExpanded
              ? 'bg-gray-700'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {stt.isListening ? (
            <Mic className="w-6 h-6 text-white" />
          ) : isExpanded ? (
            <ChevronDown className="w-6 h-6 text-white" />
          ) : (
            <Mic className="w-6 h-6 text-white" />
          )}
        </button>
      </div>
      
      {/* Styles for animations */}
      <style>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        .animate-slide-up {
          animation: slide-up 0.2s ease-out;
        }
        
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </>
  );
}

export default VoiceControl;
