/**
 * Guardian Desktop ERP - Tasks Page
 * Complete task management with CRUD operations
 */

import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Filter, MoreVertical, Edit2, Trash2, 
  CheckCircle, Clock, AlertCircle, Calendar, Users, ListTodo
} from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { tasksAPI, employeesAPI, notificationsAPI } from '../services/api';
import toast from 'react-hot-toast';
import { getPositionLabel, getDepartmentLabel } from '../data/organizationConfig';

// Priority Badge Component
const PriorityBadge = ({ priority }) => {
  const styles = {
    high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[priority] || styles.low}`}>
      {priority}
    </span>
  );
};

// Status Badge Component
const StatusBadge = ({ status }) => {
  const styles = {
    pending: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  };
  const labels = {
    pending: 'Pending',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled'
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
      {labels[status] || status}
    </span>
  );
};

function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskToDelete, setTaskToDelete] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assigned_to: '',
    due_date: '',
    priority: 'medium',
    status: 'pending'
  });

  useEffect(() => {
    fetchTasks();
    fetchEmployees();
  }, []);

  const fetchTasks = async () => {
    try {
      const data = await tasksAPI.getAll();
      setTasks(data);
    } catch (error) {
      toast.error('Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const data = await employeesAPI.getAll();
      // Map employees to include full name with position for dropdown
      const employeesWithNames = (data || []).map(emp => {
        const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.email || 'Unknown';
        const position = getPositionLabel(emp.role);
        const dept = getDepartmentLabel(emp.department);
        const subtitle = [position, dept].filter(Boolean).join(' • ');
        return {
          ...emp,
          name: fullName,
          displayName: subtitle ? `${fullName} (${subtitle})` : fullName
        };
      });
      setEmployees(employeesWithNames);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
      setEmployees([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTask) {
        const wasUnassigned = !editingTask.assigned_to;
        const isNewlyAssigned = formData.assigned_to && (wasUnassigned || editingTask.assigned_to !== formData.assigned_to);
        
        await tasksAPI.update(editingTask.id, formData);
        toast.success('Task updated successfully');
        
        // Send notification if task is assigned to someone new
        if (isNewlyAssigned) {
          await sendTaskNotification(formData.assigned_to, formData.title, 'assigned');
        }
      } else {
        await tasksAPI.create({ ...formData, created_by: user.id });
        toast.success('Task created successfully');
        
        // Send notification if task is assigned
        if (formData.assigned_to) {
          await sendTaskNotification(formData.assigned_to, formData.title, 'new');
        }
      }
      fetchTasks();
      closeModal();
    } catch (error) {
      toast.error(error.message || 'Failed to save task');
    }
  };

  // Send notification to assigned employee
  const sendTaskNotification = async (employeeId, taskTitle, type) => {
    try {
      // Find the employee to get their user_id
      const employee = employees.find(emp => emp.id === employeeId);
      if (employee?.user_id) {
        await notificationsAPI.create(employee.user_id, {
          title: type === 'new' ? '📋 New Task Assigned' : '📋 Task Reassigned',
          message: `You have been assigned to: "${taskTitle}"`,
          type: 'task',
          link: '/tasks'
        });
        console.log('Task notification sent to employee:', employee.name);
      }
    } catch (error) {
      console.error('Failed to send task notification:', error);
    }
  };

  const handleDelete = async () => {
    try {
      await tasksAPI.delete(taskToDelete.id);
      toast.success('Task deleted successfully');
      fetchTasks();
      setShowDeleteModal(false);
      setTaskToDelete(null);
    } catch (error) {
      toast.error('Failed to delete task');
    }
  };

  const handleStatusChange = async (task, newStatus) => {
    try {
      await tasksAPI.update(task.id, { ...task, status: newStatus });
      toast.success('Status updated');
      fetchTasks();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const openEditModal = (task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      assigned_to: task.assigned_to || '',
      due_date: task.due_date ? task.due_date.split('T')[0] : '',
      priority: task.priority,
      status: task.status
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingTask(null);
    setFormData({
      title: '',
      description: '',
      assigned_to: '',
      due_date: '',
      priority: 'medium',
      status: 'pending'
    });
  };

  const filteredTasks = tasks.filter(task => {
    const title = task.title || '';
    const description = task.description || '';
    const matchesSearch = title.toLowerCase().includes(search.toLowerCase()) ||
                          description.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length
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
            <ListTodo className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            <p className="text-sm text-gray-500">Total Tasks</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center">
            <Clock className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pending}</p>
            <p className="text-sm text-gray-500">Pending</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.inProgress}</p>
            <p className="text-sm text-gray-500">In Progress</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.completed}</p>
            <p className="text-sm text-gray-500">Completed</p>
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
                placeholder="Search tasks..."
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
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="input"
            >
              <option value="all">All Priority</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <button onClick={() => setShowModal(true)} className="btn btn-primary whitespace-nowrap">
            <Plus className="w-4 h-4 mr-2" />
            Add Task
          </button>
        </div>
      </div>

      {/* Tasks List */}
      <div className="grid gap-4">
        {filteredTasks.map((task) => (
          <div key={task.id} className="card p-4 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-gray-900 dark:text-white truncate">{task.title}</h3>
                  <PriorityBadge priority={task.priority} />
                  <StatusBadge status={task.status} />
                </div>
                {task.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">
                    {task.description}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                  {task.assigned_to && (() => {
                    const emp = employees.find(e => e.id === task.assigned_to);
                    const position = emp?.role ? getPositionLabel(emp.role) : '';
                    return (
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>{emp?.name || 'Unknown'}</span>
                        {position && <span className="text-xs text-gray-400">({position})</span>}
                      </span>
                    );
                  })()}
                  {task.due_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(task.due_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {task.status !== 'completed' && (
                  <button
                    onClick={() => handleStatusChange(task, 'completed')}
                    className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                    title="Mark Complete"
                  >
                    <CheckCircle className="w-5 h-5" />
                  </button>
                )}
                <button
                  onClick={() => openEditModal(task)}
                  className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { setTaskToDelete(task); setShowDeleteModal(true); }}
                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {filteredTasks.length === 0 && (
          <div className="card p-12 text-center">
            <ListTodo className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No tasks found</h3>
            <p className="text-gray-500">Create your first task to get started</p>
          </div>
        )}
      </div>

      {/* Task Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
              {editingTask ? 'Edit Task' : 'Create New Task'}
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
                  placeholder="Enter task title"
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
                  placeholder="Enter task description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Assign To
                  </label>
                  <select
                    value={formData.assigned_to}
                    onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                    className="input w-full"
                  >
                    <option value="">Unassigned</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.displayName || emp.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="input w-full"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="input w-full"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
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
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={closeModal} className="btn btn-ghost">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingTask ? 'Update Task' : 'Create Task'}
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
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Delete Task</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete "{taskToDelete?.title}"? This action cannot be undone.
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

export default TasksPage;
