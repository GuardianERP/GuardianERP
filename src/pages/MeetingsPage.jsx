/**
 * Guardian Desktop ERP - Meetings Page
 * Full-featured meeting management with calendar, scheduling, and video conferencing
 * Features: Schedule meetings, invite employees, video/audio calls, screen sharing
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Plus, Search, Calendar, Clock, Users, Video, Phone,
  Monitor, Mic, MicOff, VideoOff, PhoneOff, MoreVertical,
  Edit2, Trash2, CheckCircle, XCircle, ChevronLeft, ChevronRight,
  CalendarDays, List, UserPlus, X, Copy, ExternalLink,
  Minimize2, Maximize2, Settings, Link2
} from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { meetingsAPI, employeesAPI, notificationsAPI } from '../services/api';
import { supabase } from '../services/supabaseClient';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, parseISO, isToday } from 'date-fns';
import toast from 'react-hot-toast';
import { getPositionLabel, getDepartmentLabel } from '../data/organizationConfig';

// ============================================
// Calendar Day Component
// ============================================
function CalendarDay({ day, currentMonth, meetings, onDayClick, selectedDate }) {
  const dayMeetings = meetings.filter(m => isSameDay(parseISO(m.start_time), day));
  const isSelected = selectedDate && isSameDay(day, selectedDate);
  const isCurrentMonth = isSameMonth(day, currentMonth);
  
  return (
    <div
      onClick={() => onDayClick(day)}
      className={`min-h-24 p-1 border border-gray-200 dark:border-gray-700 cursor-pointer transition-colors
        ${!isCurrentMonth ? 'bg-gray-50 dark:bg-gray-800/50 text-gray-400' : 'bg-white dark:bg-gray-800'}
        ${isToday(day) ? 'ring-2 ring-guardian-500' : ''}
        ${isSelected ? 'bg-guardian-50 dark:bg-guardian-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}
      `}
    >
      <div className={`text-sm font-medium mb-1 
        ${isToday(day) ? 'w-7 h-7 bg-guardian-600 text-white rounded-full flex items-center justify-center' : ''}
      `}>
        {format(day, 'd')}
      </div>
      <div className="space-y-1">
        {dayMeetings.slice(0, 3).map((meeting) => (
          <div
            key={meeting.id}
            className={`text-xs px-1.5 py-0.5 rounded truncate
              ${meeting.status === 'cancelled' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                meeting.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              }
            `}
            title={meeting.title}
          >
            {format(parseISO(meeting.start_time), 'HH:mm')} {meeting.title}
          </div>
        ))}
        {dayMeetings.length > 3 && (
          <div className="text-xs text-gray-500 pl-1">+{dayMeetings.length - 3} more</div>
        )}
      </div>
    </div>
  );
}

// ============================================
// Meeting Card Component
// ============================================
function MeetingCard({ meeting, onEdit, onDelete, onJoin, employees, currentUser }) {
  const startTime = parseISO(meeting.start_time);
  const endTime = parseISO(meeting.end_time);
  const isOrganizer = meeting.organizer_id === currentUser?.id;
  const participants = meeting.participants || [];
  const participantCount = participants.length;
  
  const statusColors = {
    scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    in_progress: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    completed: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  };

  const canJoin = meeting.status === 'scheduled' || meeting.status === 'in_progress';

  return (
    <div className="card p-4 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">{meeting.title}</h3>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[meeting.status]}`}>
              {meeting.status.replace('_', ' ')}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              meeting.meeting_type === 'video' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
              meeting.meeting_type === 'audio' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
              'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
            }`}>
              {meeting.meeting_type === 'video' ? <Video className="w-3 h-3 inline mr-1" /> :
               meeting.meeting_type === 'audio' ? <Phone className="w-3 h-3 inline mr-1" /> : null}
              {meeting.meeting_type}
            </span>
          </div>
          
          {meeting.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">
              {meeting.description}
            </p>
          )}
          
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {format(startTime, 'MMM d, yyyy')}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {participantCount} participant{participantCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {canJoin && (
            <button
              onClick={() => onJoin(meeting)}
              className="btn btn-primary text-sm"
            >
              <Video className="w-4 h-4 mr-1" />
              Join
            </button>
          )}
          {isOrganizer && (
            <>
              <button
                onClick={() => onEdit(meeting)}
                className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete(meeting)}
                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Video Call Overlay Component
// ============================================
function VideoCallOverlay({ meeting, onEndCall, participants, allEmployees }) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [callStatus, setCallStatus] = useState('connecting');
  const [connectedPeers, setConnectedPeers] = useState({});
  
  const localVideoRef = useRef(null);
  const remoteVideoRefs = useRef({});
  const peerConnections = useRef({});
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const callChannelRef = useRef(null);
  const handleSignalRef = useRef(null);
  const userRef = useRef(null);
  const { user } = useAuth();
  
  // Keep user ref current
  useEffect(() => { userRef.current = user; }, [user]);

  // ICE servers for NAT traversal
  const ICE_SERVERS = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
    ]
  };

  // Helper: get display name for current user
  const getMyName = () => {
    const u = userRef.current;
    return u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Me' : 'Me';
  };

  // Create a peer connection for a remote user
  const createPeerConnection = (remoteUserId, remoteName) => {
    if (peerConnections.current[remoteUserId]) {
      console.log('[WebRTC] Reusing peer connection for', remoteUserId);
      return peerConnections.current[remoteUserId];
    }

    console.log('[WebRTC] Creating peer connection for', remoteUserId, remoteName);
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Add local tracks to the connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    } else {
      console.warn('[WebRTC] No local stream when creating PC for', remoteUserId);
    }

    // Handle incoming remote tracks
    pc.ontrack = (event) => {
      console.log('[WebRTC] Got remote track from', remoteUserId, event.track.kind);
      const [stream] = event.streams;
      if (stream) {
        setRemoteStreams(prev => ({ ...prev, [remoteUserId]: stream }));
        setConnectedPeers(prev => ({ ...prev, [remoteUserId]: remoteName || 'Participant' }));
      }
    };

    // Handle ICE candidates — send to remote peer
    pc.onicecandidate = (event) => {
      if (event.candidate && callChannelRef.current) {
        callChannelRef.current.send({
          type: 'broadcast',
          event: 'signal',
          payload: {
            type: 'ice-candidate',
            candidate: event.candidate.toJSON(),
            from: userRef.current?.id,
            to: remoteUserId,
          }
        });
      }
    };

    // Monitor connection state
    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] Conn state', remoteUserId, ':', pc.connectionState);
      if (pc.connectionState === 'failed') {
        // Attempt ICE restart on failure
        console.log('[WebRTC] Connection failed, attempting restart for', remoteUserId);
        pc.restartIce();
      }
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'closed') {
        cleanupPeer(remoteUserId);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[WebRTC] ICE state', remoteUserId, ':', pc.iceConnectionState);
    };

    peerConnections.current[remoteUserId] = pc;
    return pc;
  };

  // Clean up a single peer
  const cleanupPeer = (peerId) => {
    if (peerConnections.current[peerId]) {
      peerConnections.current[peerId].close();
      delete peerConnections.current[peerId];
    }
    setRemoteStreams(prev => {
      const next = { ...prev };
      delete next[peerId];
      return next;
    });
    setConnectedPeers(prev => {
      const next = { ...prev };
      delete next[peerId];
      return next;
    });
  };

  // Signal handler — always reads latest state via refs
  handleSignalRef.current = async (payload) => {
    const { type, from, to, userName } = payload;
    const myId = userRef.current?.id;

    // Ignore our own messages and messages for other users
    if (from === myId) return;
    if (to && to !== myId) return;

    console.log('[WebRTC] Signal received:', type, 'from', from, userName || '');

    switch (type) {
      case 'join': {
        // Someone joined — send them an offer
        setConnectedPeers(prev => ({ ...prev, [from]: userName || 'Participant' }));
        const pc = createPeerConnection(from, userName);
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          callChannelRef.current?.send({
            type: 'broadcast',
            event: 'signal',
            payload: {
              type: 'offer',
              sdp: pc.localDescription.toJSON(),
              from: myId,
              to: from,
              userName: getMyName(),
            }
          });
          console.log('[WebRTC] Sent offer to', from);
        } catch (err) {
          console.error('[WebRTC] Error creating offer:', err);
        }
        break;
      }

      case 'offer': {
        // Got an offer — reply with answer
        setConnectedPeers(prev => ({ ...prev, [from]: userName || 'Participant' }));
        const pc = createPeerConnection(from, userName);
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          callChannelRef.current?.send({
            type: 'broadcast',
            event: 'signal',
            payload: {
              type: 'answer',
              sdp: pc.localDescription.toJSON(),
              from: myId,
              to: from,
              userName: getMyName(),
            }
          });
          console.log('[WebRTC] Sent answer to', from);
        } catch (err) {
          console.error('[WebRTC] Error creating answer:', err);
        }
        break;
      }

      case 'answer': {
        // Got answer to our offer
        const pc = peerConnections.current[from];
        if (pc) {
          try {
            if (pc.signalingState === 'have-local-offer') {
              await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
              console.log('[WebRTC] Set remote answer from', from);
            }
          } catch (err) {
            console.error('[WebRTC] Error setting answer:', err);
          }
        }
        break;
      }

      case 'ice-candidate': {
        const pc = peerConnections.current[from];
        if (pc) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
          } catch (err) {
            // ICE candidate errors are often non-fatal  
            console.warn('[WebRTC] ICE candidate error (non-fatal):', err.message);
          }
        }
        break;
      }

      case 'leave': {
        console.log('[WebRTC] Peer left:', from);
        cleanupPeer(from);
        toast(`${userName || 'A participant'} left the meeting`, { icon: '👋' });
        break;
      }

      default:
        break;
    }
  };

  // ===== Main effect: runs ONCE per meeting =====
  useEffect(() => {
    let mounted = true;
    const myId = user?.id;
    if (!myId) return;

    const initCall = async () => {
      try {
        // 1. Get local media
        const stream = await navigator.mediaDevices.getUserMedia({
          video: meeting.meeting_type === 'video',
          audio: true,
        });
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }

        localStreamRef.current = stream;
        setLocalStream(stream);
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        setCallStatus('connected');

        // 2. Set up Supabase Broadcast channel for signaling
        const channel = supabase.channel(`meeting-call:${meeting.id}`, {
          config: { broadcast: { self: false } }
        });

        // Use ref so the listener always calls latest handler
        channel.on('broadcast', { event: 'signal' }, ({ payload }) => {
          handleSignalRef.current?.(payload);
        });

        // Use presence to track who's in the call
        channel.on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          console.log('[Presence] Current participants:', Object.keys(state));
        });

        channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
          console.log('[Presence] Joined:', key, newPresences);
        });

        channel.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          console.log('[Presence] Left:', key);
          // Clean up peer connection for the user who left
          leftPresences.forEach(p => {
            if (p.user_id && p.user_id !== myId) {
              cleanupPeer(p.user_id);
            }
          });
        });

        await channel.subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            console.log('[Channel] Subscribed to meeting channel');
            callChannelRef.current = channel;

            // Track presence
            await channel.track({
              user_id: myId,
              user_name: getMyName(),
              joined_at: new Date().toISOString(),
            });

            // Announce join after brief delay for channel readiness
            setTimeout(() => {
              if (!mounted) return;
              channel.send({
                type: 'broadcast',
                event: 'signal',
                payload: {
                  type: 'join',
                  from: myId,
                  userName: getMyName(),
                }
              });
              console.log('[WebRTC] Broadcasted join');
            }, 800);
          }
        });

      } catch (error) {
        console.error('[Call] Failed to init:', error);
        if (mounted) {
          toast.error('Could not access camera/microphone. Check permissions.');
          setCallStatus('error');
        }
      }
    };

    initCall();

    return () => {
      mounted = false;
      // Stop local media
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(t => t.stop());
        screenStreamRef.current = null;
      }
      // Close all peer connections
      Object.keys(peerConnections.current).forEach(id => {
        peerConnections.current[id]?.close();
      });
      peerConnections.current = {};
      // Leave channel
      if (callChannelRef.current) {
        callChannelRef.current.send({
          type: 'broadcast',
          event: 'signal',
          payload: { type: 'leave', from: myId, userName: getMyName() }
        });
        callChannelRef.current.untrack();
        setTimeout(() => callChannelRef.current?.unsubscribe(), 500);
        callChannelRef.current = null;
      }
      setRemoteStreams({});
      setConnectedPeers({});
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meeting.id, user?.id]);

  // Attach remote streams to video elements when they change
  useEffect(() => {
    Object.entries(remoteStreams).forEach(([peerId, stream]) => {
      const el = remoteVideoRefs.current[peerId];
      if (el && el.srcObject !== stream) {
        el.srcObject = stream;
      }
    });
  }, [remoteStreams]);

  const toggleMic = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicOn(audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoOn(videoTrack.enabled);
      }
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!screenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' },
          audio: false
        });
        screenStreamRef.current = screenStream;
        
        // Replace video track with screen track on all peer connections
        const screenTrack = screenStream.getVideoTracks()[0];
        Object.values(peerConnections.current).forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(screenTrack);
        });
        
        screenTrack.onended = () => {
          setScreenSharing(false);
          // Restore camera track on all peers
          if (localStreamRef.current) {
            const videoTrack = localStreamRef.current.getVideoTracks()[0];
            Object.values(peerConnections.current).forEach(pc => {
              const sender = pc.getSenders().find(s => s.track?.kind === 'video');
              if (sender && videoTrack) sender.replaceTrack(videoTrack);
            });
          }
        };
        
        setScreenSharing(true);
        toast.success('Screen sharing started');
      } else {
        if (screenStreamRef.current) {
          screenStreamRef.current.getTracks().forEach(track => track.stop());
          screenStreamRef.current = null;
        }
        // Restore camera track on all peers
        if (localStreamRef.current) {
          const videoTrack = localStreamRef.current.getVideoTracks()[0];
          Object.values(peerConnections.current).forEach(pc => {
            const sender = pc.getSenders().find(s => s.track?.kind === 'video');
            if (sender && videoTrack) sender.replaceTrack(videoTrack);
          });
        }
        setScreenSharing(false);
        toast.success('Screen sharing stopped');
      }
    } catch (error) {
      console.error('Screen share error:', error);
      toast.error('Failed to share screen');
    }
  };

  const handleEndCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
    }
    onEndCall();
  };

  // Minimized view
  if (minimized) {
    return (
      <div className="fixed bottom-4 right-4 z-[100] bg-gray-900 rounded-xl shadow-2xl border border-gray-700 overflow-hidden">
        <div className="flex items-center gap-3 p-3">
          <div className="w-20 h-14 rounded-lg overflow-hidden bg-gray-800">
            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          </div>
          <div className="text-white">
            <p className="text-sm font-medium truncate max-w-[100px]">{meeting.title}</p>
            <p className="text-xs text-green-400">{callStatus}</p>
          </div>
          <div className="flex items-center gap-1 ml-2">
            <button onClick={toggleMic} className={`p-2 rounded-full ${micOn ? 'bg-gray-700' : 'bg-red-600'}`}>
              {micOn ? <Mic className="w-4 h-4 text-white" /> : <MicOff className="w-4 h-4 text-white" />}
            </button>
            <button onClick={() => setMinimized(false)} className="p-2 rounded-full bg-gray-700 hover:bg-gray-600">
              <Maximize2 className="w-4 h-4 text-white" />
            </button>
            <button onClick={handleEndCall} className="p-2 rounded-full bg-red-600 hover:bg-red-500">
              <PhoneOff className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Full screen view
  return (
    <div className="fixed inset-0 z-[100] bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-gray-800">
        <div>
          <h2 className="text-xl font-semibold text-white">{meeting.title}</h2>
          <div className="flex items-center gap-2 mt-1">
            <div className={`w-2 h-2 rounded-full ${callStatus === 'connected' ? 'bg-green-400' : callStatus === 'error' ? 'bg-red-400' : 'bg-yellow-400'} animate-pulse`} />
            <p className="text-sm text-gray-400">
              {Object.keys(connectedPeers).length + 1} in call
              {Object.keys(connectedPeers).length > 0 && (
                <span className="text-gray-500"> — {Object.values(connectedPeers).join(', ')}</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.origin + '/meetings/join/' + meeting.id);
              toast.success('Meeting link copied!');
            }}
            className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors"
            title="Copy meeting link"
          >
            <Link2 className="w-5 h-5" />
          </button>
          <button
            onClick={() => setMinimized(true)}
            className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors"
          >
            <Minimize2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex-1 p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-auto">
        {/* Local Video */}
        <div className="relative bg-gray-800 rounded-xl overflow-hidden aspect-video">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${!videoOn ? 'hidden' : ''}`}
          />
          {!videoOn && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-guardian-400 to-guardian-600 flex items-center justify-center text-3xl font-bold text-white">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
            </div>
          )}
          <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 rounded text-white text-sm">
            You {screenSharing && '(sharing screen)'}
          </div>
          {!micOn && (
            <div className="absolute bottom-2 right-2 p-1 bg-red-600 rounded-full">
              <MicOff className="w-4 h-4 text-white" />
            </div>
          )}
        </div>

        {/* Remote participants with live video/audio */}
        {Object.entries(remoteStreams).map(([peerId, stream]) => {
          const emp = allEmployees.find(e => e.user_id === peerId);
          const name = emp ? `${emp.first_name} ${emp.last_name}` : (connectedPeers[peerId] || 'Participant');
          const hasVideo = stream.getVideoTracks().some(t => t.enabled && !t.muted);
          return (
            <div key={peerId} className="relative bg-gray-800 rounded-xl overflow-hidden aspect-video">
              <video
                ref={el => { remoteVideoRefs.current[peerId] = el; }}
                autoPlay
                playsInline
                className={`w-full h-full object-cover ${!hasVideo ? 'hidden' : ''}`}
              />
              {!hasVideo && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-3xl font-bold text-white">
                    {name[0]}
                  </div>
                </div>
              )}
              <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 rounded text-white text-sm">
                {name}
              </div>
            </div>
          );
        })}

        {/* Participants not yet connected (from meeting roster) */}
        {participants.filter(p => p.user_id !== user?.id && !remoteStreams[p.user_id]).map((participant) => {
          const emp = allEmployees.find(e => e.user_id === participant.user_id);
          const name = emp ? `${emp.first_name} ${emp.last_name}` : 'Participant';
          return (
            <div key={participant.user_id} className="relative bg-gray-800 rounded-xl overflow-hidden aspect-video">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center text-3xl font-bold text-white mx-auto mb-2">
                    {name[0]}
                  </div>
                  <p className="text-gray-400 text-xs">Not connected</p>
                </div>
              </div>
              <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 rounded text-white text-sm">
                {name}
              </div>
            </div>
          );
        })}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 py-6 bg-gray-800">
        <button
          onClick={toggleMic}
          className={`p-4 rounded-full transition-colors ${micOn ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-500'}`}
        >
          {micOn ? <Mic className="w-6 h-6 text-white" /> : <MicOff className="w-6 h-6 text-white" />}
        </button>
        
        {meeting.meeting_type === 'video' && (
          <button
            onClick={toggleVideo}
            className={`p-4 rounded-full transition-colors ${videoOn ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-500'}`}
          >
            {videoOn ? <Video className="w-6 h-6 text-white" /> : <VideoOff className="w-6 h-6 text-white" />}
          </button>
        )}
        
        <button
          onClick={toggleScreenShare}
          className={`p-4 rounded-full transition-colors ${screenSharing ? 'bg-blue-600 hover:bg-blue-500' : 'bg-gray-700 hover:bg-gray-600'}`}
        >
          <Monitor className="w-6 h-6 text-white" />
        </button>
        
        <button
          onClick={handleEndCall}
          className="p-4 rounded-full bg-red-600 hover:bg-red-500 transition-colors"
        >
          <PhoneOff className="w-6 h-6 text-white" />
        </button>
      </div>
    </div>
  );
}

