/**
 * Guardian Desktop ERP - AI Chat Hook
 * React hook for managing AI chat state and interactions
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { processAIMessage, getSmartSuggestions, AI_QUICK_ACTIONS } from '../services/aiService';
import { useNavigate } from 'react-router-dom';

// Message types
export const MESSAGE_TYPES = {
  USER: 'user',
  ASSISTANT: 'assistant',
  SYSTEM: 'system',
};

/**
 * Custom hook for AI chat functionality
 * @returns {object} Chat state and methods
 */
export function useAIChat() {
  const [messages, setMessages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [error, setError] = useState(null);
  const messageIdRef = useRef(0);
  const navigate = useNavigate();
  
  // Initialize with welcome message
  useEffect(() => {
    const welcomeMessage = {
      id: generateMessageId(),
      type: MESSAGE_TYPES.ASSISTANT,
      content: "Hello! I'm your Guardian ERP assistant. I can help you navigate, find information, generate reports, and more. What would you like to do today?",
      timestamp: new Date(),
      suggestions: ['What can you do?', 'Show dashboard', 'Pending tasks'],
    };
    setMessages([welcomeMessage]);
    setSuggestions(['What can you do?', 'Show dashboard', 'Pending tasks']);
  }, []);
  
  // Generate unique message ID
  const generateMessageId = useCallback(() => {
    messageIdRef.current += 1;
    return `msg_${Date.now()}_${messageIdRef.current}`;
  }, []);
  
  // Send message to AI
  const sendMessage = useCallback(async (content) => {
    if (!content.trim() || isProcessing) return;
    
    setError(null);
    
    // Add user message
    const userMessage = {
      id: generateMessageId(),
      type: MESSAGE_TYPES.USER,
      content: content.trim(),
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsProcessing(true);
    
    try {
      // Process with AI service
      const response = await processAIMessage(content);
      
      // Handle navigation actions
      if (response.type === 'action' && response.action === 'navigate') {
        navigate(response.target);
      }
      
      // Add assistant response
      const assistantMessage = {
        id: generateMessageId(),
        type: MESSAGE_TYPES.ASSISTANT,
        content: response.message,
        timestamp: new Date(),
        responseType: response.type,
        data: response.data,
        suggestions: response.suggestions || [],
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      setSuggestions(response.suggestions || []);
      
    } catch (err) {
      setError('Sorry, I encountered an error. Please try again.');
      
      const errorMessage = {
        id: generateMessageId(),
        type: MESSAGE_TYPES.ASSISTANT,
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date(),
        isError: true,
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, generateMessageId, navigate]);
  
  // Handle suggestion click
  const handleSuggestion = useCallback((suggestion) => {
    sendMessage(suggestion);
  }, [sendMessage]);
  
  // Handle quick action
  const handleQuickAction = useCallback((actionId) => {
    const action = AI_QUICK_ACTIONS.find(a => a.id === actionId);
    if (action) {
      sendMessage(action.command);
    }
  }, [sendMessage]);
  
  // Clear chat history
  const clearChat = useCallback(() => {
    setMessages([{
      id: generateMessageId(),
      type: MESSAGE_TYPES.ASSISTANT,
      content: "Chat cleared. How can I help you?",
      timestamp: new Date(),
      suggestions: ['What can you do?', 'Show dashboard', 'Generate report'],
    }]);
    setSuggestions(['What can you do?', 'Show dashboard', 'Generate report']);
    setError(null);
  }, [generateMessageId]);
  
  // Update suggestions based on current page
  const updateSuggestionsForPage = useCallback((page) => {
    const pageSuggestions = getSmartSuggestions(page);
    setSuggestions(pageSuggestions);
  }, []);
  
  return {
    messages,
    isProcessing,
    suggestions,
    error,
    quickActions: AI_QUICK_ACTIONS,
    sendMessage,
    handleSuggestion,
    handleQuickAction,
    clearChat,
    updateSuggestionsForPage,
  };
}

export default useAIChat;
