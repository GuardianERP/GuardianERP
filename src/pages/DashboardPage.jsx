/**
 * Guardian Desktop ERP - Dashboard Page
 * Main overview with stats, charts, and quick actions
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import {
  Users,
  Clock,
  CheckSquare,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  AlertCircle,
  ArrowRight,
  Activity,
  RefreshCw,
  Wallet,
} from 'lucide-react';
import { reportsAPI } from '../services/api';
import { StatsSkeleton, InlineSpinner } from '../components/common/LoadingSpinner';

// Stat Card Component
function StatCard({ title, value, change, changeType, icon: Icon, color, onClick }) {
  // Auto-size font based on value length to prevent overflow
  const getValueFontSize = (val) => {
    const len = String(val).length;
    if (len <= 5) return 'text-3xl';
    if (len <= 8) return 'text-2xl';
    if (len <= 12) return 'text-xl';
    if (len <= 16) return 'text-lg';
    return 'text-base';
  };
  
  return (
    <div 
      className="card p-6 hover:shadow-lg transition-all cursor-pointer overflow-hidden"
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1 pr-2">
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p className={`${getValueFontSize(value)} font-bold text-gray-900 dark:text-white mt-1 truncate`}>
            {value}
          </p>
          {change && (
            <div className={`flex items-center gap-1 mt-2 text-sm ${
              changeType === 'positive' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}>
              {changeType === 'positive' ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span>{change}</span>
            </div>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}

// Quick Action Card
function QuickAction({ title, description, icon: Icon, onClick, color }) {
  return (
    <button 
      className="card p-4 text-left hover:shadow-lg transition-all w-full group"
      onClick={onClick}
    >
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 dark:text-white">{title}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{description}</p>
        </div>
        <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
      </div>
    </button>
  );
}

// Activity Item
function ActivityItem({ title, description, time, type }) {
  const colors = {
    task: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    attendance: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    leave: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
    expense: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  };

  return (
    <div className="flex items-start gap-3 py-3">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${colors[type]}`}>
        <Activity className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white">{title}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
      </div>
      <span className="text-xs text-gray-400 flex-shrink-0">{time}</span>
    </div>
  );
}

function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    employees: { total: 0, active: 0, onLeave: 0 },
    tasks: { total: 0, completed: 0, inProgress: 0, overdue: 0 },
    expenses: { total: 0, pending: 0, approved: 0 },
    revenue: { total: 0, paid: 0, pending: 0 },
  });
  const [salaryData, setSalaryData] = useState({ total: 0, employeeCount: 0, month: '' });

  // Check if user is admin
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      // Fetch overview data
      const overview = await reportsAPI.getOverview();
      
      // Merge with default stats to ensure all properties exist
      setStats({
        employees: { total: 0, active: 0, onLeave: 0, ...overview?.employees },
        tasks: { total: 0, completed: 0, inProgress: 0, overdue: 0, pending: 0, ...overview?.tasks },
        expenses: { total: 0, pending: 0, approved: 0, ...overview?.expenses },
        revenue: { total: 0, paid: 0, pending: 0, ...overview?.revenue },
      });
      
      // Fetch salary data for admins
      if (user?.role === 'admin' || user?.role === 'super_admin') {
        try {
          const salary = await reportsAPI.getNextMonthSalaries();
          setSalaryData(salary);
        } catch (salaryError) {
          console.log('Could not fetch salary data:', salaryError.message);
        }
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setError(error.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchDashboardData(true);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Sample recent activities
  const recentActivities = [
    { title: 'Task completed', description: 'Project documentation finished', time: '2m ago', type: 'task' },
    { title: 'New employee', description: 'Ahmed Khan joined the team', time: '1h ago', type: 'attendance' },
    { title: 'Leave approved', description: 'Fatima Ali - Annual leave', time: '3h ago', type: 'leave' },
    { title: 'Expense submitted', description: 'Travel expense - PKR 5,000', time: '5h ago', type: 'expense' },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="card bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white animate-pulse">
          <div className="h-8 bg-blue-400 rounded w-1/3 mb-2" />
          <div className="h-4 bg-blue-400 rounded w-1/2" />
        </div>
        <StatsSkeleton count={4} />
        <div className="flex items-center justify-center py-8">
          <div className="flex flex-col items-center gap-3">
            <InlineSpinner size="lg" />
            <p className="text-gray-500 dark:text-gray-400">Loading dashboard data from cloud...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="card bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-red-800 dark:text-red-200">Failed to Load Dashboard</h3>
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
            <button
              onClick={handleRefresh}
              className="btn-primary flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Banner */}
      <div className="card bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">
              Welcome back, {user?.firstName || 'User'}! 👋
            </h2>
            <p className="text-blue-100 mt-1">
              Here's what's happening with your business today.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="bg-white/20 hover:bg-white/30 rounded-lg p-2 transition-colors disabled:opacity-50"
              title="Refresh data"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <div className="hidden md:block">
              <div className="text-right">
                <p className="text-4xl font-bold">{new Date().getDate()}</p>
                <p className="text-blue-200 text-sm">
                  {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid - Different view for admins vs employees */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isAdmin ? (
          // Admin sees all financial stats
          <>
            <StatCard
              title="Total Employees"
              value={stats.employees.total}
              change={`${stats.employees.active} active`}
              changeType="positive"
              icon={Users}
              color="bg-blue-600"
              onClick={() => navigate('/employees')}
            />
            <StatCard
              title="Tasks"
              value={stats.tasks.total}
              change={`${stats.tasks.overdue} overdue`}
              changeType={stats.tasks.overdue > 0 ? 'negative' : 'positive'}
              icon={CheckSquare}
              color="bg-green-600"
              onClick={() => navigate('/tasks')}
            />
            <StatCard
              title="Pending Expenses"
              value={formatCurrency(stats.expenses.pending)}
              change={`${stats.expenses.count || 0} requests`}
              changeType="positive"
              icon={Clock}
              color="bg-yellow-500"
              onClick={() => navigate('/expenses')}
            />
            <StatCard
              title="Revenue (MTD)"
              value={formatCurrency(stats.revenue.total)}
              change={`${formatCurrency(stats.revenue.paid)} received`}
              changeType="positive"
              icon={DollarSign}
              color="bg-purple-600"
              onClick={() => navigate('/revenue')}
            />
            <StatCard
              title={`Salaries (${salaryData.month?.split(' ')[0] || 'Next Month'})`}
              value={formatCurrency(salaryData.total)}
              change={`${salaryData.employeeCount} employees`}
              changeType="positive"
              icon={Wallet}
              color="bg-orange-600"
              onClick={() => navigate('/employees')}
            />
          </>
        ) : (
          // Employees see their own stats only
          <>
            <StatCard
              title="My Tasks"
              value={stats.tasks.total}
              change={`${stats.tasks.inProgress} in progress`}
              changeType="positive"
              icon={CheckSquare}
              color="bg-blue-600"
              onClick={() => navigate('/tasks')}
            />
            <StatCard
              title="Attendance"
              value={stats.attendance?.presentDays || 0}
              change="days present this month"
              changeType="positive"
              icon={Clock}
              color="bg-green-600"
              onClick={() => navigate('/attendance')}
            />
            <StatCard
              title="Pending Leaves"
              value={stats.leaves?.pending || 0}
              change={`${stats.leaves?.remaining || 0} days remaining`}
              changeType="positive"
              icon={Calendar}
              color="bg-yellow-500"
              onClick={() => navigate('/leaves')}
            />
            <StatCard
              title="Notifications"
              value={stats.notifications?.unread || 0}
              change="unread messages"
              changeType={stats.notifications?.unread > 0 ? 'negative' : 'positive'}
              icon={AlertCircle}
              color="bg-purple-600"
              onClick={() => navigate('/notifications')}
            />
          </>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold text-gray-900 dark:text-white">Quick Actions</h3>
            </div>
            <div className="card-body grid grid-cols-1 md:grid-cols-2 gap-4">
              {isAdmin && (
                <QuickAction
                  title="Add Employee"
                  description="Register new team member"
                  icon={Users}
                  color="bg-blue-600"
                  onClick={() => navigate('/employees')}
                />
              )}
              <QuickAction
                title="Create Task"
                description="Assign work to team"
                icon={CheckSquare}
                color="bg-green-600"
                onClick={() => navigate('/tasks')}
              />
              {isAdmin ? (
                <QuickAction
                  title="Submit Expense"
                  description="Log business expense"
                  icon={DollarSign}
                  color="bg-yellow-500"
                  onClick={() => navigate('/expenses')}
                />
              ) : (
                <QuickAction
                  title="My Profile"
                  description="View your information"
                  icon={Users}
                  color="bg-yellow-500"
                  onClick={() => navigate('/my-profile')}
                />
              )}
              <QuickAction
                title="Request Leave"
                description="Apply for time off"
                icon={Calendar}
                color="bg-purple-600"
                onClick={() => navigate('/leaves')}
              />
            </div>
          </div>

          {/* Tasks Overview */}
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white">Tasks Overview</h3>
              <button 
                onClick={() => navigate('/tasks')}
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                View all
              </button>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {stats.tasks.total - stats.tasks.completed - stats.tasks.inProgress}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">To Do</p>
                </div>
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {stats.tasks.inProgress}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">In Progress</p>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {stats.tasks.completed}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
                </div>
              </div>
              
              {stats.tasks.overdue > 0 && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <span className="text-sm text-red-700 dark:text-red-400">
                    {stats.tasks.overdue} tasks are overdue and need attention
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
          </div>
          <div className="card-body">
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {recentActivities.map((activity, index) => (
                <ActivityItem key={index} {...activity} />
              ))}
            </div>
            <button 
              onClick={() => navigate('/notifications')}
              className="w-full mt-4 py-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
            >
              View all activity
            </button>
          </div>
        </div>
      </div>

      {/* Employee & Expense Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Employee Status */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-white">Employee Status</h3>
            <button 
              onClick={() => navigate('/employees')}
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              View all
            </button>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Active</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {stats.employees.active}
                  </span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{ width: `${(stats.employees.active / stats.employees.total) * 100 || 0}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">On Leave</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {stats.employees.onLeave}
                  </span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-yellow-500 rounded-full transition-all"
                    style={{ width: `${(stats.employees.onLeave / stats.employees.total) * 100 || 0}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Resigned</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {stats.employees.resigned || 0}
                  </span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-red-500 rounded-full transition-all"
                    style={{ width: `${((stats.employees.resigned || 0) / stats.employees.total) * 100 || 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Expense Summary */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-white">Expense Summary</h3>
            <button 
              onClick={() => navigate('/expenses')}
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              View all
            </button>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                <p className="text-sm text-gray-600 dark:text-gray-400">Approved</p>
                <p className="text-xl font-bold text-green-600 dark:text-green-400 mt-1">
                  {formatCurrency(stats.expenses.approved)}
                </p>
              </div>
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
                <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
                <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
                  {formatCurrency(stats.expenses.pending)}
                </p>
              </div>
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
                <p className="text-sm text-gray-600 dark:text-gray-400">Rejected</p>
                <p className="text-xl font-bold text-red-600 dark:text-red-400 mt-1">
                  {formatCurrency(stats.expenses.rejected || 0)}
                </p>
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
                <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                  {formatCurrency(stats.expenses.total)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
