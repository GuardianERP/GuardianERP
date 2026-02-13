/**
 * Guardian Desktop ERP - Loans Page
 * Loan request management with approval workflow
 */

import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, DollarSign, CheckCircle, XCircle, Clock,
  Wallet, Send, CreditCard, AlertCircle, TrendingUp
} from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { loansAPI, employeesAPI } from '../services/api';
import { getDepartmentLabel, getPositionLabel } from '../data/organizationConfig';
import toast from 'react-hot-toast';

const StatusBadge = ({ status }) => {
  const styles = {
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    recommended: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    disbursed: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    repaying: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${styles[status] || styles.pending}`}>
      {status}
    </span>
  );
};

const LoanTypeIcon = ({ type }) => {
  const icons = { personal: Wallet, advance: CreditCard, emergency: AlertCircle };
  const Icon = icons[type] || icons.personal;
  return <Icon className="w-5 h-5" />;
};

function LoansPage() {
  const { user } = useAuth();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedLoanId, setSelectedLoanId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const [formData, setFormData] = useState({
    amount: '',
    loan_type: 'personal',
    reason: '',
    repayment_plan: 'monthly',
    total_installments: '',
    notes: '',
  });

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isManager = user?.role === 'manager';

  useEffect(() => {
    fetchLoans();
  }, []);

  const fetchLoans = async () => {
    try {
      const data = await loansAPI.getAll();
      setLoans(data || []);
    } catch (error) {
      console.error('Failed to fetch loans:', error);
      setLoans([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        amount: parseFloat(formData.amount),
        total_installments: formData.total_installments ? parseInt(formData.total_installments) : null,
        installment_amount: formData.total_installments && formData.amount 
          ? (parseFloat(formData.amount) / parseInt(formData.total_installments)).toFixed(2)
          : null,
      };
      await loansAPI.create(submitData);
      toast.success('Loan request submitted successfully');
      fetchLoans();
      closeModal();
    } catch (error) {
      toast.error(error.message || 'Failed to submit loan request');
    }
  };

  const handleApprove = async (loanId) => {
    try {
      await loansAPI.approve(loanId);
      toast.success('Loan request approved');
      fetchLoans();
    } catch (error) {
      toast.error('Failed to approve loan request');
    }
  };

  const openRejectModal = (loanId) => {
    setSelectedLoanId(loanId);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const handleReject = async () => {
    try {
      await loansAPI.reject(selectedLoanId, rejectReason);
      toast.success('Loan request rejected');
      setShowRejectModal(false);
      fetchLoans();
    } catch (error) {
      toast.error('Failed to reject loan request');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setFormData({ amount: '', loan_type: 'personal', reason: '', repayment_plan: 'monthly', total_installments: '', notes: '' });
  };

  const getEmployeeName = (loan) => {
    if (loan.employees) return `${loan.employees.first_name || ''} ${loan.employees.last_name || ''}`.trim();
    return 'Unknown';
  };

  const filteredLoans = loans.filter(loan => {
    const employeeName = getEmployeeName(loan) || '';
    const reason = loan.reason || '';
    const matchesSearch = reason.toLowerCase().includes(search.toLowerCase()) ||
                          employeeName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'all' || loan.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: loans.length,
    pending: loans.filter(l => l.status === 'pending').length,
    approved: loans.filter(l => l.status === 'approved' || l.status === 'disbursed').length,
    totalAmount: loans.filter(l => l.status === 'approved' || l.status === 'disbursed' || l.status === 'repaying')
      .reduce((sum, l) => sum + (parseFloat(l.amount) || 0), 0),
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
            <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
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
          <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">${stats.totalAmount.toLocaleString()}</p>
            <p className="text-sm text-gray-500">Active Loans</p>
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="card p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-10 w-full sm:w-64" />
            </div>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input">
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="disbursed">Disbursed</option>
              <option value="repaying">Repaying</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <button onClick={() => setShowModal(true)} className="btn btn-primary whitespace-nowrap">
            <Plus className="w-4 h-4 mr-2" />
            Request Loan
          </button>
        </div>
      </div>

      {/* Loans List */}
      <div className="card overflow-hidden">
        <table className="table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Repayment</th>
              <th>Reason</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredLoans.map((loan) => {
              const employeeName = getEmployeeName(loan);
              return (
                <tr key={loan.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      {loan.employees?.avatar_url ? (
                        <img src={loan.employees.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-medium">
                          {employeeName.charAt(0) || 'U'}
                        </div>
                      )}
                      <div>
                        <span className="font-medium text-gray-900 dark:text-white block">{employeeName}</span>
                        <span className="text-xs text-gray-500">{loan.employees?.department ? getDepartmentLabel(loan.employees.department) : ''}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2 capitalize">
                      <LoanTypeIcon type={loan.loan_type} />
                      {loan.loan_type}
                    </div>
                  </td>
                  <td>
                    <span className="font-bold text-gray-900 dark:text-white">${parseFloat(loan.amount).toLocaleString()}</span>
                  </td>
                  <td>
                    <div className="text-sm">
                      <p className="capitalize">{loan.repayment_plan || '-'}</p>
                      {loan.total_installments && (
                        <p className="text-gray-500">{loan.paid_installments || 0}/{loan.total_installments} paid</p>
                      )}
                    </div>
                  </td>
                  <td className="max-w-xs truncate">{loan.reason || '-'}</td>
                  <td><StatusBadge status={loan.status} /></td>
                  <td>
                    {loan.status === 'pending' && (isAdmin || isManager) ? (
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleApprove(loan.id)} className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors" title="Approve">
                          <CheckCircle className="w-5 h-5" />
                        </button>
                        <button onClick={() => openRejectModal(loan.id)} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Reject">
                          <XCircle className="w-5 h-5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {filteredLoans.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-12">
                  <DollarSign className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">No loan requests found</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Request Loan Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Request Loan</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Loan Type *</label>
                  <select required value={formData.loan_type} onChange={(e) => setFormData({ ...formData, loan_type: e.target.value })} className="input w-full">
                    <option value="personal">Personal</option>
                    <option value="advance">Salary Advance</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount ($) *</label>
                  <input type="number" required min="1" step="0.01" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} className="input w-full" placeholder="0.00" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Repayment Plan</label>
                  <select value={formData.repayment_plan} onChange={(e) => setFormData({ ...formData, repayment_plan: e.target.value })} className="input w-full">
                    <option value="monthly">Monthly</option>
                    <option value="bi-weekly">Bi-Weekly</option>
                    <option value="weekly">Weekly</option>
                    <option value="lump-sum">Lump Sum</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Total Installments</label>
                  <input type="number" min="1" value={formData.total_installments} onChange={(e) => setFormData({ ...formData, total_installments: e.target.value })} className="input w-full" placeholder="e.g., 12" />
                </div>
              </div>
              {formData.amount && formData.total_installments && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Installment Amount: <strong>${(parseFloat(formData.amount) / parseInt(formData.total_installments)).toFixed(2)}</strong> per {formData.repayment_plan}
                  </p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason *</label>
                <textarea required value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} className="input w-full" rows={3} placeholder="Explain why you need this loan..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Additional Notes</label>
                <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="input w-full" rows={2} placeholder="Any additional information..." />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={closeModal} className="btn btn-ghost">Cancel</button>
                <button type="submit" className="btn btn-primary">
                  <Send className="w-4 h-4 mr-2" />
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Reject Loan Request</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason for Rejection</label>
                <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="input w-full" rows={3} placeholder="Provide a reason..." />
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowRejectModal(false)} className="btn btn-ghost">Cancel</button>
                <button onClick={handleReject} className="btn bg-red-600 hover:bg-red-700 text-white">
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LoansPage;
