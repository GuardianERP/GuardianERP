/**
 * Guardian Desktop ERP - Attendance Page
 */

import React, { useState, useEffect } from 'react';
import { Clock, Play, Square, Calendar, TrendingUp, Users } from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { attendanceAPI, employeesAPI } from '../services/api';
import toast from 'react-hot-toast';

function AttendancePage() {
  const { user } = useAuth();
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState({ totalHours: 0, daysPresent: 0, avgHoursPerDay: 0 });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (user?.employeeId) {
      checkAttendanceStatus();
      fetchRecords();
      fetchStats();
    }
  }, [user]);

  const checkAttendanceStatus = async () => {
    try {
      const status = await attendanceAPI.getStatus(user.employeeId);
      setIsClockedIn(status.isClockedIn);
      if (status.todayRecord?.clock_in) {
        setClockInTime(new Date(status.todayRecord.clock_in));
      }
    } catch (error) {
      console.error('Failed to check status:', error);
    }
  };

  const fetchRecords = async () => {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      const data = await attendanceAPI.getRecords(user.employeeId, startDate.toISOString().split('T')[0], null);
      setRecords(data || []);
    } catch (error) {
      console.error('Failed to fetch records:', error);
      setRecords([]);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await attendanceAPI.getStats(user.employeeId, 'month');
      setStats(data || { totalHours: 0, daysPresent: 0, avgHoursPerDay: 0 });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      setStats({ totalHours: 0, daysPresent: 0, avgHoursPerDay: 0 });
    }
  };

  const handleClockIn = async () => {
    setLoading(true);
    try {
      const result = await attendanceAPI.clockIn(user.employeeId);
      setIsClockedIn(true);
      setClockInTime(new Date(result.clock_in));
      toast.success('Clocked in successfully!');
    } catch (error) {
      toast.error(error.message || 'Failed to clock in');
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    setLoading(true);
    try {
      await attendanceAPI.clockOut(user.employeeId);
      setIsClockedIn(false);
      setClockInTime(null);
      toast.success('Clocked out successfully!');
      fetchRecords();
      fetchStats();
    } catch (error) {
      toast.error(error.message || 'Failed to clock out');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const getElapsedTime = () => {
    if (!clockInTime) return '00:00:00';
    const diff = currentTime - clockInTime;
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Clock In/Out Card */}
      <div className="card bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="card-body text-center py-8">
          <p className="text-blue-200 mb-2">Current Time</p>
          <p className="text-5xl font-bold mb-6 font-mono">{formatTime(currentTime)}</p>
          
          {isClockedIn ? (
            <>
              <p className="text-blue-200 mb-2">You've been working for</p>
              <p className="text-3xl font-bold mb-6 font-mono">{getElapsedTime()}</p>
              <button
                onClick={handleClockOut}
                disabled={loading}
                className="inline-flex items-center gap-2 px-8 py-3 bg-red-500 hover:bg-red-600 rounded-xl font-medium transition-colors"
              >
                <Square className="w-5 h-5" />
                Clock Out
              </button>
            </>
          ) : (
            <button
              onClick={handleClockIn}
              disabled={loading}
              className="inline-flex items-center gap-2 px-8 py-3 bg-green-500 hover:bg-green-600 rounded-xl font-medium transition-colors"
            >
              <Play className="w-5 h-5" />
              Clock In
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
            <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalHours}h</p>
            <p className="text-sm text-gray-500">Total Hours (Month)</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
            <Calendar className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.daysPresent}</p>
            <p className="text-sm text-gray-500">Days Present</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.avgHoursPerDay}h</p>
            <p className="text-sm text-gray-500">Avg Hours/Day</p>
          </div>
        </div>
      </div>

      {/* Recent Records */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-gray-900 dark:text-white">Recent Attendance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Clock In</th>
                <th>Clock Out</th>
                <th>Duration</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {records.slice(0, 10).map((record) => (
                <tr key={record.id}>
                  <td>{new Date(record.date).toLocaleDateString()}</td>
                  <td>{record.clock_in ? new Date(record.clock_in).toLocaleTimeString() : '-'}</td>
                  <td>{record.clock_out ? new Date(record.clock_out).toLocaleTimeString() : '-'}</td>
                  <td>{record.duration_minutes ? `${Math.floor(record.duration_minutes / 60)}h ${record.duration_minutes % 60}m` : '-'}</td>
                  <td>
                    <span className={`badge ${record.status === 'present' ? 'badge-success' : 'badge-warning'}`}>
                      {record.status}
                    </span>
                  </td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-500">
                    No attendance records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AttendancePage;
