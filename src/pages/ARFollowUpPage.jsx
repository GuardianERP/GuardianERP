/**
 * Guardian Desktop ERP - AR Follow Up Page
 * Claims Status Follow-up Form with CSV autofill and Phonetic Converter
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, FileText, Phone, Trash2, Plus, Download, 
  Volume2, RefreshCw, X, Loader2, HelpCircle, Copy
} from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { searchADACodes, getADACode } from '../data/adaCodes';

// NATO Phonetic Alphabet
const NATO_ALPHABET = {
  'A': 'Alpha', 'B': 'Bravo', 'C': 'Charlie', 'D': 'Delta', 'E': 'Echo',
  'F': 'Foxtrot', 'G': 'Golf', 'H': 'Hotel', 'I': 'India', 'J': 'Juliet',
  'K': 'Kilo', 'L': 'Lima', 'M': 'Mike', 'N': 'November', 'O': 'Oscar',
  'P': 'Papa', 'Q': 'Quebec', 'R': 'Romeo', 'S': 'Sierra', 'T': 'Tango',
  'U': 'Uniform', 'V': 'Victor', 'W': 'Whiskey', 'X': 'X-ray', 'Y': 'Yankee',
  'Z': 'Zulu', ' ': '(space)', '-': '(dash)'
};

// Convert name to NATO phonetic
const toNATOPhonetic = (name) => {
  return name.toUpperCase().split('').map(char => {
    if (NATO_ALPHABET[char]) {
      return { letter: char, phonetic: NATO_ALPHABET[char] };
    } else if (/[0-9]/.test(char)) {
      return { letter: char, phonetic: char };
    }
    return { letter: char, phonetic: char };
  });
};

// Text-to-Speech function
const speakText = (text) => {
  // Cancel any ongoing speech
  window.speechSynthesis.cancel();
  
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.9; // Slightly slower for clarity
  utterance.pitch = 1;
  utterance.volume = 1;
  
  // Try to use a US English voice
  const voices = window.speechSynthesis.getVoices();
  const usVoice = voices.find(voice => voice.lang === 'en-US' && voice.name.includes('Female')) 
    || voices.find(voice => voice.lang === 'en-US')
    || voices[0];
  if (usVoice) utterance.voice = usVoice;
  
  window.speechSynthesis.speak(utterance);
};

// Small Helper Text Component with color variants and speaker
const HelperText = ({ children, color = 'blue' }) => {
  const colorClasses = {
    blue: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20',
    green: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20',
    purple: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20',
    orange: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20',
    pink: 'text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-900/20',
    teal: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20',
    amber: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20',
  };

  const speakerColorClasses = {
    blue: 'hover:bg-blue-200 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300',
    green: 'hover:bg-green-200 dark:hover:bg-green-800 text-green-700 dark:text-green-300',
    purple: 'hover:bg-purple-200 dark:hover:bg-purple-800 text-purple-700 dark:text-purple-300',
    orange: 'hover:bg-orange-200 dark:hover:bg-orange-800 text-orange-700 dark:text-orange-300',
    pink: 'hover:bg-pink-200 dark:hover:bg-pink-800 text-pink-700 dark:text-pink-300',
    teal: 'hover:bg-teal-200 dark:hover:bg-teal-800 text-teal-700 dark:text-teal-300',
    amber: 'hover:bg-amber-200 dark:hover:bg-amber-800 text-amber-700 dark:text-amber-300',
  };
  
  const handleSpeak = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Extract just the text content, removing quotes
    const textToSpeak = typeof children === 'string' ? children.replace(/^["']|["']$/g, '') : children;
    speakText(textToSpeak);
  };
  
  return (
    <div className={`text-xs italic mt-1 px-2 py-1 rounded flex items-center gap-2 ${colorClasses[color]}`}>
      <button
        onClick={handleSpeak}
        className={`flex-shrink-0 p-1 rounded-full transition-colors cursor-pointer ${speakerColorClasses[color]}`}
        title="Click to hear this phrase"
      >
        <Volume2 className="w-4 h-4" />
      </button>
      <span className="flex-1">"{children}"</span>
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

function ARFollowUpPage() {
  // Practice Details State (persisted to localStorage)
  const [practiceData, setPracticeData] = useState({
    practiceName: '',
    practiceTax: '',
    practiceNPI: '',
    providerName: '',
    providerNPI: '',
    providerTax: '',
    practiceAddress: '',
    practicePhone: '',
    practiceFax: '',
  });

  // Form State
  const [insuranceName, setInsuranceName] = useState('');
  const [patientData, setPatientData] = useState({
    patientFirst: '',
    patientLast: '',
    dob: '',
    dos: '',
    memberId: '',
    claimNumber: '',
    claimStatus: '',
    denialReason: '',
    receivedDate: '',
    processedDate: '',
    billedAmount: '',
    paidAmount: '',
  });

  const [paymentData, setPaymentData] = useState({
    paymentMethod: 'Check',
    checkNumber: '',
    paymentDate: '',
    cashedDate: '',
    prSecIns: '',
    appealTFL: '',
  });

  const [callData, setCallData] = useState({
    repName: '',
    callRef: '',
    repDate: '',
  });

  // Procedure Codes
  const [procedureCodes, setProcedureCodes] = useState([]);
  
  // ADA Code Autocomplete
  const [adaCodeSuggestions, setAdaCodeSuggestions] = useState([]);
  const [activeAdaCodeField, setActiveAdaCodeField] = useState(null);

  // CSV Autofill
  const [csvData, setCsvData] = useState([]);
  const [fileStatus, setFileStatus] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [activeSuggestionField, setActiveSuggestionField] = useState(null);
  const fileInputRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Phonetic Converter
  const [showPhonetic, setShowPhonetic] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [phoneticResult, setPhoneticResult] = useState(null);
  const [isConverting, setIsConverting] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [phoneticError, setPhoneticError] = useState('');
  
  // NATO Popup
  const [showNATOPopup, setShowNATOPopup] = useState(false);

  // Load practice data from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('arFollowUpPracticeData');
    if (saved) {
      setPracticeData(JSON.parse(saved));
    }
  }, []);

  // Save practice data to localStorage
  const savePracticeData = (data) => {
    setPracticeData(data);
    localStorage.setItem('arFollowUpPracticeData', JSON.stringify(data));
  };

  // Handle practice data change
  const handlePracticeChange = (field, value) => {
    const newData = { ...practiceData, [field]: value };
    savePracticeData(newData);
  };

  // Handle patient data change
  const handlePatientChange = (field, value) => {
    setPatientData(prev => ({ ...prev, [field]: value }));
  };

  // Handle payment data change
  const handlePaymentChange = (field, value) => {
    setPaymentData(prev => ({ ...prev, [field]: value }));
  };

  // Handle call data change
  const handleCallChange = (field, value) => {
    setCallData(prev => ({ ...prev, [field]: value }));
  };

  // Add procedure code row
  const addProcedure = () => {
    setProcedureCodes(prev => [...prev, {
      id: Date.now(),
      dos: '',
      adaCode: '',
      procedureDescription: '',
      billed: '',
      allowed: '',
      paid: '',
      pr: ''
    }]);
  };

  // Remove procedure code row
  const removeProcedure = (id) => {
    setProcedureCodes(prev => prev.filter(p => p.id !== id));
  };

  // Update procedure code
  const updateProcedure = (id, field, value) => {
    setProcedureCodes(prev => prev.map(p => 
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
  const selectAdaCode = (procedureId, adaItem) => {
    setProcedureCodes(prev => prev.map(p => 
      p.id === procedureId 
        ? { ...p, adaCode: adaItem.code, procedureDescription: adaItem.description }
        : p
    ));
    setAdaCodeSuggestions([]);
    setActiveAdaCodeField(null);
  };

  // CSV File Upload
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      parseCSV(e.target.result);
      setFileStatus(`"${file.name}" loaded successfully.`);
    };
    reader.onerror = () => {
      setFileStatus('Error reading file.');
    };
    reader.readAsText(file);
  };

  // Parse CSV
  const parseCSV = (csvText) => {
    const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) {
      setFileStatus('CSV is empty or invalid.');
      return;
    }

    const headers = lines[0].split(',').map(h => h.toLowerCase().replace(/\s+/g, ' ').trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const entry = {};
      headers.forEach((header, index) => {
        entry[header] = values[index] || '';
      });
      data.push(entry);
    }
    setCsvData(data);
  };

  // Handle search/autofill
  const handleSearch = (field, value) => {
    handlePatientChange(field, value);
    
    if (!value.trim() || csvData.length === 0) {
      setSuggestions([]);
      setActiveSuggestionField(null);
      return;
    }

    const searchKeyMap = {
      patientFirst: 'patient first name',
      patientLast: 'patient last name',
      dob: 'date of birth',
      memberId: 'member id'
    };

    const searchKey = searchKeyMap[field];
    const query = value.toLowerCase();
    const matches = csvData.filter(p => p[searchKey]?.toLowerCase().includes(query));
    
    setSuggestions(matches.slice(0, 10));
    setActiveSuggestionField(field);
  };

  // Fill patient form from suggestion
  const fillFromSuggestion = (patient) => {
    const firstName = patient['patient first name'] || '';
    const lastName = patient['patient last name'] || '';
    
    setPatientData(prev => ({
      ...prev,
      patientFirst: firstName,
      patientLast: lastName,
      dob: patient['date of birth'] || '',
      dos: patient['date of service'] || '',
      memberId: patient['member id'] || '',
    }));
    
    setNameInput(`${firstName} ${lastName}`.trim());
    setSuggestions([]);
    setActiveSuggestionField(null);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setSuggestions([]);
        setActiveSuggestionField(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Clear functions
  const clearPracticeData = () => {
    const emptyData = {
      practiceName: '',
      practiceTax: '',
      practiceNPI: '',
      providerName: '',
      providerNPI: '',
      providerTax: '',
      practiceAddress: '',
      practicePhone: '',
      practiceFax: '',
    };
    setPracticeData(emptyData);
    localStorage.removeItem('arFollowUpPracticeData');
    toast.success('Practice data cleared');
  };

  const clearPatientData = () => {
    setPatientData({
      patientFirst: '',
      patientLast: '',
      dob: '',
      dos: '',
      memberId: '',
      claimNumber: '',
      claimStatus: '',
      denialReason: '',
      receivedDate: '',
      processedDate: '',
      billedAmount: '',
      paidAmount: '',
    });
    setProcedureCodes([]);
    toast.success('Patient data cleared');
  };

  const clearAllData = () => {
    clearPracticeData();
    setInsuranceName('');
    clearPatientData();
    setPaymentData({
      paymentMethod: 'Check',
      checkNumber: '',
      paymentDate: '',
      cashedDate: '',
      prSecIns: '',
      appealTFL: '',
    });
    setCallData({
      repName: '',
      callRef: '',
      repDate: '',
    });
    toast.success('All data cleared');
  };

  // Generate AR Comment
  const generateARComment = () => {
    const status = patientData.claimStatus?.toLowerCase() || '';
    const today = new Date().toLocaleDateString('en-US');
    let comment = '';

    if (status.includes('denied') || status.includes('denial')) {
      comment = `${today} - Called insurance (${insuranceName}). Spoke with ${callData.repName}. Ref#: ${callData.callRef}. Claim #${patientData.claimNumber} was DENIED. Reason: ${patientData.denialReason || 'N/A'}. DOS: ${patientData.dos}. Patient: ${patientData.patientFirst} ${patientData.patientLast}. Will appeal/follow up as needed.`;
    } else if (status.includes('paid in full')) {
      comment = `${today} - Called insurance (${insuranceName}). Spoke with ${callData.repName}. Ref#: ${callData.callRef}. Claim #${patientData.claimNumber} PAID IN FULL. Check#: ${paymentData.checkNumber}. Amount: $${patientData.paidAmount}. DOS: ${patientData.dos}. Patient: ${patientData.patientFirst} ${patientData.patientLast}.`;
    } else if (status.includes('paid')) {
      comment = `${today} - Called insurance (${insuranceName}). Spoke with ${callData.repName}. Ref#: ${callData.callRef}. Claim #${patientData.claimNumber} PAID. Check#: ${paymentData.checkNumber}. Paid: $${patientData.paidAmount}/${patientData.billedAmount}. PR: ${paymentData.prSecIns || 'None'}. DOS: ${patientData.dos}. Patient: ${patientData.patientFirst} ${patientData.patientLast}.`;
    } else {
      comment = `${today} - Called insurance (${insuranceName}). Spoke with ${callData.repName}. Ref#: ${callData.callRef}. Claim #${patientData.claimNumber} status: ${patientData.claimStatus}. DOS: ${patientData.dos}. Patient: ${patientData.patientFirst} ${patientData.patientLast}. Billed: $${patientData.billedAmount}.`;
    }

    navigator.clipboard.writeText(comment);
    toast.success('AR Comment copied to clipboard!');
  };

  // Get status color for PDF
  const getStatusColor = (status) => {
    const s = status?.toLowerCase() || '';
    if (s.includes('denied') || s.includes('denial')) {
      return { r: 220, g: 38, b: 38 }; // Red
    } else if (s.includes('paid in full')) {
      return { r: 34, g: 139, b: 34 }; // Green
    } else if (s.includes('paid')) {
      return { r: 144, g: 238, b: 144 }; // Light Green
    }
    return { r: 52, g: 73, b: 94 }; // Default dark
  };

  // Generate PDF - Professional Insurance EOB Style (Print-Friendly - No Backgrounds)
  const generatePDF = () => {
    const doc = new jsPDF();
    const margin = 10;
    let y = margin;
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const contentWidth = pageWidth - (margin * 2);

    // ========== HEADER - Insurance Company Banner (Border Only) ==========
    doc.setDrawColor(0, 51, 102);
    doc.setLineWidth(1);
    doc.rect(0, 0, pageWidth, 25, 'S');
    
    doc.setFontSize(18);
    doc.setTextColor(0, 51, 102);
    doc.setFont("helvetica", "bold");
    doc.text(insuranceName || "INSURANCE COMPANY", pageWidth / 2, 12, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("EXPLANATION OF BENEFITS - THIS IS NOT A BILL", pageWidth / 2, 20, { align: 'center' });
    
    y = 32;

    // ========== EOB Reference Info Box (Border Only) ==========
    doc.setDrawColor(200, 200, 200);
    doc.rect(margin, y, contentWidth, 18, 'S');
    
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text("EOB DATE:", margin + 3, y + 5);
    doc.text("CLAIM NUMBER:", margin + 50, y + 5);
    doc.text("CHECK/EFT NUMBER:", margin + 110, y + 5);
    
    doc.setFont("helvetica", "normal");
    doc.text(new Date().toLocaleDateString(), margin + 3, y + 11);
    doc.text(patientData.claimNumber || "N/A", margin + 50, y + 11);
    doc.text(paymentData.checkNumber || "N/A", margin + 110, y + 11);
    
    doc.setFont("helvetica", "bold");
    doc.text("PAYMENT DATE:", margin + 160, y + 5);
    doc.setFont("helvetica", "normal");
    doc.text(paymentData.paymentDate || "N/A", margin + 160, y + 11);
    
    y += 22;

    // ========== TWO COLUMN LAYOUT: PATIENT & PROVIDER ==========
    const colWidth = (contentWidth - 5) / 2;
    
    // Patient Information Box (Left - Border Only)
    doc.setDrawColor(100, 100, 100);
    doc.rect(margin, y, colWidth, 35, 'S');
    
    // Patient header line
    doc.setDrawColor(0, 51, 102);
    doc.setLineWidth(0.5);
    doc.line(margin, y + 7, margin + colWidth, y + 7);
    doc.setFontSize(9);
    doc.setTextColor(0, 51, 102);
    doc.setFont("helvetica", "bold");
    doc.text("PATIENT INFORMATION", margin + 3, y + 5);
    
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.text(`Patient Name: ${patientData.patientFirst} ${patientData.patientLast}`, margin + 3, y + 13);
    doc.text(`Date of Birth: ${patientData.dob || 'N/A'}`, margin + 3, y + 19);
    doc.text(`Member ID: ${patientData.memberId}`, margin + 3, y + 25);
    doc.text(`Group Number: ${patientData.claimNumber || 'N/A'}`, margin + 3, y + 31);
    
    // Provider Information Box (Right - Border Only)
    const rightCol = margin + colWidth + 5;
    doc.setDrawColor(100, 100, 100);
    doc.rect(rightCol, y, colWidth, 35, 'S');
    
    // Provider header line
    doc.setDrawColor(0, 102, 51);
    doc.setLineWidth(0.5);
    doc.line(rightCol, y + 7, rightCol + colWidth, y + 7);
    doc.setFontSize(9);
    doc.setTextColor(0, 102, 51);
    doc.setFont("helvetica", "bold");
    doc.text("PROVIDER INFORMATION", rightCol + 3, y + 5);
    
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.text(`Provider: ${practiceData.providerName || practiceData.practiceName}`, rightCol + 3, y + 13);
    doc.text(`NPI: ${practiceData.providerNPI || practiceData.practiceNPI}`, rightCol + 3, y + 19);
    doc.text(`Tax ID: ${practiceData.providerTax || practiceData.practiceTax}`, rightCol + 3, y + 25);
    doc.text(`Phone: ${practiceData.practicePhone}`, rightCol + 3, y + 31);
    
    y += 40;

    // ========== CLAIM STATUS BANNER (Border Only with Status Color Text) ==========
    const statusColor = getStatusColor(patientData.claimStatus);
    doc.setDrawColor(statusColor.r, statusColor.g, statusColor.b);
    doc.setLineWidth(1);
    doc.rect(margin, y, contentWidth, 10, 'S');
    
    doc.setFontSize(11);
    doc.setTextColor(statusColor.r, statusColor.g, statusColor.b);
    doc.setFont("helvetica", "bold");
    const statusText = `CLAIM STATUS: ${(patientData.claimStatus || 'PENDING').toUpperCase()}`;
    doc.text(statusText, margin + 5, y + 7);
    
    doc.setTextColor(0, 0, 0);
    doc.text(`DATE OF SERVICE: ${patientData.dos}`, pageWidth - margin - 60, y + 7);
    
    y += 14;

    // ========== PROCEDURE CODES TABLE ==========
    doc.setFontSize(9);
    doc.setTextColor(0, 51, 102);
    doc.setFont("helvetica", "bold");
    doc.text("SERVICE DETAIL", margin, y);
    y += 4;
    
    const tableData = procedureCodes.map(p => [
      p.dos || patientData.dos,
      p.adaCode || '',
      p.procedureDescription || '',
      `$${parseFloat(p.billed || 0).toFixed(2)}`,
      `$${parseFloat(p.allowed || 0).toFixed(2)}`,
      `$${parseFloat(p.paid || 0).toFixed(2)}`,
      `$${parseFloat(p.pr || 0).toFixed(2)}`
    ]);

    // Calculate totals
    const totalBilled = procedureCodes.reduce((sum, p) => sum + parseFloat(p.billed || 0), 0);
    const totalAllowed = procedureCodes.reduce((sum, p) => sum + parseFloat(p.allowed || 0), 0);
    const totalPaid = procedureCodes.reduce((sum, p) => sum + parseFloat(p.paid || 0), 0);
    const totalPR = procedureCodes.reduce((sum, p) => sum + parseFloat(p.pr || 0), 0);

    doc.autoTable({
      startY: y,
      head: [['Date of Service', 'Procedure', 'Description', 'Billed', 'Allowed', 'Paid', 'Patient Resp.']],
      body: tableData,
      foot: [[
        '', '', 'TOTALS:',
        `$${totalBilled.toFixed(2)}`,
        `$${totalAllowed.toFixed(2)}`,
        `$${totalPaid.toFixed(2)}`,
        `$${totalPR.toFixed(2)}`
      ]],
      theme: 'grid',
      headStyles: { 
        fillColor: [0, 51, 102], 
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center'
      },
      bodyStyles: { 
        fontSize: 7,
        cellPadding: 2
      },
      footStyles: {
        fillColor: [220, 220, 220],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 8
      },
      columnStyles: {
        0: { cellWidth: 25, halign: 'center' },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 55 },
        3: { cellWidth: 22, halign: 'right' },
        4: { cellWidth: 22, halign: 'right' },
        5: { cellWidth: 22, halign: 'right' },
        6: { cellWidth: 24, halign: 'right' }
      },
      margin: { left: margin, right: margin }
    });
    y = doc.autoTable.previous.finalY + 6;

    // ========== PAYMENT SUMMARY BOX (Border Only) ==========
    doc.setDrawColor(0, 51, 102);
    doc.setLineWidth(0.5);
    doc.rect(margin, y, contentWidth, 22, 'S');
    
    doc.setFontSize(10);
    doc.setTextColor(0, 51, 102);
    doc.setFont("helvetica", "bold");
    doc.text("PAYMENT SUMMARY", margin + 3, y + 6);
    
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    
    const summaryY = y + 12;
    doc.text(`Total Charges: $${patientData.billedAmount || totalBilled.toFixed(2)}`, margin + 3, summaryY);
    doc.text(`Plan Paid: $${patientData.paidAmount || totalPaid.toFixed(2)}`, margin + 55, summaryY);
    doc.text(`Patient Responsibility: $${totalPR.toFixed(2)}`, margin + 105, summaryY);
    doc.text(`Secondary Insurance: ${paymentData.prSecIns || 'None'}`, margin + 3, summaryY + 6);
    doc.text(`Payment Method: ${paymentData.paymentMethod}`, margin + 55, summaryY + 6);
    
    y += 26;

    // ========== DENIAL REASON (if applicable - Border Only) ==========
    if (patientData.denialReason) {
      doc.setDrawColor(220, 38, 38);
      doc.setLineWidth(0.5);
      doc.rect(margin, y, contentWidth, 20, 'S');
      
      doc.setFontSize(9);
      doc.setTextColor(180, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.text("⚠ DENIAL REASON / REMARK CODES:", margin + 3, y + 6);
      
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      const denialText = doc.splitTextToSize(patientData.denialReason, contentWidth - 6);
      doc.text(denialText, margin + 3, y + 12);
      y += 24;
    }

    // ========== CALL REFERENCE INFO (Border Only) ==========
    if (callData.repName || callData.callRef) {
      doc.setDrawColor(100, 149, 237);
      doc.setLineWidth(0.5);
      doc.rect(margin, y, contentWidth, 12, 'S');
      
      doc.setFontSize(7);
      doc.setTextColor(0, 0, 100);
      doc.setFont("helvetica", "bold");
      doc.text("VERIFICATION DETAILS:", margin + 3, y + 5);
      doc.setFont("helvetica", "normal");
      doc.text(`Representative: ${callData.repName} | Reference #: ${callData.callRef} | Call Date: ${callData.repDate}`, margin + 45, y + 5);
      doc.text(`Claim Received: ${patientData.receivedDate} | Processed: ${patientData.processedDate}`, margin + 3, y + 10);
      y += 16;
    }

    // ========== IMPORTANT DISCLAIMER (Border Only) ==========
    doc.setDrawColor(200, 180, 100);
    doc.setLineWidth(0.5);
    doc.rect(margin, y, contentWidth, 18, 'S');
    
    doc.setFontSize(6);
    doc.setTextColor(100, 80, 0);
    doc.setFont("helvetica", "bold");
    doc.text("IMPORTANT NOTICE:", margin + 3, y + 4);
    doc.setFont("helvetica", "normal");
    const noteText = "This document is a system-generated claim status report prepared by Guardian Dental Billing LLC after direct contact with the insurance representative. This is NOT an official EOB from the insurance carrier. For independent verification, contact the insurance company using the reference number and representative name provided above.";
    const splitNote = doc.splitTextToSize(noteText, contentWidth - 6);
    doc.text(splitNote, margin + 3, y + 8);
    
    y += 22;

    // ========== FOOTER ==========
    doc.setDrawColor(0, 51, 102);
    doc.setLineWidth(1);
    doc.line(margin, pageHeight - 20, pageWidth - margin, pageHeight - 20);
    
    doc.setFontSize(8);
    doc.setTextColor(0, 51, 102);
    doc.setFont("helvetica", "bold");
    doc.text("GUARDIAN DENTAL BILLING LLC", margin, pageHeight - 15);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(80, 80, 80);
    doc.text("www.guardiandentalbilling.com | info@guardiandentalbilling.com | +1 (732) 944-0080 | Fax: +1 (732) 944-0318", margin, pageHeight - 10);
    
    doc.text(`Page 1 of 1 | Generated: ${new Date().toLocaleString()}`, pageWidth - margin - 50, pageHeight - 10);

    doc.save(`EOB_${patientData.patientLast}_${patientData.claimNumber || 'claim'}.pdf`);
    toast.success('Professional EOB generated successfully!');
  };

  // Phonetic Converter Functions
  const base64ToArrayBuffer = (base64) => {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  };

  const pcmToWav = (pcmData, sampleRate) => {
    const numChannels = 1;
    const bitsPerSample = 16;
    const dataLength = pcmData.length * (bitsPerSample / 8);
    const buffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer);

    const writeString = (view, offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
    view.setUint16(32, numChannels * (bitsPerSample / 8), true);
    view.setUint16(34, bitsPerSample, true);
    writeString(view, 36, 'data');
    view.setUint32(40, dataLength, true);

    for (let i = 0; i < pcmData.length; i++) {
      view.setInt16(44 + i * 2, pcmData[i], true);
    }

    return new Blob([view], { type: 'audio/wav' });
  };

  const fetchWithRetry = async (url, options, retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, options);
        if (response.status === 429 || response.status === 503) {
          const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`API error ${response.status}: ${errorBody}`);
        }
        return response;
      } catch (e) {
        if (i === retries - 1) throw e;
      }
    }
  };

  const convertName = async () => {
    const name = nameInput.trim();
    if (!name) {
      setPhoneticError('Please enter a name.');
      return;
    }

    setIsConverting(true);
    setPhoneticError('');
    setPhoneticResult(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);

    const apiKey = "AIzaSyBI-1nm5J02NX1HBszEgeOClktTITPxAKc";
    const textApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
    const ttsApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`;

    try {
      const combinedTextPrompt = `For the name "${name}", provide two phonetic spellings in a JSON object:
1.  "simplePhonetic": A simple, easy-to-read phonetic spelling. Do not use IPA symbols. Separate phonetic words with a vertical bar (|) and name parts with a newline. (e.g., "zhawn | loo-k\\npi-KAHRD").
2.  "natoPhonetic": The NATO phonetic alphabet spelling. Separate phonetic words with a vertical bar (|) and name parts with a newline. (e.g., "Juliett | Echo | Alpha | November\\nPapa | India | Charlie | Alpha").

Provide only the JSON object.`;

      const combinedTextPayload = {
        contents: [{ parts: [{ text: combinedTextPrompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              "simplePhonetic": { "type": "STRING" },
              "natoPhonetic": { "type": "STRING" }
            },
            required: ["simplePhonetic", "natoPhonetic"]
          }
        }
      };

      const audioPayload = {
        contents: [{ parts: [{ text: `Say clearly: ${name}` }] }],
        generationConfig: { responseModalities: ["AUDIO"] },
        model: "gemini-2.5-flash-preview-tts"
      };

      const [textGenerationResponse, audioResponse] = await Promise.all([
        fetchWithRetry(textApiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(combinedTextPayload) }),
        fetchWithRetry(ttsApiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(audioPayload) })
      ]);

      const [textResult, audioResult] = await Promise.all([
        textGenerationResponse.json(),
        audioResponse.json()
      ]);

      const phoneticDataText = textResult?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!phoneticDataText) {
        throw new Error('Failed to get phonetic spellings from API.');
      }
      const phoneticData = JSON.parse(phoneticDataText);

      setPhoneticResult({
        simple: phoneticData.simplePhonetic?.trim() || '',
        nato: phoneticData.natoPhonetic?.trim() || ''
      });

      const audioPart = audioResult?.candidates?.[0]?.content?.parts?.[0];
      const audioData = audioPart?.inlineData?.data;
      const mimeType = audioPart?.inlineData?.mimeType;

      if (audioData && mimeType?.startsWith("audio/")) {
        const sampleRateMatch = mimeType.match(/rate=(\d+)/);
        if (sampleRateMatch) {
          const sampleRate = parseInt(sampleRateMatch[1], 10);
          const pcmData = base64ToArrayBuffer(audioData);
          const pcm16 = new Int16Array(pcmData);
          const wavBlob = pcmToWav(pcm16, sampleRate);
          setAudioUrl(URL.createObjectURL(wavBlob));
        }
      }
    } catch (e) {
      console.error("API call failed:", e);
      setPhoneticError(`Conversion failed. ${e.message}`);
    } finally {
      setIsConverting(false);
    }
  };

  const playAudio = () => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play();
    }
  };

  // Render phonetic words
  const renderPhoneticWords = (text, colorClass) => {
    if (!text) return null;
    const lines = text.split('\n').filter(line => line.trim() !== '');
    return lines.map((line, lineIndex) => (
      <div key={lineIndex} className="mb-1">
        {line.split('|').map((word, wordIndex) => (
          <span
            key={wordIndex}
            className={`inline-block px-3 py-1 m-1 rounded-full font-semibold ${colorClass}`}
          >
            {word.trim()}
          </span>
        ))}
      </div>
    ));
  };

  // Cleanup audio URL on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            AR Follow Up
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Claims Status Follow-up Form
          </p>
        </div>
      </div>

      {/* NATO Phonetic Popup */}
      <NATOPhoneticPopup
        name={`${patientData.patientFirst} ${patientData.patientLast}`.trim()}
        isOpen={showNATOPopup}
        onClose={() => setShowNATOPopup(false)}
      />

      {/* Main Form Card */}
      <div className="card p-6">
        {/* Insurance Name */}
        <div className="mb-6">
          <div className="bg-blue-800 text-white px-4 py-2 rounded-t-lg font-bold text-lg mb-0">
            📞 Insurance Information
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-b-lg">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Insurance Name
            </label>
            <input
              type="text"
              value={insuranceName}
              onChange={(e) => setInsuranceName(e.target.value)}
              className="input w-full"
            />
            <HelperText color="blue">"I'm calling to check on a claim status. I have [INSURANCE NAME] as the carrier."</HelperText>
          </div>
        </div>

        {/* Practice Details */}
        <div className="bg-green-700 text-white px-4 py-2 rounded-t-lg font-bold text-lg mb-0">
          🏥 Practice Details
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-b-lg mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Practice Name</label>
            <input
              type="text"
              value={practiceData.practiceName}
              onChange={(e) => handlePracticeChange('practiceName', e.target.value)}
              className="input w-full"
            />
            <HelperText color="green">"I'm calling on behalf of [PRACTICE NAME]."</HelperText>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Practice Tax ID</label>
            <input
              type="text"
              value={practiceData.practiceTax}
              onChange={(e) => handlePracticeChange('practiceTax', e.target.value)}
              className="input w-full"
            />
            <HelperText color="green">"Our practice Tax ID is [TAX ID]."</HelperText>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Practice NPI</label>
            <input
              type="text"
              value={practiceData.practiceNPI}
              onChange={(e) => handlePracticeChange('practiceNPI', e.target.value)}
              className="input w-full"
            />
            <HelperText color="green">"The practice NPI number is [NPI]."</HelperText>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Provider Name</label>
            <input
              type="text"
              value={practiceData.providerName}
              onChange={(e) => handlePracticeChange('providerName', e.target.value)}
              className="input w-full"
            />
            <HelperText color="teal">"The rendering provider is Dr. [PROVIDER NAME]."</HelperText>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Provider NPI</label>
            <input
              type="text"
              value={practiceData.providerNPI}
              onChange={(e) => handlePracticeChange('providerNPI', e.target.value)}
              className="input w-full"
            />
            <HelperText color="teal">"The provider's individual NPI is [NPI]."</HelperText>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Provider Tax ID</label>
            <input
              type="text"
              value={practiceData.providerTax}
              onChange={(e) => handlePracticeChange('providerTax', e.target.value)}
              className="input w-full"
            />
            <HelperText color="teal">"The provider's Tax ID is [TAX ID]."</HelperText>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Practice Complete Address</label>
          <input
            type="text"
            value={practiceData.practiceAddress}
            onChange={(e) => handlePracticeChange('practiceAddress', e.target.value)}
            className="input w-full"
          />
          <HelperText color="green">"Our practice address is [ADDRESS]."</HelperText>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Practice Phone Number</label>
            <input
              type="text"
              value={practiceData.practicePhone}
              onChange={(e) => handlePracticeChange('practicePhone', e.target.value)}
              className="input w-full"
            />
            <HelperText color="green">"Our phone number is [PHONE]."</HelperText>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Practice Fax Number</label>
            <input
              type="text"
              value={practiceData.practiceFax}
              onChange={(e) => handlePracticeChange('practiceFax', e.target.value)}
              className="input w-full"
            />
            <HelperText color="green">"Our fax number is [FAX]."</HelperText>
          </div>
        </div>
        </div>

        {/* Patient Details */}
        <div className="bg-purple-700 text-white px-4 py-2 rounded-t-lg font-bold text-lg mb-0 flex items-center justify-between">
          <span>👤 Patient Details</span>
          {(patientData.patientFirst || patientData.patientLast) && (
            <button
              onClick={() => setShowNATOPopup(true)}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white text-sm px-3 py-1 rounded-lg transition-colors"
            >
              <Phone className="w-4 h-4" />
              🔤 Spell Name: {patientData.patientFirst} {patientData.patientLast}
            </button>
          )}
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-b-lg mb-6">
        {fileStatus && (
          <p className="text-sm text-green-600 dark:text-green-400 mb-2 font-medium">{fileStatus}</p>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 relative" ref={suggestionsRef}>
          <div className="relative">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Patient First Name</label>
            <input
              type="text"
              value={patientData.patientFirst}
              onChange={(e) => handleSearch('patientFirst', e.target.value)}
              onFocus={() => csvData.length > 0 && setActiveSuggestionField('patientFirst')}
              className="input w-full"
              autoComplete="off"
            />
            <HelperText color="purple">"The patient's first name is [NAME]."</HelperText>
            {activeSuggestionField === 'patientFirst' && suggestions.length > 0 && (
              <div className="absolute z-50 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto mt-1">
                {suggestions.map((patient, index) => (
                  <div
                    key={index}
                    onClick={() => fillFromSuggestion(patient)}
                    className="p-2 hover:bg-guardian-100 dark:hover:bg-guardian-900 cursor-pointer text-sm text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-700"
                  >
                    {patient['patient first name']} {patient['patient last name']} (ID: {patient['member id']})
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="relative">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Patient Last Name</label>
            <input
              type="text"
              value={patientData.patientLast}
              onChange={(e) => handleSearch('patientLast', e.target.value)}
              onFocus={() => csvData.length > 0 && setActiveSuggestionField('patientLast')}
              className="input w-full"
              autoComplete="off"
            />
            <HelperText color="purple">"The patient's last name is [NAME]. Would you like me to spell that?"</HelperText>
            {activeSuggestionField === 'patientLast' && suggestions.length > 0 && (
              <div className="absolute z-50 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto mt-1">
                {suggestions.map((patient, index) => (
                  <div
                    key={index}
                    onClick={() => fillFromSuggestion(patient)}
                    className="p-2 hover:bg-guardian-100 dark:hover:bg-guardian-900 cursor-pointer text-sm text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-700"
                  >
                    {patient['patient first name']} {patient['patient last name']} (ID: {patient['member id']})
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="relative">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Date of Birth (DOB)</label>
            <input
              type="text"
              value={patientData.dob}
              onChange={(e) => handleSearch('dob', e.target.value)}
              onFocus={() => csvData.length > 0 && setActiveSuggestionField('dob')}
              className="input w-full"
              placeholder="YYYY-MM-DD"
              autoComplete="off"
            />
            <HelperText color="purple">"The patient's date of birth is [DOB]."</HelperText>
            {activeSuggestionField === 'dob' && suggestions.length > 0 && (
              <div className="absolute z-50 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto mt-1">
                {suggestions.map((patient, index) => (
                  <div
                    key={index}
                    onClick={() => fillFromSuggestion(patient)}
                    className="p-2 hover:bg-guardian-100 dark:hover:bg-guardian-900 cursor-pointer text-sm text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-700"
                  >
                    {patient['patient first name']} {patient['patient last name']} (ID: {patient['member id']})
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Date of Service (DOS)</label>
            <input
              type="text"
              value={patientData.dos}
              onChange={(e) => handlePatientChange('dos', e.target.value)}
              className="input w-full"
              placeholder="YYYY-MM-DD"
            />
            <HelperText color="purple">"The date of service was [DOS]."</HelperText>
          </div>
          <div className="lg:col-span-2 relative">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Member ID (MID)</label>
            <input
              type="text"
              value={patientData.memberId}
              onChange={(e) => handleSearch('memberId', e.target.value)}
              onFocus={() => csvData.length > 0 && setActiveSuggestionField('memberId')}
              className="input w-full"
              autoComplete="off"
            />
            <HelperText color="purple">"The member ID is [MID]. Would you like me to read that again?"</HelperText>
            {activeSuggestionField === 'memberId' && suggestions.length > 0 && (
              <div className="absolute z-50 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto mt-1">
                {suggestions.map((patient, index) => (
                  <div
                    key={index}
                    onClick={() => fillFromSuggestion(patient)}
                    className="p-2 hover:bg-guardian-100 dark:hover:bg-guardian-900 cursor-pointer text-sm text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-700"
                  >
                    {patient['patient first name']} {patient['patient last name']} (ID: {patient['member id']})
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Claim Status</label>
            <select
              value={patientData.claimStatus}
              onChange={(e) => handlePatientChange('claimStatus', e.target.value)}
              className="input w-full"
            >
              <option value="">Select Status</option>
              <option value="Paid">Paid</option>
              <option value="Paid in Full">Paid in Full</option>
              <option value="Denied">Denied</option>
              <option value="Pending">Pending</option>
              <option value="In Process">In Process</option>
              <option value="On Hold">On Hold</option>
            </select>
            <HelperText color="orange">"What is the current status of this claim?"</HelperText>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Claim Number</label>
            <input
              type="text"
              value={patientData.claimNumber}
              onChange={(e) => handlePatientChange('claimNumber', e.target.value)}
              className="input w-full"
            />
            <HelperText color="orange">"Can you provide the claim number for this submission?"</HelperText>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Received Date</label>
            <input
              type="date"
              value={patientData.receivedDate}
              onChange={(e) => handlePatientChange('receivedDate', e.target.value)}
              className="input w-full"
            />
            <HelperText color="orange">"When was the claim received by your office?"</HelperText>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Processed Date</label>
            <input
              type="date"
              value={patientData.processedDate}
              onChange={(e) => handlePatientChange('processedDate', e.target.value)}
              className="input w-full"
            />
            <HelperText color="orange">"What date was the claim processed?"</HelperText>
          </div>
        </div>

        {/* Denial Reason - Shows when status is Denied */}
        {patientData.claimStatus?.toLowerCase().includes('denied') && (
          <div className="mb-4">
            <label className="block text-sm font-semibold text-red-600 dark:text-red-400 mb-1">⚠️ Denial Reason</label>
            <textarea
              value={patientData.denialReason}
              onChange={(e) => handlePatientChange('denialReason', e.target.value)}
              className="input w-full h-20 border-red-300 dark:border-red-600"
              placeholder="Enter the denial reason provided by insurance..."
            />
            <HelperText color="orange">"What is the reason for the denial?"</HelperText>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Billed Amount</label>
            <input
              type="number"
              value={patientData.billedAmount}
              onChange={(e) => handlePatientChange('billedAmount', e.target.value)}
              className="input w-full"
            />
            <HelperText color="amber">"The total billed amount was [AMOUNT]."</HelperText>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Paid Amount</label>
            <input
              type="number"
              value={patientData.paidAmount}
              onChange={(e) => handlePatientChange('paidAmount', e.target.value)}
              className="input w-full"
            />
            <HelperText color="amber">"What was the paid amount for this claim?"</HelperText>
          </div>
        </div>
        </div>

        {/* Procedure Codes */}
        <div className="bg-teal-600 text-white px-4 py-2 rounded-t-lg font-bold text-lg mb-0">
          📋 Procedure Codes Summary
        </div>
        <div className="bg-teal-50 dark:bg-teal-900/20 p-4 rounded-b-lg mb-6">
        <p className="text-sm text-teal-700 dark:text-teal-300 italic mb-3">💡 "Can you give me the breakdown per procedure code?"</p>
        
        {/* Table Header */}
        <div className="hidden md:grid md:grid-cols-8 gap-1 mb-2 px-2 text-xs font-bold text-teal-700 dark:text-teal-300 uppercase">
          <div>DOS</div>
          <div>ADA Code</div>
          <div className="col-span-2">Procedure Description</div>
          <div>Billed</div>
          <div>Allowed</div>
          <div>Paid</div>
          <div>PR</div>
        </div>
        
        <div className="space-y-2 mb-4">
          {procedureCodes.map((proc) => (
            <div key={proc.id} className="grid grid-cols-8 gap-1 items-center p-2 bg-white dark:bg-gray-800 rounded-lg border border-teal-200 dark:border-teal-700">
              <input
                type="date"
                value={proc.dos || patientData.dos}
                onChange={(e) => updateProcedure(proc.id, 'dos', e.target.value)}
                className="input text-xs px-1 py-1"
              />
              <div className="relative">
                <input
                  type="text"
                  value={proc.adaCode}
                  onChange={(e) => updateProcedure(proc.id, 'adaCode', e.target.value.toUpperCase())}
                  onFocus={() => {
                    if (proc.adaCode && proc.adaCode.length >= 1) {
                      const results = searchADACodes(proc.adaCode, 8);
                      setAdaCodeSuggestions(results);
                      setActiveAdaCodeField(proc.id);
                    }
                  }}
                  onBlur={() => setTimeout(() => setActiveAdaCodeField(null), 200)}
                  className="input text-xs px-1 py-1 w-full font-mono"
                  placeholder="D0120"
                  autoComplete="off"
                />
                {activeAdaCodeField === proc.id && adaCodeSuggestions.length > 0 && (
                  <div className="absolute z-50 w-72 left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {adaCodeSuggestions.map((item, index) => (
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
                value={proc.procedureDescription}
                onChange={(e) => updateProcedure(proc.id, 'procedureDescription', e.target.value)}
                className="input text-xs px-1 py-1 col-span-2"
                placeholder="Periodic Oral Eval"
              />
              <input
                type="number"
                value={proc.billed}
                onChange={(e) => updateProcedure(proc.id, 'billed', e.target.value)}
                className="input text-xs px-1 py-1"
                placeholder="0.00"
              />
              <input
                type="number"
                value={proc.allowed}
                onChange={(e) => updateProcedure(proc.id, 'allowed', e.target.value)}
                className="input text-xs px-1 py-1"
                placeholder="0.00"
              />
              <input
                type="number"
                value={proc.paid}
                onChange={(e) => updateProcedure(proc.id, 'paid', e.target.value)}
                className="input text-xs px-1 py-1"
                placeholder="0.00"
              />
              <div className="flex gap-1">
                <input
                  type="number"
                  value={proc.pr}
                  onChange={(e) => updateProcedure(proc.id, 'pr', e.target.value)}
                  className="input text-xs px-1 py-1 flex-1"
                  placeholder="0.00"
                />
                <button
                  onClick={() => removeProcedure(proc.id)}
                  className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={addProcedure}
          className="btn btn-primary"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Procedure Code
        </button>
        </div>

        {/* Payment Details */}
        <div className="bg-pink-600 text-white px-4 py-2 rounded-t-lg font-bold text-lg mb-0">
          💳 Payment Details
        </div>
        <div className="bg-pink-50 dark:bg-pink-900/20 p-4 rounded-b-lg mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Payment Method</label>
            <select
              value={paymentData.paymentMethod}
              onChange={(e) => handlePaymentChange('paymentMethod', e.target.value)}
              className="input w-full"
            >
              <option value="Check">Check</option>
              <option value="Credit Card">Credit Card</option>
              <option value="EFT">EFT</option>
            </select>
            <HelperText color="pink">"How was the payment issued - check, EFT, or credit card?"</HelperText>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Check/CC Number</label>
            <input
              type="text"
              value={paymentData.checkNumber}
              onChange={(e) => handlePaymentChange('checkNumber', e.target.value)}
              className="input w-full"
            />
            <HelperText color="pink">"What is the check or EFT number for this payment?"</HelperText>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Payment Date</label>
            <input
              type="date"
              value={paymentData.paymentDate}
              onChange={(e) => handlePaymentChange('paymentDate', e.target.value)}
              className="input w-full"
            />
            <HelperText color="pink">"What date was the payment issued?"</HelperText>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Cashed Date</label>
            <input
              type="date"
              value={paymentData.cashedDate}
              onChange={(e) => handlePaymentChange('cashedDate', e.target.value)}
              className="input w-full"
            />
            <HelperText color="pink">"When was the check cashed or the EFT received?"</HelperText>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Is there any PR/Sec Ins?</label>
            <input
              type="text"
              value={paymentData.prSecIns}
              onChange={(e) => handlePaymentChange('prSecIns', e.target.value)}
              className="input w-full"
            />
            <HelperText color="amber">"Is there any patient responsibility or secondary insurance on file?"</HelperText>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Appeal TFL</label>
            <input
              type="text"
              value={paymentData.appealTFL}
              onChange={(e) => handlePaymentChange('appealTFL', e.target.value)}
              className="input w-full"
            />
            <HelperText color="amber">"What is the timely filing limit for appeals?"</HelperText>
          </div>
        </div>
        </div>

        {/* Call Details */}
        <div className="bg-gray-700 text-white px-4 py-2 rounded-t-lg font-bold text-lg mb-0">
          📞 Call Details
        </div>
        <div className="bg-gray-100 dark:bg-gray-800/50 p-4 rounded-b-lg mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Representative Name</label>
            <input
              type="text"
              value={callData.repName}
              onChange={(e) => handleCallChange('repName', e.target.value)}
              className="input w-full"
            />
            <HelperText color="blue">"May I have your name for my records please?"</HelperText>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Call Ref#</label>
            <input
              type="text"
              value={callData.callRef}
              onChange={(e) => handleCallChange('callRef', e.target.value)}
              className="input w-full"
            />
            <HelperText color="blue">"Can you provide a call reference number for this conversation?"</HelperText>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Date</label>
            <input
              type="date"
              value={callData.repDate}
              onChange={(e) => handleCallChange('repDate', e.target.value)}
              className="input w-full"
            />
            <HelperText color="blue">"Today's date is [DATE]."</HelperText>
          </div>
        </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap justify-center gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".csv"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn bg-green-600 hover:bg-green-700 text-white"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Patient CSV
          </button>
          <button
            onClick={() => setShowPhonetic(!showPhonetic)}
            className="btn bg-teal-500 hover:bg-teal-600 text-white"
          >
            <Phone className="w-4 h-4 mr-2" />
            Phonetic Spelling
          </button>
          <button
            onClick={generateARComment}
            className="btn bg-orange-500 hover:bg-orange-600 text-white"
          >
            <FileText className="w-4 h-4 mr-2" />
            Generate AR Comment
          </button>
          <button
            onClick={generatePDF}
            className="btn bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            Generate EOB
          </button>
          <button
            onClick={clearPracticeData}
            className="btn bg-yellow-500 hover:bg-yellow-600 text-white"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Clear Practice Data
          </button>
          <button
            onClick={clearPatientData}
            className="btn bg-red-500 hover:bg-red-600 text-white"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear Patient Data
          </button>
          <button
            onClick={clearAllData}
            className="btn bg-gray-700 hover:bg-gray-800 text-white"
          >
            <X className="w-4 h-4 mr-2" />
            Clear All Data
          </button>
        </div>
      </div>

      {/* Phonetic Converter Section */}
      {showPhonetic && (
        <div className="card p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 text-center">
            Phonetic Name Converter
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6 text-center">
            Enter a patient's name to get its phonetic spelling and hear the pronunciation.
          </p>

          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-grow">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Patient's Full Name
              </label>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && convertName()}
                placeholder="e.g., Jean-Luc Picard"
                className="input w-full"
                disabled={isConverting}
              />
            </div>
            <button
              onClick={convertName}
              disabled={isConverting}
              className="btn btn-primary mt-auto"
            >
              {isConverting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Converting...
                </>
              ) : (
                'Convert'
              )}
            </button>
          </div>

          {phoneticError && (
            <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-4">
              <strong className="font-bold">Error!</strong> {phoneticError}
            </div>
          )}

          {phoneticResult && (
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                <h3 className="text-gray-600 dark:text-gray-400 font-medium mb-2">Pronunciation Guide</h3>
                <div className="text-gray-800 dark:text-gray-200 font-bold text-lg">
                  {renderPhoneticWords(phoneticResult.simple, 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200')}
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                <h3 className="text-gray-600 dark:text-gray-400 font-medium mb-2">NATO Phonetic Spelling</h3>
                <div className="text-gray-800 dark:text-gray-200 font-bold text-lg">
                  {renderPhoneticWords(phoneticResult.nato, 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200')}
                </div>
              </div>

              {audioUrl && (
                <button
                  onClick={playAudio}
                  className="w-full btn bg-blue-500 hover:bg-blue-600 text-white py-3"
                >
                  <Volume2 className="w-5 h-5 mr-2" />
                  Play Pronunciation
                </button>
              )}
            </div>
          )}

          <p className="text-xs text-gray-400 text-center mt-6">Powered by Google Gemini</p>
        </div>
      )}
    </div>
  );
}

export default ARFollowUpPage;
