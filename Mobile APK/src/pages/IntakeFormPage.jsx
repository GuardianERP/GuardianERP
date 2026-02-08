/**
 * Guardian Desktop ERP - Intake Form Page
 * Patient Intake & Registration Form with PDF Generation
 * Beautiful UI matching VOB/BOB page style
 */

import React, { useState, useEffect } from 'react';
import { 
  Download, Trash2, User, FileDown, UserPlus, Calendar, 
  Building2, Shield, Heart, Phone, MapPin, Loader2, RefreshCw,
  CheckCircle2, AlertCircle, Volume2
} from 'lucide-react';
import toast from 'react-hot-toast';

// Dynamic import for html2pdf
const loadHtml2Pdf = () => {
  return new Promise((resolve, reject) => {
    if (window.html2pdf) {
      resolve(window.html2pdf);
      return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    script.onload = () => resolve(window.html2pdf);
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

const getTodayDate = () => {
  const today = new Date();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const yyyy = today.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
};

const initialFormState = {
  // Meta
  callDate: getTodayDate(),
  patientType: 'NEW PATIENT',
  everythingSame: false,
  treatmentType: '',

  // Practice Info
  practiceName: '',
  practicePhone: '',

  // Patient Name Breakdown
  firstName: '',
  middleName: '',
  lastName: '',
  preferredName: '',

  // Patient Details
  dob: '',
  gender: '',
  language: 'English',

  // Contact
  mailingAddress: '',
  phoneNumber: '',
  emergencyContact: '',
  emailAddress: '',
  preferredContact: '',

  // Insurance
  insuranceName: '',
  memberId: '',

  // Subscriber Logic
  relationship: '', // Self, Spouse, Child, Other
  subFirstName: '',
  subMiddleName: '',
  subLastName: '',
  subDob: '',

  // Appointment
  apptReason: '',
  preferredDay: '',
  preferredDate: '',
  preferredTime: '',
  apptNote: ''
};

// Text-to-Speech function
const speakText = (text) => {
  // Cancel any ongoing speech
  window.speechSynthesis.cancel();
  
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.85; // Slightly slower for clarity
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

// Helper Text Component with colored backgrounds and speaker button
const HelperText = ({ children, color = 'blue' }) => {
  const colorClasses = {
    blue: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20',
    green: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20',
    purple: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20',
    orange: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20',
    pink: 'text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-900/20',
    teal: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20',
    amber: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20',
    indigo: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20',
  };

  const speakerColorClasses = {
    blue: 'hover:bg-blue-200 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300',
    green: 'hover:bg-green-200 dark:hover:bg-green-800 text-green-700 dark:text-green-300',
    purple: 'hover:bg-purple-200 dark:hover:bg-purple-800 text-purple-700 dark:text-purple-300',
    orange: 'hover:bg-orange-200 dark:hover:bg-orange-800 text-orange-700 dark:text-orange-300',
    pink: 'hover:bg-pink-200 dark:hover:bg-pink-800 text-pink-700 dark:text-pink-300',
    teal: 'hover:bg-teal-200 dark:hover:bg-teal-800 text-teal-700 dark:text-teal-300',
    amber: 'hover:bg-amber-200 dark:hover:bg-amber-800 text-amber-700 dark:text-amber-300',
    indigo: 'hover:bg-indigo-200 dark:hover:bg-indigo-800 text-indigo-700 dark:text-indigo-300',
  };
  
  const handleSpeak = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Extract just the text content, removing quotes
    const textToSpeak = typeof children === 'string' ? children.replace(/^["']|["']$/g, '') : children;
    speakText(textToSpeak);
  };
  
  return (
    <div className={`text-xs italic mt-1 px-2 py-1.5 rounded flex items-center gap-2 ${colorClasses[color]}`}>
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

function IntakeFormPage() {
  const [formData, setFormData] = useState(initialFormState);
  const [generating, setGenerating] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Helper for direct field updates
  const updateField = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const isSelf = formData.relationship === 'SELF';

  // Clear Functions
  const clearAll = () => {
    if (window.confirm('Are you sure you want to clear ALL information?')) {
      setFormData({
        ...initialFormState,
        callDate: getTodayDate()
      });
      toast.success('All fields cleared');
    }
  };

  const clearPatientOnly = () => {
    if (window.confirm('Clear Patient Data only? Practice info will remain.')) {
      setFormData(prev => ({
        ...initialFormState,
        callDate: prev.callDate,
        practiceName: prev.practiceName,
        practicePhone: prev.practicePhone,
        treatmentType: prev.treatmentType
      }));
      toast.success('Patient data cleared');
    }
  };

  const generatePDF = async () => {
    setGenerating(true);
    try {
      const html2pdf = await loadHtml2Pdf();
      
      const safeDate = formData.callDate.replace(/\//g, '-');
      const pName = formData.lastName ? `${formData.lastName}, ${formData.firstName}` : 'Patient';
      const insName = formData.insuranceName || 'Insurance';
      const treatmentTag = formData.treatmentType ? ` ${formData.treatmentType}` : '';
      const fileName = `${pName} - ${safeDate} ${insName}${treatmentTag}.pdf`;

      const element = document.getElementById('printable-form');

      const opt = {
        margin: 0.25,
        filename: fileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
      };

      await html2pdf().set(opt).from(element).save();
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('PDF generation failed:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <UserPlus className="w-8 h-8 text-blue-600" />
            Patient Intake Form
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            New Patient Registration & Information Collection
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="text"
            name="treatmentType"
            placeholder="File Tag (e.g. RCT)"
            className="input w-32 text-sm"
            value={formData.treatmentType}
            onChange={handleChange}
          />
          <button
            onClick={clearPatientOnly}
            className="btn btn-secondary flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Clear Patient
          </button>
          <button
            onClick={clearAll}
            className="btn bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Clear All
          </button>
          <button
            onClick={generatePDF}
            disabled={generating}
            className="btn btn-primary flex items-center gap-2"
          >
            {generating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileDown className="w-4 h-4" />
            )}
            {generating ? 'Generating...' : 'Download PDF'}
          </button>
        </div>
      </div>

      {/* Main Form Card */}
      <div className="card p-6">
        {/* Opening Script Box */}
        <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg border-2 border-green-300 dark:border-green-700">
          <h4 className="font-bold text-green-800 dark:text-green-200 mb-3 flex items-center gap-2">
            <Phone className="w-5 h-5" />
            📞 CALL OPENING SCRIPT
          </h4>
          <HelperText color="green">Good morning / Good afternoon! Thank you for calling. My name is [YOUR NAME]. How may I help you today?</HelperText>
          <HelperText color="blue">I will be happy to help you schedule an appointment. First, I need to collect some information.</HelperText>
          <HelperText color="purple">Is this appointment for yourself, or for someone else?</HelperText>
        </div>

        {/* Practice & Date Header */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-white bg-slate-800 px-4 py-2 rounded-t-lg flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            PRACTICE INFORMATION
          </h3>
          <div className="border border-gray-200 dark:border-gray-700 rounded-b-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Practice Name
                </label>
                <input
                  type="text"
                  name="practiceName"
                  value={formData.practiceName}
                  onChange={handleChange}
                  className="input w-full uppercase font-bold"
                  placeholder="Enter practice name"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Call Date
                </label>
                <input
                  type="text"
                  name="callDate"
                  value={formData.callDate}
                  onChange={handleChange}
                  className="input w-full"
                  placeholder="MM/DD/YYYY"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Patient Type Selection */}
        <div className="mb-6">
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex flex-wrap items-center gap-4 mb-3">
              <div className="flex items-center gap-3">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Patient Type:
                </label>
                <select
                  name="patientType"
                  value={formData.patientType}
                  onChange={handleChange}
                  className="input font-bold text-blue-900 dark:text-blue-100 bg-white dark:bg-gray-800 border-blue-300 dark:border-blue-600"
                >
                  <option value="NEW PATIENT">🆕 New Patient</option>
                  <option value="ESTABLISHED PATIENT">📋 Established Patient</option>
                </select>
              </div>
              
              {formData.patientType === 'ESTABLISHED PATIENT' && (
                <label className="flex items-center gap-2 bg-yellow-100 dark:bg-yellow-900/30 px-3 py-2 rounded-lg border border-yellow-300 dark:border-yellow-700 cursor-pointer">
                  <input
                    type="checkbox"
                    name="everythingSame"
                    checked={formData.everythingSame}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300"
                  />
                  <span className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
                    Is info on file still current?
                  </span>
                </label>
              )}
            </div>
            
            {formData.patientType === 'NEW PATIENT' && (
              <HelperText color="blue">Have you been to our office before, or is this your first time?</HelperText>
            )}
            
            {formData.patientType === 'ESTABLISHED PATIENT' && (
              <div className="space-y-1">
                <HelperText color="amber">I see you have been here before. Has your address or phone number changed?</HelperText>
                <HelperText color="purple">Has your insurance changed since your last visit?</HelperText>
              </div>
            )}
          </div>
        </div>

        {/* Patient Information */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-white bg-blue-700 px-4 py-2 rounded-t-lg flex items-center gap-2">
            <User className="w-5 h-5" />
            PATIENT INFORMATION
          </h3>
          <div className="border border-gray-200 dark:border-gray-700 rounded-b-lg p-4">
            <HelperText color="green">Thank you for calling! I will need to collect some information from you.</HelperText>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="input w-full"
                  placeholder="First name"
                />
                <HelperText color="blue">May I have your first name, please?</HelperText>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Middle Name
                </label>
                <input
                  type="text"
                  name="middleName"
                  value={formData.middleName}
                  onChange={handleChange}
                  className="input w-full"
                  placeholder="Middle name"
                />
                <HelperText color="purple">Do you have a middle name?</HelperText>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="input w-full font-bold"
                  placeholder="Last name"
                />
                <HelperText color="orange">And your last name? Can you spell that for me?</HelperText>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Preferred Name
                </label>
                <input
                  type="text"
                  name="preferredName"
                  value={formData.preferredName}
                  onChange={handleChange}
                  className="input w-full"
                  placeholder="Nickname or preferred"
                />
                <HelperText color="pink">Is there a name you prefer to be called?</HelperText>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Date of Birth *
                </label>
                <input
                  type="text"
                  name="dob"
                  value={formData.dob}
                  onChange={handleChange}
                  className="input w-full"
                  placeholder="MM/DD/YYYY"
                />
                <HelperText color="amber">What is your date of birth? Month, day, and year please.</HelperText>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Gender
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="input w-full"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Preferred Language
                </label>
                <select
                  name="language"
                  value={formData.language}
                  onChange={handleChange}
                  className="input w-full"
                >
                  <option value="English">English</option>
                  <option value="Spanish">Spanish</option>
                  <option value="French">French</option>
                  <option value="Other">Other</option>
                </select>
                <HelperText color="teal">What language do you prefer to communicate in?</HelperText>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                <MapPin className="w-4 h-4 inline mr-1" />
                Mailing Address
              </label>
              <textarea
                name="mailingAddress"
                value={formData.mailingAddress}
                onChange={handleChange}
                rows={2}
                className="input w-full resize-none"
                placeholder="Street address, City, State ZIP"
              />
              <HelperText color="green">May I have your mailing address? Street, city, state, and zip code please.</HelperText>
            </div>

            {/* Contact Information */}
            <div className="mt-4 p-4 bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 rounded-lg border border-teal-200 dark:border-teal-800">
              <h4 className="font-bold text-teal-800 dark:text-teal-200 mb-3 flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Contact Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="text"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    className="input w-full"
                    placeholder="(XXX) XXX-XXXX"
                  />
                  <HelperText color="teal">What is the best phone number to reach you?</HelperText>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Emergency Contact Number
                  </label>
                  <input
                    type="text"
                    name="emergencyContact"
                    value={formData.emergencyContact}
                    onChange={handleChange}
                    className="input w-full"
                    placeholder="(XXX) XXX-XXXX"
                  />
                  <HelperText color="orange">Do you have an emergency contact number we can call if needed?</HelperText>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="emailAddress"
                    value={formData.emailAddress}
                    onChange={handleChange}
                    className="input w-full"
                    placeholder="example@email.com"
                  />
                  <HelperText color="blue">May I have your email address?</HelperText>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Preferred Contact Method
                  </label>
                  <select
                    name="preferredContact"
                    value={formData.preferredContact}
                    onChange={handleChange}
                    className="input w-full"
                  >
                    <option value="">Select Preferred Method</option>
                    <option value="Home Phone">Home Phone</option>
                    <option value="Call">Call (Cell Phone)</option>
                    <option value="Text">Text Message</option>
                    <option value="Email">Email</option>
                  </select>
                  <HelperText color="purple">How do you prefer we contact you - by phone call, text, or email?</HelperText>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Insurance & Policyholder */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-white bg-indigo-700 px-4 py-2 rounded-t-lg flex items-center gap-2">
            <Shield className="w-5 h-5" />
            INSURANCE & POLICYHOLDER
          </h3>
          <div className="border border-gray-200 dark:border-gray-700 rounded-b-lg p-4">
            <HelperText color="indigo">Now I need to collect your insurance information.</HelperText>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Insurance Name *
                </label>
                <input
                  type="text"
                  name="insuranceName"
                  value={formData.insuranceName}
                  onChange={handleChange}
                  className="input w-full font-bold text-blue-900 dark:text-blue-100"
                  placeholder="e.g., Delta Dental, Cigna"
                />
                <HelperText color="blue">Do you have dental insurance? What is the name of your insurance company?</HelperText>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Member ID
                </label>
                <input
                  type="text"
                  name="memberId"
                  value={formData.memberId}
                  onChange={handleChange}
                  className="input w-full"
                  placeholder="Insurance member ID"
                />
                <HelperText color="purple">Do you have your insurance card? May I have the Member ID number?</HelperText>
              </div>
            </div>

            {/* Subscriber Relationship */}
            <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              <HelperText color="orange">Are you the main person on this insurance, or is it under someone else?</HelperText>
              <label className="block text-sm font-bold text-indigo-700 dark:text-indigo-300 mb-2 mt-2">
                Relationship to Subscriber
              </label>
              <select
                name="relationship"
                value={formData.relationship}
                onChange={handleChange}
                className="input w-full md:w-1/2 font-bold border-indigo-300 dark:border-indigo-600"
              >
                <option value="">-- Select Relationship --</option>
                <option value="SELF">SELF (Patient is Policyholder)</option>
                <option value="SPOUSE">Spouse</option>
                <option value="CHILD">Child</option>
                <option value="OTHER">Other</option>
              </select>

              {isSelf ? (
                <div className="mt-3 flex items-center gap-2 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-bold">Patient is the Policyholder - no additional subscriber info needed</span>
                </div>
              ) : formData.relationship ? (
                <div className="mt-4 p-4 bg-white dark:bg-gray-900 rounded-lg border border-slate-200 dark:border-slate-600">
                  <HelperText color="pink">I need the information of the person who holds the insurance policy.</HelperText>
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm font-bold uppercase mb-3 mt-2 border-b pb-2">
                    <AlertCircle className="w-4 h-4" />
                    Policyholder (Subscriber) Information
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        First Name
                      </label>
                      <input
                        type="text"
                        name="subFirstName"
                        value={formData.subFirstName}
                        onChange={handleChange}
                        className="input w-full"
                        placeholder="Subscriber first name"
                      />
                      <HelperText color="blue">What is the policyholder's first name?</HelperText>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Middle Name
                      </label>
                      <input
                        type="text"
                        name="subMiddleName"
                        value={formData.subMiddleName}
                        onChange={handleChange}
                        className="input w-full"
                        placeholder="Subscriber middle name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Last Name
                      </label>
                      <input
                        type="text"
                        name="subLastName"
                        value={formData.subLastName}
                        onChange={handleChange}
                        className="input w-full"
                        placeholder="Subscriber last name"
                      />
                      <HelperText color="orange">And the last name of the policyholder?</HelperText>
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Date of Birth
                    </label>
                    <input
                      type="text"
                      name="subDob"
                      value={formData.subDob}
                      onChange={handleChange}
                      className="input w-full md:w-1/3"
                      placeholder="MM/DD/YYYY"
                    />
                    <HelperText color="amber">What is the policyholder's date of birth?</HelperText>
                  </div>
                </div>
              ) : (
                <div className="mt-3 text-sm text-gray-500 dark:text-gray-400 italic">
                  Select a relationship to show subscriber fields
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Appointment Request */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-white bg-green-700 px-4 py-2 rounded-t-lg flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            APPOINTMENT REQUEST
          </h3>
          <div className="border border-gray-200 dark:border-gray-700 rounded-b-lg p-4">
            <HelperText color="green">How can we help you today? What would you like to schedule?</HelperText>
            <div className="mt-3">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Requesting an appointment for:
              </label>
              <textarea
                name="apptReason"
                value={formData.apptReason}
                onChange={handleChange}
                rows={3}
                className="input w-full resize-none"
                placeholder="e.g., Routine cleaning, toothache, crown replacement, cosmetic consultation..."
              />
              <HelperText color="teal">Is there any pain or discomfort you are experiencing?</HelperText>
              <HelperText color="purple">When was your last dental visit?</HelperText>
            </div>

            {/* Preferred Day, Date & Time */}
            <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <h4 className="font-bold text-green-800 dark:text-green-200 mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Preferred Appointment Schedule
              </h4>
              <HelperText color="green">What day works best for you?</HelperText>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Preferred Day
                  </label>
                  <select
                    name="preferredDay"
                    value={formData.preferredDay}
                    onChange={handleChange}
                    className="input w-full"
                  >
                    <option value="">Select Day</option>
                    <option value="Monday">Monday</option>
                    <option value="Tuesday">Tuesday</option>
                    <option value="Wednesday">Wednesday</option>
                    <option value="Thursday">Thursday</option>
                    <option value="Friday">Friday</option>
                    <option value="Saturday">Saturday</option>
                    <option value="Sunday">Sunday</option>
                    <option value="Any Day">Any Day</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Preferred Date
                  </label>
                  <input
                    type="date"
                    name="preferredDate"
                    value={formData.preferredDate}
                    onChange={handleChange}
                    className="input w-full"
                  />
                  <HelperText color="teal">Do you have a specific date in mind?</HelperText>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Preferred Time
                  </label>
                  <select
                    name="preferredTime"
                    value={formData.preferredTime}
                    onChange={handleChange}
                    className="input w-full"
                  >
                    <option value="">Select Time</option>
                    <option value="07:00 AM">07:00 AM</option>
                    <option value="07:30 AM">07:30 AM</option>
                    <option value="08:00 AM">08:00 AM</option>
                    <option value="08:30 AM">08:30 AM</option>
                    <option value="09:00 AM">09:00 AM</option>
                    <option value="09:30 AM">09:30 AM</option>
                    <option value="10:00 AM">10:00 AM</option>
                    <option value="10:30 AM">10:30 AM</option>
                    <option value="11:00 AM">11:00 AM</option>
                    <option value="11:30 AM">11:30 AM</option>
                    <option value="12:00 PM">12:00 PM</option>
                    <option value="12:30 PM">12:30 PM</option>
                    <option value="01:00 PM">01:00 PM</option>
                    <option value="01:30 PM">01:30 PM</option>
                    <option value="02:00 PM">02:00 PM</option>
                    <option value="02:30 PM">02:30 PM</option>
                    <option value="03:00 PM">03:00 PM</option>
                    <option value="03:30 PM">03:30 PM</option>
                    <option value="04:00 PM">04:00 PM</option>
                    <option value="04:30 PM">04:30 PM</option>
                    <option value="05:00 PM">05:00 PM</option>
                    <option value="05:30 PM">05:30 PM</option>
                    <option value="06:00 PM">06:00 PM</option>
                    <option value="06:30 PM">06:30 PM</option>
                    <option value="07:00 PM">07:00 PM</option>
                    <option value="07:30 PM">07:30 PM</option>
                    <option value="08:00 PM">08:00 PM</option>
                    <option value="Any Time">Any Time</option>
                  </select>
                  <HelperText color="purple">What time of day works best - morning or afternoon?</HelperText>
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Additional Notes
                </label>
                <textarea
                  name="apptNote"
                  value={formData.apptNote}
                  onChange={handleChange}
                  rows={2}
                  className="input w-full resize-none"
                  placeholder="Any special requests, concerns, or notes..."
                />
                <HelperText color="orange">Is there anything else we should know before your appointment?</HelperText>
              </div>
            </div>
          </div>
        </div>

        {/* Closing Script Box */}
        <div className="mb-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-lg border-2 border-amber-300 dark:border-amber-700">
          <h4 className="font-bold text-amber-800 dark:text-amber-200 mb-3 flex items-center gap-2">
            <Phone className="w-5 h-5" />
            📞 CALL CLOSING SCRIPT
          </h4>
          <HelperText color="amber">Let me repeat the information back to you to make sure I have everything correct.</HelperText>
          <HelperText color="orange">Your name is [NAME], date of birth [DOB], and your insurance is [INSURANCE]. Is that correct?</HelperText>
          <HelperText color="teal">Is there a phone number where we can reach you? And an email address?</HelperText>
          <HelperText color="green">We will call you back to confirm your appointment. Thank you for choosing [PRACTICE NAME]!</HelperText>
          <HelperText color="blue">Is there anything else I can help you with today? Have a great day!</HelperText>
        </div>

        {/* Quick Summary */}
        {(formData.firstName || formData.lastName || formData.insuranceName) && (
          <div className="p-4 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-2">📋 Quick Summary</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Patient: </span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">
                  {formData.firstName} {formData.lastName || '(Name pending)'}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">DOB: </span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">
                  {formData.dob || '(Not entered)'}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Insurance: </span>
                <span className="font-semibold text-blue-700 dark:text-blue-300">
                  {formData.insuranceName || '(Not entered)'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Hidden Printable Form for PDF Generation - Professional Single Page Layout */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <div
          id="printable-form"
          style={{
            backgroundColor: 'white',
            width: '8in',
            padding: '0.4in 0.5in',
            color: '#1a1a1a',
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '10pt',
            lineHeight: '1.3'
          }}
        >
          {/* Professional Header */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px' }}>
            <tbody>
              <tr>
                <td style={{ width: '60%', verticalAlign: 'top' }}>
                  <div style={{ fontSize: '18pt', fontWeight: 'bold', color: '#1a365d', marginBottom: '2px' }}>
                    {formData.practiceName || 'PRACTICE NAME'}
                  </div>
                  <div style={{ fontSize: '9pt', color: '#4a5568', fontWeight: '600' }}>
                    PATIENT INTAKE FORM
                  </div>
                </td>
                <td style={{ width: '40%', verticalAlign: 'top', textAlign: 'right' }}>
                  <div style={{ fontSize: '9pt', color: '#4a5568' }}>
                    <strong>Date:</strong> {formData.callDate}
                  </div>
                  <div style={{ fontSize: '8pt', color: '#718096', marginTop: '4px' }}>
                    Processed by Guardian Dental Billing<br />
                    www.guardiandentalbilling.com
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Patient Type Badge */}
          <div style={{ marginBottom: '10px' }}>
            <span style={{ 
              display: 'inline-block',
              backgroundColor: formData.patientType === 'NEW PATIENT' ? '#ebf8ff' : '#fefcbf',
              color: formData.patientType === 'NEW PATIENT' ? '#2b6cb0' : '#975a16',
              border: formData.patientType === 'NEW PATIENT' ? '1px solid #90cdf4' : '1px solid #f6e05e',
              padding: '3px 10px',
              borderRadius: '4px',
              fontSize: '9pt',
              fontWeight: 'bold'
            }}>
              {formData.patientType}
            </span>
            {formData.patientType === 'ESTABLISHED PATIENT' && formData.everythingSame && (
              <span style={{ 
                marginLeft: '10px',
                fontSize: '9pt',
                color: '#276749',
                fontWeight: '600'
              }}>
                ✓ Information on file is current
              </span>
            )}
          </div>

          {/* SECTION 1: Patient Information */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ 
              backgroundColor: '#2d3748', 
              color: 'white', 
              padding: '5px 10px', 
              fontSize: '10pt', 
              fontWeight: 'bold',
              marginBottom: '8px'
            }}>
              PATIENT INFORMATION
            </div>
            
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt' }}>
              <tbody>
                <tr>
                  <td style={{ width: '25%', padding: '3px 0', borderBottom: '1px solid #e2e8f0' }}>
                    <span style={{ color: '#718096', fontSize: '8pt' }}>First Name</span><br />
                    <strong>{formData.firstName}</strong>
                  </td>
                  <td style={{ width: '20%', padding: '3px 0', borderBottom: '1px solid #e2e8f0' }}>
                    <span style={{ color: '#718096', fontSize: '8pt' }}>Middle</span><br />
                    <strong>{formData.middleName}</strong>
                  </td>
                  <td style={{ width: '25%', padding: '3px 0', borderBottom: '1px solid #e2e8f0' }}>
                    <span style={{ color: '#718096', fontSize: '8pt' }}>Last Name</span><br />
                    <strong>{formData.lastName}</strong>
                  </td>
                  <td style={{ width: '30%', padding: '3px 0', borderBottom: '1px solid #e2e8f0' }}>
                    <span style={{ color: '#718096', fontSize: '8pt' }}>Preferred Name</span><br />
                    {formData.preferredName || '—'}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '3px 0', borderBottom: '1px solid #e2e8f0' }}>
                    <span style={{ color: '#718096', fontSize: '8pt' }}>Date of Birth</span><br />
                    <strong>{formData.dob}</strong>
                  </td>
                  <td style={{ padding: '3px 0', borderBottom: '1px solid #e2e8f0' }}>
                    <span style={{ color: '#718096', fontSize: '8pt' }}>Gender</span><br />
                    {formData.gender || '—'}
                  </td>
                  <td colSpan="2" style={{ padding: '3px 0', borderBottom: '1px solid #e2e8f0' }}>
                    <span style={{ color: '#718096', fontSize: '8pt' }}>Preferred Language</span><br />
                    {formData.language}
                  </td>
                </tr>
                <tr>
                  <td colSpan="4" style={{ padding: '3px 0', borderBottom: '1px solid #e2e8f0' }}>
                    <span style={{ color: '#718096', fontSize: '8pt' }}>Mailing Address</span><br />
                    {formData.mailingAddress || '—'}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '3px 0', borderBottom: '1px solid #e2e8f0' }}>
                    <span style={{ color: '#718096', fontSize: '8pt' }}>Phone Number</span><br />
                    <strong>{formData.phoneNumber || '—'}</strong>
                  </td>
                  <td style={{ padding: '3px 0', borderBottom: '1px solid #e2e8f0' }}>
                    <span style={{ color: '#718096', fontSize: '8pt' }}>Emergency</span><br />
                    {formData.emergencyContact || '—'}
                  </td>
                  <td style={{ padding: '3px 0', borderBottom: '1px solid #e2e8f0' }}>
                    <span style={{ color: '#718096', fontSize: '8pt' }}>Email Address</span><br />
                    {formData.emailAddress || '—'}
                  </td>
                  <td style={{ padding: '3px 0', borderBottom: '1px solid #e2e8f0' }}>
                    <span style={{ color: '#718096', fontSize: '8pt' }}>Preferred Contact</span><br />
                    {formData.preferredContact || '—'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* SECTION 2: Insurance Information */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ 
              backgroundColor: '#2d3748', 
              color: 'white', 
              padding: '5px 10px', 
              fontSize: '10pt', 
              fontWeight: 'bold',
              marginBottom: '8px'
            }}>
              INSURANCE INFORMATION
            </div>
            
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt' }}>
              <tbody>
                <tr>
                  <td style={{ width: '40%', padding: '3px 0', borderBottom: '1px solid #e2e8f0' }}>
                    <span style={{ color: '#718096', fontSize: '8pt' }}>Insurance Company</span><br />
                    <strong style={{ color: '#2b6cb0' }}>{formData.insuranceName || '—'}</strong>
                  </td>
                  <td style={{ width: '30%', padding: '3px 0', borderBottom: '1px solid #e2e8f0' }}>
                    <span style={{ color: '#718096', fontSize: '8pt' }}>Member ID</span><br />
                    <strong>{formData.memberId || '—'}</strong>
                  </td>
                  <td style={{ width: '30%', padding: '3px 0', borderBottom: '1px solid #e2e8f0' }}>
                    <span style={{ color: '#718096', fontSize: '8pt' }}>Relationship to Subscriber</span><br />
                    <strong>{formData.relationship || '—'}</strong>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Policyholder Section */}
            {isSelf ? (
              <div style={{ 
                marginTop: '6px',
                padding: '4px 8px',
                backgroundColor: '#f0fff4',
                border: '1px solid #9ae6b4',
                borderRadius: '3px',
                fontSize: '9pt',
                color: '#276749'
              }}>
                ✓ Patient is the Policyholder
              </div>
            ) : formData.relationship && (
              <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#f7fafc', border: '1px solid #e2e8f0', borderRadius: '3px' }}>
                <div style={{ fontSize: '8pt', color: '#4a5568', fontWeight: 'bold', marginBottom: '4px' }}>POLICYHOLDER INFORMATION</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt' }}>
                  <tbody>
                    <tr>
                      <td style={{ width: '25%', padding: '2px 0' }}>
                        <span style={{ color: '#718096', fontSize: '8pt' }}>First Name</span><br />
                        {formData.subFirstName || '—'}
                      </td>
                      <td style={{ width: '25%', padding: '2px 0' }}>
                        <span style={{ color: '#718096', fontSize: '8pt' }}>Middle Name</span><br />
                        {formData.subMiddleName || '—'}
                      </td>
                      <td style={{ width: '25%', padding: '2px 0' }}>
                        <span style={{ color: '#718096', fontSize: '8pt' }}>Last Name</span><br />
                        {formData.subLastName || '—'}
                      </td>
                      <td style={{ width: '25%', padding: '2px 0' }}>
                        <span style={{ color: '#718096', fontSize: '8pt' }}>Date of Birth</span><br />
                        {formData.subDob || '—'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* SECTION 3: Appointment Request */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ 
              backgroundColor: '#2d3748', 
              color: 'white', 
              padding: '5px 10px', 
              fontSize: '10pt', 
              fontWeight: 'bold',
              marginBottom: '8px'
            }}>
              APPOINTMENT REQUEST
            </div>
            <div style={{ 
              border: '1px solid #e2e8f0', 
              padding: '8px', 
              minHeight: '40px',
              fontSize: '9pt',
              backgroundColor: '#fafafa',
              whiteSpace: 'pre-wrap'
            }}>
              {formData.apptReason || 'No appointment reason specified.'}
            </div>
            
            {/* Preferred Schedule */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt', marginTop: '8px' }}>
              <tbody>
                <tr>
                  <td style={{ width: '33%', padding: '3px 0', borderBottom: '1px solid #e2e8f0' }}>
                    <span style={{ color: '#718096', fontSize: '8pt' }}>Preferred Day</span><br />
                    <strong>{formData.preferredDay || '—'}</strong>
                  </td>
                  <td style={{ width: '33%', padding: '3px 0', borderBottom: '1px solid #e2e8f0' }}>
                    <span style={{ color: '#718096', fontSize: '8pt' }}>Preferred Date</span><br />
                    <strong>{formData.preferredDate || '—'}</strong>
                  </td>
                  <td style={{ width: '33%', padding: '3px 0', borderBottom: '1px solid #e2e8f0' }}>
                    <span style={{ color: '#718096', fontSize: '8pt' }}>Preferred Time</span><br />
                    <strong>{formData.preferredTime || '—'}</strong>
                  </td>
                </tr>
              </tbody>
            </table>
            
            {formData.apptNote && (
              <div style={{ marginTop: '6px', padding: '6px', backgroundColor: '#f7fafc', border: '1px solid #e2e8f0', borderRadius: '3px' }}>
                <span style={{ color: '#718096', fontSize: '8pt' }}>Additional Notes:</span><br />
                <span style={{ fontSize: '9pt' }}>{formData.apptNote}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ 
            borderTop: '2px solid #2d3748',
            paddingTop: '8px',
            marginTop: 'auto'
          }}>
            {/* Important Notice */}
            <div style={{ 
              backgroundColor: '#fffbeb',
              border: '1px solid #fcd34d',
              padding: '6px 8px',
              marginBottom: '8px',
              fontSize: '7pt',
              color: '#92400e',
              lineHeight: '1.4'
            }}>
              <strong>IMPORTANT NOTICE:</strong> This document is a formal patient intake and registration summary prepared by Guardian Dental Billing LLC. The information contained herein is recorded based on data provided during intake and is intended solely for the administrative use of the designated dental practice. Independent verification of insurance eligibility with the carrier is recommended prior to treatment.<br />
              <strong>HIPAA COMPLIANCE:</strong> This document contains Protected Health Information (PHI) and is subject to the Health Insurance Portability and Accountability Act (HIPAA). Unauthorized disclosure, copying, or distribution is strictly prohibited.
            </div>

            {/* Company Footer */}
            <table style={{ width: '100%', fontSize: '8pt', color: '#4a5568' }}>
              <tbody>
                <tr>
                  <td style={{ verticalAlign: 'top' }}>
                    <strong style={{ color: '#1a365d' }}>GUARDIAN DENTAL BILLING LLC</strong><br />
                    www.guardiandentalbilling.com | info@guardiandentalbilling.com
                  </td>
                  <td style={{ textAlign: 'right', verticalAlign: 'top' }}>
                    Phone: +1 (732) 944-0080 | Fax: +1 (732) 944-0318<br />
                    Page 1 of 1 | Generated: {new Date().toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default IntakeFormPage;
