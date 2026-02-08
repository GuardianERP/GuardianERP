import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './store/AuthContext';
import { ThemeProvider } from './store/ThemeContext';
import { Toaster } from 'react-hot-toast';
import ErrorBoundary from './components/ErrorBoundary';
import ToastContainer from './components/ToastContainer';
import { setupGlobalErrorHandlers } from './services/errorService';
import './index.css';

// Initialize global error handlers
setupGlobalErrorHandlers();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <HashRouter>
        <ThemeProvider>
          <AuthProvider>
            <App />
            <ToastContainer />
            <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#1e293b',
                color: '#f8fafc',
                borderRadius: '8px',
                padding: '12px 16px',
              },
              success: {
                iconTheme: {
                  primary: '#22c55e',
                  secondary: '#f8fafc',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#f8fafc',
                },
              },
            }}
          />
        </AuthProvider>
      </ThemeProvider>
    </HashRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
