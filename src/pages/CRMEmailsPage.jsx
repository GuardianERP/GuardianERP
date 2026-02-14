import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, Edit2, Trash2, Copy, Search, Filter, Grid, List, Columns, Star,
  TrendingUp, Award, AlertTriangle, ChevronDown, ChevronRight, X, Save,
  Mail, MessageSquare, Send, Eye, Reply, Users, BarChart3, Sparkles,
  FileText, Clock, CheckCircle, XCircle, Flame, Target
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { emailTemplateSetsAPI, emailTemplatesAPI, emailTemplateAnalyticsAPI, marketingAnalyticsAPI } from '../services/api';
import { useAuth } from '../store/AuthContext';
import toast from 'react-hot-toast';

// Rich Text Editor Component (simplified - you can replace with TipTap or Quill)
const RichTextEditor = ({ value, onChange, placeholder }) => {
  return (
    <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
      <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 border-b border-gray-300 dark:border-gray-600">
        <button type="button" onClick={() => document.execCommand('bold')} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded" title="Bold">
          <span className="font-bold text-sm text-gray-700 dark:text-white">B</span>
        </button>
        <button type="button" onClick={() => document.execCommand('italic')} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded" title="Italic">
          <span className="italic text-sm text-gray-700 dark:text-white">I</span>
        </button>
        <button type="button" onClick={() => document.execCommand('underline')} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded" title="Underline">
          <span className="underline text-sm text-gray-700 dark:text-white">U</span>
        </button>
        <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />
        <button type="button" onClick={() => document.execCommand('insertUnorderedList')} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-sm text-gray-700 dark:text-white">• List</button>
        <button type="button" onClick={() => document.execCommand('insertOrderedList')} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-sm text-gray-700 dark:text-white">1. List</button>
      </div>
      <div
        contentEditable
        className="min-h-[200px] p-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none"
        dangerouslySetInnerHTML={{ __html: value }}
        onBlur={(e) => onChange(e.target.innerHTML)}
        placeholder={placeholder}
      />
    </div>
  );
};

// Priority Badge Component
const PriorityBadge = ({ priority }) => {
  const colors = {
    High: 'bg-red-200 text-red-700 border-red-300 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30',
    Medium: 'bg-yellow-200 text-yellow-700 border-yellow-300 dark:bg-yellow-500/20 dark:text-yellow-400 dark:border-yellow-500/30',
    Low: 'bg-green-200 text-green-700 border-green-300 dark:bg-green-500/20 dark:text-green-400 dark:border-green-500/30',
  };
  return (
    <span className={`px-2 py-0.5 text-xs rounded-full border ${colors[priority] || colors.Medium}`}>
      {priority}
    </span>
  );
};

// Type Badge Component
const TypeBadge = ({ type }) => {
  const colors = {
    'First Email': 'bg-blue-200 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
    '1st Follow-up': 'bg-purple-200 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400',
    '2nd Follow-up': 'bg-indigo-200 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400',
    '3rd Follow-up': 'bg-violet-200 text-violet-700 dark:bg-violet-500/20 dark:text-violet-400',
    'Proposal': 'bg-emerald-200 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
    'Final Notice': 'bg-orange-200 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400',
  };
  return (
    <span className={`px-2 py-0.5 text-xs rounded-full ${colors[type] || 'bg-gray-200 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400'}`}>
      {type}
    </span>
  );
};

// Performance Badge Component
const PerformanceBadge = ({ stats }) => {
  if (!stats || stats.sent < 3) return null;
  const rate = parseFloat(stats.replyRate);
  if (rate > 20) return <span className="flex items-center gap-1 text-xs text-green-400"><Flame className="w-3 h-3" />Trending</span>;
  if (parseFloat(stats.conversionRate) > 10) return <span className="flex items-center gap-1 text-xs text-emerald-400"><Award className="w-3 h-3" />Best Results</span>;
  if (rate < 5 && stats.sent > 5) return <span className="flex items-center gap-1 text-xs text-orange-400"><AlertTriangle className="w-3 h-3" />Needs Review</span>;
  return null;
};

