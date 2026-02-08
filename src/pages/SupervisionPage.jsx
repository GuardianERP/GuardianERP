/**
 * Guardian Desktop ERP - Supervision Page
 * Admin dashboard for real-time screen monitoring of employees
 * Uses WebRTC for P2P streaming - no server storage costs
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Monitor, Eye, EyeOff, Maximize2, Minimize2, X, RefreshCw, 
  Users, Clock, Activity, AlertCircle, Grid, List, Search,
  Volume2, VolumeX, Camera, StopCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../services/supabaseClient';
import { screenMonitoringService } from '../services/screenMonitoringService';
import { presenceService } from '../services/presenceService';
import { useOnlineEmployees } from '../hooks/usePresence';

// Live Screen Viewer Component
const LiveScreenViewer = ({ employeeId, employeeName, onClose, isFullscreen, onToggleFullscreen, monitoringOptions = {} }) => {
  const videoRef = useRef(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [streamQuality, setStreamQuality] = useState('HD');
  const [connectionTime, setConnectionTime] = useState(0);
  const { screen = true, camera = false, microphone = false } = monitoringOptions;
  const isConnectedRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    let timeoutId = null;
    let intervalId = null;

    const startMonitoring = async () => {
      try {
        setIsConnecting(true);
        setError(null);
        setConnectionTime(0);
        isConnectedRef.current = false;

        // Start connection timer
        intervalId = setInterval(() => {
          setConnectionTime(prev => prev + 1);
        }, 1000);

        // Set timeout for connection (30 seconds - increased)
        timeoutId = setTimeout(() => {
          if (mounted && !isConnectedRef.current) {
            setIsConnecting(false);
            setError('Connection timeout. Employee may not be online or screen sharing is not enabled.');
          }
        }, 30000);

        await screenMonitoringService.startMonitoring(
          employeeId,
          // onStream callback
          (stream) => {
            console.log('[LiveViewer] Stream received!', stream);
            if (mounted && videoRef.current) {
              videoRef.current.srcObject = stream;
              isConnectedRef.current = true;
              setIsConnected(true);
              setIsConnecting(false);
              clearTimeout(timeoutId);
              clearInterval(intervalId);
              
              // Play the video
              videoRef.current.play().catch(err => {
                console.error('[LiveViewer] Video play error:', err);
              });
            }
          },
          // onDisconnect callback
          () => {
            if (mounted) {
              isConnectedRef.current = false;
              setIsConnected(false);
              setError('Connection lost');
            }
          },
          // monitoring options
          monitoringOptions
        );
      } catch (err) {
        if (mounted) {
          setError(err.message || 'Failed to connect');
          setIsConnecting(false);
          clearTimeout(timeoutId);
          clearInterval(intervalId);
        }
      }
    };

    startMonitoring();

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      clearInterval(intervalId);
      screenMonitoringService.stopMonitoring(employeeId);
    };
  }, [employeeId]);

  return (
    <div className={`relative bg-gray-900 rounded-xl overflow-hidden shadow-2xl ${
      isFullscreen ? 'fixed inset-4 z-50' : 'h-full'
    }`}>
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-white font-semibold text-sm">{employeeName}</span>
            {isConnected && (
              <span className="text-green-400 text-xs bg-green-500/20 px-2 py-0.5 rounded">
                LIVE • {streamQuality}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleFullscreen}
              className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-white/70 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
              title="Stop Monitoring"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Video Stream */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-contain bg-black"
      />

      {/* Loading / Error States */}
      {isConnecting && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-guardian-500 border-t-transparent mb-4 mx-auto" />
            <p className="text-white text-sm">Connecting to {employeeName}'s screen...</p>
            <p className="text-gray-400 text-xs mt-1">Establishing P2P connection ({connectionTime}s)</p>
            <p className="text-yellow-400 text-xs mt-3">
              Note: Employee must be running the Guardian app
            </p>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="text-center max-w-sm px-4">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4 mx-auto" />
            <p className="text-white text-sm font-medium mb-2">Connection Failed</p>
            <p className="text-gray-400 text-xs mb-4">{error}</p>
            <div className="bg-gray-800 rounded-lg p-3 mb-4 text-left">
              <p className="text-yellow-400 text-xs font-medium mb-2">Troubleshooting:</p>
              <ul className="text-gray-400 text-xs space-y-1">
                <li>• Employee must have Guardian app open</li>
                <li>• Employee must be logged in</li>
                <li>• Check network connection</li>
              </ul>
            </div>
            <div className="flex gap-2 justify-center">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Status Bar */}
      {isConnected && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
          <div className="flex items-center justify-between text-xs text-white/70">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Activity className="w-3 h-3 text-green-400" />
                P2P Stream
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date().toLocaleTimeString()}
              </span>
            </div>
            <span className="text-gray-400">Employee ID: {employeeId}</span>
          </div>
        </div>
      )}
    </div>
  );
};

