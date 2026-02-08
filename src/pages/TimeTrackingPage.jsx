/**
 * Guardian Desktop ERP - Time Tracking Page
 * Timer and time entry management
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Play, Pause, Square, Clock, Calendar, Plus, Edit2, Trash2,
  Tag, Briefcase, Timer, History, TrendingUp
} from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { tasksAPI } from '../services/api';
import toast from 'react-hot-toast';

function TimeTrackingPage() {
  const { user } = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [currentTask, setCurrentTask] = useState('');
  const [currentProject, setCurrentProject] = useState('');
  const [timeEntries, setTimeEntries] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [showManualEntry, setShowManualEntry] = useState(false);
  
  const [manualEntry, setManualEntry] = useState({
    task: '',
    project: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '17:00',
    description: ''
  });

  // Load time entries from localStorage (simulating persistence)
  useEffect(() => {
    const saved = localStorage.getItem('guardian_time_entries');
    if (saved) {
      setTimeEntries(JSON.parse(saved));
    }
    
    const savedTimer = localStorage.getItem('guardian_active_timer');
    if (savedTimer) {
      const timer = JSON.parse(savedTimer);
      setIsRunning(timer.isRunning);
      setStartTime(timer.startTime ? new Date(timer.startTime) : null);
      setCurrentTask(timer.currentTask || '');
      setCurrentProject(timer.currentProject || '');
    }
    
    fetchTasks();
  }, []);

  // Save time entries to localStorage
  useEffect(() => {
    localStorage.setItem('guardian_time_entries', JSON.stringify(timeEntries));
  }, [timeEntries]);

  // Save active timer state
  useEffect(() => {
    localStorage.setItem('guardian_active_timer', JSON.stringify({
      isRunning,
      startTime: startTime?.toISOString(),
      currentTask,
      currentProject
    }));
  }, [isRunning, startTime, currentTask, currentProject]);

  const fetchTasks = async () => {
    try {
      const data = await tasksAPI.getAll();
      setTasks(data.filter(t => t.status !== 'completed'));
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    }
  };

  // Timer logic
  useEffect(() => {
    let interval;
    if (isRunning && startTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - new Date(startTime).getTime()) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, startTime]);

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (minutes) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs === 0) return `${mins}m`;
    return `${hrs}h ${mins}m`;
  };

  const handleStart = () => {
    if (!currentTask.trim()) {
      toast.error('Please enter a task description');
      return;
    }
    setIsRunning(true);
    setStartTime(new Date());
    setElapsedTime(0);
    toast.success('Timer started');
  };

  const handlePause = () => {
    setIsRunning(false);
    toast('Timer paused', { icon: '⏸️' });
  };

  const handleResume = () => {
    setIsRunning(true);
    toast('Timer resumed', { icon: '▶️' });
  };

  const handleStop = () => {
    if (elapsedTime < 60) {
      toast.error('Time entry must be at least 1 minute');
      return;
    }

    const entry = {
      id: Date.now(),
      task: currentTask,
      project: currentProject,
      date: new Date().toISOString().split('T')[0],
      startTime: startTime.toISOString(),
      endTime: new Date().toISOString(),
      duration: Math.floor(elapsedTime / 60),
      userId: user.id
    };

    setTimeEntries([entry, ...timeEntries]);
    setIsRunning(false);
    setStartTime(null);
    setElapsedTime(0);
    setCurrentTask('');
    setCurrentProject('');
    toast.success('Time entry saved');
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    
    const start = new Date(`${manualEntry.date}T${manualEntry.startTime}`);
    const end = new Date(`${manualEntry.date}T${manualEntry.endTime}`);
    const duration = Math.floor((end - start) / 60000);

    if (duration <= 0) {
      toast.error('End time must be after start time');
      return;
    }

    const entry = {
      id: Date.now(),
      task: manualEntry.task,
      project: manualEntry.project,
      date: manualEntry.date,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      duration,
      description: manualEntry.description,
      userId: user.id
    };

    setTimeEntries([entry, ...timeEntries]);
    setShowManualEntry(false);
    setManualEntry({
      task: '',
      project: '',
      date: new Date().toISOString().split('T')[0],
      startTime: '09:00',
      endTime: '17:00',
      description: ''
    });
    toast.success('Time entry added');
  };

  const handleDeleteEntry = (id) => {
    setTimeEntries(timeEntries.filter(e => e.id !== id));
    toast.success('Entry deleted');
  };

  // Calculate stats
  const todayTotal = timeEntries
    .filter(e => e.date === new Date().toISOString().split('T')[0])
    .reduce((sum, e) => sum + e.duration, 0);
  
  const weekTotal = timeEntries
    .filter(e => {
      const entryDate = new Date(e.date);
      const today = new Date();
      const weekAgo = new Date(today.setDate(today.getDate() - 7));
      return entryDate >= weekAgo;
    })
    .reduce((sum, e) => sum + e.duration, 0);

  const projectTotals = timeEntries.reduce((acc, e) => {
    const key = e.project || 'No Project';
    acc[key] = (acc[key] || 0) + e.duration;
    return acc;
  }, {});

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Timer Card */}
      <div className="card bg-gradient-to-r from-guardian-600 to-guardian-700 text-white">
        <div className="card-body py-8">
          <div className="text-center mb-6">
            <p className="text-6xl font-mono font-bold mb-2">{formatTime(elapsedTime)}</p>
            <p className="text-guardian-200">
              {isRunning ? 'Timer Running' : startTime ? 'Timer Paused' : 'Ready to Track'}
            </p>
          </div>

          <div className="max-w-xl mx-auto space-y-4">
            <input
              type="text"
              placeholder="What are you working on?"
              value={currentTask}
              onChange={(e) => setCurrentTask(e.target.value)}
              disabled={isRunning}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/30"
            />
            <div className="flex gap-4">
              <select
                value={currentProject}
                onChange={(e) => setCurrentProject(e.target.value)}
                disabled={isRunning}
                className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/30"
              >
                <option value="" className="text-gray-900">Select Project</option>
                <option value="Project Alpha" className="text-gray-900">Project Alpha</option>
                <option value="Project Beta" className="text-gray-900">Project Beta</option>
                <option value="Internal" className="text-gray-900">Internal</option>
                <option value="Support" className="text-gray-900">Support</option>
              </select>
            </div>
          </div>

          <div className="flex justify-center gap-4 mt-6">
            {!isRunning && !startTime && (
              <button
                onClick={handleStart}
                className="flex items-center gap-2 px-8 py-3 bg-green-500 hover:bg-green-600 rounded-xl font-medium transition-colors"
              >
                <Play className="w-5 h-5" />
                Start
              </button>
            )}
            {isRunning && (
              <>
                <button
                  onClick={handlePause}
                  className="flex items-center gap-2 px-6 py-3 bg-yellow-500 hover:bg-yellow-600 rounded-xl font-medium transition-colors"
                >
                  <Pause className="w-5 h-5" />
                  Pause
                </button>
                <button
                  onClick={handleStop}
                  className="flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 rounded-xl font-medium transition-colors"
                >
                  <Square className="w-5 h-5" />
                  Stop
                </button>
              </>
            )}
            {!isRunning && startTime && (
              <>
                <button
                  onClick={handleResume}
                  className="flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 rounded-xl font-medium transition-colors"
                >
                  <Play className="w-5 h-5" />
                  Resume
                </button>
                <button
                  onClick={handleStop}
                  className="flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 rounded-xl font-medium transition-colors"
                >
                  <Square className="w-5 h-5" />
                  Stop
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
            <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatDuration(todayTotal)}</p>
            <p className="text-sm text-gray-500">Today</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
            <Calendar className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatDuration(weekTotal)}</p>
            <p className="text-sm text-gray-500">This Week</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
            <Briefcase className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{Object.keys(projectTotals).length}</p>
            <p className="text-sm text-gray-500">Projects</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center">
            <History className="w-6 h-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{timeEntries.length}</p>
            <p className="text-sm text-gray-500">Entries</p>
          </div>
        </div>
      </div>

      {/* Time Entries */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-white">Recent Time Entries</h3>
          <button 
            onClick={() => setShowManualEntry(true)}
            className="btn btn-ghost text-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Manual Entry
          </button>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {timeEntries.slice(0, 10).map((entry) => (
            <div key={entry.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-guardian-100 dark:bg-guardian-900/30 rounded-lg flex items-center justify-center">
                  <Timer className="w-5 h-5 text-guardian-600 dark:text-guardian-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{entry.task}</p>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    {entry.project && (
                      <span className="flex items-center gap-1">
                        <Briefcase className="w-3 h-3" />
                        {entry.project}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(entry.date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-mono font-medium text-gray-900 dark:text-white">
                  {formatDuration(entry.duration)}
                </span>
                <button
                  onClick={() => handleDeleteEntry(entry.id)}
                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {timeEntries.length === 0 && (
            <div className="p-12 text-center">
              <Timer className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No time entries yet</p>
              <p className="text-sm text-gray-400">Start the timer or add a manual entry</p>
            </div>
          )}
        </div>
      </div>

      {/* Manual Entry Modal */}
      {showManualEntry && (
        <div className="modal-overlay" onClick={() => setShowManualEntry(false)}>
          <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
              Add Manual Time Entry
            </h2>
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Task *
                </label>
                <input
                  type="text"
                  required
                  value={manualEntry.task}
                  onChange={(e) => setManualEntry({ ...manualEntry, task: e.target.value })}
                  className="input w-full"
                  placeholder="What did you work on?"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Project
                  </label>
                  <select
                    value={manualEntry.project}
                    onChange={(e) => setManualEntry({ ...manualEntry, project: e.target.value })}
                    className="input w-full"
                  >
                    <option value="">Select Project</option>
                    <option value="Project Alpha">Project Alpha</option>
                    <option value="Project Beta">Project Beta</option>
                    <option value="Internal">Internal</option>
                    <option value="Support">Support</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={manualEntry.date}
                    onChange={(e) => setManualEntry({ ...manualEntry, date: e.target.value })}
                    className="input w-full"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={manualEntry.startTime}
                    onChange={(e) => setManualEntry({ ...manualEntry, startTime: e.target.value })}
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
                    value={manualEntry.endTime}
                    onChange={(e) => setManualEntry({ ...manualEntry, endTime: e.target.value })}
                    className="input w-full"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={manualEntry.description}
                  onChange={(e) => setManualEntry({ ...manualEntry, description: e.target.value })}
                  className="input w-full"
                  rows={2}
                  placeholder="Additional notes..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowManualEntry(false)} className="btn btn-ghost">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Add Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default TimeTrackingPage;
