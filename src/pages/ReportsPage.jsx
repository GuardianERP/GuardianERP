/**
 * Guardian Desktop ERP - Reports Page
 * Analytics dashboard with charts and data visualization
 */

import React, { useState, useEffect } from 'react';
import { 
  BarChart2, PieChart, TrendingUp, TrendingDown, Calendar, Download,
  DollarSign, Users, Clock, FileText, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, 
  PieChart as RePieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { useAuth } from '../store/AuthContext';
import { employeesAPI, expensesAPI, revenueAPI, tasksAPI, attendanceAPI } from '../services/api';
import toast from 'react-hot-toast';

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

function ReportsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('month');
  const [data, setData] = useState({
    employees: [],
    expenses: [],
    revenue: [],
    tasks: []
  });

  useEffect(() => {
    fetchAllData();
  }, [dateRange]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [employees, expenses, revenue, tasks] = await Promise.all([
        employeesAPI.getAll(),
        expensesAPI.getAll(),
        revenueAPI.getAll(),
        tasksAPI.getAll()
      ]);
      setData({ employees, expenses, revenue, tasks });
    } catch (error) {
      toast.error('Failed to fetch report data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate summary statistics
  const totalRevenue = data.revenue.reduce((sum, r) => sum + r.amount, 0);
  const totalExpenses = data.expenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0;
  const totalEmployees = data.employees.length;
  const completedTasks = data.tasks.filter(t => t.status === 'completed').length;
  const taskCompletionRate = data.tasks.length > 0 
    ? ((completedTasks / data.tasks.length) * 100).toFixed(1) 
    : 0;

  // Prepare monthly revenue/expense chart data
  const getMonthlyData = () => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthName = date.toLocaleDateString('en-US', { month: 'short' });
      const monthNum = date.getMonth();
      const year = date.getFullYear();
      
      const monthRevenue = data.revenue
        .filter(r => {
          const d = new Date(r.date);
          return d.getMonth() === monthNum && d.getFullYear() === year;
        })
        .reduce((sum, r) => sum + r.amount, 0);

      const monthExpenses = data.expenses
        .filter(e => {
          const d = new Date(e.date);
          return d.getMonth() === monthNum && d.getFullYear() === year;
        })
        .reduce((sum, e) => sum + e.amount, 0);

      months.push({
        name: monthName,
        revenue: monthRevenue,
        expenses: monthExpenses,
        profit: monthRevenue - monthExpenses
      });
    }
    return months;
  };

  // Expense by category
  const getExpensesByCategory = () => {
    const categories = {};
    data.expenses.forEach(e => {
      categories[e.category] = (categories[e.category] || 0) + e.amount;
    });
    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  };

  // Revenue by source
  const getRevenueBySource = () => {
    const sources = {};
    data.revenue.forEach(r => {
      sources[r.source] = (sources[r.source] || 0) + r.amount;
    });
    return Object.entries(sources).map(([name, value]) => ({ name, value }));
  };

  // Task status distribution
  const getTaskDistribution = () => {
    const statuses = { pending: 0, in_progress: 0, completed: 0, cancelled: 0 };
    data.tasks.forEach(t => {
      statuses[t.status] = (statuses[t.status] || 0) + 1;
    });
    return [
      { name: 'Pending', value: statuses.pending },
      { name: 'In Progress', value: statuses.in_progress },
      { name: 'Completed', value: statuses.completed },
      { name: 'Cancelled', value: statuses.cancelled }
    ].filter(s => s.value > 0);
  };

  // Department distribution
  const getDepartmentDistribution = () => {
    const departments = {};
    data.employees.forEach(e => {
      departments[e.department || 'Unassigned'] = (departments[e.department || 'Unassigned'] || 0) + 1;
    });
    return Object.entries(departments).map(([name, value]) => ({ name, value }));
  };

  const monthlyData = getMonthlyData();
  const expensesByCategory = getExpensesByCategory();
  const revenueBySource = getRevenueBySource();
  const taskDistribution = getTaskDistribution();
  const departmentDistribution = getDepartmentDistribution();

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports & Analytics</h1>
          <p className="text-gray-500">Comprehensive overview of your business performance</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="input"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
          <button className="btn btn-ghost">
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <span className="flex items-center gap-1 text-sm text-green-600">
              <ArrowUpRight className="w-4 h-4" />
              +12.5%
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            ${totalRevenue.toLocaleString()}
          </p>
          <p className="text-sm text-gray-500">Total Revenue</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <span className="flex items-center gap-1 text-sm text-red-600">
              <ArrowDownRight className="w-4 h-4" />
              -3.2%
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            ${totalExpenses.toLocaleString()}
          </p>
          <p className="text-sm text-gray-500">Total Expenses</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className={`w-10 h-10 ${netProfit >= 0 ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-orange-100 dark:bg-orange-900/30'} rounded-lg flex items-center justify-center`}>
              <DollarSign className={`w-5 h-5 ${netProfit >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`} />
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${netProfit >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {profitMargin}% margin
            </span>
          </div>
          <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ${Math.abs(netProfit).toLocaleString()}
          </p>
          <p className="text-sm text-gray-500">{netProfit >= 0 ? 'Net Profit' : 'Net Loss'}</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
              {taskCompletionRate}%
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {completedTasks}/{data.tasks.length}
          </p>
          <p className="text-sm text-gray-500">Tasks Completed</p>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue vs Expenses Chart */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Revenue vs Expenses</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                <XAxis dataKey="name" stroke="#6B7280" />
                <YAxis stroke="#6B7280" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--tooltip-bg, #1F2937)', 
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value) => [`$${value.toLocaleString()}`, '']}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stackId="1"
                  stroke="#10B981" 
                  fill="#10B98133" 
                  name="Revenue"
                />
                <Area 
                  type="monotone" 
                  dataKey="expenses" 
                  stackId="2"
                  stroke="#EF4444" 
                  fill="#EF444433"
                  name="Expenses" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Profit Trend */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Profit Trend</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                <XAxis dataKey="name" stroke="#6B7280" />
                <YAxis stroke="#6B7280" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--tooltip-bg, #1F2937)', 
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value) => [`$${value.toLocaleString()}`, 'Profit']}
                />
                <Bar 
                  dataKey="profit" 
                  fill="#4F46E5"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Expense Distribution */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Expenses by Category</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={expensesByCategory}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {expensesByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, '']} />
              </RePieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Distribution */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Revenue by Source</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={revenueBySource}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {revenueBySource.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, '']} />
              </RePieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Task Distribution */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Task Status</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={taskDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {taskDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </RePieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Employee Stats */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Employee Distribution by Department</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={departmentDistribution} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
              <XAxis type="number" stroke="#6B7280" />
              <YAxis dataKey="name" type="category" stroke="#6B7280" width={100} />
              <Tooltip />
              <Bar dataKey="value" fill="#4F46E5" radius={[0, 4, 4, 0]} name="Employees" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default ReportsPage;
