import React, { useState, useEffect, useRef, useMemo } from 'react';

const API_BASE = 'http://localhost:8000/api';

export default function AlertsIncidentsView({ onCriticalCountChange }) {
  // --- Core State ---
  const [alerts, setAlerts] = useState([]);
  const [summary, setSummary] = useState({
    critical: 5,
    high: 12,
    moderate: 18,
    low: 9,
    total_active: 44,
    timestamp: '27 Sep 2026 14:32:18',
    is_live: true
  });
  const [selectedAlertId, setSelectedAlertId] = useState('alt-001');
  const [authorities, setAuthorities] = useState([]);
  const [isConnected, setIsConnected] = useState(true);
  const [liveUpdatesEnabled, setLiveUpdatesEnabled] = useState(true);

  // --- Filters ---
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterLocation, setFilterLocation] = useState('all');
  const [filterTime, setFilterTime] = useState('last_24h');
  const [sortBy, setSortBy] = useState('latest');

  // --- Collapsible Sections ---
  const [collapseLiveUpdates, setCollapseLiveUpdates] = useState(false);
  const [collapseImpact, setCollapseImpact] = useState(false);
  const [collapseRelated, setCollapseRelated] = useState(false);

  // --- Assign Modal ---
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedAuthorityId, setSelectedAuthorityId] = useState('');
  const [assignMessage, setAssignMessage] = useState('Please review and respond to this critical alert.');
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignFeedback, setAssignFeedback] = useState(null); // { type: 'success' | 'error', text: '' }

  // --- Comment State ---
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // --- Critical Alert Popup State ---
  const [popupAlert, setPopupAlert] = useState(null); // The critical alert currently displayed in the floating emergency popup
  const [seenCriticalAlertIds, setSeenCriticalAlertIds] = useState(new Set());
  const initialMountRef = useRef(true);

  // Toast feedback for Share or quick actions
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // --- Initial Data Fetch & Authority Load ---
  useEffect(() => {
    fetchAuthorities();
    fetchAlertsData(true);
  }, []);

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
      console.warn("Authorities fetch failed", e);
    }
  };

  // --- Real-time Polling Loop (every 2 seconds) ---
  useEffect(() => {
    if (!liveUpdatesEnabled) return;

    const interval = setInterval(() => {
      fetchAlertsData(false);
    }, 2000);

    return () => clearInterval(interval);
  }, [liveUpdatesEnabled, selectedSeverityFilterCard, filterType, filterSeverity, filterLocation, searchQuery, sortBy]);

  // Handle active severity card toggle
  function selectedSeverityFilterCard(sev) {
    if (filterSeverity.toLowerCase() === sev.toLowerCase()) {
      setFilterSeverity('all');
    } else {
      setFilterSeverity(sev);
    }
  }

  // --- Fetch Alerts & Summary from Backend ---
  const fetchAlertsData = async (isInitial = false) => {
    try {
      // 1. Fetch Summary
      const summaryRes = await fetch(`${API_BASE}/alerts/summary`);
      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        setSummary(summaryData);
        setIsConnected(true);
        if (onCriticalCountChange) {
          onCriticalCountChange(summaryData.critical);
        }
      }

      // 2. Fetch Alerts List
      const alertsRes = await fetch(`${API_BASE}/alerts`);
      if (alertsRes.ok) {
        const alertsList = await alertsRes.json();
        setAlerts(alertsList);
        setIsConnected(true);

        // Check for NEW or Escalated Critical Alerts to trigger the Critical Popup
        const criticalAlerts = alertsList.filter(a => a.severity === 'Critical' && a.status !== 'Resolved');
        if (criticalAlerts.length > 0) {
          if (isInitial && initialMountRef.current) {
            // On first load, show the primary top critical alert (alt-001) as in reference UI
            const topCrit = criticalAlerts[0];
            setPopupAlert(topCrit);
            setSeenCriticalAlertIds(new Set([topCrit.id]));
            initialMountRef.current = false;
          } else {
            // Find newly arrived or newly escalated critical alert not yet dismissed/shown
            const unshownCrit = criticalAlerts.find(a => !seenCriticalAlertIds.has(a.id) || a.is_escalated);
            if (unshownCrit) {
              setPopupAlert(unshownCrit);
              setSeenCriticalAlertIds(prev => new Set([...prev, unshownCrit.id]));
            }
          }
        }
      }
    } catch (err) {
      setIsConnected(false);
    }
  };

  // --- Filtered and Sorted Alerts ---
  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => {
      // Severity Filter
      if (filterSeverity !== 'all' && alert.severity.toLowerCase() !== filterSeverity.toLowerCase()) {
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
          alert.severity?.toLowerCase().includes(q) ||
          alert.source?.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'oldest') return a.id.localeCompare(b.id);
      if (sortBy === 'severity') {
        const order = { Critical: 1, High: 2, Moderate: 3, Low: 4 };
        return (order[a.severity] || 5) - (order[b.severity] || 5);
      }
      // Default: Latest First
      return 0;
    });
  }, [alerts, filterSeverity, filterType, filterLocation, searchQuery, sortBy]);

  // Selected Alert object
  const selectedAlert = useMemo(() => {
    return alerts.find(a => a.id === selectedAlertId) || filteredAlerts[0] || alerts[0] || null;
  }, [alerts, selectedAlertId, filteredAlerts]);

  // Selected Authority for Assign Modal
  const currentAuthority = useMemo(() => {
    return authorities.find(a => a.id === selectedAuthorityId) || authorities[0] || null;
  }, [authorities, selectedAuthorityId]);

  // --- Actions ---

  // 1. Acknowledge Alert
  const handleAcknowledge = async (alertId) => {
    try {
      const res = await fetch(`${API_BASE}/alerts/${alertId}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: 'Admin (Urban Authority)' })
      });
      if (res.ok) {
        const data = await res.json();
        // Update local alerts state immediately
        setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, ...data.alert } : a));
        // If this alert was in popup, dismiss popup
        if (popupAlert && popupAlert.id === alertId) {
          setPopupAlert(null);
        }
        showToast('✓ Alert acknowledged successfully.');
      }
    } catch (e) {
      showToast('⚠️ Failed to acknowledge alert. Please check backend.');
    }
  };

  // 2. Resolve Alert
  const handleResolve = async (alertId) => {
    try {
      const res = await fetch(`${API_BASE}/alerts/${alertId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: 'Admin (Urban Authority)' })
      });
      if (res.ok) {
        const data = await res.json();
        setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, ...data.alert } : a));
        if (popupAlert && popupAlert.id === alertId) {
          setPopupAlert(null);
        }
        showToast('✓ Alert resolved and closed.');
      }
    } catch (e) {
      showToast('⚠️ Failed to resolve alert.');
    }
  };

  // 3. Open Assign Modal
  const handleOpenAssignModal = () => {
    if (!selectedAlert) return;
    setAssignFeedback(null);
    setShowAssignModal(true);
  };

  // 4. Send Assignment Request
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
          showToast(`✓ Assigned to ${data.assignment.assigned_to}`);
        }, 1200);
      } else {
        const errData = await res.json().catch(() => ({}));
        setAssignFeedback({
          type: 'error',
          text: errData.detail || 'Assignment could not be sent. Please try again.'
        });
      }
    } catch (err) {
      setAssignFeedback({ type: 'error', text: 'Network error: Assignment could not be sent.' });
    } finally {
      setAssignLoading(false);
    }
  };

  // 5. Submit Operator Comment
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !selectedAlert) return;
    setIsSubmittingComment(true);

    try {
      const res = await fetch(`${API_BASE}/alerts/${selectedAlert.id}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: 'Admin (Urban Authority)',
          comment: commentText.trim()
        })
      });

      if (res.ok) {
        const data = await res.json();
        // Update comment in local state
        setAlerts(prev => prev.map(a => {
          if (a.id === selectedAlert.id) {
            const comments = [...(a.comments || []), data.comment];
            return { ...a, comments };
          }
          return a;
        }));
        setCommentText('');
        showToast('✓ Comment added to alert record.');
      }
    } catch (err) {
      showToast('⚠️ Could not post comment.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // 6. Share Alert (Copy Link)
  const handleShare = () => {
    if (!selectedAlert) return;
    const shareText = `UrbanPulse Alert: [${selectedAlert.severity.toUpperCase()}] ${selectedAlert.title} at ${selectedAlert.location} (${selectedAlert.timestamp})`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText);
      showToast('✓ Alert details copied to clipboard!');
    } else {
      showToast(shareText);
    }
  };

  // Helper for Severity Color Badge
  const renderSeverityBadge = (sev) => {
    switch (sev?.toLowerCase()) {
      case 'critical':
        return <span style={{ background: '#EF4444', color: '#FFFFFF', padding: '3px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 800 }}>Critical</span>;
      case 'high':
        return <span style={{ background: '#F97316', color: '#FFFFFF', padding: '3px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 800 }}>High</span>;
      case 'moderate':
        return <span style={{ background: '#3B82F6', color: '#FFFFFF', padding: '3px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 800 }}>Moderate</span>;
      case 'low':
      default:
        return <span style={{ background: '#DCFCE7', color: '#166534', padding: '3px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 800 }}>Low</span>;
    }
  };

  // Helper for Alert Type Icon
  const renderAlertIcon = (alert) => {
    const iconType = alert.icon || alert.alert_type;
    const sev = alert.severity?.toLowerCase();
    
    // Background color based on severity/category
    let bg = '#FEE2E2';
    let color = '#EF4444';
    if (sev === 'high') { bg = '#FFEDD5'; color = '#F97316'; }
    else if (sev === 'moderate') { bg = '#DBEAFE'; color = '#2563EB'; }
    else if (sev === 'low') { bg = '#DCFCE7'; color = '#16A34A'; }

    return (
      <div style={{ width: 36, height: 36, borderRadius: '50%', background: bg, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {iconType === 'car' && (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M5 17h14M5 17a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2M5 17a2 2 0 1 0 4 0M15 17a2 2 0 1 0 4 0M7 7l2-4h6l2 4"/>
          </svg>
        )}
        {iconType === 'cloud-rain' && (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242M8 19v2M8 15v2M16 19v2M16 15v2M12 21v2M12 17v2"/>
          </svg>
        )}
        {iconType === 'users' && (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        )}
        {iconType === 'alert-triangle' && (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01"/>
          </svg>
        )}
        {iconType === 'bus' && (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2">
            <rect x="3" y="3" width="18" height="16" rx="2"/><path d="M3 10h18M7 19v2M17 19v2M8 6h.01M16 6h.01"/>
          </svg>
        )}
        {iconType === 'zap' && (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
        )}
        {iconType === 'waves' && (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
          </svg>
        )}
        {iconType === 'info' && (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
        )}
      </div>
    );
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.75rem', background: '#F8FAFC', position: 'relative' }}>

      {/* Toast Notification */}
      {toastMessage && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', background: '#0F172A', color: '#FFFFFF', padding: '10px 18px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 9999, display: 'flex', alignItems: 'center', gap: '8px' }}>
          {toastMessage}
        </div>
      )}

      {/* --- TOP HEADER ROW (Matches Reference Image) --- */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', gap: '1rem', flexWrap: 'wrap' }}>
        
        {/* Global Search Bar */}
        <div style={{ position: 'relative', width: 340, maxWidth: '100%' }}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#94A3B8" strokeWidth="2" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search location, incident, or alert..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '0.55rem 1rem 0.55rem 2.4rem', border: '1px solid #CBD5E1', borderRadius: '24px', fontSize: '0.8rem', background: '#FFFFFF', outline: 'none', color: '#0F172A' }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: '0.9rem' }}>✕</button>
          )}
        </div>

        {/* Right Header Status Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          
          {/* Live Data Badge + Dynamic Time */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#475569', background: '#FFFFFF', border: '1px solid #E2E8F0', padding: '0.35rem 0.75rem', borderRadius: '8px' }}>
            {isConnected ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#059669', fontWeight: 700 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', display: 'inline-block', boxShadow: '0 0 0 2px rgba(16,185,129,0.2)' }}></span>
                Live Data
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#DC2626', fontWeight: 700 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#DC2626' }}></span>
                Connection Issue
              </span>
            )}
            <span style={{ color: '#CBD5E1' }}>|</span>
            <span style={{ fontWeight: 600, color: '#1E293B' }}>{summary.timestamp || '27 Sep 2026 14:32:18'}</span>
          </div>

          {/* Location Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#FFFFFF', border: '1px solid #E2E8F0', padding: '0.35rem 0.75rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, color: '#0F172A', cursor: 'pointer' }}>
            <span>📍 Bengaluru</span>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
          </div>

          {/* Quick Action Icons */}
          <button onClick={() => fetchAlertsData(false)} title="Refresh Data" style={{ width: 34, height: 34, borderRadius: '8px', background: '#FFFFFF', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', cursor: 'pointer' }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          </button>

          <button onClick={() => showToast('✓ Incident report package exported.')} title="Download Report" style={{ width: 34, height: 34, borderRadius: '8px', background: '#FFFFFF', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', cursor: 'pointer' }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
          </button>

          <button onClick={() => {
            if (!document.fullscreenElement) {
              document.documentElement.requestFullscreen().catch(() => {});
            } else {
              document.exitFullscreen().catch(() => {});
            }
          }} title="Toggle Fullscreen" style={{ width: 34, height: 34, borderRadius: '8px', background: '#FFFFFF', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', cursor: 'pointer' }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
          </button>
        </div>
      </div>

      {/* --- PAGE TITLE & SUBTITLE --- */}
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.3px', margin: 0 }}>Alerts & Incidents</h1>
        <p style={{ fontSize: '0.82rem', color: '#64748B', marginTop: 4, marginBottom: 0 }}>Monitor real-time alerts, critical incidents and system notifications from across the city.</p>
      </div>

      {/* --- TOP SUMMARY CARDS (5 Cards Matching Screenshot) --- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px', marginBottom: '1.25rem' }}>
        
        {/* 1. Critical Card */}
        <div
          onClick={() => selectedSeverityFilterCard('Critical')}
          style={{
            background: '#FFFFFF',
            border: filterSeverity.toLowerCase() === 'critical' ? '2px solid #EF4444' : '1px solid #FEE2E2',
            borderRadius: '12px',
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(239,68,68,0.06)',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#EF4444', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01"/></svg>
            </div>
            <div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>{summary.critical}</div>
              <div style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600, marginTop: 4 }}>Critical</div>
            </div>
          </div>
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="#94A3B8" fill="none" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
        </div>

        {/* 2. High Card */}
        <div
          onClick={() => selectedSeverityFilterCard('High')}
          style={{
            background: '#FFFFFF',
            border: filterSeverity.toLowerCase() === 'high' ? '2px solid #F97316' : '1px solid #FFEDD5',
            borderRadius: '12px',
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(249,115,22,0.06)',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#F97316', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            </div>
            <div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>{summary.high}</div>
              <div style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600, marginTop: 4 }}>High</div>
            </div>
          </div>
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="#94A3B8" fill="none" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
        </div>

        {/* 3. Moderate Card */}
        <div
          onClick={() => selectedSeverityFilterCard('Moderate')}
          style={{
            background: '#FFFFFF',
            border: filterSeverity.toLowerCase() === 'moderate' ? '2px solid #3B82F6' : '1px solid #DBEAFE',
            borderRadius: '12px',
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(59,130,246,0.06)',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#3B82F6', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>{summary.moderate}</div>
              <div style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600, marginTop: 4 }}>Moderate</div>
            </div>
          </div>
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="#94A3B8" fill="none" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
        </div>

        {/* 4. Low Card */}
        <div
          onClick={() => selectedSeverityFilterCard('Low')}
          style={{
            background: '#FFFFFF',
            border: filterSeverity.toLowerCase() === 'low' ? '2px solid #10B981' : '1px solid #DCFCE7',
            borderRadius: '12px',
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(16,185,129,0.06)',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#10B981', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>{summary.low}</div>
              <div style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600, marginTop: 4 }}>Low</div>
            </div>
          </div>
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="#94A3B8" fill="none" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
        </div>

        {/* 5. Total Active Card */}
        <div
          onClick={() => setFilterSeverity('all')}
          style={{
            background: '#FFFFFF',
            border: filterSeverity === 'all' ? '2px solid #64748B' : '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(100,116,139,0.06)',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#64748B', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/></svg>
            </div>
            <div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>{summary.total_active}</div>
              <div style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600, marginTop: 4 }}>Total Active</div>
            </div>
          </div>
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="#94A3B8" fill="none" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
        </div>
      </div>

      {/* --- FILTER CONTROLS TOOLBAR --- */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '0.75rem 1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
        
        {/* Left Filter Elements */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          
          {/* Search Input in toolbar */}
          <div style={{ position: 'relative', width: 200 }}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#94A3B8" strokeWidth="2" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Search alerts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '0.42rem 0.6rem 0.42rem 1.9rem', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '0.78rem', outline: 'none' }}
            />
          </div>

          {/* Types Dropdown */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{ padding: '0.42rem 0.75rem', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 600, color: '#334155', background: '#FFFFFF', outline: 'none', cursor: 'pointer' }}
          >
            <option value="all">All Types</option>
            <option value="traffic">Traffic Congestion</option>
            <option value="weather">Heavy Rainfall / Weather</option>
            <option value="crowd">Crowd Surge</option>
            <option value="road">Road Blockage</option>
            <option value="transit">Public Transport</option>
            <option value="utility">Power / Utility</option>
            <option value="event">Event Alert</option>
          </select>

          {/* Severity Dropdown */}
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            style={{ padding: '0.42rem 0.75rem', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 600, color: '#334155', background: '#FFFFFF', outline: 'none', cursor: 'pointer' }}
          >
            <option value="all">All Severity</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Moderate">Moderate</option>
            <option value="Low">Low</option>
          </select>

          {/* Locations Dropdown */}
          <select
            value={filterLocation}
            onChange={(e) => setFilterLocation(e.target.value)}
            style={{ padding: '0.42rem 0.75rem', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 600, color: '#334155', background: '#FFFFFF', outline: 'none', cursor: 'pointer' }}
          >
            <option value="all">All Locations</option>
            <option value="Marathahalli">Marathahalli – ORR</option>
            <option value="Whitefield">Whitefield</option>
            <option value="MG Road">MG Road</option>
            <option value="Silk Board">Silk Board Junction</option>
            <option value="Station">KSR Railway Station</option>
            <option value="Indiranagar">Indiranagar</option>
            <option value="Bellandur">Bellandur</option>
            <option value="Koramangala">Koramangala</option>
            <option value="Palace">Bengaluru Palace</option>
            <option value="Hebbal">Hebbal Flyover</option>
          </select>

          {/* Time Filter */}
          <select
            value={filterTime}
            onChange={(e) => setFilterTime(e.target.value)}
            style={{ padding: '0.42rem 0.75rem', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 600, color: '#334155', background: '#FFFFFF', outline: 'none', cursor: 'pointer' }}
          >
            <option value="last_1h">📅 Last 1 Hour</option>
            <option value="last_6h">📅 Last 6 Hours</option>
            <option value="last_24h">📅 Last 24 Hours</option>
            <option value="last_7d">📅 Last 7 Days</option>
          </select>
        </div>

        {/* Right Live Updates Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
            <div
              onClick={() => setLiveUpdatesEnabled(!liveUpdatesEnabled)}
              style={{
                width: 36,
                height: 20,
                borderRadius: '10px',
                background: liveUpdatesEnabled ? '#059669' : '#CBD5E1',
                position: 'relative',
                transition: 'all 0.2s ease',
                cursor: 'pointer'
              }}
            >
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: '#FFFFFF',
                  position: 'absolute',
                  top: 2,
                  left: liveUpdatesEnabled ? 18 : 2,
                  transition: 'all 0.2s ease'
                }}
              />
            </div>
            <span>Live Updates</span>
          </label>
        </div>
      </div>

      {/* --- TWO-COLUMN MAIN CONTENT AREA --- */}
      <div style={{ display: 'grid', gridTemplateColumns: '44% 54%', gap: '20px', alignItems: 'start' }}>
        
        {/* === LEFT COLUMN: LIVE ALERTS LIST === */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          
          {/* List Header */}
          <div style={{ padding: '0.85rem 1.1rem', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A' }}>
              Live Alerts <span style={{ color: '#64748B', fontWeight: 700 }}>({filteredAlerts.length})</span>
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ padding: '0.25rem 0.5rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.75rem', color: '#475569', background: '#F8FAFC', outline: 'none', cursor: 'pointer' }}
            >
              <option value="latest">Latest First</option>
              <option value="severity">Severity First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>

          {/* Alert List Items */}
          <div style={{ maxHeight: '720px', overflowY: 'auto' }}>
            {filteredAlerts.length === 0 ? (
              <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: '#64748B' }}>
                <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>No alerts match your filter criteria.</p>
                <button
                  onClick={() => { setFilterSeverity('all'); setFilterType('all'); setFilterLocation('all'); setSearchQuery(''); }}
                  style={{ marginTop: '8px', padding: '0.4rem 0.9rem', background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600 }}
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              filteredAlerts.map(alert => {
                const isSelected = selectedAlert?.id === alert.id;
                return (
                  <div
                    key={alert.id}
                    onClick={() => setSelectedAlertId(alert.id)}
                    style={{
                      padding: '0.85rem 1.1rem',
                      borderBottom: '1px solid #F1F5F9',
                      borderLeft: isSelected ? '4px solid #EF4444' : '4px solid transparent',
                      background: isSelected ? '#FEF2F2' : '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease'
                    }}
                  >
                    {/* Time */}
                    <div style={{ width: 44, fontSize: '0.78rem', fontWeight: 700, color: '#64748B', flexShrink: 0 }}>
                      {alert.time_str || '14:30'}
                    </div>

                    {/* Icon */}
                    {renderAlertIcon(alert)}

                    {/* Title & Location */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {alert.title}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>
                        {alert.location}
                      </div>
                    </div>

                    {/* Severity Badge & Chevron */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      {renderSeverityBadge(alert.severity)}
                      <svg viewBox="0 0 24 24" width="14" height="14" stroke="#94A3B8" fill="none" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* === RIGHT COLUMN: ALERT DETAILS PANEL === */}
        {selectedAlert ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            
            {/* Top Main Details Card */}
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              
              {/* Header Row: Icon + Title + Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {/* Left Big Red/Colored Icon */}
                  <div style={{ width: 44, height: 44, borderRadius: '12px', background: selectedAlert.severity === 'Critical' ? '#FEE2E2' : '#FFEDD5', color: selectedAlert.severity === 'Critical' ? '#EF4444' : '#F97316', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d="M5 17h14M5 17a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2M5 17a2 2 0 1 0 4 0M15 17a2 2 0 1 0 4 0M7 7l2-4h6l2 4"/>
                    </svg>
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: selectedAlert.severity === 'Critical' ? '#EF4444' : '#0F172A', margin: 0 }}>
                      {selectedAlert.title}
                    </h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: 4, fontSize: '0.75rem', color: '#64748B', flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        {selectedAlert.timestamp} {selectedAlert.time_ago ? `(${selectedAlert.time_ago})` : ''}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        {selectedAlert.location}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  
                  {/* Acknowledge Button */}
                  {selectedAlert.acknowledged ? (
                    <span style={{ background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0', padding: '0.45rem 0.85rem', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      ✓ Acknowledged
                    </span>
                  ) : (
                    <button
                      onClick={() => handleAcknowledge(selectedAlert.id)}
                      style={{ background: '#059669', color: '#FFFFFF', border: 'none', padding: '0.45rem 0.95rem', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', transition: 'background 0.15s ease' }}
                    >
                      Acknowledge
                    </button>
                  )}

                  {/* Assign Button */}
                  <button
                    onClick={handleOpenAssignModal}
                    style={{ background: '#FFFFFF', color: '#0F172A', border: '1px solid #CBD5E1', padding: '0.45rem 0.85rem', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM20 8v6M23 11h-6"/></svg>
                    Assign
                  </button>

                  {/* Share Button */}
                  <button
                    onClick={handleShare}
                    style={{ background: '#FFFFFF', color: '#0F172A', border: '1px solid #CBD5E1', padding: '0.45rem 0.85rem', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/></svg>
                    Share
                  </button>

                  {/* Resolve Button */}
                  {!selectedAlert.resolved && (
                    <button
                      onClick={() => handleResolve(selectedAlert.id)}
                      style={{ background: '#F8FAFC', color: '#0F172A', border: '1px solid #CBD5E1', padding: '0.45rem 0.85rem', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Resolve
                    </button>
                  )}

                  {/* Close / Deselect */}
                  <button
                    onClick={() => setSelectedAlertId(null)}
                    style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px', display: 'flex' }}
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              </div>

              {/* Description */}
              <p style={{ fontSize: '0.82rem', color: '#334155', lineHeight: '1.5', margin: '0 0 1rem 0' }}>
                {selectedAlert.description}
              </p>

              {/* Assignment Status banner if already assigned */}
              {selectedAlert.assigned_to && (
                <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', padding: '0.5rem 0.75rem', marginBottom: '1rem', fontSize: '0.75rem', color: '#166534', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <strong>Assigned To:</strong> {selectedAlert.assigned_to} ({selectedAlert.recipient_email})
                  </div>
                  <div>
                    <strong>Status:</strong> {selectedAlert.assignment_status || 'Sent'} • {selectedAlert.assigned_at}
                  </div>
                </div>
              )}

              {/* Live Camera Feed Frame (Matches Screenshot) */}
              <div style={{ border: '1px solid #E2E8F0', borderRadius: '10px', overflow: 'hidden', background: '#0F172A', marginBottom: '1rem' }}>
                <div style={{ position: 'relative', height: 260, background: '#0F172A', overflow: 'hidden' }}>
                  {selectedAlert.camera_feed_url ? (
                    <img
                      src={selectedAlert.camera_feed_url}
                      alt={selectedAlert.camera_feed_label}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', gap: '8px' }}>
                      <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20M2 12h20"/></svg>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Real-time Telemetry Sensor Stream — {selectedAlert.location}</span>
                    </div>
                  )}
                  {/* Subtle live recording indicator */}
                  <div style={{ position: 'absolute', top: 10, left: 12, background: 'rgba(0,0,0,0.65)', color: '#FFFFFF', padding: '3px 8px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#EF4444' }}></span>
                    LIVE CCTV • 25 FPS
                  </div>
                </div>

                {/* Camera Feed Footer Bar */}
                <div style={{ background: '#FFFFFF', padding: '0.55rem 0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.76rem', color: '#475569', fontWeight: 600 }}>
                    {selectedAlert.camera_feed_label || `Live Feed — ${selectedAlert.location}`}
                  </div>
                  <button title="Full view" style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: 2 }}>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
                  </button>
                </div>
              </div>

              {/* Dynamic Telemetry Metrics (Traffic / Crowd / Weather / Road) */}
              {selectedAlert.telemetry_metrics && (
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                  {Object.entries(selectedAlert.telemetry_metrics).map(([k, v]) => (
                    <div key={k}>
                      <div style={{ fontSize: '0.7rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>
                        {k.replace(/_/g, ' ')}
                      </div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0F172A', marginTop: 2 }}>
                        {String(v)}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Side-by-Side: Impact Assessment & Related Information */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '0.5rem' }}>
                
                {/* 1. Impact Assessment */}
                <div style={{ border: '1px solid #F1F5F9', borderRadius: '8px', padding: '0.85rem' }}>
                  <div
                    onClick={() => setCollapseImpact(!collapseImpact)}
                    style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0F172A', marginBottom: collapseImpact ? 0 : '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                  >
                    <span>Impact Assessment</span>
                    <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{collapseImpact ? '▼' : '▲'}</span>
                  </div>

                  {!collapseImpact && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {selectedAlert.impact_data && selectedAlert.impact_data.length > 0 ? (
                        selectedAlert.impact_data.map((imp, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                            <span style={{ fontSize: '0.74rem', color: '#475569', width: 95, flexShrink: 0 }}>{imp.category}</span>
                            <div style={{ flex: 1, height: 7, background: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ width: `${imp.pct}%`, height: '100%', background: imp.color || '#EF4444', borderRadius: '4px' }} />
                            </div>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: imp.color || '#EF4444', width: 55, textAlign: 'right' }}>{imp.level}</span>
                          </div>
                        ))
                      ) : (
                        <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Data unavailable</div>
                      )}
                    </div>
                  )}
                </div>

                {/* 2. Related Information */}
                <div style={{ border: '1px solid #F1F5F9', borderRadius: '8px', padding: '0.85rem' }}>
                  <div
                    onClick={() => setCollapseRelated(!collapseRelated)}
                    style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0F172A', marginBottom: collapseRelated ? 0 : '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                  >
                    <span>Related Information</span>
                    <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{collapseRelated ? '▼' : '▲'}</span>
                  </div>

                  {!collapseRelated && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          🕒 Approx. Delay
                        </div>
                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0F172A', marginTop: 2 }}>
                          {selectedAlert.related_info?.approx_delay || '20 – 40 minutes'}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '0.7rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          🛣 Affected Stretch
                        </div>
                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0F172A', marginTop: 2 }}>
                          {selectedAlert.related_info?.affected_stretch || selectedAlert.location}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '0.7rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          ⚠️ Possible Cause
                        </div>
                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0F172A', marginTop: 2 }}>
                          {selectedAlert.related_info?.possible_cause || 'Elevated telemetry metrics'}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '0.7rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          🏢 Agencies Notified
                        </div>
                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0F172A', marginTop: 2 }}>
                          {selectedAlert.related_info?.agencies_notified || 'Traffic Police, BBMP'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Collapsible: Live Updates Activity Log */}
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div
                onClick={() => setCollapseLiveUpdates(!collapseLiveUpdates)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#0F172A" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                  <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A' }}>
                    Live Updates <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B' }}>(Auto-refreshing)</span>
                  </span>
                </div>
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="#64748B" fill="none" strokeWidth="2" style={{ transform: collapseLiveUpdates ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }}>
                  <path d="M18 15l-6-6-6-6"/>
                </svg>
              </div>

              {!collapseLiveUpdates && (
                <div style={{ marginTop: '0.85rem', display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #F1F5F9', paddingTop: '0.75rem' }}>
                  {selectedAlert.live_updates && selectedAlert.live_updates.length > 0 ? (
                    selectedAlert.live_updates.map((upd, idx) => {
                      let dotColor = '#EF4444';
                      if (upd.dot === 'blue') dotColor = '#3B82F6';
                      else if (upd.dot === 'orange') dotColor = '#F97316';
                      else if (upd.dot === 'green') dotColor = '#10B981';

                      return (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.78rem' }}>
                          <span style={{ width: 44, color: '#64748B', fontWeight: 700, flexShrink: 0 }}>{upd.time}</span>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                          <span style={{ color: '#1E293B' }}>{upd.text}</span>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>No activity logged yet.</div>
                  )}
                </div>
              )}
            </div>

            {/* Operator Comments Box */}
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.65rem' }}>
                Authority Comments & Log Notes
              </div>

              {selectedAlert.comments && selectedAlert.comments.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '0.85rem' }}>
                  {selectedAlert.comments.map(c => (
                    <div key={c.id} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '0.5rem 0.75rem', fontSize: '0.76rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B', marginBottom: 2 }}>
                        <strong>{c.user}</strong>
                        <span>{c.timestamp}</span>
                      </div>
                      <div style={{ color: '#1E293B' }}>{c.comment}</div>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Add an internal log note or dispatch comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  style={{ flex: 1, padding: '0.45rem 0.75rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.78rem', outline: 'none' }}
                />
                <button
                  type="submit"
                  disabled={isSubmittingComment || !commentText.trim()}
                  style={{ background: '#0F172A', color: '#FFFFFF', border: 'none', padding: '0.45rem 0.95rem', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', opacity: commentText.trim() ? 1 : 0.6 }}
                >
                  Comment
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '4rem 2rem', textAlign: 'center', color: '#64748B' }}>
            <p style={{ fontSize: '0.95rem', fontWeight: 600 }}>Select an alert from the live stream to review operational details.</p>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* FLOATING EMERGENCY POPUP FOR CRITICAL ALERTS (Exact UI) */}
      {/* ======================================================== */}
      {popupAlert && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            right: 24,
            width: 320,
            background: '#FFFFFF',
            border: '2px solid #EF4444',
            borderRadius: '12px',
            boxShadow: '0 8px 30px rgba(239,68,68,0.22)',
            zIndex: 10000,
            padding: '1rem',
            animation: 'fadeInSlide 0.25s ease-out'
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#EF4444', fontWeight: 800, fontSize: '0.9rem' }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              <span>Critical Alert</span>
            </div>
            <button
              onClick={() => setPopupAlert(null)}
              style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: '0.95rem', padding: 2 }}
            >
              ✕
            </button>
          </div>

          {/* Title & Badge */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
            <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.25 }}>
              {popupAlert.title}
            </div>
            <span style={{ background: '#EF4444', color: '#FFFFFF', padding: '2px 8px', borderRadius: '10px', fontSize: '0.68rem', fontWeight: 800, flexShrink: 0 }}>
              Critical
            </span>
          </div>

          {/* Location & Time */}
          <div style={{ fontSize: '0.76rem', color: '#475569', marginBottom: '2px', fontWeight: 600 }}>
            {popupAlert.location}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginBottom: '12px' }}>
            {popupAlert.timestamp}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => {
                setSelectedAlertId(popupAlert.id);
                setPopupAlert(null);
              }}
              style={{ flex: 1, padding: '0.45rem', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.76rem', fontWeight: 700, color: '#0F172A', cursor: 'pointer' }}
            >
              View Details
            </button>
            <button
              onClick={() => handleAcknowledge(popupAlert.id)}
              style={{ flex: 1, padding: '0.45rem', background: '#EF4444', border: 'none', borderRadius: '6px', fontSize: '0.76rem', fontWeight: 700, color: '#FFFFFF', cursor: 'pointer' }}
            >
              Acknowledge
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* COMPACT ASSIGN MODAL (Matches Requirements 17, 18, 19, 20) */}
      {/* ======================================================== */}
      {showAssignModal && selectedAlert && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(15, 23, 42, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10001,
            backdropFilter: 'blur(2px)'
          }}
        >
          <div
            style={{
              width: 440,
              maxWidth: '92%',
              background: '#FFFFFF',
              borderRadius: '12px',
              padding: '1.25rem',
              boxShadow: '0 12px 36px rgba(0,0,0,0.2)',
              border: '1px solid #E2E8F0'
            }}
          >
            {/* Modal Title */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem' }}>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>Assign Alert</div>
              <button
                onClick={() => setShowAssignModal(false)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: '1rem' }}
              >
                ✕
              </button>
            </div>

            {/* Alert Context */}
            <div style={{ marginBottom: '0.85rem', background: '#F8FAFC', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Alert:</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A' }}>{selectedAlert.title}</div>
              <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: 2 }}>📍 {selectedAlert.location}</div>
            </div>

            {/* Select Authority Dropdown */}
            <div style={{ marginBottom: '0.85rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                Assign To:
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

            {/* Automatically Populated Email */}
            <div style={{ marginBottom: '0.85rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                Recipient Email:
              </label>
              <input
                type="text"
                readOnly
                value={currentAuthority ? currentAuthority.email : ''}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.8rem', background: '#F8FAFC', color: '#64748B', outline: 'none' }}
              />
            </div>

            {/* Message Area */}
            <div style={{ marginBottom: '1.1rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                Message:
              </label>
              <textarea
                rows={3}
                value={assignMessage}
                onChange={(e) => setAssignMessage(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.8rem', color: '#0F172A', outline: 'none', resize: 'none' }}
              />
            </div>

            {/* Feedback alert inside modal if present */}
            {assignFeedback && (
              <div
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  marginBottom: '1rem',
                  background: assignFeedback.type === 'success' ? '#ECFDF5' : '#FEF2F2',
                  color: assignFeedback.type === 'success' ? '#065F46' : '#991B1B',
                  border: assignFeedback.type === 'success' ? '1px solid #A7F3D0' : '1px solid #FCA5A5'
                }}
              >
                {assignFeedback.text}
              </div>
            )}

            {/* Footer Buttons */}
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
                style={{ padding: '0.45rem 1.1rem', background: '#059669', border: 'none', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, color: '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
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
