/**
 * Guardian Desktop ERP - Chat Page
 * Internal messaging with groups, mentions, tick marks, voice/video calls,
 * proper light/dark theming, and employee directory panel.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Send, Search, Plus, MoreVertical, Phone, Video,
  Paperclip, Users, MessageCircle, Pin,
  Check, CheckCheck, X, Hash, UserPlus, AtSign,
  PhoneOff, VideoOff, Mic, MicOff, Monitor,
  Minimize2, Maximize2
} from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { chatAPI, settingsAPI } from '../services/api';
import { useOnlineEmployees } from '../hooks/usePresence';
import { supabase } from '../services/supabaseClient';
import soundService from '../services/soundService';
import toast from 'react-hot-toast';
import { getPositionLabel, getDepartmentLabel, getDepartmentColor } from '../data/organizationConfig';

/* ──────────────────────────────────────────────────────────────
   Tick‑mark component (sent / delivered / read)
   ────────────────────────────────────────────────────────── */
function MessageStatus({ message, totalParticipants }) {
  const readBy = Array.isArray(message.read_by) ? message.read_by : [];
  const cnt = readBy.length;
  if (cnt >= totalParticipants && totalParticipants > 1)
    return <span className="inline-flex items-center ml-1" title={`Seen by ${cnt - 1}`}><CheckCheck className="w-3.5 h-3.5 text-blue-400" /></span>;
  if (cnt > 1)
    return <span className="inline-flex items-center ml-1" title={`Read by ${cnt - 1}`}><CheckCheck className="w-3.5 h-3.5 text-gray-400" /></span>;
  if (cnt === 1)
    return <span className="inline-flex items-center ml-1" title="Sent"><Check className="w-3.5 h-3.5 text-gray-400" /></span>;
  return <span className="inline-flex items-center ml-1" title="Not sent"><Check className="w-3.5 h-3.5 text-red-400" /></span>;
}

/* ──────────────────────────────────────────────────────────────
   @Mention dropdown
   ────────────────────────────────────────────────────────── */
