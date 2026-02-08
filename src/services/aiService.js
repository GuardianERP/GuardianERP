/**
 * Guardian Desktop ERP - AI Service
 * Handles AI-powered features including chat, suggestions, and data analysis
 */

// AI Response Types
export const AI_RESPONSE_TYPES = {
  TEXT: 'text',
  SUGGESTION: 'suggestion',
  ACTION: 'action',
  CHART: 'chart',
  TABLE: 'table',
  ERROR: 'error',
};

// AI Intent Categories
export const AI_INTENTS = {
  QUERY: 'query',
  ACTION: 'action',
  REPORT: 'report',
  HELP: 'help',
  NAVIGATION: 'navigation',
  CALCULATION: 'calculation',
};

// Predefined AI Commands
const AI_COMMANDS = {
  // Employee related
  'show employees': { intent: AI_INTENTS.NAVIGATION, target: '/employees' },
  'list employees': { intent: AI_INTENTS.QUERY, type: 'employees' },
  'total employees': { intent: AI_INTENTS.CALCULATION, type: 'employee_count' },
  
  // Attendance related
  'show attendance': { intent: AI_INTENTS.NAVIGATION, target: '/attendance' },
  'attendance summary': { intent: AI_INTENTS.REPORT, type: 'attendance' },
  'who is absent today': { intent: AI_INTENTS.QUERY, type: 'absent_today' },
  
  // Task related
  'show tasks': { intent: AI_INTENTS.NAVIGATION, target: '/tasks' },
  'pending tasks': { intent: AI_INTENTS.QUERY, type: 'pending_tasks' },
  'overdue tasks': { intent: AI_INTENTS.QUERY, type: 'overdue_tasks' },
  
  // Financial
  'show expenses': { intent: AI_INTENTS.NAVIGATION, target: '/expenses' },
  'show revenue': { intent: AI_INTENTS.NAVIGATION, target: '/revenue' },
  'financial summary': { intent: AI_INTENTS.REPORT, type: 'financial' },
  'monthly expenses': { intent: AI_INTENTS.QUERY, type: 'monthly_expenses' },
  
  // Leaves
  'show leaves': { intent: AI_INTENTS.NAVIGATION, target: '/leaves' },
  'pending leaves': { intent: AI_INTENTS.QUERY, type: 'pending_leaves' },
  'leave balance': { intent: AI_INTENTS.QUERY, type: 'leave_balance' },
  
  // Reports
  'generate report': { intent: AI_INTENTS.REPORT, type: 'general' },
  'show reports': { intent: AI_INTENTS.NAVIGATION, target: '/reports' },
  
  // Help
  'help': { intent: AI_INTENTS.HELP, type: 'general' },
  'what can you do': { intent: AI_INTENTS.HELP, type: 'capabilities' },
};

// Quick Actions available for AI
export const AI_QUICK_ACTIONS = [
  { id: 'add_employee', label: 'Add New Employee', icon: 'UserPlus', command: 'add new employee' },
  { id: 'view_dashboard', label: 'View Dashboard', icon: 'LayoutDashboard', command: 'show dashboard' },
  { id: 'check_attendance', label: 'Check Attendance', icon: 'Clock', command: 'show attendance' },
  { id: 'pending_tasks', label: 'View Pending Tasks', icon: 'CheckSquare', command: 'show pending tasks' },
  { id: 'pending_leaves', label: 'Pending Leaves', icon: 'Calendar', command: 'show pending leaves' },
  { id: 'expense_report', label: 'Expense Report', icon: 'Receipt', command: 'show expenses' },
  { id: 'revenue_overview', label: 'Revenue Overview', icon: 'DollarSign', command: 'show revenue' },
  { id: 'generate_report', label: 'Generate Report', icon: 'BarChart', command: 'generate report' },
];