// Template Card Component
const TemplateCard = ({ template, stats, onEdit, onDelete, onCopy, canEdit }) => {
  const templateStats = stats?.find(s => s.templateId === template.id);
  
  return (
    <div className="bg-white dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700/50 hover:border-gray-300 dark:hover:border-gray-600 transition-all group shadow-md dark:shadow-sm hover:shadow-lg">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <TypeBadge type={template.type} />
          <PriorityBadge priority={template.priority} />
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onCopy(template)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white" title="Copy">
            <Copy className="w-4 h-4" />
          </button>
          {canEdit && (
            <>
              <button onClick={() => onEdit(template)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white" title="Edit">
                <Edit2 className="w-4 h-4" />
              </button>
              <button onClick={() => onDelete(template.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-500/20 rounded text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400" title="Delete">
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
      
      <h4 className="font-medium text-gray-900 dark:text-white mb-2 line-clamp-2">{template.subject}</h4>
      
      <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3 mb-3" dangerouslySetInnerHTML={{ __html: template.body?.substring(0, 150) + '...' }} />
      
      {templateStats && (
        <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
            <span className="flex items-center gap-1"><Send className="w-3 h-3" />{templateStats.sent}</span>
            <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{templateStats.openRate}%</span>
            <span className="flex items-center gap-1"><Reply className="w-3 h-3" />{templateStats.replyRate}%</span>
          </div>
          <PerformanceBadge stats={templateStats} />
        </div>
      )}
    </div>
  );
};

// Template Set Card Component
const TemplateSetCard = ({ set, stats, onSelect, onEdit, onDelete, canEdit, isSelected }) => {
  const setStats = useMemo(() => {
    if (!stats || !set.templates) return null;
    const templateIds = set.templates.map(t => t.id);
    const templateStats = stats.filter(s => templateIds.includes(s.templateId));
    return {
      totalSent: templateStats.reduce((sum, s) => sum + s.sent, 0),
      avgReplyRate: templateStats.length > 0 
        ? (templateStats.reduce((sum, s) => sum + parseFloat(s.replyRate), 0) / templateStats.length).toFixed(1) 
        : 0,
      clients: templateStats.reduce((sum, s) => sum + s.clients, 0),
    };
  }, [set.templates, stats]);

  return (
    <div 
      className={`bg-white dark:bg-gray-800/50 rounded-xl p-4 border transition-all cursor-pointer shadow-md dark:shadow-sm hover:shadow-lg ${isSelected ? 'border-pink-500 ring-1 ring-pink-500/50' : 'border-gray-200 dark:border-gray-700/50 hover:border-gray-300 dark:hover:border-gray-600'}`}
      onClick={() => onSelect(set)}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-gray-900 dark:text-white">{set.name}</h3>
        {canEdit && (
          <div className="flex items-center gap-1">
            <button onClick={(e) => { e.stopPropagation(); onEdit(set); }} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white">
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(set.id); }} className="p-1 hover:bg-red-50 dark:hover:bg-red-500/20 rounded text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
      
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">{set.description || 'No description'}</p>
      
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-400 dark:text-gray-500">{set.templates?.length || 0} templates</span>
        {setStats && setStats.totalSent > 0 && (
          <span className="text-gray-400 dark:text-gray-500">
            {setStats.avgReplyRate}% reply rate • {setStats.clients} clients
          </span>
        )}
      </div>
      
      {set.is_public && (
        <span className="mt-2 inline-block px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-full">Public</span>
      )}
    </div>
  );
};

// Create/Edit Template Modal
const TemplateModal = ({ isOpen, onClose, template, setId, onSave }) => {
  const [formData, setFormData] = useState({
    type: 'First Email',
    priority: 'Medium',
    subject: '',
    body: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (template) {
      setFormData({
        type: template.type,
        priority: template.priority,
        subject: template.subject,
        body: template.body,
      });
    } else {
      setFormData({ type: 'First Email', priority: 'Medium', subject: '', body: '' });
    }
  }, [template]);

  const handleSave = async () => {
    if (!formData.subject.trim()) {
      toast.error('Subject is required');
      return;
    }
    setIsSaving(true);
    try {
      if (template) {
        await emailTemplatesAPI.update(template.id, formData);
        toast.success('Template updated');
      } else {
        await emailTemplatesAPI.create({ ...formData, template_set_id: setId });
        toast.success('Template created');
      }
      onSave();
      onClose();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{template ? 'Edit Template' : 'Create Template'}</h3>
          <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-140px)] space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Email Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 border border-gray-300 dark:border-gray-600"
              >
                <option value="First Email">First Email</option>
                <option value="1st Follow-up">1st Follow-up</option>
                <option value="2nd Follow-up">2nd Follow-up</option>
                <option value="3rd Follow-up">3rd Follow-up</option>
                <option value="Proposal">Proposal</option>
                <option value="Final Notice">Final Notice</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 border border-gray-300 dark:border-gray-600"
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Subject Line</label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="Enter email subject..."
              className="w-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 border border-gray-300 dark:border-gray-600"
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Email Body</label>
            <RichTextEditor
              value={formData.body}
              onChange={(html) => setFormData({ ...formData, body: html })}
              placeholder="Compose your email..."
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
          <button onClick={onClose} className="px-4 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white">Cancel</button>
          <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50 flex items-center gap-2">
            {isSaving ? <Clock className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {template ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Create Set Modal
const CreateSetModal = ({ isOpen, onClose, set, onSave }) => {
  const [formData, setFormData] = useState({ name: '', description: '', is_public: false });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (set) {
      setFormData({ name: set.name, description: set.description || '', is_public: set.is_public });
    } else {
      setFormData({ name: '', description: '', is_public: false });
    }
  }, [set]);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }
    setIsSaving(true);
    try {
      if (set) {
        await emailTemplateSetsAPI.update(set.id, formData);
        toast.success('Set updated');
      } else {
        await emailTemplateSetsAPI.create(formData);
        toast.success('Set created');
      }
      onSave();
      onClose();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{set ? 'Edit Template Set' : 'Create Template Set'}</h3>
          <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Set Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Cold Outreach Set"
              className="w-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 border border-gray-300 dark:border-gray-600"
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="Describe the purpose of this template set..."
              className="w-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 border border-gray-300 dark:border-gray-600 resize-none"
            />
          </div>
          
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_public}
              onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
              className="rounded bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600"
            />
            Make this set public (all team members can use and edit)
          </label>
        </div>
        
        <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
          <button onClick={onClose} className="px-4 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white">Cancel</button>
          <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50">
            {set ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Comments/Social Layer Component
const CommentsPanel = ({ setId, comments, onAddComment }) => {
  const [newComment, setNewComment] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async () => {
    if (!newComment.trim()) return;
    setIsAdding(true);
    try {
      await onAddComment(setId, newComment);
      setNewComment('');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-800/30 rounded-lg p-4">
      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
        <MessageSquare className="w-4 h-4" />
        Team Comments
      </h4>
      
      <div className="space-y-3 max-h-40 overflow-y-auto mb-3">
        {comments?.length === 0 && (
          <p className="text-sm text-gray-400 dark:text-gray-500">No comments yet. Start the conversation!</p>
        )}
        {comments?.map((comment) => (
          <div key={comment.id} className="text-sm">
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {comment.employee?.first_name ? `${comment.employee.first_name} ${comment.employee.last_name}` : 'Team Member'}:
            </span>
            <span className="text-gray-500 dark:text-gray-400 ml-2">{comment.content}</span>
          </div>
        ))}
      </div>
      
      <div className="flex gap-2">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="flex-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm rounded-lg px-3 py-1.5 border border-gray-300 dark:border-gray-600"
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button onClick={handleAdd} disabled={isAdding} className="px-3 py-1.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-white text-sm rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50">
          Post
        </button>
      </div>
    </div>
  );
};

// Main Component
const CRMEmailsPage = () => {
  const { user } = useAuth();
  const [templateSets, setTemplateSets] = useState([]);
  const [selectedSet, setSelectedSet] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // UI State
  const [viewMode, setViewMode] = useState('card'); // card, list, kanban
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateSetModal, setShowCreateSetModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingSet, setEditingSet] = useState(null);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  
  // Access control
  const [accessInfo, setAccessInfo] = useState({ isCEO: false, isSupervisor: false });

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Check access - admins and super_admins always have access
        const isCEO = user?.role === 'super_admin';
        const isAdmin = user?.role === 'admin' || user?.role === 'manager';
        let isSupervisor = isCEO || isAdmin;
        let employeeId = user?.employeeId;
        
        // If not admin, check Marketing department membership
        if (!isCEO && !isAdmin) {
          try {
            const emps = await marketingAnalyticsAPI.getMarketingEmployees();
            const currentEmp = emps?.find(e => e.id === user?.employeeId);
            if (!currentEmp) {
              setError('Access denied. This page is for Admin, Manager, or Marketing department only.');
              setLoading(false);
              return;
            }
            isSupervisor = currentEmp?.designation?.toLowerCase().includes('supervisor') || 
                           currentEmp?.designation?.toLowerCase().includes('manager');
            employeeId = currentEmp?.id;
          } catch (e) {
            console.log('Could not verify department access:', e.message);
          }
        }
        
        setAccessInfo({ isCEO, isSupervisor, employeeId });
        
        // Load template sets - handle missing table gracefully
        try {
          const sets = await emailTemplateSetsAPI.getAll();
          setTemplateSets(sets || []);
        } catch (e) {
          if (e.message?.includes('email_template_sets') || e.message?.includes('schema cache')) {
            console.warn('Email template tables not yet created. Please run the migration SQL.');
            setTemplateSets([]);
          } else {
            throw e;
          }
        }
        
        // Load analytics if supervisor/CEO
        if (isCEO || isSupervisor) {
          try {
            const analyticsData = await emailTemplateAnalyticsAPI.getTemplateStats();
            setStats(analyticsData?.allStats || []);
          } catch (e) {
            console.log('Analytics not available:', e.message);
          }
        }
      } catch (err) {
        console.error('Failed to load email templates:', err);
        // Don't show access denied for table-not-found errors
        if (err.message?.includes('schema cache') || err.message?.includes('not found')) {
          setError('Database tables not yet created. Please run the migration SQL in Supabase.');
        } else {
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [user]);

  // Load templates when set is selected
  useEffect(() => {
    if (selectedSet) {
      setTemplates(selectedSet.templates || []);
    } else {
      setTemplates([]);
    }
  }, [selectedSet]);

  // Refresh data
  const refreshData = async () => {
    try {
      const sets = await emailTemplateSetsAPI.getAll();
      setTemplateSets(sets || []);
      if (selectedSet) {
        const updatedSet = sets?.find(s => s.id === selectedSet.id);
        setSelectedSet(updatedSet || null);
      }
    } catch (error) {
      toast.error('Failed to refresh: ' + error.message);
    }
  };

  // Copy template content
  const handleCopy = (template) => {
    navigator.clipboard.writeText(`Subject: ${template.subject}\n\n${template.body?.replace(/<[^>]*>/g, '')}`);
    toast.success('Copied to clipboard!');
  };

  // Delete template
  const handleDeleteTemplate = async (id) => {
    if (!confirm('Delete this template?')) return;
    try {
      await emailTemplatesAPI.delete(id);
      toast.success('Template deleted');
      refreshData();
    } catch (error) {
      toast.error(error.message);
    }
  };

  // Delete set
  const handleDeleteSet = async (id) => {
    if (!confirm('Delete this template set and all its templates?')) return;
    try {
      await emailTemplateSetsAPI.delete(id);
      toast.success('Set deleted');
      if (selectedSet?.id === id) setSelectedSet(null);
      refreshData();
    } catch (error) {
      toast.error(error.message);
    }
  };

  // Add comment
  const handleAddComment = async (setId, content) => {
    try {
      await emailTemplateSetsAPI.addComment(setId, content);
      toast.success('Comment added');
      refreshData();
    } catch (error) {
      toast.error(error.message);
    }
  };

  // Can edit check
  const canEditSet = (set) => {
    return accessInfo.isCEO || accessInfo.isSupervisor || set?.created_by === accessInfo.employeeId || set?.is_public;
  };

  const canEditTemplate = (template) => {
    if (accessInfo.isCEO || accessInfo.isSupervisor) return true;
    if (template?.created_by === accessInfo.employeeId) return true;
    const set = templateSets.find(s => s.id === template?.template_set_id);
    return set?.is_public;
  };

  // Filter templates
  const filteredTemplates = useMemo(() => {
    if (!searchQuery) return templates;
    const query = searchQuery.toLowerCase();
    return templates.filter(t => 
      t.subject?.toLowerCase().includes(query) || 
      t.type?.toLowerCase().includes(query)
    );
  }, [templates, searchQuery]);

  // Kanban columns
  const kanbanColumns = useMemo(() => {
    const types = ['First Email', '1st Follow-up', '2nd Follow-up', '3rd Follow-up', 'Proposal', 'Final Notice'];
    return types.map(type => ({
      type,
      templates: filteredTemplates.filter(t => t.type === type),
    }));
  }, [filteredTemplates]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Clock className="w-8 h-8 text-pink-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <XCircle className="w-12 h-12 text-red-400 mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Access Denied</h3>
        <p className="text-gray-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Mail className="w-7 h-7 text-rose-500 dark:text-rose-400" />
            CRM Emails
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Email Template Management System</p>
        </div>
        <div className="flex items-center gap-2">
          {(accessInfo.isCEO || accessInfo.isSupervisor) && (
            <button
              onClick={() => setShowAnalytics(!showAnalytics)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${showAnalytics ? 'bg-pink-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
            >
              <BarChart3 className="w-4 h-4" />
              Analytics
            </button>
          )}
          <button
            onClick={() => { setEditingSet(null); setShowCreateSetModal(true); }}
            className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Set
          </button>
        </div>
      </div>

      {/* Analytics Panel */}
      {showAnalytics && stats.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Trending */}
          <div className="bg-white dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700/50 shadow-sm">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500 dark:text-green-400" />
              Trending Templates
            </h3>
            <div className="space-y-2">
              {stats.sort((a, b) => parseFloat(b.replyRate) - parseFloat(a.replyRate)).slice(0, 3).map((s, i) => (
                <div key={s.templateId} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300 truncate flex-1">{s.subject}</span>
                  <span className="text-green-600 dark:text-green-400 ml-2">{s.replyRate}%</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Best Results */}
          <div className="bg-white dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700/50 shadow-sm">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Award className="w-4 h-4 text-yellow-500 dark:text-yellow-400" />
              Best Converting
            </h3>
            <div className="space-y-2">
              {stats.sort((a, b) => b.clients - a.clients).slice(0, 3).map((s, i) => (
                <div key={s.templateId} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300 truncate flex-1">{s.subject}</span>
                  <span className="text-yellow-600 dark:text-yellow-400 ml-2">{s.clients} clients</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Needs Review */}
          <div className="bg-white dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700/50 shadow-sm">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500 dark:text-orange-400" />
              Needs Review
            </h3>
            <div className="space-y-2">
              {stats.filter(s => s.sent > 5 && parseFloat(s.replyRate) < 5).slice(0, 3).map((s, i) => (
                <div key={s.templateId} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300 truncate flex-1">{s.subject}</span>
                  <span className="text-orange-600 dark:text-orange-400 ml-2">{s.replyRate}%</span>
                </div>
              ))}
              {stats.filter(s => s.sent > 5 && parseFloat(s.replyRate) < 5).length === 0 && (
                <p className="text-sm text-gray-400 dark:text-gray-500">All templates performing well!</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Template Sets Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Template Sets</h3>
          <div className="space-y-3">
            {templateSets.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">No template sets yet. Create one to get started!</p>
            ) : (
              templateSets.map(set => (
                <TemplateSetCard
                  key={set.id}
                  set={set}
                  stats={stats}
                  onSelect={setSelectedSet}
                  onEdit={(s) => { setEditingSet(s); setShowCreateSetModal(true); }}
                  onDelete={handleDeleteSet}
                  canEdit={canEditSet(set)}
                  isSelected={selectedSet?.id === set.id}
                />
              ))
            )}
          </div>
        </div>

        {/* Templates Panel */}
        <div className="lg:col-span-3 space-y-4">
          {selectedSet ? (
            <>
              {/* Set Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{selectedSet.name}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{selectedSet.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  {/* View Mode Toggle */}
                  <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                    <button onClick={() => setViewMode('card')} className={`p-1.5 rounded ${viewMode === 'card' ? 'bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`} title="Card View">
                      <Grid className="w-4 h-4" />
                    </button>
                    <button onClick={() => setViewMode('list')} className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`} title="List View">
                      <List className="w-4 h-4" />
                    </button>
                    <button onClick={() => setViewMode('kanban')} className={`p-1.5 rounded ${viewMode === 'kanban' ? 'bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`} title="Kanban View">
                      <Columns className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm rounded-lg border border-gray-300 dark:border-gray-600 w-48"
                    />
                  </div>
                  
                  {canEditSet(selectedSet) && (
                    <button
                      onClick={() => { setEditingTemplate(null); setShowTemplateModal(true); }}
                      className="px-3 py-2 bg-pink-600 text-white text-sm rounded-lg hover:bg-pink-700 flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Template
                    </button>
                  )}
                </div>
              </div>

              {/* Comments Section */}
              <CommentsPanel
                setId={selectedSet.id}
                comments={selectedSet.comments}
                onAddComment={handleAddComment}
              />

              {/* Templates Display */}
              {viewMode === 'card' && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredTemplates.map(template => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      stats={stats}
                      onEdit={(t) => { setEditingTemplate(t); setShowTemplateModal(true); }}
                      onDelete={handleDeleteTemplate}
                      onCopy={handleCopy}
                      canEdit={canEditTemplate(template)}
                    />
                  ))}
                  {filteredTemplates.length === 0 && (
                    <p className="col-span-full text-center text-gray-500 py-8">No templates in this set yet.</p>
                  )}
                </div>
              )}

              {viewMode === 'list' && (
                <div className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700/50 overflow-hidden shadow-sm">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-900/50">
                      <tr className="text-left text-xs text-gray-500 dark:text-gray-400 uppercase">
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Subject</th>
                        <th className="px-4 py-3">Priority</th>
                        <th className="px-4 py-3">Stats</th>
                        <th className="px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTemplates.map(template => {
                        const templateStats = stats.find(s => s.templateId === template.id);
                        return (
                          <tr key={template.id} className="border-t border-gray-200 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                            <td className="px-4 py-3"><TypeBadge type={template.type} /></td>
                            <td className="px-4 py-3 text-gray-900 dark:text-white">{template.subject}</td>
                            <td className="px-4 py-3"><PriorityBadge priority={template.priority} /></td>
                            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                              {templateStats ? `${templateStats.sent} sent • ${templateStats.replyRate}% reply` : '-'}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <button onClick={() => handleCopy(template)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white">
                                  <Copy className="w-4 h-4" />
                                </button>
                                {canEditTemplate(template) && (
                                  <>
                                    <button onClick={() => { setEditingTemplate(template); setShowTemplateModal(true); }} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white">
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDeleteTemplate(template.id)} className="p-1 hover:bg-red-50 dark:hover:bg-red-500/20 rounded text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400">
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {viewMode === 'kanban' && (
                <div className="flex gap-4 overflow-x-auto pb-4">
                  {kanbanColumns.map(col => (
                    <div key={col.type} className="flex-shrink-0 w-72">
                      <div className="bg-gray-50 dark:bg-gray-800/30 rounded-xl p-3">
                        <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-3 flex items-center justify-between">
                          <TypeBadge type={col.type} />
                          <span className="text-gray-400 dark:text-gray-500">{col.templates.length}</span>
                        </h4>
                        <div className="space-y-3">
                          {col.templates.map(template => (
                            <div key={template.id} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700/50 shadow-sm">
                              <div className="flex items-center justify-between mb-2">
                                <PriorityBadge priority={template.priority} />
                                <PerformanceBadge stats={stats.find(s => s.templateId === template.id)} />
                              </div>
                              <p className="text-sm text-gray-900 dark:text-white mb-2 line-clamp-2">{template.subject}</p>
                              <div className="flex items-center gap-1">
                                <button onClick={() => handleCopy(template)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white">
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                {canEditTemplate(template) && (
                                  <button onClick={() => { setEditingTemplate(template); setShowTemplateModal(true); }} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white">
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="w-16 h-16 text-gray-400 dark:text-gray-600 mb-4" />
              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">Select a Template Set</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">Choose a set from the sidebar to view its templates</p>
              <button
                onClick={() => { setEditingSet(null); setShowCreateSetModal(true); }}
                className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create Your First Set
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <CreateSetModal
        isOpen={showCreateSetModal}
        onClose={() => { setShowCreateSetModal(false); setEditingSet(null); }}
        set={editingSet}
        onSave={refreshData}
      />
      
      <TemplateModal
        isOpen={showTemplateModal}
        onClose={() => { setShowTemplateModal(false); setEditingTemplate(null); }}
        template={editingTemplate}
        setId={selectedSet?.id}
        onSave={refreshData}
      />
    </div>
  );
};

export default CRMEmailsPage;
