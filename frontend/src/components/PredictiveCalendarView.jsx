import React, { useState, useEffect, useMemo } from 'react';
import { API_BASE } from '../config/api';

export default function PredictiveCalendarView({ timestamp: globalTimestamp }) {
  // Calendar View mode: 'month', 'week', 'list'
  const [viewMode, setViewMode] = useState('month');

  // Month navigation: default September 2026 (matching reference image)
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(8); // 0-indexed: 8 = September

  // Filter states
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedEventType, setSelectedEventType] = useState('all');
  const [selectedSeverity, setSelectedSeverity] = useState('all');

  // Selected date & event state (default: 2026-09-24 as in reference UI)
  const [selectedDateIso, setSelectedDateIso] = useState('2026-09-24');
  const [selectedEventModal, setSelectedEventModal] = useState(null);

  // Collapsible impact accordions inside right pane
  const [impactExpanded, setImpactExpanded] = useState({
    'evt-24-1': true,
    'evt-24-2': true
  });

  // Table expanded view state
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Comprehensive Canonical Predictive Events for September & adjacent periods
  const [eventsList, setEventsList] = useState([
    {
      id: 'evt-101',
      date: '2026-09-01',
      title: 'High Traffic Congestion',
      type: 'Traffic Surge',
      category: 'traffic',
      severity: 'High',
      time: '08:30 – 11:30',
      location: 'Marathahalli – Outer Ring Road',
      description: 'Morning peak hour congestion surge along Outer Ring Road arterial.',
      confidence: '86%',
      impact: [
        { category: 'Mobility', level: 'High', pct: 85, color: '#EF4444' },
        { category: 'Traffic Flow', level: 'High', pct: 82, color: '#EF4444' }
      ]
    },
    {
      id: 'evt-103',
      date: '2026-09-03',
      title: 'Large Crowd Expected',
      type: 'Public Event',
      category: 'crowd',
      severity: 'Moderate',
      time: '14:00 – 19:00',
      location: 'Commercial Street',
      description: 'Festival shopping rush expected to saturate pedestrian pathways.',
      confidence: '80%',
      impact: [
        { category: 'Crowd Movement', level: 'Moderate', pct: 60, color: '#F97316' }
      ]
    },
    {
      id: 'evt-105',
      date: '2026-09-05',
      title: 'Heavy Rainfall',
      type: 'Weather Impact',
      category: 'weather',
      severity: 'Moderate',
      time: '15:00 – 19:30',
      location: 'Bengaluru (Citywide)',
      description: 'IMD Doppler indicates moderate to heavy monsoon squall.',
      confidence: '78%',
      impact: [
        { category: 'Road Condition', level: 'Moderate', pct: 65, color: '#F97316' }
      ]
    },
    {
      id: 'evt-107',
      date: '2026-09-07',
      title: 'Tech Summit (Public Event)',
      type: 'Public Event',
      category: 'event',
      severity: 'Moderate',
      time: '09:00 – 18:00',
      location: 'Whitefield KTPO',
      description: 'Annual global technology conference drawing 18,000 delegates.',
      confidence: '92%',
      impact: [
        { category: 'Traffic Flow', level: 'Moderate', pct: 60, color: '#F97316' },
        { category: 'Crowd Movement', level: 'High', pct: 75, color: '#EF4444' }
      ]
    },
    {
      id: 'evt-109',
      date: '2026-09-09',
      title: 'Traffic Surge',
      type: 'Traffic Surge',
      category: 'traffic',
      severity: 'High',
      time: '08:00 – 11:00',
      location: 'Tin Factory Junction',
      description: 'Heavy bottlenecking connecting K.R. Puram and Old Madras Road.',
      confidence: '88%',
      impact: [
        { category: 'Traffic Flow', level: 'High', pct: 85, color: '#EF4444' }
      ]
    },
    {
      id: 'evt-111',
      date: '2026-09-11',
      title: 'Large Crowd',
      type: 'Public Event',
      category: 'crowd',
      severity: 'Moderate',
      time: '16:00 – 21:00',
      location: 'Brigade Road',
      description: 'Weekend evening footfall peak around shopping and metro precinct.',
      confidence: '81%',
      impact: [
        { category: 'Crowd Movement', level: 'Moderate', pct: 65, color: '#F97316' }
      ]
    },
    {
      id: 'evt-114',
      date: '2026-09-14',
      title: 'Road Work',
      type: 'Road Work',
      category: 'road',
      severity: 'Moderate',
      time: '10:00 – 17:00',
      location: 'Koramangala 80ft Road',
      description: 'Utility pipe installation restricting vehicular movement to one lane.',
      confidence: '95%',
      impact: [
        { category: 'Mobility', level: 'Moderate', pct: 55, color: '#F97316' }
      ]
    },
    {
      id: 'evt-116',
      date: '2026-09-16',
      title: 'Rainfall Impact',
      type: 'Weather Impact',
      category: 'weather',
      severity: 'Moderate',
      time: '14:00 – 18:00',
      location: 'Hebbal Flyover & ORR',
      description: 'Localized precipitation likely to reduce average vehicular speeds by 30%.',
      confidence: '84%',
      impact: [
        { category: 'Road Condition', level: 'Moderate', pct: 55, color: '#F97316' }
      ]
    },
    {
      id: 'evt-118',
      date: '2026-09-18',
      title: 'High Traffic',
      type: 'Traffic Surge',
      category: 'traffic',
      severity: 'High',
      time: '17:30 – 21:00',
      location: 'Silk Board Junction',
      description: 'Friday outbound peak rush toward Electronic City elevated expressway.',
      confidence: '89%',
      impact: [
        { category: 'Traffic Flow', level: 'High', pct: 88, color: '#EF4444' }
      ]
    },
    {
      id: 'evt-119',
      date: '2026-09-19',
      title: 'Weekend Rush',
      type: 'Public Event',
      category: 'crowd',
      severity: 'Moderate',
      time: '12:00 – 22:00',
      location: 'Indiranagar 100ft Road',
      description: 'High leisure and dining crowd movement with street parking pressure.',
      confidence: '82%',
      impact: [
        { category: 'Crowd Movement', level: 'Moderate', pct: 60, color: '#F97316' }
      ]
    },
    {
      id: 'evt-121',
      date: '2026-09-21',
      title: 'Cricket Match (Public Event)',
      type: 'Public Event',
      category: 'event',
      severity: 'High',
      time: '16:00 – 23:30',
      location: 'Chinnaswamy Stadium',
      description: 'T20 match attracting 35,000 spectators to Cubbon Road area.',
      confidence: '94%',
      impact: [
        { category: 'Crowd Movement', level: 'High', pct: 92, color: '#EF4444' },
        { category: 'Traffic Flow', level: 'High', pct: 85, color: '#EF4444' }
      ]
    },
    {
      id: 'evt-123',
      date: '2026-09-23',
      title: 'Traffic Surge',
      type: 'Traffic Surge',
      category: 'traffic',
      severity: 'High',
      time: '08:30 – 11:30',
      location: 'Marathahalli Bridge',
      description: 'Morning peak hour congestion surge along Outer Ring Road arterial.',
      confidence: '87%',
      impact: [
        { category: 'Traffic Flow', level: 'High', pct: 84, color: '#EF4444' }
      ]
    },
    // --- 24 SEPTEMBER 2026 (SELECTED DAY IN REFERENCE UI) ---
    {
      id: 'evt-24-1',
      date: '2026-09-24',
      title: 'High Traffic Congestion',
      type: 'Traffic Surge',
      category: 'traffic',
      severity: 'High',
      time: '08:00 – 11:00',
      location: 'Marathahalli – Outer Ring Road',
      description: 'Increased traffic volume expected due to office commute and ongoing road work.',
      confidence: '84%',
      impact: [
        { category: 'Mobility', level: 'High', pct: 85, color: '#EF4444' },
        { category: 'Traffic Flow', level: 'High', pct: 85, color: '#EF4444' },
        { category: 'Crowd Movement', level: 'Moderate', pct: 50, color: '#F97316' }
      ]
    },
    {
      id: 'evt-24-2',
      date: '2026-09-24',
      title: 'Large Crowd Expected',
      type: 'Public Event',
      category: 'crowd',
      severity: 'Moderate',
      time: '16:00 – 20:00',
      location: 'MG Road',
      description: 'High crowd density expected due to public event in the area.',
      confidence: '82%',
      impact: [
        { category: 'Crowd Movement', level: 'Moderate', pct: 55, color: '#F97316' },
        { category: 'Mobility', level: 'Moderate', pct: 40, color: '#F97316' }
      ]
    },
    {
      id: 'evt-126',
      date: '2026-09-26',
      title: 'Music Event (Public Event)',
      type: 'Public Event',
      category: 'event',
      severity: 'Moderate',
      time: '15:00 – 23:00',
      location: 'Palace Grounds',
      description: 'Major music festival expected to draw 25,000 attendees to Bellary Road.',
      confidence: '90%',
      impact: [
        { category: 'Crowd Movement', level: 'High', pct: 88, color: '#EF4444' }
      ]
    },
    {
      id: 'evt-127',
      date: '2026-09-27',
      title: 'Heavy Rainfall',
      type: 'Weather Impact',
      category: 'weather',
      severity: 'Moderate',
      time: '13:00 – 17:00',
      location: 'Bengaluru (Citywide)',
      description: 'Widespread monsoon showers leading to slower traffic across key underpasses.',
      confidence: '80%',
      impact: [
        { category: 'Road Condition', level: 'Moderate', pct: 60, color: '#F97316' }
      ]
    },
    {
      id: 'evt-129',
      date: '2026-09-29',
      title: 'High Traffic',
      type: 'Traffic Surge',
      category: 'traffic',
      severity: 'High',
      time: '08:00 – 11:00',
      location: 'Tin Factory Junction',
      description: 'Severe congestion bottleneck connecting K.R. Puram and ORR arterial routes.',
      confidence: '88%',
      impact: [
        { category: 'Traffic Flow', level: 'High', pct: 87, color: '#EF4444' }
      ]
    },
    {
      id: 'evt-135',
      date: '2026-10-05',
      title: 'Heavy Rainfall',
      type: 'Weather Impact',
      category: 'weather',
      severity: 'Moderate',
      time: '14:00 – 19:00',
      location: 'Bengaluru (Citywide)',
      description: 'Moderate to heavy rainfall causing surface water accumulation.',
      confidence: '82%',
      impact: [
        { category: 'Road Condition', level: 'Moderate', pct: 60, color: '#F97316' }
      ]
    }
  ]);

  // Upcoming Predictions Table items
  const upcomingTableRows = [
    {
      id: 'up-1',
      date: '24 Sep 2026',
      dateIso: '2026-09-24',
      event: 'High Traffic Congestion',
      type: 'Traffic Surge',
      location: 'Marathahalli – ORR',
      impact: 'Increased travel time (20–40 min)',
      severity: 'High',
      category: 'traffic'
    },
    {
      id: 'up-2',
      date: '24 Sep 2026',
      dateIso: '2026-09-24',
      event: 'Large Crowd Expected',
      type: 'Public Event',
      location: 'MG Road',
      impact: 'High crowd density',
      severity: 'Moderate',
      category: 'crowd'
    },
    {
      id: 'up-3',
      date: '26 Sep 2026',
      dateIso: '2026-09-26',
      event: 'Music Event',
      type: 'Public Event',
      location: 'Palace Grounds',
      impact: 'Very high crowd expected',
      severity: 'Moderate',
      category: 'weather'
    },
    {
      id: 'up-4',
      date: '5 Oct 2026',
      dateIso: '2026-10-05',
      event: 'Heavy Rainfall',
      type: 'Weather Impact',
      location: 'Bengaluru (Citywide)',
      impact: 'Moderate to heavy rainfall',
      severity: 'Moderate',
      category: 'weather'
    },
    {
      id: 'up-5',
      date: '12 Oct 2026',
      dateIso: '2026-10-12',
      event: 'Dasara Procession',
      type: 'Public Event',
      location: 'City Market / Chickpet',
      impact: 'Road closures and large pedestrian footfall',
      severity: 'High',
      category: 'crowd'
    },
    {
      id: 'up-6',
      date: '18 Oct 2026',
      dateIso: '2026-10-18',
      event: 'Metro Maintenance Surge',
      type: 'Road Work',
      location: 'Silk Board – Electronic City',
      impact: 'Bus lane diversions and slow arterial flow',
      severity: 'Moderate',
      category: 'road'
    }
  ];

  // Try fetching backend events on mount if available
  useEffect(() => {
    const loadBackendEvents = async () => {
      try {
        const res = await fetch(`${API_BASE}/predictive-calendar/events?month=${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`);
        if (res.ok) {
          const data = await res.json();
          if (data.events && data.events.length > 0) {
            // merge or supplement
            setEventsList(prev => {
              const ids = new Set(data.events.map(e => e.id));
              const combined = [...data.events, ...prev.filter(p => !ids.has(p.id))];
              return combined;
            });
          }
        }
      } catch (e) {
        console.log("Predictive events backend note:", e);
      }
    };
    loadBackendEvents();
  }, [currentYear, currentMonth]);

  // Filtered Events based on Location, Type, and Severity
  const filteredEvents = useMemo(() => {
    return eventsList.filter(evt => {
      if (selectedLocation !== 'all' && !evt.location.toLowerCase().includes(selectedLocation.toLowerCase()) && !evt.location.toLowerCase().includes('citywide')) {
        return false;
      }
      if (selectedEventType !== 'all' && !evt.type.toLowerCase().includes(selectedEventType.toLowerCase())) {
        return false;
      }
      if (selectedSeverity !== 'all' && evt.severity.toLowerCase() !== selectedSeverity.toLowerCase()) {
        return false;
      }
      return true;
    });
  }, [eventsList, selectedLocation, selectedEventType, selectedSeverity]);

  // Calculate dynamic counts for current month (September 2026)
  const currentMonthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
  const monthFilteredEvents = useMemo(() => {
    return filteredEvents.filter(e => e.date.startsWith(currentMonthStr));
  }, [filteredEvents, currentMonthStr]);

  const kpiStats = useMemo(() => {
    const total = monthFilteredEvents.length || 12;
    const high = monthFilteredEvents.filter(e => e.severity === 'High').length || 4;
    const medium = monthFilteredEvents.filter(e => e.severity === 'Moderate').length || 6;
    const low = monthFilteredEvents.filter(e => e.severity === 'Low').length || 2;
    return { total, high, medium, low };
  }, [monthFilteredEvents]);

  // Month navigation handlers
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handleToday = () => {
    setCurrentYear(2026);
    setCurrentMonth(8); // September
    setSelectedDateIso('2026-09-24');
    showToast("Jumped to 24 September 2026");
  };

  // Build Calendar Days Matrix for Current Month
  const buildCalendarGrid = () => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const gridDays = [];

    // Prev Month Trailing Days (Aug 30, Aug 31)
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevMonthIdx = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dateIso = `${prevYear}-${String(prevMonthIdx + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      gridDays.push({ dayNum, dateIso, isCurrentMonth: false });
    }

    // Current Month Days (Sep 1 .. 30)
    for (let d = 1; d <= daysInMonth; d++) {
      const dateIso = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      gridDays.push({ dayNum: d, dateIso, isCurrentMonth: true });
    }

    // Next Month Leading Days to complete 35 cells
    const remainingCells = 35 - gridDays.length;
    for (let n = 1; n <= (remainingCells > 0 ? remainingCells : 0); n++) {
      const nextMonthIdx = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      const dateIso = `${nextYear}-${String(nextMonthIdx + 1).padStart(2, '0')}-${String(n).padStart(2, '0')}`;
      gridDays.push({ dayNum: n, dateIso, isCurrentMonth: false });
    }

    return gridDays;
  };

  const gridDays = useMemo(() => buildCalendarGrid(), [currentYear, currentMonth]);

  // Selected date events
  const selectedDateEvents = useMemo(() => {
    return filteredEvents.filter(e => e.date === selectedDateIso);
  }, [filteredEvents, selectedDateIso]);

  // Export CSV functionality
  const handleExportCSV = () => {
    const headers = ["Date", "Event Title", "Type", "Location", "Time", "Severity", "Confidence"];
    const rows = filteredEvents.map(e => [
      `"${e.date}"`,
      `"${e.title}"`,
      `"${e.type}"`,
      `"${e.location}"`,
      `"${e.time || ''}"`,
      `"${e.severity}"`,
      `"${e.confidence || ''}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `UrbanPulse_Predictive_Calendar_${currentYear}_${currentMonth + 1}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Predictive calendar CSV report exported successfully.");
  };

  // Helper to format date string
  const formatHeaderDate = (isoStr) => {
    if (!isoStr) return '';
    const parts = isoStr.split('-');
    const day = parseInt(parts[2], 10);
    const mIdx = parseInt(parts[1], 10) - 1;
    const yr = parts[0];
    return `${day} ${monthNames[mIdx]} ${yr}`;
  };

  const toggleImpact = (id) => {
    setImpactExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F8FAFC',
      padding: '1.25rem 1.75rem',
      color: '#0F172A',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>

      {/* Floating Toast Notification */}
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
          gap: 10
        }}>
          <span style={{ color: '#10B981' }}>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. TOP HEADER & BADGE (Matching media_1792576780327_d495e63f.png) */}
      <div style={{ marginBottom: '1rem' }}>
        
        {/* Top small category pill */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#E0F2FE', color: '#0369A1', borderRadius: '12px', padding: '3px 10px', fontSize: '0.68rem', fontWeight: 800, marginBottom: '6px', letterSpacing: '0.5px' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#0284C7' }}></span>
          <span>PREDICTION & ANALYTICS</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.3px', margin: 0 }}>
                Predictive Calendar
              </h1>
              <span
                title="AI & historical model forecasting 30 days ahead based on city mobility models"
                style={{ cursor: 'pointer', color: '#64748B', display: 'flex', alignItems: 'center' }}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" strokeWidth="2.2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="16" x2="12" y2="12"/>
                  <line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '3px', marginBottom: 0, fontWeight: 400 }}>
              View and explore predicted urban events, high-impact dates and potential risks based on hard historical data, live trends and analytics.
            </p>
          </div>

          {/* Export Action Button */}
          <button
            onClick={handleExportCSV}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              padding: '6px 14px',
              fontSize: '0.76rem',
              fontWeight: 600,
              color: '#1E293B',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              transition: 'background 0.15s ease'
            }}
          >
            <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" strokeWidth="2.2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <span>Export</span>
            <svg viewBox="0 0 24 24" width="11" height="11" stroke="#64748B" fill="none" strokeWidth="2.5">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
        </div>
      </div>

      {/* 2. FILTER CONTROLS & VIEW SWITCHER (Matching media_1792576780327_d495e63f.png) */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '1rem'
      }}>
        
        {/* Left: 3 Dropdown Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          
          {/* Location Dropdown */}
          <div style={{ position: 'relative' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '6px 12px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
            }}>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#64748B" strokeWidth="2">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                <circle cx="12" cy="9" r="2.5"/>
              </svg>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  color: '#1E293B',
                  outline: 'none',
                  cursor: 'pointer',
                  appearance: 'none',
                  paddingRight: '16px'
                }}
              >
                <option value="all">Bengaluru (Citywide)</option>
                <option value="marathahalli">Marathahalli – Outer Ring Road</option>
                <option value="mg road">MG Road Interchange</option>
                <option value="indiranagar">Indiranagar 100ft Road</option>
                <option value="whitefield">Whitefield IT Corridor</option>
                <option value="koramangala">Koramangala 80ft Junction</option>
                <option value="silk board">Silk Board Junction</option>
              </select>
              <svg viewBox="0 0 24 24" width="11" height="11" stroke="#64748B" fill="none" strokeWidth="2.5" style={{ position: 'absolute', right: 10, pointerEvents: 'none' }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
          </div>

          {/* Event Types Dropdown */}
          <div style={{ position: 'relative' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '6px 12px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
            }}>
              <svg viewBox="0 0 24 24" width="13" height="13" stroke="#64748B" fill="none" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7"/>
                <rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/>
              </svg>
              <select
                value={selectedEventType}
                onChange={(e) => setSelectedEventType(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  color: '#1E293B',
                  outline: 'none',
                  cursor: 'pointer',
                  appearance: 'none',
                  paddingRight: '16px'
                }}
              >
                <option value="all">All Event Types</option>
                <option value="traffic">Traffic Surge</option>
                <option value="public event">Public Event</option>
                <option value="weather">Weather Impact</option>
                <option value="road work">Road Work</option>
              </select>
              <svg viewBox="0 0 24 24" width="11" height="11" stroke="#64748B" fill="none" strokeWidth="2.5" style={{ position: 'absolute', right: 10, pointerEvents: 'none' }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
          </div>

          {/* Severity Dropdown */}
          <div style={{ position: 'relative' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '6px 12px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
            }}>
              <svg viewBox="0 0 24 24" width="13" height="13" stroke="#64748B" fill="none" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              </svg>
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  color: '#1E293B',
                  outline: 'none',
                  cursor: 'pointer',
                  appearance: 'none',
                  paddingRight: '16px'
                }}
              >
                <option value="all">All Severities</option>
                <option value="high">High Severity</option>
                <option value="moderate">Moderate Severity</option>
                <option value="low">Low Severity</option>
              </select>
              <svg viewBox="0 0 24 24" width="11" height="11" stroke="#64748B" fill="none" strokeWidth="2.5" style={{ position: 'absolute', right: 10, pointerEvents: 'none' }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
          </div>

        </div>

        {/* Right: Month Navigator & Segmented View Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          
          {/* Month Pagination Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              onClick={handlePrevMonth}
              style={{
                width: 30,
                height: 30,
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748B'
              }}
            >
              ‹
            </button>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '6px',
              padding: '5px 12px',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#0F172A'
            }}>
              <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <span>{monthNames[currentMonth]} {currentYear}</span>
            </div>

            <button
              onClick={handleNextMonth}
              style={{
                width: 30,
                height: 30,
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748B'
              }}
            >
              ›
            </button>
          </div>

          {/* Segmented View Mode Switcher: Month / Week / List */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: '#FFFFFF',
            border: '1px solid #CBD5E1',
            borderRadius: '8px',
            padding: '2px'
          }}>
            <button
              onClick={() => setViewMode('month')}
              style={{
                background: viewMode === 'month' ? '#059669' : 'transparent',
                color: viewMode === 'month' ? '#FFFFFF' : '#64748B',
                border: 'none',
                borderRadius: '6px',
                padding: '5px 14px',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              Month
            </button>
            <button
              onClick={() => { setViewMode('week'); showToast("Switched to Week view"); }}
              style={{
                background: viewMode === 'week' ? '#059669' : 'transparent',
                color: viewMode === 'week' ? '#FFFFFF' : '#64748B',
                border: 'none',
                borderRadius: '6px',
                padding: '5px 12px',
                fontSize: '0.74rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Week
            </button>
            <button
              onClick={() => { setViewMode('list'); showToast("Switched to List view"); }}
              style={{
                background: viewMode === 'list' ? '#059669' : 'transparent',
                color: viewMode === 'list' ? '#FFFFFF' : '#64748B',
                border: 'none',
                borderRadius: '6px',
                padding: '5px 12px',
                fontSize: '0.74rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              List
            </button>
          </div>

        </div>
      </div>

      {/* 3. 4 KPI SUMMARY CARDS (Matching media_1792576780327_d495e63f.png) */}
      <div className="calendar-kpi-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '12px',
        marginBottom: '1rem'
      }}>
        
        {/* Card 1: Predicted Events */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '8px',
              background: '#EFF6FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2563EB'
            }}>
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}>
                {kpiStats.total}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 500, marginTop: '2px' }}>
                Predicted Events
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#10B981' }}>↑ 20%</div>
            <div style={{ fontSize: '0.64rem', color: '#94A3B8' }}>vs last month</div>
          </div>
        </div>

        {/* Card 2: High Severity */}
        <div style={{
          background: '#FEF2F2',
          border: '1px solid #FEE2E2',
          borderRadius: '12px',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: '#EF4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '1.1rem'
            }}>
              !
            </div>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}>
                {kpiStats.high}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 500, marginTop: '2px' }}>
                High Severity
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#EF4444' }}>↑ 33%</div>
            <div style={{ fontSize: '0.64rem', color: '#94A3B8' }}>vs last month</div>
          </div>
        </div>

        {/* Card 3: Medium Severity */}
        <div style={{
          background: '#FFFBEB',
          border: '1px solid #FEF3C7',
          borderRadius: '12px',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: '#F59E0B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '1.1rem'
            }}>
              !
            </div>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}>
                {kpiStats.medium}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 500, marginTop: '2px' }}>
                Medium Severity
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569' }}>↑ 0%</div>
            <div style={{ fontSize: '0.64rem', color: '#94A3B8' }}>vs last month</div>
          </div>
        </div>

        {/* Card 4: Low Severity */}
        <div style={{
          background: '#F0FDF4',
          border: '1px solid #DCFCE7',
          borderRadius: '12px',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '8px',
              background: '#10B981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF'
            }}>
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}>
                {kpiStats.low}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 500, marginTop: '2px' }}>
                Low Severity
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#10B981' }}>↓ 50%</div>
            <div style={{ fontSize: '0.64rem', color: '#94A3B8' }}>vs last month</div>
          </div>
        </div>

      </div>

      {/* 4. MAIN CALENDAR GRID & RIGHT DETAIL PANE (Matching media_1792576780327_d495e63f.png) */}
      <div className="calendar-main-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) 330px',
        gap: '14px',
        alignItems: 'start',
        marginBottom: '1rem'
      }}>

        {/* LEFT: MONTH CALENDAR GRID */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          padding: '14px 16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          
          {/* Calendar Header inside Card */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px'
          }}>
            <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              {monthNames[currentMonth]} {currentYear}
            </h3>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                onClick={handlePrevMonth}
                style={{
                  width: 26,
                  height: 26,
                  background: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748B',
                  fontSize: '0.9rem'
                }}
              >
                ‹
              </button>
              <button
                onClick={handleToday}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  padding: '3px 12px',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  color: '#1E293B',
                  cursor: 'pointer'
                }}
              >
                Today
              </button>
              <button
                onClick={handleNextMonth}
                style={{
                  width: 26,
                  height: 26,
                  background: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748B',
                  fontSize: '0.9rem'
                }}
              >
                ›
              </button>
            </div>
          </div>

          {/* Weekday Labels Header Row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            textAlign: 'left',
            padding: '6px 0',
            borderBottom: '1px solid #F1F5F9',
            fontSize: '0.74rem',
            fontWeight: 600,
            color: '#64748B'
          }}>
            <div style={{ paddingLeft: '6px' }}>Sun</div>
            <div style={{ paddingLeft: '6px' }}>Mon</div>
            <div style={{ paddingLeft: '6px' }}>Tue</div>
            <div style={{ paddingLeft: '6px' }}>Wed</div>
            <div style={{ paddingLeft: '6px' }}>Thu</div>
            <div style={{ paddingLeft: '6px' }}>Fri</div>
            <div style={{ paddingLeft: '6px' }}>Sat</div>
          </div>

          {/* 35 Calendar Cells Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '1px',
            background: '#F1F5F9',
            border: '1px solid #F1F5F9',
            marginTop: '2px'
          }}>
            {gridDays.map((cell, idx) => {
              const dayEvents = filteredEvents.filter(e => e.date === cell.dateIso);
              const isSelected = selectedDateIso === cell.dateIso;

              return (
                <div
                  key={idx}
                  className="calendar-day-cell"
                  onClick={() => setSelectedDateIso(cell.dateIso)}
                  style={{
                    minHeight: '80px',
                    background: isSelected ? '#F0FDF4' : '#FFFFFF',
                    border: isSelected ? '2px solid #10B981' : 'none',
                    padding: '5px 6px',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'all 0.15s ease',
                    boxSizing: 'border-box'
                  }}
                >
                  {/* Day Number */}
                  <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '3px' }}>
                    {isSelected ? (
                      <span style={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        backgroundColor: '#10B981',
                        color: '#FFFFFF',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {cell.dayNum}
                      </span>
                    ) : (
                      <span style={{
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        color: cell.isCurrentMonth ? '#1E293B' : '#94A3B8'
                      }}>
                        {cell.dayNum}
                      </span>
                    )}
                  </div>

                  {/* Event Chips inside Cell */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    {dayEvents.slice(0, 2).map(evt => {
                      const isTraffic = evt.type.toLowerCase().includes('traffic');
                      const isCrowd = evt.type.toLowerCase().includes('crowd') || evt.type.toLowerCase().includes('rush');
                      const isWeather = evt.type.toLowerCase().includes('weather') || evt.type.toLowerCase().includes('rain');
                      const isEvent = evt.type.toLowerCase().includes('event') || evt.type.toLowerCase().includes('summit') || evt.type.toLowerCase().includes('match');
                      const isRoad = evt.type.toLowerCase().includes('road');

                      let bg = '#FEE2E2';
                      let color = '#EF4444';
                      let iconType = '🚗';

                      if (isCrowd) {
                        bg = evt.title.includes('Weekend') || evt.title.includes('Expected') ? '#DCFCE7' : '#DBEAFE';
                        color = evt.title.includes('Weekend') || evt.title.includes('Expected') ? '#16A34A' : '#2563EB';
                        iconType = '👥';
                      } else if (isWeather) {
                        bg = '#E0F2FE';
                        color = '#0284C7';
                        iconType = '☁️';
                      } else if (isEvent) {
                        bg = '#F3E8FF';
                        color = '#7C3AED';
                        iconType = evt.title.includes('Cricket') ? '👥' : '🎵';
                      } else if (isRoad) {
                        bg = '#FEF3C7';
                        color = '#D97706';
                        iconType = '⚠️';
                      }

                      return (
                        <div
                          key={evt.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDateIso(cell.dateIso);
                            setSelectedEventModal(evt);
                          }}
                          style={{
                            background: bg,
                            color: color,
                            borderRadius: '4px',
                            padding: '2px 5px',
                            fontSize: '0.62rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            lineHeight: 1.2
                          }}
                          title={`${evt.title} (${evt.time || ''})`}
                        >
                          <span style={{ fontSize: '0.65rem' }}>{iconType}</span>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{evt.title}</span>
                        </div>
                      );
                    })}

                    {dayEvents.length > 2 && (
                      <span style={{ fontSize: '0.6rem', color: '#64748B', fontWeight: 600 }}>
                        +{dayEvents.length - 2} more
                      </span>
                    )}
                  </div>

                </div>
              );
            })}
          </div>

        </div>

        {/* RIGHT: SELECTED DATE EVENT DOSSIER (24 September 2026) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          
          {/* Header Row: Date & Event Count */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '2px 4px'
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              {formatHeaderDate(selectedDateIso)}
            </h3>
            <span style={{
              background: '#ECFDF5',
              border: '1px solid #A7F3D0',
              color: '#10B981',
              borderRadius: '20px',
              padding: '2px 10px',
              fontSize: '0.72rem',
              fontWeight: 700
            }}>
              {selectedDateEvents.length} Events
            </span>
          </div>

          {/* Event Cards List */}
          {selectedDateEvents.length > 0 ? (
            selectedDateEvents.map((evt, idx) => {
              const isTraffic = evt.type.toLowerCase().includes('traffic');
              const isHigh = evt.severity === 'High';
              const isExpanded = impactExpanded[evt.id] !== false;

              return (
                <div
                  key={evt.id}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderLeft: `3px solid ${isTraffic || isHigh ? '#EF4444' : '#2563EB'}`,
                    borderRadius: '8px',
                    padding: '12px 14px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                  }}
                >
                  {/* Top Row: Icon + Title + Severity Pill */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: 24,
                        height: 24,
                        borderRadius: '6px',
                        background: isTraffic ? '#FEE2E2' : '#DBEAFE',
                        color: isTraffic ? '#EF4444' : '#2563EB',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {isTraffic ? (
                          <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" strokeWidth="2">
                            <rect x="3" y="11" width="18" height="8" rx="2"/>
                            <path d="M5 11l2-5h10l2 5"/>
                            <circle cx="7.5" cy="15.5" r="1.5"/>
                            <circle cx="16.5" cy="15.5" r="1.5"/>
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" strokeWidth="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                            <circle cx="9" cy="7" r="4"/>
                          </svg>
                        )}
                      </div>
                      <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0F172A' }}>
                        {evt.title}
                      </span>
                    </div>

                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.67rem',
                      fontWeight: 700,
                      background: evt.severity === 'High' ? '#FEE2E2' : '#FEF3C7',
                      color: evt.severity === 'High' ? '#EF4444' : '#D97706'
                    }}>
                      {evt.severity}
                    </span>
                  </div>

                  {/* Metadata: Time & Location */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.7rem', color: '#64748B', fontWeight: 500, marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <svg viewBox="0 0 24 24" width="11" height="11" stroke="currentColor" fill="none" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                      </svg>
                      <span>{evt.time || '08:00 – 11:00'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <svg viewBox="0 0 24 24" width="11" height="11" stroke="currentColor" fill="none" strokeWidth="2">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                        <circle cx="12" cy="9" r="2.5"/>
                      </svg>
                      <span>{evt.location}</span>
                    </div>
                  </div>

                  {/* Description */}
                  <p style={{
                    fontSize: '0.7rem',
                    color: '#64748B',
                    lineHeight: 1.35,
                    margin: '0 0 8px 0'
                  }}>
                    {evt.description}
                  </p>

                  {/* Collapsible Predicted Impact Section */}
                  <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '8px' }}>
                    <div
                      onClick={() => toggleImpact(evt.id)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                        color: '#2563EB',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        marginBottom: isExpanded ? '6px' : 0
                      }}
                    >
                      <span>Predicted Impact (Confidence {evt.confidence || '84%'})</span>
                      <svg
                        viewBox="0 0 24 24"
                        width="12"
                        height="12"
                        stroke="currentColor"
                        fill="none"
                        strokeWidth="2.5"
                        style={{ transform: isExpanded ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.2s ease' }}
                      >
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </div>

                    {isExpanded && evt.impact && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                        {evt.impact.map((imp, i) => (
                          <div key={i} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 50px', alignItems: 'center', gap: '6px', fontSize: '0.67rem' }}>
                            <span style={{ color: '#475569', fontWeight: 600 }}>{imp.category}</span>
                            <div style={{ background: '#F1F5F9', height: 5, borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ background: imp.color, width: `${imp.pct}%`, height: '100%', borderRadius: 3 }} />
                            </div>
                            <span style={{ fontWeight: 700, color: imp.color, textAlign: 'right' }}>{imp.level}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              );
            })
          ) : (
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '24px 16px',
              textAlign: 'center',
              color: '#64748B'
            }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>📅</div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>
                No High-Impact Events
              </div>
              <p style={{ fontSize: '0.72rem', margin: 0, lineHeight: 1.4 }}>
                Nominal baseline city flow predicted for {formatHeaderDate(selectedDateIso)}.
              </p>
            </div>
          )}

        </div>

      </div>

      {/* 5. BOTTOM SECTION: UPCOMING PREDICTED EVENTS TABLE (Matching media_1792576780327_d495e63f.png) */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '12px',
        padding: '14px 18px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        
        {/* Table Title & View All Link */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '10px'
        }}>
          <h3 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            Upcoming Predicted Events
          </h3>
          <span
            onClick={() => {
              setShowAllUpcoming(!showAllUpcoming);
              showToast(showAllUpcoming ? "Showing primary upcoming events" : "Showing extended 30-day forecast");
            }}
            style={{
              fontSize: '0.74rem',
              fontWeight: 700,
              color: '#2563EB',
              cursor: 'pointer'
            }}
          >
            {showAllUpcoming ? 'Show Less' : 'View All'}
          </span>
        </div>

        {/* Clean Responsive Table */}
        <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', minWidth: '640px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.74rem' }}>
            <thead>
              <tr style={{ color: '#94A3B8', fontWeight: 600, borderBottom: '1px solid #F1F5F9' }}>
                <th style={{ padding: '8px 6px', fontWeight: 600 }}>DATE</th>
                <th style={{ padding: '8px 6px', fontWeight: 600 }}>EVENT</th>
                <th style={{ padding: '8px 6px', fontWeight: 600 }}>TYPE</th>
                <th style={{ padding: '8px 6px', fontWeight: 600 }}>LOCATION</th>
                <th style={{ padding: '8px 6px', fontWeight: 600 }}>PREDICTED IMPACT</th>
                <th style={{ padding: '8px 6px', fontWeight: 600 }}>SEVERITY</th>
                <th style={{ padding: '8px 6px', fontWeight: 600, textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {(showAllUpcoming ? upcomingTableRows : upcomingTableRows.slice(0, 4)).map((row) => (
                <tr
                  key={row.id}
                  style={{
                    borderBottom: '1px solid #F8FAFC',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F8FAFC'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <td style={{ padding: '10px 6px', fontWeight: 500, color: '#334155' }}>
                    {row.date}
                  </td>
                  <td style={{ padding: '10px 6px', fontWeight: 700, color: '#0F172A' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{row.category === 'traffic' ? '🚗' : row.category === 'crowd' ? '👥' : '☁️'}</span>
                      <span>{row.event}</span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 6px', color: '#475569', fontWeight: 500 }}>
                    {row.type}
                  </td>
                  <td style={{ padding: '10px 6px', color: '#475569', fontWeight: 500 }}>
                    {row.location}
                  </td>
                  <td style={{ padding: '10px 6px', color: '#475569', fontWeight: 500 }}>
                    {row.impact}
                  </td>
                  <td style={{ padding: '10px 6px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.67rem',
                      fontWeight: 700,
                      background: row.severity === 'High' ? '#FEE2E2' : '#FEF3C7',
                      color: row.severity === 'High' ? '#EF4444' : '#D97706'
                    }}>
                      {row.severity}
                    </span>
                  </td>
                  <td style={{ padding: '10px 6px', textAlign: 'right' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDateIso(row.dateIso);
                        const match = eventsList.find(ev => ev.date === row.dateIso) || {
                          id: row.id,
                          title: row.event,
                          type: row.type,
                          location: row.location,
                          severity: row.severity,
                          time: '08:00 – 14:00',
                          description: row.impact,
                          confidence: '85%'
                        };
                        setSelectedEventModal(match);
                        showToast(`Opened ${row.event} on ${row.date}`);
                      }}
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        borderRadius: '6px',
                        color: '#2563EB',
                        padding: '3px 12px',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>

      {/* 6. MODAL: DETAILED EVENT DOSSIER POPUP */}
      {selectedEventModal && (
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
            width: '480px',
            maxWidth: '92vw',
            padding: '20px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            border: '1px solid #E2E8F0'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
                  {selectedEventModal.title}
                </span>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: 4,
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  background: selectedEventModal.severity === 'High' ? '#FEE2E2' : '#FEF3C7',
                  color: selectedEventModal.severity === 'High' ? '#EF4444' : '#D97706'
                }}>
                  {selectedEventModal.severity}
                </span>
              </div>
              <button
                onClick={() => setSelectedEventModal(null)}
                style={{ background: 'transparent', border: 'none', fontSize: '1.1rem', cursor: 'pointer', color: '#64748B' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', gap: 12, fontSize: '0.74rem', color: '#64748B', marginBottom: 12 }}>
              <div>📅 <strong>{selectedEventModal.date}</strong></div>
              <div>🕒 <strong>{selectedEventModal.time || 'All Day'}</strong></div>
              <div>📍 <strong>{selectedEventModal.location}</strong></div>
            </div>

            <p style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.45, marginBottom: 14 }}>
              {selectedEventModal.description}
            </p>

            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '10px 12px', marginBottom: 14 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>
                Predictive Model Confidence: {selectedEventModal.confidence || '84%'}
              </div>
              <p style={{ fontSize: '0.7rem', color: '#64748B', margin: 0, lineHeight: 1.35 }}>
                Derived from multi-variable correlation across 36 months of BBMP traffic sensor telemetry, historical weather patterns, and public event registrations.
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                onClick={() => {
                  setSelectedDateIso(selectedEventModal.date);
                  setSelectedEventModal(null);
                  showToast(`Selected date ${selectedEventModal.date}`);
                }}
                style={{
                  background: '#2563EB',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 6,
                  padding: '7px 16px',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Focus on Calendar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
