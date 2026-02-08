/**
 * Manual VOB Page
 * Embeds actual fillable PDF form for viewing, editing, and printing
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Printer, 
  Save, 
  RefreshCw, 
  Download,
  FileText,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PDFDocument } from 'pdf-lib';

import * as pdfjsLib from 'pdfjs-dist';
import vobFormPdf from '../assets/vob-form.pdf';
// Set PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const ManualVOBPage = () => {
  const canvasRef = useRef(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pdfBytes, setPdfBytes] = useState(null);
  const [pageNum, setPageNum] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.5);
  const [loading, setLoading] = useState(true);
  const [formFields, setFormFields] = useState({});
  const [pdfLibDoc, setPdfLibDoc] = useState(null);

  // Load the PDF on mount
  useEffect(() => {
    loadPDF();
  }, []);

  // Re-render when page or scale changes
  useEffect(() => {
    if (pdfDoc) {
      renderPage(pageNum);
    }
  }, [pageNum, scale, pdfDoc]);

  const loadPDF = async () => {
    try {
      setLoading(true);
      // Use dynamic import for Electron/webpack compatibility
      let pdfUrl = vobFormPdf;
      // For Electron, file: protocol may be needed
      if (window?.process?.versions?.electron) {
        // Try to resolve absolute path if needed
        pdfUrl = require('../assets/vob-form.pdf');
      }
      const response = await fetch(pdfUrl);
      if (!response.ok) {
        throw new Error('Failed to load PDF file');
      }
      const arrayBuffer = await response.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      setPdfBytes(bytes);
      // Load with pdf-lib for form filling
      const pdfLibDocument = await PDFDocument.load(bytes);
      setPdfLibDoc(pdfLibDocument);
      // Get form fields
      const form = pdfLibDocument.getForm();
      const fields = form.getFields();
      const fieldValues = {};
      fields.forEach(field => {
        const name = field.getName();
        try {
          if (field.constructor.name === 'PDFTextField') {
            fieldValues[name] = field.getText() || '';
          } else if (field.constructor.name === 'PDFDropdown') {
            fieldValues[name] = field.getSelected()?.[0] || '';
          } else if (field.constructor.name === 'PDFCheckBox') {
            fieldValues[name] = field.isChecked();
          }
        } catch (e) {
          fieldValues[name] = '';
        }
      });
      setFormFields(fieldValues);
      // Load with pdfjs for rendering
      const loadingTask = pdfjsLib.getDocument({ data: bytes });
      const pdf = await loadingTask.promise;
      setPdfDoc(pdf);
      setTotalPages(pdf.numPages);
      setLoading(false);
    } catch (error) {
      console.error('Error loading PDF:', error);
      toast.error('Failed to load PDF: ' + error.message);
      setLoading(false);
    }
  };

  const renderPage = async (num) => {
    if (!pdfDoc || !canvasRef.current) return;
    
    try {
      const page = await pdfDoc.getPage(num);
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      const viewport = page.getViewport({ scale });
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      await page.render({
        canvasContext: ctx,
        viewport: viewport
      }).promise;
    } catch (error) {
      console.error('Error rendering page:', error);
    }
  };

  const handleFieldChange = (fieldName, value) => {
    setFormFields(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const applyFieldsAndGetPDF = async () => {
    if (!pdfLibDoc) return null;
    try {
      // Reload the original PDF to apply changes
      const freshDoc = await PDFDocument.load(pdfBytes);
      const form = freshDoc.getForm();
      // Apply all field values, skip if not found or error
      Object.entries(formFields).forEach(([fieldName, value]) => {
        try {
          const field = form.getFieldMaybe(fieldName) || form.getField(fieldName);
          if (!field) return;
          if (field.constructor.name === 'PDFTextField') {
            field.setText(value || '');
          } else if (field.constructor.name === 'PDFDropdown') {
            if (value) field.select(value);
          } else if (field.constructor.name === 'PDFCheckBox') {
            if (value) field.check();
            else field.uncheck();
          }
        } catch (e) {
          // Ignore missing/optional fields
        }
      });
      // Do not flatten, keep editable
      return await freshDoc.save();
    } catch (error) {
      console.error('Error applying fields:', error);
      toast.error('Error preparing PDF (some fields may be unsupported)');
      return null;
    }
  };

  const handlePrint = async () => {
    try {
      const pdfBytesWithData = await applyFieldsAndGetPDF();
      if (!pdfBytesWithData) return;
      
      // Create blob and open in new window for printing
      const blob = new Blob([pdfBytesWithData], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      const printWindow = window.open(url);
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
      
      toast.success('Opening print dialog...');
    } catch (error) {
      console.error('Print error:', error);
      toast.error('Failed to print');
    }
  };

  const handleDownload = async () => {
    try {
      const pdfBytesWithData = await applyFieldsAndGetPDF();
      if (!pdfBytesWithData) return;
      
      // Create download link
      const blob = new Blob([pdfBytesWithData], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `VOB_Form_${new Date().toISOString().split('T')[0]}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      
      toast.success('PDF downloaded!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download');
    }
  };

  const handleSaveToStorage = () => {
    const savedForms = JSON.parse(localStorage.getItem('manual_vob_forms') || '[]');
    const newForm = {
      id: Date.now(),
      date: new Date().toISOString(),
      fields: formFields
    };
    savedForms.unshift(newForm);
    localStorage.setItem('manual_vob_forms', JSON.stringify(savedForms.slice(0, 50)));
    toast.success('Form data saved locally!');
  };

  const handleReset = async () => {
    await loadPDF();
    toast.success('Form reset to original');
  };

  const refreshPreview = async () => {
    try {
      const pdfBytesWithData = await applyFieldsAndGetPDF();
      if (!pdfBytesWithData) return;
      
      // Reload the preview with updated values
      const loadingTask = pdfjsLib.getDocument({ data: pdfBytesWithData });
      const pdf = await loadingTask.promise;
      setPdfDoc(pdf);
      renderPage(pageNum);
      
      toast.success('Preview updated');
    } catch (error) {
      console.error('Refresh error:', error);
    }
  };

  // Get field info for display
  const getFieldInfo = () => {
    if (!pdfLibDoc) return [];
    
    try {
      const form = pdfLibDoc.getForm();
      const fields = form.getFields();
      
      return fields.map(field => {
        const name = field.getName();
        let type = 'text';
        let options = [];
        
        if (field.constructor.name === 'PDFDropdown') {
          type = 'dropdown';
          try {
            options = field.getOptions();
          } catch (e) {
            options = [];
          }
        } else if (field.constructor.name === 'PDFCheckBox') {
          type = 'checkbox';
        }
        
        return { name, type, options };
      });
    } catch (error) {
      return [];
    }
  };

  const fieldInfo = getFieldInfo();

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Manual VOB</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Fill & Print Benefit Verification Form</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Reset
              </button>
              <button
                onClick={handleSaveToStorage}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Form Fields Panel */}
          <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 max-h-[calc(100vh-180px)] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4 border-b pb-2">
              Form Fields
            </h2>
            
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : (
              <div className="space-y-3">
                {fieldInfo.map((field, index) => (
                  <div key={field.name || index} className="border-b dark:border-gray-700 pb-3">
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 truncate" title={field.name}>
                      {field.name.replace(/_/g, ' ')}
                    </label>
                    
                    {field.type === 'checkbox' ? (
                      <input
                        type="checkbox"
                        checked={formFields[field.name] || false}
                        onChange={(e) => handleFieldChange(field.name, e.target.checked)}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                      />
                    ) : field.type === 'dropdown' && field.options.length > 0 ? (
                      <select
                        value={formFields[field.name] || ''}
                        onChange={(e) => handleFieldChange(field.name, e.target.value)}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- Select --</option>
                        {field.options.map((opt, i) => (
                          <option key={i} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={formFields[field.name] || ''}
                        onChange={(e) => handleFieldChange(field.name, e.target.value)}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                        placeholder={`Enter ${field.name.replace(/_/g, ' ')}`}
                      />
                    )}
                  </div>
                ))}
                
                {fieldInfo.length === 0 && !loading && (
                  <p className="text-gray-500 text-center py-4">No form fields found in PDF</p>
                )}
                
                <button
                  onClick={refreshPreview}
                  className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Update Preview
                </button>
              </div>
            )}
          </div>

          {/* PDF Preview Panel */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg h-[80vh] flex flex-col">
            {/* PDF Controls */}
            <div className="flex items-center justify-between p-3 border-b dark:border-gray-700">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPageNum(Math.max(1, pageNum - 1))}
                  disabled={pageNum <= 1}
                  className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm dark:text-white">
                  Page {pageNum} of {totalPages}
                </span>
                <button
                  onClick={() => setPageNum(Math.min(totalPages, pageNum + 1))}
                  disabled={pageNum >= totalPages}
                  className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setScale(Math.max(0.5, scale - 0.25))}
                  className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <ZoomOut className="w-5 h-5" />
                </button>
                <span className="text-sm w-16 text-center dark:text-white">{Math.round(scale * 100)}%</span>
                <button
                  onClick={() => setScale(Math.min(3, scale + 0.25))}
                  className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <ZoomIn className="w-5 h-5" />
                </button>
              </div>
            </div>
            {/* PDF Canvas with scroll */}
            <div className="flex-1 overflow-auto bg-gray-200 dark:bg-gray-900 flex justify-center items-center">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
                  <span className="ml-3 text-gray-600 dark:text-gray-400">Loading PDF...</span>
                </div>
              ) : (
                <div style={{ minWidth: 0, minHeight: 0 }}>
                  <canvas 
                    ref={canvasRef}
                    className="shadow-lg border"
                    style={{ maxWidth: '100%', height: 'auto', minWidth: 600 }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManualVOBPage;
