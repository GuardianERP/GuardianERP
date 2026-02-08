/**
 * Guardian Desktop ERP - Notifications Page
 * Notification center with filtering and management
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, Check, CheckCheck, Trash2, Filter, Search,
  AlertCircle, Info, CheckCircle, AlertTriangle, Clock, Users, FileText,
  MessageCircle, Cake, UserPlus
} from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { notificationsAPI } from '../services/api';
import { supabase } from '../services/supabaseClient';
import toast from 'react-hot-toast';

// Notification Type Icons
const NotificationIcon = ({ type }) => {
  const icons = {
    task: FileText,
    alert: AlertCircle,
    success: CheckCircle,
    warning: AlertTriangle,
    info: Info,
    user: Users,
    reminder: Clock,
    chat: MessageCircle,
    birthday: Cake,
    welcome: UserPlus
  };
  const colors = {
    task: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30',
    alert: 'text-red-500 bg-red-100 dark:bg-red-900/30',
    success: 'text-green-500 bg-green-100 dark:bg-green-900/30',
    warning: 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/30',
    info: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30',
    user: 'text-purple-500 bg-purple-100 dark:bg-purple-900/30',
    reminder: 'text-orange-500 bg-orange-100 dark:bg-orange-900/30',
    chat: 'text-guardian-500 bg-guardian-100 dark:bg-guardian-900/30',
    birthday: 'text-pink-500 bg-pink-100 dark:bg-pink-900/30',
    welcome: 'text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30'
  };
  const Icon = icons[type] || icons.info;
  return (
    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colors[type] || colors.info}`}>
      <Icon className="w-5 h-5" />
    </div>
  );
};

function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchNotifications();

    // Real-time subscription for new notifications
    let sub;
    if (user?.id) {
      sub = supabase
        .channel(`notifications:${user.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        }, (payload) => {
          setNotifications(prev => [payload.new, ...prev]);
        })
        .subscribe();
    }
    return () => {
      if (sub) supabase.removeChannel(sub);
    };
  }, [user?.id]);

  const fetchNotifications = async () => {
    try {
      const data = await notificationsAPI.getAll(user.id);
      setNotifications(data || []);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await notificationsAPI.markRead(id);
    } catch (error) {
      console.error('markRead failed:', error);
    }
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const markAllAsRead = async () => {
    try {
      await notificationsAPI.markAllRead(user.id);
    } catch (error) {
      console.error('markAllRead failed:', error);
    }
    setNotifications(notifications.map(n => ({ ...n, read: true })));
    toast.success('All notifications marked as read');
  };

  const handleNotificationClick = (notification) => {
    if (!notification.read) markAsRead(notification.id);
    if (notification.link) navigate(notification.link);
  };

  const deleteNotification = async (e, id) => {
    e.stopPropagation();
    try {
      await notificationsAPI.delete(id);
      setNotifications(notifications.filter(n => n.id !== id));
      toast.success('Notification deleted');
    } catch (error) {
      console.error('Delete notification error:', error);
      // Still remove from local state if API fails
      setNotifications(notifications.filter(n => n.id !== id));
      toast.success('Notification deleted');
    }
  };

  const clearAll = async () => {
    try {
      await notificationsAPI.deleteAll(user.id);
      setNotifications([]);
      toast.success('All notifications cleared');
    } catch (error) {
      console.error('Clear all notifications error:', error);
      toast.error('Failed to clear notifications');
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return date.toLocaleDateString();
  };

  const filteredNotifications = notifications.filter(n => {
    const title = n.title || '';
    const message = n.message || '';
    const matchesFilter = filter === 'all' || 
                          (filter === 'unread' && !n.read) ||
                          (filter === 'read' && n.read);
    const matchesSearch = title.toLowerCase().includes(search.toLowerCase()) ||
                          message.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

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
            <Bell className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{notifications.length}</p>
            <p className="text-sm text-gray-500">Total Notifications</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{unreadCount}</p>
            <p className="text-sm text-gray-500">Unread</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{notifications.length - unreadCount}</p>
            <p className="text-sm text-gray-500">Read</p>
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
                placeholder="Search notifications..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-10 w-full sm:w-64"
              />
            </div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="input"
            >
              <option value="all">All Notifications</option>
              <option value="unread">Unread</option>
              <option value="read">Read</option>
            </select>
          </div>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="btn btn-ghost text-sm">
                <CheckCheck className="w-4 h-4 mr-2" />
                Mark all read
              </button>
            )}
            {notifications.length > 0 && (
              <button onClick={clearAll} className="btn btn-ghost text-sm text-red-600">
                <Trash2 className="w-4 h-4 mr-2" />
                Clear all
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="card overflow-hidden">
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {filteredNotifications.map((notification) => (
            <div 
              key={notification.id} 
              onClick={() => handleNotificationClick(notification)}
              className={`p-4 flex items-start gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer ${
                !notification.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
              }`}
            >
              <NotificationIcon type={notification.type} />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className={`font-medium ${!notification.read ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                      {notification.title}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">{notification.message}</p>
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {formatTime(notification.created_at)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!notification.read && (
                  <button
                    onClick={(e) => { e.stopPropagation(); markAsRead(notification.id); }}
                    className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                    title="Mark as read"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={(e) => deleteNotification(e, notification.id)}
                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {filteredNotifications.length === 0 && (
            <div className="p-12 text-center">
              <Bell className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No notifications
              </h3>
              <p className="text-gray-500">
                {filter === 'unread' 
                  ? "You're all caught up!" 
                  : "You don't have any notifications yet"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default NotificationsPage;
