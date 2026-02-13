/**
 * Guardian Desktop ERP - Teams Page
 * Team creation, member management, and task assignment
 * Admin can create/edit teams, employees can view their teams
 */

import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Users, UserPlus, UserMinus, Edit2, Trash2,
  Shield, Crown, ChevronDown, ChevronRight, CheckSquare,
  Building2, X
} from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { teamsAPI, employeesAPI } from '../services/api';
import { getDepartmentLabel, getPositionLabel, DEPARTMENT_LIST } from '../data/organizationConfig';
import toast from 'react-hot-toast';

function TeamsPage() {
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [expandedTeams, setExpandedTeams] = useState(new Set());
  const [memberSearch, setMemberSearch] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    department: '',
    team_lead_id: '',
  });

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  useEffect(() => {
    fetchTeams();
    fetchEmployees();
  }, []);

  const fetchTeams = async () => {
    try {
      console.log('Fetching teams...');
      const data = await teamsAPI.getAll();
      console.log('Teams fetched:', data);
      setTeams(data || []);
      // Expand all by default
      setExpandedTeams(new Set((data || []).map(t => t.id)));
    } catch (error) {
      console.error('Failed to fetch teams:', error);
      toast.error('Failed to load teams. Make sure you ran the database migration.');
      setTeams([]);
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

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    try {
      if (editingTeam) {
        const result = await teamsAPI.update(editingTeam.id, formData);
        console.log('Team updated:', result);
        toast.success('Team updated successfully');
      } else {
        const result = await teamsAPI.create(formData);
        console.log('Team created:', result);
        toast.success('Team created successfully');
      }
      await fetchTeams(); // Wait for refresh
      closeCreateModal();
    } catch (error) {
      console.error('Save team error:', error);
      toast.error(error.message || 'Failed to save team. Did you run the migration SQL?');
    }
  };

  const handleDeleteTeam = async (teamId) => {
    if (!confirm('Are you sure you want to delete this team?')) return;
    try {
      await teamsAPI.delete(teamId);
      toast.success('Team deleted');
      fetchTeams();
    } catch (error) {
      toast.error('Failed to delete team');
    }
  };

  const handleAddMember = async (employeeId) => {
    try {
      await teamsAPI.addMember(selectedTeamId, employeeId);
      toast.success('Member added to team');
      fetchTeams();
    } catch (error) {
      toast.error(error.message || 'Failed to add member');
    }
  };

  const handleRemoveMember = async (teamId, employeeId) => {
    try {
      await teamsAPI.removeMember(teamId, employeeId);
      toast.success('Member removed from team');
      fetchTeams();
    } catch (error) {
      toast.error('Failed to remove member');
    }
  };

  const openEditModal = (team) => {
    setEditingTeam(team);
    setFormData({
      name: team.name,
      description: team.description || '',
      department: team.department || '',
      team_lead_id: team.team_lead_id || '',
    });
    setShowCreateModal(true);
  };

  const openAddMemberModal = (teamId) => {
    setSelectedTeamId(teamId);
    setMemberSearch('');
    setShowAddMemberModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setEditingTeam(null);
    setFormData({ name: '', description: '', department: '', team_lead_id: '' });
  };

  const toggleTeam = (teamId) => {
    setExpandedTeams(prev => {
      const next = new Set(prev);
      if (next.has(teamId)) next.delete(teamId);
      else next.add(teamId);
      return next;
    });
  };

  // Get members that are NOT in the selected team
  const getAvailableMembers = () => {
    const team = teams.find(t => t.id === selectedTeamId);
    const existingIds = new Set((team?.team_members || []).map(m => m.employee_id));
    return employees.filter(emp => {
      if (existingIds.has(emp.id)) return false;
      const name = `${emp.first_name || ''} ${emp.last_name || ''}`.toLowerCase();
      return name.includes(memberSearch.toLowerCase());
    });
  };

  const getLeadName = (team) => {
    if (!team.team_lead_id) return null;
    const member = team.team_members?.find(m => m.employee_id === team.team_lead_id);
    if (member?.employees) return `${member.employees.first_name || ''} ${member.employees.last_name || ''}`.trim();
    const emp = employees.find(e => e.id === team.team_lead_id);
    if (emp) return `${emp.first_name || ''} ${emp.last_name || ''}`.trim();
    return null;
  };

  const filteredTeams = teams.filter(team => {
    const name = (team.name || '').toLowerCase();
    const dept = (team.department || '').toLowerCase();
    const desc = (team.description || '').toLowerCase();
    const searchLower = search.toLowerCase();
    return name.includes(searchLower) || dept.includes(searchLower) || desc.includes(searchLower);
  });

  const teamColors = [
    'from-blue-500 to-indigo-600',
    'from-green-500 to-emerald-600',
    'from-purple-500 to-violet-600',
    'from-orange-500 to-amber-600',
    'from-pink-500 to-rose-600',
    'from-cyan-500 to-teal-600',
    'from-red-500 to-pink-600',
    'from-yellow-500 to-orange-600',
  ];

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
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{teams.length}</p>
            <p className="text-sm text-gray-500">Total Teams</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
            <UserPlus className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {teams.reduce((sum, t) => sum + (t.team_members?.length || 0), 0)}
            </p>
            <p className="text-sm text-gray-500">Total Members</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
            <Building2 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {new Set(teams.map(t => t.department).filter(Boolean)).size}
            </p>
            <p className="text-sm text-gray-500">Departments</p>
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="card p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search teams..." value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-10 w-full sm:w-72" />
          </div>
          {isAdmin && (
            <button onClick={() => setShowCreateModal(true)} className="btn btn-primary whitespace-nowrap">
              <Plus className="w-4 h-4 mr-2" />
              Create Team
            </button>
          )}
        </div>
      </div>

      {/* Teams List */}
      <div className="space-y-4">
        {filteredTeams.map((team, idx) => {
          const isExpanded = expandedTeams.has(team.id);
          const gradient = teamColors[idx % teamColors.length];
          const leadName = getLeadName(team);
          const members = team.team_members || [];

          return (
            <div key={team.id} className="card overflow-hidden">
              {/* Team Header */}
              <div className={`p-4 bg-gradient-to-r ${gradient} text-white`}>
                <div className="flex items-center justify-between">
                  <button onClick={() => toggleTeam(team.id)} className="flex items-center gap-3 flex-1">
                    {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    <div>
                      <h3 className="font-bold text-lg">{team.name}</h3>
                      <div className="flex items-center gap-3 text-sm text-white/80">
                        {team.department && <span>{getDepartmentLabel(team.department)}</span>}
                        <span>{members.length} members</span>
                        {leadName && (
                          <span className="flex items-center gap-1">
                            <Crown className="w-3.5 h-3.5" /> {leadName}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                  {isAdmin && (
                    <div className="flex items-center gap-2">
                      <button onClick={() => openAddMemberModal(team.id)} className="p-2 hover:bg-white/20 rounded-lg transition-colors" title="Add Member">
                        <UserPlus className="w-5 h-5" />
                      </button>
                      <button onClick={() => openEditModal(team)} className="p-2 hover:bg-white/20 rounded-lg transition-colors" title="Edit Team">
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button onClick={() => handleDeleteTeam(team.id)} className="p-2 hover:bg-white/20 rounded-lg transition-colors" title="Delete Team">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
                {team.description && <p className="text-sm text-white/70 mt-2 ml-8">{team.description}</p>}
              </div>

              {/* Team Members */}
              {isExpanded && (
                <div className="p-4">
                  {members.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {members.map(member => {
                        const emp = member.employees;
                        if (!emp) return null;
                        const isLead = member.employee_id === team.team_lead_id;
                        return (
                          <div key={member.id} className={`flex items-center gap-3 p-3 rounded-xl border ${isLead ? 'border-yellow-300 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/10' : 'border-gray-200 dark:border-gray-700'}`}>
                            {emp.profile_picture ? (
                              <img src={emp.profile_picture} alt="" className="w-10 h-10 rounded-full object-cover" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-guardian-400 to-guardian-600 flex items-center justify-center text-white font-medium text-sm">
                                {(emp.first_name?.[0] || '')}{(emp.last_name?.[0] || '')}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                                  {emp.first_name} {emp.last_name}
                                </p>
                                {isLead && <Crown className="w-4 h-4 text-yellow-500 flex-shrink-0" />}
                              </div>
                              <p className="text-xs text-gray-500 truncate">
                                {getPositionLabel(emp.position) || emp.position || getDepartmentLabel(emp.department) || ''}
                              </p>
                            </div>
                            {isAdmin && (
                              <button onClick={() => handleRemoveMember(team.id, member.employee_id)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Remove">
                                <UserMinus className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No members yet</p>
                      {isAdmin && (
                        <button onClick={() => openAddMemberModal(team.id)} className="btn btn-sm btn-primary mt-2">
                          <UserPlus className="w-4 h-4 mr-1" /> Add Members
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filteredTeams.length === 0 && (
          <div className="card p-12 text-center">
            <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 text-lg">
              {searchQuery || filterDepartment ? 'No teams match your filters' : 'No teams found'}
            </p>
            {teams.length === 0 && !searchQuery && !filterDepartment && (
              <p className="text-gray-400 text-sm mt-2 max-w-md mx-auto">
                If you already created teams but they're not showing up, make sure you've run the database migration (database/migration-teams-loans-leaves.sql) in Supabase.
              </p>
            )}
            {isAdmin && (
              <button onClick={() => setShowCreateModal(true)} className="btn btn-primary mt-4">
                <Plus className="w-4 h-4 mr-2" /> Create First Team
              </button>
            )}
          </div>
        )}
      </div>

      {/* Create/Edit Team Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={closeCreateModal}>
          <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
              {editingTeam ? 'Edit Team' : 'Create Team'}
            </h2>
            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Team Name *</label>
                <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input w-full" placeholder="e.g., Billing Team Alpha" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department</label>
                <select value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} className="input w-full">
                  <option value="">Select Department</option>
                  {DEPARTMENT_LIST.map(dept => (
                    <option key={dept.value} value={dept.value}>{dept.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Team Lead</label>
                <select value={formData.team_lead_id} onChange={(e) => setFormData({ ...formData, team_lead_id: e.target.value })} className="input w-full">
                  <option value="">Select Team Lead</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="input w-full" rows={3} placeholder="Team purpose and goals..." />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={closeCreateModal} className="btn btn-ghost">Cancel</button>
                <button type="submit" className="btn btn-primary">
                  {editingTeam ? 'Update Team' : 'Create Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div className="modal-overlay" onClick={() => setShowAddMemberModal(false)}>
          <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add Team Member</h2>
              <button onClick={() => setShowAddMemberModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search employees..." value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} className="input pl-10 w-full" />
            </div>
            <div className="max-h-96 overflow-y-auto space-y-2">
              {getAvailableMembers().map(emp => (
                <button
                  key={emp.id}
                  onClick={() => handleAddMember(emp.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-guardian-50 dark:hover:bg-guardian-900/20 transition-colors text-left"
                >
                  {emp.avatar_url || emp.profile_picture ? (
                    <img src={emp.avatar_url || emp.profile_picture} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-guardian-400 to-guardian-600 flex items-center justify-center text-white font-medium text-sm">
                      {(emp.first_name?.[0] || '')}{(emp.last_name?.[0] || '')}
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white text-sm">{emp.first_name} {emp.last_name}</p>
                    <p className="text-xs text-gray-500">{getDepartmentLabel(emp.department) || ''} {emp.position ? `• ${getPositionLabel(emp.position) || emp.position}` : ''}</p>
                  </div>
                  <UserPlus className="w-5 h-5 text-guardian-500" />
                </button>
              ))}
              {getAvailableMembers().length === 0 && (
                <p className="text-center text-gray-500 py-4">No available employees found</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TeamsPage;
