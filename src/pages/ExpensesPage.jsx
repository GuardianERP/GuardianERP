/**
 * Guardian Desktop ERP - Expenses Page
 * Expense tracking with categories and receipts
 */

import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Receipt, Edit2, Trash2, CheckCircle, XCircle, CreditCard,
  TrendingDown, Calendar, Banknote
} from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { expensesAPI } from '../services/api';
import toast from 'react-hot-toast';

// Category configurations
const CATEGORIES = [
  { value: 'office', label: 'Office Supplies', icon: '🏢', color: 'blue' },
  { value: 'travel', label: 'Travel', icon: '✈️', color: 'purple' },
  { value: 'meals', label: 'Meals & Entertainment', icon: '🍽️', color: 'orange' },
  { value: 'utilities', label: 'Utilities', icon: '💡', color: 'yellow' },
  { value: 'software', label: 'Software & Tools', icon: '💻', color: 'indigo' },
  { value: 'marketing', label: 'Marketing', icon: '📢', color: 'pink' },
  { value: 'salary', label: 'Salary & Wages', icon: '💰', color: 'green' },
  { value: 'other', label: 'Other', icon: '📦', color: 'gray' }
];

// Status Badge Component
const StatusBadge = ({ status }) => {
  const styles = {
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    paid: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${styles[status] || styles.pending}`}>
      {status}
    </span>
  );
};

function ExpensesPage() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [expenseToDelete, setExpenseToDelete] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    category: 'office',
    date: new Date().toISOString().split('T')[0],
    description: '',
    receipt_url: '',
    status: 'pending'
  });

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      const data = await expensesAPI.getAll();
      setExpenses(data);
    } catch (error) {
      toast.error('Failed to fetch expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const expenseData = {
        ...formData,
        amount: parseFloat(formData.amount),
        user_id: user.id
      };

      if (editingExpense) {
        await expensesAPI.update(editingExpense.id, expenseData);
        toast.success('Expense updated successfully');
      } else {
        await expensesAPI.create(expenseData);
        toast.success('Expense added successfully');
      }
      fetchExpenses();
      closeModal();
    } catch (error) {
      toast.error(error.message || 'Failed to save expense');
    }
  };

  const handleDelete = async () => {
    try {
      await expensesAPI.delete(expenseToDelete.id);
      toast.success('Expense deleted successfully');
      fetchExpenses();
      setShowDeleteModal(false);
      setExpenseToDelete(null);
    } catch (error) {
      toast.error('Failed to delete expense');
    }
  };

  // Status management functions
  const handleApprove = async (expense) => {
    try {
      // Use employeeId (not user.id) for approved_by foreign key
      const approverId = user.employeeId || user.employee?.id;
      if (!approverId) {
        toast.error('Cannot approve: No employee profile linked to your account');
        return;
      }
      await expensesAPI.approve(expense.id, approverId);
      toast.success('Expense approved');
      fetchExpenses();
    } catch (error) {
      toast.error(error.message || 'Failed to approve expense');
    }
  };

  const handleReject = async (expense) => {
    const reason = window.prompt('Enter rejection reason (optional):');
    try {
      // Use employeeId (not user.id) for approved_by foreign key
      const approverId = user.employeeId || user.employee?.id;
      if (!approverId) {
        toast.error('Cannot reject: No employee profile linked to your account');
        return;
      }
      await expensesAPI.reject(expense.id, approverId, reason || '');
      toast.success('Expense rejected');
      fetchExpenses();
    } catch (error) {
      toast.error(error.message || 'Failed to reject expense');
    }
  };

  const handleMarkAsPaid = async (expense) => {
    try {
      await expensesAPI.update(expense.id, { status: 'paid' });
      toast.success('Expense marked as paid');
      fetchExpenses();
    } catch (error) {
      toast.error(error.message || 'Failed to update expense');
    }
  };

  const openEditModal = (expense) => {
    setEditingExpense(expense);
    setFormData({
      title: expense.description || '', // Title maps to description in database
      amount: expense.amount.toString(),
      category: expense.category,
      date: expense.date ? expense.date.split('T')[0] : '',
      description: '', // Keep for any additional notes
      receipt_url: expense.receipt_url || '',
      status: expense.status
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingExpense(null);
    setFormData({
      title: '',
      amount: '',
      category: 'office',
      date: new Date().toISOString().split('T')[0],
      description: '',
      receipt_url: '',
      status: 'pending'
    });
  };

  const filteredExpenses = expenses.filter(expense => {
    const title = expense.description || ''; // Title is stored in description field
    const description = expense.description || '';
    const matchesSearch = title.toLowerCase().includes(search.toLowerCase()) ||
                          description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = filterCategory === 'all' || expense.category === filterCategory;
    const matchesStatus = filterStatus === 'all' || expense.status === filterStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const monthlyExpenses = expenses
    .filter(e => new Date(e.date).getMonth() === new Date().getMonth())
    .reduce((sum, e) => sum + e.amount, 0);
  const pendingExpenses = expenses.filter(e => e.status === 'pending').length;
  const categoryTotals = CATEGORIES.map(cat => ({
    ...cat,
    total: expenses.filter(e => e.category === cat.value).reduce((sum, e) => sum + e.amount, 0)
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
        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
            <Banknote className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              PKR {totalExpenses.toLocaleString()}
            </p>
            <p className="text-sm text-gray-500">Total Expenses</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
            <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              PKR {monthlyExpenses.toLocaleString()}
            </p>
            <p className="text-sm text-gray-500">This Month</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center">
            <Receipt className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{pendingExpenses}</p>
            <p className="text-sm text-gray-500">Pending Approval</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
            <TrendingDown className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{expenses.length}</p>
            <p className="text-sm text-gray-500">Total Records</p>
          </div>
        </div>
      </div>

      {/* Top Categories */}
      <div className="card p-4">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Top Spending Categories</h3>
        <div className="flex flex-wrap gap-3">
          {categoryTotals.slice(0, 4).map((cat) => (
            <div key={cat.value} className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <span className="text-lg">{cat.icon}</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">{cat.label}</span>
              <span className="text-sm text-gray-500">PKR {cat.total.toLocaleString()}</span>
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
                placeholder="Search expenses..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-10 w-full sm:w-64"
              />
            </div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="input"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.icon} {cat.label}
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
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="paid">Paid</option>
            </select>
          </div>
          <button onClick={() => setShowModal(true)} className="btn btn-primary whitespace-nowrap">
            <Plus className="w-4 h-4 mr-2" />
            Add Expense
          </button>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="card overflow-hidden">
        <table className="table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Category</th>
              <th>Amount</th>
              <th>Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredExpenses.map((expense) => {
              const category = CATEGORIES.find(c => c.value === expense.category) || CATEGORIES[CATEGORIES.length - 1];
              return (
                <tr key={expense.id}>
                  <td>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{expense.description || 'Untitled'}</p>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <span>{category.icon}</span>
                      <span className="text-sm">{category.label}</span>
                    </div>
                  </td>
                  <td className="font-semibold text-red-600 dark:text-red-400">
                    PKR {expense.amount.toLocaleString()}
                  </td>
                  <td>{new Date(expense.date).toLocaleDateString()}</td>
                  <td><StatusBadge status={expense.status} /></td>
                  <td>
                    <div className="flex items-center gap-1">
                      {/* Status Actions */}
                      {expense.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(expense)}
                            className="p-1.5 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                            title="Approve"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleReject(expense)}
                            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Reject"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {expense.status === 'approved' && (
                        <button
                          onClick={() => handleMarkAsPaid(expense)}
                          className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Mark as Paid"
                        >
                          <CreditCard className="w-4 h-4" />
                        </button>
                      )}
                      {/* Edit & Delete */}
                      <button
                        onClick={() => openEditModal(expense)}
                        className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { setExpenseToDelete(expense); setShowDeleteModal(true); }}
                        className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredExpenses.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-12">
                  <Receipt className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">No expenses found</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Expense Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
              {editingExpense ? 'Edit Expense' : 'Add New Expense'}
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
                  placeholder="e.g., Office Supplies"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Amount (PKR) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">PKR</span>
                    <input
                      type="number"
                      required
                      min="0"
                      step="1"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className="input w-full pl-10"
                      placeholder="0"
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
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category *
                </label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="input w-full"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
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
              {editingExpense && (
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
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={closeModal} className="btn btn-ghost">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingExpense ? 'Update Expense' : 'Add Expense'}
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
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Delete Expense</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete "{expenseToDelete?.description || 'this expense'}"? This action cannot be undone.
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

export default ExpensesPage;
