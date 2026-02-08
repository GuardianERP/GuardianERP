/**
 * VOB/BOB Auto-Fill Page
 * Enhanced version with PDF upload and auto-fill functionality
 * Uses Google Gemini AI for intelligent PDF parsing
 */

import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { 
  Download, 
  Trash2, 
  RefreshCw, 
  Plus, 
  X, 
  Phone,
  Copy,
  Volume2,
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader,
  Sparkles
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import toast from 'react-hot-toast';
import { vobCustomFieldsAPI } from '../services/api';
import { searchADACodes } from '../data/adaCodes';
import { parseVOBWithAI, appSettingsService } from '../services/geminiService';

// Initialize PDF.js worker - using HTTPS CDN for Electron compatibility
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// NATO Phonetic Alphabet for spelling
const NATO_ALPHABET = {
  'A': 'Alpha', 'B': 'Bravo', 'C': 'Charlie', 'D': 'Delta', 'E': 'Echo',
  'F': 'Foxtrot', 'G': 'Golf', 'H': 'Hotel', 'I': 'India', 'J': 'Juliet',
  'K': 'Kilo', 'L': 'Lima', 'M': 'Mike', 'N': 'November', 'O': 'Oscar',
  'P': 'Papa', 'Q': 'Quebec', 'R': 'Romeo', 'S': 'Sierra', 'T': 'Tango',
  'U': 'Uniform', 'V': 'Victor', 'W': 'Whiskey', 'X': 'X-ray', 'Y': 'Yankee', 'Z': 'Zulu',
  '0': 'Zero', '1': 'One', '2': 'Two', '3': 'Three', '4': 'Four',
  '5': 'Five', '6': 'Six', '7': 'Seven', '8': 'Eight', '9': 'Nine'
};

const toNATOPhonetic = (text) => {
  return text.split('').map(char => {
    const upper = char.toUpperCase();
    return { letter: upper, phonetic: NATO_ALPHABET[upper] || char };
  });
};

// Text-to-Speech function
const speakText = (text) => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  } else {
    toast.error('Text-to-speech not supported in this browser');
  }
};

// Helper Text Component with speaker button
const HelperText = ({ children, color = 'blue' }) => {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700',
    green: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700',
    purple: 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700',
    orange: 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700',
    pink: 'bg-pink-50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-700',
    teal: 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-700',
    amber: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700',
  };

  return (
    <div className={`flex items-center justify-between mt-1 text-xs italic px-2 py-1 rounded border ${colorClasses[color]}`}>
      <span>💬 "{children}"</span>
      <button
        onClick={() => speakText(children)}
        className="ml-2 p-1 hover:bg-white/50 dark:hover:bg-black/30 rounded transition-colors"
        title="Speak this text"
      >
        <Volume2 className="w-3 h-3" />
      </button>
    </div>
  );
};