// Main Supervision Page
function SupervisionPage() {
  const [employees, setEmployees] = useState([]);
  const [activeMonitors, setActiveMonitors] = useState([]); // Array of {employeeId, employeeName, options}
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [fullscreenMonitor, setFullscreenMonitor] = useState(null);
  const [monitoringModalOpen, setMonitoringModalOpen] = useState(false);
  const [selectedEmployeeForModal, setSelectedEmployeeForModal] = useState(null);
  const [monitoringOptions, setMonitoringOptions] = useState({
    screen: true,
    camera: false,
    microphone: false
  });
  
  // Use presence-based online tracking - automatically detects who has app open
  const presenceOnlineUsers = useOnlineEmployees();
  const [onlineStatus, setOnlineStatus] = useState({}); // employeeId -> boolean

  // Update online status when presence changes
  useEffect(() => {
    const onlineMap = {};
    Object.keys(presenceOnlineUsers).forEach(employeeId => {
      onlineMap[employeeId] = true;
    });
    console.log('[Supervision] Presence online users:', Object.keys(presenceOnlineUsers).length);
    setOnlineStatus(onlineMap);
  }, [presenceOnlineUsers]);

  // Fetch employees
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true);
        
        // Fetch employees from Supabase
        const { data, error } = await supabase
          .from('employees')
          .select('id, first_name, last_name, email, status, designation, department')
          .eq('status', 'active')
          .order('first_name');

        if (error) {
          console.error('Supabase error:', error);
          toast.error('Failed to load employees: ' + error.message);
          setEmployees([]);
          return;
        }
        
        setEmployees(data || []);
        console.log('[Supervision] Loaded', data?.length, 'employees');
      } catch (err) {
        console.error('Error fetching employees:', err);
        toast.error('Failed to load employees');
        setEmployees([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  // Start monitoring an employee
  const startMonitoringWithOptions = (employee) => {
    setSelectedEmployeeForModal(employee);
    setMonitoringOptions({ screen: true, camera: false, microphone: false });
    setMonitoringModalOpen(true);
  };

  // Confirm monitoring with selected options
  const confirmMonitoring = () => {
    if (!selectedEmployeeForModal) return;

    const employee = selectedEmployeeForModal;
    if (activeMonitors.find(m => m.employeeId === employee.id)) {
      toast.error('Already monitoring this employee');
      setMonitoringModalOpen(false);
      return;
    }

    // Check if employee app is online (presence-based)
    if (!onlineStatus[employee.id]) {
      toast('Employee app is not currently open. Attempting to connect...', {
        icon: '⚠️',
        duration: 3000
      });
    }

    setActiveMonitors(prev => [...prev, {
      employeeId: employee.id,
      employeeName: `${employee.first_name} ${employee.last_name}`,
      options: { ...monitoringOptions }
    }]);

    const options = [];
    if (monitoringOptions.screen) options.push('Screen');
    if (monitoringOptions.camera) options.push('Camera');
    if (monitoringOptions.microphone) options.push('Microphone');

    toast.success(`Started monitoring: ${options.join(', ')}`, {
      icon: '👁️'
    });

    setMonitoringModalOpen(false);
  };

  const startMonitoring = (employee) => {
    startMonitoringWithOptions(employee);
  };

  // Stop monitoring an employee
  const stopMonitoring = (employeeId) => {
    screenMonitoringService.stopMonitoring(employeeId);
    setActiveMonitors(prev => prev.filter(m => m.employeeId !== employeeId));
    
    if (fullscreenMonitor === employeeId) {
      setFullscreenMonitor(null);
    }
  };

  // Refresh online status - now shows presence-based status
  const refreshOnlineStatus = () => {
    const onlineCount = Object.keys(presenceOnlineUsers).length;
    toast.success(`${onlineCount} employees currently have app open`, {
      icon: '🔄',
      duration: 2000
    });
    console.log('[Supervision] Current online users:', presenceOnlineUsers);
  };

  // Filter employees by search
  const filteredEmployees = employees.filter(emp => {
    const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.toLowerCase();
    const email = (emp.email || '').toLowerCase();
    return fullName.includes(searchQuery.toLowerCase()) || 
           email.includes(searchQuery.toLowerCase());
  });

  // Get grid columns based on number of active monitors
  const getGridCols = () => {
    const count = activeMonitors.length;
    if (count <= 1) return 'grid-cols-1';
    if (count <= 2) return 'grid-cols-1 lg:grid-cols-2';
    if (count <= 4) return 'grid-cols-2';
    if (count <= 6) return 'grid-cols-2 xl:grid-cols-3';
    return 'grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4';
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Monitor className="w-8 h-8 text-guardian-600" />
            Screen Supervision
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Real-time P2P screen monitoring • {activeMonitors.length} active sessions
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={refreshOnlineStatus}
            className="p-2 rounded-lg bg-guardian-100 text-guardian-600 hover:bg-guardian-200 dark:bg-guardian-900/30 dark:text-guardian-400 transition-colors"
            title="Refresh Online Status"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'grid' 
                  ? 'bg-white dark:bg-gray-700 text-guardian-600 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'list' 
                  ? 'bg-white dark:bg-gray-700 text-guardian-600 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{employees.length}</p>
              <p className="text-sm text-gray-500">Total Employees</p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
              <Activity className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {Object.values(onlineStatus).filter(Boolean).length}
              </p>
              <p className="text-sm text-gray-500">Currently Online</p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
              <Eye className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{activeMonitors.length}</p>
              <p className="text-sm text-gray-500">Active Monitors</p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
              <Monitor className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">P2P</p>
              <p className="text-sm text-gray-500">Stream Mode</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Employee List */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Employees</h3>
            <span className="text-sm text-gray-500">
              {Object.values(onlineStatus).filter(Boolean).length} online
            </span>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input w-full pl-10"
            />
          </div>

          {/* Employee List */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {filteredEmployees.map(employee => {
              const isOnline = onlineStatus[employee.id];
              const isMonitoring = activeMonitors.find(m => m.employeeId === employee.id);

              return (
                <div
                  key={employee.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    isMonitoring 
                      ? 'bg-guardian-50 dark:bg-guardian-900/20 border-guardian-200 dark:border-guardian-700'
                      : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-guardian-500 to-guardian-600 flex items-center justify-center text-white font-semibold">
                        {employee.first_name?.[0]}{employee.last_name?.[0]}
                      </div>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-gray-800 ${
                        isOnline ? 'bg-green-500' : 'bg-gray-400'
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white text-sm">
                        {employee.first_name} {employee.last_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {employee.designation || employee.department || 'Employee'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => isMonitoring ? stopMonitoring(employee.id) : startMonitoring(employee)}
                    className={`p-2 rounded-lg transition-colors ${
                      isMonitoring
                        ? 'bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400'
                        : isOnline
                          ? 'bg-guardian-100 text-guardian-600 hover:bg-guardian-200 dark:bg-guardian-900/30 dark:text-guardian-400'
                          : 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400'
                    }`}
                    title={isMonitoring ? 'Stop Monitoring' : isOnline ? 'Start Monitoring' : 'Start Monitoring (Offline)'}
                  >
                    {isMonitoring ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              );
            })}

            {filteredEmployees.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No employees found</p>
              </div>
            )}
          </div>
        </div>

        {/* Live Monitors Grid */}
        <div className="xl:col-span-2">
          {activeMonitors.length > 0 ? (
            <div className={`grid ${getGridCols()} gap-4`}>
              {activeMonitors.map(monitor => (
                <div key={monitor.employeeId} className="aspect-video">
                  <LiveScreenViewer
                    employeeId={monitor.employeeId}
                    employeeName={monitor.employeeName}
                    onClose={() => stopMonitoring(monitor.employeeId)}
                    isFullscreen={fullscreenMonitor === monitor.employeeId}
                    onToggleFullscreen={() => setFullscreenMonitor(
                      fullscreenMonitor === monitor.employeeId ? null : monitor.employeeId
                    )}
                    monitoringOptions={monitor.options || { screen: true, camera: false, microphone: false }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="card p-12 text-center">
              <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Monitor className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No Active Monitors
              </h3>
              <p className="text-gray-500 max-w-md mx-auto">
                Click the eye icon next to an online employee to start monitoring their screen in real-time.
                All streams are P2P - no server costs.
              </p>
              <div className="mt-6 flex items-center justify-center gap-4 text-sm text-gray-400">
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-green-500" /> Online
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-gray-400" /> Offline
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Overlay */}
      {fullscreenMonitor && (
        <div className="fixed inset-0 z-40 bg-black/90" onClick={() => setFullscreenMonitor(null)} />
      )}

      {/* Monitoring Options Modal */}
      {monitoringModalOpen && selectedEmployeeForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-sm w-full">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Monitoring Options
                </h2>
                <button
                  onClick={() => setMonitoringModalOpen(false)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Employee Info */}
              <div className="mb-6 p-4 bg-guardian-50 dark:bg-guardian-900/20 rounded-xl">
                <p className="text-sm text-gray-500 dark:text-gray-400">Monitoring</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                  {selectedEmployeeForModal.first_name} {selectedEmployeeForModal.last_name}
                </p>
              </div>

              {/* Options */}
              <div className="space-y-3 mb-6">
                {/* Screen */}
                <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                  <input
                    type="checkbox"
                    checked={monitoringOptions.screen}
                    onChange={(e) => setMonitoringOptions(prev => ({
                      ...prev,
                      screen: e.target.checked
                    }))}
                    className="w-5 h-5 rounded text-guardian-600 cursor-pointer"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                      <Monitor className="w-4 h-4" />
                      Screen
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Monitor employee screen</p>
                  </div>
                </label>

                {/* Camera */}
                <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                  <input
                    type="checkbox"
                    checked={monitoringOptions.camera}
                    onChange={(e) => setMonitoringOptions(prev => ({
                      ...prev,
                      camera: e.target.checked
                    }))}
                    className="w-5 h-5 rounded text-guardian-600 cursor-pointer"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                      <Camera className="w-4 h-4" />
                      Camera
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">View employee webcam</p>
                  </div>
                </label>

                {/* Microphone */}
                <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                  <input
                    type="checkbox"
                    checked={monitoringOptions.microphone}
                    onChange={(e) => setMonitoringOptions(prev => ({
                      ...prev,
                      microphone: e.target.checked
                    }))}
                    className="w-5 h-5 rounded text-guardian-600 cursor-pointer"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                      <Volume2 className="w-4 h-4" />
                      Microphone
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Listen to audio</p>
                  </div>
                </label>
              </div>

              {/* Warning */}
              <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  ℹ️ At least screen or camera must be selected to start monitoring.
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setMonitoringModalOpen(false)}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmMonitoring}
                  disabled={!monitoringOptions.screen && !monitoringOptions.camera}
                  className="flex-1 px-4 py-2 bg-guardian-600 hover:bg-guardian-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Start Monitoring
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info Banner */}
      <div className="card p-4 bg-gradient-to-r from-guardian-50 to-blue-50 dark:from-guardian-900/20 dark:to-blue-900/20 border-guardian-200 dark:border-guardian-800">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-guardian-100 dark:bg-guardian-900/50 rounded-lg">
            <AlertCircle className="w-5 h-5 text-guardian-600" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white">Silent Monitoring Mode</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Screen monitoring is completely silent - employees receive no notification or visual indicator.
              Streams are peer-to-peer (P2P) for optimal performance and zero server storage costs.
              Monitoring automatically stops when an employee clocks out.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SupervisionPage;
