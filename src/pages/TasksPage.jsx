/**
 * Guardian Desktop ERP - Tasks Page
 * Complete task management with CRUD operations
<<<<<<< HEAD
 * Now includes: Tasks Tab, Personal Reminders Tab, Upcoming Meetings Banner
=======
 * Now includes: Personal Reminders (Google Tasks style), Upcoming Meetings view
>>>>>>> 2d35876e9053a18fcddca5b7ec7d61c54147dfdb
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, Search, Filter, MoreVertical, Edit2, Trash2, 
  CheckCircle, Clock, AlertCircle, Calendar, Users, ListTodo,
<<<<<<< HEAD
  Bell, BellRing, Video, ChevronRight, AlarmClock, X
} from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { tasksAPI, employeesAPI, notificationsAPI, personalRemindersAPI, meetingsAPI } from '../services/api';
=======
  Bell, Video, Phone, AlarmClock, Repeat, PhoneCall, Mail,
  ChevronRight, X
} from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { tasksAPI, employeesAPI, notificationsAPI, meetingsAPI, personalRemindersAPI } from '../services/api';
import { format, parseISO, isToday, isTomorrow, isPast, addHours, addMinutes } from 'date-fns';
>>>>>>> 2d35876e9053a18fcddca5b7ec7d61c54147dfdb
import toast from 'react-hot-toast';
import { getPositionLabel, getDepartmentLabel } from '../data/organizationConfig';
import { format, parseISO, isToday, isTomorrow, isPast, addMinutes } from 'date-fns';
import { useNavigate } from 'react-router-dom';

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

// Reminder Card Component for Google Tasks style reminders
const ReminderCard = ({ reminder, onComplete, onEdit, onDelete, onSnooze }) => {
  const reminderTime = parseISO(reminder.reminder_time);
  const isPastDue = isPast(reminderTime) && reminder.status === 'pending';
  
  const categoryIcons = {
    call: PhoneCall,
    email: Mail,
    task: ListTodo,
    meeting: Video
  };
  const CategoryIcon = categoryIcons[reminder.category] || Bell;

  return (
    <div className={`card p-3 border-l-4 ${
      isPastDue ? 'border-l-red-500 bg-red-50 dark:bg-red-900/10' :
      reminder.status === 'completed' ? 'border-l-green-500 opacity-60' :
      'border-l-guardian-500'
    }`}>
      <div className="flex items-start gap-3">
        <button
          onClick={() => onComplete(reminder.id)}
          className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
            reminder.status === 'completed' 
              ? 'bg-green-500 border-green-500 text-white' 
              : 'border-gray-300 hover:border-guardian-500'
          }`}
        >
          {reminder.status === 'completed' && <CheckCircle className="w-3 h-3" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <CategoryIcon className="w-4 h-4 text-gray-400" />
            <span className={`font-medium ${reminder.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'}`}>
              {reminder.title}
            </span>
            {isPastDue && <span className="text-xs text-red-600 font-medium">Overdue</span>}
          </div>
          {reminder.description && (
            <p className="text-sm text-gray-500 mb-2">{reminder.description}</p>
          )}
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <AlarmClock className="w-3 h-3" />
              {format(reminderTime, 'MMM d, h:mm a')}
            </span>
            {reminder.contact_info && (
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {reminder.contact_info}
              </span>
            )}
            {reminder.repeat_type && (
              <span className="flex items-center gap-1">
                <Repeat className="w-3 h-3" />
                {reminder.repeat_type}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {reminder.status !== 'completed' && (
            <button
              onClick={() => onSnooze(reminder.id)}
              className="p-1.5 text-gray-400 hover:text-guardian-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              title="Snooze 1 hour"
            >
              <Clock className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => onEdit(reminder)}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(reminder.id)}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Upcoming Meeting Mini Card
const UpcomingMeetingCard = ({ meeting, onJoin }) => {
  const startTime = parseISO(meeting.start_time);
  const isNow = Math.abs(new Date() - startTime) < 15 * 60 * 1000; // within 15 mins
  
  return (
    <div className={`card p-3 border-l-4 ${isNow ? 'border-l-green-500 bg-green-50 dark:bg-green-900/10' : 'border-l-purple-500'}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            meeting.meeting_type === 'video' ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-blue-100 dark:bg-blue-900/30'
          }`}>
            {meeting.meeting_type === 'video' ? 
              <Video className="w-5 h-5 text-purple-600 dark:text-purple-400" /> :
              <Phone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            }
          </div>
          <div className="min-w-0">
            <h4 className="font-medium text-gray-900 dark:text-white truncate">{meeting.title}</h4>
            <p className="text-sm text-gray-500">
              {isToday(startTime) ? 'Today' : isTomorrow(startTime) ? 'Tomorrow' : format(startTime, 'MMM d')} at {format(startTime, 'h:mm a')}
            </p>
          </div>
        </div>
        {isNow && (
          <button
            onClick={() => onJoin(meeting)}
            className="btn btn-primary text-sm px-3 py-1.5"
          >
            Join Now
          </button>
        )}
      </div>
    </div>
  );
};

function TasksPage() {
  const { user } = useAuth();
<<<<<<< HEAD
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks' or 'reminders'
=======
  
  // Tab state
  const [activeTab, setActiveTab] = useState('tasks'); // tasks, reminders
  
  // Tasks state
>>>>>>> 2d35876e9053a18fcddca5b7ec7d61c54147dfdb
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [upcomingMeetings, setUpcomingMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [editingReminder, setEditingReminder] = useState(null);
  const [taskToDelete, setTaskToDelete] = useState(null);
<<<<<<< HEAD
  const [reminderToDelete, setReminderToDelete] = useState(null);
=======
  
  // Meetings state
  const [upcomingMeetings, setUpcomingMeetings] = useState([]);
  
  // Personal Reminders state
  const [reminders, setReminders] = useState([]);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  const [reminderForm, setReminderForm] = useState({
    title: '',
    description: '',
    reminder_date: '',
    reminder_time: '',
    category: 'task',
    contact_info: '',
    priority: 'medium'
  });
>>>>>>> 2d35876e9053a18fcddca5b7ec7d61c54147dfdb

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assigned_to: '',
    due_date: '',
    priority: 'medium',
    status: 'pending'
  });

  const [reminderFormData, setReminderFormData] = useState({
    title: '',
    description: '',
    reminder_time: '',
    priority: 'medium'
  });

  useEffect(() => {
    fetchTasks();
    fetchEmployees();
<<<<<<< HEAD
    fetchReminders();
    fetchUpcomingMeetings();
=======
    fetchUpcomingMeetings();
    fetchReminders();
    
    // Check for due task notifications
    checkDueTaskNotifications();
    
    // Set up interval to check for reminder notifications
    const notificationInterval = setInterval(() => {
      checkReminderNotifications();
    }, 60000); // Check every minute
    
    return () => clearInterval(notificationInterval);
>>>>>>> 2d35876e9053a18fcddca5b7ec7d61c54147dfdb
  }, []);

  const fetchReminders = async () => {
    try {
      const data = await personalRemindersAPI.getAll();
      setReminders(data || []);
    } catch (error) {
      console.error('Failed to fetch reminders:', error);
    }
  };

  const fetchUpcomingMeetings = async () => {
    try {
      const data = await meetingsAPI.getAll({ status: 'scheduled' });
      // Filter to only today and tomorrow's meetings
      const upcoming = (data || []).filter(m => {
        const meetingDate = parseISO(m.start_time);
        return isToday(meetingDate) || isTomorrow(meetingDate);
      }).slice(0, 3);
      setUpcomingMeetings(upcoming);
    } catch (error) {
      console.error('Failed to fetch meetings:', error);
    }
  };

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
  
  const fetchUpcomingMeetings = async () => {
    try {
      const data = await meetingsAPI.getAll({ status: 'scheduled' });
      // Filter to only show upcoming meetings (next 7 days)
      const now = new Date();
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const upcoming = (data || []).filter(m => {
        const startTime = new Date(m.start_time);
        return startTime >= now && startTime <= weekFromNow;
      }).slice(0, 5);
      setUpcomingMeetings(upcoming);
    } catch (error) {
      console.error('Failed to fetch meetings:', error);
    }
  };
  
  const fetchReminders = async () => {
    try {
      const data = await personalRemindersAPI.getAll();
      setReminders(data || []);
    } catch (error) {
      console.error('Failed to fetch reminders:', error);
    }
  };
  
  const checkDueTaskNotifications = useCallback(async () => {
    // Check for tasks due today that haven't been notified
    const todayKey = `task_due_check_${new Date().toISOString().slice(0, 10)}`;
    if (sessionStorage.getItem(todayKey)) return;
    sessionStorage.setItem(todayKey, 'true');
    
    const today = new Date().toISOString().slice(0, 10);
    const dueTasks = tasks.filter(t => 
      t.due_date?.slice(0, 10) === today && 
      t.status !== 'completed'
    );
    
    if (dueTasks.length > 0) {
      toast.custom((t) => (
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5`}>
          <div className="p-4">
            <div className="flex items-start">
              <AlertCircle className="w-6 h-6 text-orange-500 flex-shrink-0" />
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Tasks Due Today
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  You have {dueTasks.length} task{dueTasks.length > 1 ? 's' : ''} due today!
                </p>
              </div>
            </div>
          </div>
        </div>
      ), { duration: 5000 });
    }
  }, [tasks]);
  
  const checkReminderNotifications = useCallback(async () => {
    const now = new Date();
    const pendingReminders = reminders.filter(r => {
      if (r.status !== 'pending') return false;
      const reminderTime = new Date(r.reminder_time);
      const diffMins = (reminderTime - now) / (1000 * 60);
      return diffMins <= 5 && diffMins > -5; // Within 5 mins of reminder time
    });
    
    pendingReminders.forEach(reminder => {
      toast.custom((t) => (
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5`}>
          <div className="p-4">
            <div className="flex items-start">
              <Bell className="w-6 h-6 text-guardian-500 flex-shrink-0" />
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Reminder: {reminder.title}
                </p>
                {reminder.contact_info && (
                  <p className="mt-1 text-sm text-gray-500">
                    Contact: {reminder.contact_info}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      ), { duration: 10000 });
    });
  }, [reminders]);

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

  // ========== Reminder Handlers ==========
  const handleReminderSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingReminder) {
        await personalRemindersAPI.update(editingReminder.id, reminderFormData);
        toast.success('Reminder updated!');
      } else {
        await personalRemindersAPI.create(reminderFormData);
        toast.success('Reminder created!');
      }
      fetchReminders();
      closeReminderModal();
    } catch (error) {
      toast.error(error.message || 'Failed to save reminder');
    }
  };

  const handleCompleteReminder = async (reminder) => {
    try {
      await personalRemindersAPI.complete(reminder.id);
      toast.success('Reminder completed!');
      fetchReminders();
    } catch (error) {
      toast.error('Failed to complete reminder');
    }
  };

  const handleSnoozeReminder = async (reminder, minutes = 10) => {
    try {
      await personalRemindersAPI.snooze(reminder.id, minutes);
      toast.success(`Snoozed for ${minutes} minutes`);
      fetchReminders();
    } catch (error) {
      toast.error('Failed to snooze reminder');
    }
  };

  const handleDeleteReminder = async () => {
    try {
      await personalRemindersAPI.delete(reminderToDelete.id);
      toast.success('Reminder deleted');
      setReminderToDelete(null);
      fetchReminders();
    } catch (error) {
      toast.error('Failed to delete reminder');
    }
  };

  const openEditReminderModal = (reminder) => {
    setEditingReminder(reminder);
    setReminderFormData({
      title: reminder.title,
      description: reminder.description || '',
      reminder_time: reminder.reminder_time ? format(parseISO(reminder.reminder_time), "yyyy-MM-dd'T'HH:mm") : '',
      priority: reminder.priority || 'medium'
    });
    setShowReminderModal(true);
  };

  const closeReminderModal = () => {
    setShowReminderModal(false);
    setEditingReminder(null);
    setReminderFormData({
      title: '',
      description: '',
      reminder_time: '',
      priority: 'medium'
    });
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
  
  // Reminder handlers
  const handleReminderSubmit = async (e) => {
    e.preventDefault();
    try {
      const reminderDateTime = new Date(`${reminderForm.reminder_date}T${reminderForm.reminder_time}`);
      
      const reminderData = {
        title: reminderForm.title,
        description: reminderForm.description,
        reminder_time: reminderDateTime.toISOString(),
        category: reminderForm.category,
        contact_info: reminderForm.contact_info,
        priority: reminderForm.priority,
      };
      
      if (editingReminder) {
        await personalRemindersAPI.update(editingReminder.id, reminderData);
        toast.success('Reminder updated');
      } else {
        await personalRemindersAPI.create(reminderData);
        toast.success('Reminder created');
      }
      
      fetchReminders();
      closeReminderModal();
    } catch (error) {
      toast.error(error.message || 'Failed to save reminder');
    }
  };
  
  const handleCompleteReminder = async (reminderId) => {
    try {
      await personalRemindersAPI.complete(reminderId);
      toast.success('Reminder completed');
      fetchReminders();
    } catch (error) {
      toast.error('Failed to complete reminder');
    }
  };
  
  const handleSnoozeReminder = async (reminderId) => {
    try {
      const snoozeUntil = addHours(new Date(), 1).toISOString();
      await personalRemindersAPI.snooze(reminderId, snoozeUntil);
      toast.success('Reminder snoozed for 1 hour');
      fetchReminders();
    } catch (error) {
      toast.error('Failed to snooze reminder');
    }
  };
  
  const handleDeleteReminder = async (reminderId) => {
    try {
      await personalRemindersAPI.delete(reminderId);
      toast.success('Reminder deleted');
      fetchReminders();
    } catch (error) {
      toast.error('Failed to delete reminder');
    }
  };
  
  const openEditReminderModal = (reminder) => {
    setEditingReminder(reminder);
    const reminderTime = parseISO(reminder.reminder_time);
    setReminderForm({
      title: reminder.title,
      description: reminder.description || '',
      reminder_date: format(reminderTime, 'yyyy-MM-dd'),
      reminder_time: format(reminderTime, 'HH:mm'),
      category: reminder.category || 'task',
      contact_info: reminder.contact_info || '',
      priority: reminder.priority || 'medium'
    });
    setShowReminderModal(true);
  };
  
  const openNewReminderModal = () => {
    setEditingReminder(null);
    const now = new Date();
    setReminderForm({
      title: '',
      description: '',
      reminder_date: format(now, 'yyyy-MM-dd'),
      reminder_time: format(addMinutes(now, 30), 'HH:mm'),
      category: 'task',
      contact_info: '',
      priority: 'medium'
    });
    setShowReminderModal(true);
  };
  
  const closeReminderModal = () => {
    setShowReminderModal(false);
    setEditingReminder(null);
    setReminderForm({
      title: '',
      description: '',
      reminder_date: '',
      reminder_time: '',
      category: 'task',
      contact_info: '',
      priority: 'medium'
    });
  };
  
  const handleJoinMeeting = (meeting) => {
    window.location.href = '/meetings';
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
  
  // Filter reminders
  const pendingReminders = reminders.filter(r => r.status === 'pending');
  const completedReminders = reminders.filter(r => r.status === 'completed');

  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    reminders: pendingReminders.length,
    meetings: upcomingMeetings.length
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
      {/* Upcoming Meetings Banner */}
      {upcomingMeetings.length > 0 && (
<<<<<<< HEAD
        <div className="card p-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Video className="w-6 h-6" />
              <div>
                <h3 className="font-semibold">Upcoming Meetings</h3>
                <p className="text-sm text-purple-100">You have {upcomingMeetings.length} meeting(s) scheduled</p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/meetings')}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
            >
              View All <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
            {upcomingMeetings.map((meeting) => (
              <div key={meeting.id} className="flex-shrink-0 bg-white/10 rounded-lg px-3 py-2 min-w-[200px]">
                <p className="font-medium truncate">{meeting.title}</p>
                <p className="text-sm text-purple-100">
                  {isToday(parseISO(meeting.start_time)) ? 'Today' : 'Tomorrow'} at {format(parseISO(meeting.start_time), 'HH:mm')}
                </p>
              </div>
=======
        <div className="card p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-purple-200 dark:border-purple-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Video className="w-5 h-5 text-purple-600" />
              Upcoming Meetings
            </h3>
            <a href="/meetings" className="text-sm text-guardian-600 hover:underline flex items-center gap-1">
              View All <ChevronRight className="w-4 h-4" />
            </a>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {upcomingMeetings.slice(0, 3).map(meeting => (
              <UpcomingMeetingCard key={meeting.id} meeting={meeting} onJoin={handleJoinMeeting} />
>>>>>>> 2d35876e9053a18fcddca5b7ec7d61c54147dfdb
            ))}
          </div>
        </div>
      )}
<<<<<<< HEAD

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('tasks')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'tasks' 
              ? 'border-guardian-600 text-guardian-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <ListTodo className="w-4 h-4 inline mr-2" />
          Tasks ({tasks.length})
        </button>
        <button
          onClick={() => setActiveTab('reminders')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'reminders' 
              ? 'border-guardian-600 text-guardian-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Bell className="w-4 h-4 inline mr-2" />
          My Reminders ({reminders.filter(r => !r.is_completed).length})
        </button>
      </div>

      {/* Tasks Tab Content */}
      {activeTab === 'tasks' && (
        <>
=======
      
>>>>>>> 2d35876e9053a18fcddca5b7ec7d61c54147dfdb
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
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

      {/* Tabs */}
      <div className="flex items-center border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('tasks')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'tasks'
              ? 'border-guardian-600 text-guardian-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <ListTodo className="w-4 h-4 inline mr-2" />
          Tasks ({stats.total})
        </button>
        <button
          onClick={() => setActiveTab('reminders')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'reminders'
              ? 'border-guardian-600 text-guardian-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Bell className="w-4 h-4 inline mr-2" />
          My Reminders ({stats.reminders})
        </button>
      </div>

      {/* Tasks Tab Content */}
      {activeTab === 'tasks' && (
        <>
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
        </>
      )}

      {/* Reminders Tab Content */}
      {activeTab === 'reminders' && (
        <>
          {/* Reminders Actions Bar */}
          <div className="card p-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">My Reminders</h3>
                <p className="text-sm text-gray-500">Personal tasks and quick reminders like Google Tasks</p>
              </div>
              <button onClick={openNewReminderModal} className="btn btn-primary whitespace-nowrap">
                <Plus className="w-4 h-4 mr-2" />
                Add Reminder
              </button>
            </div>
          </div>

          {/* Pending Reminders */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide px-1">
              Pending ({pendingReminders.length})
            </h4>
            {pendingReminders.length > 0 ? (
              pendingReminders.map(reminder => (
                <ReminderCard
                  key={reminder.id}
                  reminder={reminder}
                  onComplete={handleCompleteReminder}
                  onEdit={openEditReminderModal}
                  onDelete={handleDeleteReminder}
                  onSnooze={handleSnoozeReminder}
                />
              ))
            ) : (
              <div className="card p-8 text-center">
                <Bell className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No pending reminders</h3>
                <p className="text-gray-500 mb-4">Add reminders for calls, tasks, or anything you need to remember</p>
                <button onClick={openNewReminderModal} className="btn btn-primary">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Reminder
                </button>
              </div>
            )}
          </div>

          {/* Completed Reminders */}
          {completedReminders.length > 0 && (
            <div className="space-y-3 mt-6">
              <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide px-1">
                Completed ({completedReminders.length})
              </h4>
              {completedReminders.slice(0, 5).map(reminder => (
                <ReminderCard
                  key={reminder.id}
                  reminder={reminder}
                  onComplete={handleCompleteReminder}
                  onEdit={openEditReminderModal}
                  onDelete={handleDeleteReminder}
                  onSnooze={handleSnoozeReminder}
                />
              ))}
            </div>
          )}
        </>
      )}

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
<<<<<<< HEAD
        </>
      )}

      {/* Reminders Tab Content */}
      {activeTab === 'reminders' && (
        <>
          {/* Reminders Actions Bar */}
          <div className="card p-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">My Personal Reminders</h2>
                <span className="text-sm text-gray-500">Like Google Tasks - just for you!</span>
              </div>
              <button onClick={() => setShowReminderModal(true)} className="btn btn-primary whitespace-nowrap">
                <Plus className="w-4 h-4 mr-2" />
                Add Reminder
              </button>
            </div>
          </div>

          {/* Reminders List */}
          <div className="grid gap-4">
            {reminders.filter(r => !r.is_completed).map((reminder) => {
              const reminderTime = reminder.reminder_time ? parseISO(reminder.reminder_time) : null;
              const isOverdue = reminderTime && isPast(reminderTime);
              const isUpcoming = reminderTime && !isPast(reminderTime) && (isToday(reminderTime) || isTomorrow(reminderTime));
              
              return (
                <div key={reminder.id} className={`card p-4 hover:shadow-lg transition-shadow ${isOverdue ? 'border-l-4 border-red-500' : isUpcoming ? 'border-l-4 border-yellow-500' : ''}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <BellRing className={`w-5 h-5 ${isOverdue ? 'text-red-500' : isUpcoming ? 'text-yellow-500' : 'text-gray-400'}`} />
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">{reminder.title}</h3>
                        <PriorityBadge priority={reminder.priority || 'medium'} />
                        {isOverdue && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Overdue</span>}
                      </div>
                      {reminder.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2 ml-8">
                          {reminder.description}
                        </p>
                      )}
                      {reminderTime && (
                        <div className="flex items-center gap-2 text-sm text-gray-500 ml-8">
                          <Clock className="w-4 h-4" />
                          <span>
                            {isToday(reminderTime) ? 'Today' : isTomorrow(reminderTime) ? 'Tomorrow' : format(reminderTime, 'MMM d, yyyy')} at {format(reminderTime, 'HH:mm')}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCompleteReminder(reminder)}
                        className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                        title="Mark Complete"
                      >
                        <CheckCircle className="w-5 h-5" />
                      </button>
                      <div className="relative group">
                        <button className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" title="Snooze">
                          <AlarmClock className="w-4 h-4" />
                        </button>
                        <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 hidden group-hover:block z-10">
                          <button onClick={() => handleSnoozeReminder(reminder, 5)} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700">5 min</button>
                          <button onClick={() => handleSnoozeReminder(reminder, 10)} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700">10 min</button>
                          <button onClick={() => handleSnoozeReminder(reminder, 30)} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700">30 min</button>
                          <button onClick={() => handleSnoozeReminder(reminder, 60)} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700">1 hour</button>
                        </div>
                      </div>
                      <button
                        onClick={() => openEditReminderModal(reminder)}
                        className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setReminderToDelete(reminder)}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* Completed Reminders */}
            {reminders.filter(r => r.is_completed).length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-500 mb-3">Completed</h3>
                {reminders.filter(r => r.is_completed).map((reminder) => (
                  <div key={reminder.id} className="card p-3 mb-2 opacity-60">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="line-through text-gray-500">{reminder.title}</span>
                      <button
                        onClick={() => setReminderToDelete(reminder)}
                        className="ml-auto p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {reminders.length === 0 && (
              <div className="card p-12 text-center">
                <Bell className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No reminders yet</h3>
                <p className="text-gray-500">Create personal reminders to stay organized!</p>
              </div>
            )}
          </div>

          {/* Reminder Modal */}
          {showReminderModal && (
            <div className="modal-overlay" onClick={closeReminderModal}>
              <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {editingReminder ? 'Edit Reminder' : 'Create Reminder'}
                  </h2>
                  <button onClick={closeReminderModal} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleReminderSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={reminderFormData.title}
                      onChange={(e) => setReminderFormData({ ...reminderFormData, title: e.target.value })}
                      className="input w-full"
                      placeholder="What do you need to remember?"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Description
                    </label>
                    <textarea
                      value={reminderFormData.description}
                      onChange={(e) => setReminderFormData({ ...reminderFormData, description: e.target.value })}
                      className="input w-full"
                      rows={2}
                      placeholder="Add more details (optional)"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Remind Me At *
                      </label>
                      <input
                        type="datetime-local"
                        required
                        value={reminderFormData.reminder_time}
                        onChange={(e) => setReminderFormData({ ...reminderFormData, reminder_time: e.target.value })}
                        className="input w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Priority
                      </label>
                      <select
                        value={reminderFormData.priority}
                        onChange={(e) => setReminderFormData({ ...reminderFormData, priority: e.target.value })}
                        className="input w-full"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <button type="button" onClick={closeReminderModal} className="btn btn-ghost">
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      {editingReminder ? 'Update' : 'Create'} Reminder
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Delete Reminder Modal */}
          {reminderToDelete && (
            <div className="modal-overlay" onClick={() => setReminderToDelete(null)}>
              <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Delete Reminder</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Are you sure you want to delete "{reminderToDelete?.title}"?
                </p>
                <div className="flex justify-end gap-3">
                  <button onClick={() => setReminderToDelete(null)} className="btn btn-ghost">
                    Cancel
                  </button>
                  <button onClick={handleDeleteReminder} className="btn bg-red-600 hover:bg-red-700 text-white">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
=======

      {/* Reminder Modal */}
      {showReminderModal && (
        <div className="modal-overlay" onClick={closeReminderModal}>
          <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingReminder ? 'Edit Reminder' : 'Create Reminder'}
              </h2>
              <button onClick={closeReminderModal} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleReminderSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={reminderForm.title}
                  onChange={(e) => setReminderForm({ ...reminderForm, title: e.target.value })}
                  className="input w-full"
                  placeholder="e.g., Call John about project"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes
                </label>
                <textarea
                  value={reminderForm.description}
                  onChange={(e) => setReminderForm({ ...reminderForm, description: e.target.value })}
                  className="input w-full"
                  rows={2}
                  placeholder="Additional details..."
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={reminderForm.reminder_date}
                    onChange={(e) => setReminderForm({ ...reminderForm, reminder_date: e.target.value })}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={reminderForm.reminder_time}
                    onChange={(e) => setReminderForm({ ...reminderForm, reminder_time: e.target.value })}
                    className="input w-full"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category
                </label>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { value: 'call', label: 'Call', icon: PhoneCall },
                    { value: 'email', label: 'Email', icon: Mail },
                    { value: 'task', label: 'Task', icon: ListTodo },
                    { value: 'meeting', label: 'Meeting', icon: Video }
                  ].map(cat => (
                    <label
                      key={cat.value}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                        reminderForm.category === cat.value
                          ? 'border-guardian-600 bg-guardian-50 dark:bg-guardian-900/30 text-guardian-700 dark:text-guardian-400'
                          : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="category"
                        value={cat.value}
                        checked={reminderForm.category === cat.value}
                        onChange={(e) => setReminderForm({ ...reminderForm, category: e.target.value })}
                        className="sr-only"
                      />
                      <cat.icon className="w-4 h-4" />
                      <span className="text-sm">{cat.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Contact Info (optional)
                </label>
                <input
                  type="text"
                  value={reminderForm.contact_info}
                  onChange={(e) => setReminderForm({ ...reminderForm, contact_info: e.target.value })}
                  className="input w-full"
                  placeholder="Phone number or email"
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={closeReminderModal} className="btn btn-ghost">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingReminder ? 'Update Reminder' : 'Create Reminder'}
                </button>
              </div>
            </form>
          </div>
        </div>
>>>>>>> 2d35876e9053a18fcddca5b7ec7d61c54147dfdb
      )}
    </div>
  );
}

export default TasksPage;
