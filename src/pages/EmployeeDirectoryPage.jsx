/**
 * Guardian Desktop ERP - Employee Directory Page
 * Beautiful employee directory with seniority sorting, search, and filtering
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, Users, Building2, MapPin, Mail, Calendar,
  ChevronDown, ChevronRight, Award, Clock, Grid, List, SortAsc, SortDesc
} from 'lucide-react';
import { employeesAPI } from '../services/api';
import { getDepartmentLabel, getPositionLabel, DEPARTMENT_LIST } from '../data/organizationConfig';
import toast from 'react-hot-toast';

function EmployeeDirectoryPage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [sortBy, setSortBy] = useState('seniority'); // 'seniority', 'name', 'department'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc'
  const [viewMode, setViewMode] = useState('grid'); // 'grid', 'list', 'department'
  const [expandedDepts, setExpandedDepts] = useState(new Set());

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const data = await employeesAPI.getAll();
      setEmployees(data || []);
      const depts = new Set((data || []).map(e => e.department).filter(Boolean));
      setExpandedDepts(depts);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
      toast.error('Failed to load directory');
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const getSeniority = (joiningDate) => {
    if (!joiningDate) return 0;
    const joined = new Date(joiningDate);
    const today = new Date();
    return Math.floor((today - joined) / (1000 * 60 * 60 * 24));
  };

  const formatSeniority = (days) => {
    if (days < 30) return `${days} days`;
    if (days < 365) return `${Math.floor(days / 30)} months`;
    const years = Math.floor(days / 365);
    const months = Math.floor((days % 365) / 30);
    if (months === 0) return `${years}y`;
    return `${years}y ${months}m`;
  };

  const processedEmployees = useMemo(() => {
    let result = employees.filter(emp => {
      const name = `${emp.first_name || ''} ${emp.last_name || ''}`.trim().toLowerCase();
      const dept = (emp.department || '').toLowerCase();
      const pos = (emp.position || '').toLowerCase();
      const email = (emp.email || '').toLowerCase();
      const city = (emp.city || '').toLowerCase();
      const searchLower = search.toLowerCase();

      const matchesSearch = !search || 
        name.includes(searchLower) || dept.includes(searchLower) || 
        pos.includes(searchLower) || email.includes(searchLower) || city.includes(searchLower);
      const matchesDept = filterDepartment === 'all' || emp.department === filterDepartment;
      return matchesSearch && matchesDept;
    });

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'seniority':
          comparison = getSeniority(b.joining_date) - getSeniority(a.joining_date);
          break;
        case 'name':
          comparison = `${a.first_name || ''} ${a.last_name || ''}`.localeCompare(`${b.first_name || ''} ${b.last_name || ''}`);
          break;
        case 'department':
          comparison = (getDepartmentLabel(a.department) || a.department || '').localeCompare(getDepartmentLabel(b.department) || b.department || '');
          break;
        default: comparison = 0;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [employees, search, filterDepartment, sortBy, sortOrder]);

  const employeesByDepartment = useMemo(() => {
    return processedEmployees.reduce((groups, emp) => {
      const dept = emp.department || 'unassigned';
      if (!groups[dept]) groups[dept] = [];
      groups[dept].push(emp);
      return groups;
    }, {});
  }, [processedEmployees]);

  const sortedDepartments = Object.keys(employeesByDepartment).sort((a, b) => {
    if (a === 'unassigned') return 1;
    if (b === 'unassigned') return -1;
    return (getDepartmentLabel(a) || a).localeCompare(getDepartmentLabel(b) || b);
  });

  const toggleDepartment = (dept) => {
    setExpandedDepts(prev => {
      const next = new Set(prev);
      if (next.has(dept)) next.delete(dept);
      else next.add(dept);
      return next;
    });
  };

  const getSeniorityBadge = (days) => {
    if (days >= 1825) return { bg: 'bg-gradient-to-r from-amber-500 to-yellow-400', text: 'text-white', icon: '🏆' };
    if (days >= 1095) return { bg: 'bg-gradient-to-r from-purple-500 to-indigo-500', text: 'text-white', icon: '⭐' };
    if (days >= 730) return { bg: 'bg-gradient-to-r from-blue-500 to-cyan-500', text: 'text-white', icon: '💎' };
    if (days >= 365) return { bg: 'bg-gradient-to-r from-green-500 to-emerald-500', text: 'text-white', icon: '🌟' };
    if (days >= 180) return { bg: 'bg-teal-200 dark:bg-teal-900/40', text: 'text-teal-800 dark:text-teal-300', icon: '✨' };
    if (days >= 90) return { bg: 'bg-gray-200 dark:bg-gray-700', text: 'text-gray-700 dark:text-gray-300', icon: '' };
    return { bg: 'bg-blue-200 dark:bg-blue-900/30', text: 'text-blue-800 dark:text-blue-300', icon: '🆕' };
  };

  // Light background colors for cards based on seniority - vibrant colors for light mode
  const getSeniorityCardBg = (days) => {
    if (days >= 1825) return 'bg-gradient-to-br from-amber-100 to-yellow-100 dark:from-amber-900/20 dark:to-yellow-900/20 border-amber-300 dark:border-amber-800';
    if (days >= 1095) return 'bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/20 dark:to-indigo-900/20 border-purple-300 dark:border-purple-800';
    if (days >= 730) return 'bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-300 dark:border-blue-800';
    if (days >= 365) return 'bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 border-green-300 dark:border-green-800';
    if (days >= 180) return 'bg-gradient-to-br from-teal-100 to-cyan-100 dark:from-teal-900/20 dark:to-cyan-900/20 border-teal-300 dark:border-teal-800';
    if (days >= 90) return 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700';
    return 'bg-gradient-to-br from-sky-100 to-blue-100 dark:from-sky-900/20 dark:to-blue-900/20 border-sky-300 dark:border-sky-800';
  };

  const departmentColors = {
    management: 'from-violet-600 to-purple-700',
    operations: 'from-emerald-500 to-teal-600',
    marketing: 'from-pink-500 to-rose-600',
    technology: 'from-cyan-500 to-blue-600',
    hr: 'from-orange-500 to-amber-600',
    finance: 'from-lime-500 to-green-600',
    unassigned: 'from-slate-400 to-slate-600',
  };

  const avatarGradients = [
    'from-violet-500 to-purple-600',
    'from-pink-500 to-rose-600',
    'from-cyan-500 to-blue-600',
    'from-emerald-500 to-teal-600',
    'from-orange-500 to-amber-600',
    'from-fuchsia-500 to-pink-600',
    'from-indigo-500 to-violet-600',
    'from-teal-500 to-cyan-600',
  ];

  const getAvatarGradient = (emp) => {
    const hash = (emp.first_name?.charCodeAt(0) || 0) + (emp.last_name?.charCodeAt(0) || 0);
    return avatarGradients[hash % avatarGradients.length];
  };

  const EmployeeCard = ({ emp }) => {
    const seniority = getSeniority(emp.joining_date);
    const badge = getSeniorityBadge(seniority);
    const gradient = getAvatarGradient(emp);
    const cardBg = getSeniorityCardBg(seniority);
    
    return (
      <div className={`group relative rounded-2xl border p-5 hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300 ${cardBg}`}>
        {seniority >= 365 && (
          <div className="absolute -top-2 -right-2 z-10">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full shadow-md ${badge.bg} ${badge.text}`}>
              {badge.icon} {formatSeniority(seniority)}
            </span>
          </div>
        )}
        
        <div className="flex items-start gap-4">
          <div className="relative flex-shrink-0">
            {emp.avatar_url ? (
              <img src={emp.avatar_url} alt="" className="w-14 h-14 rounded-xl object-cover ring-2 ring-white/60 dark:ring-gray-700/50 shadow-lg" />
            ) : (
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-lg font-bold shadow-lg ring-2 ring-white/20`}>
                {(emp.first_name?.[0] || '')}{(emp.last_name?.[0] || '')}
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
              {emp.first_name} {emp.last_name}
            </h3>
            <p className="text-sm text-blue-600 dark:text-blue-400 font-medium truncate">
              {getPositionLabel(emp.designation) || emp.designation || 'No Position'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {getDepartmentLabel(emp.department) || 'Unassigned'}
            </p>
          </div>
        </div>
        
        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-2">
          {emp.email && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span className="truncate">{emp.email}</span>
            </div>
          )}
          {(emp.city || emp.country) && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span className="truncate">{[emp.city, emp.country].filter(Boolean).join(', ')}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <span className={seniority >= 365 ? 'text-green-600 dark:text-green-400 font-medium' : 'text-gray-600 dark:text-gray-400'}>
              {formatSeniority(seniority)} tenure
            </span>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-xs font-medium">Total</p>
              <p className="text-2xl font-bold">{employees.length}</p>
            </div>
            <Users className="w-8 h-8 text-blue-200" />
          </div>
        </div>
        <div className="card p-4 bg-gradient-to-br from-emerald-500 to-green-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-xs font-medium">Departments</p>
              <p className="text-2xl font-bold">{new Set(employees.map(e => e.department).filter(Boolean)).size}</p>
            </div>
            <Building2 className="w-8 h-8 text-emerald-200" />
          </div>
        </div>
        <div className="card p-4 bg-gradient-to-br from-amber-500 to-orange-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-100 text-xs font-medium">Avg Tenure</p>
              <p className="text-2xl font-bold">
                {formatSeniority(Math.round(employees.reduce((sum, e) => sum + getSeniority(e.joining_date), 0) / (employees.length || 1)))}
              </p>
            </div>
            <Award className="w-8 h-8 text-amber-200" />
          </div>
        </div>
        <div className="card p-4 bg-gradient-to-br from-purple-500 to-indigo-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-xs font-medium">Countries</p>
              <p className="text-2xl font-bold">{new Set(employees.map(e => e.country).filter(Boolean)).size}</p>
            </div>
            <MapPin className="w-8 h-8 text-purple-200" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search employees..." value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-10 w-full sm:w-56" />
            </div>
            <select value={filterDepartment} onChange={(e) => setFilterDepartment(e.target.value)} className="input">
              <option value="all">All Departments</option>
              {DEPARTMENT_LIST.map(dept => (
                <option key={dept.value} value={dept.value}>{dept.label}</option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="input">
                <option value="seniority">By Seniority</option>
                <option value="name">By Name</option>
                <option value="department">By Department</option>
              </select>
              <button onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')} className="btn btn-ghost p-2">
                {sortOrder === 'desc' ? <SortDesc className="w-5 h-5" /> : <SortAsc className="w-5 h-5" />}
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button onClick={() => setViewMode('grid')} className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-gray-700 shadow-sm' : ''}`}>
              <Grid className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode('list')} className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm' : ''}`}>
              <List className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode('department')} className={`p-2 rounded-md transition-colors ${viewMode === 'department' ? 'bg-white dark:bg-gray-700 shadow-sm' : ''}`}>
              <Building2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-3">
          Showing {processedEmployees.length} of {employees.length} employees
          {sortBy === 'seniority' && <span className="text-blue-600 dark:text-blue-400 ml-1">(by tenure {sortOrder === 'desc' ? '↓' : '↑'})</span>}
        </p>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {processedEmployees.map(emp => <EmployeeCard key={emp.id} emp={emp} />)}
          {processedEmployees.length === 0 && (
            <div className="col-span-full text-center py-16">
              <Users className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No employees found</p>
            </div>
          )}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Employee</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Department</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Position</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Tenure</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Email</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {processedEmployees.map(emp => {
                  const seniority = getSeniority(emp.joining_date);
                  const badge = getSeniorityBadge(seniority);
                  return (
                    <tr key={emp.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {emp.avatar_url ? (
                            <img src={emp.avatar_url} alt="" className="w-9 h-9 rounded-lg object-cover shadow-sm" />
                          ) : (
                            <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${getAvatarGradient(emp)} flex items-center justify-center text-white text-sm font-medium shadow-sm`}>
                              {(emp.first_name?.[0] || '')}{(emp.last_name?.[0] || '')}
                            </div>
                          )}
                          <span className="font-medium text-gray-900 dark:text-white">{emp.first_name} {emp.last_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{getDepartmentLabel(emp.department) || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{getPositionLabel(emp.designation) || emp.designation || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${badge.bg} ${badge.text}`}>
                          {badge.icon} {formatSeniority(seniority)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{[emp.city, emp.country].filter(Boolean).join(', ') || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{emp.email || '-'}</td>
                    </tr>
                  );
                })}
                {processedEmployees.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-12 text-gray-500">No employees found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Department View */}
      {viewMode === 'department' && (
        <div className="space-y-4">
          {sortedDepartments.map(dept => {
            const deptEmployees = employeesByDepartment[dept];
            const isExpanded = expandedDepts.has(dept);
            const gradient = departmentColors[dept] || 'from-gray-500 to-gray-700';

            return (
              <div key={dept} className="card overflow-hidden">
                <button onClick={() => toggleDepartment(dept)} className={`w-full p-4 flex items-center justify-between bg-gradient-to-r ${gradient} text-white`}>
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5" />
                    <span className="font-bold text-lg">{getDepartmentLabel(dept) || dept}</span>
                    <span className="bg-white/20 px-3 py-1 rounded-full text-sm">{deptEmployees.length}</span>
                  </div>
                  {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </button>
                {isExpanded && (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-800/50">
                    {deptEmployees.map(emp => <EmployeeCard key={emp.id} emp={emp} />)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default EmployeeDirectoryPage;
