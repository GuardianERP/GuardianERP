/**
 * Guardian Desktop ERP - Secure Camera Monitoring Service
 * WebRTC-based P2P camera streaming with Supabase Realtime signaling
 * 
 * SECURITY FEATURES:
 * - Session token verification before streaming
 * - DTLS/SRTP mandatory encryption (WebRTC default)
 * - On-demand only - camera hardware remains OFF until secure-signal
 * - No local UI indicators on employee side
 * - Auto-shutdown when admin closes window
 */

import { supabase } from './supabaseClient';

// ICE Server configuration for WebRTC with DTLS/SRTP encryption
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
  ],
  // Mandatory DTLS encryption
  iceTransportPolicy: 'all',
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require'
};

// Channel name prefix for camera monitoring
const CHANNEL_PREFIX = 'secure-camera';

/**
 * Secure Camera Monitoring Service Class
 * Handles WebRTC signaling with session verification
 */
class CameraMonitoringService {
  constructor() {
    this.peerConnections = new Map(); // employeeId -> RTCPeerConnection
    this.streams = new Map(); // employeeId -> MediaStream
    this.channels = new Map(); // employeeId -> RealtimeChannel
    this.onStreamCallbacks = new Map(); // employeeId -> callback
    this.onDisconnectCallbacks = new Map(); // employeeId -> callback
    this.activeMonitoringSessions = new Set(); // Track all active sessions
    this.sessionToken = null;
  }

