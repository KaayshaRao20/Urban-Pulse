import React from 'react';

export default function Sidebar({ activeView, setActiveView, criticalAlertsCount = 5 }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z' },
    { id: 'map', label: 'Map', icon: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z' },
    { id: 'simulation', label: 'Scenario Analysis', icon: 'M10 2v7.31L4.2 18.5A2 2 0 0 0 5.8 21.5h12.4a2 2 0 0 0 1.6-3L14 9.31V2z' },
    { id: 'focus', label: 'Focus', icon: 'M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 14a4 4 0 1 1 0-8 4 4 0 0 1 0 8z' },
    { id: 'predictive_calendar', label: 'Predictive Calendar', icon: 'M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM16 2v4M8 2v4M3 10h18' },
    { id: 'alerts', label: 'Alerts & Incidents', badge: String(criticalAlertsCount ?? 5), icon: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9' },
    { id: 'analytics', label: 'Analytics', icon: 'M18 20V10M12 20V4M6 20v-6' },
    { id: 'reports', label: 'Reports', icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' },
    { id: 'settings', label: 'Settings', icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z' }
  ];

  return (
    <aside className="app-sidebar">
      <div>
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <svg viewBox="0 0 24 24"><path d="M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3z"/></svg>
          </div>
          <div>
            <div className="sidebar-brand-title">Urban<span>Pulse</span></div>
            <div className="sidebar-brand-sub">Smart City Monitoring Network</div>
          </div>
        </div>

        <div className="sidebar-menu">
          {navItems.map(item => (
            <a
              key={item.id}
              className={`sidebar-nav-item ${activeView === item.id ? 'active' : ''}`}
              onClick={() => setActiveView(item.id)}
            >
              <div className="sidebar-nav-left">
                <svg viewBox="0 0 24 24"><path d={item.icon} fill="none" stroke="currentColor" strokeWidth="2"/></svg>
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="badge-nav" style={{ background: item.id === 'alerts' ? '#EF4444' : '#059669', borderRadius: '12px', minWidth: '20px', height: '20px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 800 }}>
                  {item.badge}
                </span>
              )}
            </a>
          ))}
        </div>
      </div>

      <div className="sidebar-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="user-avatar">A</div>
          <div>
            <div className="user-info-name">Admin</div>
            <div className="user-info-role">Urban Authority</div>
          </div>
        </div>
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" strokeWidth="2" style={{ color: '#94A3B8' }}>
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </div>
    </aside>
  );
}
