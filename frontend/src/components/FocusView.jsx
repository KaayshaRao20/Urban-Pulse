import React, { useState, useEffect, useMemo } from 'react';
import { API_BASE } from '../config/api';

export default function FocusView({ timestamp: globalTimestamp }) {
  // Location selection state
  const [selectedLocationId, setSelectedLocationId] = useState('loc-001');
  const [locationsList, setLocationsList] = useState([
    { id: 'loc-001', name: 'Marathahalli – Outer Ring Road', subtext: 'Bengaluru, Karnataka' },
    { id: 'loc-002', name: 'MG Road Interchange', subtext: 'Bengaluru, Karnataka' },
    { id: 'loc-003', name: 'Indiranagar 100ft Road', subtext: 'Bengaluru, Karnataka' },
    { id: 'loc-004', name: 'Whitefield IT Corridor', subtext: 'Bengaluru, Karnataka' },
    { id: 'loc-005', name: 'Koramangala 80ft Junction', subtext: 'Bengaluru, Karnataka' },
    { id: 'loc-006', name: 'Electronic City Phase 1', subtext: 'Bengaluru, Karnataka' },
    { id: 'loc-007', name: 'Hebbal Flyover Junction', subtext: 'Bengaluru, Karnataka' }
  ]);

  // Selected feature matching chips (Default in screenshot: Traffic, Crowd, Weather, Road checked)
  const [selectedFeatures, setSelectedFeatures] = useState(['traffic', 'crowd', 'weather', 'road']);
  const [alertsActive, setAlertsActive] = useState(false);

  // Live Focus data & analysis states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdatedTime, setLastUpdatedTime] = useState('21 Oct 2026, 09:40:37');

  // Interactive drawer / modal for Action Advisories & Key Incident
  const [selectedActionModal, setSelectedActionModal] = useState(null);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [commentInputText, setCommentInputText] = useState('');
  const [toastMessage, setToastMessage] = useState(null);

  // Collapsible states
  const [isTrajectoryOpen, setIsTrajectoryOpen] = useState(true);
  const [isAttributionOpen, setIsAttributionOpen] = useState(true);
  const [isAdvisoryOpen, setIsAdvisoryOpen] = useState(true);

  // Core Focus Intelligence Telemetry State
  const [focusData, setFocusData] = useState({
    location: { id: 'loc-001', name: 'Marathahalli – Outer Ring Road', subtext: 'Bengaluru, Karnataka' },
    timestamp: '21 Oct 2026, 09:40:37',
    situation: 'High Urban Pressure',
    severity: 'High',
    confidence: 87,
    situation_summary: 'Increasing traffic volume combined with high crowd density and clear weather is creating elevated urban pressure at this location.',
    key_issue: 'High traffic congestion with elevated crowd density.',
    key_issue_sub: 'The combination of increasing traffic volume and high crowd density with light rainfall is creating significant pressure on mobility at this location.',
    key_tags: ['Traffic', 'Crowd', 'Weather', 'Road'],
    kpis: {
      traffic: { level: 'High', trend: '↑ 18% vs baseline', detail: '18 km/h • 6,500 veh/hr', trendColor: '#EF4444' },
      crowd: { level: 'High', trend: '↑ 22% vs baseline', detail: '520 people/km²', trendColor: '#EF4444' },
      weather: { level: 'Light Rain', status: 'Stable', detail: '24°C • 3.2 mm' },
      road: { level: 'Slower', trend: '↑ 12% delay', detail: 'Urban Arterial', trendColor: '#EF4444' }
    },
    trends: {
      traffic_pct: '+42%',
      crowd_pct: '+22%',
      rainfall_mm: '3.2 mm',
      timestamps: ['12:30', '13:00', '13:30', '14:00', '14:30']
    },
    trajectory: [
      { param: 'Traffic', state: '6,500 veh/hr', trend: '↑ +18%', trendColor: '#EF4444', status: 'Increasing', statusType: 'danger' },
      { param: 'Crowd', state: '520 people/km²', trend: '↑ +22%', trendColor: '#EF4444', status: 'Increasing', statusType: 'danger' },
      { param: 'Weather', state: '24°C, 3.2 mm', trend: '—', trendColor: '#64748B', status: 'Stable', statusType: 'success' },
      { param: 'Road Friction', state: 'Decreasing', trend: '↓ -12%', trendColor: '#EF4444', status: 'Deteriorating', statusType: 'warning' }
    ],
    attributions: [
      'Traffic volume is 42% above the typical range for this location and time.',
      'Crowd density is significantly elevated, indicating increased pedestrian activity.',
      'Light rainfall may reduce effective road capacity.',
      'Combined effect is creating high urban pressure and reduced mobility.'
    ],
    advisories: [
      {
        id: 'act_1',
        title: 'Traffic Advisory',
        text: 'Traffic is increasing at this location. Communicate congestion information to nearby commuters.',
        icon: 'traffic',
        status: 'Approved',
        comments: []
      },
      {
        id: 'act_2',
        title: 'Crowd Advisory',
        text: 'Crowd density is increasing. Notify the relevant field team and field marshals.',
        icon: 'crowd',
        status: 'Approved',
        comments: []
      },
      {
        id: 'act_3',
        title: 'Personnel Dispatch',
        text: 'Deploy traffic control personnel to optimize key intersection discharge.',
        icon: 'dispatch',
        status: 'Pending',
        comments: []
      },
      {
        id: 'act_4',
        title: 'Public Channel Broadcast',
        text: 'Inform commuters through public VMS displays and mobile alert channels.',
        icon: 'broadcast',
        status: 'Pending',
        comments: []
      }
    ],
    impact_assessment: [
      { category: 'Mobility', status: 'High', level_pct: 85, color: '#EF4444' },
      { category: 'Crowd Movement', status: 'High', level_pct: 75, color: '#EF4444' },
      { category: 'Road Condition', status: 'Moderate', level_pct: 50, color: '#F97316' },
      { category: 'Public Safety', status: 'Low', level_pct: 25, color: '#10B981' }
    ]
  });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch initial location list
  // Fetch initial location list and trigger live analysis sync
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await fetch(`${API_BASE}/focus/locations`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setLocationsList(data);
            runFocusAnalysis(data[0].id, selectedFeatures);
            return;
          }
        }
      } catch (e) {
        console.log("Locations fetch note:", e);
      }
      runFocusAnalysis(selectedLocationId, selectedFeatures);
    };
    fetchLocations();
  }, []);

  // Run Focus Analysis whenever location or features change
  const runFocusAnalysis = async (locId = selectedLocationId, feats = selectedFeatures) => {
    setIsAnalyzing(true);
    try {
      const res = await fetch(`${API_BASE}/focus/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location_id: locId, features: feats })
      });
      if (res.ok) {
        const data = await res.json();
        setFocusData(prev => ({
          ...prev,
          ...data,
          situation: data.situation || prev.situation,
          severity: data.severity || prev.severity,
          confidence: data.confidence || prev.confidence,
          situation_summary: data.situation_summary || prev.situation_summary,
          key_issue: data.key_issue || prev.key_issue,
          key_issue_sub: data.key_issue_sub || prev.key_issue_sub,
          kpis: data.kpis || prev.kpis,
          trends: data.trends || prev.trends,
          trajectory: data.trajectory || prev.trajectory,
          attributions: data.attributions || (data.why_result && data.why_result.length ? data.why_result : prev.attributions),
          advisories: data.advisories || prev.advisories,
          impact_assessment: data.impact_assessment || prev.impact_assessment
        }));
        if (data.timestamp) {
          setLastUpdatedTime(data.timestamp);
        }
      }
    } catch (e) {
      console.log("Focus analysis note:", e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await runFocusAnalysis(selectedLocationId, selectedFeatures);
    setTimeout(() => {
      setIsRefreshing(false);
      showToast("Corridor telemetry refreshed successfully.");
    }, 450);
  };

  const toggleFeature = (featureKey) => {
    let updated;
    if (selectedFeatures.includes(featureKey)) {
      updated = selectedFeatures.filter(f => f !== featureKey);
    } else {
      updated = [...selectedFeatures, featureKey];
    }
    setSelectedFeatures(updated);
    runFocusAnalysis(selectedLocationId, updated);
  };

  const handleLocationChange = (locId) => {
    setSelectedLocationId(locId);
    runFocusAnalysis(locId, selectedFeatures);
  };

  // Action handlers
  const handleApproveAction = async (actId) => {
    setFocusData(prev => ({
      ...prev,
      advisories: prev.advisories.map(a => a.id === actId ? { ...a, status: 'Approved' } : a)
    }));
    try {
      await fetch(`${API_BASE}/focus/actions/${actId}/approve`, { method: 'POST' });
    } catch (e) {
      console.log(e);
    }
    showToast("Advisory authorized for field dispatch.");
    if (selectedActionModal?.id === actId) {
      setSelectedActionModal(prev => prev ? { ...prev, status: 'Approved' } : null);
    }
  };

  const handleRejectAction = async (actId) => {
    setFocusData(prev => ({
      ...prev,
      advisories: prev.advisories.map(a => a.id === actId ? { ...a, status: 'Rejected' } : a)
    }));
    try {
      await fetch(`${API_BASE}/focus/actions/${actId}/reject`, { method: 'POST' });
    } catch (e) {
      console.log(e);
    }
    showToast("Advisory dismissed.");
    if (selectedActionModal?.id === actId) {
      setSelectedActionModal(prev => prev ? { ...prev, status: 'Rejected' } : null);
    }
  };

  const handleAddComment = async (actId) => {
    if (!commentInputText.trim()) return;
    const newComment = {
      comment: commentInputText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      author: 'Officer (Control 01)'
    };
    setFocusData(prev => ({
      ...prev,
      advisories: prev.advisories.map(a => 
        a.id === actId ? { ...a, comments: [...(a.comments || []), newComment] } : a
      )
    }));
    setCommentInputText('');
    showToast("Operational comment logged.");
    if (selectedActionModal?.id === actId) {
      setSelectedActionModal(prev => prev ? { ...prev, comments: [...(prev.comments || []), newComment] } : null);
    }
  };

  const currentLocationObj = useMemo(() => {
    return locationsList.find(l => l.id === selectedLocationId) || locationsList[0];
  }, [locationsList, selectedLocationId]);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F8FAFC',
      padding: '1.25rem 1.75rem',
      color: '#0F172A',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          background: '#0F172A',
          color: '#FFFFFF',
          padding: '10px 18px',
          borderRadius: 8,
          fontSize: '0.82rem',
          fontWeight: 600,
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          animation: 'fadeIn 0.2s ease'
        }}>
          <span style={{ color: '#10B981' }}>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP HEADER (Matching media_1792576361396_d6a8def5.png) */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.1rem',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <h1 style={{
            fontSize: '1.45rem',
            fontWeight: 800,
            color: '#0F172A',
            letterSpacing: '-0.4px',
            margin: 0,
            lineHeight: 1.2
          }}>
            Focus Intelligence
          </h1>
          <p style={{
            fontSize: '0.82rem',
            color: '#64748B',
            marginTop: '3px',
            marginBottom: 0,
            fontWeight: 400
          }}>
            Targeted micro-corridor telemetry with multi-feature correlation and operational guidance.
          </p>
        </div>

        {/* Top-Right Pill Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          
          {/* Location Selector Pill */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '20px',
            padding: '5px 14px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
            position: 'relative'
          }}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="#EF4444" stroke="#EF4444" strokeWidth="1">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
            <select
              value={selectedLocationId}
              onChange={(e) => handleLocationChange(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '0.78rem',
                fontWeight: 600,
                color: '#0F172A',
                outline: 'none',
                cursor: 'pointer',
                paddingRight: '16px',
                appearance: 'none'
              }}
            >
              {locationsList.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
            <svg viewBox="0 0 24 24" width="12" height="12" stroke="#64748B" fill="none" strokeWidth="2.5" style={{ position: 'absolute', right: 12, pointerEvents: 'none' }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>

          {/* Live Status Pill */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: '#F0FDF4',
            border: '1px solid #BBF7D0',
            borderRadius: '20px',
            padding: '5px 12px'
          }}>
            <div style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              backgroundColor: '#16A34A',
              boxShadow: '0 0 0 2px rgba(22, 163, 74, 0.2)'
            }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#15803D' }}>Live</span>
          </div>

          {/* Last Updated Timestamp */}
          <div style={{ textAlign: 'left', lineHeight: 1.25, paddingLeft: 2, paddingRight: 4 }}>
            <div style={{ fontSize: '0.65rem', color: '#94A3B8', fontWeight: 500 }}>Last updated</div>
            <div style={{ fontSize: '0.73rem', color: '#1E293B', fontWeight: 600 }}>{lastUpdatedTime}</div>
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '0.76rem',
              fontWeight: 600,
              color: '#1E293B',
              cursor: isRefreshing ? 'not-allowed' : 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
              transition: 'all 0.15s ease'
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width="13"
              height="13"
              stroke="#1E293B"
              fill="none"
              strokeWidth="2.2"
              style={{ animation: isRefreshing ? 'spin 0.8s linear infinite' : 'none' }}
            >
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            <span>Refresh</span>
          </button>

        </div>
      </div>

      {/* MAIN 3-COLUMN LAYOUT (Matching media_1792576361396_d6a8def5.png) */}
      <div className="focus-main-grid" style={{
        display: 'grid',
        gridTemplateColumns: '235px minmax(0, 1fr) 295px',
        gap: '14px',
        alignItems: 'start'
      }}>

        {/* ================================================================= */}
        {/* COLUMN 1: LEFT CONTROLS (Location & Feature Matching)             */}
        {/* ================================================================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          {/* Card 1: Location & Analysis */}
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '14px 16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>
              Location & Analysis
            </div>
            
            <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 500, marginBottom: '5px' }}>
              Location
            </div>

            <div style={{ position: 'relative', marginBottom: '10px' }}>
              <select
                value={selectedLocationId}
                onChange={(e) => handleLocationChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  color: '#1E293B',
                  outline: 'none',
                  appearance: 'none',
                  backgroundColor: '#FFFFFF',
                  cursor: 'pointer'
                }}
              >
                {locationsList.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
              <svg viewBox="0 0 24 24" width="12" height="12" stroke="#64748B" fill="none" strokeWidth="2.5" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>

            <button
              onClick={() => handleLocationChange('loc-001')}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                background: '#1E293B',
                color: '#FFFFFF',
                border: 'none',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.15s ease'
              }}
            >
              <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" strokeWidth="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>
              </svg>
              <span>Use Current Location</span>
            </button>
          </div>

          {/* Card 2: Feature Matching */}
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '14px 16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 800, color: '#0F172A' }}>
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="#0F172A" fill="none" strokeWidth="2.2">
                <circle cx="12" cy="12" r="10"/>
                <circle cx="12" cy="12" r="4"/>
              </svg>
              <span>Feature Matching</span>
            </div>
            
            <p style={{
              fontSize: '0.7rem',
              color: '#64748B',
              marginTop: '4px',
              marginBottom: '12px',
              lineHeight: 1.35
            }}>
              Select live features to analyse their combined pressure.
            </p>

            {/* 2x3 Grid of Feature Pills */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {[
                {
                  key: 'traffic',
                  label: 'Traffic',
                  icon: (
                    <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="8" rx="2"/>
                      <path d="M5 11l2-5h10l2 5"/>
                      <circle cx="7.5" cy="15.5" r="1.5"/>
                      <circle cx="16.5" cy="15.5" r="1.5"/>
                    </svg>
                  )
                },
                {
                  key: 'crowd',
                  label: 'Crowd',
                  icon: (
                    <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    </svg>
                  )
                },
                {
                  key: 'weather',
                  label: 'Weather',
                  icon: (
                    <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" strokeWidth="2">
                      <path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/>
                    </svg>
                  )
                },
                {
                  key: 'road',
                  label: 'Road',
                  icon: (
                    <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" strokeWidth="2">
                      <path d="M4 19L9 5M20 19L15 5M12 5v14"/>
                    </svg>
                  )
                },
                {
                  key: 'time',
                  label: 'Time',
                  icon: (
                    <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12 6 12 12 16 14"/>
                    </svg>
                  )
                },
                {
                  key: 'transit',
                  label: 'Transit',
                  icon: (
                    <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" strokeWidth="2">
                      <rect x="4" y="4" width="16" height="12" rx="2"/>
                      <path d="M6 18h12M8 20v2M16 20v2"/>
                    </svg>
                  )
                }
              ].map(item => {
                const isSelected = selectedFeatures.includes(item.key);
                return (
                  <button
                    key={item.key}
                    onClick={() => toggleFeature(item.key)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      padding: '7px 10px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      outline: 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#1E293B', fontSize: '0.74rem', fontWeight: 600 }}>
                      {item.icon}
                      <span>{item.label}</span>
                    </div>

                    {/* Radio/Checkbox indicator: Blue solid with checkmark when checked, empty circle when unchecked */}
                    {isSelected ? (
                      <div style={{
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        backgroundColor: '#2563EB',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <svg viewBox="0 0 24 24" width="10" height="10" stroke="#FFFFFF" fill="none" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      </div>
                    ) : (
                      <div style={{
                        width: 15,
                        height: 15,
                        borderRadius: '50%',
                        border: '1.5px solid #CBD5E1',
                        flexShrink: 0
                      }} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Bottom Button: Alerts & Incidents */}
            <button
              onClick={() => {
                setAlertsActive(!alertsActive);
                showToast(alertsActive ? "Corridor incident filter cleared" : "Highlighting corridor alerts and active incident markers");
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: alertsActive ? '#FEF2F2' : '#FFFFFF',
                border: alertsActive ? '1.5px solid #EF4444' : '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: alertsActive ? '#B91C1C' : '#1E293B',
                cursor: 'pointer',
                marginTop: '10px',
                transition: 'all 0.15s ease'
              }}
            >
              <svg viewBox="0 0 24 24" width="13" height="13" stroke="#F59E0B" fill="none" strokeWidth="2.2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <span>Alerts & Incidents</span>
            </button>

          </div>

        </div>

        {/* ================================================================= */}
        {/* COLUMN 2: CENTER MAIN DASHBOARD                                   */}
        {/* ================================================================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          {/* Card 1: High Urban Pressure Alert Banner */}
          <div style={{
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '12px',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px',
            boxShadow: '0 1px 2px rgba(239, 68, 68, 0.05)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
              {/* Red Circle with Exclamation */}
              <div style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                backgroundColor: '#EF4444',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem',
                fontWeight: 900,
                flexShrink: 0
              }}>
                !
              </div>

              <div>
                <h3 style={{
                  fontSize: '0.98rem',
                  fontWeight: 800,
                  color: '#B91C1C',
                  margin: 0,
                  lineHeight: 1.2
                }}>
                  {focusData.situation}
                </h3>
                <p style={{
                  fontSize: '0.74rem',
                  color: '#7F1D1D',
                  margin: '3px 0 0 0',
                  lineHeight: 1.35,
                  maxWidth: '540px'
                }}>
                  {focusData.situation_summary}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                  <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 500 }}>Severity</span>
                  <span style={{
                    background: '#EF4444',
                    color: '#FFFFFF',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '0.7rem',
                    fontWeight: 800
                  }}>
                    {focusData.severity}
                  </span>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 500 }}>
                  Confidence <strong style={{ color: '#0F172A', fontWeight: 800 }}>{focusData.confidence}%</strong>
                </div>
              </div>

              <div
                onClick={() => setShowIncidentModal(true)}
                style={{ cursor: 'pointer', color: '#94A3B8', padding: '4px', display: 'flex', alignItems: 'center' }}
                title="View full pressure analysis"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" strokeWidth="2.5">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Row of 4 KPI Metric Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '10px'
          }}>
            
            {/* KPI 1: Traffic */}
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '12px 14px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '4px' }}>
                <div style={{
                  width: 24,
                  height: 24,
                  borderRadius: '6px',
                  background: '#FEE2E2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#EF4444'
                }}>
                  <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="8" rx="2"/>
                    <path d="M5 11l2-5h10l2 5"/>
                    <circle cx="7.5" cy="15.5" r="1.5"/>
                    <circle cx="16.5" cy="15.5" r="1.5"/>
                  </svg>
                </div>
                <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Traffic</span>
              </div>
              <div style={{ fontSize: '1.12rem', fontWeight: 800, color: '#EF4444', lineHeight: 1.1 }}>
                {focusData.kpis.traffic.level}
              </div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#EF4444', marginTop: '3px' }}>
                {focusData.kpis.traffic.trend}
              </div>
              <div style={{ fontSize: '0.67rem', color: '#64748B', marginTop: '2px', fontWeight: 500 }}>
                {focusData.kpis.traffic.detail}
              </div>
            </div>

            {/* KPI 2: Crowd */}
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '12px 14px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '4px' }}>
                <div style={{
                  width: 24,
                  height: 24,
                  borderRadius: '6px',
                  background: '#DBEAFE',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#2563EB'
                }}>
                  <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                  </svg>
                </div>
                <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Crowd</span>
              </div>
              <div style={{ fontSize: '1.12rem', fontWeight: 800, color: '#2563EB', lineHeight: 1.1 }}>
                {focusData.kpis.crowd.level}
              </div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#EF4444', marginTop: '3px' }}>
                {focusData.kpis.crowd.trend}
              </div>
              <div style={{ fontSize: '0.67rem', color: '#64748B', marginTop: '2px', fontWeight: 500 }}>
                {focusData.kpis.crowd.detail}
              </div>
            </div>

            {/* KPI 3: Weather */}
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '12px 14px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '4px' }}>
                <div style={{
                  width: 24,
                  height: 24,
                  borderRadius: '6px',
                  background: '#E0F2FE',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0284C7'
                }}>
                  <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2">
                    <path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/>
                    <path d="M8 19v2m4-2v2m4-2v2"/>
                  </svg>
                </div>
                <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Weather</span>
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}>
                {focusData.kpis.weather.level}
              </div>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748B', marginTop: '3px' }}>
                {focusData.kpis.weather.status}
              </div>
              <div style={{ fontSize: '0.67rem', color: '#64748B', marginTop: '2px', fontWeight: 500 }}>
                {focusData.kpis.weather.detail}
              </div>
            </div>

            {/* KPI 4: Road Flow */}
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '12px 14px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '4px' }}>
                <div style={{
                  width: 24,
                  height: 24,
                  borderRadius: '6px',
                  background: '#DCFCE7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#16A34A',
                  fontWeight: 800,
                  fontSize: '0.75rem'
                }}>
                  A
                </div>
                <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Road Flow</span>
              </div>
              <div style={{ fontSize: '1.12rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}>
                {focusData.kpis.road.level}
              </div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#EF4444', marginTop: '3px' }}>
                {focusData.kpis.road.trend}
              </div>
              <div style={{ fontSize: '0.67rem', color: '#64748B', marginTop: '2px', fontWeight: 500 }}>
                {focusData.kpis.road.detail}
              </div>
            </div>

          </div>

          {/* Card 3: Trends (Last 2 Hours) - With 3 Side-by-Side SVG Micro-Charts */}
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '14px 18px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0F172A', marginBottom: '12px' }}>
              Trends (Last 2 Hours)
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '16px'
            }}>
              
              {/* Micro-Chart 1: Traffic Volume */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#1E293B' }}>Traffic Volume <span style={{ fontSize: '0.65rem', color: '#94A3B8' }}>(veh/hr)</span></span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#EF4444' }}>{focusData.trends?.traffic_pct || '↑ 42%'}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', height: 75 }}>
                  {/* Y Axis labels */}
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '60px', paddingRight: '6px', fontSize: '0.62rem', color: '#94A3B8', fontWeight: 500, textAlign: 'right', minWidth: '22px' }}>
                    <span>10K</span>
                    <span>5K</span>
                    <span>0</span>
                  </div>

                  {/* SVG Line / Area Chart */}
                  <div style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
                    {(() => {
                      const tv = focusData.trends?.traffic_volume || [3200, 4100, 5300, 6100, 6500];
                      const maxV = 10000;
                      const y0 = Math.round(55 - (tv[0] / maxV) * 48);
                      const y1 = Math.round(55 - (tv[1] / maxV) * 48);
                      const y2 = Math.round(55 - (tv[2] / maxV) * 48);
                      const y3 = Math.round(55 - (tv[3] / maxV) * 48);
                      const y4 = Math.round(55 - (tv[4] / maxV) * 48);
                      const curvePath = `M 5 ${y0} C 45 ${y1}, 95 ${y2}, 145 ${y3} C 170 ${y3}, 185 ${y4}, 195 ${y4}`;
                      const areaPath = `${curvePath} L 195 55 L 5 55 Z`;
                      return (
                        <svg viewBox="0 0 200 60" style={{ width: '100%', height: 60, overflow: 'visible' }}>
                          <defs>
                            <linearGradient id="trafficGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#EF4444" stopOpacity="0.35"/>
                              <stop offset="100%" stopColor="#EF4444" stopOpacity="0.0"/>
                            </linearGradient>
                          </defs>
                          <line x1="0" y1="5" x2="200" y2="5" stroke="#F1F5F9" strokeWidth="1"/>
                          <line x1="0" y1="30" x2="200" y2="30" stroke="#F1F5F9" strokeWidth="1"/>
                          <line x1="0" y1="55" x2="200" y2="55" stroke="#F1F5F9" strokeWidth="1"/>
                          <path d={areaPath} fill="url(#trafficGradient)" />
                          <path d={curvePath} fill="none" stroke="#EF4444" strokeWidth="2.2" strokeLinecap="round" />
                        </svg>
                      );
                    })()}

                    {/* X-axis Timestamps */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: '#94A3B8', fontWeight: 500, marginTop: '2px' }}>
                      {(focusData.trends?.timestamps || ['12:30', '13:00', '13:30', '14:00', '14:30']).map((t, idx) => (
                        <span key={idx}>{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Micro-Chart 2: Crowd Density */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#1E293B' }}>Crowd Density <span style={{ fontSize: '0.65rem', color: '#94A3B8' }}>(people/km²)</span></span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#2563EB' }}>{focusData.trends?.crowd_pct || '↑ 22%'}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', height: 75 }}>
                  {/* Y Axis labels */}
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '60px', paddingRight: '6px', fontSize: '0.62rem', color: '#94A3B8', fontWeight: 500, textAlign: 'right', minWidth: '22px' }}>
                    <span>800</span>
                    <span>400</span>
                    <span>0</span>
                  </div>

                  {/* SVG Line / Area Chart */}
                  <div style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
                    {(() => {
                      const cv = focusData.trends?.crowd_density || [310, 380, 440, 490, 520];
                      const maxC = 800;
                      const y0 = Math.round(55 - (cv[0] / maxC) * 48);
                      const y1 = Math.round(55 - (cv[1] / maxC) * 48);
                      const y2 = Math.round(55 - (cv[2] / maxC) * 48);
                      const y3 = Math.round(55 - (cv[3] / maxC) * 48);
                      const y4 = Math.round(55 - (cv[4] / maxC) * 48);
                      const curvePath = `M 5 ${y0} C 45 ${y1}, 95 ${y2}, 145 ${y3} C 170 ${y3}, 185 ${y4}, 195 ${y4}`;
                      const areaPath = `${curvePath} L 195 55 L 5 55 Z`;
                      return (
                        <svg viewBox="0 0 200 60" style={{ width: '100%', height: 60, overflow: 'visible' }}>
                          <defs>
                            <linearGradient id="crowdGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#2563EB" stopOpacity="0.3"/>
                              <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0"/>
                            </linearGradient>
                          </defs>
                          <line x1="0" y1="5" x2="200" y2="5" stroke="#F1F5F9" strokeWidth="1"/>
                          <line x1="0" y1="30" x2="200" y2="30" stroke="#F1F5F9" strokeWidth="1"/>
                          <line x1="0" y1="55" x2="200" y2="55" stroke="#F1F5F9" strokeWidth="1"/>
                          <path d={areaPath} fill="url(#crowdGradient)" />
                          <path d={curvePath} fill="none" stroke="#2563EB" strokeWidth="2.2" strokeLinecap="round" />
                        </svg>
                      );
                    })()}

                    {/* X-axis Timestamps */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: '#94A3B8', fontWeight: 500, marginTop: '2px' }}>
                      {(focusData.trends?.timestamps || ['12:30', '13:00', '13:30', '14:00', '14:30']).map((t, idx) => (
                        <span key={idx}>{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Micro-Chart 3: Rainfall */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#1E293B' }}>Rainfall <span style={{ fontSize: '0.65rem', color: '#94A3B8' }}>(mm)</span></span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#16A34A' }}>{focusData.trends?.rainfall_mm || '3.2 mm'}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', height: 75 }}>
                  {/* Y Axis labels */}
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '60px', paddingRight: '6px', fontSize: '0.62rem', color: '#94A3B8', fontWeight: 500, textAlign: 'right', minWidth: '16px' }}>
                    <span>6</span>
                    <span>3</span>
                    <span>0</span>
                  </div>

                  {/* SVG Bar Chart */}
                  <div style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
                    {(() => {
                      const rv = focusData.trends?.rainfall || [1.0, 2.4, 3.8, 3.2, 2.4];
                      const maxR = 6.0;
                      const xs = [24, 64, 104, 144, 180];
                      return (
                        <svg viewBox="0 0 200 60" style={{ width: '100%', height: 60, overflow: 'visible' }}>
                          <line x1="0" y1="5" x2="200" y2="5" stroke="#F1F5F9" strokeWidth="1"/>
                          <line x1="0" y1="30" x2="200" y2="30" stroke="#F1F5F9" strokeWidth="1"/>
                          <line x1="0" y1="55" x2="200" y2="55" stroke="#F1F5F9" strokeWidth="1"/>
                          {rv.map((r, idx) => {
                            const h = Math.min(50, Math.max(2, (r / maxR) * 50));
                            const y = 55 - h;
                            return (
                              <rect key={idx} x={xs[idx]} y={y} width="8" height={h} fill="#10B981" rx="2" />
                            );
                          })}
                        </svg>
                      );
                    })()}

                    {/* X-axis Timestamps */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: '#94A3B8', fontWeight: 500, marginTop: '2px' }}>
                      {(focusData.trends?.timestamps || ['12:30', '13:00', '13:30', '14:00', '14:30']).map((t, idx) => (
                        <span key={idx}>{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Bottom Row: Parameter Trajectory & Pattern Attribution (2 Equal Columns) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px'
          }}>
            
            {/* Left Card: Parameter Trajectory */}
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '14px 16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}>
              <div
                onClick={() => setIsTrajectoryOpen(!isTrajectoryOpen)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: isTrajectoryOpen ? '10px' : 0,
                  cursor: 'pointer'
                }}
              >
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0F172A' }}>
                  Parameter Trajectory
                </div>
                <svg
                  viewBox="0 0 24 24"
                  width="14"
                  height="14"
                  stroke="#64748B"
                  fill="none"
                  strokeWidth="2.5"
                  style={{ transform: isTrajectoryOpen ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.2s ease' }}
                >
                  <polyline points="18 15 12 9 6 15"/>
                </svg>
              </div>

              {isTrajectoryOpen && (
                <div style={{ width: '100%', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.72rem' }}>
                    <thead>
                      <tr style={{ color: '#94A3B8', fontWeight: 600, borderBottom: '1px solid #F1F5F9' }}>
                        <th style={{ paddingBottom: '6px', fontWeight: 600 }}>Parameter</th>
                        <th style={{ paddingBottom: '6px', fontWeight: 600 }}>Current State</th>
                        <th style={{ paddingBottom: '6px', fontWeight: 600 }}>Trend (vs. Baseline)</th>
                        <th style={{ paddingBottom: '6px', fontWeight: 600, textAlign: 'right' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {focusData.trajectory.map((row, idx) => (
                        <tr key={idx} style={{ borderBottom: idx < focusData.trajectory.length - 1 ? '1px solid #F8FAFC' : 'none' }}>
                          <td style={{ padding: '8px 0', fontWeight: 600, color: '#1E293B' }}>{row.param}</td>
                          <td style={{ padding: '8px 0', color: '#475569', fontWeight: 500 }}>{row.state}</td>
                          <td style={{ padding: '8px 0', fontWeight: 700, color: row.trendColor }}>{row.trend}</td>
                          <td style={{ padding: '8px 0', textAlign: 'right' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.67rem',
                              fontWeight: 700,
                              background: row.statusType === 'danger' ? '#FEF2F2' : row.statusType === 'success' ? '#ECFDF5' : '#FEF3C7',
                              color: row.statusType === 'danger' ? '#EF4444' : row.statusType === 'success' ? '#15803D' : '#D97706'
                            }}>
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Right Card: Pattern Attribution */}
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '14px 16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}>
              <div
                onClick={() => setIsAttributionOpen(!isAttributionOpen)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: isAttributionOpen ? '10px' : 0,
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 800, color: '#0F172A' }}>
                  <svg viewBox="0 0 24 24" width="14" height="14" stroke="#0F172A" fill="none" strokeWidth="2.2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                  </svg>
                  <span>Pattern Attribution</span>
                </div>
                <svg
                  viewBox="0 0 24 24"
                  width="14"
                  height="14"
                  stroke="#64748B"
                  fill="none"
                  strokeWidth="2.5"
                  style={{ transform: isAttributionOpen ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.2s ease' }}
                >
                  <polyline points="18 15 12 9 6 15"/>
                </svg>
              </div>

              {isAttributionOpen && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {focusData.attributions.map((text, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.72rem', color: '#334155', lineHeight: 1.4 }}>
                      <div style={{
                        width: 17,
                        height: 17,
                        borderRadius: '50%',
                        backgroundColor: '#2563EB',
                        color: '#FFFFFF',
                        fontSize: '0.65rem',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: '1px'
                      }}>
                        {idx + 1}
                      </div>
                      <span>{text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>

        {/* ================================================================= */}
        {/* COLUMN 3: RIGHT PANEL (Key Incident, Advisory & Impact)           */}
        {/* ================================================================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          {/* Card 1: Key Incident */}
          <div
            onClick={() => setShowIncidentModal(true)}
            style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '14px 16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              cursor: 'pointer',
              transition: 'border-color 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 800, color: '#0F172A' }}>
                <div style={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: '#EF4444',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.7rem',
                  fontWeight: 900
                }}>
                  !
                </div>
                <span>Key Incident</span>
              </div>
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="#94A3B8" fill="none" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>

            <h4 style={{
              fontSize: '0.8rem',
              fontWeight: 800,
              color: '#0F172A',
              margin: '6px 0 4px 0',
              lineHeight: 1.3
            }}>
              {focusData.key_issue}
            </h4>

            <p style={{
              fontSize: '0.7rem',
              color: '#64748B',
              margin: '0 0 10px 0',
              lineHeight: 1.4
            }}>
              {focusData.key_issue_sub}
            </p>

            {/* Category Tags matching image */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              <span style={{ background: '#FEE2E2', color: '#EF4444', fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px' }}>
                Traffic
              </span>
              <span style={{ background: '#DBEAFE', color: '#2563EB', fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px' }}>
                Crowd
              </span>
              <span style={{ background: '#E0F2FE', color: '#0284C7', fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px' }}>
                Weather
              </span>
              <span style={{ background: '#DCFCE7', color: '#16A34A', fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px' }}>
                Road
              </span>
            </div>
          </div>

          {/* Card 2: Advisory & Response */}
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '14px 16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            <div
              onClick={() => setIsAdvisoryOpen(!isAdvisoryOpen)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: isAdvisoryOpen ? '10px' : 0,
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 800, color: '#0F172A' }}>
                <svg viewBox="0 0 24 24" width="14" height="14" stroke="#EF4444" fill="none" strokeWidth="2.2">
                  <path d="M11 5L6 9H2v6h4l5 4V5z"/>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
                </svg>
                <span>Advisory & Response</span>
              </div>
              <svg
                viewBox="0 0 24 24"
                width="14"
                height="14"
                stroke="#64748B"
                fill="none"
                strokeWidth="2.5"
                style={{ transform: isAdvisoryOpen ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.2s ease' }}
              >
                <polyline points="18 15 12 9 6 15"/>
              </svg>
            </div>

            {isAdvisoryOpen && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {focusData.advisories.map((act) => (
                  <div
                    key={act.id}
                    onClick={() => setSelectedActionModal(act)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '6px 4px',
                      cursor: 'pointer',
                      borderRadius: '6px',
                      transition: 'background 0.15s ease'
                    }}
                  >
                    {/* Advisory Icon Box */}
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: act.icon === 'traffic' ? '#FEE2E2' : act.icon === 'crowd' ? '#DBEAFE' : act.icon === 'dispatch' ? '#DCFCE7' : '#FEE2E2',
                      color: act.icon === 'traffic' ? '#EF4444' : act.icon === 'crowd' ? '#2563EB' : act.icon === 'dispatch' ? '#16A34A' : '#EF4444',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {act.icon === 'traffic' && (
                        <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" strokeWidth="2">
                          <rect x="3" y="11" width="18" height="8" rx="2"/>
                          <path d="M5 11l2-5h10l2 5"/>
                        </svg>
                      )}
                      {act.icon === 'crowd' && (
                        <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" strokeWidth="2">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                          <circle cx="9" cy="7" r="4"/>
                        </svg>
                      )}
                      {act.icon === 'dispatch' && (
                        <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" strokeWidth="2">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        </svg>
                      )}
                      {act.icon === 'broadcast' && (
                        <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" strokeWidth="2">
                          <path d="M11 5L6 9H2v6h4l5 4V5z"/>
                          <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                        </svg>
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0F172A', lineHeight: 1.2 }}>
                        {act.title}
                      </div>
                      <div style={{
                        fontSize: '0.67rem',
                        color: '#64748B',
                        lineHeight: 1.3,
                        marginTop: '2px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                      }}>
                        {act.text}
                      </div>
                    </div>

                    <svg viewBox="0 0 24 24" width="13" height="13" stroke="#94A3B8" fill="none" strokeWidth="2.5" style={{ flexShrink: 0 }}>
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card 3: Impact Assessment */}
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '14px 16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 800, color: '#0F172A', marginBottom: '12px' }}>
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="#0F172A" fill="none" strokeWidth="2.2">
                <line x1="18" y1="20" x2="18" y2="10"/>
                <line x1="12" y1="20" x2="12" y2="4"/>
                <line x1="6" y1="20" x2="6" y2="14"/>
              </svg>
              <span>Impact Assessment</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {focusData.impact_assessment.map((imp, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '95px 1fr 50px', alignItems: 'center', gap: '8px', fontSize: '0.7rem' }}>
                  <span style={{ color: '#475569', fontWeight: 600 }}>{imp.category}</span>
                  
                  {/* Progress Bar Container */}
                  <div style={{ background: '#F1F5F9', height: 6, borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                      backgroundColor: imp.color,
                      width: `${imp.level_pct}%`,
                      height: '100%',
                      borderRadius: 4
                    }} />
                  </div>

                  <span style={{
                    fontWeight: 700,
                    color: imp.color,
                    textAlign: 'right',
                    fontSize: '0.7rem'
                  }}>
                    {imp.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* ================================================================= */}
      {/* INTERACTIVE ADVISORY ACTION MODAL                                */}
      {/* ================================================================= */}
      {selectedActionModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(3px)'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: 12,
            width: '460px',
            maxWidth: '92vw',
            padding: '20px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            border: '1px solid #E2E8F0'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>{selectedActionModal.title}</span>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: 4,
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  background: selectedActionModal.status === 'Approved' ? '#ECFDF5' : selectedActionModal.status === 'Rejected' ? '#FEF2F2' : '#EFF6FF',
                  color: selectedActionModal.status === 'Approved' ? '#059669' : selectedActionModal.status === 'Rejected' ? '#DC2626' : '#2563EB'
                }}>
                  {selectedActionModal.status}
                </span>
              </div>
              <button
                onClick={() => setSelectedActionModal(null)}
                style={{ background: 'transparent', border: 'none', fontSize: '1.1rem', cursor: 'pointer', color: '#64748B' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.45, marginBottom: 16 }}>
              {selectedActionModal.text}
            </p>

            <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 12, marginBottom: 14 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>
                Operational Comments ({selectedActionModal.comments ? selectedActionModal.comments.length : 0})
              </div>
              
              <div style={{ maxHeight: 90, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                {selectedActionModal.comments && selectedActionModal.comments.length > 0 ? (
                  selectedActionModal.comments.map((c, i) => (
                    <div key={i} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '4px 8px', borderRadius: 4, fontSize: '0.68rem', color: '#334155' }}>
                      <strong>{c.author || 'Authority'}:</strong> {c.comment} <span style={{ color: '#94A3B8', marginLeft: 4 }}>({c.timestamp})</span>
                    </div>
                  ))
                ) : (
                  <span style={{ fontSize: '0.68rem', color: '#94A3B8', fontStyle: 'italic' }}>No audit comments recorded yet.</span>
                )}
              </div>

              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="text"
                  placeholder="Add authority directive or notes..."
                  value={commentInputText}
                  onChange={(e) => setCommentInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddComment(selectedActionModal.id)}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    borderRadius: 6,
                    border: '1px solid #CBD5E1',
                    fontSize: '0.74rem',
                    outline: 'none'
                  }}
                />
                <button
                  onClick={() => handleAddComment(selectedActionModal.id)}
                  style={{
                    background: '#1E293B',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 6,
                    padding: '6px 12px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Send
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid #F1F5F9', paddingTop: 12 }}>
              <button
                onClick={() => handleRejectAction(selectedActionModal.id)}
                style={{
                  background: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  color: '#DC2626',
                  borderRadius: 6,
                  padding: '6px 14px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Dismiss Advisory
              </button>
              <button
                onClick={() => handleApproveAction(selectedActionModal.id)}
                style={{
                  background: '#2563EB',
                  border: 'none',
                  color: '#FFFFFF',
                  borderRadius: 6,
                  padding: '6px 16px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(37, 99, 235, 0.25)'
                }}
              >
                Authorize & Dispatch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* KEY INCIDENT DETAILS MODAL                                        */}
      {/* ================================================================= */}
      {showIncidentModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(3px)'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: 12,
            width: '500px',
            maxWidth: '92vw',
            padding: '20px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            border: '1px solid #E2E8F0'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#B91C1C' }}>Key Corridor Incident Dossier</span>
              </div>
              <button
                onClick={() => setShowIncidentModal(false)}
                style={{ background: 'transparent', border: 'none', fontSize: '1.1rem', cursor: 'pointer', color: '#64748B' }}
              >
                ✕
              </button>
            </div>

            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '12px', marginBottom: 14 }}>
              <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#991B1B', marginBottom: 4 }}>
                {focusData.key_issue}
              </div>
              <p style={{ fontSize: '0.74rem', color: '#7F1D1D', margin: 0, lineHeight: 1.4 }}>
                {focusData.key_issue_sub}
              </p>
            </div>

            <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>
              Pattern Attribution & Diagnostic Findings:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
              {focusData.attributions.map((att, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: '#475569' }}>
                  <span style={{ color: '#2563EB', fontWeight: 800 }}>•</span>
                  <span>{att}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowIncidentModal(false)}
                style={{
                  background: '#0F172A',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 6,
                  padding: '7px 16px',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
