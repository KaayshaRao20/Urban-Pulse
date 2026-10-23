import React, { useState, useEffect, useRef } from 'react';
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
import DataView from './components/DataView';
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
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

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

  // Support direct URL query parameter linking (?portal=authority or ?mode=authority)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const portalParam = params.get('portal') || params.get('mode');
      if (portalParam === 'authority') {
        setUnauthView('auth');
        setAuthInitialMode('login');
        setAuthInitialType('authority');
      }
    } catch (e) {
      console.warn('URL param parse error:', e);
    }
  }, []);

  const consecutiveFailuresRef = useRef(0);

  const fetchTelemetry = async () => {
    try {
      const res = await fetch(`${API_BASE}/dashboard/overview`);
      if (!res.ok) throw new Error("Telemetry backend unavailable");
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (data && (data.metrics || data.city_status)) {
        setTelemetryData(data);
        consecutiveFailuresRef.current = 0;
        setConnectionLost(false);
        if (data.timestamp) setTimestamp(data.timestamp);
      } else {
        throw new Error("Invalid telemetry payload");
      }
    } catch (err) {
      consecutiveFailuresRef.current += 1;
      // Only show offline banner if persistent network failure (3 consecutive polls = ~12s)
      if (consecutiveFailuresRef.current >= 3) {
        setConnectionLost(true);
      }
    }
  };

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleNavigateToGrievance = (ticketId) => {
    setSelectedGrievanceId(ticketId);
    if (user && ['officer', 'admin', 'supervisor', 'operator', 'engineer'].includes(user.role)) {
      setAppMode('authority');
      setActiveView('grievances');
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
      {user?.role === 'citizen' ? (
        <div className="citizen-full-shell">
          <ErrorBoundary>
            <CitizenPortalView
              isAuthenticated={isAuthenticated}
              officer={officer}
              user={user}
              onLogout={handleLogout}
            />
          </ErrorBoundary>
        </div>
      ) : (
        /* ------------------------------------------------------------- */
        /* PORTAL MODE 2: MUNICIPAL AUTHORITY COMMAND CONSOLE (PROTECTED)*/
        /* ------------------------------------------------------------- */
        <div className="app-shell">
          {/* Mobile Top Header (<= 900px) */}
          <div className="authority-mobile-topbar">
            <button
              type="button"
              className="authority-mobile-menu-btn"
              onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              aria-label="Toggle navigation drawer"
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            <div className="authority-mobile-brand">
              <img
                src="/assets/urbanpulse_ref_badge_hd.png"
                alt="UrbanPulse Emblem"
                className="authority-mobile-logo"
              />
              <span className="authority-mobile-title">
                <span className="brand-green-exact">Urban</span>
                <span className="brand-navy-exact">Pulse</span>
              </span>
              <span className="authority-mobile-tag">ICCC</span>
            </div>

            <div className="authority-mobile-live-indicator" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#16A34A', fontWeight: 700 }}>
              <span className="live-grid-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', display: 'inline-block' }}></span>
              <span>LIVE</span>
            </div>
          </div>

          {/* Backdrop Overlay when drawer is active */}
          {isMobileSidebarOpen && (
            <div
              className="mobile-sidebar-backdrop"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
          )}

          <Sidebar
            activeView={activeView}
            setActiveView={(view) => {
              setActiveView(view);
              setIsMobileSidebarOpen(false);
            }}
            criticalAlertsCount={criticalAlertsCount}
            officer={user}
            onLogout={logout}
            isOpen={isMobileSidebarOpen}
            onClose={() => setIsMobileSidebarOpen(false)}
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
              {activeView === 'data' && <DataView />}
              {activeView === 'settings' && <SettingsView />}
            </ErrorBoundary>
          </main>

          {/* Mobile Bottom Navigation Bar (<= 900px) */}
          <nav className="authority-mobile-bottom-nav" aria-label="Quick Mobile Navigation">
            <button
              type="button"
              className={`authority-bottom-nav-item ${activeView === 'dashboard' ? 'active' : ''}`}
              onClick={() => {
                setActiveView('dashboard');
                setIsMobileSidebarOpen(false);
              }}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M3 10.25L12 3l9 7.25V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1v-9.75z" />
              </svg>
              <span>Dashboard</span>
            </button>

            <button
              type="button"
              className={`authority-bottom-nav-item ${activeView === 'map' ? 'active' : ''}`}
              onClick={() => {
                setActiveView('map');
                setIsMobileSidebarOpen(false);
              }}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                <circle cx="12" cy="9" r="2.5" />
              </svg>
              <span>Map</span>
            </button>

            <button
              type="button"
              className={`authority-bottom-nav-item ${activeView === 'grievances' ? 'active' : ''}`}
              onClick={() => {
                setActiveView('grievances');
                setIsMobileSidebarOpen(false);
              }}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                <line x1="9" y1="10" x2="15" y2="10" />
                <line x1="12" y1="7" x2="12" y2="13" />
              </svg>
              <span>Grievances</span>
            </button>

            <button
              type="button"
              className={`authority-bottom-nav-item ${activeView === 'alerts' ? 'active' : ''}`}
              onClick={() => {
                setActiveView('alerts');
                setIsMobileSidebarOpen(false);
              }}
            >
              <div className="bottom-nav-badge-wrap">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {criticalAlertsCount > 0 && (
                  <span className="bottom-nav-badge">{criticalAlertsCount}</span>
                )}
              </div>
              <span>Alerts</span>
            </button>

            <button
              type="button"
              className={`authority-bottom-nav-item ${isMobileSidebarOpen ? 'active' : ''}`}
              onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="19" cy="12" r="1.5" />
                <circle cx="5" cy="12" r="1.5" />
              </svg>
              <span>More</span>
            </button>
          </nav>
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
