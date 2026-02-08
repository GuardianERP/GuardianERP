/**
 * Guardian Desktop ERP - Leaves Page
 * Leave request management with approval workflow
 */

import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Calendar, CheckCircle, XCircle, Clock, 
  Umbrella, Heart, Briefcase, FileText, Filter
} from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { leavesAPI, employeesAPI } from '../services/api';
import { getDepartmentLabel, getPositionLabel } from '../data/organizationConfig';
import toast from 'react-hot-toast';

// Status Badge Component
const StatusBadge = ({ status }) => {
  const styles = {
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${styles[status] || styles.pending}`}>
      {status}
    </span>
  );
};

// Leave Type Icon
const LeaveTypeIcon = ({ type }) => {
  const icons = {
    sick: Heart,
    vacation: Umbrella,
    personal: Briefcase,
    other: FileText
  };
  const Icon = icons[type] || icons.other;
  return <Icon className="w-5 h-5" />;
};

function LeavesPage() {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [showModal, setShowModal] = useState(false);
  
  const [formData, setFormData] = useState({
    leave_type: 'vacation',
    start_date: '',
    end_date: '',
    reason: ''
  });

  useEffect(() => {
    fetchLeaves();
    fetchEmployees();
  }, []);

  const fetchLeaves = async () => {
    try {
      const data = await leavesAPI.getAll();
      setLeaves(data || []);
    } catch (error) {
      console.error('Failed to fetch leave requests:', error);
      toast.error('Failed to fetch leave requests');
      setLeaves([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const data = await employeesAPI.getAll();
      setEmployees(data || []);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
      setEmployees([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Don't pass user_id - API will get employee_id from current user
      await leavesAPI.create(formData);
      toast.success('Leave request submitted successfully');
      fetchLeaves();
      closeModal();
    } catch (error) {
      toast.error(error.message || 'Failed to submit leave request');
    }
  };

  const handleApprove = async (leaveId) => {
    try {
      await leavesAPI.approve(leaveId);
      toast.success('Leave request approved');
      fetchLeaves();
    } catch (error) {
      toast.error('Failed to approve leave request');
    }
  };

  const handleReject = async (leaveId, reason = '') => {
    try {
      await leavesAPI.reject(leaveId, reason);
      toast.success('Leave request rejected');
      fetchLeaves();
    } catch (error) {
      toast.error('Failed to reject leave request');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setFormData({
      leave_type: 'vacation',
      start_date: '',
      end_date: '',
      reason: ''
    });
  };

  const calculateDays = (start, end) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  // Helper to get employee name from leave record
  const getEmployeeName = (leave) => {
    if (leave.employees) {
      return `${leave.employees.first_name || ''} ${leave.employees.last_name || ''}`.trim();
    }
    return 'Unknown';
  };

  const filteredLeaves = leaves.filter(leave => {
    const employeeName = getEmployeeName(leave) || '';
    const reason = leave.reason || '';
    const matchesSearch = reason.toLowerCase().includes(search.toLowerCase()) ||
                          employeeName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'all' || leave.status === filterStatus;
    const matchesType = filterType === 'all' || leave.leave_type === filterType;
    return matchesSearch && matchesStatus && matchesType;
  });

  const stats = {
    total: leaves.length,
    pending: leaves.filter(l => l.status === 'pending').length,
    approved: leaves.filter(l => l.status === 'approved').length,
    rejected: leaves.filter(l => l.status === 'rejected').length
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
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
            <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            <p className="text-sm text-gray-500">Total Requests</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center">
            <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pending}</p>
            <p className="text-sm text-gray-500">Pending</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.approved}</p>
            <p className="text-sm text-gray-500">Approved</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
            <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.rejected}</p>
            <p className="text-sm text-gray-500">Rejected</p>
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
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-10 w-full sm:w-64"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="input"
            >
              <option value="all">All Types</option>
              <option value="sick">Sick Leave</option>
              <option value="vacation">Vacation</option>
              <option value="personal">Personal</option>
              <option value="other">Other</option>
            </select>
          </div>
          <button onClick={() => setShowModal(true)} className="btn btn-primary whitespace-nowrap">
            <Plus className="w-4 h-4 mr-2" />
            Request Leave
          </button>
        </div>
      </div>

      {/* Leave Requests List */}
      <div className="card overflow-hidden">
        <table className="table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Type</th>
              <th>Duration</th>
              <th>Reason</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredLeaves.map((leave) => {
              const employeeName = getEmployeeName(leave);
              return (
                <tr key={leave.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-guardian-400 to-guardian-600 flex items-center justify-center text-white font-medium">
                        {employeeName.charAt(0) || 'U'}
                      </div>
                      <div>
                        <span className="font-medium text-gray-900 dark:text-white block">
                          {employeeName}
                        </span>
                        <span className="text-xs text-gray-500">
                          {getPositionLabel(leave.employees?.role) || ''}{leave.employees?.role && leave.employees?.department ? ' • ' : ''}{getDepartmentLabel(leave.employees?.department) || ''}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2 capitalize">
                      <LeaveTypeIcon type={leave.leave_type} />
                      {leave.leave_type}
                    </div>
                  </td>
                  <td>
                    <div className="text-sm">
                      <p className="font-medium">{calculateDays(leave.start_date, leave.end_date)} days</p>
                      <p className="text-gray-500">
                        {new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}
                      </p>
                    </div>
                  </td>
                  <td className="max-w-xs truncate">{leave.reason || '-'}</td>
                  <td><StatusBadge status={leave.status} /></td>
                  <td>
                    {leave.status === 'pending' && user.role === 'admin' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleApprove(leave.id)}
                          className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                          title="Approve"
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleReject(leave.id)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Reject"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                    {leave.status !== 'pending' && (
                      <span className="text-sm text-gray-500">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {filteredLeaves.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-12">
                  <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">No leave requests found</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Request Leave Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
              Request Leave
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Leave Type *
                </label>
                <select
                  required
                  value={formData.leave_type}
                  onChange={(e) => setFormData({ ...formData, leave_type: e.target.value })}
                  className="input w-full"
                >
                  <option value="vacation">Vacation</option>
                  <option value="sick">Sick Leave</option>
                  <option value="personal">Personal</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start Date *
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
                    End Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.end_date}
                    min={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="input w-full"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Reason
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="input w-full"
                  rows={3}
                  placeholder="Explain your reason for leave..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={closeModal} className="btn btn-ghost">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default LeavesPage;