// Sample responses for different intents
const generateResponse = (intent, data = {}) => {
  switch (intent) {
    case 'employee_count':
      return {
        type: AI_RESPONSE_TYPES.TEXT,
        message: `There are currently ${data.count || 125} employees in the organization.`,
        suggestions: ['Show employee list', 'View department breakdown', 'Show recent hires'],
      };
    
    case 'attendance':
      return {
        type: AI_RESPONSE_TYPES.TABLE,
        message: 'Here is today\'s attendance summary:',
        data: {
          headers: ['Status', 'Count', 'Percentage'],
          rows: [
            ['Present', '98', '78.4%'],
            ['Absent', '15', '12%'],
            ['On Leave', '8', '6.4%'],
            ['Late', '4', '3.2%'],
          ],
        },
        suggestions: ['View detailed report', 'Export to PDF', 'Show late arrivals'],
      };
    
    case 'pending_tasks':
      return {
        type: AI_RESPONSE_TYPES.TEXT,
        message: `You have ${data.count || 12} pending tasks. ${data.urgent || 3} are marked as urgent.`,
        suggestions: ['Show task list', 'View urgent tasks', 'Create new task'],
      };
    
    case 'financial':
      return {
        type: AI_RESPONSE_TYPES.CHART,
        message: 'Here is your financial overview for this month:',
        data: {
          revenue: 250000,
          expenses: 180000,
          profit: 70000,
          comparison: '+12% from last month',
        },
        suggestions: ['Detailed breakdown', 'Export report', 'View trends'],
      };
    
    case 'capabilities':
      return {
        type: AI_RESPONSE_TYPES.TEXT,
        message: `I can help you with:

**📊 Reports & Analytics**
- Generate employee reports
- Attendance summaries
- Financial overviews
- Task progress tracking

**🔍 Quick Searches**
- Find employees by name/department
- Search pending approvals
- Locate documents

**🚀 Quick Actions**
- Navigate to any page
- Create new entries
- Approve requests

**💡 Smart Suggestions**
- Performance insights
- Resource allocation tips
- Deadline reminders

Try saying "show pending tasks" or "financial summary"!`,
        suggestions: ['Show dashboard', 'Pending approvals', 'Today\'s schedule'],
      };
    
    default:
      return {
        type: AI_RESPONSE_TYPES.TEXT,
        message: 'I understand you need help. How can I assist you today?',
        suggestions: ['Show capabilities', 'View dashboard', 'Generate report'],
      };
  }
};

/**
 * Process user message and generate AI response
 * @param {string} message - User's input message
 * @param {object} context - Current application context
 * @returns {Promise<object>} AI response
 */
export async function processAIMessage(message, context = {}) {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
  
  const normalizedMessage = message.toLowerCase().trim();
  
  // Check for exact command matches
  for (const [command, config] of Object.entries(AI_COMMANDS)) {
    if (normalizedMessage.includes(command)) {
      if (config.intent === AI_INTENTS.NAVIGATION) {
        return {
          type: AI_RESPONSE_TYPES.ACTION,
          action: 'navigate',
          target: config.target,
          message: `Taking you to ${config.target.replace('/', '')}...`,
        };
      }
      return generateResponse(config.type, context);
    }
  }
  
  // Check for greetings
  if (/^(hi|hello|hey|good morning|good afternoon|good evening)/i.test(normalizedMessage)) {
    const hour = new Date().getHours();
    let greeting = 'Hello';
    if (hour < 12) greeting = 'Good morning';
    else if (hour < 17) greeting = 'Good afternoon';
    else greeting = 'Good evening';
    
    return {
      type: AI_RESPONSE_TYPES.TEXT,
      message: `${greeting}! 👋 I'm your Guardian ERP assistant. How can I help you today?`,
      suggestions: ['What can you do?', 'Show dashboard', 'Pending tasks'],
    };
  }
  
  // Check for thank you
  if (/^(thank|thanks|thx)/i.test(normalizedMessage)) {
    return {
      type: AI_RESPONSE_TYPES.TEXT,
      message: 'You\'re welcome! Is there anything else I can help you with?',
      suggestions: ['Show dashboard', 'Generate report', 'No, that\'s all'],
    };
  }
  
  // Default response for unrecognized inputs
  return {
    type: AI_RESPONSE_TYPES.TEXT,
    message: `I'm not sure how to help with "${message}". Here are some things you can try:`,
    suggestions: ['What can you do?', 'Show dashboard', 'Help'],
  };
}

