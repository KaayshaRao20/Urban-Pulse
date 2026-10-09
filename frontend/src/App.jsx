import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import IntelligenceMapView from './components/IntelligenceMapView';
import SimulationView from './components/SimulationView';
import FocusView from './components/FocusView';
import PredictiveCalendarView from './components/PredictiveCalendarView';
import AlertsIncidentsView from './components/AlertsIncidentsView';
import ReportsView from './components/ReportsView';
import SettingsView from './components/SettingsView';

const API_BASE = 'http://localhost:8000/api';

export default function App() {
  const [activeView, setActiveView] = useState('settings');

  const [criticalAlertsCount, setCriticalAlertsCount] = useState(5);
  const [telemetryData, setTelemetryData] = useState(null);
  const [connectionLost, setConnectionLost] = useState(false);
  const [timestamp, setTimestamp] = useState('');

  // 2-second centralized telemetry polling loop
  useEffect(() => {
    let isMounted = true;

    const fetchTelemetry = async () => {
      try {
        const res = await fetch(`${API_BASE}/dashboard/overview`);
        if (!res.ok) throw new Error("Telemetry backend unavailable");
        const data = await res.json();
        if (isMounted) {
          setTelemetryData(data);
          setConnectionLost(false);
          if (data.timestamp) setTimestamp(data.timestamp);
        }
      } catch (err) {
        if (isMounted) {
          setConnectionLost(true);
        }
      }
    };

    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 2000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Connection Lost Alert Banner */}
      {connectionLost && (
        <div id="connection-banner" style={{ display: 'block' }}>
          ⚠️ Connection Lost / Reconnecting to UrbanPulse Telemetry Backend... Displaying last received telemetry.
        </div>
      )}

      {/* Main Shell */}
      <div className="app-shell">
        <Sidebar
          activeView={activeView}
          setActiveView={setActiveView}
          criticalAlertsCount={criticalAlertsCount}
        />

        <main className="workspace-area">
          {activeView === 'dashboard' && <DashboardView telemetryData={telemetryData} />}
          {activeView === 'map' && <IntelligenceMapView timestamp={timestamp} />}
          {activeView === 'simulation' && <SimulationView timestamp={timestamp} />}
          {activeView === 'focus' && <FocusView timestamp={timestamp} />}
          {activeView === 'predictive_calendar' && <PredictiveCalendarView timestamp={timestamp} />}
          {activeView === 'alerts' && <AlertsIncidentsView onCriticalCountChange={setCriticalAlertsCount} />}

          {activeView === 'analytics' && (
            <div style={{ padding: '2rem', fontSize: '1.2rem', fontWeight: '700' }}>
              Analytics Module (Phase 2)
            </div>
          )}
          {activeView === 'reports' && <ReportsView />}
          {activeView === 'settings' && <SettingsView />}
        </main>

      </div>
    </div>
  );
}
