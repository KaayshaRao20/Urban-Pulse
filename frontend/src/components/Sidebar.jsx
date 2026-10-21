import React from 'react';

export default function Sidebar({
  activeView,
  setActiveView,
  criticalAlertsCount = 5,
  officer,
  onLogout,
  onSwitchToCitizen,
  isOpen = false,
  onClose
}) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [isHovered, setIsHovered] = React.useState(false);

  // Expanded if not collapsed, or when hovered over in collapsed mode
  const isExpanded = !isCollapsed || isHovered;

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path d="M3 10.25L12 3l9 7.25V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1v-9.75z" />
        </svg>
      )
    },
    {
      id: 'map',
      label: 'Map',
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
          <circle cx="12" cy="9" r="2.5" />
        </svg>
      )
    },
    {
      id: 'grievances',
      label: 'Grievance Redressal',
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          <line x1="9" y1="10" x2="15" y2="10" />
          <line x1="12" y1="7" x2="12" y2="13" />
        </svg>
      )
    },
    {
      id: 'alerts',
      label: 'Alerts & Incidents',
      badge: String(criticalAlertsCount ?? 5),
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      )
    },
    {
      id: 'simulation',
      label: 'Scenario Analysis',
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="6" r="3" />
          <circle cx="18" cy="18" r="3" />
          <path d="M8.7 10.7l6.6-3.4M8.7 13.3l6.6 3.4" />
        </svg>
      )
    },
    {
      id: 'focus',
      label: 'Focus',
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="4" />
          <line x1="12" y1="1" x2="12" y2="5" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="1" y1="12" x2="5" y2="12" />
          <line x1="19" y1="12" x2="23" y2="12" />
        </svg>
      )
    },
    {
      id: 'predictive_calendar',
      label: 'Predictive Calendar',
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      )
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      )
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      )
    },
    {
      id: 'data',
      label: 'Data',
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
          <ellipse cx="12" cy="5" rx="9" ry="3" />
          <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
        </svg>
      )
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      )
    }
  ];

  const displayName = officer?.name || officer?.full_name || 'Admin';
  const displayRole = officer?.department || 'Urban Authority';
  const avatarLetter = (displayName[0] || 'A').toUpperCase();

  return (
    <aside
      className={`app-sidebar modern-sidebar ${isOpen ? 'mobile-open' : ''} ${isExpanded ? 'is-expanded' : 'is-collapsed'}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div>
        {/* Brand Header */}
        <div className="sidebar-brand-exact">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
            <img
              src="/assets/urbanpulse_ref_badge_hd.png"
              alt="UrbanPulse Emblem"
              className="sidebar-brand-logo-img"
            />
            {isExpanded && (
              <div className="sidebar-brand-text-block">
                <div className="sidebar-brand-name">
                  <span className="brand-green-exact">Urban</span>
                  <span className="brand-navy-exact">Pulse</span>
                </div>
                <div className="sidebar-brand-tag-exact">
                  <div>SMART CITY MONITORING</div>
                  <div>& RESPONSE NETWORK</div>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {/* Desktop Collapse / Expand Pin Toggle Button */}
            <button
              type="button"
              className="sidebar-toggle-pin-btn"
              onClick={() => setIsCollapsed(!isCollapsed)}
              title={isCollapsed ? "Expand Sidebar (or hover on mouse visit)" : "Collapse Sidebar to Compact Mode"}
              aria-label="Toggle Sidebar width"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2">
                {isCollapsed ? (
                  <polyline points="13 17 18 12 13 7" />
                ) : (
                  <polyline points="11 17 6 12 11 7" />
                )}
              </svg>
            </button>

            {/* Close button on mobile screens */}
            {onClose && (
              <button
                type="button"
                className="sidebar-mobile-close-btn"
                onClick={onClose}
                aria-label="Close Navigation Menu"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Menu Navigation Items */}
        <nav className="sidebar-nav-list" aria-label="Main Navigation">
          {navItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`sidebar-nav-btn ${isActive ? 'active' : ''} ${!isExpanded ? 'collapsed-btn' : ''}`}
                onClick={() => {
                  setActiveView(item.id);
                  if (onClose) onClose();
                }}
                title={item.label}
              >
                <div className="sidebar-nav-btn-left">
                  <span className={`sidebar-nav-icon ${isActive ? 'active-icon-box' : ''}`}>
                    {item.icon}
                  </span>
                  {isExpanded && <span className="sidebar-nav-label">{item.label}</span>}
                </div>
                {item.badge && isExpanded && (
                  <span className="sidebar-nav-badge">{item.badge}</span>
                )}
                {item.badge && !isExpanded && (
                  <span className="sidebar-dot-badge" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Profile & Sign Out Area */}
      <div className="sidebar-bottom-area">
        {/* Switch to Citizen Portal Button */}
        {onSwitchToCitizen && (
          <button
            type="button"
            className={`sidebar-switch-portal-btn ${!isExpanded ? 'collapsed-portal-btn' : ''}`}
            onClick={() => {
              onSwitchToCitizen();
              if (onClose) onClose();
            }}
            title="Switch to Public Citizen Portal"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            {isExpanded && <span>Citizen Portal</span>}
            {isExpanded && <span className="portal-arrow">→</span>}
          </button>
        )}

        {/* Profile Card */}
        <div
          className={`sidebar-profile-card ${!isExpanded ? 'collapsed-profile' : ''}`}
          onClick={() => {
            setActiveView('settings');
            if (onClose) onClose();
          }}
          title={isExpanded ? "Open Admin Settings" : displayName}
        >
          <div className="profile-card-left">
            <div className="profile-avatar-circle">{avatarLetter}</div>
            {isExpanded && (
              <div className="profile-text-wrap">
                <div className="profile-name">{displayName}</div>
                <div className="profile-role">{displayRole}</div>
              </div>
            )}
          </div>
          {isExpanded && (
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#64748B" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          )}
        </div>

        {/* Sign Out Row */}
        {onLogout && (
          <button
            type="button"
            className={`sidebar-logout-btn ${!isExpanded ? 'collapsed-logout' : ''}`}
            onClick={onLogout}
            title="Log Out of Authority Console"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#64748B" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            {isExpanded && <span>Log Out</span>}
          </button>
        )}
      </div>
    </aside>
  );
}