/**
 * Get smart suggestions based on current context
 * @param {string} page - Current page/route
 * @param {object} data - Page-specific data
 * @returns {Array} List of suggestions
 */
export function getSmartSuggestions(page, data = {}) {
  const suggestions = {
    '/dashboard': [
      'Show monthly summary',
      'Compare with last month',
      'Export dashboard data',
    ],
    '/employees': [
      'Find employee by name',
      'Department breakdown',
      'Recent hires this month',
    ],
    '/attendance': [
      'Who is absent today?',
      'Late arrival report',
      'Attendance trends',
    ],
    '/tasks': [
      'Show overdue tasks',
      'Tasks by priority',
      'My assigned tasks',
    ],
    '/leaves': [
      'Pending leave requests',
      'Team availability',
      'Leave balance summary',
    ],
    '/expenses': [
      'Monthly expense breakdown',
      'Pending reimbursements',
      'Budget utilization',
    ],
    '/revenue': [
      'Revenue vs target',
      'Client-wise revenue',
      'Monthly comparison',
    ],
    '/reports': [
      'Generate employee report',
      'Financial summary',
      'Custom report builder',
    ],
  };
  
  return suggestions[page] || ['How can I help?', 'Show dashboard', 'Generate report'];
}

/**
 * Analyze data and provide insights
 * @param {string} dataType - Type of data to analyze
 * @param {object} data - Data to analyze
 * @returns {object} Analysis results
 */
export function analyzeData(dataType, data) {
  // Simulated analysis results
  const analyses = {
    employees: {
      insights: [
        'Employee retention rate is 94%, above industry average',
        '3 employees have pending performance reviews',
        'Engineering department grew 15% this quarter',
      ],
      alerts: [
        '2 employees have expired certifications',
      ],
      trends: {
        direction: 'up',
        percentage: 8,
        period: 'quarter',
      },
    },
    attendance: {
      insights: [
        'Average attendance rate is 92%',
        'Monday has the lowest attendance rate',
        'Remote work days show higher productivity',
      ],
      alerts: [
        '5 employees have attendance below 80%',
      ],
      trends: {
        direction: 'up',
        percentage: 3,
        period: 'month',
      },
    },
    financial: {
      insights: [
        'Revenue is 12% above target',
        'Operating costs reduced by 5%',
        'Q3 projected to exceed goals',
      ],
      alerts: [
        '3 invoices pending for over 30 days',
      ],
      trends: {
        direction: 'up',
        percentage: 12,
        period: 'quarter',
      },
    },
  };
  
  return analyses[dataType] || { insights: [], alerts: [], trends: null };
}

/**
 * Generate natural language summary of data
 * @param {string} type - Type of summary
 * @param {object} data - Data to summarize
 * @returns {string} Natural language summary
 */
export function generateSummary(type, data) {
  const summaries = {
    daily: `Today's Summary: ${data.completed || 0} tasks completed, ${data.pending || 0} pending. Attendance: ${data.attendance || 0}%. Revenue: $${(data.revenue || 0).toLocaleString()}.`,
    weekly: `This Week: Total revenue $${(data.revenue || 0).toLocaleString()} (${data.revenueChange > 0 ? '+' : ''}${data.revenueChange || 0}% vs last week). ${data.tasksCompleted || 0} tasks completed. Team attendance ${data.avgAttendance || 0}%.`,
    monthly: `Monthly Overview: Revenue $${(data.revenue || 0).toLocaleString()}, Expenses $${(data.expenses || 0).toLocaleString()}, Net ${data.revenue > data.expenses ? 'Profit' : 'Loss'}: $${Math.abs((data.revenue || 0) - (data.expenses || 0)).toLocaleString()}. ${data.newEmployees || 0} new hires, ${data.completedProjects || 0} projects completed.`,
  };
  
  return summaries[type] || 'Summary not available for the selected period.';
}

export default {
  processAIMessage,
  getSmartSuggestions,
  analyzeData,
  generateSummary,
  AI_QUICK_ACTIONS,
  AI_RESPONSE_TYPES,
  AI_INTENTS,
};
