/**
 * Guardian Desktop ERP - Chat Page
 * Internal messaging system with groups, mentions, tick marks, and notifications
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Send, Search, Plus, MoreVertical, Phone, Video, 
  Image, Paperclip, Smile, Users, MessageCircle, Pin,
  Check, CheckCheck, X, ArrowLeft, Hash, UserPlus, AtSign
} from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { chatAPI, settingsAPI } from '../services/api';
import { useOnlineEmployees } from '../hooks/usePresence';
import toast from 'react-hot-toast';

// ─── Tick mark component for message status ────────────────────────────
function MessageStatus({ message, totalParticipants }) {
  const readBy = Array.isArray(message.read_by) ? message.read_by : [];
  const readCount = readBy.length;
  
  if (readCount >= totalParticipants && totalParticipants > 1) {
    return (
      <span className="inline-flex items-center ml-1" title={`Seen by ${readCount - 1}`}>
        <CheckCheck className="w-3.5 h-3.5 text-blue-400" />
      </span>
    );
  }
  if (readCount > 1) {
    return (
      <span className="inline-flex items-center ml-1" title={`Read by ${readCount - 1}`}>
        <CheckCheck className="w-3.5 h-3.5 text-gray-400" />
      </span>
    );
  }
  if (readCount === 1) {
    return (
      <span className="inline-flex items-center ml-1" title="Sent">
        <Check className="w-3.5 h-3.5 text-gray-400" />
      </span>
    );
  }
  return (
    <span className="inline-flex items-center ml-1" title="Not sent">
      <Check className="w-3.5 h-3.5 text-red-400" />
    </span>
  );
}

// ─── @Mention Dropdown ──────────────────────────────────────
function MentionDropdown({ suggestions, onSelect }) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 mb-1 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
      <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase border-b dark:border-gray-700">
        Mention a user
      </div>
      {suggestions.map(p => (
        <div 
          key={p.user_id} 
          onClick={() => onSelect(p)} 
          className="flex items-center gap-2 px-3 py-2 hover:bg-guardian-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
        >
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-guardian-400 to-guardian-600 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
            {p.avatar ? (
              <img src={p.avatar} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              (p.name || 'U').charAt(0).toUpperCase()
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{p.name}</p>
            {p.department && <p className="text-xs text-gray-400 truncate">{p.department}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Avatar Component ──────────────────────────────────────
function Avatar({ name, avatarUrl, size = 'md', isGroup = false }) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  };
  const initial = (name || 'U').charAt(0).toUpperCase();

  return (
    <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br ${isGroup ? 'from-purple-400 to-purple-600' : 'from-guardian-400 to-guardian-600'} flex items-center justify-center text-white font-medium flex-shrink-0`}>
      {avatarUrl ? (
        <img src={avatarUrl} alt={name} className="w-full h-full rounded-full object-cover" />
      ) : isGroup ? (
        <Users className="w-5 h-5" />
      ) : (
        initial
      )}
    </div>
  );
}

// ─── Render message content with highlighted @mentions ──────
function MessageContent({ content, isOwn }) {
  const parts = content.split(/(@\w[\w\s]*?)(?=\s|$|@)/g);
  return (
    <p>
      {parts.map((part, i) => {
        if (part.startsWith('@')) {
          return (
            <span key={i} className={`font-semibold ${isOwn ? 'text-blue-200' : 'text-guardian-600 dark:text-guardian-400'}`}>
              {part}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </p>
  );
}


function ChatPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [conversationSub, setConversationSub] = useState(null);
  const [messageSub, setMessageSub] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [search, setSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [isGroupMode, setIsGroupMode] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupSelected, setGroupSelected] = useState([]);
  const [mentionSuggestions, setMentionSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [pinnedIds, setPinnedIds] = useState([]);
  const onlineUsers = useOnlineEmployees(); // { employeeId: presenceData }
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Helper: check if a user_id is online (lookup by employee_id or user_id)
  const isUserOnline = useCallback((userId) => {
    if (!userId) return false;
    // onlineUsers is keyed by employeeId, but we have user_id
    // Check if any online user matches
    const emp = allUsers.find(u => u.user_id === userId);
    if (emp?.employee_id && onlineUsers[emp.employee_id]) return true;
    // Also check if userId is directly in online keys (some systems use user_id)
    if (onlineUsers[userId]) return true;
    return false;
  }, [onlineUsers, allUsers]);

  // ─── Initial load ─────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;

    const init = async () => {
      setLoading(true);
      try {
        // Load independently so one failure doesn't block the other
        let convData = [];
        let userData = [];
        
        try {
          convData = await chatAPI.getConversations(user.id);
        } catch (e) {
          console.error('Failed to fetch conversations:', e);
        }
        
        try {
          userData = await chatAPI.getAllChatUsers();
        } catch (e) {
          console.error('Failed to fetch chat users:', e);
        }
        
        setConversations(convData || []);
        // Show all employees except self; employees without user_id can still be seen
        setAllUsers((userData || []).filter(u => u.user_id !== user.id));
        console.log('[Chat] Loaded', (userData || []).length, 'employees,', (convData || []).length, 'conversations');

        try {
          const settings = await settingsAPI.get(user.id);
          setPinnedIds((settings?.settings_json?.chat_pins) || []);
        } catch (e) { /* no settings yet */ }
      } catch (error) {
        console.error('Failed to init chat:', error);
        toast.error('Failed to load chat');
      } finally {
        setLoading(false);
      }
    };
    init();

    const sub = chatAPI.subscribeToConversations(user.id, () => {
      chatAPI.getConversations(user.id).then(data => {
        setConversations(data || []);
      });
    });
    setConversationSub(sub);

    return () => {
      if (sub) chatAPI.unsubscribeFromChannel(sub);
    };
  }, [user?.id]);

  // ─── When selecting a conversation, subscribe to its messages ─────
  useEffect(() => {
    if (!selectedConversation || !user?.id) return;

    const loadMessages = async () => {
      try {
        const data = await chatAPI.getMessages(selectedConversation.id);
        setMessages(data || []);
        chatAPI.markMessagesRead(selectedConversation.id, user.id);
      } catch (error) {
        toast.error('Failed to load messages');
      }
    };
    loadMessages();

    if (messageSub) chatAPI.unsubscribeFromMessages(messageSub);

    const sub = chatAPI.subscribeToMessages(selectedConversation.id, (msg, eventType) => {
      if (eventType === 'INSERT') {
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        if (msg.sender_id !== user.id) {
          chatAPI.markMessagesRead(selectedConversation.id, user.id);
        }
      } else if (eventType === 'UPDATE') {
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, read_by: msg.read_by } : m));
      }
    });
    setMessageSub(sub);

    return () => {
      if (sub) chatAPI.unsubscribeFromMessages(sub);
    };
  }, [selectedConversation?.id]);

  // ─── Auto-scroll on new messages ──────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ─── Mention detection ────────────────────────────────────
  useEffect(() => {
    const tokenMatch = newMessage.match(/@(\w*)$/);
    if (tokenMatch && selectedConversation) {
      const q = tokenMatch[1].toLowerCase();
      const participantNames = selectedConversation.participant_names || [];
      const suggestions = participantNames
        .filter(p => p.user_id !== user?.id)
        .filter(p => !q || (p.name || '').toLowerCase().includes(q));
      setMentionSuggestions(suggestions);
    } else {
      setMentionSuggestions([]);
    }
  }, [newMessage, selectedConversation]);

  // ─── Handlers ──────────────────────────────────────────────

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || sendingMessage) return;

    const content = newMessage.trim();
    setSendingMessage(true);

    const mentionMatches = content.match(/@(\w[\w\s]*?)(?=\s|$|@)/g) || [];
    const mentionedNames = mentionMatches.map(m => m.replace('@', '').trim().toLowerCase());
    const participantNames = selectedConversation.participant_names || [];
    const mentionedIds = participantNames
      .filter(p => mentionedNames.some(n => (p.name || '').toLowerCase().includes(n)))
      .map(p => p.user_id);

    const tempId = `temp_${Date.now()}`;
    const optimisticMsg = {
      id: tempId,
      conversation_id: selectedConversation.id,
      sender_id: user.id,
      content,
      message_type: 'text',
      read_by: [user.id],
      created_at: new Date().toISOString(),
      sender_name: 'You',
      _sending: true,
    };
    setMessages(prev => [...prev, optimisticMsg]);
    setNewMessage('');

    try {
      const sent = await chatAPI.sendMessage({
        conversationId: selectedConversation.id,
        senderId: user.id,
        content,
        mentions: mentionedIds,
      });
      setMessages(prev => prev.map(m => m.id === tempId ? { ...sent, _sending: false } : m));

      const updated = await chatAPI.getConversations(user.id);
      setConversations(updated || []);
    } catch (error) {
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, _failed: true, _sending: false } : m));
      toast.error('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const startNewConversation = async (employee) => {
    try {
      const conv = await chatAPI.createConversation([user.id, employee.user_id], null, 'direct');
      const data = await chatAPI.getConversations(user.id);
      setConversations(data || []);
      const enriched = (data || []).find(c => c.id === conv.id);
      setSelectedConversation(enriched || conv);
      setShowNewChat(false);
      setUserSearch('');
    } catch (error) {
      toast.error('Failed to start conversation');
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast.error('Please enter a group name');
      return;
    }
    if (groupSelected.length === 0) {
      toast.error('Please select at least one member');
      return;
    }
    try {
      const participantIds = Array.from(new Set([user.id, ...groupSelected]));
      const conv = await chatAPI.createConversation(participantIds, groupName.trim(), 'group');
      const data = await chatAPI.getConversations(user.id);
      setConversations(data || []);
      const enriched = (data || []).find(c => c.id === conv.id);
      setSelectedConversation(enriched || conv);
      setShowNewChat(false);
      setGroupName('');
      setGroupSelected([]);
      setIsGroupMode(false);
      setUserSearch('');
      toast.success('Group created!');
    } catch (err) {
      toast.error('Failed to create group');
    }
  };

  const togglePin = async (e, conversationId) => {
    e.stopPropagation();
    try {
      if (pinnedIds.includes(conversationId)) {
        await chatAPI.unpinConversation(user.id, conversationId);
        setPinnedIds(prev => prev.filter(id => id !== conversationId));
      } else {
        await chatAPI.pinConversation(user.id, conversationId);
        setPinnedIds(prev => [conversationId, ...prev]);
      }
    } catch (err) {
      console.error('Pin error:', err);
    }
  };

  const insertMention = (participant) => {
    const tokenMatch = newMessage.match(/@(\w*)$/);
    const prefix = newMessage.slice(0, tokenMatch ? tokenMatch.index : newMessage.length);
    setNewMessage(`${prefix}@${participant.name} `);
    setMentionSuggestions([]);
    inputRef.current?.focus();
  };

  // ─── Helpers ───────────────────────────────────────────────

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();
    
    if (isToday) return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    if (isYesterday) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatMessageDate = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) return 'Today';
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  };

  // ─── Filtered & sorted conversations ──────────────────────
  const filteredConversations = useMemo(() => {
    let list = conversations.filter(conv => {
      if (!search) return true;
      const name = (conv.display_name || '').toLowerCase();
      const lastMsg = (conv.last_message || '').toLowerCase();
      const q = search.toLowerCase();
      return name.includes(q) || lastMsg.includes(q);
    });

    list.sort((a, b) => {
      const aPinned = pinnedIds.includes(a.id) ? 0 : 1;
      const bPinned = pinnedIds.includes(b.id) ? 0 : 1;
      if (aPinned !== bPinned) return aPinned - bPinned;
      return new Date(b.last_message_at || b.updated_at) - new Date(a.last_message_at || a.updated_at);
    });
    return list;
  }, [conversations, search, pinnedIds]);

  const filteredEmployees = useMemo(() => {
    if (!userSearch) return allUsers;
    const q = userSearch.toLowerCase();
    return allUsers.filter(u => 
      (u.name || '').toLowerCase().includes(q) || 
      (u.email || '').toLowerCase().includes(q) ||
      (u.department || '').toLowerCase().includes(q)
    );
  }, [allUsers, userSearch]);

  const groupedMessages = useMemo(() => {
    const groups = [];
    let lastDate = '';
    messages.forEach(msg => {
      const dateStr = new Date(msg.created_at).toDateString();
      if (dateStr !== lastDate) {
        groups.push({ type: 'date', date: formatMessageDate(msg.created_at) });
        lastDate = dateStr;
      }
      groups.push({ type: 'message', ...msg });
    });
    return groups;
  }, [messages]);

  const totalParticipants = selectedConversation?.participants?.length || 2;

  // ─── Render ────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-12rem)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-guardian-600"></div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] gap-4 animate-fade-in">
      {/* ─── Conversations Sidebar ─────────────────────────── */}
      <div className="w-80 flex flex-col card overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Messages</h2>
            <button 
              onClick={() => { setShowNewChat(true); setIsGroupMode(false); setUserSearch(''); }}
              className="p-2 text-guardian-600 hover:bg-guardian-50 dark:hover:bg-guardian-900/20 rounded-lg transition-colors"
              title="New conversation"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10 w-full"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length > 0 ? filteredConversations.map((conv) => {
            const isPinned = pinnedIds.includes(conv.id);
            return (
              <div
                key={conv.id}
                onClick={() => setSelectedConversation(conv)}
                className={`p-3 border-b border-gray-100 dark:border-gray-700/50 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                  selectedConversation?.id === conv.id ? 'bg-guardian-50 dark:bg-guardian-900/20 border-l-2 border-l-guardian-500' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar 
                      name={conv.display_name}
                      avatarUrl={conv.type === 'direct' ? conv.participant_names?.find(p => p.user_id !== user.id)?.avatar : null}
                      isGroup={conv.type === 'group'}
                    />
                    {conv.type === 'direct' && (() => {
                      const otherId = conv.participant_names?.find(p => p.user_id !== user.id)?.user_id;
                      return isUserOnline(otherId) ? (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></span>
                      ) : (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-gray-400 border-2 border-white dark:border-gray-800 rounded-full"></span>
                      );
                    })()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {conv.type === 'group' && <Hash className="w-3 h-3 text-purple-400 flex-shrink-0" />}
                        <p className="font-medium text-gray-900 dark:text-white truncate text-sm">
                          {conv.display_name}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className="text-xs text-gray-400">
                          {formatTime(conv.last_message_at)}
                        </span>
                        <button 
                          onClick={(e) => togglePin(e, conv.id)} 
                          className={`p-0.5 rounded transition-colors ${isPinned ? 'text-guardian-600' : 'text-gray-300 hover:text-gray-500'}`}
                          title={isPinned ? 'Unpin' : 'Pin'}
                        >
                          <Pin className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-xs text-gray-500 truncate pr-2">
                        {conv.last_sender_id === user.id ? 'You: ' : ''}
                        {conv.last_message || 'No messages yet'}
                      </p>
                      {conv.unread_count > 0 && (
                        <span className="bg-guardian-600 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                          {conv.unread_count > 9 ? '9+' : conv.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          }) : (
            <div className="p-8 text-center">
              <MessageCircle className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-gray-500 text-sm">No conversations yet</p>
              <button 
                onClick={() => setShowNewChat(true)}
                className="mt-3 text-guardian-600 text-sm font-medium hover:underline"
              >
                Start a new chat
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ─── Chat Area ───────────────────────────────────── */}
      <div className="flex-1 flex flex-col card overflow-hidden">
        {selectedConversation ? (
          <>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar 
                    name={selectedConversation.display_name}
                    isGroup={selectedConversation.type === 'group'}
                    avatarUrl={selectedConversation.type === 'direct' 
                      ? selectedConversation.participant_names?.find(p => p.user_id !== user.id)?.avatar 
                      : null}
                  />
                  {selectedConversation.type === 'direct' && (() => {
                    const otherId = selectedConversation.participant_names?.find(p => p.user_id !== user.id)?.user_id;
                    return isUserOnline(otherId) ? (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></span>
                    ) : null;
                  })()}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    {selectedConversation.type === 'group' && <Hash className="w-3.5 h-3.5 text-purple-400" />}
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedConversation.display_name}
                    </p>
                  </div>
                  {selectedConversation.type === 'group' ? (
                    <p className="text-xs text-gray-500">
                      {(selectedConversation.participant_names || []).map(p => p.name).join(', ')}
                    </p>
                  ) : (() => {
                    const otherId = selectedConversation.participant_names?.find(p => p.user_id !== user.id)?.user_id;
                    const online = isUserOnline(otherId);
                    return <p className={`text-xs ${online ? 'text-green-500' : 'text-gray-400'}`}>{online ? 'Online' : 'Offline'}</p>;
                  })()}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {selectedConversation.type === 'group' && (
                  <span className="text-xs text-gray-400 mr-2">
                    <Users className="w-4 h-4 inline mr-1" />{selectedConversation.participants?.length || 0}
                  </span>
                )}
                <button className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                  <Phone className="w-5 h-5" />
                </button>
                <button className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                  <Video className="w-5 h-5" />
                </button>
                <button className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {groupedMessages.map((item, index) => {
                if (item.type === 'date') {
                  return (
                    <div key={`date-${index}`} className="flex items-center justify-center my-4">
                      <span className="bg-gray-100 dark:bg-gray-700 text-gray-500 text-xs px-3 py-1 rounded-full">
                        {item.date}
                      </span>
                    </div>
                  );
                }

                const msg = item;
                const isOwn = msg.sender_id === user?.id;
                
                return (
                  <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}>
                    {!isOwn && selectedConversation.type === 'group' && (
                      <Avatar name={msg.sender_name} avatarUrl={msg.sender_avatar} size="sm" />
                    )}
                    <div className={`max-w-[70%] ${!isOwn && selectedConversation.type === 'group' ? 'ml-2' : ''}`}>
                      {!isOwn && selectedConversation.type === 'group' && (
                        <p className="text-xs text-guardian-600 dark:text-guardian-400 font-medium mb-0.5 ml-1">
                          {msg.sender_name}
                        </p>
                      )}
                      <div className={`px-4 py-2 rounded-2xl ${
                        isOwn 
                          ? 'bg-guardian-600 text-white rounded-br-md' 
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-md'
                      } ${msg._sending ? 'opacity-70' : ''} ${msg._failed ? 'border border-red-400' : ''}`}>
                        <MessageContent content={msg.content} isOwn={isOwn} />
                      </div>
                      <div className={`flex items-center mt-0.5 gap-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                        <span className="text-[10px] text-gray-400 ml-1">
                          {formatTime(msg.created_at)}
                        </span>
                        {isOwn && !msg._sending && !msg._failed && (
                          <MessageStatus message={msg} totalParticipants={totalParticipants} />
                        )}
                        {msg._sending && (
                          <span className="text-[10px] text-gray-400 ml-1">Sending...</span>
                        )}
                        {msg._failed && (
                          <span className="text-[10px] text-red-400 ml-1">Failed</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="relative">
                <MentionDropdown 
                  suggestions={mentionSuggestions} 
                  onSelect={insertMention} 
                />
                <div className="flex items-center gap-2">
                  <button type="button" className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                    <Paperclip className="w-5 h-5" />
                  </button>
                  <div className="flex-1 relative">
                    <input
                      ref={inputRef}
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder={selectedConversation.type === 'group' ? 'Type a message... (use @ to mention)' : 'Type a message...'}
                      className="input w-full pr-10"
                      disabled={sendingMessage}
                    />
                    <button 
                      type="button" 
                      onClick={() => setNewMessage(prev => prev + '@')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-guardian-600 rounded transition-colors"
                      title="Mention someone"
                    >
                      <AtSign className="w-4 h-4" />
                    </button>
                  </div>
                  <button 
                    type="submit" 
                    disabled={!newMessage.trim() || sendingMessage}
                    className="p-2.5 bg-guardian-600 text-white rounded-lg hover:bg-guardian-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Select a conversation
              </h3>
              <p className="text-gray-500 text-sm mb-4">
                Choose an existing conversation or start a new one
              </p>
              <button
                onClick={() => setShowNewChat(true)}
                className="btn btn-primary"
              >
                <Plus className="w-4 h-4 mr-2" /> Start New Chat
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── New Chat / Create Group Modal ────────────────── */}
      {showNewChat && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => { setShowNewChat(false); setIsGroupMode(false); setUserSearch(''); }}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {isGroupMode ? 'Create Group Chat' : 'New Conversation'}
              </h2>
              <button onClick={() => { setShowNewChat(false); setIsGroupMode(false); setUserSearch(''); }} className="p-1 text-gray-400 hover:text-gray-600 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex border-b dark:border-gray-700">
              <button 
                onClick={() => setIsGroupMode(false)} 
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${!isGroupMode ? 'text-guardian-600 border-b-2 border-guardian-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <MessageCircle className="w-4 h-4 inline mr-1.5" />Direct
              </button>
              <button 
                onClick={() => setIsGroupMode(true)} 
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${isGroupMode ? 'text-guardian-600 border-b-2 border-guardian-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <Users className="w-4 h-4 inline mr-1.5" />Group
              </button>
            </div>

            {isGroupMode && (
              <div className="px-4 pt-3">
                <input 
                  value={groupName} 
                  onChange={(e) => setGroupName(e.target.value)} 
                  className="input w-full" 
                  placeholder="Group name..." 
                  autoFocus
                />
                {groupSelected.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {groupSelected.map(uid => {
                      const emp = allUsers.find(e => e.user_id === uid);
                      return (
                        <span key={uid} className="inline-flex items-center gap-1 bg-guardian-100 dark:bg-guardian-900/30 text-guardian-700 dark:text-guardian-300 text-xs px-2 py-1 rounded-full">
                          {emp?.name || 'User'}
                          <button onClick={() => setGroupSelected(prev => prev.filter(id => id !== uid))} className="hover:text-red-500">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="px-4 py-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text"
                  placeholder="Search employees..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="input pl-10 w-full"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-2 pb-2">
              {filteredEmployees.length > 0 ? filteredEmployees.map((emp) => {
                const empOnline = isUserOnline(emp.user_id);
                const hasAccount = !!emp.user_id;
                return (
                <div
                  key={emp.user_id || emp.employee_id}
                  onClick={() => {
                    if (!hasAccount) {
                      toast.error(`${emp.name} doesn't have a user account yet. Ask admin to link their account.`);
                      return;
                    }
                    if (isGroupMode) {
                      setGroupSelected(prev => 
                        prev.includes(emp.user_id) 
                          ? prev.filter(id => id !== emp.user_id) 
                          : [...prev, emp.user_id]
                      );
                    } else {
                      startNewConversation(emp);
                    }
                  }}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    !hasAccount ? 'opacity-50' :
                    isGroupMode && groupSelected.includes(emp.user_id) 
                      ? 'bg-guardian-50 dark:bg-guardian-900/20 ring-1 ring-guardian-300' 
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="relative">
                    <Avatar name={emp.name} avatarUrl={emp.avatar_url} />
                    <span className={`absolute bottom-0 right-0 w-3 h-3 ${empOnline ? 'bg-green-500' : 'bg-gray-400'} border-2 border-white dark:border-gray-800 rounded-full`}></span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{emp.name || 'Unknown'}</p>
                      {empOnline && <span className="text-[10px] text-green-500 font-medium">online</span>}
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {emp.designation ? `${emp.designation} · ` : ''}{emp.department || emp.email}
                    </p>
                  </div>
                  {isGroupMode && hasAccount && groupSelected.includes(emp.user_id) && (
                    <div className="w-5 h-5 bg-guardian-600 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
                );
              }) : (
                <p className="text-center text-gray-500 py-8 text-sm">No employees found</p>
              )}
            </div>

            {isGroupMode && (
              <div className="p-4 border-t dark:border-gray-700">
                <button 
                  onClick={handleCreateGroup} 
                  disabled={!groupName.trim() || groupSelected.length === 0}
                  className="btn btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Create Group ({groupSelected.length} member{groupSelected.length !== 1 ? 's' : ''})
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatPage;
