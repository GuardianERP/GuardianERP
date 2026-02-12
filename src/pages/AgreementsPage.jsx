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
  usOffice: '1309 Coffeen Ave, Ste 1200, Sheridan, WY 82801, USA',
  pkOffice: 'Academy Town, Canal Road, Peshawar, KP, Pakistan',
  phone: '+1 (732) 944-0080',
  email: 'info@guardiandentalbilling.com',
  website: 'www.guardiandentalbilling.com',
  ceo: 'Shakeel Ahmad',
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
// PDF Template: Employee Employment Agreement (4-Page Dental Billing Format)
// ══════════════════════════════════════════════════════════
function generateEmployeeAgreementHTML(data) {
  const blank = (val, width = '180px') => val
    ? `<span style="font-weight:600; border-bottom:1px solid #333; padding: 0 4px;">${val}</span>`
    : `<span style="display:inline-block; width:${width}; border-bottom:1.5px solid #000;">&nbsp;</span>`;

  const salaryPKR = data.salary ? `PKR ${Number(data.salary).toLocaleString()}` : 'PKR ________';
  const salaryWords = data.salary ? numberToWords(Number(data.salary)) + ' Pakistani Rupees' : '________________________';

  return `
  <div style="font-family: 'Times New Roman', Georgia, serif; font-size: 11pt; color: #1a1a1a; line-height: 1.6; padding: 15px 25px; width: 100%; box-sizing: border-box; background: #fff;">

    <!-- ═══════════════ LETTERHEAD ═══════════════ -->
    <div style="text-align: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #1a365d;">
      <h1 style="font-size: 18pt; font-weight: bold; margin: 0; letter-spacing: 2px; color: #1a365d;">${COMPANY.name.toUpperCase()}</h1>
      <p style="font-size: 9pt; margin: 6px 0 2px 0; color: #333;"><strong>US Office:</strong> ${COMPANY.usOffice}</p>
      <p style="font-size: 9pt; margin: 2px 0; color: #333;"><strong>Pakistan Office:</strong> ${COMPANY.pkOffice}</p>
      <p style="font-size: 9pt; margin: 4px 0 2px 0; color: #333;">Contact: ${COMPANY.phone} | ${COMPANY.email}</p>
      <p style="font-size: 9pt; margin: 2px 0; color: #333;">Website: ${COMPANY.website}</p>
    </div>

    <h2 style="text-align: center; font-size: 14pt; font-weight: bold; margin: 12px 0 15px 0; letter-spacing: 1px; color: #1a365d;">EMPLOYMENT AGREEMENT</h2>

    <!-- ═══════════════ PREAMBLE ═══════════════ -->
    <p style="text-align: justify; margin-bottom: 12px;">THIS EMPLOYMENT AGREEMENT (the "Agreement") is made and entered into this <strong>${formatDate(data.agreement_date)}</strong>, by and between:</p>

    <p style="text-align: justify; margin: 10px 0;"><strong>THE EMPLOYER:</strong> ${COMPANY.name}, a Limited Liability Company registered in Wyoming, USA, and operating its regional headquarters at ${COMPANY.pkOffice} (hereinafter referred to as the "Company").</p>

    <p style="text-align: center; font-weight: bold; margin: 8px 0;">AND</p>

    <p style="text-align: justify; margin: 10px 0 15px 0;"><strong>THE EMPLOYEE:</strong> ${data.employee_name ? `Mr./Ms. ${data.employee_name}` : blank('', '200px')}, S/o: ${blank(data.father_name)}, holding CNIC No: ${blank(data.cnic)}, residing at ${blank(data.address, '280px')} (hereinafter referred to as the "Employee").</p>

    <!-- ═══════════════ ARTICLE 1 ═══════════════ -->
    <h3 style="font-size: 11pt; font-weight: bold; color: #1a365d; margin: 14px 0 6px 0; border-bottom: 1px solid #ccc; padding-bottom: 3px;">ARTICLE 1: NATURE OF APPOINTMENT</h3>
    <p style="text-align: justify; margin: 4px 0;"><strong>1.1 Position:</strong> The Employee is hereby appointed to the position of <strong>${data.designation || blank('', '150px')}</strong> within the <strong>${data.department || blank('', '150px')}</strong> Department of the Company.</p>
    <p style="text-align: justify; margin: 4px 0;"><strong>1.2 Reporting:</strong> The Employee shall report directly to the CEO, Mr. ${COMPANY.ceo}, or any other supervisor designated by the Company.</p>
    <p style="text-align: justify; margin: 4px 0;"><strong>1.3 Full-Time Commitment:</strong> The Employee shall devote their full professional time, attention, and best efforts to the performance of duties during working hours and shall not engage in any other business activity or employment without prior written consent from the Company.</p>

    <!-- ═══════════════ ARTICLE 2 ═══════════════ -->
    <h3 style="font-size: 11pt; font-weight: bold; color: #1a365d; margin: 14px 0 6px 0; border-bottom: 1px solid #ccc; padding-bottom: 3px;">ARTICLE 2: SCOPE OF WORK & ELITE PERFORMANCE METRICS</h3>
    <p style="text-align: justify; margin: 4px 0;"><strong>2.1 Service Excellence:</strong> The Company operates as an elite Revenue Cycle Management (RCM) provider. The Employee is required to uphold the following core performance metrics:</p>
    <ul style="margin: 6px 0 6px 25px; padding: 0;">
      <li style="margin: 3px 0;"><strong>Clean Claims Rate:</strong> A minimum consistent rate of 98%.</li>
      <li style="margin: 3px 0;"><strong>Insurance Verification:</strong> A turnaround time (TAT) of 10–45 minutes.</li>
      <li style="margin: 3px 0;"><strong>AR Management:</strong> Maintenance of Zero (0) pending claims in the 90+ days category.</li>
    </ul>
    <p style="text-align: justify; margin: 4px 0;"><strong>2.2 Software Proficiency:</strong> The Employee must demonstrate and maintain expert-level mastery of dental software, including but not limited to Dentrix (Ascend & Enterprise), Open Dental, Eaglesoft, Oryx, Curve Hero, AbelDent, CareStack, and Denticon.</p>

    <!-- ═══════════════ ARTICLE 3 ═══════════════ -->
    <h3 style="font-size: 11pt; font-weight: bold; color: #1a365d; margin: 14px 0 6px 0; border-bottom: 1px solid #ccc; padding-bottom: 3px;">ARTICLE 3: TERM AND PROBATIONARY PERIOD</h3>
    <p style="text-align: justify; margin: 4px 0;"><strong>3.1 Commencement:</strong> The Employee's term of employment officially commenced on <strong>${formatDate(data.joining_date)}</strong>.</p>
    <p style="text-align: justify; margin: 4px 0;"><strong>3.2 Probation:</strong> The Employee shall serve a mandatory probationary period of <strong>${data.probation_period || 'Three (3)'}</strong> months. During this period, the Company will evaluate the Employee's technical skills, adherence to HIPAA protocols, and alignment with Company metrics.</p>
    <p style="text-align: justify; margin: 4px 0;"><strong>3.3 Termination During Probation:</strong> During the probationary period, either party may terminate this Agreement by providing <strong>${data.probation_notice || 'seven (7)'}</strong> days' written notice.</p>

    <!-- ═══════════════ ARTICLE 4 ═══════════════ -->
    <h3 style="font-size: 11pt; font-weight: bold; color: #1a365d; margin: 14px 0 6px 0; border-bottom: 1px solid #ccc; padding-bottom: 3px;">ARTICLE 4: COMPENSATION AND BENEFITS</h3>
    <p style="text-align: justify; margin: 4px 0;"><strong>4.1 Monthly Salary:</strong> The Company shall pay the Employee a gross monthly salary of <strong>${salaryPKR} (${salaryWords})</strong>.</p>
    <p style="text-align: justify; margin: 4px 0;"><strong>4.2 Payment Schedule:</strong> Salary shall be disbursed on or before the <strong>${data.pay_day || '5th'}</strong> of each calendar month via bank transfer to the Employee's designated account.</p>
    <p style="text-align: justify; margin: 4px 0;"><strong>4.3 Performance-Based Incentives:</strong> At the Company's sole discretion, the Employee may be eligible for bonuses based on maintaining a 98% Clean Claims Rate and ensuring Zero pending claims in the 90+ days category.</p>
    <p style="text-align: justify; margin: 4px 0;"><strong>4.4 Statutory Deductions:</strong> The Company shall make all applicable tax and statutory deductions from the gross salary as required by the laws of Pakistan.</p>

    <!-- ═══════════════ ARTICLE 5 ═══════════════ -->
    <h3 style="font-size: 11pt; font-weight: bold; color: #1a365d; margin: 14px 0 6px 0; border-bottom: 1px solid #ccc; padding-bottom: 3px;">ARTICLE 5: WORKING HOURS AND ATTENDANCE</h3>
    <p style="text-align: justify; margin: 4px 0;"><strong>5.1 Standard Hours:</strong> The Employee's standard working hours are <strong>${data.working_hours || '9:00 AM to 5:00 PM'}</strong>, <strong>${data.working_days || 'Monday through Friday'}</strong>.</p>
    <p style="text-align: justify; margin: 4px 0;"><strong>5.2 Operational Flexibility:</strong> Due to the nature of US-based dental billing, the Employee may occasionally be required to adjust hours to align with US Eastern/Mountain Standard Time for client meetings or urgent insurance verifications.</p>
    <p style="text-align: justify; margin: 4px 0;"><strong>5.3 Unauthorized Absence:</strong> Any absence without prior written approval or medical evidence will be treated as a breach of discipline and may result in salary deductions.</p>

    <!-- ═══════════════ ARTICLE 6 ═══════════════ -->
    <h3 style="font-size: 11pt; font-weight: bold; color: #1a365d; margin: 14px 0 6px 0; border-bottom: 1px solid #ccc; padding-bottom: 3px;">ARTICLE 6: HIPAA COMPLIANCE AND DATA SECURITY</h3>
    <p style="text-align: justify; margin: 4px 0;"><strong>6.1 Protection of PHI:</strong> The Employee acknowledges that they will have access to Protected Health Information (PHI). The Employee agrees to strictly follow all HIPAA (Health Insurance Portability and Accountability Act) regulations regarding patient privacy.</p>
    <p style="text-align: justify; margin: 4px 0;"><strong>6.2 Data Handling:</strong> No patient data, client lists, or insurance records may be photographed, screenshotted, or transferred to personal devices or external cloud storage.</p>
    <p style="text-align: justify; margin: 4px 0;"><strong>6.3 Breach Notification:</strong> The Employee must immediately report any suspected data breach or unauthorized access to the CEO.</p>

    <!-- ═══════════════ ARTICLE 7 ═══════════════ -->
    <h3 style="font-size: 11pt; font-weight: bold; color: #1a365d; margin: 14px 0 6px 0; border-bottom: 1px solid #ccc; padding-bottom: 3px;">ARTICLE 7: EMPLOYEE LIABILITY AND FINANCIAL PENALTIES</h3>
    <p style="text-align: justify; margin: 4px 0;"><strong>7.1 Duty of Care:</strong> The Employee is obligated to perform all duties with the highest level of professional care.</p>
    <p style="text-align: justify; margin: 4px 0;"><strong>7.2 Liability for Negligence:</strong> If the Employee causes financial loss to the Company or its clients through gross negligence, recurring errors, or willful misconduct, the Employee shall be held financially liable for the loss incurred.</p>
    <p style="text-align: justify; margin: 4px 0;"><strong>7.3 Penalty for Damages:</strong> In the event of damage to Company property (laptops, hardware) or loss of revenue due to intentional delay in claims processing, the Company reserves the right to deduct the equivalent value of the loss from the Employee's monthly salary or final settlement.</p>
    <p style="text-align: justify; margin: 4px 0;"><strong>7.4 Intentional Misconduct:</strong> Any intentional act performed to damage the Company's reputation or materials will result in immediate termination without notice, followed by legal recovery of damages.</p>

    <!-- ═══════════════ ARTICLE 8 ═══════════════ -->
    <h3 style="font-size: 11pt; font-weight: bold; color: #1a365d; margin: 14px 0 6px 0; border-bottom: 1px solid #ccc; padding-bottom: 3px;">ARTICLE 8: CONFIDENTIALITY AND NON-DISCLOSURE</h3>
    <p style="text-align: justify; margin: 4px 0;"><strong>8.1 Proprietary Information:</strong> The Employee acknowledges that during their employment, they will have access to confidential information, including but not limited to: client lists (Dental Practices), dentist contact details, PPO fee schedules, internal SOPs, billing strategies, and financial data of ${COMPANY.name}.</p>
    <p style="text-align: justify; margin: 4px 0;"><strong>8.2 Non-Disclosure:</strong> The Employee shall not, during or at any time after the termination of this Agreement, disclose, reveal, or make use of any confidential information for personal gain or for the benefit of any third party.</p>
    <p style="text-align: justify; margin: 4px 0;"><strong>8.3 Third-Party Data:</strong> This obligation extends to the confidential data of the Company's clients and their patients (PHI). Any breach of this confidentiality will be considered a material breach of contract and may lead to legal action in both Pakistan and US jurisdictions.</p>

    <!-- ═══════════════ ARTICLE 9 ═══════════════ -->
    <h3 style="font-size: 11pt; font-weight: bold; color: #1a365d; margin: 14px 0 6px 0; border-bottom: 1px solid #ccc; padding-bottom: 3px;">ARTICLE 9: INTELLECTUAL PROPERTY (IP) RIGHTS</h3>
    <p style="text-align: justify; margin: 4px 0;"><strong>9.1 Ownership of Work Product:</strong> Any and all work product—including but not limited to AR management scripts, custom Excel macros, billing workflows, training manuals, software tools, or marketing materials—created, developed, or improved by the Employee during working hours or using Company resources shall be the sole and exclusive property of ${COMPANY.name}.</p>
    <p style="text-align: justify; margin: 4px 0;"><strong>9.2 Assignment of Rights:</strong> The Employee hereby irrevocably assigns to the Company all rights, titles, and interests in such intellectual property. The Employee shall not claim any ownership or copyright over any tool or process used within the Company.</p>

    <!-- ═══════════════ ARTICLE 10 ═══════════════ -->
    <h3 style="font-size: 11pt; font-weight: bold; color: #1a365d; margin: 14px 0 6px 0; border-bottom: 1px solid #ccc; padding-bottom: 3px;">ARTICLE 10: NON-COMPETE AND NON-SOLICITATION</h3>
    <p style="text-align: justify; margin: 4px 0;"><strong>10.1 Non-Compete:</strong> For a period of <strong>${data.non_compete_months || 'twelve (12)'}</strong> months following the termination of this Agreement for any reason, the Employee shall not, directly or indirectly, engage in, consult for, or be employed by any business that competes with the dental billing and RCM services of the Company within the United States or Pakistan.</p>
    <p style="text-align: justify; margin: 4px 0;"><strong>10.2 Non-Solicitation of Clients:</strong> The Employee shall not, for a period of twelve (12) months after termination, solicit, contact, or attempt to divert any client, dental practice, or DSO that was a client of the Company during the Employee's tenure.</p>
    <p style="text-align: justify; margin: 4px 0;"><strong>10.3 Non-Solicitation of Employees:</strong> The Employee shall not induce or attempt to induce any other employee or contractor of ${COMPANY.name} to leave their employment for a competing venture.</p>

    <!-- ═══════════════ ARTICLE 11 ═══════════════ -->
    <h3 style="font-size: 11pt; font-weight: bold; color: #1a365d; margin: 14px 0 6px 0; border-bottom: 1px solid #ccc; padding-bottom: 3px;">ARTICLE 11: COMPANY PROPERTY AND MATERIALS</h3>
    <p style="text-align: justify; margin: 4px 0;"><strong>11.1 Equipment Care:</strong> All equipment provided by the Company (laptops, headsets, secure tokens) must be maintained in good working condition.</p>
    <p style="text-align: justify; margin: 4px 0;"><strong>11.2 Return of Property:</strong> Upon termination or resignation, the Employee must immediately return all Company property, including digital files, login credentials, and physical assets. Failure to do so will result in the withholding of the final settlement and potential legal recovery.</p>

    <!-- ═══════════════ ARTICLE 12 ═══════════════ -->
    <h3 style="font-size: 11pt; font-weight: bold; color: #1a365d; margin: 14px 0 6px 0; border-bottom: 1px solid #ccc; padding-bottom: 3px;">ARTICLE 12: TERMINATION OF EMPLOYMENT</h3>
    <p style="text-align: justify; margin: 4px 0;"><strong>12.1 Termination by Notice:</strong> Following the successful completion of the probationary period, either party may terminate this Agreement by providing <strong>${data.notice_period || 'thirty (30)'}</strong> days' written notice or by providing basic salary in lieu of such notice.</p>
    <p style="text-align: justify; margin: 4px 0;"><strong>12.2 Immediate Termination for Cause:</strong> The Company reserves the right to terminate the Employee's employment immediately, without notice or compensation in lieu of notice, for "Just Cause." Just Cause includes, but is not limited to:</p>
    <ul style="margin: 4px 0 4px 25px; padding: 0;">
      <li style="margin: 2px 0;">Any breach of HIPAA regulations or patient data confidentiality.</li>
      <li style="margin: 2px 0;">Gross misconduct, fraud, or dishonesty.</li>
      <li style="margin: 2px 0;">Willful disobedience of lawful orders or recurring negligence in duty.</li>
      <li style="margin: 2px 0;">Failure to meet the minimum 98% Clean Claims Rate after two consecutive warnings.</li>
      <li style="margin: 2px 0;">Acts detrimental to the Company's reputation or interests.</li>
    </ul>
    <p style="text-align: justify; margin: 4px 0;"><strong>12.3 Effect of Termination:</strong> Upon termination, the Employee shall immediately return all Company property, files, and access credentials. The final settlement, including the last month's salary (after any applicable deductions for damages), will be cleared within 15 days of the return of all assets.</p>

    <!-- ═══════════════ ARTICLE 13 ═══════════════ -->
    <h3 style="font-size: 11pt; font-weight: bold; color: #1a365d; margin: 14px 0 6px 0; border-bottom: 1px solid #ccc; padding-bottom: 3px;">ARTICLE 13: DISPUTE RESOLUTION AND GOVERNING LAW</h3>
    <p style="text-align: justify; margin: 4px 0;"><strong>13.1 Governing Law:</strong> This Agreement shall be governed by and construed in accordance with the laws of the State of Wyoming, USA, regarding corporate and client-facing matters, and the Labor Laws of Pakistan regarding local employment conditions.</p>
    <p style="text-align: justify; margin: 4px 0;"><strong>13.2 Jurisdiction:</strong> Any disputes arising out of or in connection with this Agreement shall first be attempted to be settled through mutual negotiation. If a resolution is not reached, the courts of Peshawar, Pakistan, shall have jurisdiction over local labor disputes.</p>

    <!-- ═══════════════ ARTICLE 14 ═══════════════ -->
    <h3 style="font-size: 11pt; font-weight: bold; color: #1a365d; margin: 14px 0 6px 0; border-bottom: 1px solid #ccc; padding-bottom: 3px;">ARTICLE 14: ENTIRE AGREEMENT AND AMENDMENTS</h3>
    <p style="text-align: justify; margin: 4px 0;"><strong>14.1 Entire Agreement:</strong> This document constitutes the entire agreement between the parties and supersedes all prior oral or written agreements.</p>
    <p style="text-align: justify; margin: 4px 0;"><strong>14.2 Amendments:</strong> No modification or amendment to this Agreement shall be valid unless made in writing and signed by both the CEO of ${COMPANY.name} and the Employee.</p>

    <!-- ═══════════════ EXECUTION ═══════════════ -->
    <div style="margin-top: 25px; page-break-inside: avoid;">
      <h3 style="font-size: 12pt; font-weight: bold; color: #1a365d; margin: 0 0 8px 0; text-align: center;">EXECUTION</h3>
      <p style="text-align: justify; margin-bottom: 15px;"><strong>IN WITNESS WHEREOF</strong>, the parties have executed this Agreement as of <strong>${formatDate(data.agreement_date)}</strong>.</p>
      
      <table style="width: 100%; margin-top: 20px; border-collapse: collapse;">
        <tr>
          <td style="width: 48%; vertical-align: top; padding-right: 15px;">
            <p style="margin: 0 0 5px 0; font-weight: bold;">For and on behalf of ${COMPANY.name.toUpperCase()}:</p>
            <div style="border-bottom: 1.5px solid #000; height: 45px; margin: 15px 0 5px 0;"></div>
            <p style="margin: 2px 0; font-weight: bold;">${COMPANY.ceo}</p>
            <p style="margin: 2px 0; font-size: 10pt; color: #555;">Chief Executive Officer</p>
            <p style="margin: 8px 0 2px 0;">Date: ____________________</p>
          </td>
          <td style="width: 4%;"></td>
          <td style="width: 48%; vertical-align: top; padding-left: 15px;">
            <p style="margin: 0 0 5px 0; font-weight: bold;">For and on behalf of THE EMPLOYEE:</p>
            <div style="border-bottom: 1.5px solid #000; height: 45px; margin: 15px 0 5px 0;"></div>
            <p style="margin: 2px 0; font-weight: bold;">${data.employee_name || '____________________'}</p>
            <p style="margin: 2px 0; font-size: 10pt; color: #555;">CNIC: ${data.cnic || '____________________'}</p>
            <p style="margin: 8px 0 2px 0;">Date: ____________________</p>
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
  <div style="font-family: 'Times New Roman', Georgia, serif; font-size: 11pt; color: #1a1a1a; line-height: 1.6; padding: 15px 25px; width: 100%; box-sizing: border-box; background: #fff;">
    
    <!-- Letterhead -->
    <div style="text-align: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #1a365d;">
      <h1 style="font-size: 18pt; font-weight: bold; margin: 0; letter-spacing: 2px; color: #1a365d;">${COMPANY.name.toUpperCase()}</h1>
      <p style="font-size: 9pt; margin: 6px 0 2px 0; color: #333;"><strong>US Office:</strong> ${COMPANY.usOffice}</p>
      <p style="font-size: 9pt; margin: 2px 0; color: #333;"><strong>Pakistan Office:</strong> ${COMPANY.pkOffice}</p>
      <p style="font-size: 9pt; margin: 4px 0 2px 0; color: #333;">Contact: ${COMPANY.phone} | ${COMPANY.email}</p>
      <p style="font-size: 9pt; margin: 2px 0; color: #333;">Website: ${COMPANY.website}</p>
    </div>

    <h2 style="text-align: center; font-size: 14pt; font-weight: bold; margin: 12px 0 15px 0; letter-spacing: 1px; color: #1a365d;">GUARANTOR AGREEMENT</h2>

    <!-- Reference & Date -->
    <table style="width: 100%; margin-bottom: 15px; font-size: 10pt;">
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
      const htmlContent = type === 'employee'
        ? generateEmployeeAgreementHTML(formData)
        : generateGuarantorAgreementHTML(formData);

      const title = type === 'employee'
        ? `Employment Agreement - ${formData.employee_name || 'Draft'}`
        : `Guarantor Agreement - ${formData.employee_name || 'Draft'}`;

      // Open a new window with the full agreement HTML and trigger print
      const printWindow = window.open('', '_blank', 'width=900,height=700');
      if (!printWindow) {
        toast.error('Please allow pop-ups to print the agreement.');
        setGenerating(false);
        return;
      }

      printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <style>
    @page { size: A4; margin: 10mm 12mm 10mm 12mm; }
    @media print {
      body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
    body { margin: 0; padding: 0; background: #fff; }
  </style>
</head>
<body>${htmlContent}</body>
</html>`);
      printWindow.document.close();

      // Wait for content to fully load then trigger print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
          setGenerating(false);
        }, 300);
      };

      // Fallback if onload doesn't fire
      setTimeout(() => {
        try {
          printWindow.focus();
          printWindow.print();
        } catch (e) { /* already handled */ }
        setGenerating(false);
      }, 1500);

      toast.success('Print dialog opened! Choose "Save as PDF" or print directly.');
    } catch (err) {
      console.error('PDF generation error:', err);
      toast.error('Failed to generate PDF: ' + err.message);
      setGenerating(false);
    }
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

      // Use an iframe for reliable rendering
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:absolute;left:-9999px;top:0;width:794px;height:1123px;border:none;';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      iframeDoc.open();
      iframeDoc.write(`<!DOCTYPE html><html><head><style>body{margin:0;padding:0;background:#fff;}</style></head><body>${htmlContent}</body></html>`);
      iframeDoc.close();

      // Wait for iframe to render
      await new Promise(r => setTimeout(r, 500));

      const pdfBlob = await html2pdf().from(iframeDoc.body).set({
        margin: [5, 5, 5, 5],
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, width: 794, windowWidth: 794, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      }).outputPdf('blob');

      document.body.removeChild(iframe);

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
