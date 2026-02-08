/**
 * Guardian Desktop ERP - AI Assistant Page
 * Full-featured AI chat interface with smart suggestions and quick actions
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  MessageSquare,
  Trash2,
  Lightbulb,
  BarChart3,
  Clock,
  ChevronRight,
  Loader2,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Settings,
  Maximize2,
  Minimize2,
  User,
  Copy,
  Check,
  UserPlus,
  LayoutDashboard,
  CheckSquare,
  Calendar,
  Receipt,
  DollarSign,
  AlertCircle,
  TrendingUp,
  Table,
} from 'lucide-react';
import { useAIChat, MESSAGE_TYPES } from '../hooks/useAIChat';

// Icon mapping for quick actions
const iconMap = {
  UserPlus,
  LayoutDashboard,
  Clock,
  CheckSquare,
  Calendar,
  Receipt,
  DollarSign,
  BarChart: BarChart3,
};

function AIAssistantPage() {
  const {
    messages,
    isProcessing,
    suggestions,
    quickActions,
    sendMessage,
    handleSuggestion,
    handleQuickAction,
    clearChat,
  } = useAIChat();
  
  const [inputValue, setInputValue] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [autoSpeak, setAutoSpeak] = useState(false);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  
  // Handle form submit
  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim() && !isProcessing) {
      sendMessage(inputValue);
      setInputValue('');
    }
  };
  
  // Handle voice input (simulated)
  const toggleVoiceInput = () => {
    if (isListening) {
      setIsListening(false);
      // Simulate voice result
      setTimeout(() => {
        setInputValue('Show pending tasks');
      }, 500);
    } else {
      setIsListening(true);
      // Auto-stop after 5 seconds
      setTimeout(() => setIsListening(false), 5000);
    }
  };
  
  // Handle text-to-speech
  const speakMessage = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };
  
  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };
  
  // Copy message to clipboard
  const copyMessage = (id, content) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };
  
  // Render message content based on response type
  const renderMessageContent = (message) => {
    if (message.responseType === 'table' && message.data) {
      return (
        <div>
          <p className="mb-3 whitespace-pre-wrap">{message.content}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-700 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-800">
                  {message.data.headers.map((header, i) => (
                    <th key={i} className="px-4 py-2 text-left font-medium text-gray-300">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {message.data.rows.map((row, i) => (
                  <tr key={i} className="border-t border-gray-700">
                    {row.map((cell, j) => (
                      <td key={j} className="px-4 py-2 text-gray-300">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }
    
    if (message.responseType === 'chart' && message.data) {
      const { revenue, expenses, profit, comparison } = message.data;
      return (
        <div>
          <p className="mb-3 whitespace-pre-wrap">{message.content}</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-green-900/50 to-green-800/30 p-4 rounded-xl">
              <div className="flex items-center gap-2 text-green-400 mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs font-medium">Revenue</span>
              </div>
              <p className="text-2xl font-bold text-green-400">${revenue.toLocaleString()}</p>
            </div>
            <div className="bg-gradient-to-br from-red-900/50 to-red-800/30 p-4 rounded-xl">
              <div className="flex items-center gap-2 text-red-400 mb-1">
                <Receipt className="w-4 h-4" />
                <span className="text-xs font-medium">Expenses</span>
              </div>
              <p className="text-2xl font-bold text-red-400">${expenses.toLocaleString()}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-900/50 to-blue-800/30 p-4 rounded-xl col-span-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-blue-400 mb-1">
                    <DollarSign className="w-4 h-4" />
                    <span className="text-xs font-medium">Net Profit</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-400">${profit.toLocaleString()}</p>
                </div>
                <span className="text-sm text-green-400 bg-green-400/10 px-3 py-1 rounded-full">
                  {comparison}
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    return <p className="whitespace-pre-wrap">{message.content}</p>;
  };
  
  return (
    <div className={`h-full flex flex-col ${isFullscreen ? 'fixed inset-0 z-50 bg-gray-900' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-900/50 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-900" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Guardian AI Assistant</h1>
            <p className="text-sm text-gray-400">Powered by intelligent automation</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
          <button
            onClick={clearChat}
            className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-red-400 transition-colors"
            title="Clear chat"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      {/* Settings Panel */}
      {showSettings && (
        <div className="px-6 py-4 border-b border-gray-800 bg-gray-900/80 backdrop-blur">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Auto-speak responses</span>
            <button
              onClick={() => setAutoSpeak(!autoSpeak)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                autoSpeak ? 'bg-blue-600' : 'bg-gray-700'
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  autoSpeak ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      )}
      
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.type === MESSAGE_TYPES.USER ? 'flex-row-reverse' : ''
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center ${
                    message.type === MESSAGE_TYPES.USER
                      ? 'bg-blue-600'
                      : 'bg-gradient-to-br from-purple-500 to-blue-600'
                  }`}
                >
                  {message.type === MESSAGE_TYPES.USER ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Bot className="w-4 h-4 text-white" />
                  )}
                </div>
                
                {/* Message Bubble */}
                <div
                  className={`max-w-[80%] ${
                    message.type === MESSAGE_TYPES.USER
                      ? 'bg-blue-600 rounded-2xl rounded-tr-md'
                      : 'bg-gray-800 rounded-2xl rounded-tl-md'
                  } px-4 py-3`}
                >
                  {renderMessageContent(message)}
                  
                  {/* Message Actions */}
                  {message.type === MESSAGE_TYPES.ASSISTANT && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-700">
                      <button
                        onClick={() => copyMessage(message.id, message.content)}
                        className="p-1.5 rounded hover:bg-gray-700 text-gray-500 hover:text-gray-300 transition-colors"
                        title="Copy"
                      >
                        {copiedId === message.id ? (
                          <Check className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                      {isSpeaking ? (
                        <button
                          onClick={stopSpeaking}
                          className="p-1.5 rounded hover:bg-gray-700 text-blue-400 transition-colors"
                          title="Stop speaking"
                        >
                          <VolumeX className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => speakMessage(message.content)}
                          className="p-1.5 rounded hover:bg-gray-700 text-gray-500 hover:text-gray-300 transition-colors"
                          title="Speak"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                  
                  {/* Suggestions */}
                  {message.suggestions && message.suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {message.suggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => handleSuggestion(suggestion)}
                          className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 rounded-full text-gray-300 transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {/* Processing Indicator */}
            {isProcessing && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-gray-800 rounded-2xl rounded-tl-md px-4 py-3">
                  <div className="flex items-center gap-2 text-gray-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
          
          {/* Input Area */}
          <div className="p-4 border-t border-gray-800 bg-gray-900/50 backdrop-blur">
            {/* Active Suggestions */}
            {suggestions.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                <Lightbulb className="w-4 h-4 text-yellow-400" />
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestion(suggestion)}
                    disabled={isProcessing}
                    className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 rounded-full text-gray-300 transition-colors disabled:opacity-50"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
            
            {/* Input Form */}
            <form onSubmit={handleSubmit} className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask me anything..."
                  disabled={isProcessing}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                />
              </div>
              
              {/* Voice Input Button */}
              <button
                type="button"
                onClick={toggleVoiceInput}
                disabled={isProcessing}
                className={`p-3 rounded-xl transition-colors ${
                  isListening
                    ? 'bg-red-600 text-white animate-pulse'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                } disabled:opacity-50`}
                title={isListening ? 'Stop listening' : 'Voice input'}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              
              {/* Send Button */}
              <button
                type="submit"
                disabled={!inputValue.trim() || isProcessing}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isProcessing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>Send</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
        
        {/* Sidebar - Quick Actions */}
        <div className="w-72 border-l border-gray-800 bg-gray-900/30 p-4 overflow-y-auto hidden lg:block">
          <h3 className="text-sm font-semibold text-gray-400 mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Quick Actions
          </h3>
          
          <div className="space-y-2">
            {quickActions.map((action) => {
              const Icon = iconMap[action.icon] || MessageSquare;
              return (
                <button
                  key={action.id}
                  onClick={() => handleQuickAction(action.id)}
                  disabled={isProcessing}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-gray-800/50 hover:bg-gray-800 rounded-xl text-left transition-colors disabled:opacity-50 group"
                >
                  <div className="w-10 h-10 bg-gray-700 group-hover:bg-gray-600 rounded-lg flex items-center justify-center transition-colors">
                    <Icon className="w-5 h-5 text-gray-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-200 truncate">{action.label}</p>
                    <p className="text-xs text-gray-500 truncate">"{action.command}"</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
                </button>
              );
            })}
          </div>
          
          {/* AI Capabilities */}
          <div className="mt-6 pt-6 border-t border-gray-800">
            <h3 className="text-sm font-semibold text-gray-400 mb-4 flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              What I Can Do
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3 text-sm">
                <BarChart3 className="w-4 h-4 text-blue-400 mt-0.5" />
                <p className="text-gray-400">Generate reports and analytics</p>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <MessageSquare className="w-4 h-4 text-green-400 mt-0.5" />
                <p className="text-gray-400">Answer questions about your data</p>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <CheckSquare className="w-4 h-4 text-purple-400 mt-0.5" />
                <p className="text-gray-400">Help manage tasks & workflows</p>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <Clock className="w-4 h-4 text-yellow-400 mt-0.5" />
                <p className="text-gray-400">Track time and attendance</p>
              </div>
            </div>
          </div>
          
          {/* Disclaimer */}
          <div className="mt-6 p-4 bg-yellow-900/20 border border-yellow-800/30 rounded-xl">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-yellow-200/70">
                AI responses are generated based on your data and may not always be accurate. Please verify important information.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AIAssistantPage;
