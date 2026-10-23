import React, { useState, useEffect, useMemo, useRef } from 'react';
import { API_BASE } from '../config/api';
import { useAuth } from '../context/AuthContext';

export default function AlertsIncidentsView({ onCriticalCountChange }) {
  const { user } = useAuth();
  const currentOfficerName = user?.name || user?.full_name || 'Duty Commander (City 01)';

  // --- Core State ---
  const [alerts, setAlerts] = useState([]);
  const [summary, setSummary] = useState({
    critical: 5,
    high: 12,
    moderate: 18,
    low: 9,
    total_active: 44,
    total_resolved: 0,
    timestamp: '20 Oct 2026 17:02:40',
    is_live: true
  });
  const [selectedAlertId, setSelectedAlertId] = useState('alt-001');
  const [activeTab, setActiveTab] = useState('Overview');
  const [authorities, setAuthorities] = useState([]);
  const [isConnected, setIsConnected] = useState(true);
  const [liveUpdatesEnabled, setLiveUpdatesEnabled] = useState(true);

  // --- Real-time clock for top bar ---
  const [liveClock, setLiveClock] = useState(() => {
    const d = new Date();
    const datePart = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const timePart = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    return `${datePart} ${timePart}`;
  });

  useEffect(() => {
    const clockInterval = setInterval(() => {
      const d = new Date();
      const datePart = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      const timePart = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
      setLiveClock(`${datePart} ${timePart}`);
    }, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  // --- Filter State ---
  const [filterStatus, setFilterStatus] = useState('active'); // 'active', 'acknowledged', 'resolved', 'all'
  const [filterType, setFilterType] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterLocation, setFilterLocation] = useState('all');
  const [filterTime, setFilterTime] = useState('last_24h');
  const [sortBy, setSortBy] = useState('latest');
  const [searchQuery, setSearchQuery] = useState('');

  // --- Modals & Popovers ---
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedAuthorityId, setSelectedAuthorityId] = useState('');
  const [assignMessage, setAssignMessage] = useState('Please review and respond to this critical incident.');
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignFeedback, setAssignFeedback] = useState(null);
  const [showKebabMenu, setShowKebabMenu] = useState(false);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);

  // --- Comment Input for Updates Tab ---
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // --- Toast Feedback ---
  const [toastMessage, setToastMessage] = useState('');
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // --- Initial Data Load ---
  useEffect(() => {
    fetchAuthorities();
    fetchAlertsData(true);
  }, []);

  // --- Polling Loop for Live Data ---
  useEffect(() => {
    if (!liveUpdatesEnabled) return;
    const interval = setInterval(() => {
      fetchAlertsData(false);
    }, 3000);
    return () => clearInterval(interval);
  }, [liveUpdatesEnabled]);

  const fetchAuthorities = async () => {
    try {
      const res = await fetch(`${API_BASE}/authorities`);
      if (res.ok) {
        const data = await res.json();
        setAuthorities(data);
        if (data.length > 0 && !selectedAuthorityId) {
          setSelectedAuthorityId(data[0].id);
        }
      }
    } catch (e) {
      console.warn('Authorities fetch failed', e);
    }
  };

  const fetchAlertsData = async (isInitial = false) => {
    try {
      // 1. Summary
      const summaryRes = await fetch(`${API_BASE}/alerts/summary`);
      if (summaryRes.ok) {
        const sData = await summaryRes.json();
        setSummary(sData);
        setIsConnected(true);
        if (onCriticalCountChange) {
          onCriticalCountChange(sData.critical);
        }
      }

      // 2. Alerts List
      const alertsRes = await fetch(`${API_BASE}/alerts`);
      if (alertsRes.ok) {
        const aList = await alertsRes.json();
        setAlerts(aList);
        setIsConnected(true);
        if (isInitial && aList.length > 0 && !selectedAlertId) {
          setSelectedAlertId(aList[0].id);
        }
      }
    } catch (err) {
      setIsConnected(false);
    }
  };

  // --- Toggle Severity Card Filter ---
  const handleCardSeverityFilter = (sev) => {
    if (sev === 'all') {
      setFilterSeverity('all');
    } else if (filterSeverity.toLowerCase() === sev.toLowerCase()) {
      setFilterSeverity('all');
    } else {
      setFilterSeverity(sev);
    }
  };

  // --- Filtered and Sorted Alerts ---
  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => {
      // Status Filter
      if (filterStatus === 'active' && alert.status === 'Resolved') {
        return false;
      }
      if (filterStatus === 'resolved' && alert.status !== 'Resolved') {
        return false;
      }
      if (filterStatus === 'acknowledged' && alert.status !== 'Acknowledged') {
        return false;
      }

      // Severity Filter
      if (filterSeverity !== 'all' && alert.severity?.toLowerCase() !== filterSeverity.toLowerCase()) {
        return false;
      }
      // Type Filter
      if (filterType !== 'all') {
        const t = filterType.toLowerCase();
        if (!alert.alert_type?.toLowerCase().includes(t) && !alert.title?.toLowerCase().includes(t)) {
          return false;
        }
      }
      // Location Filter
      if (filterLocation !== 'all') {
        const loc = filterLocation.toLowerCase();
        if (!alert.location?.toLowerCase().includes(loc)) {
          return false;
        }
      }
      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          alert.title?.toLowerCase().includes(q) ||
          alert.location?.toLowerCase().includes(q) ||
          alert.description?.toLowerCase().includes(q) ||
          alert.severity?.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'oldest') return a.id.localeCompare(b.id);
      if (sortBy === 'severity') {
        const order = { Critical: 1, High: 2, Moderate: 3, Low: 4 };
        return (order[a.severity] || 5) - (order[b.severity] || 5);
      }
      // Default: Latest First (matches seeded order)
      return 0;
    });
  }, [alerts, filterStatus, filterSeverity, filterType, filterLocation, searchQuery, sortBy]);

  // Selected Alert Object
  const selectedAlert = useMemo(() => {
    return alerts.find(a => a.id === selectedAlertId) || filteredAlerts[0] || alerts[0] || null;
  }, [alerts, selectedAlertId, filteredAlerts]);

  // Selected Authority for Assign Modal
  const currentAuthority = useMemo(() => {
    return authorities.find(a => a.id === selectedAuthorityId) || authorities[0] || null;
  }, [authorities, selectedAuthorityId]);

  // --- Handlers ---
  const handleAcknowledge = async (alertId) => {
    try {
      const res = await fetch(`${API_BASE}/alerts/${alertId}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: currentOfficerName })
      });
      if (res.ok) {
        const data = await res.json();
        setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, ...data.alert } : a));
        fetchAlertsData(false);
        showToast('Alert acknowledged successfully.');
      }
    } catch (e) {
      showToast('Failed to acknowledge alert.');
    }
  };

  const handleResolve = async (alertId) => {
    try {
      const res = await fetch(`${API_BASE}/alerts/${alertId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: currentOfficerName })
      });
      if (res.ok) {
        const data = await res.json();
        setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, ...data.alert } : a));
        fetchAlertsData(false);
        showToast(`Alert #${alertId} marked as resolved and closed.`);
      }
    } catch (e) {
      showToast('Failed to resolve alert.');
    }
  };

  const handleShare = () => {
    if (!selectedAlert) return;
    const shareText = `[UrbanPulse Incident Briefing]\nAlert: ${selectedAlert.title} (${selectedAlert.severity})\nLocation: ${selectedAlert.location}\nTime: ${selectedAlert.timestamp}\nStatus: ${selectedAlert.status}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText);
      showToast('Incident briefing copied to clipboard.');
    } else {
      showToast('Incident details prepared.');
    }
  };

  const handleSendAssignment = async () => {
    if (!selectedAlert || !selectedAuthorityId) return;
    setAssignLoading(true);
    setAssignFeedback(null);

    try {
      const res = await fetch(`${API_BASE}/alerts/${selectedAlert.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authority_id: selectedAuthorityId,
          message: assignMessage
        })
      });

      if (res.ok) {
        const data = await res.json();
        setAlerts(prev => prev.map(a => a.id === selectedAlert.id ? { ...a, ...data.alert } : a));
        setAssignFeedback({ type: 'success', text: 'Alert assigned successfully. Official notification sent.' });
        setTimeout(() => {
          setShowAssignModal(false);
          setAssignFeedback(null);
          showToast(`Assigned to ${data.assignment.assigned_to}`);
        }, 1200);
      } else {
        setAssignFeedback({ type: 'error', text: 'Assignment could not be processed.' });
      }
    } catch (err) {
      setAssignFeedback({ type: 'error', text: 'Network connection issue.' });
    } finally {
      setAssignLoading(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !selectedAlert) return;
    setIsSubmittingComment(true);

    try {
      const res = await fetch(`${API_BASE}/alerts/${selectedAlert.id}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: currentOfficerName,
          comment: commentText.trim()
        })
      });

      if (res.ok) {
        const data = await res.json();
        setAlerts(prev => prev.map(a => {
          if (a.id === selectedAlert.id) {
            const comments = [...(a.comments || []), data.comment];
            return { ...a, comments };
          }
          return a;
        }));
        setCommentText('');
        showToast('Internal update note appended.');
      }
    } catch (err) {
      showToast('Could not post update.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // --- Category SVG Icons ---
  const renderCategoryIcon = (iconName, sev, size = 18) => {
    const s = sev?.toLowerCase();
    let bg = '#FEE2E2';
    let color = '#EF4444';
    if (s === 'high') { bg = '#FFEDD5'; color = '#F97316'; }
    else if (s === 'moderate') { bg = '#DBEAFE'; color = '#2563EB'; }
    else if (s === 'low') { bg = '#DCFCE7'; color = '#10B981'; }

    return (
      <div style={{
        width: size === 18 ? 36 : 48,
        height: size === 18 ? 36 : 48,
        borderRadius: '50%',
        background: bg,
        color: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}>
        {iconName === 'car' && (
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M5 17h14M5 17a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2M5 17a2 2 0 1 0 4 0M15 17a2 2 0 1 0 4 0M7 7l2-4h6l2 4" />
          </svg>
        )}
        {iconName === 'cloud-rain' && (
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242M8 19v2M8 15v2M16 19v2M16 15v2M12 21v2M12 17v2" />
          </svg>
        )}
        {iconName === 'waves' && (
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
          </svg>
        )}
        {(iconName === 'train' || iconName === 'bus') && (
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.2">
            <rect x="3" y="3" width="18" height="16" rx="2" />
            <path d="M3 10h18M7 19v2M17 19v2M8 6h.01M16 6h.01" />
          </svg>
        )}
        {iconName === 'users' && (
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        )}
        {iconName === 'alert-triangle' && (
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" />
          </svg>
        )}
        {iconName === 'briefcase' && (
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.2">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
          </svg>
        )}
        {iconName === 'tree' && (
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M12 2L4 14h5l-3 6h12l-3-6h5L12 2zM12 20v2" />
          </svg>
        )}
        {!['car', 'cloud-rain', 'waves', 'train', 'bus', 'users', 'alert-triangle', 'briefcase', 'tree'].includes(iconName) && (
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        )}
      </div>
    );
  };

  // Helper: map icon string based on alert item
  const getIconForAlert = (alert) => {
    if (alert.icon) {
      if (alert.icon === 'bus' && alert.title?.toLowerCase().includes('metro')) return 'train';
      return alert.icon;
    }
    const t = alert.title?.toLowerCase() || '';
    if (t.includes('traffic') || t.includes('pileup')) return 'car';
    if (t.includes('rain') || t.includes('fog')) return 'cloud-rain';
    if (t.includes('flood') || t.includes('waterlog')) return 'waves';
    if (t.includes('metro') || t.includes('rail')) return 'train';
    if (t.includes('crowd') || t.includes('gathering')) return 'users';
    if (t.includes('tree')) return 'tree';
    if (t.includes('bottleneck')) return 'briefcase';
    if (t.includes('bus') || t.includes('transport')) return 'bus';
    return 'alert-triangle';
  };

  // --- Severity Badge Pill ---
  const renderSeverityPill = (sev) => {
    const s = sev?.toLowerCase();
    if (s === 'critical') {
      return (
        <span style={{
          background: '#EF4444',
          color: '#FFFFFF',
          padding: '2.5px 12px',
          borderRadius: '9999px',
          fontSize: '0.72rem',
          fontWeight: 700,
          letterSpacing: '0.2px'
        }}>
          Critical
        </span>
      );
    }
    if (s === 'high') {
      return (
        <span style={{
          background: '#FFEDD5',
          color: '#C2410C',
          padding: '2.5px 12px',
          borderRadius: '9999px',
          fontSize: '0.72rem',
          fontWeight: 700,
          letterSpacing: '0.2px'
        }}>
          High
        </span>
      );
    }
    if (s === 'moderate') {
      return (
        <span style={{
          background: '#DBEAFE',
          color: '#2563EB',
          padding: '2.5px 12px',
          borderRadius: '9999px',
          fontSize: '0.72rem',
          fontWeight: 700,
          letterSpacing: '0.2px'
        }}>
          Moderate
        </span>
      );
    }
    return (
      <span style={{
        background: '#DCFCE7',
        color: '#16A34A',
        padding: '2.5px 12px',
        borderRadius: '9999px',
        fontSize: '0.72rem',
        fontWeight: 700,
        letterSpacing: '0.2px'
      }}>
        Low
      </span>
    );
  };

  // --- Mini Bars Component for KPI Cards ---
  const renderMiniBars = (color, heights = [8, 12, 6, 16, 20]) => (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: 22, marginBottom: 4, justifyContent: 'flex-end' }}>
      {heights.map((h, i) => (
        <div
          key={i}
          style={{
            width: 3.5,
            height: h,
            borderRadius: '2px',
            background: color,
            opacity: 0.4 + (i * 0.15)
          }}
        />
      ))}
    </div>
  );

  return (
    <div style={{ width: '100%', minHeight: '100%', padding: '16px 20px', background: '#F8FAFC', boxSizing: 'border-box' }}>
      {/* Toast Feedback */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          background: '#0F172A',
          color: '#FFFFFF',
          padding: '10px 18px',
          borderRadius: '8px',
          fontSize: '0.82rem',
          fontWeight: 600,
          boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          animation: 'fadeIn 0.2s ease-in-out'
        }}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#10B981" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* =================================================================== */}
      {/* 0. TOP COMMAND BAR (Matches App Header in Screenshot)               */}
      {/* =================================================================== */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '18px',
        gap: '16px',
        flexWrap: 'wrap'
      }}>
        {/* Search input with magnifying glass */}
        <div style={{ position: 'relative', width: '380px', maxWidth: '100%' }}>
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="#94A3B8"
            strokeWidth="2"
            style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}
          >
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search location, incident or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 16px 8px 38px',
              border: '1px solid #CBD5E1',
              borderRadius: '24px',
              fontSize: '0.82rem',
              color: '#0F172A',
              background: '#FFFFFF',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.15s ease'
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Right Status Group: Live Data + Bell + User Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Live Data + Clock Indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.8rem',
            color: '#475569',
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            padding: '5px 12px',
            borderRadius: '20px'
          }}>
            <span style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#10B981',
              boxShadow: '0 0 0 2px rgba(16,185,129,0.25)',
              display: 'inline-block'
            }} />
            <span style={{ color: '#059669', fontWeight: 700 }}>Live Data</span>
            <span style={{ color: '#CBD5E1' }}>|</span>
            <span style={{ fontWeight: 600, color: '#334155' }}>{liveClock}</span>
          </div>

          {/* Notification Bell with Badge 3 */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowNotificationMenu(!showNotificationMenu)}
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                border: '1px solid #E2E8F0',
                background: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#475569',
                cursor: 'pointer',
                position: 'relative'
              }}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span style={{
                position: 'absolute',
                top: -2,
                right: -2,
                background: '#EF4444',
                color: '#FFFFFF',
                fontSize: '0.65rem',
                fontWeight: 800,
                width: 16,
                height: 16,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                3
              </span>
            </button>

            {showNotificationMenu && (
              <div style={{
                position: 'absolute',
                right: 0,
                top: 42,
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
                width: 280,
                zIndex: 1000,
                padding: '10px 12px'
              }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0F172A', marginBottom: 6 }}>
                  Urgent System Notifications
                </div>
                <div style={{ fontSize: '0.74rem', color: '#EF4444', fontWeight: 700, padding: '4px 0' }}>
                  • Severe Traffic Congestion (ORR)
                </div>
                <div style={{ fontSize: '0.74rem', color: '#EF4444', fontWeight: 700, padding: '4px 0' }}>
                  • Heavy Rainfall Warning (Whitefield)
                </div>
                <div style={{ fontSize: '0.74rem', color: '#EF4444', fontWeight: 700, padding: '4px 0' }}>
                  • Ejipura Underpass Flash Flood Risk
                </div>
              </div>
            )}
          </div>

          {/* User Profile Avatar & Name */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            background: '#FFFFFF',
            padding: '4px 10px 4px 4px',
            borderRadius: '24px',
            border: '1px solid #E2E8F0'
          }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: '#0F172A',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.82rem',
              fontWeight: 800
            }}>
              K
            </div>
            <div style={{ textAlign: 'left', lineHeight: 1.1 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0F172A' }}>Kaaysha Rao</div>
              <div style={{ fontSize: '0.68rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: 2 }}>
                Admin
                <svg viewBox="0 0 24 24" width="10" height="10" stroke="currentColor" fill="none" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. VIEW HEADER (TITLE, SUBTITLE, AND TOP-RIGHT FILTERS) */}
      {/* ======================================================== */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '16px'
      }}>
        {/* Title and Subtitle */}
        <div>
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: 800,
            color: '#0F172A',
            letterSpacing: '-0.02em',
            margin: 0,
            lineHeight: 1.2
          }}>
            Alerts & Incidents
          </h1>
          <p style={{
            fontSize: '0.82rem',
            color: '#64748B',
            marginTop: 4,
            marginBottom: 0
          }}>
            Monitor real-time alerts, critical incidents and system notifications from across the city.
          </p>
        </div>

        {/* Header Right Filters & Toggle Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: '6px 12px',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 700,
              color: filterStatus === 'resolved' ? '#047857' : (filterStatus === 'acknowledged' ? '#1D4ED8' : '#0F172A'),
              background: filterStatus === 'resolved' ? '#ECFDF5' : (filterStatus === 'acknowledged' ? '#EFF6FF' : '#F8FAFC'),
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="active">Active Incidents ({summary.total_active || 0})</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="resolved">Resolved / Closed ({summary.total_resolved || 0})</option>
            <option value="all">All Incidents</option>
          </select>

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{
              padding: '6px 12px',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 500,
              color: '#334155',
              background: '#FFFFFF',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="all">All Types</option>
            <option value="traffic">Traffic Congestion</option>
            <option value="weather">Heavy Rainfall / Weather</option>
            <option value="crowd">Crowd Surge</option>
            <option value="road">Road Blockage</option>
            <option value="transit">Public Transport</option>
            <option value="utility">Power / Utility</option>
          </select>

          {/* Severity Filter */}
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            style={{
              padding: '6px 12px',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 500,
              color: '#334155',
              background: '#FFFFFF',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="all">All Severity</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Moderate">Moderate</option>
            <option value="Low">Low</option>
          </select>

          {/* Location Filter */}
          <select
            value={filterLocation}
            onChange={(e) => setFilterLocation(e.target.value)}
            style={{
              padding: '6px 12px',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 500,
              color: '#334155',
              background: '#FFFFFF',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="all">All Locations</option>
            <option value="Marathahalli">Marathahalli – Outer Ring Road</option>
            <option value="Whitefield">Whitefield</option>
            <option value="Ejipura">Ejipura Underpass</option>
            <option value="Majestic">Majestic Metro Hub</option>
            <option value="NICE">NICE Road Toll Plaza</option>
            <option value="MG Road">MG Road</option>
            <option value="Silk Board">Silk Board Junction</option>
            <option value="Indiranagar">Indiranagar 100ft Road</option>
            <option value="Tin Factory">Tin Factory Junction</option>
          </select>

          {/* Time Window Filter */}
          <select
            value={filterTime}
            onChange={(e) => setFilterTime(e.target.value)}
            style={{
              padding: '6px 12px',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 500,
              color: '#334155',
              background: '#FFFFFF',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="last_24h">Last 24 Hours</option>
            <option value="last_1h">Last 1 Hour</option>
            <option value="last_6h">Last 6 Hours</option>
            <option value="last_7d">Last 7 Days</option>
          </select>

          {/* Filter Adjustment Button */}
          <button
            onClick={() => {
              setFilterStatus('active');
              setFilterType('all');
              setFilterSeverity('all');
              setFilterLocation('all');
              setSearchQuery('');
              showToast('Filters reset to default.');
            }}
            title="Reset Filters"
            style={{
              width: 34,
              height: 34,
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              background: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#475569',
              cursor: 'pointer'
            }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
              <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
              <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
              <line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" />
            </svg>
          </button>

          {/* Live Updates Toggle */}
          <div
            onClick={() => setLiveUpdatesEnabled(!liveUpdatesEnabled)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              marginLeft: '4px',
              userSelect: 'none'
            }}
          >
            <div style={{
              width: 38,
              height: 22,
              borderRadius: '11px',
              background: liveUpdatesEnabled ? '#059669' : '#CBD5E1',
              position: 'relative',
              transition: 'background 0.2s ease'
            }}>
              <div style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: '#FFFFFF',
                position: 'absolute',
                top: 2,
                left: liveUpdatesEnabled ? 18 : 2,
                transition: 'left 0.2s ease',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
              }} />
            </div>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>
              Live Updates
            </span>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. TOP 5 KPI SUMMARY CARDS (EXACT MATCHING DESIGN)       */}
      {/* ======================================================== */}
      <div className="alerts-summary-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: '12px',
        marginBottom: '16px'
      }}>
        {/* Card 1: Critical */}
        <div
          onClick={() => handleCardSeverityFilter('Critical')}
          style={{
            background: '#FFFFFF',
            border: filterSeverity.toLowerCase() === 'critical' ? '2px solid #EF4444' : '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              background: '#FEE2E2',
              color: '#EF4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>
                {summary.critical}
              </div>
              <div style={{ fontSize: '0.76rem', color: '#64748B', fontWeight: 500, marginTop: 3 }}>
                Critical
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            {renderMiniBars('#EF4444', [8, 14, 10, 18, 22])}
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#EF4444' }}>
              ↑ 25%
            </div>
          </div>
        </div>

        {/* Card 2: High */}
        <div
          onClick={() => handleCardSeverityFilter('High')}
          style={{
            background: '#FFFFFF',
            border: filterSeverity.toLowerCase() === 'high' ? '2px solid #F97316' : '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              background: '#FFEDD5',
              color: '#F97316',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="6" />
                <circle cx="12" cy="12" r="2" fill="currentColor" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>
                {summary.high}
              </div>
              <div style={{ fontSize: '0.76rem', color: '#64748B', fontWeight: 500, marginTop: 3 }}>
                High
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            {renderMiniBars('#F97316', [10, 16, 12, 18, 14])}
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#F97316' }}>
              ↑ 8%
            </div>
          </div>
        </div>

        {/* Card 3: Moderate */}
        <div
          onClick={() => handleCardSeverityFilter('Moderate')}
          style={{
            background: '#FFFFFF',
            border: filterSeverity.toLowerCase() === 'moderate' ? '2px solid #2563EB' : '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              background: '#DBEAFE',
              color: '#2563EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="4" fill="currentColor" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>
                {summary.moderate}
              </div>
              <div style={{ fontSize: '0.76rem', color: '#64748B', fontWeight: 500, marginTop: 3 }}>
                Moderate
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            {renderMiniBars('#2563EB', [18, 14, 16, 12, 8])}
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#2563EB' }}>
              ↓ 12%
            </div>
          </div>
        </div>

        {/* Card 4: Low */}
        <div
          onClick={() => handleCardSeverityFilter('Low')}
          style={{
            background: '#FFFFFF',
            border: filterSeverity.toLowerCase() === 'low' ? '2px solid #10B981' : '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              background: '#DCFCE7',
              color: '#10B981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4">
                <circle cx="12" cy="12" r="10" />
                <polyline points="9 12 11 14 15 10" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>
                {summary.low}
              </div>
              <div style={{ fontSize: '0.76rem', color: '#64748B', fontWeight: 500, marginTop: 3 }}>
                Low
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            {renderMiniBars('#10B981', [20, 16, 14, 10, 6])}
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#10B981' }}>
              ↓ 30%
            </div>
          </div>
        </div>

        {/* Card 5: Total Active */}
        <div
          onClick={() => handleCardSeverityFilter('all')}
          style={{
            background: '#FFFFFF',
            border: filterSeverity === 'all' ? '2px solid #475569' : '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              background: '#F1F5F9',
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2">
                <polygon points="12 2 2 7 12 12 22 7 12 2" />
                <polyline points="2 17 12 22 22 17" />
                <polyline points="2 12 12 17 22 12" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>
                {summary.total_active}
              </div>
              <div style={{ fontSize: '0.76rem', color: '#64748B', fontWeight: 500, marginTop: 3 }}>
                Total Active
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            {renderMiniBars('#10B981', [12, 14, 16, 18, 22])}
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#10B981' }}>
              ↑ 5%
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. TWO-COLUMN MAIN CONTENT (LIVE ALERTS + INCIDENT PANE) */}
      {/* ======================================================== */}
      <div className="alerts-main-grid" style={{
        display: 'grid',
        gridTemplateColumns: '40% calc(60% - 16px)',
        gap: '16px',
        alignItems: 'start'
      }}>
        {/* ========================================== */}
        {/* LEFT COLUMN: LIVE ALERTS LIST (44)         */}
        {/* ========================================== */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          {/* Header */}
          <div style={{
            padding: '14px 18px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#0F172A' }}>
              Live Alerts <span style={{ color: '#64748B', fontWeight: 600 }}>({filteredAlerts.length})</span>
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: '4px 10px',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                fontSize: '0.76rem',
                color: '#475569',
                background: '#F8FAFC',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="latest">Latest First</option>
              <option value="severity">Severity First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>

          {/* Alert List Items */}
          <div style={{ maxHeight: '700px', overflowY: 'auto' }}>
            {filteredAlerts.length === 0 ? (
              <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: '#64748B' }}>
                <p style={{ fontSize: '0.88rem', fontWeight: 600 }}>No alerts match your filter criteria.</p>
                <button
                  onClick={() => {
                    setFilterSeverity('all');
                    setFilterType('all');
                    setFilterLocation('all');
                    setSearchQuery('');
                  }}
                  style={{
                    marginTop: '8px',
                    padding: '6px 14px',
                    background: '#F1F5F9',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              filteredAlerts.map(alert => {
                const isSelected = selectedAlert?.id === alert.id;
                const iconType = getIconForAlert(alert);

                return (
                  <div
                    key={alert.id}
                    onClick={() => setSelectedAlertId(alert.id)}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid #F8FAFC',
                      borderLeft: isSelected ? '3.5px solid #EF4444' : '3.5px solid transparent',
                      background: isSelected ? '#FEF2F2' : '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease'
                    }}
                  >
                    {/* Time */}
                    <div style={{
                      width: 42,
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: '#64748B',
                      flexShrink: 0
                    }}>
                      {alert.time_str || '14:30'}
                    </div>

                    {/* Category Icon */}
                    {renderCategoryIcon(iconType, alert.severity, 18)}

                    {/* Title & Location */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '0.84rem',
                        fontWeight: 700,
                        color: '#0F172A',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {alert.title}
                      </div>
                      <div style={{
                        fontSize: '0.74rem',
                        color: '#64748B',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        marginTop: 2
                      }}>
                        {alert.location}
                      </div>
                    </div>

                    {/* Severity Pill */}
                    <div style={{ flexShrink: 0 }}>
                      {renderSeverityPill(alert.severity)}
                    </div>

                    {/* Right Chevron */}
                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="#94A3B8" fill="none" strokeWidth="2" style={{ flexShrink: 0 }}>
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ========================================== */}
        {/* RIGHT COLUMN: INCIDENT DETAIL PANE         */}
        {/* ========================================== */}
        {selectedAlert ? (
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '20px 24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            {/* Header: Large Category Icon + Title + Status + Action Kebab */}
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '14px',
              marginBottom: '12px'
            }}>
              {/* Category Icon Badge */}
              {renderCategoryIcon(getIconForAlert(selectedAlert), selectedAlert.severity, 24)}

              {/* Title & Meta Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <h2 style={{
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    color: '#0F172A',
                    margin: 0,
                    lineHeight: 1.25
                  }}>
                    {selectedAlert.title}
                  </h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
                    {renderSeverityPill(selectedAlert.severity)}
                    <button
                      onClick={() => setShowKebabMenu(!showKebabMenu)}
                      title="More Options"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#64748B',
                        cursor: 'pointer',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                        <circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" />
                      </svg>
                    </button>

                    {/* Kebab Dropdown Menu */}
                    {showKebabMenu && (
                      <div style={{
                        position: 'absolute',
                        right: 0,
                        top: 26,
                        background: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: '8px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                        width: 210,
                        zIndex: 100,
                        overflow: 'hidden'
                      }}>
                        <div
                          onClick={() => { setShowKebabMenu(false); showToast('Incident PDF Report generated.'); }}
                          style={{ padding: '8px 12px', fontSize: '0.78rem', color: '#1E293B', cursor: 'pointer' }}
                        >
                          Export Incident Report (PDF)
                        </div>
                        <div
                          onClick={() => { setShowKebabMenu(false); handleShare(); }}
                          style={{ padding: '8px 12px', fontSize: '0.78rem', color: '#1E293B', cursor: 'pointer' }}
                        >
                          Copy Incident Data
                        </div>
                        <div
                          onClick={() => { setShowKebabMenu(false); showToast('Location pinned on GIS command layer.'); }}
                          style={{ padding: '8px 12px', fontSize: '0.78rem', color: '#1E293B', cursor: 'pointer' }}
                        >
                          View on Map Canvas
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sub-rows: Time + Location */}
                <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#64748B' }}>
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span>{selectedAlert.timestamp} {selectedAlert.time_ago ? `(${selectedAlert.time_ago})` : ''}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#64748B' }}>
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                    </svg>
                    <span>{selectedAlert.location}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Description Text */}
            <p style={{
              fontSize: '0.82rem',
              color: '#475569',
              lineHeight: 1.55,
              margin: '0 0 16px 0'
            }}>
              {selectedAlert.description}
            </p>

            {/* 4 Action Buttons Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', flexWrap: 'wrap' }}>
              {/* Acknowledge Button */}
              {selectedAlert.acknowledged ? (
                <div style={{
                  background: '#ECFDF5',
                  color: '#065F46',
                  border: '1px solid #A7F3D0',
                  padding: '7px 16px',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Acknowledged
                </div>
              ) : (
                <button
                  onClick={() => handleAcknowledge(selectedAlert.id)}
                  style={{
                    background: '#065F46',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '7px 18px',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'background 0.15s ease'
                  }}
                >
                  <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" /><polyline points="9 12 11 14 15 10" />
                  </svg>
                  Acknowledge
                </button>
              )}

              {/* Assign Button */}
              <button
                onClick={() => setShowAssignModal(true)}
                style={{
                  background: '#FFFFFF',
                  color: '#1E293B',
                  border: '1px solid #CBD5E1',
                  padding: '7px 16px',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" />
                </svg>
                Assign
              </button>

              {/* Share Button */}
              <button
                onClick={handleShare}
                style={{
                  background: '#FFFFFF',
                  color: '#1E293B',
                  border: '1px solid #CBD5E1',
                  padding: '7px 16px',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
                Share
              </button>

              {/* Resolve Button */}
              {selectedAlert.resolved ? (
                <div style={{
                  background: '#F1F5F9',
                  color: '#475569',
                  border: '1px solid #CBD5E1',
                  padding: '7px 16px',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Resolved
                </div>
              ) : (
                <button
                  onClick={() => handleResolve(selectedAlert.id)}
                  style={{
                    background: '#FFFFFF',
                    color: '#1E293B',
                    border: '1px solid #CBD5E1',
                    padding: '7px 16px',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  Resolve
                </button>
              )}
            </div>

            {/* Navigation Tabs Bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '24px',
              borderBottom: '1px solid #E2E8F0',
              marginBottom: '16px'
            }}>
              {['Overview', 'Impact Analysis', 'Resources', 'Updates', 'Related Incidents'].map(tab => {
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      background: 'none',
                      border: 'none',
                      borderBottom: isActive ? '2px solid #059669' : '2px solid transparent',
                      padding: '8px 0',
                      fontSize: '0.84rem',
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? '#059669' : '#64748B',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>

            {/* ======================================================== */}
            {/* TAB CONTENT: 1. OVERVIEW (Matches Reference Screenshot)  */}
            {/* ======================================================== */}
            {activeTab === 'Overview' && (
              <div>
                {/* 4 Metric Blocks */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '10px',
                  marginBottom: '14px'
                }}>
                  {/* Block 1: Average Speed */}
                  <div style={{
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: '#E0F2FE',
                      color: '#0284C7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 12l3-3" />
                        <line x1="8" y1="12" x2="6" y2="12" /><line x1="16" y1="12" x2="18" y2="12" />
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 500 }}>Average Speed</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.15 }}>
                        {selectedAlert.telemetry_metrics?.speed || '14 km/h'}
                      </div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#EF4444', marginTop: 1 }}>
                        {selectedAlert.telemetry_metrics?.speed_trend || '↓ 72%'}
                      </div>
                    </div>
                  </div>

                  {/* Block 2: Traffic Volume */}
                  <div style={{
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: '#EDE9FE',
                      color: '#7C3AED',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <path d="M5 17h14M5 17a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2M5 17a2 2 0 1 0 4 0M15 17a2 2 0 1 0 4 0M7 7l2-4h6l2 4" />
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 500 }}>Traffic Volume</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.15 }}>
                        {selectedAlert.telemetry_metrics?.traffic_volume || (selectedAlert.telemetry_metrics?.rainfall ? selectedAlert.telemetry_metrics.rainfall : '4,820 veh/h')}
                      </div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#EF4444', marginTop: 1 }}>
                        {selectedAlert.telemetry_metrics?.volume_trend || '↑ 65%'}
                      </div>
                    </div>
                  </div>

                  {/* Block 3: Congestion Level */}
                  <div style={{
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: '#FFEDD5',
                      color: '#EA580C',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <line x1="18" y1="20" x2="18" y2="10" />
                        <line x1="12" y1="20" x2="12" y2="4" />
                        <line x1="6" y1="20" x2="6" y2="14" />
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 500 }}>Congestion Level</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.15 }}>
                        {selectedAlert.telemetry_metrics?.congestion_level || (selectedAlert.telemetry_metrics?.crowd_density ? '82%' : '88%')}
                      </div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#EF4444', marginTop: 1 }}>
                        {selectedAlert.telemetry_metrics?.congestion_trend || '↑ 38%'}
                      </div>
                    </div>
                  </div>

                  {/* Block 4: Affected Road */}
                  <div style={{
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: '#DCFCE7',
                      color: '#16A34A',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <path d="M4 19L9 5M20 19L15 5M12 5v14" />
                      </svg>
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 500 }}>Affected Road</div>
                      <div style={{
                        fontSize: '0.85rem',
                        fontWeight: 800,
                        color: '#0F172A',
                        lineHeight: 1.2,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {selectedAlert.telemetry_metrics?.affected_road || selectedAlert.location}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: 1 }}>
                        {selectedAlert.telemetry_metrics?.affected_road_sub || 'Both Directions'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Two Sub-Cards Side by Side: Impact Assessment & Affected Areas */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '14px',
                  marginBottom: '14px'
                }}>
                  {/* Left: Impact Assessment */}
                  <div style={{
                    border: '1px solid #E2E8F0',
                    borderRadius: '10px',
                    padding: '14px',
                    background: '#FFFFFF'
                  }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0F172A', marginBottom: '12px' }}>
                      Impact Assessment
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {(selectedAlert.impact_data && selectedAlert.impact_data.length > 0 ? selectedAlert.impact_data : [
                        { category: 'Mobility', level: 'High', pct: 85, color: '#EF4444' },
                        { category: 'Public Transport', level: 'Medium', pct: 55, color: '#F97316' },
                        { category: 'Emergency Response', level: 'High', pct: 80, color: '#EF4444' },
                        { category: 'Economic Impact', level: 'Medium', pct: 50, color: '#F97316' }
                      ]).map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <span style={{ fontSize: '0.76rem', color: '#475569', width: 120, flexShrink: 0, fontWeight: 500 }}>
                            {item.category}
                          </span>
                          <div style={{ flex: 1, height: 7, background: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{
                              width: `${item.pct}%`,
                              height: '100%',
                              background: item.color || (item.level === 'High' ? '#EF4444' : '#F97316'),
                              borderRadius: '4px'
                            }} />
                          </div>
                          <span style={{
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            color: item.color || (item.level === 'High' ? '#EF4444' : '#F97316'),
                            width: 50,
                            textAlign: 'right'
                          }}>
                            {item.level}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right: Affected Areas */}
                  <div style={{
                    border: '1px solid #E2E8F0',
                    borderRadius: '10px',
                    padding: '14px',
                    background: '#FFFFFF'
                  }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0F172A', marginBottom: '12px' }}>
                      Affected Areas
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {(selectedAlert.affected_areas && selectedAlert.affected_areas.length > 0 ? selectedAlert.affected_areas : [
                        'Marathahalli Junction',
                        'Outer Ring Road (Both Directions)',
                        'Bellandur Flyover',
                        'KTPO Junction'
                      ]).map((area, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#334155' }}>
                          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#64748B" strokeWidth="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                          </svg>
                          <span style={{ fontWeight: 500 }}>{area}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Timeline Stepper Section */}
                <div style={{
                  border: '1px solid #E2E8F0',
                  borderRadius: '10px',
                  padding: '14px',
                  background: '#FFFFFF'
                }}>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0F172A', marginBottom: '14px' }}>
                    Timeline
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
                    {(selectedAlert.timeline && selectedAlert.timeline.length > 0 ? selectedAlert.timeline : [
                      { time: '14:31', title: 'Alert detected', desc: 'Severe traffic congestion reported on Outer Ring Road.', color: '#EF4444' },
                      { time: '14:35', title: 'Field teams notified', desc: 'Traffic management team has been dispatched.', color: '#F97316' },
                      { time: '14:40', title: 'Ongoing monitoring', desc: 'Situation under observation.', color: '#475569' }
                    ]).map((event, idx, arr) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', position: 'relative', paddingBottom: idx === arr.length - 1 ? 0 : '16px' }}>
                        {/* Time */}
                        <div style={{ width: 44, fontSize: '0.76rem', fontWeight: 600, color: '#64748B', flexShrink: 0, paddingTop: 1 }}>
                          {event.time}
                        </div>

                        {/* Dot & Connecting Line */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                          <div style={{
                            width: 9,
                            height: 9,
                            borderRadius: '50%',
                            background: event.color || '#EF4444',
                            marginTop: 4
                          }} />
                          {idx !== arr.length - 1 && (
                            <div style={{
                              width: 1.5,
                              flex: 1,
                              minHeight: 28,
                              background: '#E2E8F0',
                              marginTop: 2
                            }} />
                          )}
                        </div>

                        {/* Event Content */}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A' }}>
                            {event.title}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: 1 }}>
                            {event.desc}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* TAB CONTENT: 2. IMPACT ANALYSIS                          */}
            {/* ======================================================== */}
            {activeTab === 'Impact Analysis' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ border: '1px solid #E2E8F0', borderRadius: '10px', padding: '14px', background: '#F8FAFC' }}>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>
                    Corridor Vulnerability & Spillover Range
                  </div>
                  <p style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.5, margin: 0 }}>
                    Analysis models indicate an active congestion cascade across <strong>4.8 km</strong> of Outer Ring Road connecting Marathahalli and Bellandur flyover ramps. Mean commuter travel latency increased by <strong>320%</strong> over baseline afternoon velocity.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '12px', background: '#FFFFFF' }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Approx. Travel Delay</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#EF4444', marginTop: 2 }}>
                      {selectedAlert.related_info?.approx_delay || '20 – 40 mins'}
                    </div>
                  </div>
                  <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '12px', background: '#FFFFFF' }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Public Transit Routes</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#F97316', marginTop: 2 }}>
                      14 BMTC Lines
                    </div>
                  </div>
                  <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '12px', background: '#FFFFFF' }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Detour Feasibility</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#059669', marginTop: 2 }}>
                      Varthur Link Available
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* TAB CONTENT: 3. RESOURCES                                */}
            {/* ======================================================== */}
            {activeTab === 'Resources' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>
                  Field Operations & Agency Deployment
                </div>
                {[
                  { unit: 'BTP Traffic Patrol (Sector 4)', status: 'On-Site', desc: 'Regulating merge lanes and clearing stalled vehicle queue.', badgeColor: '#059669', badgeBg: '#ECFDF5' },
                  { unit: 'BBMP Heavy Recovery Crane (Unit 02)', status: 'En Route', desc: 'ETA 8 minutes via Indiranagar bypass.', badgeColor: '#D97706', badgeBg: '#FFFBEB' },
                  { unit: 'Trauma Emergency Ambulance 108', status: 'Standby', desc: 'Positioned at Bellandur emergency bay.', badgeColor: '#2563EB', badgeBg: '#EFF6FF' }
                ].map((res, idx) => (
                  <div key={idx} style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '12px 14px', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0F172A' }}>{res.unit}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: 2 }}>{res.desc}</div>
                    </div>
                    <span style={{ background: res.badgeBg, color: res.badgeColor, padding: '3px 10px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700 }}>
                      {res.status}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* ======================================================== */}
            {/* TAB CONTENT: 4. UPDATES                                  */}
            {/* ======================================================== */}
            {activeTab === 'Updates' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Live updates list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(selectedAlert.live_updates && selectedAlert.live_updates.length > 0 ? selectedAlert.live_updates : [
                    { time: '14:31', text: 'Alert raised by automated vision and sensor monitoring.', dot: 'red' },
                    { time: '14:32', text: 'Camera feed confirms severe vehicle volume slowdown.', dot: 'red' },
                    { time: '14:35', text: 'Traffic police command dispatched patrol marshals.', dot: 'blue' }
                  ]).map((u, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.78rem', background: '#F8FAFC', padding: '8px 12px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                      <span style={{ fontWeight: 700, color: '#64748B', width: 44 }}>{u.time}</span>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: u.dot === 'red' ? '#EF4444' : (u.dot === 'green' ? '#10B981' : '#2563EB') }} />
                      <span style={{ color: '#1E293B', flex: 1 }}>{u.text}</span>
                    </div>
                  ))}
                </div>

                {/* Authority Internal Comments */}
                {selectedAlert.comments && selectedAlert.comments.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0F172A' }}>Official Log Notes</div>
                    {selectedAlert.comments.map(c => (
                      <div key={c.id} style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '8px 10px', fontSize: '0.76rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B', marginBottom: 2 }}>
                          <strong>{c.user}</strong>
                          <span>{c.timestamp}</span>
                        </div>
                        <div style={{ color: '#1E293B' }}>{c.comment}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add comment box */}
                <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '8px', marginTop: 4 }}>
                  <input
                    type="text"
                    placeholder="Add an internal log note or dispatch comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    style={{ flex: 1, padding: '7px 12px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.78rem', outline: 'none' }}
                  />
                  <button
                    type="submit"
                    disabled={isSubmittingComment || !commentText.trim()}
                    style={{ background: '#0F172A', color: '#FFFFFF', border: 'none', padding: '7px 14px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Post Note
                  </button>
                </form>
              </div>
            )}

            {/* ======================================================== */}
            {/* TAB CONTENT: 5. RELATED INCIDENTS                        */}
            {/* ======================================================== */}
            {activeTab === 'Related Incidents' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0F172A', marginBottom: '2px' }}>
                  Nearby & Connected Grid Incidents
                </div>
                {alerts.filter(a => a.id !== selectedAlert.id && (a.severity === 'Critical' || a.severity === 'High')).slice(0, 4).map(rel => (
                  <div
                    key={rel.id}
                    onClick={() => setSelectedAlertId(rel.id)}
                    style={{
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      background: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {renderCategoryIcon(getIconForAlert(rel), rel.severity, 16)}
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A' }}>{rel.title}</div>
                        <div style={{ fontSize: '0.73rem', color: '#64748B' }}>{rel.location} • {rel.time_str}</div>
                      </div>
                    </div>
                    {renderSeverityPill(rel.severity)}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '4rem 2rem', textAlign: 'center', color: '#64748B' }}>
            <p style={{ fontSize: '0.95rem', fontWeight: 600 }}>Select an alert from the live stream to review operational details.</p>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* ASSIGN MODAL (MUNICIPAL OFFICIAL DISPATCH)               */}
      {/* ======================================================== */}
      {showAssignModal && selectedAlert && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(15, 23, 42, 0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100001,
          backdropFilter: 'blur(2px)'
        }}>
          <div style={{
            width: 440,
            maxWidth: '92%',
            background: '#FFFFFF',
            borderRadius: '12px',
            padding: '1.25rem',
            boxShadow: '0 12px 36px rgba(0,0,0,0.2)',
            border: '1px solid #E2E8F0'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem' }}>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>Assign Incident</div>
              <button
                onClick={() => setShowAssignModal(false)}
                style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', display: 'flex', padding: 2 }}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>

            <div style={{ marginBottom: '0.85rem', background: '#F8FAFC', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Incident:</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A' }}>{selectedAlert.title}</div>
              <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: 2 }}>{selectedAlert.location}</div>
            </div>

            <div style={{ marginBottom: '0.85rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                Assign Authority:
              </label>
              <select
                value={selectedAuthorityId}
                onChange={(e) => setSelectedAuthorityId(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.8rem', color: '#0F172A', outline: 'none' }}
              >
                {authorities.map(auth => (
                  <option key={auth.id} value={auth.id}>
                    {auth.name} — {auth.department}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '0.85rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                Authority Dispatch Email:
              </label>
              <input
                type="text"
                readOnly
                value={currentAuthority ? currentAuthority.email : ''}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.8rem', background: '#F8FAFC', color: '#64748B', outline: 'none' }}
              />
            </div>

            <div style={{ marginBottom: '1.1rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                Dispatch Instructions:
              </label>
              <textarea
                rows={3}
                value={assignMessage}
                onChange={(e) => setAssignMessage(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.8rem', color: '#0F172A', outline: 'none', resize: 'none' }}
              />
            </div>

            {assignFeedback && (
              <div style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.76rem',
                fontWeight: 600,
                marginBottom: '1rem',
                background: assignFeedback.type === 'success' ? '#ECFDF5' : '#FEF2F2',
                color: assignFeedback.type === 'success' ? '#065F46' : '#991B1B',
                border: assignFeedback.type === 'success' ? '1px solid #A7F3D0' : '1px solid #FCA5A5'
              }}>
                {assignFeedback.text}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                disabled={assignLoading}
                style={{ padding: '0.45rem 1rem', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, color: '#475569', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendAssignment}
                disabled={assignLoading}
                style={{ padding: '0.45rem 1.1rem', background: '#059669', border: 'none', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, color: '#FFFFFF', cursor: 'pointer' }}
              >
                {assignLoading ? 'Dispatching...' : 'Send Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
