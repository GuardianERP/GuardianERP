import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table';
import {
  Plus, Upload, Download, Search, Filter, RefreshCw, Users, Phone, Calendar,
  TrendingUp, Award, Target, CheckCircle, Clock, AlertCircle, Edit2, Trash2,
  ArrowUpDown, ChevronLeft, ChevronRight, X, Save, UserPlus, BarChart3,
  Briefcase, Mail, MapPin, Building, Globe, FileText, MessageSquare
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { marketingCampaignsAPI, marketingLeadsAPI, marketingAnalyticsAPI } from '../services/api';
import { useAuth } from '../store/AuthContext';
import toast from 'react-hot-toast';

// Editable Cell Component
const EditableCell = ({ getValue, row, column, table }) => {
  const initialValue = getValue();
  const [value, setValue] = useState(initialValue);
  const [isEditing, setIsEditing] = useState(false);
  const columnMeta = column.columnDef.meta;

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const onBlur = () => {
    setIsEditing(false);
    if (value !== initialValue) {
      table.options.meta?.updateData(row.index, column.id, value);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      onBlur();
    } else if (e.key === 'Escape') {
      setValue(initialValue);
      setIsEditing(false);
    }
  };

  if (!columnMeta?.editable) {
    return <span className="text-gray-700 dark:text-gray-300">{value || '-'}</span>;
  }

  if (isEditing) {
    if (columnMeta?.type === 'select') {
      return (
        <select
          value={value || ''}
          onChange={(e) => setValue(e.target.value)}
          onBlur={onBlur}
          autoFocus
          className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm rounded px-2 py-1 border border-blue-500 focus:outline-none"
        >
          <option value="">Select...</option>
          {columnMeta.options?.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );
    }
    if (columnMeta?.type === 'date') {
      return (
        <input
          type="date"
          value={value || ''}
          onChange={(e) => setValue(e.target.value)}
          onBlur={onBlur}
          onKeyDown={handleKeyDown}
          autoFocus
          className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm rounded px-2 py-1 border border-blue-500 focus:outline-none"
        />
      );
    }
    if (columnMeta?.type === 'textarea') {
      return (
        <textarea
          value={value || ''}
          onChange={(e) => setValue(e.target.value)}
          onBlur={onBlur}
          onKeyDown={handleKeyDown}
          autoFocus
          rows={2}
          className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm rounded px-2 py-1 border border-blue-500 focus:outline-none resize-none"
        />
      );
    }
    return (
      <input
        type={columnMeta?.type || 'text'}
        value={value || ''}
        onChange={(e) => setValue(e.target.value)}
        onBlur={onBlur}
        onKeyDown={handleKeyDown}
        autoFocus
        className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm rounded px-2 py-1 border border-blue-500 focus:outline-none"
      />
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 px-1 py-0.5 rounded min-h-[24px] text-gray-700 dark:text-gray-300"
    >
      {value || <span className="text-gray-400 dark:text-gray-500 italic">Click to edit</span>}
    </div>
  );
};

// Status Badge Component
const StatusBadge = ({ status }) => {
  const statusColors = {
    'Decision Pending': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    'Meeting Scheduled': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'Follow Up': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    'Not Interested': 'bg-red-500/20 text-red-400 border-red-500/30',
    'Client Landed': 'bg-green-500/20 text-green-400 border-green-500/30',
  };
  return (
    <span className={`px-2 py-1 text-xs rounded-full border ${statusColors[status] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}>
      {status || 'Unknown'}
    </span>
  );
};

// Analytics Card Component
const AnalyticsCard = ({ icon: Icon, label, value, trend, color }) => (
  <div className={`bg-white dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700/50 shadow-md dark:shadow-sm hover:shadow-lg transition-shadow`}>
    <div className="flex items-center justify-between mb-2">
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      {trend && (
        <span className={`text-xs ${trend > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          {trend > 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
    <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
    <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
  </div>
);

// CSV Upload Modal
const CSVUploadModal = ({ isOpen, onClose, onUpload, campaignId }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [mapping, setMapping] = useState({});
  const [isUploading, setIsUploading] = useState(false);

  const requiredFields = [
    'practice_name', 'category', 'phone_number', 'address', 'city', 'state', 'zip_code'
  ];

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target.result;
        const lines = text.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const rows = lines.slice(1, 6).map(line => {
          const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
          return headers.reduce((obj, header, i) => ({ ...obj, [header]: values[i] }), {});
        });
        setPreview(rows);
        // Auto-map fields
        const autoMapping = {};
        headers.forEach(h => {
          const normalized = h.toLowerCase().replace(/[^a-z]/g, '');
          if (normalized.includes('practice') || normalized.includes('name')) autoMapping[h] = 'practice_name';
          else if (normalized.includes('category') || normalized.includes('type')) autoMapping[h] = 'category';
          else if (normalized.includes('phone') || normalized.includes('tel')) autoMapping[h] = 'phone_number';
          else if (normalized.includes('address') || normalized.includes('street')) autoMapping[h] = 'address';
          else if (normalized.includes('city')) autoMapping[h] = 'city';
          else if (normalized.includes('state')) autoMapping[h] = 'state';
          else if (normalized.includes('zip') || normalized.includes('postal')) autoMapping[h] = 'zip_code';
          else if (normalized.includes('email')) autoMapping[h] = 'email';
          else if (normalized.includes('website') || normalized.includes('url')) autoMapping[h] = 'website';
          else if (normalized.includes('contact')) autoMapping[h] = 'contact_person';
        });
        setMapping(autoMapping);
      };
      reader.readAsText(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target.result;
        const lines = text.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const leads = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
          const row = headers.reduce((obj, header, i) => ({ ...obj, [header]: values[i] }), {});
          const mappedLead = {};
          Object.entries(mapping).forEach(([csvCol, dbCol]) => {
            if (row[csvCol]) mappedLead[dbCol] = row[csvCol];
          });
          return mappedLead;
        }).filter(lead => lead.practice_name);
        
        await onUpload(leads, campaignId);
        onClose();
      };
      reader.readAsText(file);
    } catch (error) {
      toast.error('Upload failed: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Upload CSV</h3>
          <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          {!file ? (
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-700 dark:text-gray-300 mb-2">Drag & drop your CSV file here</p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mb-4">or</p>
              <label className="px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700">
                Browse Files
                <input type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
              </label>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <h4 className="text-gray-900 dark:text-white font-medium mb-2">Field Mapping</h4>
                <div className="grid grid-cols-2 gap-2">
                  {Object.keys(preview[0] || {}).map(csvCol => (
                    <div key={csvCol} className="flex items-center gap-2">
                      <span className="text-gray-500 dark:text-gray-400 text-sm w-32 truncate">{csvCol}</span>
                      <select
                        value={mapping[csvCol] || ''}
                        onChange={(e) => setMapping({ ...mapping, [csvCol]: e.target.value })}
                        className="flex-1 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm rounded px-2 py-1 border border-gray-300 dark:border-gray-600"
                      >
                        <option value="">-- Skip --</option>
                        <option value="practice_name">Practice Name</option>
                        <option value="category">Category</option>
                        <option value="phone_number">Phone</option>
                        <option value="email">Email</option>
                        <option value="address">Address</option>
                        <option value="city">City</option>
                        <option value="state">State</option>
                        <option value="zip_code">Zip Code</option>
                        <option value="website">Website</option>
                        <option value="contact_person">Contact Person</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mb-4">
                <h4 className="text-gray-900 dark:text-white font-medium mb-2">Preview (first 5 rows)</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-100 dark:bg-gray-700">
                        {Object.keys(preview[0] || {}).map(h => (
                          <th key={h} className="px-2 py-1 text-left text-gray-700 dark:text-gray-300">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, i) => (
                        <tr key={i} className="border-b border-gray-200 dark:border-gray-700">
                          {Object.values(row).map((v, j) => (
                            <td key={j} className="px-2 py-1 text-gray-600 dark:text-gray-400 truncate max-w-[150px]">{v}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
        {file && (
          <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
            <button onClick={() => { setFile(null); setPreview([]); }} className="px-4 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white">
              Reset
            </button>
            <button
              onClick={handleUpload}
              disabled={isUploading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {isUploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Upload Leads
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Transfer Modal
const TransferModal = ({ isOpen, onClose, lead, employees, onTransfer }) => {
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [reason, setReason] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);

  const handleTransfer = async () => {
    if (!selectedEmployee) {
      toast.error('Please select an employee');
      return;
    }
    setIsTransferring(true);
    try {
      await onTransfer(lead.id, selectedEmployee, reason);
      onClose();
      toast.success('Lead transferred successfully');
    } catch (error) {
      toast.error('Transfer failed: ' + error.message);
    } finally {
      setIsTransferring(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Transfer Lead</h3>
          <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Lead</label>
            <p className="text-gray-900 dark:text-white">{lead?.practice_name}</p>
          </div>
          <div>
            <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Transfer To</label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 border border-gray-300 dark:border-gray-600"
            >
              <option value="">Select Employee</option>
              {employees.filter(e => e.id !== lead?.assigned_to).map(emp => (
                <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Reason (optional)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 border border-gray-300 dark:border-gray-600 resize-none"
              placeholder="Why is this lead being transferred?"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
          <button onClick={onClose} className="px-4 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white">Cancel</button>
          <button
            onClick={handleTransfer}
            disabled={isTransferring || !selectedEmployee}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {isTransferring ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            Transfer
          </button>
        </div>
      </div>
    </div>
  );
};

// Bulk Transfer Modal
const BulkTransferModal = ({ isOpen, onClose, selectedCount, employees, onTransfer }) => {
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [reason, setReason] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);

  const handleTransfer = async () => {
    if (!selectedEmployee) {
      toast.error('Please select an employee');
      return;
    }
    setIsTransferring(true);
    try {
      await onTransfer(selectedEmployee, reason);
    } catch (error) {
      toast.error('Transfer failed: ' + error.message);
    } finally {
      setIsTransferring(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Bulk Transfer Leads</h3>
          <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-4">
          <div className="bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 px-3 py-2 rounded-lg text-sm">
            <Users className="w-4 h-4 inline mr-2" />
            {selectedCount} lead{selectedCount > 1 ? 's' : ''} selected for transfer
          </div>
          <div>
            <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Transfer To</label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 border border-gray-300 dark:border-gray-600"
            >
              <option value="">Select Employee</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Reason (optional)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 border border-gray-300 dark:border-gray-600 resize-none"
              placeholder="Why are these leads being transferred?"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
          <button onClick={onClose} className="px-4 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white">Cancel</button>
          <button
            onClick={handleTransfer}
            disabled={isTransferring || !selectedEmployee}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
          >
            {isTransferring ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            Transfer All
          </button>
        </div>
      </div>
    </div>
  );
};

// Bulk Edit Modal - Edit multiple leads at once
const BulkEditModal = ({ isOpen, onClose, selectedCount, onSave, columns }) => {
  const [selectedColumn, setSelectedColumn] = useState('');
  const [newValue, setNewValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const editableColumns = columns.filter(c => c.meta?.editable && c.accessorKey);
  const selectedColMeta = editableColumns.find(c => c.accessorKey === selectedColumn)?.meta;

  const handleSave = async () => {
    if (!selectedColumn) {
      toast.error('Please select a column to edit');
      return;
    }
    setIsSaving(true);
    try {
      await onSave(selectedColumn, newValue);
      setSelectedColumn('');
      setNewValue('');
    } catch (error) {
      toast.error('Bulk edit failed: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Bulk Edit Leads</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-4">
          <div className="bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 px-3 py-2 rounded-lg text-sm">
            <Edit2 className="w-4 h-4 inline mr-2" />
            {selectedCount} lead{selectedCount > 1 ? 's' : ''} selected for editing
          </div>
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Select Column to Edit</label>
            <select
              value={selectedColumn}
              onChange={(e) => { setSelectedColumn(e.target.value); setNewValue(''); }}
              className="w-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 border border-gray-300 dark:border-gray-600"
            >
              <option value="">Choose column...</option>
              {editableColumns.map(col => (
                <option key={col.accessorKey} value={col.accessorKey}>{col.header}</option>
              ))}
            </select>
          </div>
          {selectedColumn && (
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">New Value</label>
              {selectedColMeta?.type === 'select' ? (
                <select
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 border border-gray-300 dark:border-gray-600"
                >
                  <option value="">Select value...</option>
                  {selectedColMeta.options?.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : selectedColMeta?.type === 'date' ? (
                <input
                  type="date"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 border border-gray-300 dark:border-gray-600"
                />
              ) : selectedColMeta?.type === 'textarea' ? (
                <textarea
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  rows={3}
                  className="w-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 border border-gray-300 dark:border-gray-600 resize-none"
                  placeholder="Enter new value..."
                />
              ) : (
                <input
                  type={selectedColMeta?.type || 'text'}
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 border border-gray-300 dark:border-gray-600"
                  placeholder="Enter new value..."
                />
              )}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">Cancel</button>
          <button
            onClick={handleSave}
            disabled={isSaving || !selectedColumn}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Update All
          </button>
        </div>
      </div>
    </div>
  );
};

// Main Component
const MarketingCRMPage = () => {
  const { user } = useAuth();
  const [leads, setLeads] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [teamPerformance, setTeamPerformance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // UI State
  const [activeTab, setActiveTab] = useState('all');
  const [activeCampaign, setActiveCampaign] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState([]);
  const [showNewCampaignModal, setShowNewCampaignModal] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState('');
  const [rowSelection, setRowSelection] = useState({});
  const [showBulkTransferModal, setShowBulkTransferModal] = useState(false);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  
  // Access control
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const [accessInfo, setAccessInfo] = useState({ isCEO: false, isSupervisor: false });

  // Check access and load data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Check access - admins and super_admins always have access
        const isCEO = user?.role === 'super_admin';
        const isAdmin = user?.role === 'admin' || user?.role === 'manager';
        let isSupervisor = isCEO || isAdmin;
        
        // Get employees (for dropdown and team info)
        let emps = [];
        try {
          emps = await marketingAnalyticsAPI.getMarketingEmployees();
          setEmployees(emps || []);
          
          // If not admin, verify Marketing department membership
          if (!isCEO && !isAdmin) {
            const currentEmp = emps?.find(e => e.id === user?.employeeId);
            if (!currentEmp) {
              setError('Access denied. This page is for Admin, Manager, or Marketing department only.');
              setLoading(false);
              return;
            }
            isSupervisor = currentEmp?.designation?.toLowerCase().includes('supervisor') || 
                           currentEmp?.designation?.toLowerCase().includes('manager');
          }
        } catch (e) {
          console.log('Could not load employees:', e.message);
        }
        
        setAccessInfo({ isCEO, isSupervisor });
        
        // Load campaigns
        const camps = await marketingCampaignsAPI.getAll();
        setCampaigns(camps || []);
        
        // Load leads
        const leadsData = await marketingLeadsAPI.getAll({ campaignId: activeCampaign });
        setLeads(leadsData || []);
        
        // Load analytics
        const analyticsData = await marketingAnalyticsAPI.getAnalytics();
        setAnalytics(analyticsData);
        
        // Load team performance if supervisor/CEO
        if (isCEO || isSupervisor) {
          try {
            const teamData = await marketingAnalyticsAPI.getTeamPerformance();
            setTeamPerformance(teamData);
          } catch (e) {
            console.log('Team performance not available:', e.message);
          }
        }
      } catch (err) {
        console.error('Failed to load marketing data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [user, activeCampaign]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('marketing-leads-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'marketing_leads' }, (payload) => {
        console.log('Lead change:', payload);
        if (payload.eventType === 'INSERT') {
          setLeads(prev => [payload.new, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setLeads(prev => prev.map(l => l.id === payload.new.id ? { ...l, ...payload.new } : l));
        } else if (payload.eventType === 'DELETE') {
          setLeads(prev => prev.filter(l => l.id !== payload.old.id));
        }
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Table columns
  const columns = useMemo(() => [
    {
      id: 'select',
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
          className="w-3.5 h-3.5 rounded border-gray-500 bg-gray-700 text-blue-600"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          className="w-3.5 h-3.5 rounded border-gray-500 bg-gray-700 text-blue-600"
        />
      ),
      size: 32,
    },
    {
      accessorKey: 'assigned_date',
      header: 'Assigned',
      size: 80,
      meta: { editable: accessInfo.isCEO || accessInfo.isSupervisor, type: 'date' },
      cell: EditableCell,
    },
    {
      accessorKey: 'practice_name',
      header: 'Practice',
      size: 140,
      meta: { editable: true, type: 'text' },
      cell: EditableCell,
    },
    {
      accessorKey: 'category',
      header: 'Category',
      size: 90,
      meta: { editable: true, type: 'select', options: ['Dentist', 'Orthodontist', 'Periodontist', 'Endodontist', 'Oral Surgeon', 'Pediatric', 'Other'] },
      cell: EditableCell,
    },
    {
      accessorKey: 'phone_number',
      header: 'Phone',
      size: 95,
      meta: { editable: true, type: 'tel' },
      cell: EditableCell,
    },
    {
      accessorKey: 'city',
      header: 'City',
      size: 75,
      meta: { editable: true, type: 'text' },
      cell: EditableCell,
    },
    {
      accessorKey: 'state',
      header: 'St',
      size: 40,
      meta: { editable: true, type: 'text' },
      cell: EditableCell,
    },
    {
      accessorKey: 'calling_date',
      header: 'Called',
      size: 80,
      meta: { editable: true, type: 'date' },
      cell: EditableCell,
    },
    {
      accessorKey: 'call_status',
      header: 'Call Status',
      size: 95,
      meta: { editable: true, type: 'select', options: ['Not Called', 'Called - No Answer', 'Called - Voicemail', 'Called - Spoke', 'Called - Follow Up'] },
      cell: EditableCell,
    },
    {
      accessorKey: 'overall_status',
      header: 'Status',
      size: 100,
      meta: { editable: true, type: 'select', options: ['Decision Pending', 'Meeting Scheduled', 'Follow Up', 'Not Interested', 'Client Landed'] },
      cell: ({ getValue }) => <StatusBadge status={getValue()} />,
    },
    {
      accessorKey: 'follow_up_required',
      header: 'F/U',
      size: 50,
      meta: { editable: true, type: 'select', options: ['Yes', 'No'] },
      cell: EditableCell,
    },
    {
      accessorKey: 'meeting_date',
      header: 'Meeting',
      size: 80,
      meta: { editable: true, type: 'date' },
      cell: EditableCell,
    },
    {
      accessorKey: 'remarks',
      header: 'Remarks',
      size: 120,
      meta: { editable: true, type: 'textarea' },
      cell: EditableCell,
    },
    {
      accessorKey: 'supervisor_remarks',
      header: 'Sup Notes',
      size: 120,
      meta: { editable: accessInfo.isCEO || accessInfo.isSupervisor, type: 'textarea' },
      cell: EditableCell,
    },
    {
      accessorKey: 'ceo_remarks',
      header: 'CEO Notes',
      size: 120,
      meta: { editable: accessInfo.isCEO, type: 'textarea' },
      cell: EditableCell,
    },
    {
      id: 'actions',
      header: '',
      size: 70,
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => { setSelectedLead(row.original); setShowTransferModal(true); }}
            className="p-1 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 rounded"
            title="Transfer Lead"
          >
            <UserPlus className="w-3.5 h-3.5" />
          </button>
          {(accessInfo.isCEO || accessInfo.isSupervisor) && (
            <button
              onClick={() => handleDeleteLead(row.original.id)}
              className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded"
              title="Delete Lead"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ], [accessInfo]);

  // Update lead data
  const updateData = useCallback(async (rowIndex, columnId, value) => {
    const lead = leads[rowIndex];
    if (!lead) return;
    
    try {
      await marketingLeadsAPI.update(lead.id, { [columnId]: value });
      setLeads(prev => prev.map((l, i) => i === rowIndex ? { ...l, [columnId]: value } : l));
      toast.success('Updated successfully');
    } catch (error) {
      toast.error('Update failed: ' + error.message);
    }
  }, [leads]);

  // Table instance
  const table = useReactTable({
    data: leads,
    columns,
    state: { sorting, globalFilter, rowSelection },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    meta: { updateData },
    initialState: { pagination: { pageSize: 50 } },
  });

  // Get selected leads
  const selectedLeadIds = Object.keys(rowSelection).filter(k => rowSelection[k]).map(k => leads[parseInt(k)]?.id).filter(Boolean);

  // Bulk transfer handler
  const handleBulkTransfer = async (toEmployeeId, reason) => {
    if (selectedLeadIds.length === 0) {
      toast.error('No leads selected');
      return;
    }
    try {
      for (const leadId of selectedLeadIds) {
        await marketingLeadsAPI.transfer(leadId, toEmployeeId, reason);
      }
      toast.success(`${selectedLeadIds.length} leads transferred successfully`);
      setRowSelection({});
      setShowBulkTransferModal(false);
      // Refresh leads
      const newLeads = await marketingLeadsAPI.getAll({ campaignId: activeCampaign });
      setLeads(newLeads || []);
    } catch (error) {
      toast.error('Bulk transfer failed: ' + error.message);
    }
  };

  // Bulk edit handler
  const handleBulkEdit = async (columnId, newValue) => {
    if (selectedLeadIds.length === 0) {
      toast.error('No leads selected');
      return;
    }
    try {
      for (const leadId of selectedLeadIds) {
        await marketingLeadsAPI.update(leadId, { [columnId]: newValue });
      }
      // Update local state
      setLeads(prev => prev.map(l => 
        selectedLeadIds.includes(l.id) ? { ...l, [columnId]: newValue } : l
      ));
      toast.success(`${selectedLeadIds.length} leads updated successfully`);
      setRowSelection({});
      setShowBulkEditModal(false);
    } catch (error) {
      toast.error('Bulk edit failed: ' + error.message);
    }
  };

  // Delete selected handler
  const handleDeleteSelected = async () => {
    if (selectedLeadIds.length === 0) {
      toast.error('No leads selected');
      return;
    }
    if (!confirm(`Are you sure you want to delete ${selectedLeadIds.length} lead(s)?`)) return;
    try {
      for (const leadId of selectedLeadIds) {
        await marketingLeadsAPI.delete(leadId);
      }
      setLeads(prev => prev.filter(l => !selectedLeadIds.includes(l.id)));
      toast.success(`${selectedLeadIds.length} leads deleted`);
      setRowSelection({});
    } catch (error) {
      toast.error('Delete failed: ' + error.message);
    }
  };

  // Delete all handler
  const handleDeleteAll = async () => {
    if (leads.length === 0) {
      toast.error('No leads to delete');
      return;
    }
    if (!confirm(`Are you sure you want to delete ALL ${leads.length} leads? This cannot be undone.`)) return;
    try {
      for (const lead of leads) {
        await marketingLeadsAPI.delete(lead.id);
      }
      setLeads([]);
      toast.success('All leads deleted');
      setRowSelection({});
    } catch (error) {
      toast.error('Delete all failed: ' + error.message);
    }
  };

  // Handlers
  const handleDeleteLead = async (id) => {
    if (!confirm('Are you sure you want to delete this lead?')) return;
    try {
      await marketingLeadsAPI.delete(id);
      setLeads(prev => prev.filter(l => l.id !== id));
      toast.success('Lead deleted');
    } catch (error) {
      toast.error('Delete failed: ' + error.message);
    }
  };

  const handleBulkUpload = async (leadsData, campaignId) => {
    try {
      const result = await marketingLeadsAPI.bulkCreate(leadsData, campaignId);
      toast.success(`${result.inserted} leads uploaded successfully`);
      // Refresh leads
      const newLeads = await marketingLeadsAPI.getAll({ campaignId: activeCampaign });
      setLeads(newLeads || []);
    } catch (error) {
      toast.error('Upload failed: ' + error.message);
    }
  };

  const handleTransfer = async (leadId, toEmployeeId, reason) => {
    await marketingLeadsAPI.transfer(leadId, toEmployeeId, reason);
    // Refresh leads
    const newLeads = await marketingLeadsAPI.getAll({ campaignId: activeCampaign });
    setLeads(newLeads || []);
  };

  const handleCreateCampaign = async () => {
    if (!newCampaignName.trim()) {
      toast.error('Please enter a campaign name');
      return;
    }
    try {
      const campaign = await marketingCampaignsAPI.create({ name: newCampaignName });
      setCampaigns(prev => [campaign, ...prev]);
      setNewCampaignName('');
      setShowNewCampaignModal(false);
      toast.success('Campaign created');
    } catch (error) {
      toast.error('Failed to create campaign: ' + error.message);
    }
  };

  const handleAddLead = async () => {
    try {
      const newLead = await marketingLeadsAPI.create({
        practice_name: 'New Lead',
        campaign_id: activeCampaign,
        overall_status: 'Decision Pending',
      });
      setLeads(prev => [newLead, ...prev]);
      toast.success('Lead added - click to edit');
    } catch (error) {
      toast.error('Failed to add lead: ' + error.message);
    }
  };

  const exportToCSV = () => {
    const headers = columns.filter(c => c.id !== 'actions').map(c => c.header || c.id);
    const rows = leads.map(lead => 
      columns.filter(c => c.id !== 'actions').map(c => lead[c.accessorKey] || '')
    );
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `marketing-leads-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Access Denied</h3>
        <p className="text-gray-500 dark:text-gray-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Briefcase className="w-7 h-7 text-pink-500 dark:text-pink-400" />
            Marketing CRM
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {accessInfo.isCEO ? 'CEO View - Full Access' : accessInfo.isSupervisor ? 'Supervisor View' : 'Agent View'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${showAnalytics ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
          >
            <BarChart3 className="w-4 h-4" />
            Analytics
          </button>
          {(accessInfo.isCEO || accessInfo.isSupervisor) && (
            <>
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Upload CSV
              </button>
              <button
                onClick={() => setShowNewCampaignModal(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New Campaign
              </button>
            </>
          )}
        </div>
      </div>

      {/* Analytics Panel */}
      {showAnalytics && analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <AnalyticsCard icon={Target} label="Total Leads" value={analytics.totalLeads} color="bg-blue-500/20 text-blue-400" />
          <AnalyticsCard icon={Phone} label="Calls Today" value={analytics.callsToday} color="bg-green-500/20 text-green-400" />
          <AnalyticsCard icon={Calendar} label="Meetings Scheduled" value={analytics.meetingsScheduled} color="bg-purple-500/20 text-purple-400" />
          <AnalyticsCard icon={CheckCircle} label="Clients Landed" value={analytics.clientsLanded} color="bg-emerald-500/20 text-emerald-400" />
          <AnalyticsCard icon={Clock} label="Pending Follow-ups" value={analytics.pendingFollowups} color="bg-yellow-500/20 text-yellow-400" />
          <AnalyticsCard icon={TrendingUp} label="Meeting Rate" value={`${analytics.meetingRate}%`} color="bg-cyan-500/20 text-cyan-400" />
          <AnalyticsCard icon={Award} label="Conversion Rate" value={`${analytics.conversionRate}%`} color="bg-pink-500/20 text-pink-400" />
        </div>
      )}

      {/* Team Leaderboard for Supervisors/CEO */}
      {showAnalytics && teamPerformance && (accessInfo.isCEO || accessInfo.isSupervisor) && (
        <div className="bg-white dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700/50 shadow-md dark:shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500 dark:text-blue-400" />
            Team Leaderboard
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400 text-sm border-b border-gray-200 dark:border-gray-700">
                  <th className="pb-2 pr-4">Rank</th>
                  <th className="pb-2 pr-4">Employee</th>
                  <th className="pb-2 pr-4">Total Leads</th>
                  <th className="pb-2 pr-4">Meetings</th>
                  <th className="pb-2 pr-4">Clients Landed</th>
                  <th className="pb-2">Conversion Rate</th>
                </tr>
              </thead>
              <tbody>
                {teamPerformance.leaderboard.map((emp, idx) => (
                  <tr key={emp.employeeId} className="border-b border-gray-100 dark:border-gray-700/50">
                    <td className="py-2 pr-4">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-yellow-500 text-black' : idx === 1 ? 'bg-gray-400 text-black' : idx === 2 ? 'bg-orange-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
                        {idx + 1}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-gray-900 dark:text-white">{emp.name}</td>
                    <td className="py-2 pr-4 text-gray-600 dark:text-gray-300">{emp.totalLeads}</td>
                    <td className="py-2 pr-4 text-gray-600 dark:text-gray-300">{emp.meetingsScheduled}</td>
                    <td className="py-2 pr-4 text-green-600 dark:text-green-400 font-medium">{emp.clientsLanded}</td>
                    <td className="py-2 text-blue-600 dark:text-blue-400">{emp.conversionRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Campaign Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveCampaign(null)}
          className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${!activeCampaign ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
        >
          All Leads
        </button>
        {campaigns.map(campaign => (
          <button
            key={campaign.id}
            onClick={() => setActiveCampaign(campaign.id)}
            className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${activeCampaign === campaign.id ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
          >
            {campaign.name}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search leads..."
              value={globalFilter ?? ''}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {selectedLeadIds.length > 0 && (
            <>
              <button
                onClick={() => setShowBulkEditModal(true)}
                className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Edit2 className="w-4 h-4" />
                Edit {selectedLeadIds.length}
              </button>
              <button
                onClick={() => setShowBulkTransferModal(true)}
                className="px-3 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 flex items-center gap-2"
              >
                <Users className="w-4 h-4" />
                Transfer {selectedLeadIds.length}
              </button>
              {isAdmin && (
                <button
                  onClick={handleDeleteSelected}
                  className="px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete {selectedLeadIds.length}
                </button>
              )}
            </>
          )}
          {isAdmin && leads.length > 0 && selectedLeadIds.length === 0 && (
            <button
              onClick={handleDeleteAll}
              className="px-3 py-2 bg-red-500/20 text-red-500 text-sm rounded-lg hover:bg-red-500/30 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete All
            </button>
          )}
          <button
            onClick={handleAddLead}
            className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Lead
          </button>
          <button
            onClick={exportToCSV}
            className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-white text-sm rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700/50 overflow-hidden shadow-md dark:shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th
                      key={header.id}
                      style={{ width: header.getSize() }}
                      className="px-2 py-2 text-left text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div className="flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getIsSorted() && (
                          <ArrowUpDown className="w-2.5 h-2.5" />
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map(row => (
                <tr key={row.id} className={`border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 ${row.getIsSelected() ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-2 py-1.5 text-xs" style={{ width: cell.column.getSize() }}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
            {Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, table.getFilteredRowModel().rows.length)} of{' '}
            {table.getFilteredRowModel().rows.length} leads
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-300">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </span>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CSVUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={handleBulkUpload}
        campaignId={activeCampaign}
      />
      
      <TransferModal
        isOpen={showTransferModal}
        onClose={() => { setShowTransferModal(false); setSelectedLead(null); }}
        lead={selectedLead}
        employees={employees}
        onTransfer={handleTransfer}
      />
      
      {/* New Campaign Modal */}
      {showNewCampaignModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">New Campaign</h3>
              <button onClick={() => setShowNewCampaignModal(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4">
              <label className="block text-sm text-gray-400 mb-2">Campaign Name</label>
              <input
                type="text"
                value={newCampaignName}
                onChange={(e) => setNewCampaignName(e.target.value)}
                placeholder="e.g., Q1 2024 Dental Outreach"
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-gray-700">
              <button onClick={() => setShowNewCampaignModal(false)} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
              <button
                onClick={handleCreateCampaign}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create Campaign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Transfer Modal */}
      {showBulkTransferModal && (
        <BulkTransferModal
          isOpen={showBulkTransferModal}
          onClose={() => setShowBulkTransferModal(false)}
          selectedCount={selectedLeadIds.length}
          employees={employees}
          onTransfer={handleBulkTransfer}
        />
      )}

      {/* Bulk Edit Modal */}
      {showBulkEditModal && (
        <BulkEditModal
          isOpen={showBulkEditModal}
          onClose={() => setShowBulkEditModal(false)}
          selectedCount={selectedLeadIds.length}
          columns={columns}
          onSave={handleBulkEdit}
        />
      )}
    </div>
  );
};

export default MarketingCRMPage;
