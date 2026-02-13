/**
 * Guardian Desktop ERP - Employee Directory Page
 * Public employee directory visible by all users, grouped by department
 * Shows: Name, Department, Position, Joining Date, Email, City, Province, Country
 */

import React, { useState, useEffect } from 'react';
import { 
  Search, Users, Building2, MapPin, Mail, Calendar,
  ChevronDown, ChevronRight, User
} from 'lucide-react';
import { employeesAPI } from '../services/api';
import { getDepartmentLabel, getPositionLabel, DEPARTMENT_LIST } from '../data/organizationConfig';
import toast from 'react-hot-toast';

function EmployeeDirectoryPage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [expandedDepts, setExpandedDepts] = useState(new Set());
  const [viewMode, setViewMode] = useState('department'); // 'department' or 'list'

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const data = await employeesAPI.getAll();
      setEmployees(data || []);
      // Expand all departments by default
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

  const toggleDepartment = (dept) => {
    setExpandedDepts(prev => {
      const next = new Set(prev);
      if (next.has(dept)) next.delete(dept);
      else next.add(dept);
      return next;
    });
  };

  const filteredEmployees = employees.filter(emp => {
    const name = `${emp.first_name || ''} ${emp.last_name || ''}`.trim().toLowerCase();
    const dept = (emp.department || '').toLowerCase();
    const pos = (emp.position || '').toLowerCase();
    const email = (emp.email || '').toLowerCase();
    const city = (emp.city || '').toLowerCase();
    const searchLower = search.toLowerCase();

    const matchesSearch = name.includes(searchLower) ||
                          dept.includes(searchLower) ||
                          pos.includes(searchLower) ||
                          email.includes(searchLower) ||
                          city.includes(searchLower);
    const matchesDept = filterDepartment === 'all' || emp.department === filterDepartment;
    return matchesSearch && matchesDept;
  });

  // Group employees by department
  const employeesByDepartment = filteredEmployees.reduce((groups, emp) => {
    const dept = emp.department || 'unassigned';
    if (!groups[dept]) groups[dept] = [];
    groups[dept].push(emp);
    return groups;
  }, {});

  // Sort departments
  const sortedDepartments = Object.keys(employeesByDepartment).sort((a, b) => {
    if (a === 'unassigned') return 1;
    if (b === 'unassigned') return -1;
    return (getDepartmentLabel(a) || a).localeCompare(getDepartmentLabel(b) || b);
  });

  const departmentColors = {
    management: 'from-blue-500 to-blue-700',
    operations: 'from-green-500 to-green-700',
    marketing: 'from-purple-500 to-purple-700',
    technology: 'from-cyan-500 to-cyan-700',
    hr: 'from-orange-500 to-orange-700',
    finance: 'from-yellow-500 to-yellow-700',
    unassigned: 'from-gray-400 to-gray-600',
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
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{employees.length}</p>
            <p className="text-sm text-gray-500">Total Employees</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
            <Building2 className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{sortedDepartments.length}</p>
            <p className="text-sm text-gray-500">Departments</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
            <MapPin className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {new Set(employees.map(e => e.country).filter(Boolean)).size}
            </p>
            <p className="text-sm text-gray-500">Countries</p>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="card p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search by name, email, city..." value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-10 w-full sm:w-72" />
            </div>
            <select value={filterDepartment} onChange={(e) => setFilterDepartment(e.target.value)} className="input">
              <option value="all">All Departments</option>
              {DEPARTMENT_LIST.map(dept => (
                <option key={dept.value} value={dept.value}>{dept.label}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setViewMode('department')} className={`btn btn-sm ${viewMode === 'department' ? 'btn-primary' : 'btn-ghost'}`}>
              <Building2 className="w-4 h-4 mr-1" /> By Department
            </button>
            <button onClick={() => setViewMode('list')} className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-ghost'}`}>
              <Users className="w-4 h-4 mr-1" /> List View
            </button>
          </div>
        </div>
      </div>

      {/* Department View */}
      {viewMode === 'department' ? (
        <div className="space-y-4">
          {sortedDepartments.map(dept => {
            const deptEmployees = employeesByDepartment[dept];
            const isExpanded = expandedDepts.has(dept);
            const gradient = departmentColors[dept] || 'from-gray-500 to-gray-700';

            return (
              <div key={dept} className="card overflow-hidden">
                <button
                  onClick={() => toggleDepartment(dept)}
                  className={`w-full p-4 flex items-center justify-between bg-gradient-to-r ${gradient} text-white`}
                >
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5" />
                    <span className="font-bold text-lg">{getDepartmentLabel(dept) || dept}</span>
                    <span className="bg-white/20 px-2 py-0.5 rounded-full text-sm">{deptEmployees.length} members</span>
                  </div>
                  {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </button>
                {isExpanded && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                    {deptEmployees.map(emp => (
                      <div key={emp.id} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3 mb-3">
                          {emp.profile_picture ? (
                            <img src={emp.profile_picture} alt="" className="w-12 h-12 rounded-full object-cover" />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-guardian-400 to-guardian-600 flex items-center justify-center text-white font-bold">
                              {(emp.first_name?.[0] || '')}{(emp.last_name?.[0] || '')}
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {emp.first_name} {emp.last_name}
                            </p>
                            <p className="text-sm text-gray-500">{getPositionLabel(emp.position) || emp.position || '-'}</p>
                          </div>
                        </div>
                        <div className="space-y-1.5 text-sm">
                          {emp.email && (
                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                              <Mail className="w-3.5 h-3.5" />
                              <span className="truncate">{emp.email}</span>
                            </div>
                          )}
                          {(emp.city || emp.province || emp.country) && (
                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                              <MapPin className="w-3.5 h-3.5" />
                              <span>{[emp.city, emp.province, emp.country].filter(Boolean).join(', ')}</span>
                            </div>
                          )}
                          {emp.joining_date && (
                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>Joined {new Date(emp.joining_date).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="card overflow-hidden">
          <table className="table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Position</th>
                <th>Email</th>
                <th>Location</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map(emp => (
                <tr key={emp.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      {emp.profile_picture ? (
                        <img src={emp.profile_picture} alt="" className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-guardian-400 to-guardian-600 flex items-center justify-center text-white font-medium text-sm">
                          {(emp.first_name?.[0] || '')}{(emp.last_name?.[0] || '')}
                        </div>
                      )}
                      <span className="font-medium text-gray-900 dark:text-white">{emp.first_name} {emp.last_name}</span>
                    </div>
                  </td>
                  <td>{getDepartmentLabel(emp.department) || '-'}</td>
                  <td>{getPositionLabel(emp.position) || emp.position || '-'}</td>
                  <td className="text-sm">{emp.email || '-'}</td>
                  <td className="text-sm">{[emp.city, emp.country].filter(Boolean).join(', ') || '-'}</td>
                  <td className="text-sm">{emp.joining_date ? new Date(emp.joining_date).toLocaleDateString() : '-'}</td>
                </tr>
              ))}
              {filteredEmployees.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">No employees found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default EmployeeDirectoryPage;
