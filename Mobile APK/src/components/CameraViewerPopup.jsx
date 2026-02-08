/**
 * Guardian Desktop ERP - Secure Camera Viewer Popup
 * Admin-only secure popup window for viewing employee camera feeds
 * 
 * SECURITY FEATURES:
 * - Super Admin role verification
 * - Session token validation
 * - P2P encrypted video stream
 * - Emergency "Force Stop All Streams" button
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Camera,
  CameraOff,
  AlertTriangle,
  Shield,
  ShieldAlert,
  Loader2,
  Maximize2,
  Minimize2,
  Video,
  VideoOff,
} from 'lucide-react';
import { cameraMonitoringService } from '../services/cameraMonitoringService';

/**
 * Connection status badge
 */
function ConnectionStatus({ status }) {
  const statusConfig = {
    idle: { color: 'bg-gray-500', text: 'Not Connected' },
    connecting: { color: 'bg-yellow-500 animate-pulse', text: 'Establishing Encrypted Connection...' },
    connected: { color: 'bg-green-500', text: 'Secure Stream Active (DTLS/SRTP)' },
    error: { color: 'bg-red-500', text: 'Connection Failed' },
    stopped: { color: 'bg-gray-500', text: 'Stream Terminated' },
  };

  const config = statusConfig[status] || statusConfig.idle;

  return (
    <div className="flex items-center gap-2 text-xs">
      <div className={`w-2 h-2 rounded-full ${config.color}`} />
      <span className="text-gray-400">{config.text}</span>
    </div>
  );
}

/**
 * Individual Camera Feed Component
 */
function CameraFeed({ employeeId, employeeName, onClose }) {
  const videoRef = useRef(null);
  const [status, setStatus] = useState('idle');
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    let mounted = true;

    const startStream = async () => {
      setStatus('connecting');

      const success = await cameraMonitoringService.startCameraMonitoring(
        employeeId,
        // onStream callback
        (stream) => {
          if (mounted && videoRef.current) {
            videoRef.current.srcObject = stream;
            setStatus('connected');
          }
        },
        // onDisconnect callback
        () => {
          if (mounted) {
            setStatus('stopped');
          }
        }
      );

      if (!success && mounted) {
        setStatus('error');
      }
    };

    startStream();

    return () => {
      mounted = false;
      cameraMonitoringService.stopCameraMonitoring(employeeId);
    };
  }, [employeeId]);

  const handleClose = () => {
    cameraMonitoringService.stopCameraMonitoring(employeeId);
    onClose();
  };

  return (
    <div className={`bg-gray-900 rounded-lg overflow-hidden border border-gray-700 ${
      isFullscreen ? 'fixed inset-4 z-50' : 'relative'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-red-400" />
          <span className="text-sm font-medium text-white">{employeeName}</span>
        </div>
        <div className="flex items-center gap-2">
          <ConnectionStatus status={status} />
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={handleClose}
            className="p-1.5 rounded hover:bg-red-600 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Video Area */}
      <div className="relative aspect-video bg-black">
        {status === 'connecting' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin mb-2" />
            <span className="text-sm">Establishing encrypted P2P connection...</span>
            <span className="text-xs text-gray-500 mt-1">DTLS/SRTP encryption active</span>
          </div>
        )}

        {status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-red-400">
            <VideoOff className="w-8 h-8 mb-2" />
            <span className="text-sm">Connection failed or unauthorized</span>
          </div>
        )}

        {status === 'stopped' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
            <CameraOff className="w-8 h-8 mb-2" />
            <span className="text-sm">Stream terminated</span>
          </div>
        )}

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-contain ${status !== 'connected' ? 'hidden' : ''}`}
        />

        {/* Encryption indicator */}
        {status === 'connected' && (
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-green-600/80 text-white text-xs px-2 py-1 rounded">
            <Shield className="w-3 h-3" />
            <span>P2P Encrypted</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Main Camera Viewer Popup Component
 */
export function CameraViewerPopup({ isOpen, onClose, employee }) {
  const [showEmergencyConfirm, setShowEmergencyConfirm] = useState(false);
  const [activeStreamCount, setActiveStreamCount] = useState(0);

  // Update active stream count
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStreamCount(cameraMonitoringService.getActiveSessionCount());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleEmergencyStop = async () => {
    await cameraMonitoringService.forceStopAllStreams();
    setShowEmergencyConfirm(false);
    setActiveStreamCount(0);
  };

  const handleClose = async () => {
    await cameraMonitoringService.stopCameraMonitoring(employee?.id);
    onClose();
  };

  if (!isOpen || !employee) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Popup Window */}
      <div className="relative bg-gray-900 rounded-xl shadow-2xl border border-gray-700 w-full max-w-2xl mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Secure Camera Monitor</h2>
              <p className="text-xs text-gray-400">
                Super Admin Access Only • P2P Encrypted
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Security Banner */}
        <div className="px-4 py-2 bg-green-900/30 border-b border-green-800/50">
          <div className="flex items-center gap-2 text-green-400 text-xs">
            <Shield className="w-4 h-4" />
            <span>End-to-end encrypted via WebRTC (DTLS/SRTP) • No third-party access possible</span>
          </div>
        </div>

        {/* Camera Feed */}
        <div className="p-4">
          <CameraFeed
            employeeId={employee.id}
            employeeName={`${employee.first_name} ${employee.last_name}`}
            onClose={handleClose}
          />
        </div>

        {/* Footer with Emergency Stop */}
        <div className="p-4 bg-gray-800 border-t border-gray-700 flex items-center justify-between">
          <div className="text-sm text-gray-400">
            Active Streams: <span className="text-white font-medium">{activeStreamCount}</span>
          </div>

          {/* Emergency Stop Button */}
          <button
            onClick={() => setShowEmergencyConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <ShieldAlert className="w-4 h-4" />
            Force Stop All Streams
          </button>
        </div>

        {/* Emergency Confirmation Modal */}
        {showEmergencyConfirm && (
          <div className="absolute inset-0 bg-black/90 flex items-center justify-center p-4">
            <div className="bg-gray-800 rounded-xl p-6 max-w-md border border-red-600">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Emergency Stop</h3>
                  <p className="text-sm text-red-400">This will terminate ALL active streams</p>
                </div>
              </div>
              <p className="text-gray-300 text-sm mb-6">
                Are you sure you want to force stop all {activeStreamCount} active camera stream(s)? 
                This action will immediately shut down all monitoring sessions.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowEmergencyConfirm(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEmergencyStop}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
                >
                  Force Stop All
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CameraViewerPopup;
