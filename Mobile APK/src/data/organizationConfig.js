/**
 * Guardian Dental Billing - Organization Configuration
 * Defines all departments, roles, and positions for the ERP system
 */

// ========================================
// DEPARTMENTS
// ========================================
export const DEPARTMENTS = {
  C_CLASS: {
    id: 'c_class',
    name: 'C-Class Executive',
    description: 'Chief Executive Officers, Managing Directors, and General Managers',
    color: 'gold',
  },
  OPERATIONS: {
    id: 'operations',
    name: 'Operations',
    description: 'The Core RCM Engine - 98% clean claims rate',
    color: 'blue',
  },
  MARKETING: {
    id: 'marketing',
    name: 'Marketing & Lead Generation',
    description: 'Scaling and acquiring high-value dental practices',
    color: 'purple',
  },
  HR: {
    id: 'hr',
    name: 'HR & People Operations',
    description: 'Talent management and performance',
    color: 'green',
  },
  FINANCE: {
    id: 'finance',
    name: 'Accounts & Finance',
    description: 'Cash flow, payroll, and client billing',
    color: 'yellow',
  },
  DESIGN_DEV: {
    id: 'design_dev',
    name: 'Design & Development',
    description: 'Building Guardian ERP and web presence',
    color: 'cyan',
  },
  ADMIN: {
    id: 'admin',
    name: 'Administration & Facilities',
    description: 'Essential support staff',
    color: 'gray',
  },
};

// Array format for dropdowns
export const DEPARTMENT_LIST = [
  { value: 'c_class', label: 'C-Class Executive', color: 'gold' },
  { value: 'operations', label: 'Operations', color: 'blue' },
  { value: 'marketing', label: 'Marketing & Lead Generation', color: 'purple' },
  { value: 'hr', label: 'HR & People Operations', color: 'green' },
  { value: 'finance', label: 'Accounts & Finance', color: 'yellow' },
  { value: 'design_dev', label: 'Design & Development', color: 'cyan' },
  { value: 'admin', label: 'Administration & Facilities', color: 'gray' },
];

// ========================================
// POSITIONS/ROLES BY DEPARTMENT
// ========================================
export const POSITIONS = {
  // C-Class Executive Department
  c_class: [
    { value: 'ceo', label: 'Chief Executive Officer (CEO)', level: 'executive' },
    { value: 'coo', label: 'Chief Operating Officer (COO)', level: 'executive' },
    { value: 'cfo', label: 'Chief Financial Officer (CFO)', level: 'executive' },
    { value: 'cto', label: 'Chief Technology Officer (CTO)', level: 'executive' },
    { value: 'cmo', label: 'Chief Marketing Officer (CMO)', level: 'executive' },
    { value: 'chro', label: 'Chief Human Resources Officer (CHRO)', level: 'executive' },
    { value: 'md', label: 'Managing Director (MD)', level: 'executive' },
    { value: 'gm', label: 'General Manager (GM)', level: 'executive' },
    { value: 'avp', label: 'Associate Vice President (AVP)', level: 'executive' },
    { value: 'vp', label: 'Vice President (VP)', level: 'executive' },
    { value: 'svp', label: 'Senior Vice President (SVP)', level: 'executive' },
    { value: 'director', label: 'Director', level: 'executive' },
  ],

  // Operations Department
  operations: [
    // Leadership
    { value: 'assistant_manager', label: 'Assistant Manager', level: 'leadership' },
    // Supervisory
    { value: 'billing_supervisor', label: 'Billing Supervisor', level: 'supervisory' },
    { value: 'ar_supervisor', label: 'Supervisor AR', level: 'supervisory' },
    { value: 'bob_supervisor', label: 'Supervisor BOB', level: 'supervisory' },
    // Management
    { value: 'billing_manager', label: 'Billing Manager', level: 'management' },
    // Specialized Roles
    { value: 'ar_specialist', label: 'Dental Biller (AR Specialist)', level: 'specialist' },
    { value: 'bob_specialist', label: 'Dental Biller (BOB - Book of Business)', level: 'specialist' },
    { value: 'credentialing_expert', label: 'Credentialing Expert', level: 'specialist' },
    { value: 'ppo_negotiator', label: 'PPO Negotiator', level: 'specialist' },
  ],

  // Marketing & Lead Generation
  marketing: [
    // Outreach Team
    { value: 'cold_caller', label: 'Cold Caller', level: 'outreach' },
    { value: 'cold_email_specialist', label: 'Cold Email Specialist', level: 'outreach' },
    { value: 'social_media_specialist', label: 'Social Media Reachout Specialist', level: 'outreach' },
    // Lead Management
    { value: 'inbound_caller', label: 'Caller (Inbound)', level: 'lead_mgmt' },
    { value: 'outbound_caller', label: 'Caller (Outbound)', level: 'lead_mgmt' },
  ],

  // HR & People Operations
  hr: [
    // HR Leadership
    { value: 'hr_manager', label: 'HR Manager', level: 'leadership' },
    // HR Oversight
    { value: 'hr_supervisor', label: 'HR Supervisor', level: 'supervisory' },
    // Administrative
    { value: 'hr_clerk', label: 'HR Clerk', level: 'administrative' },
  ],

  // Accounts & Finance
  finance: [
    // Financial Leadership
    { value: 'account_manager', label: 'Account Manager', level: 'leadership' },
    // Audit/Oversight
    { value: 'account_supervisor', label: 'Account Supervisor', level: 'supervisory' },
    // Bookkeeping
    { value: 'accountant_clerk', label: 'Accountant Clerk', level: 'bookkeeping' },
  ],

  // Design & Development
  design_dev: [
    // Creative
    { value: 'video_editor', label: 'Video Editor', level: 'creative' },
    { value: 'graphic_designer', label: 'Graphic Designer', level: 'creative' },
    // Editorial
    { value: 'content_writer', label: 'Content Writer (SEO & Articles)', level: 'editorial' },
    // Technical
    { value: 'software_developer', label: 'Software Developer', level: 'technical' },
    { value: 'engineer', label: 'Engineer', level: 'technical' },
  ],

  // Administration & Facilities
  admin: [
    // Physical Security
    { value: 'security_guard', label: 'Security Guard', level: 'security' },
    // Facility Care
    { value: 'sweeper', label: 'Sweeper', level: 'facilities' },
    // Culinary
    { value: 'cook', label: 'Cook', level: 'culinary' },
  ],
};