// ============================================
// Main Meetings Page Component
// ============================================
function MeetingsPage() {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [view, setView] = useState('calendar'); // calendar or list
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState(null);
  const [meetingToDelete, setMeetingToDelete] = useState(null);
  const [activeMeeting, setActiveMeeting] = useState(null); // For video call
  const [participantSearch, setParticipantSearch] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_date: '',
    start_time: '',
    end_time: '',
    meeting_type: 'video',
    participants: []
  });

  useEffect(() => {
    fetchMeetings();
    fetchEmployees();
  }, []);

  const fetchMeetings = async () => {
    try {
      const data = await meetingsAPI.getAll();
      setMeetings(data || []);
      if (data && data.length > 0) {
        console.log('Fetched meetings:', data.length);
      }
    } catch (error) {
      console.error('Failed to fetch meetings:', error);
      setMeetings([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const data = await employeesAPI.getAll();
      const employeesWithNames = (data || []).map(emp => ({
        ...emp,
        name: `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.email || 'Unknown',
        displayName: `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
        position: getPositionLabel(emp.role),
        dept: getDepartmentLabel(emp.department)
      }));
      setEmployees(employeesWithNames);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
      setEmployees([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const startDateTime = new Date(`${formData.start_date}T${formData.start_time}`);
      const endDateTime = new Date(`${formData.start_date}T${formData.end_time}`);

      const meetingData = {
        title: formData.title,
        description: formData.description,
        organizer_id: user.id,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        meeting_type: formData.meeting_type,
        participants: formData.participants.map(p => ({ user_id: p, status: 'invited' })),
        status: 'scheduled'
      };

      if (editingMeeting) {
        await meetingsAPI.update(editingMeeting.id, meetingData);
        toast.success('Meeting updated successfully');
      } else {
        await meetingsAPI.create(meetingData);
        toast.success('Meeting scheduled successfully');

        // Send notifications to participants
        for (const participantId of formData.participants) {
          const emp = employees.find(e => e.user_id === participantId);
          if (emp?.user_id) {
            await notificationsAPI.create(emp.user_id, {
              title: 'ðŸ“… Meeting Invitation',
              message: `You have been invited to: "${formData.title}" on ${format(startDateTime, 'MMM d, yyyy')} at ${format(startDateTime, 'HH:mm')}`,
              type: 'meeting',
              link: '/meetings'
            });
          }
        }
      }

      fetchMeetings();
      closeModal();
    } catch (error) {
      toast.error(error.message || 'Failed to save meeting');
    }
  };

  const handleDelete = async () => {
    try {
      await meetingsAPI.delete(meetingToDelete.id);
      toast.success('Meeting deleted');
      fetchMeetings();
      setShowDeleteModal(false);
      setMeetingToDelete(null);
    } catch (error) {
      toast.error('Failed to delete meeting');
    }
  };

  const handleJoinMeeting = (meeting) => {
    // Update meeting status to in_progress
    meetingsAPI.update(meeting.id, { status: 'in_progress' });
    setActiveMeeting(meeting);
  };

  const handleEndCall = () => {
    if (activeMeeting) {
      meetingsAPI.update(activeMeeting.id, { status: 'completed' });
    }
    setActiveMeeting(null);
    fetchMeetings();
  };

  const openEditModal = (meeting) => {
    setEditingMeeting(meeting);
    const startTime = parseISO(meeting.start_time);
    const endTime = parseISO(meeting.end_time);
    setFormData({
      title: meeting.title,
      description: meeting.description || '',
      start_date: format(startTime, 'yyyy-MM-dd'),
      start_time: format(startTime, 'HH:mm'),
      end_time: format(endTime, 'HH:mm'),
      meeting_type: meeting.meeting_type,
      participants: (meeting.participants || []).map(p => p.user_id)
    });
    setShowModal(true);
  };

  const openNewMeetingModal = (date = null) => {
    setEditingMeeting(null);
    setParticipantSearch('');
    setFormData({
      title: '',
      description: '',
      start_date: date ? format(date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      start_time: '09:00',
      end_time: '10:00',
      meeting_type: 'video',
      participants: []
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingMeeting(null);
    setParticipantSearch('');
    setFormData({
      title: '',
      description: '',
      start_date: '',
      start_time: '',
      end_time: '',
      meeting_type: 'video',
      participants: []
    });
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const days = [];
    let day = startDate;
    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  };

  const filteredMeetings = meetings.filter(meeting => {
    const title = meeting.title || '';
    const description = meeting.description || '';
    return title.toLowerCase().includes(search.toLowerCase()) ||
           description.toLowerCase().includes(search.toLowerCase());
  });

  // Stats
  const stats = {
    total: meetings.length,
    upcoming: meetings.filter(m => m.status === 'scheduled').length,
    inProgress: meetings.filter(m => m.status === 'in_progress').length,
    completed: meetings.filter(m => m.status === 'completed').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-guardian-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Active Video Call */}
      {activeMeeting && (
        <VideoCallOverlay
          meeting={activeMeeting}
          onEndCall={handleEndCall}
          participants={activeMeeting.participants || []}
          allEmployees={employees}
        />
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
            <CalendarDays className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            <p className="text-sm text-gray-500">Total Meetings</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
            <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.upcoming}</p>
            <p className="text-sm text-gray-500">Upcoming</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
            <Video className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.inProgress}</p>
            <p className="text-sm text-gray-500">In Progress</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.completed}</p>
            <p className="text-sm text-gray-500">Completed</p>
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="card p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search meetings..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-10 w-full sm:w-64"
              />
            </div>
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setView('calendar')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  view === 'calendar' ? 'bg-white dark:bg-gray-600 shadow-sm' : 'text-gray-600 dark:text-gray-300'
                }`}
              >
                <Calendar className="w-4 h-4 inline mr-1" />
                Calendar
              </button>
              <button
                onClick={() => setView('list')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  view === 'list' ? 'bg-white dark:bg-gray-600 shadow-sm' : 'text-gray-600 dark:text-gray-300'
                }`}
              >
                <List className="w-4 h-4 inline mr-1" />
                List
              </button>
            </div>
          </div>
          <button onClick={() => openNewMeetingModal()} className="btn btn-primary whitespace-nowrap">
            <Plus className="w-4 h-4 mr-2" />
            Schedule Meeting
          </button>
        </div>
      </div>

      {/* Calendar View */}
      {view === 'calendar' && (
        <div className="card p-4">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setCurrentMonth(new Date())}
                className="px-3 py-1.5 text-sm font-medium text-guardian-600 hover:bg-guardian-50 dark:hover:bg-guardian-900/30 rounded-lg transition-colors"
              >
                Today
              </button>
              <button
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-0">
            {/* Day Headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-2 text-center text-sm font-medium text-gray-500 border-b dark:border-gray-700">
                {day}
              </div>
            ))}
            {/* Calendar Days */}
            {generateCalendarDays().map((day, i) => (
              <CalendarDay
                key={i}
                day={day}
                currentMonth={currentMonth}
                meetings={meetings}
                onDayClick={(d) => {
                  setSelectedDate(d);
                  openNewMeetingModal(d);
                }}
                selectedDate={selectedDate}
              />
            ))}
          </div>
        </div>
      )}

      {/* List View */}
      {view === 'list' && (
        <div className="grid gap-4">
          {filteredMeetings.length > 0 ? (
            filteredMeetings
              .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
              .map((meeting) => (
                <MeetingCard
                  key={meeting.id}
                  meeting={meeting}
                  onEdit={openEditModal}
                  onDelete={(m) => { setMeetingToDelete(m); setShowDeleteModal(true); }}
                  onJoin={handleJoinMeeting}
                  employees={employees}
                  currentUser={user}
                />
              ))
          ) : (
            <div className="card p-12 text-center">
              <CalendarDays className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No meetings found</h3>
              <p className="text-gray-500">Schedule your first meeting to get started</p>
            </div>
          )}
        </div>
      )}

      {/* Schedule/Edit Meeting Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content max-w-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingMeeting ? 'Edit Meeting' : 'Schedule New Meeting'}
              </h2>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Meeting Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="input w-full"
                  placeholder="Enter meeting title"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input w-full"
                  rows={3}
                  placeholder="Enter meeting description"
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    End Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="input w-full"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Meeting Type
                </label>
                <div className="flex gap-4">
                  {[
                    { value: 'video', label: 'Video Call', icon: Video },
                    { value: 'audio', label: 'Audio Call', icon: Phone },
                    { value: 'in_person', label: 'In Person', icon: Users }
                  ].map(type => (
                    <label
                      key={type.value}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${
                        formData.meeting_type === type.value
                          ? 'border-guardian-600 bg-guardian-50 dark:bg-guardian-900/30 text-guardian-700 dark:text-guardian-400'
                          : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="meeting_type"
                        value={type.value}
                        checked={formData.meeting_type === type.value}
                        onChange={(e) => setFormData({ ...formData, meeting_type: e.target.value })}
                        className="sr-only"
                      />
                      <type.icon className="w-4 h-4" />
                      <span className="text-sm">{type.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Invite Participants
                </label>
                {/* Search Input */}
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search employees..."
                    value={participantSearch}
                    onChange={(e) => setParticipantSearch(e.target.value)}
                    className="input pl-10 w-full text-sm"
                  />
                </div>
                <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 max-h-48 overflow-y-auto">
                  {employees
                    .filter(e => e.user_id !== user.id)
                    .filter(e => {
                      if (!participantSearch) return true;
                      const searchLower = participantSearch.toLowerCase();
                      const name = (e.displayName || e.name || '').toLowerCase();
                      const email = (e.email || '').toLowerCase();
                      const position = (e.position || '').toLowerCase();
                      const dept = (e.dept || '').toLowerCase();
                      return name.includes(searchLower) || email.includes(searchLower) || position.includes(searchLower) || dept.includes(searchLower);
                    })
                    .map(emp => (
                    <label
                      key={emp.id}
                      className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.participants.includes(emp.user_id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ ...formData, participants: [...formData.participants, emp.user_id] });
                          } else {
                            setFormData({ ...formData, participants: formData.participants.filter(p => p !== emp.user_id) });
                          }
                        }}
                        className="w-4 h-4 text-guardian-600 rounded focus:ring-guardian-500"
                      />
                      <div className="w-8 h-8 bg-gradient-to-br from-guardian-400 to-guardian-600 rounded-full flex items-center justify-center text-white text-xs font-medium">
                        {emp.first_name?.[0]}{emp.last_name?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{emp.displayName}</p>
                        <p className="text-xs text-gray-500 truncate">{emp.position} â€¢ {emp.dept}</p>
                      </div>
                    </label>
                  ))}
                  {employees.filter(e => e.user_id !== user.id).filter(e => {
                    if (!participantSearch) return true;
                    const searchLower = participantSearch.toLowerCase();
                    return (e.displayName || e.name || '').toLowerCase().includes(searchLower);
                  }).length === 0 && (
                    <p className="text-center text-gray-500 py-4">
                      {participantSearch ? 'No employees found' : 'No employees available'}
                    </p>
                  )}
                </div>
                {formData.participants.length > 0 && (
                  <p className="text-sm text-gray-500 mt-2">{formData.participants.length} participant(s) selected</p>
                )}
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={closeModal} className="btn btn-ghost">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingMeeting ? 'Update Meeting' : 'Schedule Meeting'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Cancel Meeting</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to cancel "{meetingToDelete?.title}"? All participants will be notified.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDeleteModal(false)} className="btn btn-ghost">
                Keep Meeting
              </button>
              <button onClick={handleDelete} className="btn bg-red-600 hover:bg-red-700 text-white">
                Cancel Meeting
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MeetingsPage;
