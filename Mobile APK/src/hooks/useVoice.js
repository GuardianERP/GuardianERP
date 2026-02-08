/**
 * Guardian Desktop ERP - Voice Hook
 * React hook for voice input/output functionality
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as tts from '../services/ttsService';
import * as stt from '../services/speechRecognitionService';

/**
 * Custom hook for text-to-speech functionality
 * @returns {object} TTS controls and state
 */
export function useTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [settings, setSettings] = useState({
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
    language: 'en-US',
    voice: null,
  });
  
  // Update state when speech changes
  useEffect(() => {
    const checkState = () => {
      setIsSpeaking(tts.isSpeaking());
      setIsPaused(tts.isPaused());
    };
    
    const interval = setInterval(checkState, 100);
    return () => clearInterval(interval);
  }, []);
  
  const speak = useCallback(async (text) => {
    try {
      setIsSpeaking(true);
      await tts.speak(text, settings);
      setIsSpeaking(false);
    } catch (error) {
      console.error('TTS error:', error);
      setIsSpeaking(false);
    }
  }, [settings]);
  
  const stop = useCallback(() => {
    tts.stopSpeaking();
    setIsSpeaking(false);
    setIsPaused(false);
  }, []);
  
  const pause = useCallback(() => {
    tts.pauseSpeaking();
    setIsPaused(true);
  }, []);
  
  const resume = useCallback(() => {
    tts.resumeSpeaking();
    setIsPaused(false);
  }, []);
  
  const updateSettings = useCallback((newSettings) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);
  
  return {
    speak,
    stop,
    pause,
    resume,
    isSpeaking,
    isPaused,
    settings,
    updateSettings,
    isSupported: tts.isSupported(),
    availableVoices: tts.getAvailableVoices(),
  };
}

/**
 * Custom hook for speech-to-text functionality
 * @returns {object} STT controls and state
 */
export function useSTT() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState(null);
  const [lastCommand, setLastCommand] = useState(null);
  const recognitionRef = useRef(null);
  const navigate = useNavigate();
  
  // Initialize recognition
  useEffect(() => {
    if (!stt.isSupported()) return;
    
    recognitionRef.current = stt.createSpeechRecognition({
      continuous: false,
      interimResults: true,
    });
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);
  
  // Execute command
  const executeCommand = useCallback((command) => {
    if (!command) return false;
    
    setLastCommand(command);
    
    switch (command.action) {
      case 'navigate':
        if (command.target === 'back') {
          navigate(-1);
        } else {
          navigate(command.target);
        }
        return true;
        
      case 'scroll':
        if (command.target === 'up') {
          window.scrollBy(0, -300);
        } else if (command.target === 'down') {
          window.scrollBy(0, 300);
        }
        return true;
        
      case 'refresh':
        window.location.reload();
        return true;
        
      default:
        return false;
    }
  }, [navigate]);
  
  const startListening = useCallback((onCommand = null) => {
    if (!stt.isSupported() || !recognitionRef.current) {
      setError('Speech recognition not supported');
      return;
    }
    
    setError(null);
    setTranscript('');
    setInterimTranscript('');
    
    recognitionRef.current.start({
      onStart: () => setIsListening(true),
      onEnd: () => setIsListening(false),
      onError: (event) => {
        setError(event.error || 'Recognition error');
        setIsListening(false);
      },
      onInterim: (result) => {
        setInterimTranscript(result.transcript);
      },
      onResult: (result) => {
        setTranscript(result.transcript);
        setInterimTranscript('');
        
        if (result.command) {
          const executed = executeCommand(result.command);
          if (onCommand) {
            onCommand(result.command, executed);
          }
        }
      },
    });
  }, [executeCommand]);
  
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }, []);
  
  return {
    startListening,
    stopListening,
    isListening,
    transcript,
    interimTranscript,
    error,
    lastCommand,
    isSupported: stt.isSupported(),
    availableCommands: stt.getAvailableCommands(),
  };
}

/**
 * Combined voice hook for both TTS and STT
 * @returns {object} Combined voice controls
 */
export function useVoice() {
  const ttsControls = useTTS();
  const sttControls = useSTT();
  
  return {
    tts: ttsControls,
    stt: sttControls,
    isSupported: ttsControls.isSupported || sttControls.isSupported,
  };
}

export default {
  useTTS,
  useSTT,
  useVoice,
};
