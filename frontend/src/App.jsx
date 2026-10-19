import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import IntelligenceMapView from './components/IntelligenceMapView';
import SimulationView from './components/SimulationView';
import FocusView from './components/FocusView';
import PredictiveCalendarView from './components/PredictiveCalendarView';
import AlertsIncidentsView from './components/AlertsIncidentsView';
import ReportsView from './components/ReportsView';
import SettingsView from './components/SettingsView';
import AnalyticsView from './components/AnalyticsView';
import CitizenPortalView from './components/CitizenPortalView';
import GrievanceManagementView from './components/GrievanceManagementView';
import OfficerAuthModal from './components/OfficerAuthModal';

import LoginPage from './components/LoginPage';
import LandingPage from './components/LandingPage';
import ErrorBoundary from './components/ErrorBoundary';

import { API_BASE } from './config/api';

function AppContent() {
  const {
    user,
    isAuthenticated,
    authLoading,
    logout,
    officer,
    isAuthModalOpen,
    openAuthModal,
    closeAuthModal
  } = useAuth();

  // Navigation state for unauthenticated users: 'landing' (interactive 3D hero) | 'auth' (login / registration)
  const [unauthView, setUnauthView] = useState('landing');
  const [authInitialMode, setAuthInitialMode] = useState('login');
  const [authInitialType, setAuthInitialType] = useState(null);

  // Authenticated portal mode: 'authority' | 'citizen'
  const [appMode, setAppMode] = useState('citizen');
  const [activeView, setActiveView] = useState('dashboard');
  const [selectedGrievanceId, setSelectedGrievanceId] = useState(null);

  const [criticalAlertsCount, setCriticalAlertsCount] = useState(5);
  const [telemetryData, setTelemetryData] = useState(null);
  const [connectionLost, setConnectionLost] = useState(false);
  const [timestamp, setTimestamp] = useState('');

  // Automatically align appMode with user role upon login or session restore
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'citizen') {
        setAppMode('citizen');
      } else {
        setAppMode('authority');
      }
    }
  }, [isAuthenticated, user]);

  const fetchTelemetry = async () => {
    try {
      const res = await fetch(`${API_BASE}/dashboard/overview`);
      if (!res.ok) throw new Error("Telemetry backend unavailable");
      const data = await res.json();
      setTelemetryData(data);
      setConnectionLost(false);
      if (data.timestamp) setTimestamp(data.timestamp);
    } catch (err) {
      setConnectionLost(true);
    }
  };

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleSwitchToAuthority = () => {
    if (user && ['officer', 'admin', 'supervisor', 'operator'].includes(user.role)) {
      setAppMode('authority');
      setActiveView('dashboard');
    } else {
      openAuthModal();
    }
  };

  const handleNavigateToGrievance = (ticketId) => {
    setSelectedGrievanceId(ticketId);
    if (user && ['officer', 'admin', 'supervisor', 'operator'].includes(user.role)) {
      setAppMode('authority');
      setActiveView('grievances');
    } else {
      openAuthModal();
    }
  };

  const handleNavigateToAuth = (mode = 'login') => {
    if (mode === 'authority') {
      setAuthInitialMode('login');
      setAuthInitialType('authority');
    } else if (mode === 'register') {
      setAuthInitialMode('register');
      setAuthInitialType(null);
    } else {
      setAuthInitialMode('login');
      setAuthInitialType(null);
    }
    setUnauthView('auth');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToLanding = () => {
    setUnauthView('landing');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAuthSuccess = (loggedUser) => {
    if (loggedUser && loggedUser.role === 'citizen') {
      setAppMode('citizen');
    } else {
      setAppMode('authority');
      setActiveView('dashboard');
    }
  };

  const handleLogout = () => {
    logout();
    setUnauthView('landing');
  };

  // Show clean spinner while verifying stored session
  if (authLoading) {
    return (
      <div style={{ height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 36, height: 36, border: '3px solid #E2E8F0', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <div style={{ fontSize: '0.82rem', color: '#64748B', fontWeight: 600 }}>Loading UrbanPulse...</div>
        </div>
      </div>
    );
  }

  // 1. Unauthenticated Visitor Flow: Landing Page or Login / Register Page
  if (!isAuthenticated) {
    if (unauthView === 'landing') {
      return (
        <ErrorBoundary>
          <LandingPage onNavigateToAuth={handleNavigateToAuth} />
        </ErrorBoundary>
      );
    }
    return (
      <ErrorBoundary>
        <LoginPage
          onAuthSuccess={handleAuthSuccess}
          onBackToLanding={handleBackToLanding}
          initialMode={authInitialMode}
          initialType={authInitialType}
        />
      </ErrorBoundary>
    );
  }

  return (
    <div style={{ height: '100vh', width: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: '#EFF6FC' }}>
      {/* Telemetry Offline Warning Banner */}
      {connectionLost && (
        <div id="connection-banner">
          <span className="banner-dot"></span>
          <span>Telemetry Link Offline — Operating in cached fallback mode. Auto-reconnecting...</span>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* PORTAL MODE 1: PUBLIC CITIZEN CIVIC REPORTING & TRACKING PORTAL */}
      {/* ------------------------------------------------------------- */}
      {appMode === 'citizen' ? (
        <div className="citizen-full-shell">
          <ErrorBoundary>
            <CitizenPortalView
              onSwitchToAuthority={handleSwitchToAuthority}
              onOpenOfficerAuth={openAuthModal}
              isAuthenticated={isAuthenticated}
              officer={officer}
              user={user}
              onLogout={logout}
            />
          </ErrorBoundary>
        </div>
      ) : (
        /* ------------------------------------------------------------- */
        /* PORTAL MODE 2: MUNICIPAL AUTHORITY COMMAND CONSOLE (PROTECTED)*/
        /* ------------------------------------------------------------- */
        <div className="app-shell">
          <Sidebar
            activeView={activeView}
            setActiveView={setActiveView}
            criticalAlertsCount={criticalAlertsCount}
            officer={user}
            onLogout={logout}
            onSwitchToCitizen={() => setAppMode('citizen')}
          />

          <main className="workspace-area">
            <ErrorBoundary>
              {activeView === 'dashboard' && (
                <DashboardView
                  telemetryData={telemetryData}
                  onNavigate={setActiveView}
                  onRefresh={fetchTelemetry}
                />
              )}
              {activeView === 'map' && (
                <IntelligenceMapView
                  timestamp={timestamp}
                  onNavigateToGrievance={handleNavigateToGrievance}
                />
              )}
              {activeView === 'grievances' && (
                <GrievanceManagementView
                  initialTicketId={selectedGrievanceId}
                />
              )}
              {activeView === 'alerts' && (
                <AlertsIncidentsView onCriticalCountChange={setCriticalAlertsCount} />
              )}
              {activeView === 'analytics' && <AnalyticsView />}
              {activeView === 'predictive_calendar' && <PredictiveCalendarView timestamp={timestamp} />}
              {activeView === 'simulation' && <SimulationView timestamp={timestamp} />}
              {activeView === 'focus' && <FocusView timestamp={timestamp} />}
              {activeView === 'reports' && <ReportsView />}
              {activeView === 'settings' && <SettingsView />}
            </ErrorBoundary>
          </main>
        </div>
      )}

      {/* Global Officer Authentication Gateway Modal */}
      <OfficerAuthModal
        isOpen={isAuthModalOpen}
        onClose={closeAuthModal}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <LanguageProvider>
          <AppContent />
        </LanguageProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