// Flat list of all positions for search/filter
export const ALL_POSITIONS = Object.values(POSITIONS).flat();

// ========================================
// SYSTEM ROLES (for permissions)
// ========================================
export const SYSTEM_ROLES = [
  { value: 'super_admin', label: 'Super Admin', description: 'Full system access' },
  { value: 'admin', label: 'Admin', description: 'Administrative access' },
  { value: 'manager', label: 'Manager', description: 'Department management' },
  { value: 'supervisor', label: 'Supervisor', description: 'Team supervision' },
  { value: 'employee', label: 'Employee', description: 'Standard access' },
  { value: 'guest', label: 'Guest', description: 'Limited read-only access' },
];

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Get positions by department
 */
export const getPositionsByDepartment = (departmentId) => {
  return POSITIONS[departmentId] || [];
};

/**
 * Get department color class
 */
export const getDepartmentColor = (departmentId) => {
  const colors = {
    c_class: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    operations: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    marketing: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    hr: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    finance: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    design_dev: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
    admin: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  };
  return colors[departmentId] || colors.admin;
};

/**
 * Get position label by value
 */
export const getPositionLabel = (positionValue) => {
  const position = ALL_POSITIONS.find(p => p.value === positionValue);
  return position?.label || positionValue;
};

/**
 * Get department label by value
 */
export const getDepartmentLabel = (departmentId) => {
  const dept = DEPARTMENT_LIST.find(d => d.value === departmentId);
  return dept?.label || departmentId;
};

/**
 * Get system role label by value
 */
export const getSystemRoleLabel = (roleValue) => {
  const role = SYSTEM_ROLES.find(r => r.value === roleValue);
  return role?.label || roleValue;
};

/**
 * Get system role badge color
 */
export const getSystemRoleColor = (roleValue) => {
  const colors = {
    super_admin: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    manager: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    supervisor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
    employee: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    guest: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  };
  return colors[roleValue] || colors.employee;
};

/**
 * Format user display with position and department
 */
export const formatUserDisplay = (user, options = {}) => {
  const { showDepartment = true, showPosition = true, compact = false } = options;
  
  const name = user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.name || 'Unknown';
  const position = user?.designation || user?.role || '';
  const department = user?.department || '';
  
  if (compact) {
    return {
      name,
      subtitle: position || department || '',
    };
  }
  
  const parts = [name];
  if (showPosition && position) {
    parts.push(getPositionLabel(position));
  }
  if (showDepartment && department) {
    parts.push(getDepartmentLabel(department));
  }
  
  return {
    name,
    position: showPosition ? getPositionLabel(position) : '',
    department: showDepartment ? getDepartmentLabel(department) : '',
    full: parts.join(' • '),
  };
};

export default {
  DEPARTMENTS,
  DEPARTMENT_LIST,
  POSITIONS,
  ALL_POSITIONS,
  SYSTEM_ROLES,
  getPositionsByDepartment,
  getDepartmentColor,
  getPositionLabel,
  getDepartmentLabel,
  getSystemRoleLabel,
  getSystemRoleColor,
  formatUserDisplay,
};
