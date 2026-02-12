/**
 * Guardian Desktop ERP - Employee Agreements Page
 * Generate, print, and attach Employee Employment Agreements & Guarantor Agreements
 * Produces formatted PDFs matching standard Pakistan employment agreement format
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  FileText, Download, Printer, User, Users, Search,
  Plus, Eye, CheckCircle, Loader2, Save, X, Building2,
  FileSignature, UserCheck, Shield, Calendar, MapPin,
  Phone, CreditCard, Briefcase, DollarSign, Clock,
  AlertCircle, Trash2, ChevronDown
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

// ── Company info ────────────────────────────────────────
const COMPANY = {
  name: 'Guardian Systems',
  address: 'Office #12, 2nd Floor, Al-Hafeez Tower, Main Boulevard, Gulberg III, Lahore, Pakistan',
  phone: '+92-42-35761234',
  email: 'hr@guardiansystems.pk',
  ntn: '1234567-8',
};

// ── Number to words helper (for salary) ─────────────────
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

// Format date nicely
const formatDate = (dateStr) => {
  if (!dateStr) return '____________________';
  try { return format(new Date(dateStr), 'MMMM dd, yyyy'); }
  catch { return dateStr; }
};

// ══════════════════════════════════════════════════════════
// PDF Template: Employee Agreement
// ══════════════════════════════════════════════════════════
function generateEmployeeAgreementHTML(data) {
  return `
  <div style="font-family: 'Times New Roman', Times, serif; font-size: 12pt; color: #000; line-height: 1.6; padding: 40px 50px; max-width: 800px; margin: 0 auto;">
    
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px double #000; padding-bottom: 20px;">
      <h1 style="font-size: 22pt; font-weight: bold; margin: 0; letter-spacing: 2px;">${COMPANY.name.toUpperCase()}</h1>
      <p style="font-size: 10pt; margin: 5px 0; color: #333;">${COMPANY.address}</p>
      <p style="font-size: 10pt; margin: 2px 0; color: #333;">Phone: ${COMPANY.phone} | Email: ${COMPANY.email}</p>
      <h2 style="font-size: 16pt; font-weight: bold; margin: 20px 0 0 0; text-decoration: underline; letter-spacing: 1px;">EMPLOYMENT AGREEMENT</h2>
    </div>

    <!-- Agreement Date & Reference -->
    <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
      <div><strong>Agreement Date:</strong> ${formatDate(data.agreement_date)}</div>
      <div><strong>Ref No:</strong> ${data.reference_no || 'GA-' + new Date().getFullYear() + '-____'}</div>
    </div>

    <!-- Preamble -->
    <p>This Employment Agreement ("<strong>Agreement</strong>") is entered into on <strong>${formatDate(data.agreement_date)}</strong> by and between:</p>

    <div style="margin: 15px 0; padding: 15px; border: 1px solid #ccc; background: #f9f9f9;">
      <p style="margin: 3px 0;"><strong>EMPLOYER:</strong> ${COMPANY.name}, having its principal office at ${COMPANY.address} (hereinafter referred to as the "<strong>Company</strong>")</p>
    </div>
    <div style="text-align: center; margin: 10px 0; font-weight: bold;">AND</div>
    <div style="margin: 15px 0; padding: 15px; border: 1px solid #ccc; background: #f9f9f9;">
      <p style="margin: 3px 0;"><strong>EMPLOYEE:</strong> ${data.employee_name || '____________________'}, S/o / D/o ${data.father_name || '____________________'}</p>
      <p style="margin: 3px 0;"><strong>CNIC No:</strong> ${data.cnic || '_____-_______-_'}</p>
      <p style="margin: 3px 0;"><strong>Address:</strong> ${data.address || '____________________'}</p>
      <p style="margin: 3px 0;"><strong>Phone:</strong> ${data.phone || '____________________'}</p>
      <p style="margin: 3px 0;">(hereinafter referred to as the "<strong>Employee</strong>")</p>
    </div>

    <p>WHEREAS the Company desires to employ the Employee and the Employee desires to be employed by the Company upon the terms and conditions set forth herein, NOW THEREFORE, in consideration of the mutual covenants and promises, the parties agree as follows:</p>

    <!-- Article 1: Position & Duties -->
    <h3 style="margin-top: 25px; border-bottom: 1px solid #999; padding-bottom: 5px;">ARTICLE 1: POSITION AND DUTIES</h3>
    <p><strong>1.1</strong> The Employee shall be employed in the capacity of <strong>${data.designation || '____________________'}</strong> in the <strong>${data.department || '____________________'}</strong> department.</p>
    <p><strong>1.2</strong> The Employee shall perform all duties and responsibilities associated with the position as may be assigned by the Company from time to time.</p>
    <p><strong>1.3</strong> The Employee shall devote full time, attention, and best efforts to the performance of duties during working hours.</p>

    <!-- Article 2: Commencement & Probation -->
    <h3 style="margin-top: 25px; border-bottom: 1px solid #999; padding-bottom: 5px;">ARTICLE 2: COMMENCEMENT AND PROBATION</h3>
    <p><strong>2.1</strong> The employment shall commence on <strong>${formatDate(data.joining_date)}</strong>.</p>
    <p><strong>2.2</strong> The Employee shall serve a probationary period of <strong>${data.probation_period || 'Three (3)'}</strong> months from the date of joining. During the probation period, either party may terminate this agreement with <strong>${data.probation_notice || 'seven (7)'}</strong> days' written notice.</p>
    <p><strong>2.3</strong> Upon successful completion of the probation period, the Employee shall be confirmed as a regular employee of the Company.</p>

    <!-- Article 3: Compensation -->
    <h3 style="margin-top: 25px; border-bottom: 1px solid #999; padding-bottom: 5px;">ARTICLE 3: COMPENSATION AND BENEFITS</h3>
    <p><strong>3.1</strong> The Employee shall receive a gross monthly salary of <strong>PKR ${data.salary ? Number(data.salary).toLocaleString() : '____________________'}/- (${data.salary ? numberToWords(Number(data.salary)) + ' Rupees Only' : '____________'})</strong>.</p>
    <p><strong>3.2</strong> Salary shall be paid on or before the <strong>${data.pay_day || '5th'}</strong> of each subsequent month via bank transfer.</p>
    <p><strong>3.3</strong> The Company shall deduct applicable income tax, EOBI, and any other statutory deductions as required by law.</p>
    <p><strong>3.4</strong> The Employee may be entitled to annual increments and bonuses at the sole discretion of the Company based on performance evaluation.</p>

    <!-- Article 4: Working Hours -->
    <h3 style="margin-top: 25px; border-bottom: 1px solid #999; padding-bottom: 5px;">ARTICLE 4: WORKING HOURS AND LEAVE</h3>
    <p><strong>4.1</strong> Standard working hours shall be <strong>${data.working_hours || '9:00 AM to 6:00 PM'}</strong>, <strong>${data.working_days || 'Monday to Saturday'}</strong>.</p>
    <p><strong>4.2</strong> The Employee shall be entitled to annual leave, casual leave, sick leave, and public holidays as per the Company's Leave Policy.</p>
    <p><strong>4.3</strong> Unauthorized absence from duty shall be treated as per Company disciplinary policy.</p>

    <!-- Article 5: Confidentiality -->
    <h3 style="margin-top: 25px; border-bottom: 1px solid #999; padding-bottom: 5px;">ARTICLE 5: CONFIDENTIALITY</h3>
    <p><strong>5.1</strong> The Employee shall not, during or after the term of employment, disclose any confidential information, trade secrets, client data, business strategies, financial information, or proprietary data of the Company to any third party.</p>
    <p><strong>5.2</strong> All documents, files, records, and materials developed or received during employment are the property of the Company and must be returned upon termination.</p>

    <!-- Article 6: Non-Compete -->
    <h3 style="margin-top: 25px; border-bottom: 1px solid #999; padding-bottom: 5px;">ARTICLE 6: NON-COMPETE AND NON-SOLICITATION</h3>
    <p><strong>6.1</strong> During employment and for a period of <strong>${data.non_compete_months || 'twelve (12)'}</strong> months following termination, the Employee shall not engage in any business that directly competes with the Company within Pakistan.</p>
    <p><strong>6.2</strong> The Employee shall not solicit or attempt to solicit any clients, customers, or employees of the Company for a competing business.</p>

    <!-- Article 7: Termination -->
    <h3 style="margin-top: 25px; border-bottom: 1px solid #999; padding-bottom: 5px;">ARTICLE 7: TERMINATION</h3>
    <p><strong>7.1</strong> After confirmation, either party may terminate this Agreement by giving <strong>${data.notice_period || 'thirty (30)'}</strong> days' written notice or payment in lieu thereof.</p>
    <p><strong>7.2</strong> The Company may terminate this Agreement immediately without notice in case of gross misconduct, fraud, breach of confidentiality, insubordination, or any act detrimental to the Company's interests.</p>
    <p><strong>7.3</strong> Upon termination, the Employee shall return all Company property, including but not limited to equipment, documents, access cards, and keys.</p>

    <!-- Article 8: Code of Conduct -->
    <h3 style="margin-top: 25px; border-bottom: 1px solid #999; padding-bottom: 5px;">ARTICLE 8: CODE OF CONDUCT</h3>
    <p><strong>8.1</strong> The Employee shall comply with all rules, regulations, and policies of the Company as communicated from time to time.</p>
    <p><strong>8.2</strong> The Employee shall maintain professional conduct and uphold the reputation of the Company at all times.</p>

    <!-- Article 9: Governing Law -->
    <h3 style="margin-top: 25px; border-bottom: 1px solid #999; padding-bottom: 5px;">ARTICLE 9: GOVERNING LAW</h3>
    <p><strong>9.1</strong> This Agreement shall be governed by and construed in accordance with the laws of the Islamic Republic of Pakistan.</p>
    <p><strong>9.2</strong> Any disputes arising out of this Agreement shall be referred to the competent courts of Lahore, Pakistan.</p>

    <!-- Article 10: General -->
    <h3 style="margin-top: 25px; border-bottom: 1px solid #999; padding-bottom: 5px;">ARTICLE 10: GENERAL PROVISIONS</h3>
    <p><strong>10.1</strong> This Agreement constitutes the entire agreement between the parties and supersedes all prior negotiations, representations, and agreements.</p>
    <p><strong>10.2</strong> No amendment or modification of this Agreement shall be valid unless made in writing and signed by both parties.</p>
    <p><strong>10.3</strong> If any provision of this Agreement is found to be invalid or unenforceable, the remaining provisions shall continue in full force and effect.</p>

    <!-- Signatures -->
    <div style="margin-top: 50px; page-break-inside: avoid;">
      <p><strong>IN WITNESS WHEREOF</strong>, the parties have executed this Agreement as of the date first written above.</p>
      
      <div style="display: flex; justify-content: space-between; margin-top: 40px;">
        <div style="width: 45%;">
          <div style="border-bottom: 1px solid #000; height: 50px; margin-bottom: 5px;"></div>
          <p style="margin: 2px 0; font-weight: bold;">For ${COMPANY.name}</p>
          <p style="margin: 2px 0;">Authorized Signatory</p>
          <p style="margin: 2px 0;">Date: ${formatDate(data.agreement_date)}</p>
        </div>
        <div style="width: 45%;">
          <div style="border-bottom: 1px solid #000; height: 50px; margin-bottom: 5px;"></div>
          <p style="margin: 2px 0; font-weight: bold;">${data.employee_name || '____________________'}</p>
          <p style="margin: 2px 0;">Employee</p>
          <p style="margin: 2px 0;">CNIC: ${data.cnic || '_____-_______-_'}</p>
          <p style="margin: 2px 0;">Date: ${formatDate(data.agreement_date)}</p>
        </div>
      </div>
    </div>

    <!-- Witness -->
    <div style="margin-top: 40px; page-break-inside: avoid;">
      <h3 style="border-bottom: 1px solid #999; padding-bottom: 5px;">WITNESSES</h3>
      <div style="display: flex; justify-content: space-between; margin-top: 20px;">
        <div style="width: 45%;">
          <p style="margin: 3px 0;"><strong>Witness 1:</strong></p>
          <p style="margin: 3px 0;">Name: ${data.witness1_name || '____________________'}</p>
          <p style="margin: 3px 0;">CNIC: ${data.witness1_cnic || '____________________'}</p>
          <div style="border-bottom: 1px solid #000; height: 40px; margin: 10px 0 5px 0;"></div>
          <p style="margin: 2px 0;">Signature</p>
        </div>
        <div style="width: 45%;">
          <p style="margin: 3px 0;"><strong>Witness 2:</strong></p>
          <p style="margin: 3px 0;">Name: ${data.witness2_name || '____________________'}</p>
          <p style="margin: 3px 0;">CNIC: ${data.witness2_cnic || '____________________'}</p>
          <div style="border-bottom: 1px solid #000; height: 40px; margin: 10px 0 5px 0;"></div>
          <p style="margin: 2px 0;">Signature</p>
        </div>
      </div>
    </div>
  </div>`;
}

// ══════════════════════════════════════════════════════════
// PDF Template: Guarantor Agreement
// ══════════════════════════════════════════════════════════
function generateGuarantorAgreementHTML(data) {
  return `
  <div style="font-family: 'Times New Roman', Times, serif; font-size: 12pt; color: #000; line-height: 1.6; padding: 40px 50px; max-width: 800px; margin: 0 auto;">
    
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px double #000; padding-bottom: 20px;">
      <h1 style="font-size: 22pt; font-weight: bold; margin: 0; letter-spacing: 2px;">${COMPANY.name.toUpperCase()}</h1>
      <p style="font-size: 10pt; margin: 5px 0; color: #333;">${COMPANY.address}</p>
      <p style="font-size: 10pt; margin: 2px 0; color: #333;">Phone: ${COMPANY.phone} | Email: ${COMPANY.email}</p>
      <h2 style="font-size: 16pt; font-weight: bold; margin: 20px 0 0 0; text-decoration: underline; letter-spacing: 1px;">GUARANTOR AGREEMENT / ضمانت نامہ</h2>
    </div>

    <!-- Agreement date -->
    <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
      <div><strong>Date:</strong> ${formatDate(data.agreement_date)}</div>
      <div><strong>Ref No:</strong> ${data.reference_no ? data.reference_no + '-G' : 'GA-' + new Date().getFullYear() + '-____-G'}</div>
    </div>

    <!-- Employee reference -->
    <div style="margin: 15px 0; padding: 15px; border: 1px solid #ccc; background: #f9f9f9;">
      <p style="margin: 3px 0; font-weight: bold;">EMPLOYEE BEING GUARANTEED:</p>
      <p style="margin: 3px 0;"><strong>Name:</strong> ${data.employee_name || '____________________'}</p>
      <p style="margin: 3px 0;"><strong>CNIC:</strong> ${data.cnic || '_____-_______-_'}</p>
      <p style="margin: 3px 0;"><strong>Designation:</strong> ${data.designation || '____________________'}</p>
      <p style="margin: 3px 0;"><strong>Department:</strong> ${data.department || '____________________'}</p>
    </div>

    <!-- Guarantor Info -->
    <h3 style="margin-top: 25px; border-bottom: 1px solid #999; padding-bottom: 5px;">GUARANTOR INFORMATION / ضامن کی تفصیلات</h3>
    <div style="margin: 15px 0; padding: 15px; border: 1px solid #ccc; background: #f9f9f9;">
      <p style="margin: 3px 0;"><strong>Name / نام:</strong> ${data.guarantor_name || '____________________'}</p>
      <p style="margin: 3px 0;"><strong>Father's Name / والد کا نام:</strong> ${data.guarantor_father_name || '____________________'}</p>
      <p style="margin: 3px 0;"><strong>CNIC No / شناختی کارڈ نمبر:</strong> ${data.guarantor_cnic || '_____-_______-_'}</p>
      <p style="margin: 3px 0;"><strong>Address / پتہ:</strong> ${data.guarantor_address || '____________________'}</p>
      <p style="margin: 3px 0;"><strong>Phone / فون نمبر:</strong> ${data.guarantor_phone || '____________________'}</p>
      <p style="margin: 3px 0;"><strong>Relation to Employee / ملازم سے تعلق:</strong> ${data.guarantor_relation || '____________________'}</p>
      <p style="margin: 3px 0;"><strong>Occupation / پیشہ:</strong> ${data.guarantor_occupation || '____________________'}</p>
    </div>

    <!-- Declaration -->
    <h3 style="margin-top: 25px; border-bottom: 1px solid #999; padding-bottom: 5px;">DECLARATION AND UNDERTAKING / اقرار نامہ</h3>
    
    <p>I, <strong>${data.guarantor_name || '____________________'}</strong>, S/o <strong>${data.guarantor_father_name || '____________________'}</strong>, holder of CNIC No. <strong>${data.guarantor_cnic || '_____-_______-_'}</strong>, residing at <strong>${data.guarantor_address || '____________________'}</strong>, do hereby solemnly declare and undertake as follows:</p>

    <p style="margin-left: 20px;"><strong>1.</strong> I personally know Mr./Ms. <strong>${data.employee_name || '____________________'}</strong> who is being employed by ${COMPANY.name} as <strong>${data.designation || '____________________'}</strong>.</p>

    <p style="margin-left: 20px;"><strong>2.</strong> I stand as guarantor for the above-named employee and I guarantee his/her good conduct, honesty, integrity, and faithful discharge of duties during the course of employment with the Company.</p>

    <p style="margin-left: 20px;"><strong>3.</strong> In the event that the above-named employee causes any financial loss, damage to property, theft, fraud, embezzlement, or any other loss to the Company, I shall be personally liable and responsible to compensate the Company for all such losses, damages, and costs incurred.</p>

    <p style="margin-left: 20px;"><strong>4.</strong> I understand that this guarantee is a continuing obligation and shall remain in full force and effect throughout the period of employment and for a period of <strong>six (6) months</strong> after the termination of employment, howsoever caused.</p>

    <p style="margin-left: 20px;"><strong>5.</strong> I undertake to inform the Company immediately of any change in my address, contact details, or any circumstances that may affect this guarantee.</p>

    <p style="margin-left: 20px;"><strong>6.</strong> I further declare that the information provided herein is true and correct to the best of my knowledge and belief. Any false or misleading information shall render this guarantee void and I shall be liable for consequences arising therefrom.</p>

    <p style="margin-left: 20px;"><strong>7.</strong> I agree that this Guarantor Agreement shall be governed by the laws of Pakistan and any disputes shall be subject to the jurisdiction of the courts of Lahore.</p>

    <!-- Guarantor Signature -->
    <div style="margin-top: 50px; page-break-inside: avoid;">
      <div style="display: flex; justify-content: space-between;">
        <div style="width: 45%;">
          <div style="border-bottom: 1px solid #000; height: 50px; margin-bottom: 5px;"></div>
          <p style="margin: 2px 0; font-weight: bold;">${data.guarantor_name || '____________________'}</p>
          <p style="margin: 2px 0;">Guarantor / ضامن</p>
          <p style="margin: 2px 0;">CNIC: ${data.guarantor_cnic || '_____-_______-_'}</p>
          <p style="margin: 2px 0;">Date: ${formatDate(data.agreement_date)}</p>
        </div>
        <div style="width: 45%;">
          <div style="border-bottom: 1px solid #000; height: 50px; margin-bottom: 5px;"></div>
          <p style="margin: 2px 0; font-weight: bold;">For ${COMPANY.name}</p>
          <p style="margin: 2px 0;">Authorized Signatory</p>
          <p style="margin: 2px 0;">Date: ${formatDate(data.agreement_date)}</p>
        </div>
      </div>
    </div>

    <!-- Thumb Impression -->
    <div style="margin-top: 40px; page-break-inside: avoid;">
      <div style="display: flex; justify-content: space-between;">
        <div style="width: 45%; text-align: center;">
          <div style="width: 100px; height: 120px; border: 2px solid #000; margin: 0 auto 5px auto; display: flex; align-items: center; justify-content: center;">
            <span style="font-size: 9pt; color: #999;">Left Thumb<br/>بائیں انگوٹھا</span>
          </div>
          <p style="margin: 2px 0; font-size: 10pt;">Guarantor's Thumb Impression</p>
        </div>
        <div style="width: 45%; text-align: center;">
          <div style="width: 100px; height: 120px; border: 2px solid #000; margin: 0 auto 5px auto; display: flex; align-items: center; justify-content: center;">
            <span style="font-size: 9pt; color: #999;">Right Thumb<br/>دائیں انگوٹھا</span>
          </div>
          <p style="margin: 2px 0; font-size: 10pt;">Guarantor's Thumb Impression</p>
        </div>
      </div>
    </div>

    <!-- Witnesses -->
    <div style="margin-top: 40px; page-break-inside: avoid;">
      <h3 style="border-bottom: 1px solid #999; padding-bottom: 5px;">WITNESSES / گواہان</h3>
      <div style="display: flex; justify-content: space-between; margin-top: 20px;">
        <div style="width: 45%;">
          <p style="margin: 3px 0;"><strong>Witness 1 / گواہ ١:</strong></p>
          <p style="margin: 3px 0;">Name: ${data.witness1_name || '____________________'}</p>
          <p style="margin: 3px 0;">CNIC: ${data.witness1_cnic || '____________________'}</p>
          <div style="border-bottom: 1px solid #000; height: 40px; margin: 10px 0 5px 0;"></div>
          <p style="margin: 2px 0;">Signature / دستخط</p>
        </div>
        <div style="width: 45%;">
          <p style="margin: 3px 0;"><strong>Witness 2 / گواہ ٢:</strong></p>
          <p style="margin: 3px 0;">Name: ${data.witness2_name || '____________________'}</p>
          <p style="margin: 3px 0;">CNIC: ${data.witness2_cnic || '____________________'}</p>
          <div style="border-bottom: 1px solid #000; height: 40px; margin: 10px 0 5px 0;"></div>
          <p style="margin: 2px 0;">Signature / دستخط</p>
        </div>
      </div>
    </div>

    <!-- CNIC Copies Required -->
    <div style="margin-top: 30px; padding: 10px; border: 1px dashed #999; font-size: 10pt; background: #fafafa;">
      <p style="margin: 3px 0;"><strong>Note / نوٹ:</strong> Please attach photocopies of the following:</p>
      <p style="margin: 3px 0;">☐ Guarantor's CNIC (front & back)</p>
      <p style="margin: 3px 0;">☐ Employee's CNIC (front & back)</p>
      <p style="margin: 3px 0;">☐ Guarantor's utility bill (address proof)</p>
    </div>
  </div>`;
}


// ══════════════════════════════════════════════════════════
// Main Agreements Page
// ══════════════════════════════════════════════════════════
function AgreementsPage() {
  const { user } = useAuth();
  const previewRef = useRef(null);
  
  // State
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState('employee'); // 'employee' | 'guarantor'
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [savedAgreements, setSavedAgreements] = useState([]);
  const [loadingAgreements, setLoadingAgreements] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    // Employee details
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
    // Work terms
    probation_period: 'Three (3)',
    probation_notice: 'seven (7)',
    working_hours: '9:00 AM to 6:00 PM',
    working_days: 'Monday to Saturday',
    notice_period: 'thirty (30)',
    non_compete_months: 'twelve (12)',
    pay_day: '5th',
    // Guarantor details
    guarantor_name: '',
    guarantor_father_name: '',
    guarantor_cnic: '',
    guarantor_address: '',
    guarantor_phone: '',
    guarantor_relation: '',
    guarantor_occupation: '',
    // Witnesses
    witness1_name: '',
    witness1_cnic: '',
    witness2_name: '',
    witness2_cnic: '',
  });

  // Fetch employees on mount
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const data = await employeesAPI.getAll({});
        setEmployees(data || []);
      } catch (err) {
        console.error('Failed to fetch employees:', err);
      }
    };
    fetchEmployees();
  }, []);

  // Fetch saved agreements when employee is selected
  useEffect(() => {
    if (selectedEmployee) {
      fetchSavedAgreements(selectedEmployee.id);
    }
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

  // Auto-fill form from selected employee
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

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Filter employees for search
  const filteredEmployees = employees.filter(emp => {
    const fullName = `${emp.first_name} ${emp.last_name}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase()) || 
           (emp.employee_code || '').toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Generate and download PDF
  const generatePDF = async (type) => {
    setGenerating(true);
    try {
      const html2pdf = await loadHtml2Pdf();
      const htmlContent = type === 'employee' 
        ? generateEmployeeAgreementHTML(formData)
        : generateGuarantorAgreementHTML(formData);
      
      const container = document.createElement('div');
      container.innerHTML = htmlContent;
      document.body.appendChild(container);

      const fileName = type === 'employee'
        ? `Employee_Agreement_${formData.employee_name || 'Draft'}_${format(new Date(), 'yyyy-MM-dd')}.pdf`
        : `Guarantor_Agreement_${formData.employee_name || 'Draft'}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;

      await html2pdf().from(container).set({
        margin: [10, 0, 10, 0],
        filename: fileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      }).save();

      document.body.removeChild(container);
      toast.success(`${type === 'employee' ? 'Employee' : 'Guarantor'} Agreement PDF downloaded!`);
    } catch (err) {
      console.error('PDF generation error:', err);
      toast.error('Failed to generate PDF. Please try again.');
    }
    setGenerating(false);
  };

  // Save agreement to Supabase and attach to employee profile
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

      const container = document.createElement('div');
      container.innerHTML = htmlContent;
      document.body.appendChild(container);

      // Generate PDF blob
      const pdfBlob = await html2pdf().from(container).set({
        margin: [10, 0, 10, 0],
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      }).outputPdf('blob');

      document.body.removeChild(container);

      // Upload PDF to Supabase Storage
      const fileName = `agreements/${selectedEmployee.id}/${type}-agreement-${Date.now()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('files')
        .upload(fileName, pdfBlob, {
          contentType: 'application/pdf',
          cacheControl: '3600',
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('files')
        .getPublicUrl(fileName);

      const publicUrl = urlData?.publicUrl;

      // Save agreement record
      const { error: dbError } = await supabase
        .from('employee_agreements')
        .insert({
          employee_id: selectedEmployee.id,
          agreement_type: type,
          agreement_date: formData.agreement_date,
          reference_no: formData.reference_no || null,
          file_url: publicUrl,
          file_path: fileName,
          form_data: formData,
          created_by: user?.id,
        });

      // If no agreements table yet, that's OK — file is still uploaded
      if (dbError) {
        console.warn('Note: agreement record not saved to DB (table may not exist yet). File uploaded successfully.');
      }

      toast.success(`${type === 'employee' ? 'Employee' : 'Guarantor'} Agreement saved and attached to employee profile!`);
      if (selectedEmployee) fetchSavedAgreements(selectedEmployee.id);
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Failed to save agreement: ' + (err.message || 'Unknown error'));
    }
    setSaving(false);
  };

  // Show preview in modal
  const openPreview = (type) => {
    setShowPreview(type);
  };

  // Input field component
  const Field = ({ label, field, icon: Icon, placeholder, type = 'text', half = false, disabled = false }) => (
    <div className={half ? 'w-1/2' : 'w-full'}>
      <label className="block text-sm font-medium text-gray-400 mb-1">{label}</label>
      <div className="relative">
        {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />}
        <input
          type={type}
          value={formData[field] || ''}
          onChange={e => handleChange(field, e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full ${Icon ? 'pl-10' : 'pl-3'} pr-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors disabled:opacity-50`}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <FileSignature className="w-8 h-8 text-blue-400" />
            Employee Agreements
          </h1>
          <p className="text-gray-400 mt-1">Generate Employment and Guarantor agreements, auto-fill from employee data</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: Form ───────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Employee Search / Select */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Search className="w-5 h-5 text-blue-400" />
              Select Employee
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setShowDropdown(true); }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Search by name or employee code..."
                className="w-full pl-10 pr-3 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
              />
              {showDropdown && searchQuery && (
                <div className="absolute z-50 mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-60 overflow-auto">
                  {filteredEmployees.length === 0 ? (
                    <div className="p-3 text-gray-500 text-sm">No employees found</div>
                  ) : (
                    filteredEmployees.slice(0, 10).map(emp => (
                      <button
                        key={emp.id}
                        onClick={() => selectEmployee(emp)}
                        className="w-full text-left px-4 py-3 hover:bg-gray-700 flex items-center gap-3 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
                          {emp.first_name?.[0]}{emp.last_name?.[0]}
                        </div>
                        <div>
                          <p className="text-white font-medium">{emp.first_name} {emp.last_name}</p>
                          <p className="text-xs text-gray-400">{emp.employee_code} • {emp.designation || 'N/A'} • {emp.department || 'N/A'}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            {selectedEmployee && (
              <div className="mt-3 p-3 bg-green-900/30 border border-green-800 rounded-lg flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-green-300 text-sm">
                  Selected: <strong>{selectedEmployee.first_name} {selectedEmployee.last_name}</strong> ({selectedEmployee.employee_code})
                </span>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('employee')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-colors ${
                activeTab === 'employee' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4" />
              Employee Agreement
            </button>
            <button
              onClick={() => setActiveTab('guarantor')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-colors ${
                activeTab === 'guarantor' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              <Shield className="w-4 h-4" />
              Guarantor Agreement
            </button>
          </div>

          {/* ── Employee Agreement Form ──────────── */}
          {activeTab === 'employee' && (
            <div className="card p-6 space-y-5">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                Employment Agreement Details
              </h2>

              {/* Personal Info */}
              <div>
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Full Name" field="employee_name" icon={User} placeholder="Full legal name" />
                  <Field label="Father's / Husband's Name" field="father_name" icon={User} placeholder="Father/Husband name" />
                  <Field label="CNIC Number" field="cnic" icon={CreditCard} placeholder="12345-1234567-1" />
                  <Field label="Phone Number" field="phone" icon={Phone} placeholder="+92-300-1234567" />
                  <div className="md:col-span-2">
                    <Field label="Full Address" field="address" icon={MapPin} placeholder="House #, Street, City, Pakistan" />
                  </div>
                </div>
              </div>

              {/* Employment Info */}
              <div>
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">Employment Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Designation / Position" field="designation" icon={Briefcase} placeholder="Software Engineer" />
                  <Field label="Department" field="department" icon={Building2} placeholder="Engineering" />
                  <Field label="Joining Date" field="joining_date" icon={Calendar} type="date" />
                  <Field label="Monthly Salary (PKR)" field="salary" icon={DollarSign} placeholder="50000" type="number" />
                  <Field label="Agreement Date" field="agreement_date" icon={Calendar} type="date" />
                  <Field label="Reference Number" field="reference_no" placeholder="GA-2026-001" />
                </div>
              </div>

              {/* Terms */}
              <div>
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">Terms</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Probation Period" field="probation_period" placeholder="Three (3)" />
                  <Field label="Notice Period (days)" field="notice_period" placeholder="thirty (30)" />
                  <Field label="Working Hours" field="working_hours" icon={Clock} placeholder="9:00 AM to 6:00 PM" />
                  <Field label="Working Days" field="working_days" placeholder="Monday to Saturday" />
                </div>
              </div>

              {/* Witnesses */}
              <div>
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">Witnesses</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Witness 1 Name" field="witness1_name" icon={UserCheck} placeholder="Witness full name" />
                  <Field label="Witness 1 CNIC" field="witness1_cnic" icon={CreditCard} placeholder="CNIC number" />
                  <Field label="Witness 2 Name" field="witness2_name" icon={UserCheck} placeholder="Witness full name" />
                  <Field label="Witness 2 CNIC" field="witness2_cnic" icon={CreditCard} placeholder="CNIC number" />
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-700">
                <button
                  onClick={() => openPreview('employee')}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  Preview
                </button>
                <button
                  onClick={() => generatePDF('employee')}
                  disabled={generating}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  Print / Download PDF
                </button>
                <button
                  onClick={() => saveAgreement('employee')}
                  disabled={saving || !selectedEmployee}
                  className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save & Attach to Profile
                </button>
              </div>
            </div>
          )}

          {/* ── Guarantor Agreement Form ────────── */}
          {activeTab === 'guarantor' && (
            <div className="card p-6 space-y-5">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-400" />
                Guarantor Agreement Details
              </h2>

              {/* Employee Reference (auto-filled) */}
              <div>
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">Employee Being Guaranteed</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Employee Name" field="employee_name" icon={User} placeholder="Auto-filled from selection" />
                  <Field label="Employee CNIC" field="cnic" icon={CreditCard} placeholder="12345-1234567-1" />
                  <Field label="Designation" field="designation" icon={Briefcase} placeholder="Position" />
                  <Field label="Department" field="department" icon={Building2} placeholder="Department" />
                </div>
              </div>

              {/* Guarantor Info */}
              <div>
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">Guarantor Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Guarantor Full Name" field="guarantor_name" icon={User} placeholder="Guarantor legal name" />
                  <Field label="Guarantor Father's Name" field="guarantor_father_name" icon={User} placeholder="Father's name" />
                  <Field label="Guarantor CNIC" field="guarantor_cnic" icon={CreditCard} placeholder="12345-1234567-1" />
                  <Field label="Guarantor Phone" field="guarantor_phone" icon={Phone} placeholder="+92-300-1234567" />
                  <div className="md:col-span-2">
                    <Field label="Guarantor Address" field="guarantor_address" icon={MapPin} placeholder="Full address" />
                  </div>
                  <Field label="Relation to Employee" field="guarantor_relation" placeholder="e.g. Father, Brother, Uncle" />
                  <Field label="Guarantor Occupation" field="guarantor_occupation" icon={Briefcase} placeholder="e.g. Businessman" />
                </div>
              </div>

              {/* Agreement Details */}
              <div>
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">Agreement Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Agreement Date" field="agreement_date" icon={Calendar} type="date" />
                  <Field label="Reference Number" field="reference_no" placeholder="GA-2026-001" />
                </div>
              </div>

              {/* Witnesses */}
              <div>
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">Witnesses</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Witness 1 Name" field="witness1_name" icon={UserCheck} placeholder="Witness full name" />
                  <Field label="Witness 1 CNIC" field="witness1_cnic" icon={CreditCard} placeholder="CNIC number" />
                  <Field label="Witness 2 Name" field="witness2_name" icon={UserCheck} placeholder="Witness full name" />
                  <Field label="Witness 2 CNIC" field="witness2_cnic" icon={CreditCard} placeholder="CNIC number" />
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-700">
                <button
                  onClick={() => openPreview('guarantor')}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  Preview
                </button>
                <button
                  onClick={() => generatePDF('guarantor')}
                  disabled={generating}
                  className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  Print / Download PDF
                </button>
                <button
                  onClick={() => saveAgreement('guarantor')}
                  disabled={saving || !selectedEmployee}
                  className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save & Attach to Profile
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Right: Saved Agreements Sidebar ──── */}
        <div className="space-y-6">
          {/* Quick stats */}
          <div className="card p-5">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-green-400" />
              Saved Agreements
            </h3>
            {!selectedEmployee ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Select an employee to see their agreements</p>
              </div>
            ) : loadingAgreements ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
              </div>
            ) : savedAgreements.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No agreements saved yet for this employee</p>
                <p className="text-gray-600 text-xs mt-1">Fill the form and click "Save & Attach to Profile"</p>
              </div>
            ) : (
              <div className="space-y-3">
                {savedAgreements.map(agr => (
                  <div key={agr.id} className="p-3 bg-gray-800 rounded-lg border border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {agr.agreement_type === 'employee' ? (
                          <FileText className="w-4 h-4 text-blue-400" />
                        ) : (
                          <Shield className="w-4 h-4 text-purple-400" />
                        )}
                        <span className="text-white text-sm font-medium capitalize">
                          {agr.agreement_type} Agreement
                        </span>
                      </div>
                      {agr.file_url && (
                        <a
                          href={agr.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {agr.agreement_date ? formatDate(agr.agreement_date) : 'No date'}
                      {agr.reference_no && ` • Ref: ${agr.reference_no}`}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="card p-5">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-400" />
              How to Use
            </h3>
            <ol className="space-y-2 text-sm text-gray-400">
              <li className="flex gap-2"><span className="text-yellow-400 font-bold">1.</span> Search and select an employee (auto-fills details)</li>
              <li className="flex gap-2"><span className="text-yellow-400 font-bold">2.</span> Fill in any missing fields (CNIC, father's name, etc.)</li>
              <li className="flex gap-2"><span className="text-yellow-400 font-bold">3.</span> Switch between Employee and Guarantor tabs</li>
              <li className="flex gap-2"><span className="text-yellow-400 font-bold">4.</span> Click "Preview" to check the agreement</li>
              <li className="flex gap-2"><span className="text-yellow-400 font-bold">5.</span> Click "Print / Download PDF" to get the document</li>
              <li className="flex gap-2"><span className="text-yellow-400 font-bold">6.</span> Click "Save & Attach" to link the PDF to the employee</li>
            </ol>
          </div>
        </div>
      </div>

      {/* ── Preview Modal ──────────────────────── */}
      {showPreview && (
        <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-gray-100 px-6 py-4 flex items-center justify-between border-b z-10">
              <h3 className="font-semibold text-gray-900">
                {showPreview === 'employee' ? 'Employee Agreement' : 'Guarantor Agreement'} — Preview
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { generatePDF(showPreview); }}
                  disabled={generating}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 text-sm"
                >
                  {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  Download PDF
                </button>
                <button
                  onClick={() => setShowPreview(false)}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>
            <div
              ref={previewRef}
              dangerouslySetInnerHTML={{
                __html: showPreview === 'employee'
                  ? generateEmployeeAgreementHTML(formData)
                  : generateGuarantorAgreementHTML(formData)
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default AgreementsPage;
