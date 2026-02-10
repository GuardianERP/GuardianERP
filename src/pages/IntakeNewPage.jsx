/**
 * Guardian Desktop ERP - Intake New Page
 * Simplified Patient Intake Form with Scheduling Rules & PDF Generation
 */

import React, { useState, useRef } from 'react';
import {
  Download, Trash2, User, FileDown, UserPlus, Calendar,
  Shield, Phone, Loader2, RefreshCw, Clock, AlertTriangle,
  CheckCircle2, Info
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

// ── Treatment types with scheduling rules ──────────────────────────
const TREATMENT_OPTIONS = [
  { value: '', label: 'Select a treatment...' },
  { value: 'Checkup', label: 'Checkup / Cleaning' },
  { value: 'Root Canal', label: 'Root Canal Consult / Treatment' },
  { value: 'Extraction', label: 'Extraction (NO Wisdom Teeth #1,#16,#17,#32)' },
  { value: 'Wisdom Teeth', label: 'Extraction (ONLY Wisdom Teeth)' },
  { value: 'Crowns/Bridges/Dentures', label: 'Crowns, Bridges, Dentures' },
  { value: 'Filling', label: 'Filling (Composite / Amalgam)' },
  { value: 'Deep Cleaning', label: 'Deep Cleaning (Scaling & Root Planing)' },
  { value: 'Implant Consult', label: 'Implant Consultation' },
  { value: 'Implant Placement', label: 'Implant Placement / Surgery' },
  { value: 'Veneer', label: 'Veneers' },
  { value: 'Whitening', label: 'Teeth Whitening' },
  { value: 'Night Guard', label: 'Night Guard / Mouth Guard' },
  { value: 'Orthodontic Consult', label: 'Orthodontic Consultation' },
  { value: 'Braces/Aligners', label: 'Braces / Clear Aligners' },
  { value: 'Periodontal', label: 'Periodontal Treatment' },
  { value: 'Denture Repair', label: 'Denture Repair / Reline' },
  { value: 'Emergency', label: 'Emergency / Toothache / Pain' },
  { value: 'Pediatric', label: 'Pediatric Dental Visit' },
  { value: 'Sealants', label: 'Sealants' },
  { value: 'Fluoride Treatment', label: 'Fluoride Treatment' },
  { value: 'Bone Graft', label: 'Bone Graft' },
  { value: 'Gum Surgery', label: 'Gum Surgery / Gingivectomy' },
  { value: 'TMJ/TMD', label: 'TMJ / TMD Evaluation' },
  { value: 'Oral Surgery Consult', label: 'Oral Surgery Consultation' },
  { value: 'Biopsy', label: 'Biopsy / Oral Pathology' },
  { value: 'Inlay/Onlay', label: 'Inlay / Onlay' },
  { value: 'Post and Core', label: 'Post and Core Build-Up' },
  { value: 'Space Maintainer', label: 'Space Maintainer (Pediatric)' },
  { value: 'Frenectomy', label: 'Frenectomy' },
  { value: 'Other', label: 'Other (Specify in notes)' },
];

// Day availability per treatment (0=Sun,1=Mon,...6=Sat)
const SCHEDULE_RULES = {
  'Checkup': {
    days: {
      1: { label: 'Monday', start: '09:00', end: '17:00' },
      2: { label: 'Tuesday', start: '09:00', end: '17:00' },
      3: { label: 'Wednesday', start: '09:00', end: '17:00' },
      // NO Thursdays
      5: { label: 'Friday', start: '09:00', end: '15:00' },
    },
    note: 'Checkups: Mon–Wed 9am–5pm, NO Thursdays, Fri 9am–3pm',
  },
  'Root Canal': {
    days: {
      1: { label: 'Monday', start: '11:00', end: '16:00' },
      2: { label: 'Tuesday', start: '09:00', end: '16:00' },
      3: { label: 'Wednesday', start: '11:00', end: '16:00' },
      4: { label: 'Thursday', start: '09:00', end: '16:00' },
      5: { label: 'Friday', start: '11:00', end: '15:00' },
    },
    note: 'Root Canal: Mon & Wed 11am–4pm, Tue & Thu 9am–4pm, Fri 11am–3pm',
  },
  'Extraction': {
    days: {
      2: { label: 'Tuesday', start: '09:00', end: '16:00' },
    },
    note: 'Extractions (NO wisdom teeth #1,#16,#17,#32): Tuesdays 9am–4pm only',
  },
  'Wisdom Teeth': {
    days: {
      4: { label: 'Thursday', start: '09:00', end: '14:00' },
    },
    note: 'Wisdom Teeth: One Thursday a month — 3/5/26, 4/23/26 — 9am–2pm',
    specialDates: ['2026-03-05', '2026-04-23'],
  },
  'Crowns/Bridges/Dentures': {
    days: {
      1: { label: 'Monday', start: '09:00', end: '16:00' },
      2: { label: 'Tuesday', start: '09:00', end: '12:00' },
      3: { label: 'Wednesday', start: '09:00', end: '16:00' },
      4: { label: 'Thursday', start: '09:00', end: '16:00' },
      5: { label: 'Friday', start: '09:00', end: '12:00' },
    },
    note: 'Crowns/Bridges/Dentures: Mon 9–4, Tue 9–12, Wed 9–4, Thu 9–4, Fri 9–12',
  },
  'Filling': {
    days: {
      1: { label: 'Monday', start: '09:00', end: '17:00' },
      2: { label: 'Tuesday', start: '09:00', end: '17:00' },
      3: { label: 'Wednesday', start: '09:00', end: '17:00' },
      4: { label: 'Thursday', start: '09:00', end: '16:00' },
      5: { label: 'Friday', start: '09:00', end: '15:00' },
    },
    note: 'Fillings: Mon–Wed 9am–5pm, Thu 9am–4pm, Fri 9am–3pm',
  },
  'Deep Cleaning': {
    days: {
      1: { label: 'Monday', start: '09:00', end: '17:00' },
      2: { label: 'Tuesday', start: '09:00', end: '17:00' },
      3: { label: 'Wednesday', start: '09:00', end: '17:00' },
      5: { label: 'Friday', start: '09:00', end: '15:00' },
    },
    note: 'Deep Cleaning: Mon–Wed 9am–5pm, NO Thursdays, Fri 9am–3pm',
  },
  'Implant Consult': {
    days: {
      1: { label: 'Monday', start: '09:00', end: '16:00' },
      3: { label: 'Wednesday', start: '09:00', end: '16:00' },
      4: { label: 'Thursday', start: '09:00', end: '16:00' },
    },
    note: 'Implant Consult: Mon, Wed, Thu 9am–4pm',
  },
  'Implant Placement': {
    days: {
      1: { label: 'Monday', start: '09:00', end: '16:00' },
      3: { label: 'Wednesday', start: '09:00', end: '16:00' },
      4: { label: 'Thursday', start: '09:00', end: '16:00' },
    },
    note: 'Implant Surgery: Mon, Wed, Thu 9am–4pm',
  },
  'Veneer': {
    days: {
      1: { label: 'Monday', start: '09:00', end: '16:00' },
      2: { label: 'Tuesday', start: '09:00', end: '12:00' },
      3: { label: 'Wednesday', start: '09:00', end: '16:00' },
      4: { label: 'Thursday', start: '09:00', end: '16:00' },
      5: { label: 'Friday', start: '09:00', end: '12:00' },
    },
    note: 'Veneers: Mon 9–4, Tue 9–12, Wed 9–4, Thu 9–4, Fri 9–12',
  },
  'Whitening': {
    days: {
      1: { label: 'Monday', start: '09:00', end: '17:00' },
      2: { label: 'Tuesday', start: '09:00', end: '17:00' },
      3: { label: 'Wednesday', start: '09:00', end: '17:00' },
      5: { label: 'Friday', start: '09:00', end: '15:00' },
    },
    note: 'Whitening: Mon–Wed 9am–5pm, Fri 9am–3pm',
  },
  'Night Guard': {
    days: {
      1: { label: 'Monday', start: '09:00', end: '17:00' },
      2: { label: 'Tuesday', start: '09:00', end: '17:00' },
      3: { label: 'Wednesday', start: '09:00', end: '17:00' },
      4: { label: 'Thursday', start: '09:00', end: '16:00' },
      5: { label: 'Friday', start: '09:00', end: '15:00' },
    },
    note: 'Night Guard: Mon–Wed 9am–5pm, Thu 9am–4pm, Fri 9am–3pm',
  },
  'Orthodontic Consult': {
    days: {
      1: { label: 'Monday', start: '09:00', end: '16:00' },
      3: { label: 'Wednesday', start: '09:00', end: '16:00' },
    },
    note: 'Orthodontic Consult: Mon & Wed 9am–4pm',
  },
  'Braces/Aligners': {
    days: {
      1: { label: 'Monday', start: '09:00', end: '16:00' },
      3: { label: 'Wednesday', start: '09:00', end: '16:00' },
    },
    note: 'Braces/Aligners: Mon & Wed 9am–4pm',
  },
  'Periodontal': {
    days: {
      1: { label: 'Monday', start: '09:00', end: '17:00' },
      2: { label: 'Tuesday', start: '09:00', end: '17:00' },
      3: { label: 'Wednesday', start: '09:00', end: '17:00' },
      4: { label: 'Thursday', start: '09:00', end: '16:00' },
      5: { label: 'Friday', start: '09:00', end: '15:00' },
    },
    note: 'Periodontal Treatment: Mon–Wed 9am–5pm, Thu 9am–4pm, Fri 9am–3pm',
  },
  'Denture Repair': {
    days: {
      1: { label: 'Monday', start: '09:00', end: '16:00' },
      2: { label: 'Tuesday', start: '09:00', end: '12:00' },
      3: { label: 'Wednesday', start: '09:00', end: '16:00' },
      4: { label: 'Thursday', start: '09:00', end: '16:00' },
      5: { label: 'Friday', start: '09:00', end: '12:00' },
    },
    note: 'Denture Repair/Reline: Mon 9–4, Tue 9–12, Wed 9–4, Thu 9–4, Fri 9–12',
  },
  'Emergency': {
    days: {
      1: { label: 'Monday', start: '09:00', end: '17:00' },
      2: { label: 'Tuesday', start: '09:00', end: '17:00' },
      3: { label: 'Wednesday', start: '09:00', end: '17:00' },
      4: { label: 'Thursday', start: '09:00', end: '16:00' },
      5: { label: 'Friday', start: '09:00', end: '15:00' },
    },
    note: 'Emergency: Mon–Wed 9am–5pm, Thu 9am–4pm, Fri 9am–3pm (call for same-day availability)',
  },
  'Pediatric': {
    days: {
      1: { label: 'Monday', start: '09:00', end: '17:00' },
      2: { label: 'Tuesday', start: '09:00', end: '17:00' },
      3: { label: 'Wednesday', start: '09:00', end: '17:00' },
      5: { label: 'Friday', start: '09:00', end: '15:00' },
    },
    note: 'Pediatric: Mon–Wed 9am–5pm, NO Thursdays, Fri 9am–3pm',
  },
  'Sealants': {
    days: {
      1: { label: 'Monday', start: '09:00', end: '17:00' },
      2: { label: 'Tuesday', start: '09:00', end: '17:00' },
      3: { label: 'Wednesday', start: '09:00', end: '17:00' },
      5: { label: 'Friday', start: '09:00', end: '15:00' },
    },
    note: 'Sealants: Mon–Wed 9am–5pm, NO Thursdays, Fri 9am–3pm',
  },
  'Fluoride Treatment': {
    days: {
      1: { label: 'Monday', start: '09:00', end: '17:00' },
      2: { label: 'Tuesday', start: '09:00', end: '17:00' },
      3: { label: 'Wednesday', start: '09:00', end: '17:00' },
      5: { label: 'Friday', start: '09:00', end: '15:00' },
    },
    note: 'Fluoride Treatment: Mon–Wed 9am–5pm, NO Thursdays, Fri 9am–3pm',
  },
  'Bone Graft': {
    days: {
      1: { label: 'Monday', start: '09:00', end: '16:00' },
      3: { label: 'Wednesday', start: '09:00', end: '16:00' },
      4: { label: 'Thursday', start: '09:00', end: '16:00' },
    },
    note: 'Bone Graft: Mon, Wed, Thu 9am–4pm',
  },
  'Gum Surgery': {
    days: {
      1: { label: 'Monday', start: '09:00', end: '16:00' },
      3: { label: 'Wednesday', start: '09:00', end: '16:00' },
      4: { label: 'Thursday', start: '09:00', end: '16:00' },
    },
    note: 'Gum Surgery: Mon, Wed, Thu 9am–4pm',
  },
  'TMJ/TMD': {
    days: {
      1: { label: 'Monday', start: '09:00', end: '16:00' },
      2: { label: 'Tuesday', start: '09:00', end: '16:00' },
      3: { label: 'Wednesday', start: '09:00', end: '16:00' },
      4: { label: 'Thursday', start: '09:00', end: '16:00' },
      5: { label: 'Friday', start: '09:00', end: '15:00' },
    },
    note: 'TMJ/TMD Evaluation: Mon–Thu 9am–4pm, Fri 9am–3pm',
  },
  'Oral Surgery Consult': {
    days: {
      2: { label: 'Tuesday', start: '09:00', end: '16:00' },
      4: { label: 'Thursday', start: '09:00', end: '16:00' },
    },
    note: 'Oral Surgery Consult: Tue & Thu 9am–4pm',
  },
  'Biopsy': {
    days: {
      1: { label: 'Monday', start: '09:00', end: '16:00' },
      3: { label: 'Wednesday', start: '09:00', end: '16:00' },
      4: { label: 'Thursday', start: '09:00', end: '16:00' },
    },
    note: 'Biopsy / Oral Pathology: Mon, Wed, Thu 9am–4pm',
  },
  'Inlay/Onlay': {
    days: {
      1: { label: 'Monday', start: '09:00', end: '16:00' },
      2: { label: 'Tuesday', start: '09:00', end: '12:00' },
      3: { label: 'Wednesday', start: '09:00', end: '16:00' },
      4: { label: 'Thursday', start: '09:00', end: '16:00' },
      5: { label: 'Friday', start: '09:00', end: '12:00' },
    },
    note: 'Inlay/Onlay: Mon 9–4, Tue 9–12, Wed 9–4, Thu 9–4, Fri 9–12',
  },
  'Post and Core': {
    days: {
      1: { label: 'Monday', start: '11:00', end: '16:00' },
      2: { label: 'Tuesday', start: '09:00', end: '16:00' },
      3: { label: 'Wednesday', start: '11:00', end: '16:00' },
      4: { label: 'Thursday', start: '09:00', end: '16:00' },
      5: { label: 'Friday', start: '11:00', end: '15:00' },
    },
    note: 'Post & Core: Mon & Wed 11am–4pm, Tue & Thu 9am–4pm, Fri 11am–3pm',
  },
  'Space Maintainer': {
    days: {
      1: { label: 'Monday', start: '09:00', end: '17:00' },
      2: { label: 'Tuesday', start: '09:00', end: '17:00' },
      3: { label: 'Wednesday', start: '09:00', end: '17:00' },
      5: { label: 'Friday', start: '09:00', end: '15:00' },
    },
    note: 'Space Maintainer (Pediatric): Mon–Wed 9am–5pm, Fri 9am–3pm',
  },
  'Frenectomy': {
    days: {
      1: { label: 'Monday', start: '09:00', end: '16:00' },
      3: { label: 'Wednesday', start: '09:00', end: '16:00' },
      4: { label: 'Thursday', start: '09:00', end: '16:00' },
    },
    note: 'Frenectomy: Mon, Wed, Thu 9am–4pm',
  },
  'Other': {
    days: {
      1: { label: 'Monday', start: '09:00', end: '17:00' },
      2: { label: 'Tuesday', start: '09:00', end: '17:00' },
      3: { label: 'Wednesday', start: '09:00', end: '17:00' },
      4: { label: 'Thursday', start: '09:00', end: '16:00' },
      5: { label: 'Friday', start: '09:00', end: '15:00' },
    },
    note: 'General availability: Mon–Wed 9am–5pm, Thu 9am–4pm, Fri 9am–3pm',
  },
};

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ── Insurance rules ────────────────────────────────────────────────
const INSURANCE_NOTE =
  'We take all Union, PPO, and HMO insurance. We are NOT in network with Straight Medicaid. ' +
  'We take Healthfirst, Affinity, Fidelis, Metroplus, Healthfirst Medicare, Anthem, Liberty, ' +
  'MHS (United Healthcare) for Extractions only — NO root canals or anything else. ' +
  'We do not have a dentist in network (this is what you tell the patients).';

// ── Initial form state ────────────────────────────────────────────
const initialFormState = {
  callDate: getTodayDate(),
  // Patient
  lastName: '',
  firstName: '',
  dob: '',
  cellPhone: '',
  // Insurance
  insuranceName: '',
  insuranceNumber: '',
  isPolicyHolder: 'Yes',
  policyHolderName: '',
  policyHolderDob: '',
  memberId: '',
  // Appointment
  treatmentType: '',
  preferredDay: '',
  preferredDate: '',
  preferredTime: '',
};

// ── Helper: available day options for a treatment ──────────────────
function getAvailableDays(treatment) {
  const rule = SCHEDULE_RULES[treatment];
  if (!rule) return [];
  return Object.entries(rule.days).map(([dayNum, info]) => ({
    value: dayNum,
    label: info.label,
  }));
}

// Check if a calendar date is valid for the chosen treatment + day
function isDateAllowed(dateStr, treatment) {
  if (!dateStr || !treatment) return true;
  const rule = SCHEDULE_RULES[treatment];
  if (!rule) return true;
  const d = new Date(dateStr + 'T00:00:00');
  const dayOfWeek = d.getDay();
  if (!rule.days[dayOfWeek]) return false;
  if (rule.specialDates) {
    return rule.specialDates.includes(dateStr);
  }
  return true;
}

// ── Component ──────────────────────────────────────────────────────
function IntakeNewPage() {
  const [formData, setFormData] = useState(initialFormState);
  const [generating, setGenerating] = useState(false);
  const printRef = useRef(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };

      // Reset day/date/time when treatment changes
      if (name === 'treatmentType') {
        updated.preferredDay = '';
        updated.preferredDate = '';
        updated.preferredTime = '';
      }
      // Reset date/time when day changes
      if (name === 'preferredDay') {
        updated.preferredDate = '';
        updated.preferredTime = '';
      }
      return updated;
    });
  };

  const clearAll = () => {
    if (window.confirm('Clear all fields?')) {
      setFormData({ ...initialFormState, callDate: getTodayDate() });
      toast.success('All fields cleared');
    }
  };

  // ── PDF Generation ────────────────────────────────────────────
  const generatePDF = async () => {
    setGenerating(true);
    try {
      const html2pdf = await loadHtml2Pdf();
      const safeDate = formData.callDate.replace(/\//g, '-');
      const pName = formData.lastName
        ? `${formData.lastName}, ${formData.firstName}`
        : 'Patient';
      const fileName = `Intake - ${pName} - ${safeDate}.pdf`;

      const element = document.getElementById('printable-intake-new');
      const opt = {
        margin: 0.35,
        filename: fileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
      };
      await html2pdf().set(opt).from(element).save();
      toast.success('PDF downloaded successfully');
    } catch (err) {
      console.error('PDF generation failed:', err);
      toast.error('Failed to generate PDF');
    } finally {
      setGenerating(false);
    }
  };

  // Scheduling info for the selected treatment
  const rule = SCHEDULE_RULES[formData.treatmentType] || null;
  const availableDays = getAvailableDays(formData.treatmentType);

  // Build min time constraint from the chosen day
  const selectedDayInfo =
    rule && formData.preferredDay ? rule.days[formData.preferredDay] : null;

  // Date validation warning
  const dateWarning =
    formData.preferredDate && formData.treatmentType
      ? !isDateAllowed(formData.preferredDate, formData.treatmentType)
        ? 'This date does not match the available schedule for the selected treatment.'
        : null
      : null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <UserPlus className="w-8 h-8 text-emerald-600" />
            Patient Intake — New
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Quick patient registration &amp; appointment scheduling
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
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

      {/* ── Phone Prompt ─────────────────────────────────────── */}
      <div className="card p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border-2 border-green-300 dark:border-green-700">
        <h4 className="font-bold text-green-800 dark:text-green-200 mb-2 flex items-center gap-2">
          <Phone className="w-5 h-5" />
          📞 Phone Prompt
        </h4>
        <p className="text-green-700 dark:text-green-300 text-sm italic">
          "Hello, how can I help you?"
        </p>
      </div>

      {/* ── Insurance Notice ─────────────────────────────────── */}
      <div className="card p-4 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-700">
        <h4 className="font-bold text-amber-800 dark:text-amber-200 mb-2 flex items-center gap-2">
          <Info className="w-5 h-5" />
          Insurance Information (Internal Reference)
        </h4>
        <p className="text-amber-700 dark:text-amber-300 text-sm">{INSURANCE_NOTE}</p>
      </div>

      {/* ── Main Form ────────────────────────────────────────── */}
      <div className="card p-6">
        {/* SECTION 1 – Patient Information */}
        <div className="mb-8">
          <h3 className="text-lg font-bold text-white bg-slate-800 px-4 py-2 rounded-t-lg flex items-center gap-2">
            <User className="w-5 h-5" />
            PATIENT INFORMATION
          </h3>
          <div className="border border-gray-200 dark:border-gray-700 rounded-b-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="input w-full"
                  placeholder="Last Name"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="input w-full"
                  placeholder="First Name"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Date of Birth <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="dob"
                  value={formData.dob}
                  onChange={handleChange}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Cell Phone # <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="cellPhone"
                  value={formData.cellPhone}
                  onChange={handleChange}
                  className="input w-full"
                  placeholder="(555) 555-5555"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2 – Insurance Information */}
        <div className="mb-8">
          <h3 className="text-lg font-bold text-white bg-slate-800 px-4 py-2 rounded-t-lg flex items-center gap-2">
            <Shield className="w-5 h-5" />
            INSURANCE INFORMATION
          </h3>
          <div className="border border-gray-200 dark:border-gray-700 rounded-b-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Insurance Name
                </label>
                <input
                  type="text"
                  name="insuranceName"
                  value={formData.insuranceName}
                  onChange={handleChange}
                  className="input w-full"
                  placeholder="Insurance Company"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Insurance / Member ID
                </label>
                <input
                  type="text"
                  name="memberId"
                  value={formData.memberId}
                  onChange={handleChange}
                  className="input w-full"
                  placeholder="Member ID"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Are you the Policy Holder?
                </label>
                <select
                  name="isPolicyHolder"
                  value={formData.isPolicyHolder}
                  onChange={handleChange}
                  className="input w-full"
                >
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>

              {formData.isPolicyHolder === 'No' && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Policy Holder's Name
                    </label>
                    <input
                      type="text"
                      name="policyHolderName"
                      value={formData.policyHolderName}
                      onChange={handleChange}
                      className="input w-full"
                      placeholder="Policy Holder Full Name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Policy Holder's Date of Birth
                    </label>
                    <input
                      type="date"
                      name="policyHolderDob"
                      value={formData.policyHolderDob}
                      onChange={handleChange}
                      className="input w-full"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 3 – Appointment Request */}
        <div className="mb-8">
          <h3 className="text-lg font-bold text-white bg-slate-800 px-4 py-2 rounded-t-lg flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            APPOINTMENT REQUEST
          </h3>
          <div className="border border-gray-200 dark:border-gray-700 rounded-b-lg p-4 space-y-4">
            {/* Treatment selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Requesting an Appointment for: <span className="text-red-500">*</span>
              </label>
              <select
                name="treatmentType"
                value={formData.treatmentType}
                onChange={handleChange}
                className="input w-full"
              >
                {TREATMENT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Schedule note for chosen treatment */}
            {rule && (
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 text-sm text-blue-800 dark:text-blue-300 flex items-start gap-2">
                <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{rule.note}</span>
              </div>
            )}

            {/* Preferred Day dropdown – only shows valid days */}
            {formData.treatmentType && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <option value="">Select a day...</option>
                    {availableDays.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Calendar date picker */}
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
                  {dateWarning && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {dateWarning}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Time picker with range hint */}
            {selectedDayInfo && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Preferred Time
                  <span className="font-normal text-gray-500 ml-2">
                    (Available: {selectedDayInfo.start.replace(':00', '')}–
                    {selectedDayInfo.end.replace(':00', '')})
                  </span>
                </label>
                <input
                  type="time"
                  name="preferredTime"
                  value={formData.preferredTime}
                  onChange={handleChange}
                  min={selectedDayInfo.start}
                  max={selectedDayInfo.end}
                  className="input w-full"
                />
              </div>
            )}
          </div>
        </div>

        {/* ── Scheduling Reference Card ───────────────────────── */}
        <div className="mb-4">
          <h3 className="text-lg font-bold text-white bg-emerald-700 px-4 py-2 rounded-t-lg flex items-center gap-2">
            <Clock className="w-5 h-5" />
            SCHEDULING QUICK REFERENCE
          </h3>
          <div className="border border-gray-200 dark:border-gray-700 rounded-b-lg p-4 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
              <div className="py-1 border-b border-gray-100 dark:border-gray-700">
                <strong className="text-gray-800 dark:text-gray-200">Checkups / Cleanings</strong>
                <p className="text-gray-600 dark:text-gray-400">Mon–Wed 9–5 &bull; NO Thu &bull; Fri 9–3</p>
              </div>
              <div className="py-1 border-b border-gray-100 dark:border-gray-700">
                <strong className="text-gray-800 dark:text-gray-200">Root Canal</strong>
                <p className="text-gray-600 dark:text-gray-400">Mon &amp; Wed 11–4 &bull; Tue &amp; Thu 9–4 &bull; Fri 11–3</p>
              </div>
              <div className="py-1 border-b border-gray-100 dark:border-gray-700">
                <strong className="text-gray-800 dark:text-gray-200">Extractions (NO Wisdom)</strong>
                <p className="text-gray-600 dark:text-gray-400">Tue 9–4</p>
              </div>
              <div className="py-1 border-b border-gray-100 dark:border-gray-700">
                <strong className="text-gray-800 dark:text-gray-200">Wisdom Teeth Only</strong>
                <p className="text-gray-600 dark:text-gray-400">1 Thu/month (3/5, 4/23) 9–2</p>
              </div>
              <div className="py-1 border-b border-gray-100 dark:border-gray-700">
                <strong className="text-gray-800 dark:text-gray-200">Crowns / Bridges / Dentures</strong>
                <p className="text-gray-600 dark:text-gray-400">Mon 9–4 &bull; Tue 9–12 &bull; Wed 9–4 &bull; Thu 9–4 &bull; Fri 9–12</p>
              </div>
              <div className="py-1 border-b border-gray-100 dark:border-gray-700">
                <strong className="text-gray-800 dark:text-gray-200">Fillings</strong>
                <p className="text-gray-600 dark:text-gray-400">Mon–Wed 9–5 &bull; Thu 9–4 &bull; Fri 9–3</p>
              </div>
              <div className="py-1 border-b border-gray-100 dark:border-gray-700">
                <strong className="text-gray-800 dark:text-gray-200">Deep Cleaning</strong>
                <p className="text-gray-600 dark:text-gray-400">Mon–Wed 9–5 &bull; NO Thu &bull; Fri 9–3</p>
              </div>
              <div className="py-1 border-b border-gray-100 dark:border-gray-700">
                <strong className="text-gray-800 dark:text-gray-200">Implant Consult / Surgery</strong>
                <p className="text-gray-600 dark:text-gray-400">Mon, Wed, Thu 9–4</p>
              </div>
              <div className="py-1 border-b border-gray-100 dark:border-gray-700">
                <strong className="text-gray-800 dark:text-gray-200">Veneers / Inlay / Onlay</strong>
                <p className="text-gray-600 dark:text-gray-400">Mon 9–4 &bull; Tue 9–12 &bull; Wed 9–4 &bull; Thu 9–4 &bull; Fri 9–12</p>
              </div>
              <div className="py-1 border-b border-gray-100 dark:border-gray-700">
                <strong className="text-gray-800 dark:text-gray-200">Whitening / Sealants / Fluoride</strong>
                <p className="text-gray-600 dark:text-gray-400">Mon–Wed 9–5 &bull; Fri 9–3</p>
              </div>
              <div className="py-1 border-b border-gray-100 dark:border-gray-700">
                <strong className="text-gray-800 dark:text-gray-200">Orthodontics / Braces / Aligners</strong>
                <p className="text-gray-600 dark:text-gray-400">Mon &amp; Wed 9–4</p>
              </div>
              <div className="py-1 border-b border-gray-100 dark:border-gray-700">
                <strong className="text-gray-800 dark:text-gray-200">Periodontal / Night Guard</strong>
                <p className="text-gray-600 dark:text-gray-400">Mon–Wed 9–5 &bull; Thu 9–4 &bull; Fri 9–3</p>
              </div>
              <div className="py-1 border-b border-gray-100 dark:border-gray-700">
                <strong className="text-gray-800 dark:text-gray-200">Oral Surgery / Biopsy / Bone Graft</strong>
                <p className="text-gray-600 dark:text-gray-400">Mon, Wed, Thu 9–4 &bull; Oral Surg Tue &amp; Thu</p>
              </div>
              <div className="py-1 border-b border-gray-100 dark:border-gray-700">
                <strong className="text-gray-800 dark:text-gray-200">Gum Surgery / Frenectomy</strong>
                <p className="text-gray-600 dark:text-gray-400">Mon, Wed, Thu 9–4</p>
              </div>
              <div className="py-1 border-b border-gray-100 dark:border-gray-700">
                <strong className="text-gray-800 dark:text-gray-200">TMJ / TMD Evaluation</strong>
                <p className="text-gray-600 dark:text-gray-400">Mon–Thu 9–4 &bull; Fri 9–3</p>
              </div>
              <div className="py-1 border-b border-gray-100 dark:border-gray-700">
                <strong className="text-gray-800 dark:text-gray-200">Emergency / Toothache</strong>
                <p className="text-gray-600 dark:text-gray-400">Mon–Wed 9–5 &bull; Thu 9–4 &bull; Fri 9–3</p>
              </div>
              <div className="py-1 border-b border-gray-100 dark:border-gray-700">
                <strong className="text-gray-800 dark:text-gray-200">Pediatric / Space Maintainer</strong>
                <p className="text-gray-600 dark:text-gray-400">Mon–Wed 9–5 &bull; Fri 9–3</p>
              </div>
              <div className="py-1">
                <strong className="text-gray-800 dark:text-gray-200">Post &amp; Core Build-Up</strong>
                <p className="text-gray-600 dark:text-gray-400">Mon &amp; Wed 11–4 &bull; Tue &amp; Thu 9–4 &bull; Fri 11–3</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════ HIDDEN PRINTABLE PDF ════════════════ */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <div
          id="printable-intake-new"
          ref={printRef}
          style={{
            width: '7.5in',
            padding: '0.5in',
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '11pt',
            color: '#1a1a1a',
            background: '#ffffff',
          }}
        >
          {/* PDF Header */}
          <div style={{ textAlign: 'center', marginBottom: '18px', borderBottom: '3px solid #1e3a5f', paddingBottom: '12px' }}>
            <h1 style={{ margin: 0, fontSize: '20pt', color: '#1e3a5f', letterSpacing: '1px' }}>
              PATIENT INTAKE FORM
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '9pt', color: '#666' }}>
              Guardian Dental Billing LLC &mdash; Date: {formData.callDate}
            </p>
          </div>

          {/* Patient Info */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
            <thead>
              <tr>
                <th
                  colSpan={4}
                  style={{
                    background: '#1e3a5f',
                    color: '#fff',
                    padding: '6px 10px',
                    textAlign: 'left',
                    fontSize: '11pt',
                  }}
                >
                  Patient Information
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={pdfCellStyle}><strong>Last Name:</strong></td>
                <td style={pdfCellStyle}>{formData.lastName}</td>
                <td style={pdfCellStyle}><strong>First Name:</strong></td>
                <td style={pdfCellStyle}>{formData.firstName}</td>
              </tr>
              <tr>
                <td style={pdfCellStyle}><strong>Date of Birth:</strong></td>
                <td style={pdfCellStyle}>{formData.dob}</td>
                <td style={pdfCellStyle}><strong>Cell Phone:</strong></td>
                <td style={pdfCellStyle}>{formData.cellPhone}</td>
              </tr>
            </tbody>
          </table>

          {/* Insurance Info */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
            <thead>
              <tr>
                <th
                  colSpan={4}
                  style={{
                    background: '#1e3a5f',
                    color: '#fff',
                    padding: '6px 10px',
                    textAlign: 'left',
                    fontSize: '11pt',
                  }}
                >
                  Insurance Information
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={pdfCellStyle}><strong>Insurance Name:</strong></td>
                <td style={pdfCellStyle}>{formData.insuranceName}</td>
                <td style={pdfCellStyle}><strong>Member ID:</strong></td>
                <td style={pdfCellStyle}>{formData.memberId}</td>
              </tr>
              <tr>
                <td style={pdfCellStyle}><strong>Policy Holder:</strong></td>
                <td style={pdfCellStyle}>{formData.isPolicyHolder}</td>
                {formData.isPolicyHolder === 'No' && (
                  <>
                    <td style={pdfCellStyle}><strong>Holder Name:</strong></td>
                    <td style={pdfCellStyle}>{formData.policyHolderName}</td>
                  </>
                )}
                {formData.isPolicyHolder !== 'No' && (
                  <>
                    <td style={pdfCellStyle}></td>
                    <td style={pdfCellStyle}></td>
                  </>
                )}
              </tr>
              {formData.isPolicyHolder === 'No' && (
                <tr>
                  <td style={pdfCellStyle}><strong>Holder DOB:</strong></td>
                  <td style={pdfCellStyle}>{formData.policyHolderDob}</td>
                  <td style={pdfCellStyle}></td>
                  <td style={pdfCellStyle}></td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Appointment Info */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
            <thead>
              <tr>
                <th
                  colSpan={4}
                  style={{
                    background: '#1e3a5f',
                    color: '#fff',
                    padding: '6px 10px',
                    textAlign: 'left',
                    fontSize: '11pt',
                  }}
                >
                  Appointment Request
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={pdfCellStyle}><strong>Treatment:</strong></td>
                <td style={pdfCellStyle}>{formData.treatmentType}</td>
                <td style={pdfCellStyle}><strong>Preferred Day:</strong></td>
                <td style={pdfCellStyle}>
                  {formData.preferredDay ? DAY_LABELS[formData.preferredDay] : ''}
                </td>
              </tr>
              <tr>
                <td style={pdfCellStyle}><strong>Preferred Date:</strong></td>
                <td style={pdfCellStyle}>{formData.preferredDate}</td>
                <td style={pdfCellStyle}><strong>Preferred Time:</strong></td>
                <td style={pdfCellStyle}>{formData.preferredTime}</td>
              </tr>
            </tbody>
          </table>

          {/* Footer */}
          <div style={{ marginTop: '24px', fontSize: '8pt', color: '#999', borderTop: '1px solid #ccc', paddingTop: '8px', textAlign: 'center' }}>
            <em>
              This document is a patient intake summary prepared by Guardian Dental Billing LLC.
              Independent verification of insurance eligibility is recommended prior to treatment.
            </em>
          </div>
        </div>
      </div>
    </div>
  );
}

// Shared PDF cell style
const pdfCellStyle = {
  border: '1px solid #ddd',
  padding: '5px 8px',
  fontSize: '10pt',
};

export default IntakeNewPage;
