/**
 * Guardian Desktop ERP - VOB/BOB Page
 * Verification of Benefits / Breakdown of Benefits Form
 * Fillable and printable PDF form with custom fields support
 */

import React, { useState, useEffect } from 'react';
import { 
  Download, Trash2, RefreshCw, Plus, X, Settings, HelpCircle, Copy, Phone, Volume2
} from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { vobCustomFieldsAPI } from '../services/api';
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

function VOBBOBPage() {
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

  // Additional Notes
  const [notes, setNotes] = useState('');

  // NATO Phonetic Popup
  const [showNATOPopup, setShowNATOPopup] = useState(false);

  // Specific Procedure Inquiries (for checking specific ADA codes)
  const [procedureInquiries, setProcedureInquiries] = useState([]);
  const [adaCodeSuggestions, setAdaCodeSuggestions] = useState([]);
  const [activeAdaCodeField, setActiveAdaCodeField] = useState(null);

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
      // Group fields by section
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
      // Use snake_case for database columns
      const fieldData = {
        section: currentSection,
        field_name: `custom_${fieldName}_${Date.now()}`,
        field_label: newFieldLabel,
        field_type: 'text',
      };

      const result = await vobCustomFieldsAPI.create(fieldData);
      
      // Update local state
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
      
      // Update local state
      setCustomFields(prev => ({
        ...prev,
        [section]: (prev[section] || []).filter(f => f.id !== fieldId)
      }));

      // Remove value
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
    setCustomFieldValues({});
    toast.success('All data cleared');
  };

  // Render custom fields for a section
  const renderCustomFields = (section) => {
    const fields = customFields[section] || [];
    if (fields.length === 0) return null;

    return fields.map(field => (
      <div key={field.id} className="relative group">
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
          {field.field_label || field.fieldLabel}
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={customFieldValues[field.id] || ''}
            onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
            className="input w-full"
            placeholder={field.placeholder || ''}
          />
          <button
            onClick={() => handleDeleteCustomField(field.id, section)}
            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
            title="Delete field"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    ));
  };

  // Add Field Button component
  const AddFieldButton = ({ section }) => (
    <button
      onClick={() => openAddFieldModal(section)}
      className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 mt-2"
    >
      <Plus className="w-4 h-4" />
      Add Custom Field
    </button>
  );

  // Generate PDF
  const generatePDF = () => {
    const doc = new jsPDF();
    const margin = 10;
    let y = margin;
    const lineHeight = 5;
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const col1 = margin;
    const col2 = pageWidth / 2;
    const labelWidth = 45;

    // Helper function for label-value pairs
    const addField = (label, value, x, yPos) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text(label, x, yPos);
      doc.setFont("helvetica", "normal");
      const valueX = x + labelWidth;
      doc.text(value || '', valueX, yPos);
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
    addField("Plan Name:", planInfo.planName, col1, y);
    addField("Employer:", planInfo.employer, col2, y);
    y += lineHeight;
    addField("Calendar Year:", planInfo.calendarYear, col1, y);
    addField("Benefit Year:", planInfo.benefitYear, col2, y);
    y += lineHeight;
    addField("Waiting Period:", planInfo.waitingPeriod, col1, y);
    addField("Missing Tooth Clause:", planInfo.missingToothClause, col2, y);
    y += lineHeight;
    addField("COB:", planInfo.cob, col1, y);
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

    doc.save(`VOB_${patientInfo.patientName || 'form'}.pdf`);
    toast.success('VOB/BOB PDF generated successfully!');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            VOB / BOB
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Verification of Benefits / Breakdown of Benefits Form
          </p>
        </div>
      </div>

      {/* NATO Phonetic Popup */}
      <NATOPhoneticPopup
        name={patientInfo.patientName}
        isOpen={showNATOPopup}
        onClose={() => setShowNATOPopup(false)}
      />

      {/* Main Form Card */}
      <div className="card p-6">
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
                  type="date"
                  value={patientInfo.dob}
                  onChange={(e) => handlePatientChange('dob', e.target.value)}
                  className="input w-full"
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
                  type="date"
                  value={policyInfo.policyHolderDOB}
                  onChange={(e) => handlePolicyChange('policyHolderDOB', e.target.value)}
                  className="input w-full"
                />
                <HelperText color="orange">What is the policy holder's date of birth?</HelperText>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Effective Date</label>
                <input
                  type="date"
                  value={policyInfo.effectiveDate}
                  onChange={(e) => handlePolicyChange('effectiveDate', e.target.value)}
                  className="input w-full"
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

export default VOBBOBPage;
