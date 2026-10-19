import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config/api';

export default function PredictiveCalendarView({ timestamp: globalTimestamp }) {
  // Calendar View mode: 'month', 'week', 'list'
  const [viewMode, setViewMode] = useState('month');

  // Month navigation: default September 2026
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(8); // 0-indexed: 8 = September

  // Filter states
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedEventType, setSelectedEventType] = useState('all');
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected date & event state (default: 2026-09-24 as in reference UI)
  const [selectedDateIso, setSelectedDateIso] = useState('2026-09-24');
  const [selectedEventId, setSelectedEventId] = useState('evt-24-1');
  const [expandedWhyId, setExpandedWhyId] = useState(null);

  // Locations & Events data loaded from backend
  const [locationsList, setLocationsList] = useState([
    { id: 'loc-all', name: 'Bengaluru (Citywide)' },
    { id: 'loc-001', name: 'Marathahalli – Outer Ring Road' },
    { id: 'loc-002', name: 'MG Road Interchange' },
    { id: 'loc-003', name: 'Indiranagar 100ft Road' },
    { id: 'loc-004', name: 'Whitefield IT Corridor' },
    { id: 'loc-005', name: 'Koramangala 80ft Junction' },
    { id: 'loc-006', name: 'Electronic City Phase 1' },
    { id: 'loc-007', name: 'Silk Board Junction' }
  ]);
  const [eventsList, setEventsList] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Month Names
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Fetch Locations & Upcoming Events on mount
  useEffect(() => {
    fetchLocations();
    fetchUpcoming();
  }, []);

  // Fetch Predictive Events whenever Month, Location, Type, Severity, or Search changes
  useEffect(() => {
    fetchEvents();
  }, [currentYear, currentMonth, selectedLocation, selectedEventType, selectedSeverity, searchQuery]);

  const fetchLocations = async () => {
    try {
      const res = await fetch(`${API_BASE}/predictive-calendar/locations`);
      if (res.ok) {
        const data = await res.json();
        setLocationsList(data);
      }
    } catch (e) {
      console.log("Locations fetch error:", e);
    }
  };

  const fetchUpcoming = async () => {
    try {
      const res = await fetch(`${API_BASE}/predictive-calendar/upcoming`);
      if (res.ok) {
        const data = await res.json();
        setUpcomingEvents(data);
      }
    } catch (e) {
      console.log("Upcoming fetch error:", e);
    }
  };

  const fetchEvents = async () => {
    setIsLoading(true);
    const monthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    try {
      const params = new URLSearchParams({
        month: monthStr,
        location: selectedLocation,
        event_type: selectedEventType,
        severity: selectedSeverity,
        search: searchQuery
      });
      const res = await fetch(`${API_BASE}/predictive-calendar/events?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEventsList(data.events || []);
      }
    } catch (e) {
      console.log("Events fetch error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  // Month Navigation Handlers
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleToday = () => {
    setCurrentYear(2026);
    setCurrentMonth(8); // September 2026
    setSelectedDateIso('2026-09-24');
  };

  const renderEventIcon = (type, size = 13) => {
    const t = (type || '').toLowerCase();
    if (t.includes('traffic') || t.includes('road')) {
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} stroke="currentColor" fill="none" strokeWidth="2" style={{ flexShrink: 0 }}>
          <rect x="1" y="3" width="15" height="13" rx="2" />
          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
          <circle cx="5.5" cy="18.5" r="2.5" />
          <circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
      );
    }
    if (t.includes('weather') || t.includes('rain')) {
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} stroke="currentColor" fill="none" strokeWidth="2" style={{ flexShrink: 0 }}>
          <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
        </svg>
      );
    }
    if (t.includes('crowd') || t.includes('festival') || t.includes('holiday')) {
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} stroke="currentColor" fill="none" strokeWidth="2" style={{ flexShrink: 0 }}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    }
    if (t.includes('incident') || t.includes('hazard') || t.includes('surge')) {
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} stroke="currentColor" fill="none" strokeWidth="2" style={{ flexShrink: 0 }}>
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      );
    }
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} stroke="currentColor" fill="none" strokeWidth="2" style={{ flexShrink: 0 }}>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    );
  };

  // Build Calendar Days Matrix for Current Month
  const buildCalendarGrid = () => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const gridDays = [];

    // Prev Month Trailing Days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevMonthIdx = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dateIso = `${prevYear}-${String(prevMonthIdx + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      gridDays.push({ dayNum, dateIso, isCurrentMonth: false });
    }

    // Current Month Days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateIso = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      gridDays.push({ dayNum: d, dateIso, isCurrentMonth: true });
    }

    // Next Month Leading Days to complete 35 (or 42) cells
    const remainingCells = 35 - gridDays.length > 0 ? 35 - gridDays.length : 42 - gridDays.length;
    for (let n = 1; n <= remainingCells; n++) {
      const nextMonthIdx = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      const dateIso = `${nextYear}-${String(nextMonthIdx + 1).padStart(2, '0')}-${String(n).padStart(2, '0')}`;
      gridDays.push({ dayNum: n, dateIso, isCurrentMonth: false });
    }

    return gridDays;
  };

  const gridDays = buildCalendarGrid();

  // Get Events for a given Date ISO string
  const getEventsForDate = (dateIso) => {
    return eventsList.filter(e => e.date === dateIso);
  };

  // Selected Date's Events
  const selectedDateEvents = eventsList.filter(e => e.date === selectedDateIso);

  // Format Selected Date Display (e.g., "24 September 2026")
  const formatSelectedDateHeader = (isoStr) => {
    if (!isoStr) return '';
    const parts = isoStr.split('-');
    const day = parseInt(parts[2], 10);
    const mIdx = parseInt(parts[1], 10) - 1;
    const yr = parts[0];
    return `${day} ${monthNames[mIdx]} ${yr}`;
  };

  return (
    <div className="view-container">
      
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.3px' }}>Predictive Calendar</h1>
          <p style={{ fontSize: '0.8rem', color: '#64748B', marginTop: 2 }}>View and explore predicted urban events, high-impact dates and potential risks based on historical data, live trends and analytics.</p>
        </div>

        {/* Right Live Data Badge & Timestamp */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 8, padding: '0.45rem 0.85rem' }}>
            <span style={{ background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0', padding: '2px 8px', borderRadius: 12, fontSize: '0.72rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span className="dot-live"></span> Live Data
            </span>
            <div style={{ fontSize: '0.68rem', color: '#64748B' }}>
              <div>Last Updated</div>
              <strong style={{ color: '#0F172A' }}>{globalTimestamp || '27 Sep 2026 14:32:18'}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Top Toolbar Controls Row */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, padding: '0.65rem 0.85rem', marginBottom: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        
        {/* Left Filter Dropdowns */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          
          {/* Location Selector */}
          <div style={{ position: 'relative' }}>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              style={{ background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: 6, padding: '0.38rem 0.75rem 0.38rem 1.8rem', fontSize: '0.76rem', fontWeight: 700, color: '#0F172A', cursor: 'pointer', outline: 'none' }}
            >
              <option value="all">Bengaluru (Citywide)</option>
              {locationsList.filter(l => l.id !== 'loc-all').map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>

          {/* Event Types Dropdown */}
          <select
            value={selectedEventType}
            onChange={(e) => setSelectedEventType(e.target.value)}
            style={{ background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: 6, padding: '0.38rem 0.75rem', fontSize: '0.76rem', fontWeight: 700, color: '#0F172A', cursor: 'pointer', outline: 'none' }}
          >
            <option value="all">All Event Types</option>
            <option value="traffic">Traffic Surge</option>
            <option value="crowd">Large Crowd</option>
            <option value="weather">Weather Impact</option>
            <option value="event">Public Event</option>
            <option value="roadwork">Road Work</option>
            <option value="festival">Festival / Holiday</option>
          </select>

          {/* Severities Dropdown */}
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            style={{ background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: 6, padding: '0.38rem 0.75rem', fontSize: '0.76rem', fontWeight: 700, color: '#0F172A', cursor: 'pointer', outline: 'none' }}
          >
            <option value="all">All Severities</option>
            <option value="high">High Severity</option>
            <option value="moderate">Moderate Severity</option>
            <option value="low">Low Severity</option>
          </select>
        </div>

        {/* Right Navigation & View Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          
          {/* Today / Prev / Next */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <button
              onClick={handleToday}
              style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: 5, padding: '0.35rem 0.65rem', fontSize: '0.72rem', fontWeight: 700, color: '#0F172A', cursor: 'pointer' }}
            >
              Today
            </button>
            <button
              onClick={handlePrevMonth}
              style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 5, padding: '0.35rem 0.55rem', fontSize: '0.72rem', fontWeight: 700, color: '#0F172A', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title="Previous Month"
            >
              <svg viewBox="0 0 24 24" width="11" height="11" stroke="currentColor" fill="none" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <button
              onClick={handleNextMonth}
              style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 5, padding: '0.35rem 0.55rem', fontSize: '0.72rem', fontWeight: 700, color: '#0F172A', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title="Next Month"
            >
              <svg viewBox="0 0 24 24" width="11" height="11" stroke="currentColor" fill="none" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>

          {/* Month Selector Display */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: 6, padding: '0.35rem 0.65rem', fontSize: '0.76rem', fontWeight: 800, color: '#0F172A' }}>
            <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <span>{monthNames[currentMonth]} {currentYear}</span>
          </div>

          {/* Month / Week / List View Selector Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', background: '#F1F5F9', borderRadius: 6, padding: 2 }}>
            {['Month', 'Week', 'List'].map(mode => {
              const key = mode.toLowerCase();
              const isSel = viewMode === key;
              return (
                <button
                  key={key}
                  onClick={() => setViewMode(key)}
                  style={{
                    border: 'none',
                    background: isSel ? '#059669' : 'transparent',
                    color: isSel ? '#FFFFFF' : '#64748B',
                    borderRadius: 5,
                    padding: '0.3rem 0.65rem',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {mode}
                </button>
              );
            })}
          </div>

        </div>
      </div>

      {/* Categories Legend Bar & Search Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '8px' }}>
        
        {/* Category Legend Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: '0.7rem', fontWeight: 600, color: '#475569' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: '#EF4444' }}></span> Traffic Surge</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: '#2563EB' }}></span> Large Crowd</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: '#0284C7' }}></span> Weather Impact</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: '#7C3AED' }}></span> Public Event</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: '#EA580C' }}></span> Road Work</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: '#059669' }}></span> Festival</span>
        </div>

        {/* Search Input Box */}
        <div style={{ position: 'relative', width: 200 }}>
          <input
            type="text"
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 6, padding: '0.32rem 0.55rem 0.32rem 1.6rem', fontSize: '0.74rem', outline: 'none' }}
          />
          <svg viewBox="0 0 24 24" style={{ position: 'absolute', left: 6, top: 6, width: 13, height: 13, stroke: '#94A3B8', fill: 'none', strokeWidth: 2 }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </div>
      </div>

      {/* Main Grid: Calendar (Left) + Right Date Detail Panel */}
      <div className="calendar-main-grid" style={{ display: 'grid', gridTemplateColumns: viewMode === 'month' ? '1fr 310px' : '1fr', gap: '1rem', alignItems: 'start' }}>
        
        {/* =================================================================== */}
        {/* CALENDAR MAIN AREA (MONTH / WEEK / LIST VIEWS)                     */}
        {/* =================================================================== */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, padding: '0.75rem 0.85rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          
          {/* MONTH VIEW GRID */}
          {viewMode === 'month' && (
            <div>
              {/* Day Header Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #E2E8F0', paddingBottom: '6px', marginBottom: '6px', textAlign: 'center', fontSize: '0.68rem', fontWeight: 800, color: '#64748B', letterSpacing: '0.5px' }}>
                <div>SUN</div>
                <div>MON</div>
                <div>TUE</div>
                <div>WED</div>
                <div>THU</div>
                <div>FRI</div>
                <div>SAT</div>
              </div>

              {/* 35 Calendar Cells Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px' }}>
                {gridDays.map((cell, idx) => {
                  const evts = getEventsForDate(cell.dateIso);
                  const isSelected = selectedDateIso === cell.dateIso;
                  const hasEvents = evts.length > 0;

                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedDateIso(cell.dateIso)}
                      style={{
                        minHeight: 74,
                        background: isSelected ? '#F0FDF4' : (cell.isCurrentMonth ? '#FFFFFF' : '#FAFAFA'),
                        border: isSelected ? '2px solid #10B981' : '1px solid #F1F5F9',
                        borderRadius: 6,
                        padding: '4px 5px',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        transition: 'all 0.15s ease',
                        opacity: cell.isCurrentMonth ? 1 : 0.45
                      }}
                    >
                      {/* Top Day Number & Badge Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            background: isSelected ? '#059669' : 'transparent',
                            color: isSelected ? '#FFFFFF' : (cell.isCurrentMonth ? '#0F172A' : '#94A3B8'),
                            fontWeight: isSelected ? 800 : 700,
                            fontSize: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          {cell.dayNum}
                        </span>

                        {evts.length > 2 && (
                          <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#059669', background: '#ECFDF5', padding: '1px 5px', borderRadius: 8 }}>
                            Multiple Events
                          </span>
                        )}
                      </div>

                      {/* Prediction Chips inside Cell */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 4, flex: 1, justifyContent: 'flex-start' }}>
                        {evts.slice(0, 2).map((ev) => (
                          <div
                            key={ev.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDateIso(ev.date);
                              setSelectedEventId(ev.id);
                            }}
                            style={{
                              background: ev.badge_color || '#F1F5F9',
                              color: ev.text_color || '#0F172A',
                              padding: '2px 5px',
                              borderRadius: 4,
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 3
                            }}
                          >
                            {renderEventIcon(ev.type || ev.title, 11)}
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.title}</span>
                          </div>
                        ))}

                        {evts.length > 2 && (
                          <div style={{ display: 'flex', gap: 3, marginTop: 2, justifyContent: 'center' }}>
                            {evts.map((eItem, i) => (
                              <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: eItem.text_color || '#3B82F6' }}></span>
                            ))}
                          </div>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* WEEK VIEW */}
          {viewMode === 'week' && (
            <div style={{ padding: '1rem', textAlign: 'center', color: '#64748B' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.5rem' }}>Weekly Predictive Agenda</h3>
              <p style={{ fontSize: '0.8rem' }}>Displaying high-impact urban risk timeline for September 21–27, 2026.</p>
              <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {eventsList.slice(0, 5).map(ev => (
                  <div key={ev.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC', padding: '0.65rem 1rem', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: '1rem' }}>{ev.icon}</span>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0F172A' }}>{ev.title}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748B' }}>{ev.location} | {ev.time}</div>
                      </div>
                    </div>
                    <span style={{ background: ev.badge_color, color: ev.text_color, padding: '2px 8px', borderRadius: 4, fontSize: '0.72rem', fontWeight: 800 }}>{ev.severity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* LIST VIEW */}
          {viewMode === 'list' && (
            <div style={{ padding: '0.5rem' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.75rem' }}>Full Monthly Predictive Event Stream</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {eventsList.map(ev => (
                  <div key={ev.id} onClick={() => { setSelectedDateIso(ev.date); setViewMode('month'); }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC', padding: '0.65rem 1rem', borderRadius: 8, border: '1px solid #E2E8F0', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: '1.1rem' }}>{ev.icon}</span>
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F172A' }}>{ev.title}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748B' }}>{ev.date} | {ev.location} | {ev.time}</div>
                      </div>
                    </div>
                    <span style={{ background: ev.badge_color, color: ev.text_color, padding: '3px 10px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 800 }}>{ev.severity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* =================================================================== */}
        {/* RIGHT SIDE PANEL: SELECTED DATE PREDICTION DETAILS                  */}
        {/* =================================================================== */}
        {viewMode === 'month' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            
            {/* Header: Selected Date Title & Count */}
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, padding: '0.75rem 0.85rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#059669', color: '#FFFFFF', fontWeight: 800, fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {selectedDateIso ? selectedDateIso.split('-')[2] : '24'}
                  </span>
                  <h3 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    {formatSelectedDateHeader(selectedDateIso)}
                  </h3>
                </div>

                <span style={{ background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0', padding: '2px 6px', borderRadius: 10, fontSize: '0.68rem', fontWeight: 800 }}>
                  {selectedDateEvents.length} Events
                </span>
              </div>

              {/* Stack of Predicted Events for this Date */}
              {selectedDateEvents.length === 0 ? (
                <div style={{ padding: '0.85rem', textAlign: 'center', color: '#64748B', fontSize: '0.75rem', background: '#F8FAFC', borderRadius: 6 }}>
                  No predicted urban risk events for this date.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                  {selectedDateEvents.map((ev) => {
                    const isSelectedEvt = selectedEventId === ev.id;
                    const isWhyExpanded = expandedWhyId === ev.id;

                    return (
                      <div
                        key={ev.id}
                        onClick={() => setSelectedEventId(ev.id)}
                        style={{
                          background: isSelectedEvt ? '#FFFFFF' : '#FAFAFA',
                          border: isSelectedEvt ? `1.5px solid ${ev.text_color || '#EF4444'}` : '1px solid #E2E8F0',
                          borderRadius: 6,
                          padding: '0.65rem',
                          boxShadow: isSelectedEvt ? '0 1px 4px rgba(0,0,0,0.03)' : 'none',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {/* Event Title & Severity Badge */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {renderEventIcon(ev.type || ev.title, 16)}
                            <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>{ev.title}</h4>
                          </div>
                          <span style={{ background: ev.badge_color || '#FEF2F2', color: ev.text_color || '#EF4444', padding: '2px 8px', borderRadius: 4, fontSize: '0.65rem', fontWeight: 800 }}>
                            {ev.severity}
                          </span>
                        </div>

                        {/* Event Metadata: Time & Location */}
                        <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" fill="none" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                            <span>{ev.time}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <svg viewBox="0 0 24 24" width="12" height="12" stroke="#EF4444" fill="none" strokeWidth="2"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                            <span>{ev.location}</span>
                          </div>
                        </div>

                        {/* Description Summary */}
                        <p style={{ fontSize: '0.72rem', color: '#475569', marginTop: 6, lineHeight: 1.35 }}>
                          {ev.description}
                        </p>

                        {/* Supporting Factors / Prediction Rationale Collapsible */}
                        {ev.why && ev.why.length > 0 && (
                          <div style={{ marginTop: 8, borderTop: '1px dashed #CBD5E1', paddingTop: 6 }}>
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedWhyId(isWhyExpanded ? null : ev.id);
                              }}
                              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.68rem', fontWeight: 700, color: '#2563EB', cursor: 'pointer' }}
                            >
                              <span>Prediction Rationale (Confidence {ev.confidence || '84%'})</span>
                              <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" fill="none" strokeWidth="2" style={{ transform: isWhyExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s ease' }}><polyline points="6 9 12 15 18 9"/></svg>
                            </div>

                            {isWhyExpanded && (
                              <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 4, background: '#F8FAFC', padding: 6, borderRadius: 6 }}>
                                {ev.why.map((reason, rIdx) => (
                                  <div key={rIdx} style={{ fontSize: '0.65rem', color: '#334155', lineHeight: 1.3, display: 'flex', alignItems: 'flex-start', gap: 4 }}>
                                    <span style={{ color: '#0284C7' }}>•</span>
                                    <span>{reason}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Impact Assessment Indicators */}
                        {ev.impact && ev.impact.length > 0 && (
                          <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {ev.impact.map((imp, iIdx) => (
                              <div key={iIdx} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 45px', alignItems: 'center', gap: 6, fontSize: '0.65rem' }}>
                                <span style={{ color: '#64748B', fontWeight: 600 }}>{imp.category}</span>
                                <div style={{ background: '#E2E8F0', height: 5, borderRadius: 3, overflow: 'hidden' }}>
                                  <div style={{ background: imp.color || '#EF4444', width: `${imp.pct}%`, height: '100%', borderRadius: 3 }}></div>
                                </div>
                                <span style={{ fontWeight: 800, color: imp.color || '#EF4444', textAlign: 'right' }}>{imp.level}</span>
                              </div>
                            ))}
                          </div>
                        )}

                      </div>
                    );
                  })}
                </div>
              )}

            </div>

          </div>
        )}

      </div>

      {/* =================================================================== */}
      {/* BOTTOM SECTION: UPCOMING PREDICTED EVENTS TABLE                     */}
      {/* =================================================================== */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '1.1rem', marginTop: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        
        {/* Card Title & View All */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0F172A' }}>Upcoming Predicted Events</h3>
          <a style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563EB', cursor: 'pointer' }}>View All</a>
        </div>

        {/* Responsive Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '0.7rem', fontWeight: 800 }}>
                <th style={{ padding: '8px 10px' }}>Date</th>
                <th style={{ padding: '8px 10px' }}>Event</th>
                <th style={{ padding: '8px 10px' }}>Type</th>
                <th style={{ padding: '8px 10px' }}>Location</th>
                <th style={{ padding: '8px 10px' }}>Predicted Impact</th>
                <th style={{ padding: '8px 10px' }}>Severity</th>
                <th style={{ padding: '8px 10px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {upcomingEvents.map((row, rIdx) => (
                <tr key={rIdx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '10px', fontWeight: 700, color: '#0F172A' }}>{row.date}</td>
                  <td style={{ padding: '10px', fontWeight: 700, color: '#0F172A' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {renderEventIcon(row.type || row.event, 14)}
                      <span>{row.event}</span>
                    </div>
                  </td>
                  <td style={{ padding: '10px', color: '#475569' }}>
                    {row.type}
                  </td>
                  <td style={{ padding: '10px', color: '#475569' }}>{row.location}</td>
                  <td style={{ padding: '10px', color: '#475569' }}>{row.impact}</td>
                  <td style={{ padding: '10px' }}>
                    <span style={{ background: row.severity === 'High' ? '#FEF2F2' : '#FFEDD5', color: row.severity_color, padding: '2px 8px', borderRadius: 12, fontSize: '0.68rem', fontWeight: 800, border: `1px solid ${row.severity_color}` }}>
                      {row.severity}
                    </span>
                  </td>
                  <td style={{ padding: '10px', textAlign: 'center' }}>
                    <button
                      onClick={() => {
                        if (row.date_iso) {
                          setSelectedDateIso(row.date_iso);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                      }}
                      style={{ background: '#FFFFFF', border: '1px solid #10B981', color: '#059669', padding: '3px 12px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
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

    </div>
  );
}
