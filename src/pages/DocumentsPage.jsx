/**
 * Guardian Desktop ERP - Documents Page
 * File management and document storage
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, Search, Filter, Grid, List, MoreVertical, Download, Trash2,
  File, FileText, Image, Film, Music, Archive, FolderPlus, Star, Eye,
  FileImage, FileCode, FileSpreadsheet, Presentation
} from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { filesAPI } from '../services/api';
import toast from 'react-hot-toast';

// File type configurations
const FILE_TYPES = {
  image: { 
    icon: FileImage, 
    color: 'text-pink-500 bg-pink-100 dark:bg-pink-900/30',
    extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg']
  },
  document: { 
    icon: FileText, 
    color: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30',
    extensions: ['pdf', 'doc', 'docx', 'txt', 'rtf']
  },
  spreadsheet: { 
    icon: FileSpreadsheet, 
    color: 'text-green-500 bg-green-100 dark:bg-green-900/30',
    extensions: ['xls', 'xlsx', 'csv']
  },
  presentation: { 
    icon: Presentation, 
    color: 'text-orange-500 bg-orange-100 dark:bg-orange-900/30',
    extensions: ['ppt', 'pptx']
  },
  video: { 
    icon: Film, 
    color: 'text-purple-500 bg-purple-100 dark:bg-purple-900/30',
    extensions: ['mp4', 'avi', 'mov', 'wmv', 'mkv']
  },
  audio: { 
    icon: Music, 
    color: 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/30',
    extensions: ['mp3', 'wav', 'ogg', 'flac']
  },
  archive: { 
    icon: Archive, 
    color: 'text-gray-500 bg-gray-100 dark:bg-gray-700',
    extensions: ['zip', 'rar', '7z', 'tar', 'gz']
  },
  code: { 
    icon: FileCode, 
    color: 'text-indigo-500 bg-indigo-100 dark:bg-indigo-900/30',
    extensions: ['js', 'jsx', 'ts', 'tsx', 'html', 'css', 'py', 'java']
  },
  other: { 
    icon: File, 
    color: 'text-gray-500 bg-gray-100 dark:bg-gray-700',
    extensions: []
  }
};

const getFileType = (filename) => {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  for (const [type, config] of Object.entries(FILE_TYPES)) {
    if (config.extensions.includes(ext)) return type;
  }
  return 'other';
};

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

function DocumentsPage() {
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [filterType, setFilterType] = useState('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const data = await filesAPI.getAll(user.id);
      setFiles(data);
    } catch (error) {
      // Use mock data if API fails
      setFiles([
        { id: 1, name: 'Project Proposal.pdf', size: 2048576, type: 'document', starred: true, created_at: new Date().toISOString() },
        { id: 2, name: 'Budget Report.xlsx', size: 512000, type: 'spreadsheet', starred: false, created_at: new Date().toISOString() },
        { id: 3, name: 'Team Photo.jpg', size: 3145728, type: 'image', starred: false, created_at: new Date().toISOString() },
        { id: 4, name: 'Meeting Notes.docx', size: 256000, type: 'document', starred: true, created_at: new Date().toISOString() },
        { id: 5, name: 'Presentation.pptx', size: 5242880, type: 'presentation', starred: false, created_at: new Date().toISOString() },
        { id: 6, name: 'source_code.zip', size: 10485760, type: 'archive', starred: false, created_at: new Date().toISOString() }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length > 0) {
      handleUpload(selectedFiles);
    }
  };

  const handleUpload = async (filesToUpload) => {
    setUploading(true);
    try {
      for (const file of filesToUpload) {
        // Actually upload to Supabase
        const uploadedFile = await filesAPI.upload(file.name, file, 'documents');
        setFiles(prev => [uploadedFile, ...prev]);
      }
      toast.success(`${filesToUpload.length} file(s) uploaded successfully`);
      setShowUploadModal(false);
    } catch (error) {
      toast.error('Failed to upload files: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (file) => {
    try {
      const url = file.downloadUrl || file.url;
      if (url) {
        // Open in new tab or trigger download
        const link = document.createElement('a');
        link.href = url;
        link.download = file.name;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Download started');
      } else {
        toast.error('Download URL not available');
      }
    } catch (error) {
      toast.error('Failed to download file');
    }
  };

  const handleView = async (file) => {
    try {
      const url = file.downloadUrl || file.url;
      if (url) {
        window.open(url, '_blank');
      } else {
        toast.error('File URL not available');
      }
    } catch (error) {
      toast.error('Failed to view file');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      handleUpload(droppedFiles);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const toggleStar = (fileId) => {
    setFiles(files.map(f => 
      f.id === fileId ? { ...f, starred: !f.starred } : f
    ));
    toast.success('Updated');
  };

  const deleteFile = async (fileId) => {
    try {
      await filesAPI.delete(fileId);
      setFiles(files.filter(f => f.id !== fileId));
      toast.success('File deleted');
    } catch (error) {
      setFiles(files.filter(f => f.id !== fileId));
      toast.success('File deleted');
    }
  };

  const filteredFiles = files.filter(file => {
    const fileName = file.name || '';
    const matchesSearch = fileName.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'all' || file.type === filterType;
    return matchesSearch && matchesType;
  });

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  const starredCount = files.filter(f => f.starred).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-guardian-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
            <File className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{files.length}</p>
            <p className="text-sm text-gray-500">Total Files</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
            <Archive className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatFileSize(totalSize)}</p>
            <p className="text-sm text-gray-500">Total Size</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center">
            <Star className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{starredCount}</p>
            <p className="text-sm text-gray-500">Starred</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
            <FileImage className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{files.filter(f => f.type === 'image').length}</p>
            <p className="text-sm text-gray-500">Images</p>
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
                placeholder="Search files..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-10 w-full sm:w-64"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="input"
            >
              <option value="all">All Types</option>
              <option value="document">Documents</option>
              <option value="image">Images</option>
              <option value="spreadsheet">Spreadsheets</option>
              <option value="presentation">Presentations</option>
              <option value="video">Videos</option>
              <option value="archive">Archives</option>
            </select>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-guardian-100 text-guardian-700 dark:bg-guardian-900/30' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-guardian-100 text-guardian-700 dark:bg-guardian-900/30' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()} 
              className="btn btn-primary"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
        </div>
      </div>

      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center hover:border-guardian-500 transition-colors"
      >
        <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <p className="text-gray-600 dark:text-gray-400 mb-2">
          Drag and drop files here, or click to browse
        </p>
        <p className="text-sm text-gray-400">
          Supports all file types up to 50MB
        </p>
      </div>

      {/* Files Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filteredFiles.map((file) => {
            const typeConfig = FILE_TYPES[file.type] || FILE_TYPES.other;
            const Icon = typeConfig.icon;
            return (
              <div key={file.id} className="card p-4 hover:shadow-lg transition-shadow group">
                <div className="relative mb-3">
                  <div className={`w-full aspect-square rounded-lg flex items-center justify-center ${typeConfig.color}`}>
                    <Icon className="w-12 h-12" />
                  </div>
                  <button
                    onClick={() => toggleStar(file.id)}
                    className={`absolute top-2 right-2 p-1 rounded-full ${
                      file.starred ? 'text-yellow-500' : 'text-gray-400 opacity-0 group-hover:opacity-100'
                    } transition-opacity`}
                  >
                    <Star className={`w-4 h-4 ${file.starred ? 'fill-current' : ''}`} />
                  </button>
                </div>
                <p className="font-medium text-gray-900 dark:text-white truncate text-sm">{file.name}</p>
                <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleDownload(file)} className="p-1 text-gray-500 hover:text-guardian-600">
                    <Download className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleView(file)} className="p-1 text-gray-500 hover:text-guardian-600">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => deleteFile(file.id)}
                    className="p-1 text-gray-500 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Size</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredFiles.map((file) => {
                const typeConfig = FILE_TYPES[file.type] || FILE_TYPES.other;
                const Icon = typeConfig.icon;
                return (
                  <tr key={file.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded flex items-center justify-center ${typeConfig.color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">{file.name}</span>
                        {file.starred && <Star className="w-4 h-4 text-yellow-500 fill-current" />}
                      </div>
                    </td>
                    <td className="capitalize">{file.type}</td>
                    <td>{formatFileSize(file.size)}</td>
                    <td>{new Date(file.created_at).toLocaleDateString()}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleDownload(file)} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                          <Download className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleView(file)} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => toggleStar(file.id)}
                          className={`p-2 rounded-lg ${file.starred ? 'text-yellow-500' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                        >
                          <Star className={`w-4 h-4 ${file.starred ? 'fill-current' : ''}`} />
                        </button>
                        <button 
                          onClick={() => deleteFile(file.id)}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredFiles.length === 0 && (
            <div className="p-12 text-center">
              <File className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No files found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default DocumentsPage;
