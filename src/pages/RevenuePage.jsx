/**
 * Guardian Desktop ERP - Revenue Page
 * Revenue tracking with multiple sources and analytics
 */

import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, DollarSign, TrendingUp, Calendar, Edit2, Trash2,
  PiggyBank, CreditCard, Building, Users, ArrowUpRight
} from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { revenueAPI } from '../services/api';
import toast from 'react-hot-toast';

// Source configurations
const SOURCES = [
  { value: 'sales', label: 'Sales', icon: '💳', color: 'green' },
  { value: 'services', label: 'Services', icon: '🔧', color: 'blue' },
  { value: 'subscriptions', label: 'Subscriptions', icon: '📦', color: 'purple' },
  { value: 'consulting', label: 'Consulting', icon: '💼', color: 'indigo' },
  { value: 'investment', label: 'Investment', icon: '📈', color: 'yellow' },
  { value: 'other', label: 'Other', icon: '💰', color: 'gray' }
];

// Status Badge Component
const StatusBadge = ({ status }) => {
  const styles = {
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    received: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    partial: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${styles[status] || styles.pending}`}>
      {status}
    </span>
  );
};

function RevenuePage() {
  const { user } = useAuth();
  const [revenues, setRevenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSource, setFilterSource] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingRevenue, setEditingRevenue] = useState(null);
  const [revenueToDelete, setRevenueToDelete] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    source: 'sales',
    date: new Date().toISOString().split('T')[0],
    client_name: '',
    description: '',
    status: 'pending'
  });

  useEffect(() => {
    fetchRevenues();
  }, []);

  const fetchRevenues = async () => {
    try {
      const data = await revenueAPI.getAll();
      setRevenues(data);
    } catch (error) {
      toast.error('Failed to fetch revenue records');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const revenueData = {
        ...formData,
        amount: parseFloat(formData.amount),
        user_id: user.id
      };

      if (editingRevenue) {
        await revenueAPI.update(editingRevenue.id, revenueData);
        toast.success('Revenue updated successfully');
      } else {
        await revenueAPI.create(revenueData);
        toast.success('Revenue added successfully');
      }
      fetchRevenues();
      closeModal();
    } catch (error) {
      toast.error(error.message || 'Failed to save revenue');
    }
  };

  const handleDelete = async () => {
    try {
      await revenueAPI.delete(revenueToDelete.id);
      toast.success('Revenue deleted successfully');
      fetchRevenues();
      setShowDeleteModal(false);
      setRevenueToDelete(null);
    } catch (error) {
      toast.error('Failed to delete revenue');
    }
  };

  const openEditModal = (revenue) => {
    setEditingRevenue(revenue);
    setFormData({
      title: revenue.description || '', // Title is stored in description field
      amount: revenue.amount.toString(),
      source: revenue.source,
      date: revenue.date ? revenue.date.split('T')[0] : '',
      client_name: revenue.client_name || '',
      description: '', // Keep for additional notes
      status: revenue.status
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingRevenue(null);
    setFormData({
      title: '',
      amount: '',
      source: 'sales',
      date: new Date().toISOString().split('T')[0],
      client_name: '',
      description: '',
      status: 'pending'
    });
  };

  const filteredRevenues = revenues.filter(revenue => {
    const title = revenue.description || ''; // Title is stored in description field
    const matchesSearch = title.toLowerCase().includes(search.toLowerCase()) ||
                          (revenue.client_name && revenue.client_name.toLowerCase().includes(search.toLowerCase()));
    const matchesSource = filterSource === 'all' || revenue.source === filterSource;
    const matchesStatus = filterStatus === 'all' || revenue.status === filterStatus;
    return matchesSearch && matchesSource && matchesStatus;
  });

  const totalRevenue = revenues.reduce((sum, r) => sum + r.amount, 0);
  const receivedRevenue = revenues
    .filter(r => r.status === 'received')
    .reduce((sum, r) => sum + r.amount, 0);
  const pendingRevenue = revenues
    .filter(r => r.status === 'pending')
    .reduce((sum, r) => sum + r.amount, 0);
  const monthlyRevenue = revenues
    .filter(r => new Date(r.date).getMonth() === new Date().getMonth())
    .reduce((sum, r) => sum + r.amount, 0);

  const sourceTotals = SOURCES.map(src => ({
    ...src,
    total: revenues.filter(r => r.source === src.value).reduce((sum, r) => sum + r.amount, 0)
  })).sort((a, b) => b.total - a.total);

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
        <div className="card p-4 flex items-center gap-4 bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-bold">${totalRevenue.toLocaleString()}</p>
            <p className="text-sm text-green-100">Total Revenue</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              ${monthlyRevenue.toLocaleString()}
            </p>
            <p className="text-sm text-gray-500">This Month</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              ${receivedRevenue.toLocaleString()}
            </p>
            <p className="text-sm text-gray-500">Received</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center">
            <PiggyBank className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              ${pendingRevenue.toLocaleString()}
            </p>
            <p className="text-sm text-gray-500">Pending</p>
          </div>
        </div>
      </div>

      {/* Revenue Sources */}
      <div className="card p-4">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Revenue by Source</h3>
        <div className="flex flex-wrap gap-3">
          {sourceTotals.slice(0, 4).map((src) => (
            <div key={src.value} className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <span className="text-lg">{src.icon}</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">{src.label}</span>
              <span className="text-sm text-green-600 font-medium">+${src.total.toLocaleString()}</span>
            </div>
          ))}
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
                placeholder="Search revenue..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-10 w-full sm:w-64"
              />
            </div>
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              className="input"
            >
              <option value="all">All Sources</option>
              {SOURCES.map((src) => (
                <option key={src.value} value={src.value}>
                  {src.icon} {src.label}
                </option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="received">Received</option>
              <option value="partial">Partial</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
          <button onClick={() => setShowModal(true)} className="btn btn-primary whitespace-nowrap">
            <Plus className="w-4 h-4 mr-2" />
            Add Revenue
          </button>
        </div>
      </div>

      {/* Revenue Table */}
      <div className="card overflow-hidden">
        <table className="table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Client</th>
              <th>Source</th>
              <th>Amount</th>
              <th>Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRevenues.map((revenue) => {
              const source = SOURCES.find(s => s.value === revenue.source) || SOURCES[SOURCES.length - 1];
              return (
                <tr key={revenue.id}>
                  <td>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{revenue.description || 'Untitled'}</p>
                    </div>
                  </td>
                  <td>
                    {revenue.client_name ? (
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span>{revenue.client_name}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <span>{source.icon}</span>
                      <span className="text-sm">{source.label}</span>
                    </div>
                  </td>
                  <td className="font-semibold text-green-600 dark:text-green-400">
                    <div className="flex items-center gap-1">
                      <ArrowUpRight className="w-4 h-4" />
                      +${revenue.amount.toLocaleString()}
                    </div>
                  </td>
                  <td>{new Date(revenue.date).toLocaleDateString()}</td>
                  <td><StatusBadge status={revenue.status} /></td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(revenue)}
                        className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { setRevenueToDelete(revenue); setShowDeleteModal(true); }}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredRevenues.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-12">
                  <DollarSign className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">No revenue records found</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Revenue Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
              {editingRevenue ? 'Edit Revenue' : 'Add New Revenue'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="input w-full"
                  placeholder="e.g., Project Payment"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Amount *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className="input w-full pl-8"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="input w-full"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Source *
                  </label>
                  <select
                    required
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    className="input w-full"
                  >
                    {SOURCES.map((src) => (
                      <option key={src.value} value={src.value}>
                        {src.icon} {src.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="input w-full"
                  >
                    <option value="pending">Pending</option>
                    <option value="received">Received</option>
                    <option value="partial">Partial</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Client Name
                </label>
                <input
                  type="text"
                  value={formData.client_name}
                  onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                  className="input w-full"
                  placeholder="e.g., Acme Corp"
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
                  placeholder="Additional details..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={closeModal} className="btn btn-ghost">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingRevenue ? 'Update Revenue' : 'Add Revenue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Delete Revenue</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete "{revenueToDelete?.description || 'this revenue'}"? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDeleteModal(false)} className="btn btn-ghost">
                Cancel
              </button>
              <button onClick={handleDelete} className="btn bg-red-600 hover:bg-red-700 text-white">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RevenuePage;
