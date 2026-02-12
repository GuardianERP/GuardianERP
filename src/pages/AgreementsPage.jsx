/**
 * Guardian Desktop ERP - Employee Agreements Page
 * Generate, print, and attach Employee Employment Agreements & Guarantor Agreements
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FileText, Download, User, Users, Search,
  Eye, CheckCircle, Loader2, Save, X, Building2,
  FileSignature, UserCheck, Shield, Calendar, MapPin,
  Phone, CreditCard, Briefcase, DollarSign, Clock,
  AlertCircle, ExternalLink
} from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { employeesAPI } from '../services/api';
import { supabase } from '../services/supabaseClient';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

// ── Dynamic html2pdf loader ────────────────────────────
const loadHtml2Pdf = () => {
  return new Promise((resolve, reject) => {
    if (window.html2pdf) { resolve(window.html2pdf); return; }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    script.onload = () => resolve(window.html2pdf);
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

// ── Company info (from guardiandentalbilling.com) ───────
const COMPANY = {
  name: 'Guardian Dental Billing LLC',
  address: '1309 Coffeen Ave, Ste 1200, Sheridan, WY 82801, United States',
  phone: '+1 (732) 944-0080',
  email: 'info@guardiandentalbilling.com',
  website: 'www.guardiandentalbilling.com',
};

// ── Reusable form input (OUTSIDE component to prevent focus loss) ──
function FormField({ label, value, onChange, icon: Icon, placeholder, type = 'text', span2 = false }) {
  return (
    <div className={span2 ? 'sm:col-span-2' : ''}>
      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">{label}</label>
      <div className="relative group">
        {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 group-focus-within:text-blue-500 dark:group-focus-within:text-blue-400 transition-colors" />}
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`w-full ${Icon ? 'pl-10' : 'pl-4'} pr-4 py-2.5 bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all duration-200 text-sm shadow-sm`}
        />
      </div>
    </div>
  );
}

// ── Section heading (OUTSIDE component) ─────────────────
function SectionHeading({ icon: Icon, color, children }) {
  return (
    <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-gray-200 dark:border-gray-700/50">
      {Icon && <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color || 'bg-blue-100 dark:bg-blue-500/15'}`}>
        <Icon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
      </div>}
      <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">{children}</h3>
    </div>
  );
}

// ── Number to words helper ──────────────────────────────
function numberToWords(num) {
  if (num === 0) return 'Zero';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if (num < 20) return ones[num];
  if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
  if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' and ' + numberToWords(num % 100) : '');
  if (num < 100000) return numberToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + numberToWords(num % 1000) : '');
  if (num < 10000000) return numberToWords(Math.floor(num / 100000)) + ' Lac' + (num % 100000 ? ' ' + numberToWords(num % 100000) : '');
  return numberToWords(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 ? ' ' + numberToWords(num % 10000000) : '');
}

const formatDate = (dateStr) => {
  if (!dateStr) return '____________________';
  try { return format(new Date(dateStr), 'MMMM dd, yyyy'); }
  catch { return dateStr; }
};

// ══════════════════════════════════════════════════════════
// PDF Template: Employee Employment Agreement
// ══════════════════════════════════════════════════════════
function generateEmployeeAgreementHTML(data) {
  const blank = (val, width = '200px') => val
    ? `<span style="font-weight:600; border-bottom:1px solid #333; padding: 0 4px;">${val}</span>`
    : `<span style="display:inline-block; width:${width}; border-bottom:1.5px solid #000;">&nbsp;</span>`;

  return `
  <div style="font-family: 'Georgia', 'Times New Roman', Times, serif; font-size: 12pt; color: #1a1a1a; line-height: 1.7; padding: 20px 30px; width: 100%; box-sizing: border-box; background: #fff;">

    <!-- Letterhead -->
    <div style="text-align: center; margin-bottom: 18px; padding-bottom: 12px; border-bottom: 3px double #1a365d;">
      <h1 style="font-size: 22pt; font-weight: bold; margin: 0; letter-spacing: 3px; color: #1a365d; text-transform: uppercase;">${COMPANY.name.toUpperCase()}</h1>
      <p style="font-size: 9pt; margin: 5px 0 2px 0; color: #4a5568;">${COMPANY.address}</p>
      <p style="font-size: 8.5pt; margin: 2px 0; color: #4a5568;">Phone: ${COMPANY.phone} | Email: ${COMPANY.email}</p>
      <p style="font-size: 9pt; margin: 2px 0; color: #4a5568;">${COMPANY.website}</p>
    </div>

    <h2 style="text-align: center; font-size: 16pt; font-weight: bold; margin: 0 0 20px 0; letter-spacing: 2px; color: #1a365d; text-decoration: underline;">EMPLOYMENT AGREEMENT</h2>

    <!-- Reference & Date -->
    <table style="width: 100%; margin-bottom: 20px; font-size: 11pt;">
      <tr>
        <td><strong>Ref No:</strong> ${blank(data.reference_no || '', '150px')}</td>
        <td style="text-align: right;"><strong>Date:</strong> ${blank(formatDate(data.agreement_date), '180px')}</td>
      </tr>
    </table>

    <p style="text-align: justify;">This Employment Agreement (the "<strong>Agreement</strong>") is entered into as of ${blank(formatDate(data.agreement_date), '180px')} by and between:</p>

    <!-- Employer -->
    <div style="margin: 14px 0; padding: 14px 18px; border-left: 4px solid #1a365d; background: #f7fafc;">
      <p style="margin: 0;"><strong style="color: #1a365d; text-transform: uppercase; letter-spacing: 1px; font-size: 10pt;">The Employer</strong></p>
      <p style="margin: 5px 0 0 0;">${COMPANY.name}, having its principal office at ${COMPANY.address} (hereinafter the "<strong>Company</strong>")</p>
    </div>

    <p style="text-align: center; font-weight: bold; font-size: 13pt; margin: 6px 0; color: #1a365d;">— AND —</p>

    <!-- Employee -->
    <div style="margin: 14px 0; padding: 14px 18px; border-left: 4px solid #2d8659; background: #f0fff4;">
      <p style="margin: 0;"><strong style="color: #2d8659; text-transform: uppercase; letter-spacing: 1px; font-size: 10pt;">The Employee</strong></p>
      <p style="margin: 5px 0 2px 0;"><strong>Name:</strong> ${blank(data.employee_name)}&nbsp;&nbsp;&nbsp;<strong>S/o, D/o:</strong> ${blank(data.father_name)}</p>
      <p style="margin: 2px 0;"><strong>CNIC:</strong> ${blank(data.cnic, '180px')}&nbsp;&nbsp;&nbsp;<strong>Phone:</strong> ${blank(data.phone, '150px')}</p>
      <p style="margin: 2px 0;"><strong>Address:</strong> ${blank(data.address, '380px')}</p>
      <p style="margin: 5px 0 0 0;">(hereinafter the "<strong>Employee</strong>")</p>
    </div>

    <p style="text-align: justify;">WHEREAS the Company desires to employ the Employee upon the terms and conditions set forth herein; NOW THEREFORE, in consideration of the mutual covenants, the parties agree as follows:</p>

    <!-- Article 1 -->
    <h3 style="font-size: 12pt; color: #1a365d; margin: 20px 0 8px 0; padding-bottom: 4px; border-bottom: 1px solid #cbd5e0;">ARTICLE 1 — POSITION AND DUTIES</h3>
    <p style="text-align: justify;"><strong>1.1</strong>&nbsp;&nbsp;The Employee shall be employed as ${blank(data.designation)} in the ${blank(data.department)} department.</p>
    <p style="text-align: justify;"><strong>1.2</strong>&nbsp;&nbsp;The Employee shall perform all duties associated with the position as assigned by the Company.</p>
    <p style="text-align: justify;"><strong>1.3</strong>&nbsp;&nbsp;The Employee shall devote full time and best efforts to the performance of duties during working hours.</p>

    <!-- Article 2 -->
    <h3 style="font-size: 12pt; color: #1a365d; margin: 20px 0 8px 0; padding-bottom: 4px; border-bottom: 1px solid #cbd5e0;">ARTICLE 2 — COMMENCEMENT AND PROBATION</h3>
    <p style="text-align: justify;"><strong>2.1</strong>&nbsp;&nbsp;Employment shall commence on ${blank(formatDate(data.joining_date), '180px')}.</p>
    <p style="text-align: justify;"><strong>2.2</strong>&nbsp;&nbsp;The Employee shall serve a probationary period of <strong>${data.probation_period || 'Three (3)'}</strong> months. During probation, either party may terminate with <strong>${data.probation_notice || 'seven (7)'}</strong> days' written notice.</p>
    <p style="text-align: justify;"><strong>2.3</strong>&nbsp;&nbsp;Upon successful completion of probation, the Employee shall be confirmed as a regular employee.</p>

    <!-- Article 3 -->
    <h3 style="font-size: 12pt; color: #1a365d; margin: 20px 0 8px 0; padding-bottom: 4px; border-bottom: 1px solid #cbd5e0;">ARTICLE 3 — COMPENSATION AND BENEFITS</h3>
    <p style="text-align: justify;"><strong>3.1</strong>&nbsp;&nbsp;Gross monthly salary: <strong>$${data.salary ? Number(data.salary).toLocaleString() : '________'} (${data.salary ? numberToWords(Number(data.salary)) + ' Dollars Only' : '________________________'})</strong>.</p>
    <p style="text-align: justify;"><strong>3.2</strong>&nbsp;&nbsp;Salary shall be paid on or before the <strong>${data.pay_day || '5th'}</strong> of each month via bank transfer.</p>
    <p style="text-align: justify;"><strong>3.3</strong>&nbsp;&nbsp;The Company shall make applicable statutory deductions as required by law.</p>
    <p style="text-align: justify;"><strong>3.4</strong>&nbsp;&nbsp;Annual increments and bonuses are at the sole discretion of the Company based on performance.</p>

    <!-- Article 4 -->
    <h3 style="font-size: 12pt; color: #1a365d; margin: 20px 0 8px 0; padding-bottom: 4px; border-bottom: 1px solid #cbd5e0;">ARTICLE 4 — WORKING HOURS AND LEAVE</h3>
    <p style="text-align: justify;"><strong>4.1</strong>&nbsp;&nbsp;Working hours: <strong>${data.working_hours || '9:00 AM to 5:00 PM'}</strong>, <strong>${data.working_days || 'Monday to Friday'}</strong>.</p>
    <p style="text-align: justify;"><strong>4.2</strong>&nbsp;&nbsp;The Employee is entitled to leave as per Company policy and applicable labor laws.</p>
    <p style="text-align: justify;"><strong>4.3</strong>&nbsp;&nbsp;Unauthorized absence shall be treated per Company disciplinary policy.</p>

    <!-- Article 5 -->
    <h3 style="font-size: 12pt; color: #1a365d; margin: 20px 0 8px 0; padding-bottom: 4px; border-bottom: 1px solid #cbd5e0;">ARTICLE 5 — CONFIDENTIALITY</h3>
    <p style="text-align: justify;"><strong>5.1</strong>&nbsp;&nbsp;The Employee shall not disclose any confidential information, trade secrets, client data, or proprietary data of the Company to any third party, during or after employment.</p>
    <p style="text-align: justify;"><strong>5.2</strong>&nbsp;&nbsp;All documents and materials developed or received during employment are property of the Company and must be returned upon termination.</p>

    <!-- Article 6 -->
    <h3 style="font-size: 12pt; color: #1a365d; margin: 20px 0 8px 0; padding-bottom: 4px; border-bottom: 1px solid #cbd5e0;">ARTICLE 6 — NON-COMPETE AND NON-SOLICITATION</h3>
    <p style="text-align: justify;"><strong>6.1</strong>&nbsp;&nbsp;For <strong>${data.non_compete_months || 'twelve (12)'}</strong> months following termination, the Employee shall not engage in any directly competing business.</p>
    <p style="text-align: justify;"><strong>6.2</strong>&nbsp;&nbsp;The Employee shall not solicit any clients, customers, or employees of the Company for a competing business.</p>

    <!-- Article 7 -->
    <h3 style="font-size: 12pt; color: #1a365d; margin: 20px 0 8px 0; padding-bottom: 4px; border-bottom: 1px solid #cbd5e0;">ARTICLE 7 — TERMINATION</h3>
    <p style="text-align: justify;"><strong>7.1</strong>&nbsp;&nbsp;After confirmation, either party may terminate by giving <strong>${data.notice_period || 'thirty (30)'}</strong> days' written notice or salary in lieu thereof.</p>
    <p style="text-align: justify;"><strong>7.2</strong>&nbsp;&nbsp;The Company may terminate immediately for gross misconduct, fraud, breach of confidentiality, or acts detrimental to company interests.</p>
    <p style="text-align: justify;"><strong>7.3</strong>&nbsp;&nbsp;Upon termination, the Employee shall return all Company property.</p>

    <!-- Article 8 -->
    <h3 style="font-size: 12pt; color: #1a365d; margin: 20px 0 8px 0; padding-bottom: 4px; border-bottom: 1px solid #cbd5e0;">ARTICLE 8 — CODE OF CONDUCT</h3>
    <p style="text-align: justify;"><strong>8.1</strong>&nbsp;&nbsp;The Employee shall comply with all Company rules, regulations, and policies.</p>
    <p style="text-align: justify;"><strong>8.2</strong>&nbsp;&nbsp;The Employee shall maintain professional conduct and uphold the Company's reputation.</p>

    <!-- Article 9 -->
    <h3 style="font-size: 12pt; color: #1a365d; margin: 20px 0 8px 0; padding-bottom: 4px; border-bottom: 1px solid #cbd5e0;">ARTICLE 9 — GOVERNING LAW</h3>
    <p style="text-align: justify;"><strong>9.1</strong>&nbsp;&nbsp;This Agreement shall be governed by the laws of the State of Wyoming, United States.</p>
    <p style="text-align: justify;"><strong>9.2</strong>&nbsp;&nbsp;Any disputes shall be subject to the jurisdiction of the competent courts of Sheridan County, Wyoming.</p>

    <!-- Article 10 -->
    <h3 style="font-size: 12pt; color: #1a365d; margin: 20px 0 8px 0; padding-bottom: 4px; border-bottom: 1px solid #cbd5e0;">ARTICLE 10 — GENERAL PROVISIONS</h3>
    <p style="text-align: justify;"><strong>10.1</strong>&nbsp;&nbsp;This Agreement constitutes the entire agreement and supersedes all prior agreements.</p>
    <p style="text-align: justify;"><strong>10.2</strong>&nbsp;&nbsp;No amendment shall be valid unless in writing and signed by both parties.</p>
    <p style="text-align: justify;"><strong>10.3</strong>&nbsp;&nbsp;If any provision is found invalid, remaining provisions continue in full force.</p>

    <!-- Signatures -->
    <div style="margin-top: 40px; page-break-inside: avoid;">
      <p style="font-weight: bold; color: #1a365d;"><strong>IN WITNESS WHEREOF</strong>, the parties have executed this Agreement as of the date first written above.</p>
      <table style="width: 100%; margin-top: 35px; border-collapse: collapse;">
        <tr>
          <td style="width: 47%; vertical-align: bottom;">
            <div style="border-bottom: 1.5px solid #000; height: 50px; margin-bottom: 6px;"></div>
            <p style="margin: 2px 0; font-weight: bold; color: #1a365d; font-size: 11pt;">For ${COMPANY.name}</p>
            <p style="margin: 2px 0; font-size: 10pt; color: #4a5568;">Authorized Signatory</p>
            <p style="margin: 2px 0; font-size: 10pt; color: #4a5568;">Date: ${formatDate(data.agreement_date)}</p>
          </td>
          <td style="width: 6%;"></td>
          <td style="width: 47%; vertical-align: bottom;">
            <div style="border-bottom: 1.5px solid #000; height: 50px; margin-bottom: 6px;"></div>
            <p style="margin: 2px 0; font-weight: bold; font-size: 11pt;">${data.employee_name || '____________________'}</p>
            <p style="margin: 2px 0; font-size: 10pt; color: #4a5568;">Employee</p>
            <p style="margin: 2px 0; font-size: 10pt; color: #4a5568;">CNIC: ${data.cnic || '_____-_______-_'}</p>
            <p style="margin: 2px 0; font-size: 10pt; color: #4a5568;">Date: ${formatDate(data.agreement_date)}</p>
          </td>
        </tr>
      </table>
    </div>

    <!-- Witnesses -->
    <div style="margin-top: 40px; page-break-inside: avoid;">
      <h3 style="font-size: 12pt; color: #1a365d; margin: 0 0 12px 0; padding-bottom: 4px; border-bottom: 1px solid #cbd5e0;">WITNESSES</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="width: 47%; vertical-align: top;">
            <p style="margin: 3px 0;"><strong>Witness 1:</strong></p>
            <p style="margin: 3px 0;">Name: ${blank(data.witness1_name)}</p>
            <p style="margin: 3px 0;">CNIC: ${blank(data.witness1_cnic, '180px')}</p>
            <div style="border-bottom: 1.5px solid #000; height: 40px; margin: 12px 0 5px 0;"></div>
            <p style="margin: 2px 0; font-size: 10pt; color: #4a5568;">Signature</p>
          </td>
          <td style="width: 6%;"></td>
          <td style="width: 47%; vertical-align: top;">
            <p style="margin: 3px 0;"><strong>Witness 2:</strong></p>
            <p style="margin: 3px 0;">Name: ${blank(data.witness2_name)}</p>
            <p style="margin: 3px 0;">CNIC: ${blank(data.witness2_cnic, '180px')}</p>
            <div style="border-bottom: 1.5px solid #000; height: 40px; margin: 12px 0 5px 0;"></div>
            <p style="margin: 2px 0; font-size: 10pt; color: #4a5568;">Signature</p>
          </td>
        </tr>
      </table>
    </div>
  </div>`;
}

// ══════════════════════════════════════════════════════════
// PDF Template: Guarantor Agreement
// ══════════════════════════════════════════════════════════
function generateGuarantorAgreementHTML(data) {
  const blank = (val, width = '200px') => val
    ? `<span style="font-weight:600; border-bottom:1px solid #333; padding: 0 4px;">${val}</span>`
    : `<span style="display:inline-block; width:${width}; border-bottom:1.5px solid #000;">&nbsp;</span>`;

  return `
  <div style="font-family: 'Georgia', 'Times New Roman', Times, serif; font-size: 12pt; color: #1a1a1a; line-height: 1.7; padding: 20px 30px; width: 100%; box-sizing: border-box; background: #fff;">
    
    <!-- Letterhead -->
    <div style="text-align: center; margin-bottom: 18px; padding-bottom: 12px; border-bottom: 3px double #1a365d;">
      <h1 style="font-size: 22pt; font-weight: bold; margin: 0; letter-spacing: 3px; color: #1a365d; text-transform: uppercase;">${COMPANY.name.toUpperCase()}</h1>
      <p style="font-size: 9pt; margin: 5px 0 2px 0; color: #4a5568;">${COMPANY.address}</p>
      <p style="font-size: 8.5pt; margin: 2px 0; color: #4a5568;">Phone: ${COMPANY.phone} | Email: ${COMPANY.email}</p>
      <p style="font-size: 9pt; margin: 2px 0; color: #4a5568;">${COMPANY.website}</p>
    </div>

    <h2 style="text-align: center; font-size: 16pt; font-weight: bold; margin: 0 0 20px 0; letter-spacing: 2px; color: #1a365d; text-decoration: underline;">GUARANTOR AGREEMENT</h2>

    <!-- Reference & Date -->
    <table style="width: 100%; margin-bottom: 20px; font-size: 11pt;">
      <tr>
        <td><strong>Ref No:</strong> ${blank(data.reference_no ? data.reference_no + '-G' : '', '150px')}</td>
        <td style="text-align: right;"><strong>Date:</strong> ${blank(formatDate(data.agreement_date), '180px')}</td>
      </tr>
    </table>

    <!-- Employee Being Guaranteed -->
    <div style="margin: 14px 0; padding: 14px 18px; border-left: 4px solid #1a365d; background: #f7fafc;">
      <p style="margin: 0; font-weight: bold; color: #1a365d; text-transform: uppercase; letter-spacing: 1px; font-size: 10pt;">Employee Being Guaranteed</p>
      <table style="margin-top: 8px; font-size: 11pt; width: 100%;">
        <tr><td style="width:120px; padding: 2px 0;"><strong>Name:</strong></td><td>${blank(data.employee_name, '320px')}</td></tr>
        <tr><td style="padding: 2px 0;"><strong>CNIC:</strong></td><td>${blank(data.cnic, '250px')}</td></tr>
        <tr><td style="padding: 2px 0;"><strong>Designation:</strong></td><td>${blank(data.designation, '250px')}</td></tr>
        <tr><td style="padding: 2px 0;"><strong>Department:</strong></td><td>${blank(data.department, '250px')}</td></tr>
      </table>
    </div>

    <!-- Guarantor Information -->
    <h3 style="font-size: 12pt; color: #553c9a; margin: 20px 0 10px 0; padding-bottom: 4px; border-bottom: 1px solid #d6bcfa;">GUARANTOR INFORMATION</h3>
    <div style="padding: 14px 18px; border-left: 4px solid #553c9a; background: #faf5ff;">
      <table style="font-size: 11pt; width: 100%;">
        <tr><td style="width:150px; padding: 3px 0;"><strong>Name:</strong></td><td>${blank(data.guarantor_name, '320px')}</td></tr>
        <tr><td style="padding: 3px 0;"><strong>Father's Name:</strong></td><td>${blank(data.guarantor_father_name, '280px')}</td></tr>
        <tr><td style="padding: 3px 0;"><strong>CNIC No:</strong></td><td>${blank(data.guarantor_cnic, '250px')}</td></tr>
        <tr><td style="padding: 3px 0;"><strong>Address:</strong></td><td>${blank(data.guarantor_address, '320px')}</td></tr>
        <tr><td style="padding: 3px 0;"><strong>Phone:</strong></td><td>${blank(data.guarantor_phone, '250px')}</td></tr>
        <tr><td style="padding: 3px 0;"><strong>Relation:</strong></td><td>${blank(data.guarantor_relation, '250px')}</td></tr>
        <tr><td style="padding: 3px 0;"><strong>Occupation:</strong></td><td>${blank(data.guarantor_occupation, '250px')}</td></tr>
      </table>
    </div>

    <!-- Declaration -->
    <h3 style="font-size: 12pt; color: #553c9a; margin: 20px 0 10px 0; padding-bottom: 4px; border-bottom: 1px solid #d6bcfa;">DECLARATION AND UNDERTAKING</h3>
    
    <p style="text-align: justify;">I, ${blank(data.guarantor_name)}, S/o ${blank(data.guarantor_father_name)}, CNIC No. ${blank(data.guarantor_cnic, '180px')}, residing at ${blank(data.guarantor_address, '280px')}, do hereby declare and undertake as follows:</p>

    <div style="margin-left: 20px; margin-top: 10px;">
      <p style="text-align: justify; margin: 8px 0;"><strong>1.</strong>&nbsp;&nbsp;I personally know ${blank(data.employee_name)} who is being employed by ${COMPANY.name} as ${blank(data.designation)}.</p>
      <p style="text-align: justify; margin: 8px 0;"><strong>2.</strong>&nbsp;&nbsp;I stand as guarantor and guarantee his/her good conduct, honesty, integrity, and faithful discharge of duties.</p>
      <p style="text-align: justify; margin: 8px 0;"><strong>3.</strong>&nbsp;&nbsp;If the employee causes any financial loss, damage, theft, fraud, or embezzlement, I shall be <strong>personally liable</strong> to compensate the Company.</p>
      <p style="text-align: justify; margin: 8px 0;"><strong>4.</strong>&nbsp;&nbsp;This guarantee is a <strong>continuing obligation</strong> and remains in effect throughout employment and for <strong>six (6) months</strong> after termination.</p>
      <p style="text-align: justify; margin: 8px 0;"><strong>5.</strong>&nbsp;&nbsp;I will inform the Company immediately of any change in my address or contact details.</p>
      <p style="text-align: justify; margin: 8px 0;"><strong>6.</strong>&nbsp;&nbsp;The information provided herein is true and correct. False information shall render this guarantee void.</p>
      <p style="text-align: justify; margin: 8px 0;"><strong>7.</strong>&nbsp;&nbsp;This Agreement shall be governed by the laws of the State of Wyoming, United States. Disputes shall be subject to courts of Sheridan County.</p>
    </div>

    <!-- Signatures -->
    <div style="margin-top: 40px; page-break-inside: avoid;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="width: 47%; vertical-align: bottom;">
            <div style="border-bottom: 1.5px solid #000; height: 50px; margin-bottom: 6px;"></div>
            <p style="margin: 2px 0; font-weight: bold;">${data.guarantor_name || '____________________'}</p>
            <p style="margin: 2px 0; font-size: 10pt; color: #4a5568;">Guarantor</p>
            <p style="margin: 2px 0; font-size: 10pt; color: #4a5568;">CNIC: ${data.guarantor_cnic || '_____-_______-_'}</p>
            <p style="margin: 2px 0; font-size: 10pt; color: #4a5568;">Date: ${formatDate(data.agreement_date)}</p>
          </td>
          <td style="width: 6%;"></td>
          <td style="width: 47%; vertical-align: bottom;">
            <div style="border-bottom: 1.5px solid #000; height: 50px; margin-bottom: 6px;"></div>
            <p style="margin: 2px 0; font-weight: bold; color: #1a365d;">For ${COMPANY.name}</p>
            <p style="margin: 2px 0; font-size: 10pt; color: #4a5568;">Authorized Signatory</p>
            <p style="margin: 2px 0; font-size: 10pt; color: #4a5568;">Date: ${formatDate(data.agreement_date)}</p>
          </td>
        </tr>
      </table>
    </div>

    <!-- Thumb Impressions -->
    <div style="margin-top: 35px; page-break-inside: avoid;">
      <h3 style="font-size: 11pt; color: #553c9a; margin: 0 0 10px 0; padding-bottom: 4px; border-bottom: 1px solid #d6bcfa;">THUMB IMPRESSIONS</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="width: 47%; text-align: center;">
            <div style="width: 100px; height: 120px; border: 2px solid #553c9a; margin: 0 auto 6px auto; display: flex; align-items: center; justify-content: center; border-radius: 3px; background: #faf5ff;">
              <span style="font-size: 9pt; color: #a0aec0;">Left Thumb</span>
            </div>
            <p style="margin: 2px 0; font-size: 9pt; color: #4a5568;">Guarantor's Left Thumb</p>
          </td>
          <td style="width: 6%;"></td>
          <td style="width: 47%; text-align: center;">
            <div style="width: 100px; height: 120px; border: 2px solid #553c9a; margin: 0 auto 6px auto; display: flex; align-items: center; justify-content: center; border-radius: 3px; background: #faf5ff;">
              <span style="font-size: 9pt; color: #a0aec0;">Right Thumb</span>
            </div>
            <p style="margin: 2px 0; font-size: 9pt; color: #4a5568;">Guarantor's Right Thumb</p>
          </td>
        </tr>
      </table>
    </div>

    <!-- Witnesses -->
    <div style="margin-top: 35px; page-break-inside: avoid;">
      <h3 style="font-size: 12pt; color: #553c9a; margin: 0 0 12px 0; padding-bottom: 4px; border-bottom: 1px solid #d6bcfa;">WITNESSES</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="width: 47%; vertical-align: top;">
            <p style="margin: 3px 0;"><strong>Witness 1:</strong></p>
            <p style="margin: 3px 0;">Name: ${blank(data.witness1_name)}</p>
            <p style="margin: 3px 0;">CNIC: ${blank(data.witness1_cnic, '180px')}</p>
            <div style="border-bottom: 1.5px solid #000; height: 40px; margin: 12px 0 5px 0;"></div>
            <p style="margin: 2px 0; font-size: 10pt; color: #4a5568;">Signature</p>
          </td>
          <td style="width: 6%;"></td>
          <td style="width: 47%; vertical-align: top;">
            <p style="margin: 3px 0;"><strong>Witness 2:</strong></p>
            <p style="margin: 3px 0;">Name: ${blank(data.witness2_name)}</p>
            <p style="margin: 3px 0;">CNIC: ${blank(data.witness2_cnic, '180px')}</p>
            <div style="border-bottom: 1.5px solid #000; height: 40px; margin: 12px 0 5px 0;"></div>
            <p style="margin: 2px 0; font-size: 10pt; color: #4a5568;">Signature</p>
          </td>
        </tr>
      </table>
    </div>

    <!-- Required Attachments -->
    <div style="margin-top: 25px; padding: 12px 16px; border: 1.5px dashed #d6bcfa; border-radius: 4px; background: #faf5ff; page-break-inside: avoid;">
      <p style="margin: 0 0 6px 0; font-weight: bold; font-size: 10pt; color: #553c9a;">Required Attachments:</p>
      <p style="margin: 2px 0; font-size: 10pt;">&#9744;&nbsp;&nbsp;Guarantor's ID — Front &amp; Back Copy</p>
      <p style="margin: 2px 0; font-size: 10pt;">&#9744;&nbsp;&nbsp;Employee's ID — Front &amp; Back Copy</p>
      <p style="margin: 2px 0; font-size: 10pt;">&#9744;&nbsp;&nbsp;Guarantor's Utility Bill — Address Proof</p>
    </div>
  </div>`;
}


// ══════════════════════════════════════════════════════════
// Main Agreements Page
// ══════════════════════════════════════════════════════════
function AgreementsPage() {
  const { user } = useAuth();
  const previewRef = useRef(null);

  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState('employee');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [savedAgreements, setSavedAgreements] = useState([]);
  const [loadingAgreements, setLoadingAgreements] = useState(false);

  const [formData, setFormData] = useState({
    employee_name: '',
    father_name: '',
    cnic: '',
    address: '',
    phone: '',
    designation: '',
    department: '',
    joining_date: '',
    salary: '',
    agreement_date: new Date().toISOString().split('T')[0],
    reference_no: '',
    probation_period: 'Three (3)',
    probation_notice: 'seven (7)',
    working_hours: '9:00 AM to 5:00 PM',
    working_days: 'Monday to Friday',
    notice_period: 'thirty (30)',
    non_compete_months: 'twelve (12)',
    pay_day: '5th',
    guarantor_name: '',
    guarantor_father_name: '',
    guarantor_cnic: '',
    guarantor_address: '',
    guarantor_phone: '',
    guarantor_relation: '',
    guarantor_occupation: '',
    witness1_name: '',
    witness1_cnic: '',
    witness2_name: '',
    witness2_cnic: '',
  });

  // Stable change handler (never recreated)
  const handleChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const data = await employeesAPI.getAll({});
        setEmployees(data || []);
      } catch (err) {
        console.error('Failed to fetch employees:', err);
      }
    })();
  }, []);

  useEffect(() => {
    if (selectedEmployee) fetchSavedAgreements(selectedEmployee.id);
  }, [selectedEmployee]);

  const fetchSavedAgreements = async (employeeId) => {
    setLoadingAgreements(true);
    try {
      const { data, error } = await supabase
        .from('employee_agreements')
        .select('*')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false });
      if (!error) setSavedAgreements(data || []);
    } catch (err) {
      console.error('Failed to fetch agreements:', err);
      setSavedAgreements([]);
    }
    setLoadingAgreements(false);
  };

  const selectEmployee = (emp) => {
    setSelectedEmployee(emp);
    setFormData(prev => ({
      ...prev,
      employee_name: `${emp.first_name} ${emp.last_name}`,
      phone: emp.phone || '',
      address: emp.address ? `${emp.address}${emp.city ? ', ' + emp.city : ''}${emp.country ? ', ' + emp.country : ''}` : '',
      designation: emp.designation || '',
      department: emp.department || '',
      joining_date: emp.joining_date || '',
      salary: emp.salary_pkr || '',
      cnic: emp.cnic || '',
      father_name: emp.father_name || '',
    }));
    setSearchQuery(`${emp.first_name} ${emp.last_name}`);
    setShowDropdown(false);
  };

  const filteredEmployees = employees.filter(emp => {
    const fullName = `${emp.first_name} ${emp.last_name}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase()) ||
      (emp.employee_code || '').toLowerCase().includes(searchQuery.toLowerCase());
  });

  const generatePDF = async (type) => {
    setGenerating(true);
    try {
      const html2pdf = await loadHtml2Pdf();
      const htmlContent = type === 'employee'
        ? generateEmployeeAgreementHTML(formData)
        : generateGuarantorAgreementHTML(formData);

      // Create container - must be visible for html2canvas
      const container = document.createElement('div');
      container.style.cssText = 'position:absolute;left:0;top:0;width:794px;background:#fff;';
      container.innerHTML = htmlContent;
      document.body.appendChild(container);

      // Wait for DOM to render
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

      const fileName = type === 'employee'
        ? `Employment_Agreement_${(formData.employee_name || 'Draft').replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`
        : `Guarantor_Agreement_${(formData.employee_name || 'Draft').replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;

      await html2pdf().from(container).set({
        margin: [2, 0, 2, 0],
        filename: fileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false, windowWidth: 794 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      }).save();

      document.body.removeChild(container);
      toast.success(`${type === 'employee' ? 'Employment' : 'Guarantor'} Agreement PDF downloaded!`);
    } catch (err) {
      console.error('PDF generation error:', err);
      toast.error('Failed to generate PDF. Please try again.');
    }
    setGenerating(false);
  };

  const saveAgreement = async (type) => {
    if (!selectedEmployee) {
      toast.error('Please select an employee first');
      return;
    }
    setSaving(true);
    try {
      const html2pdf = await loadHtml2Pdf();
      const htmlContent = type === 'employee'
        ? generateEmployeeAgreementHTML(formData)
        : generateGuarantorAgreementHTML(formData);

      // Create container - must be visible for html2canvas
      const container = document.createElement('div');
      container.style.cssText = 'position:absolute;left:0;top:0;width:794px;background:#fff;';
      container.innerHTML = htmlContent;
      document.body.appendChild(container);

      // Wait for DOM to render
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

      const pdfBlob = await html2pdf().from(container).set({
        margin: [2, 0, 2, 0],
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false, windowWidth: 794 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      }).outputPdf('blob');

      document.body.removeChild(container);

      const fileName = `agreements/${selectedEmployee.id}/${type}-agreement-${Date.now()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('files')
        .upload(fileName, pdfBlob, { contentType: 'application/pdf', cacheControl: '3600' });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('files').getPublicUrl(fileName);

      const { error: dbError } = await supabase
        .from('employee_agreements')
        .insert({
          employee_id: selectedEmployee.id,
          agreement_type: type,
          agreement_date: formData.agreement_date,
          reference_no: formData.reference_no || null,
          file_url: urlData?.publicUrl,
          file_path: fileName,
          form_data: formData,
          created_by: user?.id,
        });

      if (dbError) console.warn('Agreement record not saved to DB (table may not exist). File uploaded OK.');

      toast.success(`${type === 'employee' ? 'Employment' : 'Guarantor'} Agreement saved & attached!`);
      fetchSavedAgreements(selectedEmployee.id);
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Failed to save: ' + (err.message || 'Unknown error'));
    }
    setSaving(false);
  };

  // ── Render helper that uses stable handleChange ───────
  const renderField = (label, field, icon, placeholder, type = 'text', span2 = false) => (
    <FormField
      key={field}
      label={label}
      value={formData[field] || ''}
      onChange={e => handleChange(field, e.target.value)}
      icon={icon}
      placeholder={placeholder}
      type={type}
      span2={span2}
    />
  );

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">

      {/* ── Page Header ──────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-blue-600/20 dark:via-gray-900 dark:to-gray-900 border border-blue-100 dark:border-blue-500/20 p-6 lg:p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-100/40 dark:bg-blue-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <FileSignature className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">Employee Agreements</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-0.5 text-sm">Generate Employment & Guarantor agreements, preview, download PDF, and attach to profiles.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

        {/* ═══ LEFT: Forms (3 cols) ═══════════════ */}
        <div className="xl:col-span-3 space-y-5">

          {/* ── Employee Search ────────────────── */}
          <div className="bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
            <SectionHeading icon={Search}>Select Employee</SectionHeading>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setShowDropdown(true); }}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                placeholder="Search by employee name or code..."
                className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/60 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all duration-200"
              />
              {showDropdown && searchQuery && (
                <div className="absolute z-50 mt-2 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl max-h-64 overflow-auto">
                  {filteredEmployees.length === 0 ? (
                    <div className="p-4 text-gray-500 text-sm text-center">No employees found</div>
                  ) : (
                    filteredEmployees.slice(0, 8).map(emp => (
                      <button
                        key={emp.id}
                        onMouseDown={(e) => { e.preventDefault(); selectEmployee(emp); }}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center gap-3 transition-colors border-b border-gray-100 dark:border-gray-700/30 last:border-0"
                      >
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-sm flex-shrink-0">
                          {emp.first_name?.[0]}{emp.last_name?.[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="text-gray-900 dark:text-white font-medium text-sm truncate">{emp.first_name} {emp.last_name}</p>
                          <p className="text-xs text-gray-500 truncate">{emp.employee_code} &bull; {emp.designation || 'N/A'} &bull; {emp.department || 'N/A'}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            {selectedEmployee && (
              <div className="mt-3 px-4 py-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/30 rounded-xl flex items-center gap-2.5">
                <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <span className="text-emerald-700 dark:text-emerald-300 text-sm">
                  Selected: <strong>{selectedEmployee.first_name} {selectedEmployee.last_name}</strong>
                  <span className="text-emerald-500 ml-1">({selectedEmployee.employee_code})</span>
                </span>
              </div>
            )}
          </div>

          {/* ── Tab Switcher ──────────────────── */}
          <div className="flex gap-2 bg-gray-100 dark:bg-gray-900/40 p-1.5 rounded-xl border border-gray-200 dark:border-gray-800">
            <button
              onClick={() => setActiveTab('employee')}
              className={`flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-lg font-semibold text-sm transition-all duration-200 ${
                activeTab === 'employee'
                  ? 'bg-white dark:bg-gradient-to-r dark:from-blue-600 dark:to-blue-500 text-blue-600 dark:text-white shadow-md dark:shadow-blue-500/25'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-800/50'
              }`}
            >
              <FileText className="w-4 h-4" />
              Employment Agreement
            </button>
            <button
              onClick={() => setActiveTab('guarantor')}
              className={`flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-lg font-semibold text-sm transition-all duration-200 ${
                activeTab === 'guarantor'
                  ? 'bg-white dark:bg-gradient-to-r dark:from-purple-600 dark:to-purple-500 text-purple-600 dark:text-white shadow-md dark:shadow-purple-500/25'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-800/50'
              }`}
            >
              <Shield className="w-4 h-4" />
              Guarantor Agreement
            </button>
          </div>

          {/* ═══ EMPLOYEE AGREEMENT FORM ═══════ */}
          {activeTab === 'employee' && (
            <div className="bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 space-y-7 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/15 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Employment Agreement Details</h2>
                  <p className="text-xs text-gray-500">Pre-filled data comes from the employee record. Edit any field as needed.</p>
                </div>
              </div>

              <div>
                <SectionHeading icon={User} color="bg-sky-100 dark:bg-sky-500/15">Personal Information</SectionHeading>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {renderField('Full Legal Name', 'employee_name', User, 'e.g. John Smith')}
                  {renderField("Father's / Husband's Name", 'father_name', User, "Father's name")}
                  {renderField('CNIC / SSN Number', 'cnic', CreditCard, 'ID number')}
                  {renderField('Phone Number', 'phone', Phone, '+1 (732) 000-0000')}
                  {renderField('Full Address', 'address', MapPin, 'Street, City, State, ZIP', 'text', true)}
                </div>
              </div>

              <div>
                <SectionHeading icon={Briefcase} color="bg-amber-100 dark:bg-amber-500/15">Employment Details</SectionHeading>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {renderField('Designation / Position', 'designation', Briefcase, 'e.g. Billing Specialist')}
                  {renderField('Department', 'department', Building2, 'e.g. Billing')}
                  {renderField('Joining Date', 'joining_date', Calendar, '', 'date')}
                  {renderField('Monthly Salary ($)', 'salary', DollarSign, 'e.g. 5000', 'number')}
                  {renderField('Agreement Date', 'agreement_date', Calendar, '', 'date')}
                  {renderField('Reference Number', 'reference_no', null, 'e.g. GA-2026-001')}
                </div>
              </div>

              <div>
                <SectionHeading icon={Clock} color="bg-green-100 dark:bg-green-500/15">Employment Terms</SectionHeading>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {renderField('Probation Period', 'probation_period', null, 'Three (3)')}
                  {renderField('Notice Period', 'notice_period', null, 'thirty (30)')}
                  {renderField('Working Hours', 'working_hours', Clock, '9:00 AM to 5:00 PM')}
                  {renderField('Working Days', 'working_days', null, 'Monday to Friday')}
                </div>
              </div>

              <div>
                <SectionHeading icon={UserCheck} color="bg-indigo-100 dark:bg-indigo-500/15">Witnesses</SectionHeading>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {renderField('Witness 1 — Name', 'witness1_name', UserCheck, 'Full legal name')}
                  {renderField('Witness 1 — CNIC / ID', 'witness1_cnic', CreditCard, 'ID number')}
                  {renderField('Witness 2 — Name', 'witness2_name', UserCheck, 'Full legal name')}
                  {renderField('Witness 2 — CNIC / ID', 'witness2_cnic', CreditCard, 'ID number')}
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-5 border-t border-gray-200 dark:border-gray-700/50">
                <button onClick={() => setShowPreview('employee')} className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-xl transition-all text-sm font-medium">
                  <Eye className="w-4 h-4" /> Preview
                </button>
                <button onClick={() => generatePDF('employee')} disabled={generating} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-md shadow-blue-500/20 transition-all text-sm font-semibold disabled:opacity-50">
                  {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Print / Download PDF
                </button>
                <button onClick={() => saveAgreement('employee')} disabled={saving || !selectedEmployee} className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md shadow-emerald-500/20 transition-all text-sm font-semibold disabled:opacity-50">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save & Attach to Profile
                </button>
              </div>
            </div>
          )}

          {/* ═══ GUARANTOR AGREEMENT FORM ══════ */}
          {activeTab === 'guarantor' && (
            <div className="bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 space-y-7 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-500/15 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Guarantor Agreement Details</h2>
                  <p className="text-xs text-gray-500">Employee data is pre-filled. Enter the guarantor's information below.</p>
                </div>
              </div>

              <div>
                <SectionHeading icon={User} color="bg-blue-100 dark:bg-blue-500/15">Employee Being Guaranteed</SectionHeading>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {renderField('Employee Name', 'employee_name', User, 'Auto-filled')}
                  {renderField('Employee CNIC / ID', 'cnic', CreditCard, 'ID number')}
                  {renderField('Designation', 'designation', Briefcase, 'Position')}
                  {renderField('Department', 'department', Building2, 'Department')}
                </div>
              </div>

              <div>
                <SectionHeading icon={Shield} color="bg-purple-100 dark:bg-purple-500/15">Guarantor Information</SectionHeading>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {renderField('Guarantor Full Name', 'guarantor_name', User, 'Full legal name')}
                  {renderField("Guarantor Father's Name", 'guarantor_father_name', User, "Father's name")}
                  {renderField('Guarantor CNIC / ID', 'guarantor_cnic', CreditCard, 'ID number')}
                  {renderField('Guarantor Phone', 'guarantor_phone', Phone, '+1 (732) 000-0000')}
                  {renderField('Guarantor Full Address', 'guarantor_address', MapPin, 'Full residential address', 'text', true)}
                  {renderField('Relation to Employee', 'guarantor_relation', null, 'e.g. Father, Brother')}
                  {renderField('Guarantor Occupation', 'guarantor_occupation', Briefcase, 'e.g. Businessman')}
                </div>
              </div>

              <div>
                <SectionHeading icon={Calendar} color="bg-amber-100 dark:bg-amber-500/15">Agreement Details</SectionHeading>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {renderField('Agreement Date', 'agreement_date', Calendar, '', 'date')}
                  {renderField('Reference Number', 'reference_no', null, 'e.g. GA-2026-001')}
                </div>
              </div>

              <div>
                <SectionHeading icon={UserCheck} color="bg-indigo-100 dark:bg-indigo-500/15">Witnesses</SectionHeading>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {renderField('Witness 1 — Name', 'witness1_name', UserCheck, 'Full legal name')}
                  {renderField('Witness 1 — CNIC / ID', 'witness1_cnic', CreditCard, 'ID number')}
                  {renderField('Witness 2 — Name', 'witness2_name', UserCheck, 'Full legal name')}
                  {renderField('Witness 2 — CNIC / ID', 'witness2_cnic', CreditCard, 'ID number')}
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-5 border-t border-gray-200 dark:border-gray-700/50">
                <button onClick={() => setShowPreview('guarantor')} className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-xl transition-all text-sm font-medium">
                  <Eye className="w-4 h-4" /> Preview
                </button>
                <button onClick={() => generatePDF('guarantor')} disabled={generating} className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl shadow-md shadow-purple-500/20 transition-all text-sm font-semibold disabled:opacity-50">
                  {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Print / Download PDF
                </button>
                <button onClick={() => saveAgreement('guarantor')} disabled={saving || !selectedEmployee} className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md shadow-emerald-500/20 transition-all text-sm font-semibold disabled:opacity-50">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save & Attach to Profile
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ═══ RIGHT SIDEBAR ═════════════════ */}
        <div className="space-y-5">
          <div className="bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
            <SectionHeading icon={FileText} color="bg-emerald-100 dark:bg-emerald-500/15">Saved Agreements</SectionHeading>
            {!selectedEmployee ? (
              <div className="text-center py-10">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800/50 flex items-center justify-center mx-auto mb-3">
                  <Users className="w-7 h-7 text-gray-400 dark:text-gray-600" />
                </div>
                <p className="text-gray-500 text-sm">Select an employee to view agreements</p>
              </div>
            ) : loadingAgreements ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              </div>
            ) : savedAgreements.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800/50 flex items-center justify-center mx-auto mb-3">
                  <FileText className="w-7 h-7 text-gray-400 dark:text-gray-600" />
                </div>
                <p className="text-gray-500 text-sm">No agreements saved yet</p>
                <p className="text-gray-400 dark:text-gray-600 text-xs mt-1">Click "Save & Attach to Profile"</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {savedAgreements.map(agr => (
                  <div key={agr.id} className="group p-3.5 bg-gray-50 dark:bg-gray-800/40 hover:bg-gray-100 dark:hover:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700/40 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          agr.agreement_type === 'employee' ? 'bg-blue-100 dark:bg-blue-500/15' : 'bg-purple-100 dark:bg-purple-500/15'
                        }`}>
                          {agr.agreement_type === 'employee'
                            ? <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            : <Shield className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                          }
                        </div>
                        <span className="text-gray-900 dark:text-white text-sm font-medium capitalize truncate">
                          {agr.agreement_type} Agreement
                        </span>
                      </div>
                      {agr.file_url && (
                        <a href={agr.file_url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-500 transition-colors flex-shrink-0" title="Open PDF">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1.5 ml-[42px]">
                      {agr.agreement_date ? formatDate(agr.agreement_date) : 'No date'}
                      {agr.reference_no && <span className="text-gray-400"> &bull; {agr.reference_no}</span>}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
            <SectionHeading icon={AlertCircle} color="bg-amber-100 dark:bg-amber-500/15">How to Use</SectionHeading>
            <ol className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
              {[
                'Search and select an employee (fields auto-fill)',
                'Complete any missing fields (ID, phone, etc.)',
                'Switch between Employment & Guarantor tabs',
                'Click "Preview" to check the agreement on-screen',
                'Click "Print / Download PDF" to save locally',
                '"Save & Attach" links the PDF to the employee profile',
              ].map((step, i) => (
                <li key={i} className="flex gap-3 items-start">
                  <span className="w-6 h-6 rounded-lg bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold text-xs flex-shrink-0 mt-0.5">{i + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      {/* ═══ PREVIEW MODAL ═══════════════════ */}
      {showPreview && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center gap-3">
                {showPreview === 'employee' ? <FileText className="w-5 h-5 text-blue-600" /> : <Shield className="w-5 h-5 text-purple-600" />}
                <h3 className="font-bold text-gray-900 text-lg">
                  {showPreview === 'employee' ? 'Employment Agreement' : 'Guarantor Agreement'} — Preview
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => generatePDF(showPreview)} disabled={generating} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 text-sm font-medium transition-colors disabled:opacity-50">
                  {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Download PDF
                </button>
                <button onClick={() => setShowPreview(false)} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
            <div ref={previewRef} className="overflow-auto flex-1" style={{ background: '#e5e7eb', padding: '20px' }}>
              <div
                style={{ background: '#fff', margin: '0 auto', width: '794px', maxWidth: '100%', boxShadow: '0 2px 16px rgba(0,0,0,0.08)', borderRadius: '4px' }}
                dangerouslySetInnerHTML={{
                  __html: showPreview === 'employee'
                    ? generateEmployeeAgreementHTML(formData)
                    : generateGuarantorAgreementHTML(formData)
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AgreementsPage;
