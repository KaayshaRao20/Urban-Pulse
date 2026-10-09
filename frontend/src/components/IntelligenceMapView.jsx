import React, { useState, useEffect, useRef } from 'react';

const API_BASE = 'http://localhost:8000/api';

export default function IntelligenceMapView({ timestamp }) {
  const mapContainerRef = useRef(null);
  const gisMapInst = useRef(null);
  const streetTileLayer = useRef(null);
  const satTileLayer = useRef(null);
  const markersGroup = useRef(null);

  // States
  const [mapMode, setMapMode] = useState('street');
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [isRightCollapsed, setIsRightCollapsed] = useState(false);
  const [activeIncidentId, setActiveIncidentId] = useState('inc-001');
  const [incidents, setIncidents] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [aiRecommendation, setAiRecommendation] = useState('');
  const [actionsList, setActionsList] = useState([]);

  // Accordion states
  const [isActionsOpen, setIsActionsOpen] = useState(true);
  const [isRelatedOpen, setIsRelatedOpen] = useState(false);

  // Layer visibility state
  const [layers, setLayers] = useState({
    traffic: true,
    crowd: true,
    weather: true,
    events: false,
    alerts: true
  });

  // Filter form states
  const [timeRange, setTimeRange] = useState('Last 1 Hour');
  const [zone, setZone] = useState('All Zones');
  const [severities, setSeverities] = useState({ Critical: true, Moderate: false, Low: false });
  const [sources, setSources] = useState({ traffic: true, crowd: true, weather: true });
  const [searchQuery, setSearchQuery] = useState('');

  // Initial map setup
  useEffect(() => {
    if (!window.L || !mapContainerRef.current) return;
    if (gisMapInst.current) return;

    const map = window.L.map(mapContainerRef.current, { zoomControl: false }).setView([12.9716, 77.5946], 12);
    gisMapInst.current = map;

    streetTileLayer.current = window.L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors & CartoDB'
    }).addTo(map);

    satTileLayer.current = window.L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 18,
      attribution: '&copy; Esri & World Imagery'
    });

    markersGroup.current = window.L.layerGroup().addTo(map);

    fetchIncidents();
  }, []);

  // Invalidate map size when panels collapse/expand
  useEffect(() => {
    if (gisMapInst.current) {
      setTimeout(() => gisMapInst.current.invalidateSize(), 250);
    }
  }, [isLeftCollapsed, isRightCollapsed]);

  // Handle Street / Satellite mode switch
  useEffect(() => {
    if (!gisMapInst.current) return;
    if (mapMode === 'satellite') {
      if (gisMapInst.current.hasLayer(streetTileLayer.current)) gisMapInst.current.removeLayer(streetTileLayer.current);
      if (!gisMapInst.current.hasLayer(satTileLayer.current)) satTileLayer.current.addTo(gisMapInst.current);
    } else {
      if (gisMapInst.current.hasLayer(satTileLayer.current)) gisMapInst.current.removeLayer(satTileLayer.current);
      if (!gisMapInst.current.hasLayer(streetTileLayer.current)) streetTileLayer.current.addTo(gisMapInst.current);
    }
  }, [mapMode]);

  // Fetch incidents list from backend API
  const fetchIncidents = async () => {
    try {
      const res = await fetch(`${API_BASE}/map/incidents`);
      if (res.ok) {
        const data = await res.json();
        setIncidents(data);
        if (data.length > 0) {
          loadIncident(data[0].id, data);
        }
      }
    } catch (e) {
      console.log("Error fetching map incidents:", e);
    }
  };

  // Render markers when incidents or layer visibility change
  useEffect(() => {
    if (!markersGroup.current || incidents.length === 0) return;
    markersGroup.current.clearLayers();

    incidents.forEach(inc => {
      // Layer visibility filter
      if (!layers[inc.type] && !(inc.type === 'traffic' && layers.traffic)) {
        if (inc.severity === 'Critical' && !layers.alerts) return;
      }

      let pinBg = "#059669";
      let iconSvg = `<svg viewBox="0 0 24 24" style="width:14px; height:14px; stroke:white; fill:none; stroke-width:2.2;"><rect x="3" y="11" width="18" height="8" rx="2"/><path d="M5 11l2-5h10l2 5"/><circle cx="7.5" cy="15.5" r="1.5"/><circle cx="16.5" cy="15.5" r="1.5"/></svg>`;

      if (inc.type === 'crowd') {
        pinBg = "#2563EB";
        iconSvg = `<svg viewBox="0 0 24 24" style="width:14px; height:14px; stroke:white; fill:none; stroke-width:2.2;"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
      } else if (inc.type === 'weather') {
        pinBg = "#0284C7";
        iconSvg = `<svg viewBox="0 0 24 24" style="width:14px; height:14px; stroke:white; fill:none; stroke-width:2.2;"><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/><path d="M8 16v3"/><path d="M12 16v3"/><path d="M16 16v3"/></svg>`;
      } else if (inc.severity === 'Critical' || inc.type === 'alerts') {
        pinBg = "#EF4444";
        iconSvg = `<svg viewBox="0 0 24 24" style="width:14px; height:14px; stroke:white; fill:none; stroke-width:2.5;"><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
      }

      const isSelected = inc.id === activeIncidentId;

      const auraRing = (inc.severity === 'Critical') ? `
        <div style="
          position: absolute;
          width: ${isSelected ? '60px' : '48px'};
          height: ${isSelected ? '60px' : '48px'};
          border-radius: 50%;
          background: rgba(239, 68, 68, 0.22);
          border: 1px solid rgba(239, 68, 68, 0.4);
          animation: pulse-live 1.8s infinite ease-in-out;
          pointer-events: none;
        "></div>
      ` : '';

      const customMarkerHtml = `
        <div style="position: relative; display: flex; align-items: center; justify-content: center;">
          ${auraRing}
          <div style="
            width: ${isSelected ? '36px' : '28px'};
            height: ${isSelected ? '36px' : '28px'};
            border-radius: 50%;
            background: ${pinBg};
            border: 2px solid #FFFFFF;
            box-shadow: 0 3px 10px rgba(0,0,0,0.25);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 2;
          ">
            ${iconSvg}
          </div>
        </div>
      `;

      const customIcon = window.L.divIcon({
        html: customMarkerHtml,
        className: 'custom-map-pin',
        iconSize: [isSelected ? 36 : 28, isSelected ? 36 : 28],
        iconAnchor: [isSelected ? 18 : 14, isSelected ? 18 : 14]
      });

      const marker = window.L.marker([inc.lat, inc.lng], { icon: customIcon });

      const popupContent = `
        <div style="display:flex; align-items:flex-start; gap:10px; font-family:Inter, sans-serif;">
          <div style="width:34px; height:34px; border-radius:8px; background:#FEF2F2; color:#EF4444; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
            <svg viewBox="0 0 24 24" style="width:18px; height:18px; stroke:currentColor; fill:none; stroke-width:2;"><rect x="3" y="11" width="18" height="8" rx="2"/><path d="M5 11l2-5h10l2 5"/><circle cx="7.5" cy="15.5" r="1.5"/><circle cx="16.5" cy="15.5" r="1.5"/></svg>
          </div>
          <div style="flex:1;">
            <div style="display:flex; align-items:center; justify-content:space-between; gap:6px;">
              <strong style="font-size:0.88rem; color:#0F172A; font-weight:800;">${inc.title || inc.name}</strong>
              <span style="color:#64748B; font-weight:bold; font-size:0.9rem;">›</span>
            </div>
            <div style="font-size:0.76rem; margin-top:4px; line-height:1.45; color:#334155;">
              <div><span style="color:#64748B;">Traffic:</span> <strong style="color:${inc.traffic_speed < 25 ? '#EF4444' : '#059669'};">${inc.traffic_speed < 25 ? 'Heavy' : 'Moderate'}</strong></div>
              <div><span style="color:#64748B;">Speed:</span> <strong style="color:${inc.traffic_speed < 25 ? '#EF4444' : '#059669'};">${inc.traffic_speed} km/h</strong></div>
              <div><span style="color:#64748B;">Crowd:</span> <strong style="color:#2563EB;">High (${inc.crowd_density}/km²)</strong></div>
              <div><span style="color:#64748B;">Weather:</span> <span style="color:#475569;">${inc.weather_condition}</span></div>
            </div>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, { offset: [0, -10], closeButton: false });

      marker.on('click', () => {
        loadIncident(inc.id, incidents);
        setIsRightCollapsed(false);
      });

      markersGroup.current.addLayer(marker);

      if (isSelected) {
        marker.openPopup();
      }
    });
  }, [incidents, layers, activeIncidentId]);

  // Load selected incident details into drawer and fetch backend AI analysis
  const loadIncident = async (incId, currentList = incidents) => {
    setActiveIncidentId(incId);
    const inc = currentList.find(i => i.id === incId) || currentList[0];
    if (!inc) return;

    if (inc.recommended_actions) {
      setActionsList(inc.recommended_actions);
    }

    if (gisMapInst.current) {
      gisMapInst.current.panTo([inc.lat, inc.lng]);
    }

    // Call backend Intelligence API
    try {
      const res = await fetch(`${API_BASE}/intelligence/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          traffic_speed: inc.traffic_speed,
          crowd_density: inc.crowd_density,
          weather: inc.weather_condition,
          location: inc.location,
          timestamp: inc.timestamp
        })
      });
      if (res.ok) {
        const data = await res.json();
        setAiRecommendation(data.recommendation);
      } else {
        setAiRecommendation(inc.recommendation);
      }
    } catch (e) {
      setAiRecommendation(inc.recommendation);
    }
  };

  // Filter application handler
  const applyFilters = async () => {
    const selectedSevs = Object.keys(severities).filter(k => severities[k]).join(',');
    const selectedSrcs = Object.keys(sources).filter(k => sources[k]).join(',');

    try {
      const res = await fetch(`${API_BASE}/map/filtered?time_range=${encodeURIComponent(timeRange)}&severity=${encodeURIComponent(selectedSevs)}&data_sources=${encodeURIComponent(selectedSrcs)}&zone=${encodeURIComponent(zone)}`);
      if (res.ok) {
        const data = await res.json();
        setIncidents(data.incidents);
        if (data.incidents.length > 0) {
          loadIncident(data.incidents[0].id, data.incidents);
        }
      }
    } catch (e) {
      console.log("Filter error:", e);
    }
  };

  const resetFilters = () => {
    setTimeRange('Last 1 Hour');
    setZone('All Zones');
    setSeverities({ Critical: true, Moderate: true, Low: true });
    setSources({ traffic: true, crowd: true, weather: true });
    fetchIncidents();
  };

  const activeInc = incidents.find(i => i.id === activeIncidentId) || incidents[0] || {};

  const handleActionToggle = (index) => {
    const updated = [...actionsList];
    updated[index].checked = !updated[index].checked;
    setActionsList(updated);
  };

  const checkedCount = actionsList.filter(a => a.checked).length;

  const downloadReport = async () => {
    if (!activeInc.id) return;
    const chkText = actionsList.filter(a => a.checked).map(a => a.text);
    try {
      const res = await fetch(`${API_BASE}/reports/incident`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incident_id: activeInc.id,
          location: activeInc.location,
          timestamp: activeInc.timestamp,
          selected_actions: chkText
        })
      });
      if (res.ok) {
        const data = await res.json();
        const blob = new Blob([data.report_text], { type: 'text/plain' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = data.filename;
        link.click();
      }
    } catch (e) {
      console.log("Download report error:", e);
    }
  };

  const locateMe = () => {
    if (!gisMapInst.current) return;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => gisMapInst.current.setView([pos.coords.latitude, pos.coords.longitude], 14),
        () => gisMapInst.current.setView([12.9716, 77.5946], 13)
      );
    } else {
      gisMapInst.current.setView([12.9716, 77.5946], 13);
    }
  };

  return (
    <div className="map-workspace-view">
      {/* Top Map Toolbar */}
      <div className="map-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="map-search-box">
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              type="text"
              placeholder="Search location, landmark or zone..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                const match = incidents.find(i => i.name.toLowerCase().includes(e.target.value.toLowerCase()));
                if (match) loadIncident(match.id);
              }}
            />
          </div>

          <div className="map-mode-toggle">
            <button className={`map-mode-btn ${mapMode === 'street' ? 'active' : ''}`} onClick={() => setMapMode('street')}>Map</button>
            <button className={`map-mode-btn ${mapMode === 'satellite' ? 'active' : ''}`} onClick={() => setMapMode('satellite')}>Satellite</button>
          </div>

          <div className="control-select">
            <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <span>{timeRange}</span>
            <svg viewBox="0 0 24 24" style={{ width: 12, height: 12 }}><path d="M6 9l6 6 6-6"/></svg>
          </div>
        </div>

        <div className="map-tb-right">
          <div className="live-badge-group">
            <span className="dot-live"></span>
            <span>Live Data</span>
            <span style={{ color: '#94A3B8', margin: '0 2px' }}>|</span>
            <span>{timestamp || '27 Sep 2026 14:32:18'}</span>
          </div>

          <div className="control-select">
            <svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
            <span>Bengaluru</span>
            <svg viewBox="0 0 24 24" style={{ width: 12, height: 12 }}><path d="M6 9l6 6 6-6"/></svg>
          </div>

          <button className="btn-icon-sq" title="Refresh Map Data" onClick={fetchIncidents}>
            <svg viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          </button>
          <button className="btn-icon-sq" title="Download Report" onClick={downloadReport}>
            <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </button>
        </div>
      </div>

      {/* Map Content Layout */}
      <div className="map-content-layout">
        {/* Left Collapsible Filter Panel */}
        <div className={`map-left-panel ${isLeftCollapsed ? 'collapsed' : ''}`}>
          <div className="panel-section-head">
            <span>Map Layers</span>
            <button onClick={() => setIsLeftCollapsed(!isLeftCollapsed)}>
              <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, stroke: 'currentColor', fill: 'none' }}><polyline points="15 18 9 12 15 6"/></svg>
            </button>
          </div>

          <div className="layer-list">
            <label className="layer-item">
              <input type="checkbox" checked={layers.traffic} onChange={(e) => setLayers({ ...layers, traffic: e.target.checked })} />
              <div className="layer-icon-box traffic"><svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="8" rx="2"/><path d="M5 11l2-5h10l2 5"/><circle cx="7.5" cy="15.5" r="1.5"/><circle cx="16.5" cy="15.5" r="1.5"/></svg></div>
              <span>Traffic</span>
            </label>
            <label className="layer-item">
              <input type="checkbox" checked={layers.crowd} onChange={(e) => setLayers({ ...layers, crowd: e.target.checked })} />
              <div className="layer-icon-box crowd"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
              <span>Crowd</span>
            </label>
            <label className="layer-item">
              <input type="checkbox" checked={layers.weather} onChange={(e) => setLayers({ ...layers, weather: e.target.checked })} />
              <div className="layer-icon-box weather"><svg viewBox="0 0 24 24"><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/><path d="M8 16v3"/><path d="M12 16v3"/><path d="M16 16v3"/></svg></div>
              <span>Weather</span>
            </label>
            <label className="layer-item">
              <input type="checkbox" checked={layers.events} onChange={(e) => setLayers({ ...layers, events: e.target.checked })} />
              <div className="layer-icon-box events"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>
              <span>Events</span>
            </label>
            <label className="layer-item">
              <input type="checkbox" checked={layers.alerts} onChange={(e) => setLayers({ ...layers, alerts: e.target.checked })} />
              <div className="layer-icon-box alerts"><svg viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg></div>
              <span>Alerts</span>
            </label>
          </div>

          <div className="panel-section-head">
            <span>Filters</span>
            <button onClick={resetFilters} style={{ color: '#059669' }}>Reset</button>
          </div>

          <div className="filter-group">
            <div className="filter-label">Time Range</div>
            <select className="filter-select" value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
              <option value="Last 15 Minutes">Last 15 Minutes</option>
              <option value="Last 1 Hour">Last 1 Hour</option>
              <option value="Last 6 Hours">Last 6 Hours</option>
              <option value="Last 24 Hours">Last 24 Hours</option>
            </select>
          </div>

          <div className="filter-group">
            <div className="filter-label">Severity</div>
            <label className="layer-item" style={{ marginBottom: 4 }}>
              <input type="checkbox" checked={severities.Critical} onChange={(e) => setSeverities({ ...severities, Critical: e.target.checked })} />
              <span style={{ display: 'inline-block', width: 12, height: 12, background: '#EF4444', borderRadius: 3, marginRight: 4 }}></span> Critical
            </label>
            <label className="layer-item" style={{ marginBottom: 4 }}>
              <input type="checkbox" checked={severities.Moderate} onChange={(e) => setSeverities({ ...severities, Moderate: e.target.checked })} />
              <span style={{ display: 'inline-block', width: 12, height: 12, background: '#D97706', borderRadius: 3, marginRight: 4 }}></span> Moderate
            </label>
            <label className="layer-item">
              <input type="checkbox" checked={severities.Low} onChange={(e) => setSeverities({ ...severities, Low: e.target.checked })} />
              <span style={{ display: 'inline-block', width: 12, height: 12, background: '#94A3B8', borderRadius: 3, marginRight: 4 }}></span> Low
            </label>
          </div>

          <div className="filter-group">
            <div className="filter-label">Data Source</div>
            <label className="layer-item" style={{ marginBottom: 4 }}>
              <input type="checkbox" checked={sources.traffic} onChange={(e) => setSources({ ...sources, traffic: e.target.checked })} /> Traffic
            </label>
            <label className="layer-item" style={{ marginBottom: 4 }}>
              <input type="checkbox" checked={sources.crowd} onChange={(e) => setSources({ ...sources, crowd: e.target.checked })} /> Crowd
            </label>
            <label className="layer-item">
              <input type="checkbox" checked={sources.weather} onChange={(e) => setSources({ ...sources, weather: e.target.checked })} /> Weather
            </label>
          </div>

          <div className="filter-group">
            <div className="filter-label">Zone / Area</div>
            <select className="filter-select" value={zone} onChange={(e) => setZone(e.target.value)}>
              <option value="All Zones">All Zones</option>
              <option value="Marathahalli">Marathahalli</option>
              <option value="Whitefield">Whitefield</option>
              <option value="Hebbal">Hebbal</option>
              <option value="Indiranagar">Indiranagar</option>
              <option value="Koramangala">Koramangala</option>
              <option value="Electronic City">Electronic City</option>
              <option value="BTM Layout">BTM Layout</option>
            </select>
          </div>

          <button className="btn-apply-filters" onClick={applyFilters}>Apply Filters</button>
        </div>

        {/* Center Leaflet Map Viewport */}
        <div className="map-center-viewport">
          <button className="toggle-left-btn" onClick={() => setIsLeftCollapsed(!isLeftCollapsed)}>
            <svg viewBox="0 0 24 24"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>
          </button>
          <div id="gis-map-container" ref={mapContainerRef}></div>

          {/* Scale Bar */}
          <div className="map-scale-bar">5 km</div>

          {/* Floating Control Buttons */}
          <div className="map-floating-controls">
            <button className="map-float-btn" title="Locate Position" onClick={locateMe}>
              <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/></svg>
            </button>
            <button className="map-float-btn" title="Zoom In" onClick={() => gisMapInst.current && gisMapInst.current.zoomIn()}>
              <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
            <button className="map-float-btn" title="Zoom Out" onClick={() => gisMapInst.current && gisMapInst.current.zoomOut()}>
              <svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
            <button className="map-float-btn" title="Layer Stack" onClick={() => setIsLeftCollapsed(!isLeftCollapsed)}>
              <svg viewBox="0 0 24 24"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
            </button>
          </div>
        </div>

        {/* Right Collapsible Intelligence Drawer */}
        <div className={`map-right-drawer ${isRightCollapsed ? 'collapsed' : ''}`}>
          {activeInc && (
            <>
              <div className="drawer-head">
                <button className="drawer-collapse-btn" onClick={() => setIsRightCollapsed(true)} title="Collapse Drawer">
                  <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
                <div className="drawer-title-group">
                  <div className="drawer-icon-box">
                    <svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="8" rx="2"/><path d="M5 11l2-5h10l2 5"/><circle cx="7.5" cy="15.5" r="1.5"/><circle cx="16.5" cy="15.5" r="1.5"/></svg>
                  </div>
                  <div>
                    <div className="drawer-title">{activeInc.title || activeInc.name}</div>
                    <span className="badge-sev-high">{activeInc.severity} Severity</span>
                  </div>
                </div>
                <button className="btn-close-drawer" onClick={() => setIsRightCollapsed(true)}>✕</button>
              </div>

              {/* Navigation Tabs */}
              <div className="drawer-tabs">
                {['overview', 'traffic', 'crowd', 'weather'].map(tab => (
                  <div
                    key={tab}
                    className={`drawer-tab ${activeTab === tab ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </div>
                ))}
              </div>

              {activeTab === 'overview' && (
                <div>
                  {/* Top 3 Metric Cards */}
                  <div className="drawer-metrics-row">
                    <div className="drawer-metric-box">
                      <div className="dmb-label"><svg viewBox="0 0 24 24" style={{ color: '#EF4444' }}><rect x="3" y="11" width="18" height="8" rx="2"/><path d="M5 11l2-5h10l2 5"/><circle cx="7.5" cy="15.5" r="1.5"/><circle cx="16.5" cy="15.5" r="1.5"/></svg> {activeInc.traffic_speed} km/h</div>
                      <div className="dmb-sub down">↓ {Math.abs(activeInc.traffic_speed_change || 62)}%</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2 }}>Traffic Speed</div>
                    </div>

                    <div className="drawer-metric-box">
                      <div className="dmb-label"><svg viewBox="0 0 24 24" style={{ color: '#2563EB' }}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> {activeInc.crowd_density} /km²</div>
                      <div className="dmb-sub up">↑ {activeInc.crowd_density_change || 18}%</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2 }}>Crowd Density</div>
                    </div>

                    <div className="drawer-metric-box">
                      <div className="dmb-label"><svg viewBox="0 0 24 24" style={{ color: '#2563EB' }}><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/><path d="M8 16v3"/><path d="M12 16v3"/><path d="M16 16v3"/></svg> {activeInc.temp_c}°C</div>
                      <div className="dmb-sub" style={{ color: 'var(--text-muted)' }}>{activeInc.weather_condition}</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2 }}>Weather</div>
                    </div>
                  </div>

                  {/* Details Meta List */}
                  <div className="drawer-meta-list">
                    <div className="dm-item"><svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg> <span>{activeInc.location}</span></div>
                    <div className="dm-item"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> <span>{activeInc.detected_at}</span></div>
                    <div className="dm-item"><span style={{ color: '#EF4444' }}>●</span> Current Status: <strong style={{ marginLeft: 4 }}>{activeInc.status}</strong></div>
                    <div className="dm-item"><svg viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg> Data Source: <span style={{ marginLeft: 4, fontWeight: 600 }}>{(activeInc.data_sources || []).join(', ')}</span></div>
                  </div>

                  {/* Alert Banner Card */}
                  <div className="drawer-alert-card">
                    <div className="dac-head">
                      <svg viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
                      <span>{activeInc.alert_text}</span>
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Traffic speed is significantly lower than usual.</div>
                  </div>

                  {/* AI Recommendation Card */}
                  <div className="drawer-ai-card">
                    <div className="dai-head">
                      <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                      <span>AI Recommendation</span>
                    </div>
                    <div style={{ color: '#065F46', fontSize: '0.76rem', lineHeight: 1.35 }}>
                      "{aiRecommendation || activeInc.recommendation}"
                    </div>
                  </div>

                  {/* Recommended Actions Accordion */}
                  <div className="drawer-actions-box">
                    <div className="dab-head" onClick={() => setIsActionsOpen(!isActionsOpen)}>
                      <span>Recommended Actions ({checkedCount}/{actionsList.length})</span>
                      <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, transform: isActionsOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}><path d="M6 9l6 6 6-6"/></svg>
                    </div>
                    {isActionsOpen && (
                      <div style={{ marginTop: '0.5rem' }}>
                        {actionsList.map((act, index) => (
                          <label key={index} className="action-chk-item">
                            <input type="checkbox" checked={act.checked} onChange={() => handleActionToggle(index)} />
                            <span>{act.text}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Related Data Accordion */}
                  <div className="drawer-actions-box">
                    <div className="dab-head" onClick={() => setIsRelatedOpen(!isRelatedOpen)}>
                      <span>Related Data</span>
                      <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, transform: isRelatedOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}><path d="M6 9l6 6 6-6"/></svg>
                    </div>
                    {isRelatedOpen && (
                      <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-body)' }}>
                        <div style={{ padding: '4px 0', borderBottom: '1px solid #F1F5F9' }}>● <strong>Historical Congestion:</strong> +34% vs last week</div>
                        <div style={{ padding: '4px 0', borderBottom: '1px solid #F1F5F9' }}>● <strong>Nearest Transit Station:</strong> Bus Stop (120m)</div>
                        <div style={{ padding: '4px 0' }}>● <strong>Sensor Status:</strong> 12 Active Nodes</div>
                      </div>
                    )}
                  </div>

                  {/* Download Report Button */}
                  <button className="btn-download-rpt" onClick={downloadReport}>
                    <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    <span>Download Report</span>
                  </button>
                </div>
              )}

              {activeTab === 'traffic' && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '1rem 0' }}>
                  <strong>Detailed Traffic Metrics:</strong><br/>
                  - Average Speed: {activeInc.traffic_speed} km/h<br/>
                  - Congestion Level: 62%<br/>
                  - Flow Status: Impeded Outflow
                </div>
              )}

              {activeTab === 'crowd' && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '1rem 0' }}>
                  <strong>Detailed Crowd Metrics:</strong><br/>
                  - Density: {activeInc.crowd_density} people/km²<br/>
                  - Footfall Surge: Bus Interchange Station
                </div>
              )}

              {activeTab === 'weather' && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '1rem 0' }}>
                  <strong>Detailed Weather Metrics:</strong><br/>
                  - Condition: {activeInc.weather_condition} (2.4 mm/h)<br/>
                  - Temperature: {activeInc.temp_c}°C | Humidity: 78%
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
