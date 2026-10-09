import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:8000/api';

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

  // Selected feature matching chips (default: Traffic, Crowd, Weather selected)
  const [selectedFeatures, setSelectedFeatures] = useState(['traffic', 'crowd', 'weather']);
  const [validationError, setValidationError] = useState('');

  // Live Focus data & analysis states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [focusData, setFocusData] = useState({
    location: { id: 'loc-001', name: 'Marathahalli – Outer Ring Road', subtext: 'Bengaluru, Karnataka' },
    timestamp: '27 Sep 2026 14:32:18',
    situation: 'High Urban Pressure',
    severity: 'High',
    confidence: 87,
    situation_summary: 'Increasing traffic volume combined with high crowd density and light rainfall is creating elevated urban pressure at this location.',
    matched_features_title: 'Traffic + Crowd + Weather',
    key_issue: 'High traffic congestion with elevated crowd density.',
    key_issue_sub: 'The combination of increasing traffic volume and high crowd density with light rainfall is creating significant pressure on mobility at this location.',
    why_result: [
      'Traffic volume is 42% above the typical range for this location and time.',
      'Crowd density is significantly elevated, indicating increased pedestrian activity.',
      'Light rainfall may reduce effective road capacity.',
      'The combination of these factors increases the likelihood of high urban pressure.'
    ],
    actions: [
      {
        id: 'act_1',
        title: 'Traffic Advisory',
        text: 'Traffic is increasing at this location. Communicate congestion information to nearby commuters.',
        status: 'Approved',
        comments: []
      },
      {
        id: 'act_2',
        title: 'Crowd Advisory',
        text: 'Crowd density is increasing. Notify the relevant field team and field marshals.',
        status: 'Approved',
        comments: []
      },
      {
        id: 'act_3',
        title: 'Personnel Dispatch',
        text: 'Deploy traffic control personnel to optimize key intersection discharge.',
        status: 'Pending',
        comments: []
      },
      {
        id: 'act_4',
        title: 'Public Channel Broadcast',
        text: 'Inform commuters through public VMS displays and mobile alert channels.',
        status: 'Pending',
        comments: []
      }
    ],
    impact_assessment: [
      { category: 'Mobility', status: 'High', level_pct: 85, color: '#EF4444' },
      { category: 'Crowd Movement', status: 'Moderate', level_pct: 55, color: '#F97316' },
      { category: 'Road Condition', status: 'Moderate', level_pct: 50, color: '#F97316' },
      { category: 'Public Safety', status: 'Low', level_pct: 25, color: '#059669' }
    ],
    trends: {
      timestamps: ['12:30', '13:00', '13:30', '14:00', '14:30'],
      traffic_volume: [3200, 4100, 5300, 6100, 6500],
      crowd_density: [310, 380, 440, 490, 520],
      rainfall: [1.0, 2.4, 3.8, 3.2, 2.4]
    }
  });

  // Collapsible section states
  const [isTrendsOpen, setIsTrendsOpen] = useState(true);
  const [isIncreasingOpen, setIsIncreasingOpen] = useState(true);
  const [isWhyResultOpen, setIsWhyResultOpen] = useState(true);
  const [isKeyIssueOpen, setIsKeyIssueOpen] = useState(true);
  const [isActionsOpen, setIsActionsOpen] = useState(true);
  const [isImpactOpen, setIsImpactOpen] = useState(true);

  // Active comment popover state
  const [activeCommentActionId, setActiveCommentActionId] = useState(null);
  const [commentInputText, setCommentInputText] = useState('');

  // Fetch Focus Locations list on mount & run live polling
  useEffect(() => {
    fetchLocations();
    runFocusAnalysis('loc-001', ['traffic', 'crowd', 'weather']);

    const interval = setInterval(() => {
      runFocusAnalysis(selectedLocationId, selectedFeatures);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const fetchLocations = async () => {
    try {
      const res = await fetch(`${API_BASE}/focus/locations`);
      if (res.ok) {
        const data = await res.json();
        setLocationsList(data);
      }
    } catch (e) {
      console.log("Locations fetch error:", e);
    }
  };

  // Run Focus Analysis API call
  const runFocusAnalysis = async (locId = selectedLocationId, feats = selectedFeatures) => {
    if (feats.length < 2) {
      setValidationError('Please select at least two live features to perform matching analysis.');
      return;
    }
    setValidationError('');
    setIsAnalyzing(true);

    try {
      const res = await fetch(`${API_BASE}/focus/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location_id: locId,
          features: feats
        })
      });

      if (res.ok) {
        const data = await res.json();
        setFocusData(data);
      }
    } catch (e) {
      console.log("Focus Analysis error:", e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Toggle Feature Chip selection
  const toggleFeatureChip = (featureKey) => {
    let updated;
    if (selectedFeatures.includes(featureKey)) {
      updated = selectedFeatures.filter(f => f !== featureKey);
    } else {
      updated = [...selectedFeatures, featureKey];
    }
    setSelectedFeatures(updated);
    if (updated.length >= 2) setValidationError('');
  };

  // Handle Location Dropdown change
  const handleLocationChange = (locId) => {
    setSelectedLocationId(locId);
    runFocusAnalysis(locId, selectedFeatures);
  };

  // Action Approve/Reject handlers
  const handleApproveAction = async (actId) => {
    const updatedActions = focusData.actions.map(a => a.id === actId ? { ...a, status: 'Approved' } : a);
    setFocusData({ ...focusData, actions: updatedActions });

    try {
      await fetch(`${API_BASE}/focus/actions/${actId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (e) {
      console.log("Action approve error:", e);
    }
  };

  const handleRejectAction = async (actId) => {
    const updatedActions = focusData.actions.map(a => a.id === actId ? { ...a, status: 'Rejected' } : a);
    setFocusData({ ...focusData, actions: updatedActions });

    try {
      await fetch(`${API_BASE}/focus/actions/${actId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (e) {
      console.log("Action reject error:", e);
    }
  };

  // Handle Comment Submission
  const handleAddComment = async (actId) => {
    if (!commentInputText.trim()) return;

    try {
      const res = await fetch(`${API_BASE}/focus/actions/${actId}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: commentInputText })
      });

      if (res.ok) {
        const data = await res.json();
        const updatedActions = focusData.actions.map(a => 
          a.id === actId ? { ...a, comments: data.comments } : a
        );
        setFocusData({ ...focusData, actions: updatedActions });
        setCommentInputText('');
        setActiveCommentActionId(null);
      }
    } catch (e) {
      console.log("Add comment error:", e);
    }
  };

  const currentLocObj = locationsList.find(l => l.id === selectedLocationId) || locationsList[0];

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem', background: '#F8FAFC' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.3px' }}>Focus</h1>
          <p style={{ fontSize: '0.8rem', color: '#64748B', marginTop: 2 }}>Deep-dive into a specific location with live data matching, trend analysis and insights.</p>
        </div>

        {/* Top-Right Location Box & Live Data Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 8, padding: '0.45rem 0.85rem' }}>
            <span style={{ color: '#EF4444', fontSize: '1rem' }}>📍</span>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>{currentLocObj.name}</div>
              <div style={{ fontSize: '0.68rem', color: '#64748B' }}>{currentLocObj.subtext}</div>
            </div>
            <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, stroke: '#64748B', fill: 'none', strokeWidth: 2, marginLeft: 4 }}><path d="M6 9l6 6 6-6"/></svg>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 8, padding: '0.45rem 0.85rem' }}>
            <span style={{ background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0', padding: '2px 8px', borderRadius: 12, fontSize: '0.72rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span className="dot-live"></span> Live Data
            </span>
            <div style={{ fontSize: '0.68rem', color: '#64748B' }}>
              <div>Last Updated</div>
              <strong style={{ color: '#0F172A' }}>{focusData.timestamp || globalTimestamp || '27 Sep 2026 14:32:18'}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Main 3-Column Layout Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr 320px', gap: '1.25rem', alignItems: 'start' }}>
        
        {/* =================================================================== */}
        {/* COLUMN 1: LEFT CONTROLS                                             */}
        {/* =================================================================== */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Card 1: Select Location */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '1.1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.88rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.75rem' }}>
              <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, stroke: '#0F172A', fill: 'none', strokeWidth: 2 }}><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
              <span>Select Location</span>
            </div>

            <select
              value={selectedLocationId}
              onChange={(e) => handleLocationChange(e.target.value)}
              style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.82rem', fontWeight: 600, color: '#0F172A', outline: 'none', marginBottom: '0.75rem' }}
            >
              {locationsList.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>

            <button
              onClick={() => handleLocationChange('loc-001')}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#059669', color: '#FFFFFF', border: 'none', padding: '0.6rem', borderRadius: 8, fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
            >
              <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, stroke: 'currentColor', fill: 'none', strokeWidth: 2 }}><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
              <span>Use Current Location</span>
            </button>
          </div>

          {/* Card 2: Feature Matching */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '1.1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.88rem', fontWeight: 800, color: '#0F172A', marginBottom: 2 }}>
              <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, stroke: '#0F172A', fill: 'none', strokeWidth: 2 }}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              <span>Feature Matching</span>
              <span style={{ fontSize: '0.7rem', color: '#64748B' }}>ⓘ</span>
            </div>
            <p style={{ fontSize: '0.72rem', color: '#64748B', marginBottom: '0.85rem', lineHeight: 1.35 }}>Select live data features to analyse their combined impact at this location.</p>

            {/* Selectable Chips Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {[
                { key: 'traffic', label: 'Traffic', icon: '🚗' },
                { key: 'crowd', label: 'Crowd', icon: '👥' },
                { key: 'weather', label: 'Weather', icon: '☁️' },
                { key: 'road', label: 'Road Condition', icon: '🛣️' },
                { key: 'time', label: 'Time of Day', icon: '🕒' },
                { key: 'transit', label: 'Public Transport', icon: '🚌' },
                { key: 'alerts', label: 'Alerts & Incidents', icon: '⚠️' }
              ].map(f => {
                const isSel = selectedFeatures.includes(f.key);
                return (
                  <div
                    key={f.key}
                    onClick={() => toggleFeatureChip(f.key)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.45rem 0.65rem',
                      borderRadius: 8,
                      border: isSel ? '1.5px solid #10B981' : '1px solid #CBD5E1',
                      background: isSel ? '#ECFDF5' : '#FFFFFF',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: '#0F172A',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      gridColumn: f.key === 'alerts' ? 'span 2' : 'auto'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>{f.icon}</span>
                      <span>{f.label}</span>
                    </div>
                    {isSel && (
                      <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#059669', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 800 }}>✓</div>
                    )}
                  </div>
                );
              })}
            </div>

            {validationError && (
              <div style={{ marginTop: '0.65rem', fontSize: '0.72rem', color: '#EF4444', fontWeight: 700 }}>
                ⚠️ {validationError}
              </div>
            )}
          </div>

          {/* Card 3: Matched Analysis */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '1.1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '0.75rem' }}>
              {/* Venn Diagram Icon */}
              <div style={{ display: 'flex', alignItems: 'center', position: 'relative', width: 36, height: 28, flexShrink: 0 }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.4)', border: '1.5px solid #EF4444', position: 'absolute', left: 0 }}></div>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(37, 99, 235, 0.4)', border: '1.5px solid #2563EB', position: 'absolute', right: 0 }}></div>
              </div>

              <div>
                <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A' }}>Matched Analysis</h4>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#2563EB', marginTop: 1 }}>{focusData.matched_features_title}</div>
                <p style={{ fontSize: '0.68rem', color: '#64748B', marginTop: 1 }}>Analysing live data for the selected combination...</p>
              </div>
            </div>

            <button
              onClick={() => runFocusAnalysis()}
              disabled={isAnalyzing}
              style={{ width: '100%', background: '#059669', color: '#FFFFFF', border: 'none', padding: '0.65rem', borderRadius: 8, fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', transition: 'background 0.15s ease', marginTop: '0.5rem' }}
            >
              {isAnalyzing ? 'Analyzing...' : 'Run Focus Analysis'}
            </button>
          </div>

        </div>

        {/* =================================================================== */}
        {/* COLUMN 2: MIDDLE LIVE ANALYSIS & TRENDS                             */}
        {/* =================================================================== */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Section 1: Current Situation Card */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '1.1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.75rem' }}>
              Current Situation <span style={{ fontSize: '0.72rem', color: '#64748B' }}>ⓘ</span>
            </div>

            {/* Situation Banner */}
            <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 8, padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#EF4444', color: '#FFFFFF', fontWeight: 800, fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>!</div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#EF4444', lineHeight: 1.2 }}>{focusData.situation}</h3>
                  <p style={{ fontSize: '0.75rem', color: '#7F1D1D', marginTop: 2, lineHeight: 1.35 }}>{focusData.situation_summary}</p>
                </div>
              </div>

              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Severity</span>
                  <span style={{ background: '#EF4444', color: '#FFFFFF', padding: '2px 8px', borderRadius: 4, fontSize: '0.72rem', fontWeight: 800 }}>{focusData.severity}</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                  Confidence <strong style={{ color: '#0F172A', marginLeft: 4 }}>{focusData.confidence}%</strong>
                </div>
              </div>
            </div>

            {/* 4 Live Condition Metric Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              
              {/* Card 1: Traffic */}
              <div style={{ background: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: 8, padding: '10px 8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span style={{ color: '#EF4444' }}>🚗</span>
                  <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Traffic</span>
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#EF4444' }}>High</div>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#EF4444', marginTop: 1 }}>↑ 18%</div>
                <div style={{ fontSize: '0.65rem', color: '#64748B', marginTop: 4 }}>Speed: 18 km/h</div>
                <div style={{ fontSize: '0.62rem', color: '#94A3B8' }}>6,500 vehicles/hour</div>
              </div>

              {/* Card 2: Crowd */}
              <div style={{ background: '#EFF6FF', border: '1px solid #DBEAFE', borderRadius: 8, padding: '10px 8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span style={{ color: '#2563EB' }}>👥</span>
                  <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Crowd</span>
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#2563EB' }}>High</div>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#EF4444', marginTop: 1 }}>↑ 22%</div>
                <div style={{ fontSize: '0.65rem', color: '#64748B', marginTop: 4 }}>520 people/km²</div>
              </div>

              {/* Card 3: Weather */}
              <div style={{ background: '#F0F9FF', border: '1px solid #E0F2FE', borderRadius: 8, padding: '10px 8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span style={{ color: '#0284C7' }}>☁️</span>
                  <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Weather</span>
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0F172A' }}>Light Rain</div>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', marginTop: 1 }}>→ Stable</div>
                <div style={{ fontSize: '0.65rem', color: '#64748B', marginTop: 4 }}>24°C | 3.2 mm</div>
              </div>

              {/* Card 4: Road Condition */}
              <div style={{ background: '#ECFDF5', border: '1px solid #D1FAE5', borderRadius: 8, padding: '10px 8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span style={{ color: '#059669' }}>🛣️</span>
                  <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Road Condition</span>
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0F172A' }}>Slower Flow</div>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#EF4444', marginTop: 1 }}>↑ 12%</div>
                <div style={{ fontSize: '0.65rem', color: '#64748B', marginTop: 4 }}>Urban Arterial</div>
              </div>

            </div>
          </div>

          {/* Section 2: Trends (Last 2 Hours) - Collapsible */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '1.1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isTrendsOpen ? '0.85rem' : 0, cursor: 'pointer' }} onClick={() => setIsTrendsOpen(!isTrendsOpen)}>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0F172A' }}>
                Trends (Last 2 Hours)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', background: '#F1F5F9', padding: '3px 8px', borderRadius: 6 }}>Traffic, Crowd, Weather</span>
                <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, stroke: '#64748B', fill: 'none', strokeWidth: 2, transform: isTrendsOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}><path d="M6 9l6 6 6-6"/></svg>
              </div>
            </div>

            {isTrendsOpen && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                
                {/* Chart 1: Traffic Volume */}
                <div style={{ border: '1px solid #F1F5F9', borderRadius: 8, padding: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0F172A' }}>Traffic Volume <span style={{ fontSize: '0.65rem', color: '#94A3B8' }}>(vehicles/hour)</span></span>
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#EF4444', background: '#FEF2F2', padding: '1px 5px', borderRadius: 4 }}>↑ Increasing</span>
                  </div>
                  <svg viewBox="0 0 200 60" style={{ width: '100%', height: 60 }}>
                    <path d="M 0 50 Q 50 45, 100 30 T 200 10" fill="none" stroke="#EF4444" strokeWidth="2.5" />
                    <path d="M 0 50 Q 50 45, 100 30 T 200 10 L 200 60 L 0 60 Z" fill="rgba(239, 68, 68, 0.1)" />
                  </svg>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: '#94A3B8', marginTop: 2 }}>
                    <span>12:30</span><span>13:00</span><span>13:30</span><span>14:00</span><span>14:30</span>
                  </div>
                </div>

                {/* Chart 2: Crowd Density */}
                <div style={{ border: '1px solid #F1F5F9', borderRadius: 8, padding: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0F172A' }}>Crowd Density <span style={{ fontSize: '0.65rem', color: '#94A3B8' }}>(people/km²)</span></span>
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#EF4444', background: '#FEF2F2', padding: '1px 5px', borderRadius: 4 }}>↑ Increasing</span>
                  </div>
                  <svg viewBox="0 0 200 60" style={{ width: '100%', height: 60 }}>
                    <path d="M 0 45 Q 50 35, 100 25 T 200 12" fill="none" stroke="#2563EB" strokeWidth="2.5" />
                    <path d="M 0 45 Q 50 35, 100 25 T 200 12 L 200 60 L 0 60 Z" fill="rgba(37, 99, 235, 0.1)" />
                  </svg>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: '#94A3B8', marginTop: 2 }}>
                    <span>12:30</span><span>13:00</span><span>13:30</span><span>14:00</span><span>14:30</span>
                  </div>
                </div>

                {/* Chart 3: Rainfall */}
                <div style={{ border: '1px solid #F1F5F9', borderRadius: 8, padding: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0F172A' }}>Rainfall <span style={{ fontSize: '0.65rem', color: '#94A3B8' }}>(mm)</span></span>
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#2563EB', background: '#EFF6FF', padding: '1px 5px', borderRadius: 4 }}>→ Stable</span>
                  </div>
                  <svg viewBox="0 0 200 60" style={{ width: '100%', height: 60 }}>
                    <rect x="10" y="40" width="12" height="20" fill="#059669" rx="2" />
                    <rect x="50" y="25" width="12" height="35" fill="#059669" rx="2" />
                    <rect x="90" y="15" width="12" height="45" fill="#059669" rx="2" />
                    <rect x="130" y="20" width="12" height="40" fill="#059669" rx="2" />
                    <rect x="170" y="30" width="12" height="30" fill="#059669" rx="2" />
                  </svg>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: '#94A3B8', marginTop: 2 }}>
                    <span>12:30</span><span>13:00</span><span>13:30</span><span>14:00</span><span>14:30</span>
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* Section 3: Bottom 2-Column Insights Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '1rem' }}>
            
            {/* Left Sub-card: What is Increasing / Decreasing? (Collapsible) */}
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isIncreasingOpen ? '0.6rem' : 0, cursor: 'pointer' }} onClick={() => setIsIncreasingOpen(!isIncreasingOpen)}>
                <h4 style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0F172A' }}>What is Increasing / Decreasing?</h4>
                <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, stroke: '#64748B', fill: 'none', strokeWidth: 2, transform: isIncreasingOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}><path d="M6 9l6 6 6-6"/></svg>
              </div>

              {isIncreasingOpen && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#475569', fontWeight: 600 }}>Traffic</span>
                    <span style={{ color: '#EF4444', fontWeight: 800 }}>↑ Increasing</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#475569', fontWeight: 600 }}>Crowd</span>
                    <span style={{ color: '#EF4444', fontWeight: 800 }}>↑ Increasing</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#475569', fontWeight: 600 }}>Weather</span>
                    <span style={{ color: '#64748B', fontWeight: 800 }}>→ Stable</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#475569', fontWeight: 600 }}>Road Condition</span>
                    <span style={{ color: '#EF4444', fontWeight: 800 }}>↑ Deteriorating</span>
                  </div>
                </div>
              )}
            </div>

            {/* Right Sub-card: Why This Result? (Matching Analysis) (Collapsible) */}
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isWhyResultOpen ? '0.6rem' : 0, cursor: 'pointer' }} onClick={() => setIsWhyResultOpen(!isWhyResultOpen)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, stroke: '#0F172A', fill: 'none', strokeWidth: 2 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  <h4 style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0F172A' }}>Why This Result? <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 500 }}>(Matching Analysis)</span></h4>
                </div>
                <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, stroke: '#64748B', fill: 'none', strokeWidth: 2, transform: isWhyResultOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}><path d="M6 9l6 6 6-6"/></svg>
              </div>

              {isWhyResultOpen && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(focusData.why_result || []).map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.72rem', lineHeight: 1.35, color: '#334155' }}>
                      <span style={{ width: 16, height: 16, borderRadius: '50%', background: '#E0F2FE', color: '#0284C7', fontWeight: 800, fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{idx + 1}</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>

        {/* =================================================================== */}
        {/* COLUMN 3: RIGHT INSIGHTS & RESPONSE ACTIONS                         */}
        {/* =================================================================== */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Card 1: Key Issue (Collapsible) */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '1.1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isKeyIssueOpen ? '0.5rem' : 0, cursor: 'pointer' }} onClick={() => setIsKeyIssueOpen(!isKeyIssueOpen)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.88rem', fontWeight: 800, color: '#0F172A' }}>
                <span style={{ color: '#EF4444' }}>🎯</span>
                <span>Key Issue</span>
              </div>
              <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, stroke: '#64748B', fill: 'none', strokeWidth: 2, transform: isKeyIssueOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}><path d="M6 9l6 6 6-6"/></svg>
            </div>

            {isKeyIssueOpen && (
              <>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.3 }}>{focusData.key_issue}</h4>
                <p style={{ fontSize: '0.74rem', color: '#64748B', marginTop: 4, lineHeight: 1.4 }}>{focusData.key_issue_sub}</p>
              </>
            )}
          </div>

          {/* Card 2: Advisory & Response Actions (Collapsible) */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '1.1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isActionsOpen ? '0.75rem' : 0, cursor: 'pointer' }} onClick={() => setIsActionsOpen(!isActionsOpen)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.88rem', fontWeight: 800, color: '#0F172A' }}>
                <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, stroke: '#0F172A', fill: 'none', strokeWidth: 2 }}><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                <span>Advisory & Response</span>
              </div>
              <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, stroke: '#64748B', fill: 'none', strokeWidth: 2, transform: isActionsOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}><path d="M6 9l6 6 6-6"/></svg>
            </div>

            {isActionsOpen && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {focusData.actions.map((act) => (
                  <div key={act.id} style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingBottom: 8, borderBottom: '1px solid #F1F5F9' }}>
                    
                    {/* Title & Icon */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', fontWeight: 800, color: '#0F172A' }}>
                      <span style={{ fontSize: '0.85rem' }}>📢</span>
                      <span>{act.title || 'Response Advisory'}</span>
                    </div>

                    {/* Short Explanation Text */}
                    <p style={{ fontSize: '0.72rem', color: '#475569', lineHeight: 1.35, paddingLeft: 22 }}>
                      "{act.text}"
                    </p>

                    {/* Button Controls Row: [Comment] [Approve] [Reject] */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 22, marginTop: 4 }}>
                      
                      {/* Comment Icon Button */}
                      <button
                        onClick={() => {
                          if (activeCommentActionId === act.id) {
                            setActiveCommentActionId(null);
                          } else {
                            setActiveCommentActionId(act.id);
                            setCommentInputText('');
                          }
                        }}
                        style={{
                          background: '#F1F5F9',
                          border: '1px solid #CBD5E1',
                          color: '#475569',
                          borderRadius: 4,
                          padding: '2px 8px',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        <span>💬</span>
                        <span>Comment ({act.comments ? act.comments.length : 0})</span>
                      </button>

                      {/* Approve Button */}
                      <button
                        onClick={() => handleApproveAction(act.id)}
                        style={{
                          background: act.status === 'Approved' ? '#ECFDF5' : '#FFFFFF',
                          border: act.status === 'Approved' ? '1px solid #10B981' : '1px solid #CBD5E1',
                          color: act.status === 'Approved' ? '#065F46' : '#64748B',
                          borderRadius: 4,
                          padding: '2px 8px',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {act.status === 'Approved' ? '✔ Approved' : 'Approve'}
                      </button>

                      {/* Reject Button */}
                      <button
                        onClick={() => handleRejectAction(act.id)}
                        style={{
                          background: act.status === 'Rejected' ? '#FEF2F2' : '#FFFFFF',
                          border: act.status === 'Rejected' ? '1px solid #EF4444' : '1px solid #CBD5E1',
                          color: act.status === 'Rejected' ? '#991B1B' : '#64748B',
                          borderRadius: 4,
                          padding: '2px 8px',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {act.status === 'Rejected' ? '✖ Rejected' : 'Reject'}
                      </button>
                    </div>

                    {/* Inline Comment Input Box */}
                    {activeCommentActionId === act.id && (
                      <div style={{ marginLeft: 22, marginTop: 6, background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: 6, padding: '6px 8px' }}>
                        <input
                          type="text"
                          placeholder="Type authority comment..."
                          value={commentInputText}
                          onChange={(e) => setCommentInputText(e.target.value)}
                          style={{ width: '100%', border: '1px solid #E2E8F0', borderRadius: 4, padding: '4px 6px', fontSize: '0.72rem', outline: 'none', marginBottom: 4 }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                          <button
                            onClick={() => setActiveCommentActionId(null)}
                            style={{ background: 'transparent', border: 'none', color: '#64748B', fontSize: '0.68rem', cursor: 'pointer' }}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleAddComment(act.id)}
                            style={{ background: '#059669', color: '#FFFFFF', border: 'none', borderRadius: 4, padding: '2px 8px', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer' }}
                          >
                            Submit
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Display Saved Comments */}
                    {act.comments && act.comments.length > 0 && (
                      <div style={{ marginLeft: 22, marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {act.comments.map((c, i) => (
                          <div key={i} style={{ fontSize: '0.65rem', color: '#475569', background: '#F1F5F9', padding: '2px 6px', borderRadius: 4 }}>
                            <strong>Authority:</strong> {c.comment} <span style={{ color: '#94A3B8', marginLeft: 4 }}>({c.timestamp})</span>
                          </div>
                        ))}
                      </div>
                    )}

                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card 3: Impact Assessment (Collapsible) */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '1.1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isImpactOpen ? '0.75rem' : 0, cursor: 'pointer' }} onClick={() => setIsImpactOpen(!isImpactOpen)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.88rem', fontWeight: 800, color: '#0F172A' }}>
                <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, stroke: '#0F172A', fill: 'none', strokeWidth: 2 }}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                <span>Impact Assessment</span>
              </div>
              <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, stroke: '#64748B', fill: 'none', strokeWidth: 2, transform: isImpactOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}><path d="M6 9l6 6 6-6"/></svg>
            </div>

            {isImpactOpen && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {focusData.impact_assessment.map((imp, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 60px', alignItems: 'center', gap: 8, fontSize: '0.72rem' }}>
                    <span style={{ color: '#475569', fontWeight: 600 }}>{imp.category}</span>
                    <div style={{ background: '#F1F5F9', height: 8, borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ background: imp.color, width: `${imp.level_pct}%`, height: '100%', borderRadius: 4 }}></div>
                    </div>
                    <span style={{ fontWeight: 800, color: imp.color, textAlign: 'right' }}>{imp.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