  /**
   * Verify admin session token before any operation
   * @returns {Promise<boolean>} True if session is valid
   */
  async verifyAdminSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        console.error('[SecureCam] Invalid session');
        return false;
      }

      // Verify user has super_admin role
      const { data: employee, error: empError } = await supabase
        .from('employees')
        .select('role')
        .eq('user_id', session.user.id)
        .single();

      if (empError || !employee || employee.role !== 'super_admin') {
        console.error('[SecureCam] Unauthorized: Super Admin required');
        return false;
      }

      this.sessionToken = session.access_token;
      return true;
    } catch (error) {
      console.error('[SecureCam] Session verification failed:', error);
      return false;
    }
  }

  /**
   * Admin: Start secure camera monitoring
   * @param {string} employeeId - Target employee ID
   * @param {function} onStream - Callback when stream received
   * @param {function} onDisconnect - Callback on disconnect
   * @returns {Promise<boolean>}
   */
  async startCameraMonitoring(employeeId, onStream, onDisconnect) {
    // Verify session before starting
    const isAuthorized = await this.verifyAdminSession();
    if (!isAuthorized) {
      console.error('[SecureCam] Session verification failed');
      return false;
    }

    console.log('[SecureCam] Admin initiating secure camera stream for:', employeeId);

    // Store callbacks
    this.onStreamCallbacks.set(employeeId, onStream);
    this.onDisconnectCallbacks.set(employeeId, onDisconnect);
    this.activeMonitoringSessions.add(employeeId);

    // Create peer connection with encryption
    const pc = new RTCPeerConnection(ICE_SERVERS);
    this.peerConnections.set(employeeId, pc);

    // Verify DTLS encryption is active
    pc.addEventListener('connectionstatechange', () => {
      if (pc.connectionState === 'connected') {
        const senders = pc.getSenders();
        senders.forEach(sender => {
          if (sender.transport) {
            console.log('[SecureCam] DTLS State:', sender.transport.state);
          }
        });
      }
    });

    // Handle incoming video stream
    pc.ontrack = (event) => {
      console.log('[SecureCam] Received encrypted video track');
      const stream = event.streams[0];
      this.streams.set(employeeId, stream);
      const callback = this.onStreamCallbacks.get(employeeId);
      if (callback) callback(stream);
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSecureSignal(employeeId, 'ice-candidate', {
          candidate: event.candidate.toJSON(),
          sessionToken: this.sessionToken
        });
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log('[SecureCam] Connection state:', pc.connectionState);
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        const callback = this.onDisconnectCallbacks.get(employeeId);
        if (callback) callback();
        this.stopCameraMonitoring(employeeId);
      }
    };

    // Subscribe to employee's response channel
    const responseChannel = supabase.channel(`${CHANNEL_PREFIX}-response-${employeeId}`, {
      config: { broadcast: { self: false } }
    });

    responseChannel
      .on('broadcast', { event: 'camera-answer' }, async (payload) => {
        console.log('[SecureCam] Received encrypted answer from employee');
        await this.handleCameraAnswer(employeeId, payload.payload);
      })
      .on('broadcast', { event: 'ice-candidate' }, async (payload) => {
        await this.handleRemoteIceCandidate(employeeId, payload.payload);
      })
      .subscribe();

    this.channels.set(employeeId, responseChannel);

    // Create offer with video only
    const offer = await pc.createOffer({
      offerToReceiveVideo: true,
      offerToReceiveAudio: false
    });
    await pc.setLocalDescription(offer);

    // Send secure camera request to employee
    await this.sendSecureSignal(employeeId, 'secure-signal', {
      type: 'camera-request',
      offer: pc.localDescription.toJSON(),
      sessionToken: this.sessionToken,
      timestamp: Date.now()
    });

    return true;
  }

  /**
   * Stop monitoring a single employee
   */
  async stopCameraMonitoring(employeeId) {
    console.log('[SecureCam] Stopping camera monitoring for:', employeeId);

    // Send stop signal
    await this.sendSecureSignal(employeeId, 'stop-camera', {
      sessionToken: this.sessionToken
    });

    // Close peer connection
    const pc = this.peerConnections.get(employeeId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(employeeId);
    }

    // Close channel
    const channel = this.channels.get(employeeId);
    if (channel) {
      await channel.unsubscribe();
      this.channels.delete(employeeId);
    }

    // Clear tracking
    this.streams.delete(employeeId);
    this.onStreamCallbacks.delete(employeeId);
    this.onDisconnectCallbacks.delete(employeeId);
    this.activeMonitoringSessions.delete(employeeId);
  }

  /**
   * EMERGENCY: Force stop ALL active camera streams
   */
  async forceStopAllStreams() {
    console.log('[SecureCam] EMERGENCY: Force stopping all streams');

    const sessions = Array.from(this.activeMonitoringSessions);
    
    for (const employeeId of sessions) {
      await this.stopCameraMonitoring(employeeId);
    }

    // Clear everything
    this.peerConnections.clear();
    this.streams.clear();
    this.channels.clear();
    this.onStreamCallbacks.clear();
    this.onDisconnectCallbacks.clear();
    this.activeMonitoringSessions.clear();

    console.log('[SecureCam] All streams terminated');
  }

  /**
   * Send secure signal to employee
   */
  async sendSecureSignal(employeeId, event, payload) {
    const channel = supabase.channel(`${CHANNEL_PREFIX}-${employeeId}`);
    await channel.send({
      type: 'broadcast',
      event,
      payload
    });
  }

  /**
   * Handle camera answer from employee
   */
  async handleCameraAnswer(employeeId, payload) {
    const pc = this.peerConnections.get(employeeId);
    if (pc && payload.answer) {
      await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
    }
  }

  /**
   * Handle ICE candidate from employee
   */
  async handleRemoteIceCandidate(employeeId, payload) {
    const pc = this.peerConnections.get(employeeId);
    if (pc && payload.candidate) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
      } catch (error) {
        console.error('[SecureCam] ICE candidate error:', error);
      }
    }
  }

  /**
   * Get count of active monitoring sessions
   */
  getActiveSessionCount() {
    return this.activeMonitoringSessions.size;
  }

  /**
   * Check if specific employee is being monitored
   */
  isMonitoring(employeeId) {
    return this.activeMonitoringSessions.has(employeeId);
  }
}

// Export singleton instance
export const cameraMonitoringService = new CameraMonitoringService();
export default cameraMonitoringService;