function MentionDropdown({ suggestions, onSelect }) {
  if (!suggestions?.length) return null;
  return (
    <div className="absolute bottom-full left-0 mb-1 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
      <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase border-b dark:border-gray-700">Mention a user</div>
      {suggestions.map(p => (
        <div key={p.user_id} onClick={() => onSelect(p)} className="flex items-center gap-2 px-3 py-2 hover:bg-guardian-50 dark:hover:bg-gray-700 cursor-pointer transition-colors">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-guardian-400 to-guardian-600 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
            {p.avatar ? <img src={p.avatar} alt="" className="w-full h-full rounded-full object-cover" /> : (p.name || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{p.name}</p>
            {p.department && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{p.department}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   Avatar
   ────────────────────────────────────────────────────────── */
function Avatar({ name, avatarUrl, size = 'md', isGroup = false }) {
  const cls = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-12 h-12 text-base' };
  const initial = (name || 'U').charAt(0).toUpperCase();
  return (
    <div className={`${cls[size]} rounded-full bg-gradient-to-br ${isGroup ? 'from-purple-400 to-purple-600' : 'from-guardian-400 to-guardian-600'} flex items-center justify-center text-white font-medium flex-shrink-0`}>
      {avatarUrl ? <img src={avatarUrl} alt={name} className="w-full h-full rounded-full object-cover" /> : isGroup ? <Users className="w-5 h-5" /> : initial}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   Render @mentions highlighted in message text
   ────────────────────────────────────────────────────────── */
function MessageContent({ content, isOwn }) {
  const parts = content.split(/(@\w[\w\s]*?)(?=\s|$|@)/g);
  return (
    <p className={isOwn ? 'text-white' : 'text-gray-900 dark:text-white'}>
      {parts.map((part, i) =>
        part.startsWith('@')
          ? <span key={i} className={`font-semibold ${isOwn ? 'text-blue-200' : 'text-guardian-600 dark:text-guardian-400'}`}>{part}</span>
          : <span key={i}>{part}</span>
      )}
    </p>
  );
}

/* ══════════════════════════════════════════════════════════════
   CallOverlay – WebRTC voice / video call UI
   Uses Supabase Realtime for signalling
   ══════════════════════════════════════════════════════════ */
function CallOverlay({ callState, onEndCall, onToggleMic, onToggleVideo, onToggleScreen, localVideoRef, remoteVideoRef, minimized, onToggleMinimize }) {
  if (!callState.active) return null;

  const { isVideo, remoteName, micOn, videoOn, screenOn, status } = callState;

  // Minimized view - small floating widget in corner
  if (minimized) {
    return (
      <div className="fixed bottom-4 right-4 z-[100] bg-gray-900 rounded-xl shadow-2xl border border-gray-700 overflow-hidden">
        <div className="flex items-center gap-3 p-3">
          {isVideo ? (
            <div className="w-20 h-14 rounded-lg overflow-hidden bg-gray-800">
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-guardian-400 to-guardian-600 flex items-center justify-center text-white font-bold">
              {(remoteName || 'U').charAt(0).toUpperCase()}
            </div>
          )}
          <div className="text-white">
            <p className="text-sm font-medium truncate max-w-[100px]">{remoteName}</p>
            <p className="text-xs text-green-400">{status}</p>
          </div>
          <div className="flex items-center gap-1 ml-2">
            <button onClick={onToggleMic} className={`p-2 rounded-full ${micOn ? 'bg-gray-700' : 'bg-red-600'}`}>
              {micOn ? <Mic className="w-4 h-4 text-white" /> : <MicOff className="w-4 h-4 text-white" />}
            </button>
            <button onClick={onToggleMinimize} className="p-2 rounded-full bg-gray-700 hover:bg-gray-600">
              <Maximize2 className="w-4 h-4 text-white" />
            </button>
            <button onClick={onEndCall} className="p-2 rounded-full bg-red-600 hover:bg-red-500">
              <PhoneOff className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
        {/* Hidden video element to keep receiving remote stream */}
        {isVideo && <video ref={localVideoRef} autoPlay playsInline muted className="hidden" />}
      </div>
    );
  }

  // Full screen view
  return (
    <div className="fixed inset-0 z-[100] bg-gray-900/95 flex flex-col items-center justify-center text-white">
      {/* Minimize button */}
      <button 
        onClick={onToggleMinimize} 
        className="absolute top-4 right-4 p-3 rounded-full bg-gray-700 hover:bg-gray-600 z-30 transition-colors"
        title="Minimize call"
      >
        <Minimize2 className="w-5 h-5" />
      </button>

      {/* remote video – full background when video call */}
      {isVideo && (
        <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
      )}

      {/* fallback avatar if voice‑only */}
      {!isVideo && (
        <div className="flex flex-col items-center gap-4 z-10">
          <div className="w-28 h-28 rounded-full bg-gradient-to-br from-guardian-400 to-guardian-600 flex items-center justify-center text-5xl font-bold animate-pulse">
            {(remoteName || 'U').charAt(0).toUpperCase()}
          </div>
          <p className="text-2xl font-semibold">{remoteName || 'Calling…'}</p>
          <p className="text-gray-400 text-sm">{status || 'Connecting…'}</p>
        </div>
      )}

      {/* local PIP */}
      {isVideo && (
        <div className="absolute bottom-28 right-6 w-44 h-32 rounded-xl overflow-hidden border-2 border-white/30 shadow-lg z-20">
          <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-8 flex items-center gap-4 z-20">
        <button onClick={onToggleMic} className={`p-4 rounded-full ${micOn ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-500'} transition-colors`}>
          {micOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
        </button>
        {isVideo && (
          <>
            <button onClick={onToggleVideo} className={`p-4 rounded-full ${videoOn ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-500'} transition-colors`}>
              {videoOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
            </button>
            <button onClick={onToggleScreen} className={`p-4 rounded-full ${screenOn ? 'bg-blue-600 hover:bg-blue-500' : 'bg-gray-700 hover:bg-gray-600'} transition-colors`}>
              <Monitor className="w-6 h-6" />
            </button>
          </>
        )}
        <button onClick={onEndCall} className="p-4 rounded-full bg-red-600 hover:bg-red-500 transition-colors">
          <PhoneOff className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════ */
function ChatPage() {
  const { user } = useAuth();

  /* ── Chat state ───────────────────────────────────────── */
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
  const [empSearch, setEmpSearch] = useState('');

  const onlineUsers = useOnlineEmployees();
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  /* ── Call state ────────────────────────────────────────── */
  const [callState, setCallState] = useState({
    active: false, isVideo: false, remoteName: '', micOn: true, videoOn: true, screenOn: false, status: '',
  });
  const [callMinimized, setCallMinimized] = useState(false);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const callChannelRef = useRef(null);
  const iceCandidateQueue = useRef([]);
  const remoteDescriptionSet = useRef(false);

  /* ── Helpers ──────────────────────────────────────────── */
  const isUserOnline = useCallback((userId) => {
    if (!userId) return false;
    const emp = allUsers.find(u => u.user_id === userId);
    if (emp?.employee_id && onlineUsers[emp.employee_id]) return true;
    if (onlineUsers[userId]) return true;
    return false;
  }, [onlineUsers, allUsers]);

  const formatTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts), now = new Date();
    if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const y = new Date(now); y.setDate(y.getDate() - 1);
    if (d.toDateString() === y.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatMessageDate = (ts) => {
    if (!ts) return '';
    const d = new Date(ts), now = new Date();
    if (d.toDateString() === now.toDateString()) return 'Today';
    const y = new Date(now); y.setDate(y.getDate() - 1);
    if (d.toDateString() === y.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  };

  /* ── Refresh helpers (used by both effects & polling) ── */
  const refreshConversations = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await chatAPI.getConversations(user.id);
      setConversations(data || []);
    } catch (e) { console.error('refresh convs:', e); }
  }, [user?.id]);

  const refreshMessages = useCallback(async () => {
    if (!selectedConversation?.id || !user?.id) return;
    try {
      const data = await chatAPI.getMessages(selectedConversation.id, 500);
      setMessages(prev => {
        // Only update if there are actual changes (new messages or different count)
        if (!prev || prev.length !== (data || []).length) return data || [];
        // Check if last message id differs
        const lastPrev = prev[prev.length - 1];
        const lastNew = data?.[data.length - 1];
        if (lastPrev?.id !== lastNew?.id) return data || [];
        return prev; // no change, keep reference to avoid re-render
      });
      chatAPI.markMessagesRead(selectedConversation.id, user.id);
    } catch (e) { console.error('refresh msgs:', e); }
  }, [selectedConversation?.id, user?.id]);

  /* ── Initial load ─────────────────────────────────────── */
  useEffect(() => {
    if (!user?.id) return;
    const init = async () => {
      setLoading(true);
      try {
        let convData = [], userData = [];
        try { convData = await chatAPI.getConversations(user.id); } catch (e) { console.error('convs:', e); }
        try { userData = await chatAPI.getAllChatUsers(); } catch (e) { console.error('users:', e); }
        setConversations(convData || []);
        setAllUsers((userData || []).filter(u => u.user_id !== user.id));
        console.log('[Chat] Loaded', (convData || []).length, 'conversations,', (userData || []).length, 'employees');
        try {
          const s = await settingsAPI.get(user.id);
          setPinnedIds(s?.settings_json?.chat_pins || []);
        } catch {}
      } catch (e) {
        console.error('init chat:', e);
        toast.error('Failed to load chat');
      } finally { setLoading(false); }
    };
    init();

    // Realtime subscription (fires if Supabase Realtime is enabled on chat_conversations)
    const sub = chatAPI.subscribeToConversations(user.id, () => {
      refreshConversations();
    });
    setConversationSub(sub);

    // Polling fallback: refresh conversations every 8 seconds
    // This ensures sidebar stays updated even if Realtime isn't enabled
    const convPoll = setInterval(() => {
      refreshConversations();
    }, 8000);

    return () => {
      if (sub) chatAPI.unsubscribeFromChannel(sub);
      clearInterval(convPoll);
    };
  }, [user?.id, refreshConversations]);

  /* ── Load messages when conversation is selected ──────── */
  useEffect(() => {
    if (!selectedConversation || !user?.id) return;
    // Load messages immediately
    refreshMessages();

    // Realtime subscription (fires if Supabase Realtime is enabled on chat_messages)
    if (messageSub) chatAPI.unsubscribeFromMessages(messageSub);
    const sub = chatAPI.subscribeToMessages(selectedConversation.id, (msg, ev) => {
      if (ev === 'INSERT') {
        setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
        if (msg.sender_id !== user.id) {
          soundService.playMessageNotification();
          chatAPI.markMessagesRead(selectedConversation.id, user.id);
        }
      } else if (ev === 'UPDATE') {
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, read_by: msg.read_by } : m));
      }
    });
    setMessageSub(sub);

    // Polling fallback: refresh messages every 4 seconds to catch incoming messages
    const msgPoll = setInterval(() => {
      refreshMessages();
    }, 4000);

    return () => {
      if (sub) chatAPI.unsubscribeFromMessages(sub);
      clearInterval(msgPoll);
    };
  }, [selectedConversation?.id, refreshMessages]);

  /* ── Auto‑scroll ──────────────────────────────────────── */
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  /* ── Mention detection ────────────────────────────────── */
  useEffect(() => {
    const m = newMessage.match(/@(\w*)$/);
    if (m && selectedConversation) {
      const q = m[1].toLowerCase();
      const ps = (selectedConversation.participant_names || []).filter(p => p.user_id !== user?.id).filter(p => !q || (p.name || '').toLowerCase().includes(q));
      setMentionSuggestions(ps);
    } else setMentionSuggestions([]);
  }, [newMessage, selectedConversation]);

  /* ══════════════════════════════════════════════════════════
     WebRTC Calling - Helpers MUST be defined before the useEffect
     ══════════════════════════════════════════════════════════ */
  const outboundCallChannelRef = useRef(null);
  
  // Helper to send on a channel (subscribes if needed)
  const sendOnCallChannel = useCallback(async (remoteUserId, event, payload) => {
    console.log('[Call] sendOnCallChannel:', event, 'to', remoteUserId);
    const channelName = `calls:${remoteUserId}`;
    
    // Check for existing channel
    const existingChannels = supabase.getChannels();
    let channel = existingChannels.find(c => c.topic === `realtime:${channelName}`);
    
    if (!channel) {
      channel = supabase.channel(channelName, { config: { broadcast: { self: false } } });
      // Wait for subscription
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Channel subscription timeout')), 5000);
        channel.subscribe((status) => {
          console.log('[Call] Channel', channelName, 'status:', status);
          if (status === 'SUBSCRIBED') {
            clearTimeout(timeout);
            resolve();
          }
        });
      });
    }
    
    const result = await channel.send({ type: 'broadcast', event, payload });
    console.log('[Call] Send result:', result);
    return result;
  }, []);

  const createPeer = useCallback((remoteUserId) => {
    const pc = new RTCPeerConnection({ 
      iceServers: [
        // Google STUN servers
        { urls: 'stun:stun.l.google.com:19302' }, 
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        // Additional public STUN servers
        { urls: 'stun:stun.stunprotocol.org:3478' },
        // Free public TURN servers (metered.ca provides free TURN)
        {
          urls: 'turn:openrelay.metered.ca:80',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        },
        {
          urls: 'turn:openrelay.metered.ca:443',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        },
        {
          urls: 'turn:openrelay.metered.ca:443?transport=tcp',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        }
      ],
      iceCandidatePoolSize: 10
    });
    
    pc.onicecandidate = async (e) => {
      if (e.candidate) {
        console.log('[Call] Sending ICE candidate:', e.candidate.type, e.candidate.protocol);
        try {
          await sendOnCallChannel(remoteUserId, 'ice_candidate', { candidate: e.candidate, from: user?.id });
        } catch (err) {
          console.error('[Call] Failed to send ICE candidate:', err);
        }
      } else {
        console.log('[Call] ICE gathering complete');
      }
    };
    
    pc.ontrack = (e) => {
      console.log('[Call] Received remote track:', e.track.kind, 'stream id:', e.streams[0]?.id);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = e.streams[0];
        console.log('[Call] Set remote video srcObject');
      }
    };
    
    pc.oniceconnectionstatechange = () => {
      const s = pc.iceConnectionState;
      console.log('[Call] ICE state:', s);
      if (s === 'connected') setCallState(prev => ({ ...prev, status: 'Connected' }));
      if (s === 'disconnected' || s === 'failed') {
        console.log('[Call] Connection lost, ending call');
        // Clean up without recursion
        if (peerRef.current) { peerRef.current.close(); peerRef.current = null; }
        if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()); localStreamRef.current = null; }
        setCallState({ active: false, isVideo: false, remoteName: '', micOn: true, videoOn: true, screenOn: false, status: '' });
      }
    };
    
    return pc;
  }, [user?.id, sendOnCallChannel]);

  const answerCall = useCallback(async (fromUserId, fromName, isVideo, offer) => {
    console.log('[Call] Answering call from', fromName, fromUserId);
    let actualIsVideo = isVideo;
    try {
      let stream;
      
      // Try to get media with requested constraints
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: isVideo });
      } catch (mediaErr) {
        console.warn('[Call] getUserMedia failed with video=' + isVideo + ':', mediaErr.name, mediaErr.message);
        
        if (isVideo) {
          // Fallback: try audio-only if video was requested but failed
          console.log('[Call] Falling back to audio-only...');
          try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            actualIsVideo = false;
            toast('Camera unavailable – joining with audio only', { icon: '🎙️' });
          } catch (audioErr) {
            console.error('[Call] Audio-only also failed:', audioErr.name, audioErr.message);
            throw audioErr;
          }
        } else {
          throw mediaErr;
        }
      }

      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = createPeer(fromUserId);
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      peerRef.current = pc;

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      remoteDescriptionSet.current = true; // Mark that we can now add ICE candidates
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log('[Call] Created answer, sending...');

      await sendOnCallChannel(fromUserId, 'call_answer', { answer: pc.localDescription, from: user?.id });
      console.log('[Call] Answer sent');

      setCallState({ active: true, isVideo: actualIsVideo, remoteName: fromName, micOn: true, videoOn: actualIsVideo, screenOn: false, status: 'Connected' });
    } catch (err) {
      console.error('[Call] Answer failed:', err);
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
      }
      if (peerRef.current) {
        peerRef.current.close();
        peerRef.current = null;
      }
      // Provide specific error messages based on the error type
      const errName = err?.name || '';
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        toast.error('Microphone/camera permission denied. Please allow access in your browser or system settings.');
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        toast.error('No microphone or camera found. Please connect a device and try again.');
      } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
        toast.error('Microphone/camera is in use by another application.');
      } else {
        toast.error(`Could not answer call: ${err.message || 'Unknown error. Check camera/microphone permissions.'}`);
      }
    }
  }, [user?.id, createPeer, sendOnCallChannel]);

  const endCall = useCallback(async (silent = false) => {
    console.log('[Call] Ending call, silent:', silent);
    soundService.stopRingtone();
    soundService.stopRingback();
    if (!silent) soundService.playCallEnded();
    if (peerRef.current) { peerRef.current.close(); peerRef.current = null; }
    if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()); localStreamRef.current = null; }
    
    // Reset ICE candidate queue and flag for next call
    iceCandidateQueue.current = [];
    remoteDescriptionSet.current = false;
    
    if (!silent && selectedConversation) {
      const other = (selectedConversation.participant_names || []).find(p => p.user_id !== user?.id);
      if (other) {
        try {
          await sendOnCallChannel(other.user_id, 'call_ended', { from: user?.id });
        } catch (e) {
          console.error('[Call] Error sending call_ended:', e);
        }
      }
    }
    setCallState({ active: false, isVideo: false, remoteName: '', micOn: true, videoOn: true, screenOn: false, status: '' });
    setCallMinimized(false); // Reset minimized state
  }, [user?.id, selectedConversation, sendOnCallChannel]);

  /* ── Incoming call listener (NOW after helpers are defined) ── */
  useEffect(() => {
    if (!user?.id) return;
    console.log('[Call] Setting up incoming call listener for user:', user.id);
    
    const ch = supabase.channel(`calls:${user.id}`, { config: { broadcast: { self: false } } });
    
    // Receive incoming call (as the receiver)
    ch.on('broadcast', { event: 'incoming_call' }, async (payload) => {
      console.log('[Call] Received incoming_call:', payload);
      const { from, fromName, isVideo, offer } = payload.payload;
      soundService.playIncomingRing();
      const accept = window.confirm(`${fromName} is calling you (${isVideo ? 'Video' : 'Voice'}). Accept?`);
      soundService.stopRingtone();
      if (!accept) {
        console.log('[Call] User rejected the call');
        try {
          await sendOnCallChannel(from, 'call_rejected', { from: user.id });
        } catch (e) {
          console.error('[Call] Error sending rejection:', e);
        }
        return;
      }
      await answerCall(from, fromName, isVideo, offer);
    });
    
    // Receive answer to our call (as the caller)
    ch.on('broadcast', { event: 'call_answer' }, async (payload) => {
      console.log('[Call] Received call_answer');
      soundService.stopRingback();
      if (peerRef.current && payload.payload.answer) {
        try { 
          await peerRef.current.setRemoteDescription(new RTCSessionDescription(payload.payload.answer));
          console.log('[Call] Remote description set');
          remoteDescriptionSet.current = true;
          
          // Process queued ICE candidates
          console.log('[Call] Processing', iceCandidateQueue.current.length, 'queued ICE candidates');
          while (iceCandidateQueue.current.length > 0) {
            const candidate = iceCandidateQueue.current.shift();
            try {
              await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
              console.log('[Call] Added queued ICE candidate');
            } catch (e) {
              console.error('[Call] Error adding queued ICE candidate:', e);
            }
          }
          
          setCallState(prev => ({ ...prev, status: 'Connected' }));
        } catch (e) {
          console.error('[Call] Error setting remote description:', e);
        }
      }
    });
    
    // Receive ICE candidates
    ch.on('broadcast', { event: 'ice_candidate' }, async (payload) => {
      console.log('[Call] Received ice_candidate, remoteDescSet:', remoteDescriptionSet.current);
      if (peerRef.current && payload.payload.candidate) {
        // If remote description not set yet, queue the candidate
        if (!remoteDescriptionSet.current) {
          console.log('[Call] Queueing ICE candidate (remote description not set yet)');
          iceCandidateQueue.current.push(payload.payload.candidate);
          return;
        }
        try { 
          await peerRef.current.addIceCandidate(new RTCIceCandidate(payload.payload.candidate)); 
          console.log('[Call] Added ICE candidate');
        } catch (e) {
          console.error('[Call] Error adding ICE candidate:', e);
        }
      }
    });
    
    // Call ended by other party
    ch.on('broadcast', { event: 'call_ended' }, () => { 
      console.log('[Call] Received call_ended');
      soundService.playCallEnded();
      toast('Call ended');
      endCall(true); 
    });
    
    // Call was rejected
    ch.on('broadcast', { event: 'call_rejected' }, () => {
      console.log('[Call] Received call_rejected');
      soundService.playCallRejected();
      toast.error('Call was rejected');
      endCall(true);
    });
    
    ch.subscribe((status) => {
      console.log('[Call] Own channel subscription status:', status);
    });
    callChannelRef.current = ch;
    
    return () => { 
      console.log('[Call] Cleaning up call listener');
      supabase.removeChannel(ch); 
    };
  }, [user?.id, answerCall, endCall, sendOnCallChannel]);

  const startCall = async (isVideo) => {
    if (!selectedConversation || selectedConversation.type !== 'direct') {
      toast.error('Calls are available for direct conversations only');
      return;
    }
    const other = (selectedConversation.participant_names || []).find(p => p.user_id !== user.id);
    if (!other) {
      toast.error('Could not find call recipient');
      return;
    }
    const remoteUserId = other.user_id;
    console.log('[Call] Starting', isVideo ? 'video' : 'voice', 'call to', other.name, remoteUserId);

    try {
      // Request media permissions with fallback
      let stream;
      let actualIsVideo = isVideo;
      
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: isVideo });
      } catch (mediaErr) {
        console.warn('[Call] getUserMedia failed with video=' + isVideo + ':', mediaErr.name, mediaErr.message);
        if (isVideo) {
          // Fallback to audio-only
          try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            actualIsVideo = false;
            toast('Camera unavailable – starting audio-only call', { icon: '🎙️' });
          } catch (audioErr) {
            throw audioErr;
          }
        } else {
          throw mediaErr;
        }
      }
      
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = createPeer(remoteUserId);
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      peerRef.current = pc;

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log('[Call] Created offer, sending...');

      // Send the call signal using our helper
      await sendOnCallChannel(remoteUserId, 'incoming_call', { 
        from: user.id, 
        fromName: user.name || user.email || 'Unknown', 
        isVideo: actualIsVideo, 
        offer: pc.localDescription, 
        conversationId: selectedConversation.id 
      });
      console.log('[Call] Sent incoming_call signal');

      soundService.playOutgoingRingback();
      setCallState({ active: true, isVideo: actualIsVideo, remoteName: other.name, micOn: true, videoOn: actualIsVideo, screenOn: false, status: 'Ringing…' });
    } catch (err) {
      console.error('[Call] Failed:', err);
      // Clean up on error
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
      }
      if (peerRef.current) {
        peerRef.current.close();
        peerRef.current = null;
      }
      const errName = err?.name || '';
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        toast.error('Microphone/camera permission denied. Please allow access in your browser or system settings.');
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        toast.error('No microphone or camera found. Please connect a device and try again.');
      } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
        toast.error('Microphone/camera is in use by another application.');
      } else {
        toast.error(`Could not start call: ${err.message || 'Unknown error. Check camera/microphone permissions.'}`);
      }
    }
  };

  const toggleMic = () => {
    if (localStreamRef.current) {
      const track = localStreamRef.current.getAudioTracks()[0];
      if (track) { track.enabled = !track.enabled; setCallState(prev => ({ ...prev, micOn: track.enabled })); }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const track = localStreamRef.current.getVideoTracks()[0];
      if (track) { track.enabled = !track.enabled; setCallState(prev => ({ ...prev, videoOn: track.enabled })); }
    }
  };

  const toggleScreen = async () => {
    if (!peerRef.current) return;
    try {
      if (!callState.screenOn) {
        const screen = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const sender = peerRef.current.getSenders().find(s => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(screen.getVideoTracks()[0]);
        screen.getVideoTracks()[0].onended = () => toggleScreen();
        setCallState(prev => ({ ...prev, screenOn: true }));
      } else {
        const cam = await navigator.mediaDevices.getUserMedia({ video: true });
        const sender = peerRef.current.getSenders().find(s => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(cam.getVideoTracks()[0]);
        setCallState(prev => ({ ...prev, screenOn: false }));
      }
    } catch (err) {
      console.error('Screen share error:', err);
    }
  };

  /* ── Send message ─────────────────────────────────────── */
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || sendingMessage) return;
    const content = newMessage.trim();
    setSendingMessage(true);
    console.log('[Chat] Sending message to conversation:', selectedConversation.id);
    console.log('[Chat] User ID:', user.id);
    console.log('[Chat] Content:', content);

    const mentionMatches = content.match(/@(\w[\w\s]*?)(?=\s|$|@)/g) || [];
    const mentionedNames = mentionMatches.map(m => m.replace('@', '').trim().toLowerCase());
    const participantNames = selectedConversation.participant_names || [];
    const mentionedIds = participantNames.filter(p => mentionedNames.some(n => (p.name || '').toLowerCase().includes(n))).map(p => p.user_id);

    const tempId = `temp_${Date.now()}`;
    const optimistic = {
      id: tempId, conversation_id: selectedConversation.id, sender_id: user.id,
      content, message_type: 'text', read_by: [user.id],
      created_at: new Date().toISOString(), sender_name: 'You', _sending: true,
    };
    setMessages(prev => [...prev, optimistic]);
    setNewMessage('');

    try {
      const sent = await chatAPI.sendMessage({ conversationId: selectedConversation.id, senderId: user.id, content, mentions: mentionedIds });
      soundService.playMessageSent();
      console.log('[Chat] Message sent successfully:', sent);
      setMessages(prev => prev.map(m => m.id === tempId ? { ...sent, _sending: false } : m));
      const updated = await chatAPI.getConversations(user.id);
      console.log('[Chat] Conversations updated, count:', (updated || []).length);
      setConversations(updated || []);
    } catch (err) {
      console.error('[Chat] Failed to send message:', err);
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, _failed: true, _sending: false } : m));
      toast.error('Failed to send message: ' + (err.message || 'Unknown error'));
    } finally { setSendingMessage(false); }
  };

  /* ── New conversation ─────────────────────────────────── */
  const startNewConversation = async (employee) => {
    if (!employee?.user_id) {
      toast.error(`${employee?.name || 'This employee'} doesn't have a user account yet.`);
      return;
    }
    try {
      console.log('[Chat] Starting conversation with', employee.name, employee.user_id);
      const conv = await chatAPI.createConversation([user.id, employee.user_id], null, 'direct');
      console.log('[Chat] Conversation created/found:', conv.id, conv.display_name);
      
      // Refresh conversations list
      const data = await chatAPI.getConversations(user.id);
      console.log('[Chat] Refreshed conversations:', (data || []).length);
      setConversations(data || []);
      
      // Find the enriched version from the list, or use the enriched conv from createConversation
      const enrichedConv = (data || []).find(c => c.id === conv.id) || conv;
      console.log('[Chat] Selected conversation:', enrichedConv.id, enrichedConv.display_name);
      setSelectedConversation(enrichedConv);
      setMessages([]); // Clear messages for new conversation
      setShowNewChat(false);
      setUserSearch('');
    } catch (err) {
      console.error('[Chat] startNewConversation error:', err);
      toast.error('Failed to start conversation');
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) { toast.error('Please enter a group name'); return; }
    if (groupSelected.length === 0) { toast.error('Please select at least one member'); return; }
    try {
      const ids = Array.from(new Set([user.id, ...groupSelected]));
      const conv = await chatAPI.createConversation(ids, groupName.trim(), 'group');
      const data = await chatAPI.getConversations(user.id);
      setConversations(data || []);
      setSelectedConversation((data || []).find(c => c.id === conv.id) || conv);
      setShowNewChat(false); setGroupName(''); setGroupSelected([]); setIsGroupMode(false); setUserSearch('');
      toast.success('Group created!');
    } catch { toast.error('Failed to create group'); }
  };

  const togglePin = async (e, cid) => {
    e.stopPropagation();
    try {
      if (pinnedIds.includes(cid)) {
        await chatAPI.unpinConversation(user.id, cid);
        setPinnedIds(prev => prev.filter(id => id !== cid));
      } else {
        await chatAPI.pinConversation(user.id, cid);
        setPinnedIds(prev => [cid, ...prev]);
      }
    } catch {}
  };

  const insertMention = (p) => {
    const m = newMessage.match(/@(\w*)$/);
    const prefix = newMessage.slice(0, m ? m.index : newMessage.length);
    setNewMessage(`${prefix}@${p.name} `);
    setMentionSuggestions([]);
    inputRef.current?.focus();
  };

  /* ── Derived data ─────────────────────────────────────── */
  // Mobile detection
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showMobileTeam, setShowMobileTeam] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const filteredConversations = useMemo(() => {
    let list = conversations.filter(c => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (c.display_name || '').toLowerCase().includes(q) || (c.last_message || '').toLowerCase().includes(q);
    });
    list.sort((a, b) => {
      const ap = pinnedIds.includes(a.id) ? 0 : 1, bp = pinnedIds.includes(b.id) ? 0 : 1;
      if (ap !== bp) return ap - bp;
      return new Date(b.last_message_at || b.updated_at) - new Date(a.last_message_at || a.updated_at);
    });
    return list;
  }, [conversations, search, pinnedIds]);

  const filteredEmployees = useMemo(() => {
    if (!userSearch) return allUsers;
    const q = userSearch.toLowerCase();
    return allUsers.filter(u => (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q) || (u.department || '').toLowerCase().includes(q));
  }, [allUsers, userSearch]);

  // Right sidebar: employees split into online/offline
  const { onlineEmps, offlineEmps } = useMemo(() => {
    let list = allUsers;
    if (empSearch) {
      const q = empSearch.toLowerCase();
      list = list.filter(u => (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q) || (u.department || '').toLowerCase().includes(q));
    }
    const on = [], off = [];
    list.forEach(emp => {
      const online = isUserOnline(emp.user_id);
      if (online) on.push(emp); else off.push(emp);
    });
    return { onlineEmps: on, offlineEmps: off };
  }, [allUsers, empSearch, isUserOnline]);

  const groupedMessages = useMemo(() => {
    const g = [];
    let last = '';
    messages.forEach(msg => {
      const ds = new Date(msg.created_at).toDateString();
      if (ds !== last) { g.push({ type: 'date', date: formatMessageDate(msg.created_at) }); last = ds; }
      g.push({ type: 'message', ...msg });
    });
    return g;
  }, [messages]);

  const totalParticipants = selectedConversation?.participants?.length || 2;

  /* ══════════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════ */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-12rem)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-guardian-600"></div>
      </div>
    );
  }

  return (
    <>
      {/* Call overlay */}
      <CallOverlay
        callState={callState}
        onEndCall={() => endCall()}
        onToggleMic={toggleMic}
        onToggleVideo={toggleVideo}
        onToggleScreen={toggleScreen}
        localVideoRef={localVideoRef}
        remoteVideoRef={remoteVideoRef}
        minimized={callMinimized}
        onToggleMinimize={() => setCallMinimized(prev => !prev)}
      />

      <div className={`flex h-[calc(100vh-12rem)] md:h-[calc(100vh-12rem)] gap-0 md:gap-3 animate-fade-in ${isMobile ? 'h-[calc(100vh-8rem)]' : ''}`}>

        {/* ─── LEFT: Conversations sidebar ────────────────── */}
        <div className={`${isMobile ? (selectedConversation ? 'hidden' : 'w-full') : 'w-72'} flex flex-col card overflow-hidden flex-shrink-0`}>
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                <MessageCircle className="w-4 h-4 text-guardian-600" /> Messages
              </h2>
              <div className="flex items-center gap-1">
                {isMobile && (
                  <button
                    onClick={() => setShowMobileTeam(true)}
                    className="p-1.5 text-guardian-600 hover:bg-guardian-50 dark:hover:bg-guardian-900/20 rounded-lg transition-colors"
                    title="Show team"
                  >
                    <Users className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => { setShowNewChat(true); setIsGroupMode(false); setUserSearch(''); }}
                  className="p-1.5 text-guardian-600 hover:bg-guardian-50 dark:hover:bg-guardian-900/20 rounded-lg transition-colors"
                  title="New conversation"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input type="text" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} className="input pl-8 w-full text-sm py-1.5" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length > 0 ? filteredConversations.map(conv => {
              const isPinned = pinnedIds.includes(conv.id);
              return (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className={`p-2.5 border-b border-gray-100 dark:border-gray-700/50 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 ${selectedConversation?.id === conv.id ? 'bg-guardian-50 dark:bg-guardian-900/20 border-l-2 border-l-guardian-500' : ''}`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="relative flex-shrink-0">
                      <Avatar name={conv.display_name} avatarUrl={conv.type === 'direct' ? conv.participant_names?.find(p => p.user_id !== user.id)?.avatar : null} isGroup={conv.type === 'group'} size="sm" />
                      {conv.type === 'direct' && (() => {
                        const oid = conv.participant_names?.find(p => p.user_id !== user.id)?.user_id;
                        return <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 ${isUserOnline(oid) ? 'bg-green-500' : 'bg-gray-400'} border-2 border-white dark:border-gray-800 rounded-full`}></span>;
                      })()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 min-w-0">
                          {conv.type === 'group' && <Hash className="w-3 h-3 text-purple-400 flex-shrink-0" />}
                          <p className="font-medium text-gray-900 dark:text-white truncate text-xs">{conv.display_name}</p>
                        </div>
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          <span className="text-[10px] text-gray-400">{formatTime(conv.last_message_at)}</span>
                          <button onClick={e => togglePin(e, conv.id)} className={`p-0.5 rounded transition-colors ${isPinned ? 'text-guardian-600' : 'text-gray-300 hover:text-gray-500'}`}><Pin className="w-2.5 h-2.5" /></button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate pr-1">
                          {conv.last_sender_id === user.id ? 'You: ' : ''}{conv.last_message || 'No messages yet'}
                        </p>
                        {conv.unread_count > 0 && (
                          <span className="bg-guardian-600 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0">
                            {conv.unread_count > 9 ? '9+' : conv.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="p-6 text-center">
                <MessageCircle className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-gray-500 dark:text-gray-400 text-xs">No conversations</p>
                <button onClick={() => setShowNewChat(true)} className="mt-2 text-guardian-600 text-xs font-medium hover:underline">Start a new chat</button>
              </div>
            )}
          </div>
        </div>

        {/* ─── CENTER: Chat area ─────────────────────────── */}
        <div className={`${isMobile ? (selectedConversation ? 'w-full' : 'hidden') : 'flex-1'} flex flex-col card overflow-hidden min-w-0`}>
          {selectedConversation ? (
            <>
              {/* Header */}
              <div className="p-2 md:p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2 md:gap-3">
                  {/* Back button for mobile */}
                  {isMobile && (
                    <button
                      onClick={() => setSelectedConversation(null)}
                      className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                  <div className="relative">
                    <Avatar name={selectedConversation.display_name} isGroup={selectedConversation.type === 'group'} avatarUrl={selectedConversation.type === 'direct' ? selectedConversation.participant_names?.find(p => p.user_id !== user.id)?.avatar : null} size={isMobile ? 'sm' : 'md'} />
                    {selectedConversation.type === 'direct' && (() => {
                      const oid = selectedConversation.participant_names?.find(p => p.user_id !== user.id)?.user_id;
                      return isUserOnline(oid) ? <span className="absolute bottom-0 right-0 w-2.5 h-2.5 md:w-3 md:h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></span> : null;
                    })()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      {selectedConversation.type === 'group' && <Hash className="w-3 h-3 md:w-3.5 md:h-3.5 text-purple-400 flex-shrink-0" />}
                      <p className="font-medium text-sm md:text-base text-gray-900 dark:text-white truncate">{selectedConversation.display_name}</p>
                    </div>
                    {selectedConversation.type === 'group' ? (
                      <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 truncate max-w-[120px] md:max-w-none">{(selectedConversation.participant_names || []).map(p => p.name).join(', ')}</p>
                    ) : (() => {
                      const oid = selectedConversation.participant_names?.find(p => p.user_id !== user.id)?.user_id;
                      const on = isUserOnline(oid);
                      return <p className={`text-[10px] md:text-xs ${on ? 'text-green-500' : 'text-gray-400'}`}>{on ? 'Online' : 'Offline'}</p>;
                    })()}
                  </div>
                </div>
                <div className="flex items-center gap-0.5 md:gap-1">
                  {selectedConversation.type === 'group' && (
                    <span className="text-[10px] md:text-xs text-gray-400 dark:text-gray-500 mr-1 md:mr-2 hidden sm:inline"><Users className="w-3 h-3 md:w-4 md:h-4 inline mr-1" />{selectedConversation.participants?.length || 0}</span>
                  )}
                  <button onClick={() => startCall(false)} className="p-1.5 md:p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" title="Voice Call">
                    <Phone className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                  <button onClick={() => startCall(true)} className="p-1.5 md:p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" title="Video Call">
                    <Video className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                  <button className="p-1.5 md:p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors hidden md:block">
                    <MoreVertical className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-1 bg-gray-50 dark:bg-gray-900/30">
                {groupedMessages.length === 0 && (
                  <div className="text-center py-12">
                    <MessageCircle className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                    <p className="text-gray-500 dark:text-gray-400 text-sm">No messages yet. Say hello!</p>
                  </div>
                )}
                {groupedMessages.map((item, idx) => {
                  if (item.type === 'date') {
                    return (
                      <div key={`d-${idx}`} className="flex items-center justify-center my-4">
                        <span className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-3 py-1 rounded-full">{item.date}</span>
                      </div>
                    );
                  }
                  const msg = item, isOwn = msg.sender_id === user?.id;
                  return (
                    <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}>
                      {!isOwn && selectedConversation.type === 'group' && <Avatar name={msg.sender_name} avatarUrl={msg.sender_avatar} size="sm" />}
                      <div className={`max-w-[70%] ${!isOwn && selectedConversation.type === 'group' ? 'ml-2' : ''}`}>
                        {!isOwn && selectedConversation.type === 'group' && (
                          <p className="text-xs text-guardian-600 dark:text-guardian-400 font-medium mb-0.5 ml-1">{msg.sender_name}</p>
                        )}
                        <div className={`px-4 py-2 rounded-2xl ${
                          isOwn
                            ? 'bg-guardian-600 text-white rounded-br-md'
                            : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-md shadow-sm border border-gray-200 dark:border-gray-600'
                        } ${msg._sending ? 'opacity-70' : ''} ${msg._failed ? 'border-2 border-red-400' : ''}`}>
                          <MessageContent content={msg.content} isOwn={isOwn} />
                        </div>
                        <div className={`flex items-center mt-0.5 gap-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                          <span className="text-[10px] text-gray-500 dark:text-gray-400 ml-1">{formatTime(msg.created_at)}</span>
                          {isOwn && !msg._sending && !msg._failed && <MessageStatus message={msg} totalParticipants={totalParticipants} />}
                          {msg._sending && <span className="text-[10px] text-gray-400 ml-1">Sending…</span>}
                          {msg._failed && <span className="text-[10px] text-red-400 ml-1">Failed</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form onSubmit={handleSendMessage} className="p-2 md:p-3 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 bg-white dark:bg-gray-800">
                <div className="relative">
                  <MentionDropdown suggestions={mentionSuggestions} onSelect={insertMention} />
                  <div className="flex items-center gap-1 md:gap-2">
                    <button type="button" className="p-1.5 md:p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"><Paperclip className="w-4 h-4 md:w-5 md:h-5" /></button>
                    <div className="flex-1 relative">
                      <input
                        ref={inputRef} type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)}
                        placeholder={isMobile ? 'Type a message…' : (selectedConversation.type === 'group' ? 'Type a message… (use @ to mention)' : 'Type a message…')}
                        className="w-full border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-3 md:px-4 py-2 pr-8 md:pr-10 text-sm focus:ring-2 focus:ring-guardian-500 focus:border-transparent outline-none placeholder-gray-400 dark:placeholder-gray-500"
                        disabled={sendingMessage}
                      />
                      <button type="button" onClick={() => setNewMessage(p => p + '@')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-guardian-600 rounded transition-colors hidden md:block" title="Mention someone"><AtSign className="w-4 h-4" /></button>
                    </div>
                    <button type="submit" disabled={!newMessage.trim() || sendingMessage} className="p-2 md:p-2.5 bg-guardian-600 text-white rounded-lg hover:bg-guardian-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"><Send className="w-4 h-4 md:w-5 md:h-5" /></button>
                  </div>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Select a conversation</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">Choose from the sidebar or start a new chat</p>
                <button onClick={() => setShowNewChat(true)} className="btn btn-primary"><Plus className="w-4 h-4 mr-2" /> Start New Chat</button>
              </div>
            </div>
          )}
        </div>

        {/* ─── RIGHT: Employee directory (hidden on mobile) ─────────────────── */}
        <div className="hidden md:flex w-64 flex-col card overflow-hidden flex-shrink-0">
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-1.5 mb-2">
              <Users className="w-4 h-4 text-guardian-600" /> Team
            </h2>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input type="text" placeholder="Search…" value={empSearch} onChange={e => setEmpSearch(e.target.value)} className="input pl-8 w-full text-sm py-1.5" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Online employees */}
            {onlineEmps.length > 0 && (
              <div>
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 sticky top-0">
                  Online — {onlineEmps.length}
                </div>
                {onlineEmps.map(emp => (
                  <div
                    key={emp.user_id || emp.employee_id}
                    onClick={() => emp.user_id && startNewConversation(emp)}
                    className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="relative flex-shrink-0">
                      <Avatar name={emp.name} avatarUrl={emp.avatar_url} size="sm" />
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{emp.name || 'Unknown'}</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                        {emp.designation ? getPositionLabel(emp.designation) : ''}
                        {emp.designation && emp.department ? ' • ' : ''}
                        {emp.department ? getDepartmentLabel(emp.department) : ''}
                        {!emp.designation && !emp.department ? emp.email : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Offline employees */}
            {offlineEmps.length > 0 && (
              <div>
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700/50 sticky top-0">
                  Offline — {offlineEmps.length}
                </div>
                {offlineEmps.map(emp => (
                  <div
                    key={emp.user_id || emp.employee_id}
                    onClick={() => emp.user_id && startNewConversation(emp)}
                    className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors opacity-70"
                  >
                    <div className="relative flex-shrink-0">
                      <Avatar name={emp.name} avatarUrl={emp.avatar_url} size="sm" />
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-gray-400 border-2 border-white dark:border-gray-800 rounded-full"></span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{emp.name || 'Unknown'}</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                        {emp.designation ? getPositionLabel(emp.designation) : ''}
                        {emp.designation && emp.department ? ' • ' : ''}
                        {emp.department ? getDepartmentLabel(emp.department) : ''}
                        {!emp.designation && !emp.department ? emp.email : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {onlineEmps.length === 0 && offlineEmps.length === 0 && (
              <div className="p-6 text-center">
                <Users className="w-8 h-8 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-gray-500 dark:text-gray-400 text-xs">No employees found</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Mobile Team Drawer ────────────────── */}
      {showMobileTeam && (
        <div className="fixed inset-0 bg-black/50 z-50 md:hidden" onClick={() => setShowMobileTeam(false)}>
          <div 
            className="absolute right-0 top-0 h-full w-80 max-w-[85vw] bg-white dark:bg-gray-800 shadow-xl flex flex-col animate-slide-in-right"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                <Users className="w-4 h-4 text-guardian-600" /> Team
              </h2>
              <button
                onClick={() => setShowMobileTeam(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input type="text" placeholder="Search team…" value={empSearch} onChange={e => setEmpSearch(e.target.value)} className="input pl-8 w-full text-sm py-1.5" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {/* Online employees */}
              {onlineEmps.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 sticky top-0">
                    Online — {onlineEmps.length}
                  </div>
                  {onlineEmps.map(emp => (
                    <div
                      key={emp.user_id || emp.employee_id}
                      onClick={() => {
                        if (emp.user_id) {
                          startNewConversation(emp);
                          setShowMobileTeam(false);
                        }
                      }}
                      className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <div className="relative flex-shrink-0">
                        <Avatar name={emp.name} avatarUrl={emp.avatar_url} size="sm" />
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{emp.name || 'Unknown'}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{emp.designation || emp.department || emp.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Offline employees */}
              {offlineEmps.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700/50 sticky top-0">
                    Offline — {offlineEmps.length}
                  </div>
                  {offlineEmps.map(emp => (
                    <div
                      key={emp.user_id || emp.employee_id}
                      onClick={() => {
                        if (emp.user_id) {
                          startNewConversation(emp);
                          setShowMobileTeam(false);
                        }
                      }}
                      className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors opacity-70"
                    >
                      <div className="relative flex-shrink-0">
                        <Avatar name={emp.name} avatarUrl={emp.avatar_url} size="sm" />
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-gray-400 border-2 border-white dark:border-gray-800 rounded-full"></span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{emp.name || 'Unknown'}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{emp.designation || emp.department || emp.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {onlineEmps.length === 0 && offlineEmps.length === 0 && (
                <div className="p-6 text-center">
                  <Users className="w-8 h-8 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                  <p className="text-gray-500 dark:text-gray-400 text-sm">No employees found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── New Chat / Create Group Modal ────────────────── */}
      {showNewChat && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => { setShowNewChat(false); setIsGroupMode(false); setUserSearch(''); }}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{isGroupMode ? 'Create Group Chat' : 'New Conversation'}</h2>
              <button onClick={() => { setShowNewChat(false); setIsGroupMode(false); setUserSearch(''); }} className="p-1 text-gray-400 hover:text-gray-600 rounded"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex border-b dark:border-gray-700">
              <button onClick={() => setIsGroupMode(false)} className={`flex-1 py-2.5 text-sm font-medium transition-colors ${!isGroupMode ? 'text-guardian-600 border-b-2 border-guardian-600' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                <MessageCircle className="w-4 h-4 inline mr-1.5" />Direct
              </button>
              <button onClick={() => setIsGroupMode(true)} className={`flex-1 py-2.5 text-sm font-medium transition-colors ${isGroupMode ? 'text-guardian-600 border-b-2 border-guardian-600' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                <Users className="w-4 h-4 inline mr-1.5" />Group
              </button>
            </div>

            {isGroupMode && (
              <div className="px-4 pt-3">
                <input value={groupName} onChange={e => setGroupName(e.target.value)} className="input w-full" placeholder="Group name…" autoFocus />
                {groupSelected.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {groupSelected.map(uid => {
                      const emp = allUsers.find(e => e.user_id === uid);
                      return (
                        <span key={uid} className="inline-flex items-center gap-1 bg-guardian-100 dark:bg-guardian-900/30 text-guardian-700 dark:text-guardian-300 text-xs px-2 py-1 rounded-full">
                          {emp?.name || 'User'}
                          <button onClick={() => setGroupSelected(prev => prev.filter(id => id !== uid))} className="hover:text-red-500"><X className="w-3 h-3" /></button>
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
                <input type="text" placeholder="Search employees…" value={userSearch} onChange={e => setUserSearch(e.target.value)} className="input pl-10 w-full" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-2 pb-2">
              {filteredEmployees.length > 0 ? filteredEmployees.map(emp => {
                const empOnline = isUserOnline(emp.user_id);
                const hasAccount = !!emp.user_id;
                return (
                  <div
                    key={emp.user_id || emp.employee_id}
                    onClick={() => {
                      if (!hasAccount) { toast.error(`${emp.name} doesn't have a user account yet.`); return; }
                      if (isGroupMode) { setGroupSelected(prev => prev.includes(emp.user_id) ? prev.filter(id => id !== emp.user_id) : [...prev, emp.user_id]); }
                      else { startNewConversation(emp); }
                    }}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${!hasAccount ? 'opacity-50' : isGroupMode && groupSelected.includes(emp.user_id) ? 'bg-guardian-50 dark:bg-guardian-900/20 ring-1 ring-guardian-300' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
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
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{emp.designation ? `${emp.designation} · ` : ''}{emp.department || emp.email}</p>
                    </div>
                    {isGroupMode && hasAccount && groupSelected.includes(emp.user_id) && (
                      <div className="w-5 h-5 bg-guardian-600 rounded-full flex items-center justify-center"><Check className="w-3 h-3 text-white" /></div>
                    )}
                  </div>
                );
              }) : (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8 text-sm">No employees found</p>
              )}
            </div>

            {isGroupMode && (
              <div className="p-4 border-t dark:border-gray-700">
                <button onClick={handleCreateGroup} disabled={!groupName.trim() || groupSelected.length === 0} className="btn btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed">
                  <UserPlus className="w-4 h-4 mr-2" />Create Group ({groupSelected.length} member{groupSelected.length !== 1 ? 's' : ''})
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default ChatPage;