// NATO Phonetic Popup Component
const NATOPhoneticPopup = ({ name, isOpen, onClose }) => {
  if (!isOpen || !name) return null;
  
  const phoneticLetters = toNATOPhonetic(name);
  
  const copyPhonetic = () => {
    const text = phoneticLetters.map(p => `${p.letter} as in ${p.phonetic}`).join(', ');
    navigator.clipboard.writeText(text);
    toast.success('Phonetic spelling copied!');
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            🔤 NATO Phonetic Spelling
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="bg-purple-50 dark:bg-purple-900/30 rounded-xl p-4 mb-4">
          <p className="text-sm text-purple-700 dark:text-purple-300 mb-2 font-medium">
            Patient Name: <span className="text-lg">{name}</span>
          </p>
          <p className="text-xs text-purple-600 dark:text-purple-400 italic">
            Read each letter and its phonetic word to the representative:
          </p>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 max-h-60 overflow-y-auto">
          <div className="flex flex-wrap gap-2">
            {phoneticLetters.map((item, idx) => (
              <div 
                key={idx}
                className="bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded-lg px-3 py-2 text-center min-w-[80px]"
              >
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {item.letter}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-300">
                  {item.phonetic}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>Say:</strong> "{phoneticLetters.map(p => `${p.letter} as in ${p.phonetic}`).join(', ')}"
          </p>
        </div>
        
        <div className="flex gap-3 mt-4">
          <button onClick={copyPhonetic} className="flex-1 btn btn-primary">
            <Copy className="w-4 h-4 mr-2" />
            Copy Spelling
          </button>
          <button onClick={onClose} className="btn btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// PDF Parse Result Modal - Enhanced with extracted text preview
const PDFResultModal = ({ isOpen, onClose, status, message, fieldsFound, onRetry, extractedPreview }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-2xl w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {status === 'success' ? (
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle className="w-7 h-7 text-green-600 dark:text-green-400" />
              </div>
            ) : status === 'loading' ? (
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Loader className="w-7 h-7 text-blue-600 dark:text-blue-400 animate-spin" />
              </div>
            ) : status === 'warning' ? (
              <div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <AlertCircle className="w-7 h-7 text-yellow-600 dark:text-yellow-400" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertCircle className="w-7 h-7 text-red-600 dark:text-red-400" />
              </div>
            )}
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              {status === 'success' ? 'PDF Processed Successfully' : 
               status === 'loading' ? 'Processing PDF...' : 
               status === 'warning' ? 'Partial Data Extracted' : 'Error Processing PDF'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className={`rounded-lg p-4 mb-4 ${
          status === 'success' ? 'bg-green-50 dark:bg-green-900/20' : 
          status === 'loading' ? 'bg-blue-50 dark:bg-blue-900/20' : 
          status === 'warning' ? 'bg-yellow-50 dark:bg-yellow-900/20' :
          'bg-red-50 dark:bg-red-900/20'
        }`}>
          <p className={`text-sm ${
            status === 'success' ? 'text-green-700 dark:text-green-300' : 
            status === 'loading' ? 'text-blue-700 dark:text-blue-300' : 
            status === 'warning' ? 'text-yellow-700 dark:text-yellow-300' :
            'text-red-700 dark:text-red-300'
          }`}>
            {message}
          </p>
        </div>
        
        {(status === 'success' || status === 'warning') && fieldsFound > 0 && (
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              📋 <strong>{fieldsFound}</strong> fields were auto-filled from the PDF
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Please review and correct any fields as needed.
            </p>
          </div>
        )}

        {/* Show extracted text preview when no fields found or on warning */}
        {extractedPreview && (status === 'warning' || (status === 'success' && fieldsFound === 0)) && (
          <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-3 mb-4">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
              📄 Text extracted from PDF (first 1000 chars):
            </p>
            <div className="max-h-40 overflow-y-auto">
              <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap break-words font-mono">
                {extractedPreview.substring(0, 1000)}
                {extractedPreview.length > 1000 ? '...' : ''}
              </pre>
            </div>
            <p className="text-xs text-gray-500 mt-2 italic">
              💡 Tip: Check if the data you need is visible above. If so, it may be in an unexpected format.
            </p>
          </div>
        )}
        
        <div className="flex gap-3 justify-end">
          {(status === 'error' || status === 'warning') && (
            <button 
              onClick={onRetry} 
              className="btn bg-yellow-500 hover:bg-yellow-600 text-white"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </button>
          )}
          <button 
            onClick={onClose} 
            className={`btn ${status === 'loading' ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
            disabled={status === 'loading'}
          >
            {status === 'loading' ? 'Please wait...' : 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
};

function VOBBOBAutoFillPage() {
  // PDF Upload State
  const [pdfFile, setPdfFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [modalState, setModalState] = useState({ isOpen: false, status: '', message: '', fieldsFound: 0, extractedPreview: '' });
  const fileInputRef = useRef(null);

  // Custom Fields State
  const [customFields, setCustomFields] = useState({});
  const [customFieldValues, setCustomFieldValues] = useState({});
  const [showAddFieldModal, setShowAddFieldModal] = useState(false);
  const [currentSection, setCurrentSection] = useState('');
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldPlaceholder, setNewFieldPlaceholder] = useState('');

  // Patient Information
  const [patientInfo, setPatientInfo] = useState({
    patientName: '',
    dob: '',
    memberId: '',
    groupNumber: '',
    network: '',
    address: '',
  });

  // Policy Information
  const [policyInfo, setPolicyInfo] = useState({
    policyHolderName: '',
    ssn: '',
    policyHolderDOB: '',
    effectiveDate: '',
    type: '',
  });

  // Plan Information
  const [planInfo, setPlanInfo] = useState({
    planName: '',
    employer: '',
    calendarYear: '',
    benefitYear: '',
    waitingPeriod: '',
    missingToothClause: '',
    cob: '',
    insuranceName: '', // Added for PDF filename
  });

  // Limitations
  const [limitations, setLimitations] = useState({
    prophy: '',
    fmxPano: '',
    bwx: '',
    exam: '',
    fluoride: '',
    sealants: '',
    srp: '',
    perio: '',
    crowns: '',
    dentures: '',
    implants: '',
    ortho: '',
  });

  // Maximum & Deductible
  const [maxDeductible, setMaxDeductible] = useState({
    annualMaxIndividual: '',
    annualMaxFamily: '',
    maxUsed: '',
    maxRemaining: '',
    deductibleIndividual: '',
    deductibleFamily: '',
    deductibleUsed: '',
    deductibleRemaining: '',
    deductibleAppliesTo: '',
    orthoLifetimeMax: '',
    orthoMaxUsed: '',
    orthoMaxRemaining: '',
    orthoDeductible: '',
    orthoAgeLimitChild: '',
    orthoAgeLimitAdult: '',
  });

  // Benefits
  const [benefits, setBenefits] = useState({
    preventiveIn: '',
    preventiveOut: '',
    basicIn: '',
    basicOut: '',
    majorIn: '',
    majorOut: '',
    orthoIn: '',
    orthoOut: '',
  });

  // Call Details
  const [callDetails, setCallDetails] = useState({
    repName: '',
    callRef: '',
    date: '',
  });

  // Date of Service for PDF filename
  const [dateOfService, setDateOfService] = useState('');

  // Additional Notes
  const [notes, setNotes] = useState('');

  // NATO Phonetic Popup
  const [showNATOPopup, setShowNATOPopup] = useState(false);

  // Specific Procedure Inquiries (for checking specific ADA codes)
  const [procedureInquiries, setProcedureInquiries] = useState([]);
  const [adaCodeSuggestions, setAdaCodeSuggestions] = useState([]);
  const [activeAdaCodeField, setActiveAdaCodeField] = useState(null);

  // ==================== PDF PARSING FUNCTIONS ====================
  
  // Extract text from PDF with improved handling for jsPDF-generated VOBs
  const extractPDFText = async (file) => {
    try {
      // Validate file first
      if (!file) {
        throw new Error('No file provided');
      }
      
      // Check if it's a PDF by extension or type
      const isPDF = file.type === 'application/pdf' || 
                    file.name?.toLowerCase().endsWith('.pdf');
      if (!isPDF) {
        throw new Error('File is not a PDF');
      }

      console.log('[PDF] Reading file:', file.name, 'Size:', file.size);
      
      const arrayBuffer = await file.arrayBuffer();
      
      // Check PDF signature (magic bytes: %PDF)
      const uint8Array = new Uint8Array(arrayBuffer.slice(0, 5));
      const header = String.fromCharCode(...uint8Array);
      if (!header.startsWith('%PDF')) {
        throw new Error('Invalid PDF file format');
      }
      
      console.log('[PDF] Valid PDF header detected, loading document...');
      
      const pdf = await pdfjsLib.getDocument({ 
        data: arrayBuffer,
        useWorkerFetch: false,
        isEvalSupported: false,
        useSystemFonts: true
      }).promise;
      
      let fullText = '';
      let structuredItems = []; // Keep track of items with positions
      
      console.log(`[PDF] Processing ${pdf.numPages} pages...`);
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        // Collect items with their positions for better parsing
        textContent.items.forEach(item => {
          if (item.str && item.str.trim()) {
            structuredItems.push({
              text: item.str.trim(),
              x: Math.round(item.transform[4]),
              y: Math.round(item.transform[5])
            });
          }
        });
        
        // Also build simple text with spaces
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n';
      }
      
      // Sort items by Y (descending - top to bottom) then X (left to right)
      structuredItems.sort((a, b) => {
        const yDiff = b.y - a.y;
        if (Math.abs(yDiff) > 5) return yDiff; // Different lines
        return a.x - b.x; // Same line, sort by X
      });
      
      // Build text that pairs labels with values (items on same Y line)
      let pairedText = '';
      let currentY = null;
      let lineItems = [];
      
      for (const item of structuredItems) {
        if (currentY === null || Math.abs(item.y - currentY) > 5) {
          // New line - process previous line items
          if (lineItems.length > 0) {
            pairedText += lineItems.join(' ') + '\n';
          }
          lineItems = [item.text];
          currentY = item.y;
        } else {
          lineItems.push(item.text);
        }
      }
      // Don't forget the last line
      if (lineItems.length > 0) {
        pairedText += lineItems.join(' ') + '\n';
      }
      
      console.log(`[PDF] Extracted ${fullText.length} characters`);
      console.log('[PDF] Structured text preview:');
      console.log(pairedText.substring(0, 1500));
      
      // Return both formats combined for maximum matching
      return pairedText + '\n\n--- RAW TEXT ---\n\n' + fullText;
    } catch (error) {
      console.error('[PDF] Error extracting text:', error);
      console.error('[PDF] Error details:', error.message, error.stack);
      
      // Provide more specific error messages
      if (error.message?.includes('Invalid PDF')) {
        throw new Error('Invalid PDF file. Please ensure the file is not corrupted.');
      } else if (error.message?.includes('password')) {
        throw new Error('PDF is password protected. Please provide an unprotected PDF.');
      } else if (error.message?.includes('worker')) {
        throw new Error('PDF processing failed. Please try again or use a different PDF.');
      }
      throw new Error(`Failed to read PDF: ${error.message || 'Unknown error'}`);
    }
  };

  // Parse extracted text and find fields - SPECIALIZED FOR VOB FORMAT
  const parseInsuranceData = (text) => {
    const data = {
      patientInfo: {},
      policyInfo: {},
      planInfo: {},
      maxDeductible: {},
      benefits: {},
      limitations: {},
      callDetails: {},
    };
    
    let fieldsFound = 0;
    
    // Normalize text - replace multiple spaces with single space
    const normalizedText = text.toLowerCase().replace(/\s+/g, ' ');
    const originalText = text.replace(/\s+/g, ' ');
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);

    console.log('[Parse] Starting to parse insurance data...');
    console.log('[Parse] Total lines:', lines.length);

    // DIRECT LINE PARSING - Most reliable for jsPDF VOBs
    const parseLineForPattern = (linePattern, valuePattern = null) => {
      for (const line of lines) {
        const normalizedLine = line.toLowerCase();
        if (normalizedLine.includes(linePattern.toLowerCase())) {
          // Extract everything after the pattern
          const regex = new RegExp(linePattern + '[:\\s]*(.+)', 'i');
          const match = line.match(regex);
          if (match && match[1]) {
            let value = match[1].trim();
            // Clean up - remove trailing labels
            value = value.split(/\s{2,}/)[0]; // Split on multiple spaces (next column)
            value = value.replace(/^\s*[:]\s*/, '').trim();
            if (value && value.length > 0 && value.length < 100) {
              return value;
            }
          }
          // Try to find value in the same line after common patterns
          const parts = line.split(/\s{2,}/); // Split on multiple spaces
          for (let i = 0; i < parts.length - 1; i++) {
            if (parts[i].toLowerCase().includes(linePattern.toLowerCase())) {
              const val = parts[i + 1]?.trim();
              if (val && val.length > 0 && val.length < 100) {
                return val;
              }
            }
          }
        }
      }
      return '';
    };

    // IMPROVED: Helper function with line-based extraction first
    const extractValue = (patterns, searchInNormalized = true) => {
      // First try line-based extraction (best for jsPDF)
      for (const pattern of patterns) {
        const lineValue = parseLineForPattern(pattern);
        if (lineValue) {
          console.log(`[Parse] Found via line "${pattern}": "${lineValue}"`);
          fieldsFound++;
          return lineValue;
        }
      }
      
      // Fallback to regex on full text
      for (const pattern of patterns) {
        const regexPatterns = [
          new RegExp(pattern + '[:\\s]+([A-Za-z0-9][^\\n\\r]{1,60})', 'i'),
          new RegExp(pattern + '\\s*:\\s*([A-Za-z0-9][^\\n\\r]{1,60})', 'i'),
          new RegExp(pattern + '\\s+([A-Za-z0-9][\\w\\s\\-\\.]{1,40})', 'i'),
        ];
        
        for (const regex of regexPatterns) {
          const textToSearch = searchInNormalized ? normalizedText : originalText;
          const match = textToSearch.match(regex) || originalText.match(regex);
          if (match && match[1]) {
            let value = match[1].trim();
            value = value.replace(/[\s,;:]+$/, '').trim();
            if (value && value.length > 1 && value.length < 60 && 
                !['the', 'and', 'for', 'with', 'from', 'this', 'that'].includes(value.toLowerCase())) {
              console.log(`[Parse] Found regex "${pattern}": "${value}"`);
              return value;
            }
          }
        }
      }
      return '';
    };

    // IMPROVED: Helper to extract dollar amounts
    const extractAmount = (patterns) => {
      // First try line-based
      for (const pattern of patterns) {
        const lineValue = parseLineForPattern(pattern);
        if (lineValue) {
          // Extract number from the value
          const numMatch = lineValue.match(/[\d,]+\.?\d*/);
          if (numMatch) {
            const value = numMatch[0].replace(/,/g, '');
            if (!isNaN(parseFloat(value))) {
              const formatted = parseFloat(value).toLocaleString();
              console.log(`[Parse] Found amount via line "${pattern}": "${formatted}"`);
              return formatted;
            }
          }
        }
      }
      
      // Fallback to regex
      for (const pattern of patterns) {
        const regexPatterns = [
          new RegExp(pattern + '[:\\s]*\\$?([\\d,]+\\.?\\d*)', 'i'),
          new RegExp(pattern + '[:\\s]*(\\d{1,6})(?!\\d)', 'i'),
        ];
        
        for (const regex of regexPatterns) {
          const match = normalizedText.match(regex) || originalText.match(regex);
          if (match && match[1]) {
            const value = match[1].trim().replace(/,/g, '');
            if (value && !isNaN(parseFloat(value))) {
              const formatted = parseFloat(value).toLocaleString();
              console.log(`[Parse] Found amount regex "${pattern}": "${formatted}"`);
              return formatted;
            }
          }
        }
      }
      return '';
    };

    // IMPROVED: Helper to extract percentage
    const extractPercentage = (patterns) => {
      // First try line-based
      for (const pattern of patterns) {
        const lineValue = parseLineForPattern(pattern);
        if (lineValue) {
          const numMatch = lineValue.match(/(\d{1,3})/);
          if (numMatch) {
            const num = parseInt(numMatch[1]);
            if (num >= 0 && num <= 100) {
              console.log(`[Parse] Found percentage via line "${pattern}": "${num}%"`);
              return num + '%';
            }
          }
        }
      }
      
      // Fallback to regex
      for (const pattern of patterns) {
        const regexPatterns = [
          new RegExp(pattern + '[:\\s]*(\\d{1,3})\\s*%?', 'i'),
        ];
        
        for (const regex of regexPatterns) {
          const match = normalizedText.match(regex) || originalText.match(regex);
          if (match && match[1]) {
            const value = parseInt(match[1]);
            if (value >= 0 && value <= 100) {
              console.log(`[Parse] Found percentage regex "${pattern}": "${value}%"`);
              return value + '%';
            }
          }
        }
      }
      return '';
    };

    // IMPROVED: Helper to extract date
    const extractDate = (patterns) => {
      for (const pattern of patterns) {
        const lineValue = parseLineForPattern(pattern);
        if (lineValue) {
          // Look for date patterns
          const dateMatch = lineValue.match(/\d{1,4}[-\/]\d{1,2}[-\/]\d{1,4}/);
          if (dateMatch) {
            console.log(`[Parse] Found date via line "${pattern}": "${dateMatch[0]}"`);
            return dateMatch[0];
          }
        }
      }
      
      // Fallback regex
      for (const pattern of patterns) {
        const regex = new RegExp(pattern + '[:\\s]*(\\d{1,4}[-/]\\d{1,2}[-/]\\d{1,4})', 'i');
        const match = originalText.match(regex);
        if (match && match[1]) {
          console.log(`[Parse] Found date regex "${pattern}": "${match[1]}"`);
          return match[1];
        }
      }
      return '';
    };

    // ===== INSURANCE COMPANY DETECTION =====
    const knownInsurers = [
      'Aetna', 'Cigna', 'Delta Dental', 'MetLife', 'Guardian', 
      'United Healthcare', 'UnitedHealthcare', 'United Concordia', 'Humana', 
      'Anthem', 'Blue Cross', 'Blue Shield', 'BCBS', 'Principal', 
      'Unum', 'SunLife', 'Sun Life', 'Lincoln Financial', 'Prudential', 
      'Ameritas', 'Aflac', 'Assurant', 'Dentemax', 'Connection Dental',
      'Dental Network of America', 'GEHA', 'Careington', 'Dominion',
      'Renaissance', 'Liberty Dental', 'DentaQuest', 'MCNA', 'Skygen',
      'Emblem Health', 'Healthplex', 'First Dental Health'
    ];
    
    for (const insurer of knownInsurers) {
      if (originalText.toLowerCase().includes(insurer.toLowerCase())) {
        data.planInfo.insuranceName = insurer;
        fieldsFound++;
        console.log(`[Parse] Found insurance: ${insurer}`);
        break;
      }
    }

    // ===== PATIENT INFORMATION (Exact patterns from VOB PDF) =====
    const patientNamePatterns = [
      'Patient Name:', 'patient name', 'Patient Name', 'PATIENT NAME',
      'member name', 'subscriber name', 'insured name'
    ];
    const patientName = extractValue(patientNamePatterns);
    if (patientName) { data.patientInfo.patientName = patientName; }

    const dobPatterns = [
      'DOB:', 'DOB', 'dob:', 'Date of Birth:', 'date of birth',
      'birth date', 'birthdate'
    ];
    const dob = extractDate(dobPatterns) || extractValue(dobPatterns);
    if (dob) { data.patientInfo.dob = dob; }

    const memberIdPatterns = [
      'Member ID:', 'Member ID', 'member id:', 'MEMBER ID',
      'member #', 'subscriber id', 'certificate number'
    ];
    const memberId = extractValue(memberIdPatterns);
    if (memberId) { data.patientInfo.memberId = memberId; }

    const groupPatterns = [
      'Group #:', 'Group #', 'group #:', 'GROUP #',
      'group number', 'group no'
    ];
    const groupNumber = extractValue(groupPatterns);
    if (groupNumber) { data.patientInfo.groupNumber = groupNumber; }

    // Network Detection - exact match from VOB
    const networkPatterns = ['Network:', 'network:'];
    const networkValue = extractValue(networkPatterns);
    if (networkValue) {
      data.patientInfo.network = networkValue;
    } else {
      // Fallback detection
      if (normalizedText.includes('in network') || normalizedText.includes('in-network')) {
        data.patientInfo.network = 'In-Network';
      } else if (normalizedText.includes('out of network') || normalizedText.includes('out-of-network')) {
        data.patientInfo.network = 'Out-of-Network';
      }
    }

    const addressPatterns = [
      'Address:', 'address:', 'Claims Address:', 'mailing address'
    ];
    const address = extractValue(addressPatterns);
    if (address) { data.patientInfo.address = address; }

    // ===== POLICY INFORMATION (Exact patterns from VOB PDF) =====
    const policyHolderPatterns = [
      'Policy Holder Name:', 'Policy Holder Name', 'policy holder name:',
      'policyholder', 'subscriber name'
    ];
    const policyHolder = extractValue(policyHolderPatterns);
    if (policyHolder) { data.policyInfo.policyHolderName = policyHolder; }

    const policyHolderDOBPatterns = [
      'Policy Holder DOB:', 'Policy Holder DOB', 'policy holder dob:'
    ];
    const policyHolderDOB = extractDate(policyHolderDOBPatterns) || extractValue(policyHolderDOBPatterns);
    if (policyHolderDOB) { data.policyInfo.policyHolderDOB = policyHolderDOB; }

    const effectiveDatePatterns = [
      'Effective Date:', 'Effective Date', 'effective date:',
      'coverage effective', 'eff date'
    ];
    const effectiveDate = extractDate(effectiveDatePatterns) || extractValue(effectiveDatePatterns);
    if (effectiveDate) { data.policyInfo.effectiveDate = effectiveDate; }

    // Plan Type Detection - exact match first
    const typePatterns = ['Type:', 'type:', 'Plan Type:'];
    const typeValue = extractValue(typePatterns);
    if (typeValue) {
      data.policyInfo.type = typeValue;
    } else {
      // Fallback detection
      const planTypePatterns = [
        { patterns: ['ppo'], type: 'PPO' },
        { patterns: ['hmo'], type: 'HMO' },
        { patterns: ['dhmo'], type: 'DHMO' },
        { patterns: ['indemnity'], type: 'Indemnity' },
        { patterns: ['epo'], type: 'EPO' },
      ];
      
      for (const { patterns, type } of planTypePatterns) {
        for (const pattern of patterns) {
          if (normalizedText.includes(pattern)) {
            data.policyInfo.type = type;
            break;
          }
        }
        if (data.policyInfo.type) break;
      }
    }

    // ===== PLAN INFORMATION (Exact patterns from VOB PDF) =====
    const planNamePatterns = [
      'Plan Name:', 'Plan Name', 'plan name:'
    ];
    const planName = extractValue(planNamePatterns);
    if (planName) { data.planInfo.planName = planName; }

    const employerPatterns = [
      'Employer:', 'employer:', 'Employer Name:'
    ];
    const employer = extractValue(employerPatterns);
    if (employer) { data.planInfo.employer = employer; }

    const calendarYearPatterns = [
      'Calendar Year:', 'Calendar Year', 'calendar year:'
    ];
    const calendarYear = extractDate(calendarYearPatterns) || extractValue(calendarYearPatterns);
    if (calendarYear) { data.planInfo.calendarYear = calendarYear; }

    const benefitYearPatterns = [
      'Benefit Year:', 'Benefit Year', 'benefit year:'
    ];
    const benefitYear = extractDate(benefitYearPatterns) || extractValue(benefitYearPatterns);
    if (benefitYear) { data.planInfo.benefitYear = benefitYear; }

    // Waiting Period Detection
    const waitingPeriodPatterns = [
      'Waiting Period:', 'Waiting Period', 'waiting period:'
    ];
    const waitingPeriod = extractValue(waitingPeriodPatterns);
    if (waitingPeriod) { 
      data.planInfo.waitingPeriod = waitingPeriod; 
    } else if (normalizedText.includes('no waiting period')) {
      data.planInfo.waitingPeriod = 'None';
    }

    // Missing Tooth Clause - exact patterns
    const missingToothPatterns = [
      'Missing Tooth Clause:', 'Missing Tooth Clause', 'missing tooth clause:'
    ];
    const missingTooth = extractValue(missingToothPatterns);
    if (missingTooth) {
      data.planInfo.missingToothClause = missingTooth;
    }

    // COB
    const cobPatterns = ['COB:', 'cob:'];
    const cob = extractValue(cobPatterns);
    if (cob) { data.planInfo.cob = cob; }

    // ===== MAXIMUM & DEDUCTIBLE (Exact patterns from VOB PDF) =====
    const annualMaxIndPatterns = [
      'Annual Max \\(Ind\\):', 'Annual Max (Ind):', 'Annual Max (Ind)',
      'annual max', 'annual maximum'
    ];
    const annualMaxInd = extractAmount(annualMaxIndPatterns);
    if (annualMaxInd) { data.maxDeductible.annualMaxIndividual = annualMaxInd; }

    const annualMaxFamPatterns = [
      'Annual Max \\(Fam\\):', 'Annual Max (Fam):', 'Annual Max (Fam)'
    ];
    const annualMaxFam = extractAmount(annualMaxFamPatterns);
    if (annualMaxFam) { data.maxDeductible.annualMaxFamily = annualMaxFam; }

    const maxUsedPatterns = [
      'Max Used:', 'Max Used', 'max used:'
    ];
    const maxUsed = extractAmount(maxUsedPatterns);
    if (maxUsed) { data.maxDeductible.maxUsed = maxUsed; }

    const maxRemainingPatterns = [
      'Max Remaining:', 'Max Remaining', 'max remaining:'
    ];
    const maxRemaining = extractAmount(maxRemainingPatterns);
    if (maxRemaining) { data.maxDeductible.maxRemaining = maxRemaining; }

    const deductibleIndPatterns = [
      'Deductible \\(Ind\\):', 'Deductible (Ind):', 'Deductible (Ind)',
      'individual deductible'
    ];
    const deductibleInd = extractAmount(deductibleIndPatterns);
    if (deductibleInd) { data.maxDeductible.deductibleIndividual = deductibleInd; }

    const deductibleFamPatterns = [
      'Deductible \\(Fam\\):', 'Deductible (Fam):', 'Deductible (Fam)',
      'family deductible'
    ];
    const deductibleFam = extractAmount(deductibleFamPatterns);
    if (deductibleFam) { data.maxDeductible.deductibleFamily = deductibleFam; }

    const deductibleUsedPatterns = [
      'Deductible Used:', 'Deductible Used', 'deductible used:'
    ];
    const deductibleUsed = extractAmount(deductibleUsedPatterns);
    if (deductibleUsed) { data.maxDeductible.deductibleUsed = deductibleUsed; }

    const deductibleRemainingPatterns = [
      'Deductible Remaining:', 'Deductible Remaining', 'deductible remaining:'
    ];
    const deductibleRemaining = extractAmount(deductibleRemainingPatterns);
    if (deductibleRemaining) { data.maxDeductible.deductibleRemaining = deductibleRemaining; }

    const deductibleAppliesToPatterns = [
      'Deductible Applies To:', 'Deductible Applies To', 'deductible applies to:'
    ];
    const deductibleAppliesTo = extractValue(deductibleAppliesToPatterns);
    if (deductibleAppliesTo) { data.maxDeductible.deductibleAppliesTo = deductibleAppliesTo; }

    // Ortho Benefits
    const orthoLifetimeMaxPatterns = [
      'Lifetime Max:', 'Lifetime Max', 'lifetime max:',
      'ortho lifetime', 'orthodontic lifetime'
    ];
    const orthoLifetimeMax = extractAmount(orthoLifetimeMaxPatterns);
    if (orthoLifetimeMax) { data.maxDeductible.orthoLifetimeMax = orthoLifetimeMax; }

    // ===== BENEFITS PERCENTAGES (From BENEFITS BREAKDOWN table) =====
    // Look for patterns like "Preventive (D0100-D1999) 100" in the benefits table
    
    // Preventive
    const preventiveMatch = originalText.match(/Preventive[^0-9]*(\d{1,3})/i);
    if (preventiveMatch) {
      data.benefits.preventiveIn = preventiveMatch[1] + '%';
      console.log(`[Parse] Found Preventive: ${preventiveMatch[1]}%`);
    }
    
    // Basic
    const basicMatch = originalText.match(/Basic[^0-9]*(\d{1,3})/i);
    if (basicMatch) {
      data.benefits.basicIn = basicMatch[1] + '%';
      console.log(`[Parse] Found Basic: ${basicMatch[1]}%`);
    }
    
    // Major
    const majorMatch = originalText.match(/Major[^0-9]*(\d{1,3})/i);
    if (majorMatch) {
      data.benefits.majorIn = majorMatch[1] + '%';
      console.log(`[Parse] Found Major: ${majorMatch[1]}%`);
    }
    
    // Orthodontic
    const orthoMatch = originalText.match(/Orthodontic[^0-9]*(\d{1,3})/i);
    if (orthoMatch) {
      data.benefits.orthoIn = orthoMatch[1] + '%';
      console.log(`[Parse] Found Ortho: ${orthoMatch[1]}%`);
    }

    // ===== LIMITATIONS/FREQUENCY (Exact patterns from VOB PDF) =====
    const prophyPatterns = ['Prophy:', 'prophy:'];
    const prophyFreq = extractValue(prophyPatterns);
    if (prophyFreq) { data.limitations.prophy = prophyFreq; }

    const examPatterns = ['Exam:', 'exam:'];
    const examFreq = extractValue(examPatterns);
    if (examFreq) { data.limitations.exam = examFreq; }

    const bwxPatterns = ['BWX:', 'bwx:'];
    const bwxFreq = extractValue(bwxPatterns);
    if (bwxFreq) { data.limitations.bwx = bwxFreq; }

    const fmxPanoPatterns = ['FMX/Pano:', 'FMX/Pano', 'fmx/pano:'];
    const fmxPanoFreq = extractValue(fmxPanoPatterns);
    if (fmxPanoFreq) { data.limitations.fmxPano = fmxPanoFreq; }

    const fluoridePatterns = ['Fluoride:', 'fluoride:'];
    const fluorideFreq = extractValue(fluoridePatterns);
    if (fluorideFreq) { data.limitations.fluoride = fluorideFreq; }

    const sealantsPatterns = ['Sealants:', 'sealants:'];
    const sealantsFreq = extractValue(sealantsPatterns);
    if (sealantsFreq) { data.limitations.sealants = sealantsFreq; }

    const srpPatterns = ['SRP:', 'srp:'];
    const srpFreq = extractValue(srpPatterns);
    if (srpFreq) { data.limitations.srp = srpFreq; }

    const perioMaintPatterns = ['Perio Maint:', 'Perio Maint', 'perio maint:'];
    const perioMaintFreq = extractValue(perioMaintPatterns);
    if (perioMaintFreq) { data.limitations.perio = perioMaintFreq; }

    const crownsPatterns = ['Crowns:', 'crowns:'];
    const crownsFreq = extractValue(crownsPatterns);
    if (crownsFreq) { data.limitations.crowns = crownsFreq; }

    const denturesPatterns = ['Dentures:', 'dentures:'];
    const denturesFreq = extractValue(denturesPatterns);
    if (denturesFreq) { data.limitations.dentures = denturesFreq; }

    const implantsPatterns = ['Implants:', 'implants:'];
    const implantsFreq = extractValue(implantsPatterns);
    if (implantsFreq) { data.limitations.implants = implantsFreq; }

    const orthoLimitPatterns = ['Ortho:', 'ortho:'];
    const orthoFreq = extractValue(orthoLimitPatterns);
    if (orthoFreq) { data.limitations.ortho = orthoFreq; }

    // ===== CALL DETAILS =====
    const repNamePatterns = ['Rep Name:', 'rep name:'];
    const repName = extractValue(repNamePatterns);
    if (repName) { data.callDetails.repName = repName; }

    const callRefPatterns = ['Call Ref #:', 'Call Ref #', 'call ref #:'];
    const callRef = extractValue(callRefPatterns);
    if (callRef) { data.callDetails.callRef = callRef; }

    // ===== COUNT FIELDS FOUND =====
    // Count all non-empty values
    const countFields = (obj) => {
      let count = 0;
      for (const key in obj) {
        const value = obj[key];
        if (typeof value === 'object') {
          count += countFields(value);
        } else if (value && value.toString().trim()) {
          count++;
        }
      }
      return count;
    };
    fieldsFound = countFields(data);

    // ===== FALLBACK: Try to find any standalone dollar amounts =====
    if (!data.maxDeductible.annualMaxIndividual) {
      // Look for common patterns like "$1,500" or "$2,000" for annual max
      const standaloneAmountMatch = originalText.match(/(?:maximum|max)[:\s]*\$?(\d{1,2},?\d{3}(?:\.\d{2})?)/i);
      if (standaloneAmountMatch) {
        data.maxDeductible.annualMaxIndividual = '$' + standaloneAmountMatch[1].replace(/,/g, '');
        fieldsFound++;
        console.log('[Parse] Found standalone max amount:', standaloneAmountMatch[1]);
      }
    }

    // ===== FALLBACK: Try to find percentages in common patterns =====
    if (!data.benefits.preventiveIn) {
      // Look for patterns like "100%" near "preventive"
      const preventiveMatch = originalText.match(/preventive[^%]*?(\d{1,3})\s*%/i);
      if (preventiveMatch) {
        data.benefits.preventiveIn = preventiveMatch[1] + '%';
        fieldsFound++;
      }
    }

    console.log(`[Parse] Total fields found: ${fieldsFound}`);
    console.log('[Parse] Extracted data:', JSON.stringify(data, null, 2));

    return { data, fieldsFound };
  };

  // Apply parsed data to form
  const applyParsedData = (parsedData) => {
    // Apply patient info
    if (parsedData.patientInfo) {
      setPatientInfo(prev => ({
        ...prev,
        ...Object.fromEntries(Object.entries(parsedData.patientInfo).filter(([_, v]) => v))
      }));
    }

    // Apply policy info
    if (parsedData.policyInfo) {
      setPolicyInfo(prev => ({
        ...prev,
        ...Object.fromEntries(Object.entries(parsedData.policyInfo).filter(([_, v]) => v))
      }));
    }

    // Apply plan info
    if (parsedData.planInfo) {
      setPlanInfo(prev => ({
        ...prev,
        ...Object.fromEntries(Object.entries(parsedData.planInfo).filter(([_, v]) => v))
      }));
    }

    // Apply max/deductible
    if (parsedData.maxDeductible) {
      setMaxDeductible(prev => ({
        ...prev,
        ...Object.fromEntries(Object.entries(parsedData.maxDeductible).filter(([_, v]) => v))
      }));
    }

    // Apply benefits
    if (parsedData.benefits) {
      setBenefits(prev => ({
        ...prev,
        ...Object.fromEntries(Object.entries(parsedData.benefits).filter(([_, v]) => v))
      }));
    }

    // Apply limitations
    if (parsedData.limitations) {
      setLimitations(prev => ({
        ...prev,
        ...Object.fromEntries(Object.entries(parsedData.limitations).filter(([_, v]) => v))
      }));
    }

    // Apply date of service
    if (parsedData.dateOfService) {
      setDateOfService(parsedData.dateOfService);
    }

    // Apply call details
    if (parsedData.callDetails) {
      setCallDetails(prev => ({
        ...prev,
        ...Object.fromEntries(Object.entries(parsedData.callDetails).filter(([_, v]) => v))
      }));
    }
  };

  // Handle PDF upload - Uses AI when enabled, falls back to regex parsing
  const handlePDFUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      return;
    }

    setPdfFile(file);
    setIsProcessing(true);
    
    const appSettings = appSettingsService.get();
    const useAI = appSettings.use_ai_parsing && appSettings.gemini_api_key;
    
    setModalState({ 
      isOpen: true, 
      status: 'loading', 
      message: useAI ? '🤖 Extracting text with AI...' : 'Extracting text from PDF...', 
      fieldsFound: 0, 
      extractedPreview: '' 
    });

    let extractedText = '';
    
    try {
      // Extract text from PDF
      extractedText = await extractPDFText(file);
      
      if (!extractedText || extractedText.trim().length < 50) {
        throw new Error('Could not extract sufficient text from the PDF. The PDF might be image-based or protected.');
      }

      let data, fieldsFound;

      if (useAI) {
        // USE GEMINI AI FOR PARSING
        setModalState({ 
          isOpen: true, 
          status: 'loading', 
          message: '🤖 AI is analyzing your document...', 
          fieldsFound: 0, 
          extractedPreview: '' 
        });

        console.log('[AI] Sending to Gemini for parsing...');
        const aiResult = await parseVOBWithAI(extractedText);
        
        if (aiResult.success) {
          data = aiResult.data;
          fieldsFound = aiResult.fieldsFound;
          console.log('[AI] Successfully parsed:', fieldsFound, 'fields');
        } else {
          console.warn('[AI] Failed, falling back to regex:', aiResult.error);
          // Fall back to regex parsing
          const regexResult = parseInsuranceData(extractedText);
          data = regexResult.data;
          fieldsFound = regexResult.fieldsFound;
        }
      } else {
        // USE REGEX PARSING (fallback)
        setModalState({ 
          isOpen: true, 
          status: 'loading', 
          message: 'Analyzing document and extracting fields...', 
          fieldsFound: 0, 
          extractedPreview: '' 
        });
        
        const regexResult = parseInsuranceData(extractedText);
        data = regexResult.data;
        fieldsFound = regexResult.fieldsFound;
      }

      // Apply parsed data to form
      applyParsedData(data);

      if (fieldsFound === 0) {
        setModalState({
          isOpen: true,
          status: 'warning',
          message: useAI 
            ? '🤖 AI could not find matching VOB fields in this document. It may not be a standard VOB/BOB format.'
            : 'PDF was processed but no matching fields were found.',
          fieldsFound: 0,
          extractedPreview: extractedText.substring(0, 2000)
        });
        toast.warning('No fields matched. Check the preview.');
      } else if (fieldsFound < 5) {
        setModalState({
          isOpen: true,
          status: 'warning',
          message: useAI 
            ? `🤖 AI extracted ${fieldsFound} field(s). Some information may be missing.`
            : `Only ${fieldsFound} field(s) could be extracted.`,
          fieldsFound,
          extractedPreview: extractedText.substring(0, 1500)
        });
        toast.info(`${fieldsFound} fields auto-filled.`);
      } else {
        setModalState({
          isOpen: true,
          status: 'success',
          message: useAI 
            ? `🤖 AI successfully extracted ${fieldsFound} fields from your VOB!`
            : `Successfully extracted ${fieldsFound} fields from the PDF!`,
          fieldsFound,
          extractedPreview: ''
        });
        toast.success(`${fieldsFound} fields auto-filled!`);
      }
    } catch (error) {
      console.error('PDF Processing Error:', error);
      setModalState({
        isOpen: true,
        status: 'error',
        message: error.message || 'Failed to process PDF. Please try again.',
        fieldsFound: 0,
        extractedPreview: extractedText ? extractedText.substring(0, 1500) : ''
      });
    } finally {
      setIsProcessing(false);
      // Always clear the file input so same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Retry PDF processing
  const retryPDFProcessing = () => {
    // First close modal and reset all state
    setPdfFile(null);
    setIsProcessing(false);
    setModalState({ isOpen: false, status: '', message: '', fieldsFound: 0, extractedPreview: '' });
    
    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    // Open file picker after a short delay
    setTimeout(() => {
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }, 200);
  };

  // ==================== END PDF PARSING ====================

  // Add procedure inquiry row
  const addProcedureInquiry = () => {
    setProcedureInquiries(prev => [...prev, {
      id: Date.now(),
      adaCode: '',
      description: '',
      coverage: '',
      frequency: '',
      notes: ''
    }]);
  };

  // Remove procedure inquiry row
  const removeProcedureInquiry = (id) => {
    setProcedureInquiries(prev => prev.filter(p => p.id !== id));
  };

  // Update procedure inquiry
  const updateProcedureInquiry = (id, field, value) => {
    setProcedureInquiries(prev => prev.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ));
    
    // Handle ADA code autocomplete
    if (field === 'adaCode') {
      if (value && value.length >= 1) {
        const results = searchADACodes(value, 8);
        setAdaCodeSuggestions(results);
        setActiveAdaCodeField(id);
      } else {
        setAdaCodeSuggestions([]);
        setActiveAdaCodeField(null);
      }
    }
  };

  // Select ADA code from suggestions
  const selectAdaCode = (inquiryId, adaItem) => {
    setProcedureInquiries(prev => prev.map(p => 
      p.id === inquiryId 
        ? { ...p, adaCode: adaItem.code, description: adaItem.description }
        : p
    ));
    setAdaCodeSuggestions([]);
    setActiveAdaCodeField(null);
  };

  // Load custom fields from database
  useEffect(() => {
    loadCustomFields();
  }, []);

  const loadCustomFields = async () => {
    try {
      const fields = await vobCustomFieldsAPI.getAll();
      const groupedFields = {};
      fields.forEach(field => {
        if (!groupedFields[field.section]) {
          groupedFields[field.section] = [];
        }
        groupedFields[field.section].push(field);
      });
      setCustomFields(groupedFields);
    } catch (error) {
      console.error('Error loading custom fields:', error);
    }
  };

  // Add custom field
  const handleAddCustomField = async () => {
    if (!newFieldLabel.trim()) {
      toast.error('Please enter a field label');
      return;
    }

    try {
      const fieldName = newFieldLabel.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      const fieldData = {
        section: currentSection,
        field_name: `custom_${fieldName}_${Date.now()}`,
        field_label: newFieldLabel,
        field_type: 'text',
      };

      const result = await vobCustomFieldsAPI.create(fieldData);
      
      setCustomFields(prev => ({
        ...prev,
        [currentSection]: [...(prev[currentSection] || []), { id: result.id, ...fieldData }]
      }));

      toast.success('Custom field added successfully!');
      setShowAddFieldModal(false);
      setNewFieldLabel('');
      setNewFieldPlaceholder('');
    } catch (error) {
      toast.error('Error adding custom field: ' + error.message);
    }
  };

  // Delete custom field
  const handleDeleteCustomField = async (fieldId, section) => {
    try {
      await vobCustomFieldsAPI.delete(fieldId);
      
      setCustomFields(prev => ({
        ...prev,
        [section]: (prev[section] || []).filter(f => f.id !== fieldId)
      }));

      setCustomFieldValues(prev => {
        const newValues = { ...prev };
        delete newValues[fieldId];
        return newValues;
      });

      toast.success('Custom field deleted');
    } catch (error) {
      toast.error('Error deleting custom field: ' + error.message);
    }
  };

  // Handle custom field value change
  const handleCustomFieldChange = (fieldId, value) => {
    setCustomFieldValues(prev => ({ ...prev, [fieldId]: value }));
  };

  // Open add field modal
  const openAddFieldModal = (section) => {
    setCurrentSection(section);
    setShowAddFieldModal(true);
  };

  // Handle input changes
  const handlePatientChange = (field, value) => {
    setPatientInfo(prev => ({ ...prev, [field]: value }));
  };

  const handlePolicyChange = (field, value) => {
    setPolicyInfo(prev => ({ ...prev, [field]: value }));
  };

  const handlePlanChange = (field, value) => {
    setPlanInfo(prev => ({ ...prev, [field]: value }));
  };

  const handleLimitationsChange = (field, value) => {
    setLimitations(prev => ({ ...prev, [field]: value }));
  };

  const handleMaxDeductibleChange = (field, value) => {
    setMaxDeductible(prev => ({ ...prev, [field]: value }));
  };

  const handleBenefitsChange = (field, value) => {
    setBenefits(prev => ({ ...prev, [field]: value }));
  };

  const handleCallChange = (field, value) => {
    setCallDetails(prev => ({ ...prev, [field]: value }));
  };

  // Clear functions
  const clearPatientInfo = () => {
    setPatientInfo({
      patientName: '',
      dob: '',
      memberId: '',
      groupNumber: '',
      network: '',
      address: '',
    });
    toast.success('Patient information cleared');
  };

  const clearAllData = () => {
    setPatientInfo({
      patientName: '',
      dob: '',
      memberId: '',
      groupNumber: '',
      network: '',
      address: '',
    });
    setPolicyInfo({
      policyHolderName: '',
      ssn: '',
      policyHolderDOB: '',
      effectiveDate: '',
      type: '',
    });
    setPlanInfo({
      planName: '',
      employer: '',
      calendarYear: '',
      benefitYear: '',
      waitingPeriod: '',
      missingToothClause: '',
      cob: '',
      insuranceName: '',
    });
    setLimitations({
      prophy: '',
      fmxPano: '',
      bwx: '',
      exam: '',
      fluoride: '',
      sealants: '',
      srp: '',
      perio: '',
      crowns: '',
      dentures: '',
      implants: '',
      ortho: '',
    });
    setMaxDeductible({
      annualMaxIndividual: '',
      annualMaxFamily: '',
      maxUsed: '',
      maxRemaining: '',
      deductibleIndividual: '',
      deductibleFamily: '',
      deductibleUsed: '',
      deductibleRemaining: '',
      deductibleAppliesTo: '',
      orthoLifetimeMax: '',
      orthoMaxUsed: '',
      orthoMaxRemaining: '',
      orthoDeductible: '',
      orthoAgeLimitChild: '',
      orthoAgeLimitAdult: '',
    });
    setBenefits({
      preventiveIn: '',
      preventiveOut: '',
      basicIn: '',
      basicOut: '',
      majorIn: '',
      majorOut: '',
      orthoIn: '',
      orthoOut: '',
    });
    setCallDetails({
      repName: '',
      callRef: '',
      date: '',
    });
    setNotes('');
    setDateOfService('');
    setProcedureInquiries([]);
    setCustomFieldValues({});
    setPdfFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    toast.success('All data cleared');
  };

  // Render custom fields for a section
  const renderCustomFields = (section) => {
    const fields = customFields[section] || [];
    return fields.map(field => (
      <div key={field.id} className="relative group">
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
          {field.field_label || field.fieldLabel}
          <button
            onClick={() => handleDeleteCustomField(field.id, section)}
            className="ml-2 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Delete field"
          >
            <X className="w-3 h-3 inline" />
          </button>
        </label>
        <input
          type="text"
          value={customFieldValues[field.id] || ''}
          onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
          className="input w-full"
          placeholder={field.placeholder || ''}
        />
      </div>
    ));
  };

  // Add field button component
  const AddFieldButton = ({ section }) => (
    <button
      onClick={() => openAddFieldModal(section)}
      className="mt-3 flex items-center text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
    >
      <Plus className="w-4 h-4 mr-1" />
      Add Custom Field
    </button>
  );

  // Generate PDF with custom filename format: InsuranceName_DOS_PatientName.pdf
  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;
    let y = margin;

    const lineHeight = 5;
    const col1 = margin;
    const col2 = margin + 95;

    // Helper function to add a field
    const addField = (label, value, x, y) => {
      doc.setFont("helvetica", "bold");
      doc.text(label, x, y);
      doc.setFont("helvetica", "normal");
      const labelWidth = doc.getTextWidth(label);
      doc.text(value || '-', x + labelWidth + 1, y);
    };

    // Check if we need a new page
    const checkPageBreak = (neededSpace) => {
      if (y + neededSpace > pageHeight - 30) {
        doc.addPage();
        y = margin;
        return true;
      }
      return false;
    };

    // Header
    doc.setFillColor(0, 51, 102);
    doc.rect(0, 0, pageWidth, 15, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("VERIFICATION OF BENEFITS / BREAKDOWN OF BENEFITS", pageWidth / 2, 10, { align: 'center' });
    
    y = 22;
    doc.setTextColor(0, 0, 0);

    // Helper to render custom fields in PDF
    const renderCustomFieldsPDF = (section, startY) => {
      const fields = customFields[section] || [];
      let currentY = startY;
      
      fields.forEach((field, index) => {
        const value = customFieldValues[field.id] || '';
        const label = (field.field_label || field.fieldLabel) + ':';
        const xPos = index % 2 === 0 ? col1 : col2;
        
        if (index % 2 === 0 && index > 0) {
          currentY += lineHeight;
        }
        
        addField(label, value, xPos, currentY);
      });
      
      if (fields.length > 0) {
        currentY += lineHeight;
      }
      
      return currentY;
    };

    // Patient Information Section
    doc.setFillColor(200, 220, 255);
    doc.rect(margin, y - 4, pageWidth - (margin * 2), 8, 'F');
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("PATIENT INFORMATION", margin + 2, y);
    y += 8;

    doc.setFontSize(8);
    addField("Patient Name:", patientInfo.patientName, col1, y);
    addField("DOB:", patientInfo.dob, col2, y);
    y += lineHeight;
    addField("Member ID:", patientInfo.memberId, col1, y);
    addField("Group #:", patientInfo.groupNumber, col2, y);
    y += lineHeight;
    addField("Network:", patientInfo.network, col1, y);
    addField("Address:", patientInfo.address, col2, y);
    y += lineHeight;
    y = renderCustomFieldsPDF('patient', y);
    y += 3;

    // Policy Information Section
    checkPageBreak(40);
    doc.setFillColor(200, 220, 255);
    doc.rect(margin, y - 4, pageWidth - (margin * 2), 8, 'F');
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("POLICY INFORMATION", margin + 2, y);
    y += 8;

    doc.setFontSize(8);
    addField("Policy Holder Name:", policyInfo.policyHolderName, col1, y);
    addField("SSN:", policyInfo.ssn, col2, y);
    y += lineHeight;
    addField("Policy Holder DOB:", policyInfo.policyHolderDOB, col1, y);
    addField("Effective Date:", policyInfo.effectiveDate, col2, y);
    y += lineHeight;
    addField("Type:", policyInfo.type, col1, y);
    y += lineHeight;
    y = renderCustomFieldsPDF('policy', y);
    y += 3;

    // Plan Information Section
    checkPageBreak(50);
    doc.setFillColor(200, 220, 255);
    doc.rect(margin, y - 4, pageWidth - (margin * 2), 8, 'F');
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("PLAN INFORMATION", margin + 2, y);
    y += 8;

    doc.setFontSize(8);
    addField("Insurance:", planInfo.insuranceName, col1, y);
    addField("Plan Name:", planInfo.planName, col2, y);
    y += lineHeight;
    addField("Employer:", planInfo.employer, col1, y);
    addField("Calendar Year:", planInfo.calendarYear, col2, y);
    y += lineHeight;
    addField("Benefit Year:", planInfo.benefitYear, col1, y);
    addField("Waiting Period:", planInfo.waitingPeriod, col2, y);
    y += lineHeight;
    addField("Missing Tooth Clause:", planInfo.missingToothClause, col1, y);
    addField("COB:", planInfo.cob, col2, y);
    y += lineHeight;
    y = renderCustomFieldsPDF('plan', y);
    y += 3;

    // Limitations Section
    checkPageBreak(40);
    doc.setFillColor(200, 220, 255);
    doc.rect(margin, y - 4, pageWidth - (margin * 2), 8, 'F');
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("LIMITATIONS (Frequency)", margin + 2, y);
    y += 8;

    doc.setFontSize(8);
    const col3 = margin + 65;
    const col4 = margin + 130;
    
    addField("Prophy:", limitations.prophy, col1, y);
    addField("FMX/Pano:", limitations.fmxPano, col3, y);
    addField("BWX:", limitations.bwx, col4, y);
    y += lineHeight;
    addField("Exam:", limitations.exam, col1, y);
    addField("Fluoride:", limitations.fluoride, col3, y);
    addField("Sealants:", limitations.sealants, col4, y);
    y += lineHeight;
    addField("SRP:", limitations.srp, col1, y);
    addField("Perio Maint:", limitations.perio, col3, y);
    addField("Crowns:", limitations.crowns, col4, y);
    y += lineHeight;
    addField("Dentures:", limitations.dentures, col1, y);
    addField("Implants:", limitations.implants, col3, y);
    addField("Ortho:", limitations.ortho, col4, y);
    y += lineHeight;
    y = renderCustomFieldsPDF('limitations', y);
    y += 3;

    // Maximum & Deductible Section
    checkPageBreak(60);
    doc.setFillColor(200, 220, 255);
    doc.rect(margin, y - 4, pageWidth - (margin * 2), 8, 'F');
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("MAXIMUM & DEDUCTIBLE", margin + 2, y);
    y += 8;

    doc.setFontSize(8);
    addField("Annual Max (Ind):", maxDeductible.annualMaxIndividual, col1, y);
    addField("Annual Max (Fam):", maxDeductible.annualMaxFamily, col2, y);
    y += lineHeight;
    addField("Max Used:", maxDeductible.maxUsed, col1, y);
    addField("Max Remaining:", maxDeductible.maxRemaining, col2, y);
    y += lineHeight;
    addField("Deductible (Ind):", maxDeductible.deductibleIndividual, col1, y);
    addField("Deductible (Fam):", maxDeductible.deductibleFamily, col2, y);
    y += lineHeight;
    addField("Deductible Used:", maxDeductible.deductibleUsed, col1, y);
    addField("Deductible Remaining:", maxDeductible.deductibleRemaining, col2, y);
    y += lineHeight;
    addField("Deductible Applies To:", maxDeductible.deductibleAppliesTo, col1, y);
    y += lineHeight + 2;

    // Ortho Section
    doc.setFont("helvetica", "bold");
    doc.text("Orthodontic:", col1, y);
    y += lineHeight;
    doc.setFont("helvetica", "normal");
    addField("Lifetime Max:", maxDeductible.orthoLifetimeMax, col1, y);
    addField("Max Used:", maxDeductible.orthoMaxUsed, col2, y);
    y += lineHeight;
    addField("Max Remaining:", maxDeductible.orthoMaxRemaining, col1, y);
    addField("Deductible:", maxDeductible.orthoDeductible, col2, y);
    y += lineHeight;
    addField("Age Limit (Child):", maxDeductible.orthoAgeLimitChild, col1, y);
    addField("Age Limit (Adult):", maxDeductible.orthoAgeLimitAdult, col2, y);
    y += lineHeight;
    y = renderCustomFieldsPDF('maxDeductible', y);
    y += 3;

    // Benefits Table
    checkPageBreak(50);
    doc.setFillColor(200, 220, 255);
    doc.rect(margin, y - 4, pageWidth - (margin * 2), 8, 'F');
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("BENEFITS BREAKDOWN", margin + 2, y);
    y += 6;

    doc.autoTable({
      startY: y,
      head: [['Category', 'In-Network %', 'Out-of-Network %']],
      body: [
        ['Preventive (D0100-D1999)', benefits.preventiveIn || '-', benefits.preventiveOut || '-'],
        ['Basic (D2000-D2999)', benefits.basicIn || '-', benefits.basicOut || '-'],
        ['Major (D3000-D5999)', benefits.majorIn || '-', benefits.majorOut || '-'],
        ['Orthodontic (D8000-D8999)', benefits.orthoIn || '-', benefits.orthoOut || '-'],
      ],
      theme: 'grid',
      headStyles: { fillColor: [0, 51, 102], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 70 },
        1: { cellWidth: 45, halign: 'center' },
        2: { cellWidth: 45, halign: 'center' },
      },
      margin: { left: margin, right: margin },
    });
    y = doc.autoTable.previous.finalY + 5;

    // Notes Section
    if (notes || (customFields['notes'] && customFields['notes'].length > 0)) {
      checkPageBreak(30);
      doc.setFillColor(200, 220, 255);
      doc.rect(margin, y - 4, pageWidth - (margin * 2), 8, 'F');
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("ADDITIONAL NOTES", margin + 2, y);
      y += 8;
      
      if (notes) {
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        const splitNotes = doc.splitTextToSize(notes, pageWidth - (margin * 2));
        doc.text(splitNotes, margin, y);
        y += (splitNotes.length * lineHeight) + 3;
      }
      y = renderCustomFieldsPDF('notes', y);
    }

    // Call Details Section
    checkPageBreak(30);
    doc.setFillColor(200, 220, 255);
    doc.rect(margin, y - 4, pageWidth - (margin * 2), 8, 'F');
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("CALL DETAILS", margin + 2, y);
    y += 8;

    doc.setFontSize(8);
    addField("Rep Name:", callDetails.repName, col1, y);
    addField("Call Ref #:", callDetails.callRef, col2, y);
    y += lineHeight;
    addField("Date:", callDetails.date, col1, y);
    addField("Date of Service:", dateOfService, col2, y);
    y += lineHeight;
    y = renderCustomFieldsPDF('callDetails', y);
    y += 5;

    // Footer
    checkPageBreak(20);
    doc.setDrawColor(0, 51, 102);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("GUARDIAN DENTAL BILLING LLC", margin, y);
    y += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("www.guardiandentalbilling.com | info@guardiandentalbilling.com | Guardiandentalbilling@gmail.com", margin, y);
    y += 4;
    doc.text("+1 (732) 944-0080 | Fax: +1 (732) 944-0318", margin, y);

    // Generate filename: InsuranceName_DOS_PatientName.pdf
    // Format DOS as DD-MM-YYYY
    let formattedDOS = '';
    if (dateOfService) {
      // Try to parse and format the date
      const dateMatch = dateOfService.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
      if (dateMatch) {
        const [_, month, day, year] = dateMatch;
        formattedDOS = `${day.padStart(2, '0')}-${month.padStart(2, '0')}-${year.length === 2 ? '20' + year : year}`;
      } else {
        // Try to use date as is, replacing slashes with dashes
        formattedDOS = dateOfService.replace(/\//g, '-');
      }
    } else if (callDetails.date) {
      // Use call date if DOS not available
      const dateMatch = callDetails.date.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (dateMatch) {
        formattedDOS = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
      }
    } else {
      // Use today's date
      const today = new Date();
      formattedDOS = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;
    }

    // Clean up names for filename (remove special characters)
    const cleanInsuranceName = (planInfo.insuranceName || 'Insurance').replace(/[^a-zA-Z0-9]/g, '');
    const cleanPatientName = (patientInfo.patientName || 'Patient').split(' ')[0].replace(/[^a-zA-Z0-9]/g, '');

    const filename = `${cleanInsuranceName}_${formattedDOS}_${cleanPatientName}.pdf`;

    doc.save(filename);
    toast.success(`VOB/BOB PDF saved as: ${filename}`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            📄 VOB / BOB Auto-Fill
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Upload PDF to auto-fill • Verification of Benefits / Breakdown of Benefits
          </p>
        </div>
      </div>

      {/* PDF Upload Section */}
      <div className="card p-6 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 border-2 border-dashed border-indigo-300 dark:border-indigo-700">
        <div className="flex flex-col items-center justify-center py-6">
          <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center mb-4 relative">
            <Upload className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            {appSettingsService.get().use_ai_parsing && (
              <div className="absolute -top-1 -right-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                AI
              </div>
            )}
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            Upload EOB / Insurance PDF
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 text-center max-w-md">
            {appSettingsService.get().use_ai_parsing 
              ? '🤖 AI-powered extraction! Upload any PDF and Gemini AI will intelligently fill in the form.'
              : 'Upload a PDF document and we\'ll automatically extract and fill in the form fields.'}
          </p>
          <div className="flex gap-3">
            <input
              type="file"
              accept=".pdf"
              onChange={handlePDFUpload}
              ref={fileInputRef}
              className="hidden"
              id="pdf-upload"
            />
            <label
              htmlFor="pdf-upload"
              className={`btn cursor-pointer ${
                appSettingsService.get().use_ai_parsing 
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              {appSettingsService.get().use_ai_parsing && <Sparkles className="w-4 h-4 mr-2" />}
              <FileText className="w-4 h-4 mr-2" />
              Select PDF File
            </label>
            {pdfFile && (
              <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                <CheckCircle className="w-4 h-4 mr-1 text-green-500" />
                {pdfFile.name}
              </span>
            )}
          </div>
          {isProcessing && (
            <div className="mt-4 flex items-center text-indigo-600 dark:text-indigo-400">
              <Loader className="w-5 h-5 animate-spin mr-2" />
              {appSettingsService.get().use_ai_parsing ? '🤖 AI is processing PDF...' : 'Processing PDF...'}
            </div>
          )}
        </div>
      </div>

      {/* PDF Result Modal */}
      <PDFResultModal
        isOpen={modalState.isOpen}
        status={modalState.status}
        message={modalState.message}
        fieldsFound={modalState.fieldsFound}
        extractedPreview={modalState.extractedPreview}
        onClose={() => setModalState({ isOpen: false, status: '', message: '', fieldsFound: 0, extractedPreview: '' })}
        onRetry={retryPDFProcessing}
      />

      {/* NATO Phonetic Popup */}
      <NATOPhoneticPopup
        name={patientInfo.patientName}
        isOpen={showNATOPopup}
        onClose={() => setShowNATOPopup(false)}
      />

      {/* Main Form Card */}
      <div className="card p-6">
        {/* Date of Service (for PDF filename) */}
        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xl">📅</span>
            <h3 className="text-md font-bold text-yellow-800 dark:text-yellow-200">Date of Service (for PDF filename)</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Date of Service</label>
              <input
                type="date"
                value={dateOfService}
                onChange={(e) => setDateOfService(e.target.value)}
                className="input w-full"
              />
              <p className="text-xs text-gray-500 mt-1">Used in PDF filename: InsuranceName_DOS_PatientName.pdf</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Insurance Name</label>
              <input
                type="text"
                value={planInfo.insuranceName}
                onChange={(e) => handlePlanChange('insuranceName', e.target.value)}
                className="input w-full"
                placeholder="e.g., Aetna, Cigna, Delta Dental"
              />
              <p className="text-xs text-gray-500 mt-1">Insurance carrier name for the PDF filename</p>
            </div>
          </div>
        </div>

        {/* Patient Information */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-white bg-blue-800 px-4 py-2 rounded-t-lg flex items-center justify-between">
            <span>👤 PATIENT INFORMATION</span>
            {patientInfo.patientName && (
              <button 
                onClick={() => setShowNATOPopup(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm px-3 py-1 rounded-lg transition-colors"
              >
                <Phone className="w-4 h-4" />
                🔤 Spell Name: {patientInfo.patientName}
              </button>
            )}
          </h3>
          <div className="border border-gray-200 dark:border-gray-700 rounded-b-lg p-4">
            <HelperText color="green">Good morning/afternoon. I am calling from [Practice Name] to verify dental benefits for a patient.</HelperText>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Patient Name</label>
                <input
                  type="text"
                  value={patientInfo.patientName}
                  onChange={(e) => handlePatientChange('patientName', e.target.value)}
                  className="input w-full"
                />
                <HelperText color="blue">The patient's name is [NAME]. Would you like me to spell that?</HelperText>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">DOB</label>
                <input
                  type="text"
                  value={patientInfo.dob}
                  onChange={(e) => handlePatientChange('dob', e.target.value)}
                  className="input w-full"
                  placeholder="MM/DD/YYYY"
                />
                <HelperText color="purple">The patient's date of birth is [MONTH] [DAY], [YEAR].</HelperText>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Member ID</label>
                <input
                  type="text"
                  value={patientInfo.memberId}
                  onChange={(e) => handlePatientChange('memberId', e.target.value)}
                  className="input w-full"
                />
                <HelperText color="orange">The Member ID number is [NUMBER].</HelperText>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Group #</label>
                <input
                  type="text"
                  value={patientInfo.groupNumber}
                  onChange={(e) => handlePatientChange('groupNumber', e.target.value)}
                  className="input w-full"
                />
                <HelperText color="pink">The Group Number is [NUMBER].</HelperText>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Network</label>
                <input
                  type="text"
                  value={patientInfo.network}
                  onChange={(e) => handlePatientChange('network', e.target.value)}
                  className="input w-full"
                />
                <HelperText color="teal">Is this patient in-network or out-of-network with our practice?</HelperText>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Address</label>
                <input
                  type="text"
                  value={patientInfo.address}
                  onChange={(e) => handlePatientChange('address', e.target.value)}
                  className="input w-full"
                />
                <HelperText color="amber">What is the claims mailing address, please?</HelperText>
              </div>
              {renderCustomFields('patient')}
            </div>
            <AddFieldButton section="patient" />
          </div>
        </div>

        {/* Policy Information */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-white bg-green-700 px-4 py-2 rounded-t-lg">
            POLICY INFORMATION
          </h3>
          <div className="border border-gray-200 dark:border-gray-700 rounded-b-lg p-4">
            <HelperText color="green">Is this policy currently active?</HelperText>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Policy Holder Name</label>
                <input
                  type="text"
                  value={policyInfo.policyHolderName}
                  onChange={(e) => handlePolicyChange('policyHolderName', e.target.value)}
                  className="input w-full"
                />
                <HelperText color="blue">Who is the policy holder / subscriber on this account?</HelperText>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">SSN</label>
                <input
                  type="text"
                  value={policyInfo.ssn}
                  onChange={(e) => handlePolicyChange('ssn', e.target.value)}
                  className="input w-full"
                />
                <HelperText color="purple">May I have the last four digits of the subscriber's SSN for verification?</HelperText>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Policy Holder DOB</label>
                <input
                  type="text"
                  value={policyInfo.policyHolderDOB}
                  onChange={(e) => handlePolicyChange('policyHolderDOB', e.target.value)}
                  className="input w-full"
                  placeholder="MM/DD/YYYY"
                />
                <HelperText color="orange">What is the policy holder's date of birth?</HelperText>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Effective Date</label>
                <input
                  type="text"
                  value={policyInfo.effectiveDate}
                  onChange={(e) => handlePolicyChange('effectiveDate', e.target.value)}
                  className="input w-full"
                  placeholder="MM/DD/YYYY"
                />
                <HelperText color="pink">What is the coverage effective date for this patient?</HelperText>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Type</label>
                <select
                  value={policyInfo.type}
                  onChange={(e) => handlePolicyChange('type', e.target.value)}
                  className="input w-full"
                >
                  <option value="">Select Type</option>
                  <option value="PPO">PPO</option>
                  <option value="HMO">HMO</option>
                  <option value="DHMO">DHMO</option>
                  <option value="Indemnity">Indemnity</option>
                  <option value="EPO">EPO</option>
                </select>
                <HelperText color="teal">What type of plan is this - PPO, HMO, or Indemnity?</HelperText>
              </div>
              {renderCustomFields('policy')}
            </div>
            <AddFieldButton section="policy" />
          </div>
        </div>

        {/* Plan Information */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-white bg-purple-700 px-4 py-2 rounded-t-lg">
            PLAN INFORMATION
          </h3>
          <div className="border border-gray-200 dark:border-gray-700 rounded-b-lg p-4">
            <HelperText color="purple">I have a few questions about the plan details.</HelperText>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Plan Name</label>
                <input
                  type="text"
                  value={planInfo.planName}
                  onChange={(e) => handlePlanChange('planName', e.target.value)}
                  className="input w-full"
                />
                <HelperText color="blue">What is the name of this dental plan?</HelperText>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Employer</label>
                <input
                  type="text"
                  value={planInfo.employer}
                  onChange={(e) => handlePlanChange('employer', e.target.value)}
                  className="input w-full"
                />
                <HelperText color="green">Who is the employer / group sponsor?</HelperText>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Calendar Year</label>
                <input
                  type="text"
                  value={planInfo.calendarYear}
                  onChange={(e) => handlePlanChange('calendarYear', e.target.value)}
                  className="input w-full"
                  placeholder="e.g., Jan - Dec"
                />
                <HelperText color="orange">Is the benefit year based on calendar year (January to December)?</HelperText>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Benefit Year</label>
                <input
                  type="text"
                  value={planInfo.benefitYear}
                  onChange={(e) => handlePlanChange('benefitYear', e.target.value)}
                  className="input w-full"
                />
                <HelperText color="pink">When does the benefit year start and end?</HelperText>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Waiting Period</label>
                <input
                  type="text"
                  value={planInfo.waitingPeriod}
                  onChange={(e) => handlePlanChange('waitingPeriod', e.target.value)}
                  className="input w-full"
                />
                <HelperText color="teal">Are there any waiting periods for services?</HelperText>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Missing Tooth Clause</label>
                <select
                  value={planInfo.missingToothClause}
                  onChange={(e) => handlePlanChange('missingToothClause', e.target.value)}
                  className="input w-full"
                >
                  <option value="">Select</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
                <HelperText color="amber">Is there a missing tooth clause on this plan?</HelperText>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">COB (Coordination of Benefits)</label>
                <select
                  value={planInfo.cob}
                  onChange={(e) => handlePlanChange('cob', e.target.value)}
                  className="input w-full"
                >
                  <option value="">Select</option>
                  <option value="Standard">Standard</option>
                  <option value="Non-Duplication">Non-Duplication</option>
                  <option value="Maintenance of Benefits">Maintenance of Benefits</option>
                </select>
                <HelperText color="purple">How does this plan coordinate with other insurance - standard, non-duplication, or maintenance of benefits?</HelperText>
              </div>
              {renderCustomFields('plan')}
            </div>
            <AddFieldButton section="plan" />
          </div>
        </div>

        {/* Limitations */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-white bg-orange-600 px-4 py-2 rounded-t-lg">
            LIMITATIONS (Frequency)
          </h3>
          <div className="border border-gray-200 dark:border-gray-700 rounded-b-lg p-4">
            <HelperText color="orange">I would like to ask about frequency limitations for services.</HelperText>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Prophy</label>
                <input
                  type="text"
                  value={limitations.prophy}
                  onChange={(e) => handleLimitationsChange('prophy', e.target.value)}
                  className="input w-full"
                  placeholder="e.g., 2x/year"
                />
                <HelperText color="blue">What is the frequency for prophylaxis / cleaning?</HelperText>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">FMX/Pano</label>
                <input
                  type="text"
                  value={limitations.fmxPano}
                  onChange={(e) => handleLimitationsChange('fmxPano', e.target.value)}
                  className="input w-full"
                  placeholder="e.g., 1x/5 years"
                />
                <HelperText color="green">What is the frequency for full mouth X-rays or panoramic X-ray?</HelperText>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">BWX</label>
                <input
                  type="text"
                  value={limitations.bwx}
                  onChange={(e) => handleLimitationsChange('bwx', e.target.value)}
                  className="input w-full"
                  placeholder="e.g., 2x/year"
                />
                <HelperText color="purple">What is the frequency for bitewing X-rays?</HelperText>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Exam</label>
                <input
                  type="text"
                  value={limitations.exam}
                  onChange={(e) => handleLimitationsChange('exam', e.target.value)}
                  className="input w-full"
                  placeholder="e.g., 2x/year"
                />
                <HelperText color="orange">What is the frequency for periodic exam?</HelperText>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Fluoride</label>
                <input
                  type="text"
                  value={limitations.fluoride}
                  onChange={(e) => handleLimitationsChange('fluoride', e.target.value)}
                  className="input w-full"
                  placeholder="e.g., 1x/year"
                />
                <HelperText color="pink">What is the frequency for fluoride treatment? Any age limit?</HelperText>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Sealants</label>
                <input
                  type="text"
                  value={limitations.sealants}
                  onChange={(e) => handleLimitationsChange('sealants', e.target.value)}
                  className="input w-full"
                  placeholder="e.g., 1x/tooth/lifetime"
                />
                <HelperText color="teal">What is the frequency for sealants? Any age limit?</HelperText>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">SRP</label>
                <input
                  type="text"
                  value={limitations.srp}
                  onChange={(e) => handleLimitationsChange('srp', e.target.value)}
                  className="input w-full"
                  placeholder="e.g., 1x/quad/2 years"
                />
                <HelperText color="amber">What is the frequency for scaling and root planing per quadrant?</HelperText>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Perio Maintenance</label>
                <input
                  type="text"
                  value={limitations.perio}
                  onChange={(e) => handleLimitationsChange('perio', e.target.value)}
                  className="input w-full"
                  placeholder="e.g., 4x/year"
                />
                <HelperText color="blue">What is the frequency for periodontal maintenance?</HelperText>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Crowns</label>
                <input
                  type="text"
                  value={limitations.crowns}
                  onChange={(e) => handleLimitationsChange('crowns', e.target.value)}
                  className="input w-full"
                  placeholder="e.g., 1x/5 years"
                />
                <HelperText color="green">What is the replacement frequency for crowns on the same tooth?</HelperText>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Dentures</label>
                <input
                  type="text"
                  value={limitations.dentures}
                  onChange={(e) => handleLimitationsChange('dentures', e.target.value)}
                  className="input w-full"
                  placeholder="e.g., 1x/5 years"
                />
                <HelperText color="purple">What is the replacement frequency for dentures?</HelperText>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Implants</label>
                <input
                  type="text"
                  value={limitations.implants}
                  onChange={(e) => handleLimitationsChange('implants', e.target.value)}
                  className="input w-full"
                  placeholder="e.g., Covered/Not Covered"
                />
                <HelperText color="orange">Are dental implants covered under this plan?</HelperText>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Ortho</label>
                <input
                  type="text"
                  value={limitations.ortho}
                  onChange={(e) => handleLimitationsChange('ortho', e.target.value)}
                  className="input w-full"
                  placeholder="e.g., Lifetime"
                />
                <HelperText color="pink">Is there orthodontic coverage? What is the lifetime maximum?</HelperText>
              </div>
              {renderCustomFields('limitations')}
            </div>
            <AddFieldButton section="limitations" />
          </div>
        </div>

        {/* Maximum & Deductible */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-white bg-pink-600 px-4 py-2 rounded-t-lg">
            MAXIMUM & DEDUCTIBLE
          </h3>
          <div className="border border-gray-200 dark:border-gray-700 rounded-b-lg p-4">
            <HelperText color="pink">Now I would like to ask about the annual maximum and deductible amounts.</HelperText>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4 mt-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Annual Max (Individual)</label>
                <input
                  type="text"
                  value={maxDeductible.annualMaxIndividual}
                  onChange={(e) => handleMaxDeductibleChange('annualMaxIndividual', e.target.value)}
                  className="input w-full"
                  placeholder="e.g., $1,500"
                />
                <HelperText color="blue">What is the annual maximum benefit for this patient?</HelperText>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Annual Max (Family)</label>
                <input
                  type="text"
                  value={maxDeductible.annualMaxFamily}
                  onChange={(e) => handleMaxDeductibleChange('annualMaxFamily', e.target.value)}
                  className="input w-full"
                  placeholder="e.g., $3,000"
                />
                <HelperText color="green">What is the family maximum benefit?</HelperText>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Max Used</label>
                <input
                  type="text"
                  value={maxDeductible.maxUsed}
                  onChange={(e) => handleMaxDeductibleChange('maxUsed', e.target.value)}
                  className="input w-full"
                  placeholder="e.g., $500"
                />
                <HelperText color="purple">How much of the annual maximum has been used this year?</HelperText>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Max Remaining</label>
                <input
                  type="text"
                  value={maxDeductible.maxRemaining}
                  onChange={(e) => handleMaxDeductibleChange('maxRemaining', e.target.value)}
                  className="input w-full"
                  placeholder="e.g., $1,000"
                />
                <HelperText color="orange">How much remains of the annual maximum?</HelperText>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Deductible (Individual)</label>
                <input
                  type="text"
                  value={maxDeductible.deductibleIndividual}
                  onChange={(e) => handleMaxDeductibleChange('deductibleIndividual', e.target.value)}
                  className="input w-full"
                  placeholder="e.g., $50"
                />
                <HelperText color="pink">What is the individual deductible amount?</HelperText>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Deductible (Family)</label>
                <input
                  type="text"
                  value={maxDeductible.deductibleFamily}
                  onChange={(e) => handleMaxDeductibleChange('deductibleFamily', e.target.value)}
                  className="input w-full"
                  placeholder="e.g., $150"
                />
                <HelperText color="teal">What is the family deductible amount?</HelperText>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Deductible Used</label>
                <input
                  type="text"
                  value={maxDeductible.deductibleUsed}
                  onChange={(e) => handleMaxDeductibleChange('deductibleUsed', e.target.value)}
                  className="input w-full"
                  placeholder="e.g., $50"
                />
                <HelperText color="amber">How much of the deductible has been met this year?</HelperText>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Deductible Remaining</label>
                <input
                  type="text"
                  value={maxDeductible.deductibleRemaining}
                  onChange={(e) => handleMaxDeductibleChange('deductibleRemaining', e.target.value)}
                  className="input w-full"
                  placeholder="e.g., $0"
                />
                <HelperText color="blue">How much of the deductible remains?</HelperText>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Deductible Applies To</label>
                <select
                  value={maxDeductible.deductibleAppliesTo}
                  onChange={(e) => handleMaxDeductibleChange('deductibleAppliesTo', e.target.value)}
                  className="input w-full"
                >
                  <option value="">Select</option>
                  <option value="Basic & Major Only">Basic & Major Only</option>
                  <option value="All Services">All Services</option>
                  <option value="Major Only">Major Only</option>
                  <option value="Does Not Apply to Preventive">Does Not Apply to Preventive</option>
                </select>
                <HelperText color="green">Does the deductible apply to preventive services, or only to basic and major?</HelperText>
              </div>
            </div>

            {/* Ortho Specific */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
              <h4 className="text-md font-semibold text-guardian-600 mb-3">Orthodontic Benefits</h4>
              <HelperText color="purple">I also have some questions about orthodontic benefits.</HelperText>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Lifetime Max</label>
                  <input
                    type="text"
                    value={maxDeductible.orthoLifetimeMax}
                    onChange={(e) => handleMaxDeductibleChange('orthoLifetimeMax', e.target.value)}
                    className="input w-full"
                    placeholder="e.g., $1,500"
                  />
                  <HelperText color="orange">What is the lifetime maximum for orthodontics?</HelperText>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Max Used</label>
                  <input
                    type="text"
                    value={maxDeductible.orthoMaxUsed}
                    onChange={(e) => handleMaxDeductibleChange('orthoMaxUsed', e.target.value)}
                    className="input w-full"
                  />
                  <HelperText color="pink">How much of the ortho maximum has been used?</HelperText>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Max Remaining</label>
                  <input
                    type="text"
                    value={maxDeductible.orthoMaxRemaining}
                    onChange={(e) => handleMaxDeductibleChange('orthoMaxRemaining', e.target.value)}
                    className="input w-full"
                  />
                  <HelperText color="teal">How much of the ortho maximum remains?</HelperText>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Ortho Deductible</label>
                  <input
                    type="text"
                    value={maxDeductible.orthoDeductible}
                    onChange={(e) => handleMaxDeductibleChange('orthoDeductible', e.target.value)}
                    className="input w-full"
                  />
                  <HelperText color="amber">Is there a separate deductible for orthodontics?</HelperText>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Age Limit (Child)</label>
                  <input
                    type="text"
                    value={maxDeductible.orthoAgeLimitChild}
                    onChange={(e) => handleMaxDeductibleChange('orthoAgeLimitChild', e.target.value)}
                    className="input w-full"
                    placeholder="e.g., Up to 19"
                  />
                  <HelperText color="blue">What is the age limit for orthodontic coverage for children?</HelperText>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Age Limit (Adult)</label>
                  <input
                    type="text"
                    value={maxDeductible.orthoAgeLimitAdult}
                    onChange={(e) => handleMaxDeductibleChange('orthoAgeLimitAdult', e.target.value)}
                    className="input w-full"
                    placeholder="e.g., Covered/Not Covered"
                  />
                  <HelperText color="green">Is orthodontic treatment covered for adults?</HelperText>
                </div>
                {renderCustomFields('maxDeductible')}
              </div>
            </div>
            <AddFieldButton section="maxDeductible" />
          </div>
        </div>

        {/* Benefits Breakdown */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-white bg-teal-600 px-4 py-2 rounded-t-lg">
            BENEFITS BREAKDOWN
          </h3>
          <div className="border border-gray-200 dark:border-gray-700 rounded-b-lg p-4">
            <HelperText color="teal">Now I would like to confirm the coverage percentages for each category of service.</HelperText>
            <div className="overflow-x-auto mt-3">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-800">
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Category</th>
                    <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">In-Network %</th>
                    <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">Out-of-Network %</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-blue-600 dark:text-blue-400">What to Ask</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">Preventive (D0100-D1999)</td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={benefits.preventiveIn}
                        onChange={(e) => handleBenefitsChange('preventiveIn', e.target.value)}
                        className="input w-full text-center"
                        placeholder="100%"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={benefits.preventiveOut}
                        onChange={(e) => handleBenefitsChange('preventiveOut', e.target.value)}
                        className="input w-full text-center"
                        placeholder="100%"
                      />
                    </td>
                    <td className="px-4 py-3 text-xs italic text-blue-600 dark:text-blue-400">
                      💬 "What is the coverage percentage for preventive services?"
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">Basic (D2000-D2999)</td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={benefits.basicIn}
                        onChange={(e) => handleBenefitsChange('basicIn', e.target.value)}
                        className="input w-full text-center"
                        placeholder="80%"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={benefits.basicOut}
                        onChange={(e) => handleBenefitsChange('basicOut', e.target.value)}
                        className="input w-full text-center"
                        placeholder="80%"
                      />
                    </td>
                    <td className="px-4 py-3 text-xs italic text-green-600 dark:text-green-400">
                      💬 "What is the coverage percentage for basic services like fillings?"
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">Major (D3000-D5999)</td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={benefits.majorIn}
                        onChange={(e) => handleBenefitsChange('majorIn', e.target.value)}
                        className="input w-full text-center"
                        placeholder="50%"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={benefits.majorOut}
                        onChange={(e) => handleBenefitsChange('majorOut', e.target.value)}
                        className="input w-full text-center"
                        placeholder="50%"
                      />
                    </td>
                    <td className="px-4 py-3 text-xs italic text-purple-600 dark:text-purple-400">
                      💬 "What is the coverage percentage for major services like crowns and root canals?"
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">Orthodontic (D8000-D8999)</td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={benefits.orthoIn}
                        onChange={(e) => handleBenefitsChange('orthoIn', e.target.value)}
                        className="input w-full text-center"
                        placeholder="50%"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={benefits.orthoOut}
                        onChange={(e) => handleBenefitsChange('orthoOut', e.target.value)}
                        className="input w-full text-center"
                        placeholder="50%"
                      />
                    </td>
                    <td className="px-4 py-3 text-xs italic text-orange-600 dark:text-orange-400">
                      💬 "What is the coverage percentage for orthodontic services?"
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {renderCustomFields('benefits')}
            </div>
            <AddFieldButton section="benefits" />
          </div>
        </div>

        {/* Specific Procedure Inquiries */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-white bg-cyan-600 px-4 py-2 rounded-t-lg">
            🔍 SPECIFIC PROCEDURE INQUIRIES
          </h3>
          <div className="border border-gray-200 dark:border-gray-700 rounded-b-lg p-4 bg-cyan-50 dark:bg-cyan-900/20">
            <p className="text-sm text-cyan-700 dark:text-cyan-300 italic mb-3">💡 "I'd like to check coverage for specific procedure codes..."</p>
            
            {/* Table Header */}
            <div className="hidden md:grid md:grid-cols-12 gap-2 mb-2 px-2 text-xs font-bold text-cyan-700 dark:text-cyan-300 uppercase">
              <div className="col-span-2">ADA Code</div>
              <div className="col-span-3">Description</div>
              <div className="col-span-2">Coverage %</div>
              <div className="col-span-2">Frequency</div>
              <div className="col-span-2">Notes</div>
              <div></div>
            </div>
            
            {procedureInquiries.length === 0 && (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                Click "Add Procedure" to check specific ADA codes
              </div>
            )}
            
            <div className="space-y-2 mb-4">
              {procedureInquiries.map((proc) => (
                <div key={proc.id} className="grid grid-cols-12 gap-2 items-center p-2 bg-white dark:bg-gray-800 rounded-lg border border-cyan-200 dark:border-cyan-700">
                  <div className="col-span-2 relative">
                    <input
                      type="text"
                      value={proc.adaCode}
                      onChange={(e) => updateProcedureInquiry(proc.id, 'adaCode', e.target.value.toUpperCase())}
                      onFocus={() => {
                        if (proc.adaCode && proc.adaCode.length >= 1) {
                          const results = searchADACodes(proc.adaCode, 8);
                          setAdaCodeSuggestions(results);
                          setActiveAdaCodeField(proc.id);
                        }
                      }}
                      onBlur={() => setTimeout(() => setActiveAdaCodeField(null), 200)}
                      className="input text-xs px-2 py-1 w-full font-mono"
                      placeholder="D0120"
                      autoComplete="off"
                    />
                    {activeAdaCodeField === proc.id && adaCodeSuggestions.length > 0 && (
                      <div className="absolute z-50 w-80 left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {adaCodeSuggestions.map((item) => (
                          <div
                            key={item.code}
                            onMouseDown={() => selectAdaCode(proc.id, item)}
                            className="px-2 py-2 cursor-pointer hover:bg-guardian-100 dark:hover:bg-guardian-900 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-guardian-600 dark:text-guardian-400 text-xs">
                                {item.code}
                              </span>
                              <span className="text-[10px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                                {item.category}
                              </span>
                            </div>
                            <p className="text-[10px] text-gray-600 dark:text-gray-300 mt-0.5 line-clamp-2">
                              {item.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <input
                    type="text"
                    value={proc.description}
                    onChange={(e) => updateProcedureInquiry(proc.id, 'description', e.target.value)}
                    className="input text-xs px-2 py-1 col-span-3"
                    placeholder="Procedure description"
                  />
                  <input
                    type="text"
                    value={proc.coverage}
                    onChange={(e) => updateProcedureInquiry(proc.id, 'coverage', e.target.value)}
                    className="input text-xs px-2 py-1 col-span-2"
                    placeholder="e.g., 80%"
                  />
                  <input
                    type="text"
                    value={proc.frequency}
                    onChange={(e) => updateProcedureInquiry(proc.id, 'frequency', e.target.value)}
                    className="input text-xs px-2 py-1 col-span-2"
                    placeholder="e.g., 1x/5yr"
                  />
                  <input
                    type="text"
                    value={proc.notes}
                    onChange={(e) => updateProcedureInquiry(proc.id, 'notes', e.target.value)}
                    className="input text-xs px-2 py-1 col-span-2"
                    placeholder="Notes"
                  />
                  <button
                    onClick={() => removeProcedureInquiry(proc.id)}
                    className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            
            <button
              onClick={addProcedureInquiry}
              className="btn bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Procedure
            </button>
            
            <HelperText color="teal">Is [PROCEDURE] covered under this plan? What is the coverage percentage and any frequency limitations?</HelperText>
          </div>
        </div>

        {/* Additional Notes */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-white bg-gray-600 px-4 py-2 rounded-t-lg">
            ADDITIONAL NOTES
          </h3>
          <div className="border border-gray-200 dark:border-gray-700 rounded-b-lg p-4">
            <HelperText color="amber">Is there anything else I should know about this plan? Any exclusions or special provisions?</HelperText>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input w-full h-24 resize-none mt-2"
              placeholder="Enter any additional notes or comments..."
            />
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {renderCustomFields('notes')}
            </div>
            <AddFieldButton section="notes" />
          </div>
        </div>

        {/* Call Details */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-white bg-amber-600 px-4 py-2 rounded-t-lg">
            CALL DETAILS
          </h3>
          <div className="border border-gray-200 dark:border-gray-700 rounded-b-lg p-4">
            <HelperText color="green">Before we end, may I have your name and call reference number for my records?</HelperText>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Rep Name</label>
                <input
                  type="text"
                  value={callDetails.repName}
                  onChange={(e) => handleCallChange('repName', e.target.value)}
                  className="input w-full"
                />
                <HelperText color="blue">May I have your name, please?</HelperText>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Call Ref #</label>
                <input
                  type="text"
                  value={callDetails.callRef}
                  onChange={(e) => handleCallChange('callRef', e.target.value)}
                  className="input w-full"
                />
                <HelperText color="purple">What is the call reference number for this call?</HelperText>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Date</label>
                <input
                  type="date"
                  value={callDetails.date}
                  onChange={(e) => handleCallChange('date', e.target.value)}
                  className="input w-full"
                />
                <HelperText color="orange">Thank you for your assistance. Have a great day!</HelperText>
              </div>
              {renderCustomFields('callDetails')}
            </div>
            <AddFieldButton section="callDetails" />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap justify-center gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={generatePDF}
            className="btn bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            Generate PDF
          </button>
          <button
            onClick={clearPatientInfo}
            className="btn bg-yellow-500 hover:bg-yellow-600 text-white"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Clear Patient Info
          </button>
          <button
            onClick={clearAllData}
            className="btn bg-red-500 hover:bg-red-600 text-white"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear All Data
          </button>
        </div>
      </div>

      {/* Add Custom Field Modal */}
      {showAddFieldModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Add Custom Field
              </h3>
              <button
                onClick={() => {
                  setShowAddFieldModal(false);
                  setNewFieldLabel('');
                  setNewFieldPlaceholder('');
                }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Adding field to: <span className="font-semibold capitalize">{currentSection.replace(/([A-Z])/g, ' $1').trim()}</span>
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Field Label *
                </label>
                <input
                  type="text"
                  value={newFieldLabel}
                  onChange={(e) => setNewFieldLabel(e.target.value)}
                  className="input w-full"
                  placeholder="e.g., Secondary Insurance"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Placeholder (optional)
                </label>
                <input
                  type="text"
                  value={newFieldPlaceholder}
                  onChange={(e) => setNewFieldPlaceholder(e.target.value)}
                  className="input w-full"
                  placeholder="e.g., Enter secondary insurance info"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddFieldModal(false);
                  setNewFieldLabel('');
                  setNewFieldPlaceholder('');
                }}
                className="btn bg-gray-200 hover:bg-gray-300 text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCustomField}
                className="btn bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Field
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VOBBOBAutoFillPage;
