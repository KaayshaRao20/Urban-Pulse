import React, { useState, useEffect, useRef } from 'react';
import { API_BASE } from '../config/api';

export default function IntelligenceMapView({ timestamp, onNavigateToGrievance }) {
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

  // Layer visibility state (events removed as requested)
  const [layers, setLayers] = useState({
    traffic: true,
    crowd: true,
    weather: true,
    alerts: true,
    complaints: true
  });
  const [civicComplaints, setCivicComplaints] = useState([]);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [civicCategoryFilter, setCivicCategoryFilter] = useState('all');
  const [civicStatusFilter, setCivicStatusFilter] = useState('all');
  const [civicDeptFilter, setCivicDeptFilter] = useState('all');

  // Filter form states
  const [timeRange, setTimeRange] = useState('Last 1 Hour');
  const [zone, setZone] = useState('All Zones');
  const [incidentStatusFilter, setIncidentStatusFilter] = useState('active');
  const [severities, setSeverities] = useState({ Critical: true, High: true, Moderate: true, Low: true });
  const [sources, setSources] = useState({ traffic: true, crowd: true, weather: true });
  const [searchQuery, setSearchQuery] = useState('');
  const [weatherStations, setWeatherStations] = useState([]);

  // Geographic centers of Bengaluru key zones for instant map fly-to navigation
  const ZONE_CENTERS = {
    'Marathahalli': [12.9569, 77.7011],
    'Whitefield': [12.9698, 77.7500],
    'Hebbal': [13.0358, 77.5970],
    'Indiranagar': [12.9784, 77.6408],
    'Koramangala': [12.9352, 77.6245],
    'Electronic City': [12.8399, 77.6770],
    'BTM Layout': [12.9166, 77.6101],
    'Silk Board': [12.9172, 77.6229],
    'Majestic': [12.9767, 77.5713],
    'Bellandur': [12.9352, 77.6953],
    'Peenya': [13.0300, 77.5180],
    'Jayanagar': [12.9308, 77.5838],
    'MG Road': [12.9756, 77.6067]
  };

  // Expose navigation handler for Leaflet popup DOM clicks
  useEffect(() => {
    window.urbanPulseNavigateToGrievance = (ticketId) => {
      if (onNavigateToGrievance) onNavigateToGrievance(ticketId);
    };
    return () => {
      delete window.urbanPulseNavigateToGrievance;
    };
  }, [onNavigateToGrievance]);

  // Fetch real Weather API Meteorological Observatories from backend
  const fetchWeatherStations = async () => {
    try {
      const res = await fetch(`${API_BASE}/weather/stations`);
      if (res.ok) {
        const data = await res.json();
        if (data.stations && data.stations.length > 0) {
          setWeatherStations(data.stations);
        }
      }
    } catch (e) {
      console.log("Weather stations note:", e);
    }
  };

  // Initial map setup
  useEffect(() => {
    if (!window.L || !mapContainerRef.current) return;
    if (gisMapInst.current) return;

    const map = window.L.map(mapContainerRef.current, { zoomControl: false }).setView([12.9716, 77.5946], 12);
    gisMapInst.current = map;

    streetTileLayer.current = window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    satTileLayer.current = window.L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 18,
      attribution: '&copy; Esri & World Imagery'
    });

    markersGroup.current = window.L.layerGroup().addTo(map);

    fetchIncidents();
    fetchCivicComplaints();
    fetchWeatherStations();
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
  const fetchIncidents = async (status = incidentStatusFilter) => {
    try {
      const res = await fetch(`${API_BASE}/map/incidents?status=${encodeURIComponent(status)}`);
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

  // Fetch civic complaints submitted by citizens
  const fetchCivicComplaints = async () => {
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (civicCategoryFilter !== 'all') params.append('category', civicCategoryFilter);
      if (civicStatusFilter !== 'all') params.append('status', civicStatusFilter);
      if (civicDeptFilter !== 'all') params.append('department', civicDeptFilter);

      const res = await fetch(`${API_BASE}/grievances?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCivicComplaints(data.grievances || []);
      }
    } catch (e) {
      console.log("Error fetching civic complaints for map:", e);
    }
  };

  useEffect(() => {
    fetchCivicComplaints();
  }, [civicCategoryFilter, civicStatusFilter, civicDeptFilter]);

  // Dynamic reactive filtering for Telemetry Incidents
  const filteredIncidents = incidents.filter(inc => {
    // 1. Layer visibility check
    if (inc.type === 'traffic' && !layers.traffic) return false;
    if (inc.type === 'crowd' && !layers.crowd) return false;
    if (inc.type === 'weather' && !layers.weather) return false;
    if (inc.severity === 'Critical' && !layers.alerts && !layers[inc.type]) return false;

    // 2. Incident Status filter
    if (incidentStatusFilter === 'active' && inc.status === 'Resolved') return false;
    if (incidentStatusFilter === 'acknowledged' && inc.status !== 'Acknowledged') return false;
    if (incidentStatusFilter === 'resolved' && inc.status !== 'Resolved') return false;

    // 3. Severity filter
    if (severities[inc.severity] === false) return false;

    // 4. Data Source filter
    if (sources[inc.type] === false) return false;

    // 5. Zone / Area filter
    if (zone !== 'All Zones') {
      const z = zone.toLowerCase();
      const inLoc = (inc.location || '').toLowerCase().includes(z);
      const inZone = (inc.zone || '').toLowerCase().includes(z);
      const inTitle = (inc.title || '').toLowerCase().includes(z);
      if (!inLoc && !inZone && !inTitle) return false;
    }

    // 6. Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const inLoc = (inc.location || '').toLowerCase().includes(q);
      const inName = (inc.name || '').toLowerCase().includes(q);
      const inTitle = (inc.title || '').toLowerCase().includes(q);
      if (!inLoc && !inName && !inTitle) return false;
    }

    return true;
  });

  // Dynamic reactive filtering for Citizen Civic Grievances
  const filteredComplaints = civicComplaints.filter(comp => {
    if (!layers.complaints) return false;

    // Status filter
    if (incidentStatusFilter === 'resolved' && comp.status !== 'Resolved') return false;
    if (incidentStatusFilter === 'active' && comp.status === 'Resolved') return false;

    // Zone filter
    if (zone !== 'All Zones') {
      const z = zone.toLowerCase();
      const inLoc = (comp.landmark_address || '').toLowerCase().includes(z);
      const inWard = (comp.ward_zone || '').toLowerCase().includes(z);
      const inTitle = (comp.title || '').toLowerCase().includes(z);
      if (!inLoc && !inWard && !inTitle) return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const inNum = (comp.ticket_number || '').toLowerCase().includes(q);
      const inTitle = (comp.title || '').toLowerCase().includes(q);
      const inLoc = (comp.landmark_address || '').toLowerCase().includes(q);
      if (!inNum && !inTitle && !inLoc) return false;
    }

    return true;
  });

  // Render markers whenever filtered incidents, grievances, or layer visibility change
  useEffect(() => {
    if (!markersGroup.current) return;
    markersGroup.current.clearLayers();

    // 1. Telemetry Incidents Layer (Filtered)
    if (filteredIncidents.length > 0) {
      filteredIncidents.forEach(inc => {
        const isResolved = inc.status === 'Resolved';
        let pinBg = "#059669";
        let iconSvg = `<svg viewBox="0 0 24 24" style="width:14px; height:14px; stroke:white; fill:none; stroke-width:2.2;"><rect x="3" y="11" width="18" height="8" rx="2"/><path d="M5 11l2-5h10l2 5"/><circle cx="7.5" cy="15.5" r="1.5"/><circle cx="16.5" cy="15.5" r="1.5"/></svg>`;

        if (isResolved) {
          pinBg = "#10B981";
          iconSvg = `<svg viewBox="0 0 24 24" style="width:14px; height:14px; stroke:white; fill:none; stroke-width:2.5;"><polyline points="20 6 9 17 4 12"/></svg>`;
        } else if (inc.type === 'crowd') {
          pinBg = "#2563EB";
          iconSvg = `<svg viewBox="0 0 24 24" style="width:14px; height:14px; stroke:white; fill:none; stroke-width:2.2;"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
        } else if (inc.type === 'weather') {
          pinBg = "#0284C7";
          iconSvg = `<svg viewBox="0 0 24 24" style="width:14px; height:14px; stroke:white; fill:none; stroke-width:2.2;"><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/><path d="M8 16v3"/><path d="M12 16v3"/><path d="M16 16v3"/></svg>`;
        } else if (inc.severity === 'Critical' || inc.type === 'alerts') {
          pinBg = "#EF4444";
          iconSvg = `<svg viewBox="0 0 24 24" style="width:14px; height:14px; stroke:white; fill:none; stroke-width:2.5;"><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
        } else if (inc.severity === 'High') {
          pinBg = "#F97316";
          iconSvg = `<svg viewBox="0 0 24 24" style="width:14px; height:14px; stroke:white; fill:none; stroke-width:2.2;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
        }

        const isSelected = inc.id === activeIncidentId;

        const auraRing = (inc.severity === 'Critical' && !isResolved) ? `
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
            <div style="width:34px; height:34px; border-radius:8px; background:${isResolved ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}; color:${isResolved ? '#6EE7B7' : '#FCA5A5'}; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              ${iconSvg}
            </div>
            <div style="flex:1;">
              <div style="display:flex; align-items:center; justify-content:space-between; gap:6px;">
                <strong style="font-size:0.88rem; color:#F8FAFC; font-weight:800;">${inc.title || inc.name}</strong>
                <span style="color:#64748B; font-weight:bold; font-size:0.9rem;">›</span>
              </div>
              <div style="font-size:0.76rem; margin-top:4px; line-height:1.45; color:#CBD5E1;">
                <div><span style="color:#94A3B8;">Status:</span> <strong style="color:${isResolved ? '#34D399' : (inc.severity === 'Critical' ? '#FCA5A5' : '#93C5FD')};">${inc.status || 'Active'}</strong></div>
                <div><span style="color:#94A3B8;">Traffic:</span> <strong style="color:${inc.traffic_speed < 25 ? '#FCA5A5' : '#6EE7B7'};">${inc.traffic_speed < 25 ? 'Heavy' : 'Moderate'}</strong></div>
                <div><span style="color:#94A3B8;">Speed:</span> <strong style="color:${inc.traffic_speed < 25 ? '#FCA5A5' : '#6EE7B7'};">${inc.traffic_speed} km/h</strong></div>
                <div><span style="color:#94A3B8;">Crowd:</span> <strong style="color:#93C5FD;">High (${inc.crowd_density}/km²)</strong></div>
                <div><span style="color:#94A3B8;">Weather:</span> <span style="color:#CBD5E1;">${inc.weather_condition}</span></div>
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
    }

    // 2. Citizen Civic Grievances Layer (Filtered)
    if (layers.complaints && filteredComplaints.length > 0) {
      filteredComplaints.forEach((comp) => {
        const cLat = Number(comp.latitude);
        const cLng = Number(comp.longitude);
        if (isNaN(cLat) || isNaN(cLng)) return;

        const vStatus = comp.verification_status || 'Pending Verification';
        const isRoadDamage = comp.category?.toLowerCase().includes('pothole') || comp.category?.toLowerCase().includes('road');
        const isVerified = vStatus === 'Verified';
        const isNeedsReview = vStatus === 'Needs Review';
        const isPending = vStatus === 'Pending Verification';
        const isRejected = vStatus === 'Rejected' || comp.status === 'Rejected';
        const isDuplicate = vStatus === 'Duplicate';

        // 1. Highlight verified road damage with red outline when reliable road geometry is available
        if (isVerified && isRoadDamage && Array.isArray(comp.road_geometry) && comp.road_geometry.length > 1) {
          const roadGlow = window.L.polyline(comp.road_geometry, {
            color: '#EF4444',
            weight: 12,
            opacity: 0.35,
            lineCap: 'round'
          });
          const roadPolyline = window.L.polyline(comp.road_geometry, {
            color: '#DC2626',
            weight: 5,
            opacity: 0.95,
            lineCap: 'round',
            lineJoin: 'round'
          });

          roadPolyline.on('click', () => {
            setSelectedComplaint(comp);
            setIsRightCollapsed(false);
          });
          roadGlow.on('click', () => {
            setSelectedComplaint(comp);
            setIsRightCollapsed(false);
          });

          markersGroup.current.addLayer(roadGlow);
          markersGroup.current.addLayer(roadPolyline);
        }

        // 2. Icon SVGs
        let catSvg = `<svg viewBox="0 0 24 24" style="width:13px; height:13px; stroke:white; fill:none; stroke-width:2.2;"><rect x="3" y="11" width="18" height="8" rx="2"/><path d="M5 11l2-5h10l2 5"/></svg>`;
        if (comp.category?.includes('Garbage')) {
          catSvg = `<svg viewBox="0 0 24 24" style="width:13px; height:13px; stroke:white; fill:none; stroke-width:2.2;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>`;
        } else if (comp.category?.includes('Water')) {
          catSvg = `<svg viewBox="0 0 24 24" style="width:13px; height:13px; stroke:white; fill:none; stroke-width:2.2;"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>`;
        } else if (comp.category?.includes('Drainage')) {
          catSvg = `<svg viewBox="0 0 24 24" style="width:13px; height:13px; stroke:white; fill:none; stroke-width:2.2;"><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/></svg>`;
        } else if (comp.category?.includes('Streetlight')) {
          catSvg = `<svg viewBox="0 0 24 24" style="width:13px; height:13px; stroke:white; fill:none; stroke-width:2.2;"><path d="M9 18h6"/><path d="M10 22h4"/><circle cx="12" cy="8" r="5"/></svg>`;
        } else if (comp.category?.includes('Traffic')) {
          catSvg = `<svg viewBox="0 0 24 24" style="width:13px; height:13px; stroke:white; fill:none; stroke-width:2.2;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>`;
        } else {
          catSvg = `<svg viewBox="0 0 24 24" style="width:13px; height:13px; stroke:white; fill:none; stroke-width:2.2;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
        }

        // 3. Status Distinction styling
        let compColor = '#2563EB';
        let statusBadgeColor = '#2563EB';
        let auraHtml = '';
        let pinBorder = '2px solid #FFFFFF';

        if (isRejected) {
          // Do not display rejected reports as confirmed road damage
          compColor = '#64748B'; // Muted grey
          statusBadgeColor = '#DC2626';
          pinBorder = '2px dashed #94A3B8';
        } else if (isVerified && isRoadDamage) {
          // Confirmed road damage: Red incident marker (especially when geometry is unavailable)
          compColor = '#DC2626';
          statusBadgeColor = '#DC2626';
          auraHtml = `
            <div style="
              position: absolute;
              width: 44px;
              height: 44px;
              border-radius: 50%;
              background: rgba(220, 38, 38, 0.22);
              border: 1.5px solid rgba(220, 38, 38, 0.5);
              animation: pulse-live 1.8s infinite ease-in-out;
              pointer-events: none;
            "></div>
          `;
        } else if (isVerified) {
          compColor = '#059669'; // Emerald verified
          statusBadgeColor = '#059669';
        } else if (isNeedsReview) {
          compColor = '#D97706'; // Amber review-required
          statusBadgeColor = '#D97706';
          pinBorder = '2px dashed #FEF08A';
          auraHtml = `
            <div style="
              position: absolute;
              width: 38px;
              height: 38px;
              border-radius: 50%;
              background: rgba(217, 119, 6, 0.2);
              border: 1px dashed rgba(217, 119, 6, 0.5);
              pointer-events: none;
            "></div>
          `;
        } else if (isDuplicate) {
          compColor = '#7C3AED'; // Violet duplicate
          statusBadgeColor = '#7C3AED';
        } else {
          // Pending Verification
          compColor = '#3B82F6';
          statusBadgeColor = '#2563EB';
          auraHtml = `
            <div style="
              position: absolute;
              width: 36px;
              height: 36px;
              border-radius: 50%;
              background: rgba(59, 130, 246, 0.18);
              pointer-events: none;
            "></div>
          `;
        }

        const compMarkerHtml = `
          <div style="position: relative; display: flex; align-items: center; justify-content: center;">
            ${auraHtml}
            <div style="
              width: 26px;
              height: 26px;
              border-radius: 6px;
              background: ${compColor};
              border: ${pinBorder};
              box-shadow: 0 3px 10px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              transform: rotate(45deg);
              z-index: 3;
            ">
              <div style="transform: rotate(-45deg); display: flex; align-items: center; justify-content: center;">
                ${catSvg}
              </div>
            </div>
          </div>
        `;

        const compIcon = window.L.divIcon({
          html: compMarkerHtml,
          className: 'civic-map-pin',
          iconSize: [26, 26],
          iconAnchor: [13, 13]
        });

        const compMarker = window.L.marker([cLat, cLng], { icon: compIcon });

        const photoSnippet = comp.image_url ? `
          <div style="margin-top: 8px; border-radius: 6px; overflow: hidden; max-height: 110px; border: 1px solid #E2E8F0;">
            <img src="${comp.image_url}" alt="Civic complaint evidence" style="width: 100%; height: 100px; object-fit: cover; display: block;" onerror="this.style.display='none'" />
          </div>
        ` : '';

        const roadGeomNotice = (isVerified && isRoadDamage) ? `
          <div style="margin-top: 4px; font-size: 0.68rem; font-weight: 700; color: #DC2626; display: flex; align-items: center; gap: 4px;">
            <span>${Array.isArray(comp.road_geometry) && comp.road_geometry.length > 1 ? '• Red outline road segment active' : '• Red damage marker (Point location)'}</span>
          </div>
        ` : '';

        const compPopup = `
          <div style="font-family: Inter, sans-serif; min-width: 240px; max-width: 290px; padding: 2px;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px;">
              <span style="font-family: monospace; font-size: 0.76rem; font-weight: 800; color: #0F172A; background: #F1F5F9; border: 1px solid #CBD5E1; padding: 2px 6px; border-radius: 4px;">
                ${comp.ticket_number}
              </span>
              <span style="font-size: 0.68rem; font-weight: 700; color: ${statusBadgeColor}; background: ${statusBadgeColor}15; padding: 2px 7px; border-radius: 12px; border: 1px solid ${statusBadgeColor}33;">
                ${vStatus}
              </span>
            </div>
            <strong style="display: block; font-size: 0.84rem; color: #0F172A; font-weight: 700; line-height: 1.35; margin-bottom: 4px;">
              ${comp.title}
            </strong>
            <div style="font-size: 0.74rem; color: #475569; line-height: 1.4; margin-bottom: 6px;">
              ${comp.description ? (comp.description.slice(0, 95) + (comp.description.length > 95 ? '...' : '')) : ''}
            </div>
            ${photoSnippet}
            ${roadGeomNotice}
            <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #E2E8F0; font-size: 0.7rem; color: #64748B;">
              <div><strong>Dept:</strong> <span style="color: #334155;">${comp.assigned_authority || comp.assigned_department || 'BBMP Redressal Cell'}</span></div>
              <div><strong>Location:</strong> <span style="color: #334155;">${comp.landmark_address || comp.ward_zone || 'Bengaluru'}</span></div>
              ${comp.verification_reason ? `<div><strong>Verification:</strong> <span style="color: #0F172A;">${comp.verification_reason.slice(0, 70)}...</span></div>` : ''}
            </div>
            <button onclick="if(window.urbanPulseNavigateToGrievance) window.urbanPulseNavigateToGrievance('${comp.ticket_number}')" style="margin-top: 8px; width: 100%; background: #2563EB; color: #FFFFFF; border: none; padding: 7px 10px; border-radius: 6px; font-size: 0.72rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
              <span>Inspect in Grievance Console &rarr;</span>
            </button>
          </div>
        `;

        compMarker.bindPopup(compPopup, { offset: [0, -10] });
        compMarker.on('click', () => {
          setSelectedComplaint(comp);
          setIsRightCollapsed(false);
        });
        markersGroup.current.addLayer(compMarker);
      });
    }

    // 3. Weather API Meteorological Observatories (when weather layer and source are active)
    if (layers.weather && sources.weather !== false) {
      const defaultStations = [
        { id: 'weather-obs-01', name: 'Bengaluru City Weather Observatory', lat: 12.9716, lng: 77.5946, temp: '26.8°C', rain: '1.4 mm', condition: 'Partly Cloudy', humidity: '68%' },
        { id: 'weather-obs-02', name: 'HAL Airport Weather Observatory', lat: 12.9500, lng: 77.6680, temp: '27.2°C', rain: '2.1 mm', condition: 'Light Rain', humidity: '72%' },
        { id: 'weather-obs-03', name: 'Kempegowda Intl Airport Weather Station', lat: 13.1986, lng: 77.7066, temp: '25.9°C', rain: '0.8 mm', condition: 'Cloudy', humidity: '64%' },
        { id: 'weather-obs-04', name: 'GKVK Agro-Meteorological Weather Grid', lat: 13.0768, lng: 77.5750, temp: '26.4°C', rain: '1.6 mm', condition: 'Partly Cloudy', humidity: '70%' }
      ];
      const activeWeatherStations = (weatherStations && weatherStations.length > 0) ? weatherStations : defaultStations;
      activeWeatherStations.forEach(st => {
        const weatherStationHtml = `
          <div style="position: relative; display: flex; align-items: center; justify-content: center;">
            <div style="
              background: #0284C7;
              color: white;
              border: 2px solid white;
              border-radius: 20px;
              padding: 2px 7px;
              font-size: 10px;
              font-weight: 800;
              box-shadow: 0 3px 10px rgba(2, 132, 199, 0.45);
              display: flex;
              align-items: center;
              gap: 4px;
              white-space: nowrap;
              cursor: pointer;
            ">
              <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/><path d="M8 16v3"/><path d="M12 16v3"/><path d="M16 16v3"/></svg>
              <span>${st.temp}</span>
            </div>
          </div>
        `;
        const stIcon = window.L.divIcon({ html: weatherStationHtml, className: 'weather-api-pin', iconSize: [50, 20], iconAnchor: [25, 10] });
        const marker = window.L.marker([st.lat, st.lng], { icon: stIcon });
        marker.bindPopup(`
          <div style="font-family:Inter,sans-serif; min-width:210px; padding:2px;">
            <div style="font-size:0.68rem; font-weight:800; color:#0284C7; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:2px;">Weather API Live Station</div>
            <strong style="font-size:0.86rem; color:#0F172A; display:block; margin-bottom:6px;">${st.name}</strong>
            <div style="background:#F0F9FF; border:1px solid #BAE6FD; border-radius:6px; padding:6px 8px; font-size:0.75rem; color:#0369A1; display:grid; grid-template-columns:1fr 1fr; gap:4px;">
              <div><strong>Temp:</strong> ${st.temp}</div>
              <div><strong>Precip:</strong> ${st.rain}</div>
              <div><strong>Sky:</strong> ${st.condition}</div>
              <div><strong>Humidity:</strong> ${st.humidity}</div>
            </div>
          </div>
        `);
        markersGroup.current.addLayer(marker);
      });
    }
  }, [filteredIncidents, filteredComplaints, weatherStations, layers.weather, sources.weather, activeIncidentId]);

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

  // Zone change handler with auto-navigation
  const handleZoneChange = (selectedZone) => {
    setZone(selectedZone);
    if (gisMapInst.current) {
      if (selectedZone === 'All Zones') {
        gisMapInst.current.flyTo([12.9716, 77.5946], 12, { duration: 0.8 });
      } else if (ZONE_CENTERS[selectedZone]) {
        gisMapInst.current.flyTo(ZONE_CENTERS[selectedZone], 14, { duration: 1.0 });
      }
    }
  };

  const handleIncidentStatusChange = (newStatus) => {
    setIncidentStatusFilter(newStatus);
    fetchIncidents(newStatus);
  };

  // Filter application handler
  const applyFilters = async () => {
    const selectedSevs = Object.keys(severities).filter(k => severities[k]).join(',');
    const selectedSrcs = Object.keys(sources).filter(k => sources[k]).join(',');

    try {
      const res = await fetch(`${API_BASE}/map/filtered?time_range=${encodeURIComponent(timeRange)}&severity=${encodeURIComponent(selectedSevs)}&data_sources=${encodeURIComponent(selectedSrcs)}&zone=${encodeURIComponent(zone)}&status=${encodeURIComponent(incidentStatusFilter)}`);
      if (res.ok) {
        const data = await res.json();
        const incList = data.incidents || [];
        setIncidents(incList);
        if (incList.length > 0) {
          loadIncident(incList[0].id, incList);
          if (gisMapInst.current) {
            if (zone !== 'All Zones' && ZONE_CENTERS[zone]) {
              gisMapInst.current.flyTo(ZONE_CENTERS[zone], 14, { duration: 1 });
            } else if (incList.length > 1) {
              const bounds = window.L.latLngBounds(incList.map(i => [i.lat, i.lng]));
              gisMapInst.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
            }
          }
        }
      }
    } catch (e) {
      console.log("Filter error:", e);
    }
  };

  const resetFilters = () => {
    setTimeRange('Last 1 Hour');
    setZone('All Zones');
    setIncidentStatusFilter('active');
    setSeverities({ Critical: true, High: true, Moderate: true, Low: true });
    setSources({ traffic: true, crowd: true, weather: true });
    setLayers({ traffic: true, crowd: true, weather: true, alerts: true, complaints: true });
    setCivicCategoryFilter('all');
    setCivicStatusFilter('all');
    setCivicDeptFilter('all');
    setSearchQuery('');
    fetchIncidents('active');
    fetchCivicComplaints();
    if (gisMapInst.current) {
      gisMapInst.current.flyTo([12.9716, 77.5946], 12, { duration: 0.8 });
    }
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
            <button className={`map-mode-btn ${mapMode === 'street' ? 'active' : ''}`} onClick={() => setMapMode('street')}>OpenStreetMap (Free)</button>
            <button className={`map-mode-btn ${mapMode === 'satellite' ? 'active' : ''}`} onClick={() => setMapMode('satellite')}>Satellite (Esri)</button>
          </div>

          <div className="control-select">
            <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <span>{timeRange}</span>
            <svg viewBox="0 0 24 24" style={{ width: 12, height: 12 }}><path d="M6 9l6 6 6-6"/></svg>
          </div>
        </div>

        <div className="map-tb-right">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(5, 150, 105, 0.1)', border: '1px solid rgba(5, 150, 105, 0.3)', padding: '4px 10px', borderRadius: '20px', fontSize: '0.74rem', fontWeight: 700, color: '#059669' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#059669', display: 'inline-block' }}></span>
            <span>{filteredIncidents.length + filteredComplaints.length + (layers.weather && sources.weather !== false ? (weatherStations.length || 4) : 0)} Visible Points</span>
          </div>

          <div className="live-badge-group">
            <span className="dot-live"></span>
            <span>Live Data</span>
            <span style={{ color: '#94A3B8', margin: '0 2px' }}>|</span>
            <span>{timestamp || new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          </div>

          <div className="control-select">
            <svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
            <span>Bengaluru</span>
            <svg viewBox="0 0 24 24" style={{ width: 12, height: 12 }}><path d="M6 9l6 6 6-6"/></svg>
          </div>

          <button className="btn-icon-sq" title="Refresh Map Data" onClick={() => { fetchIncidents(); fetchCivicComplaints(); }}>
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1 }}>
                <span>Traffic</span>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#059669', background: '#ECFDF5', padding: '1px 6px', borderRadius: '8px' }}>
                  {incidents.filter(i => i.type === 'traffic' && (incidentStatusFilter === 'all' || (incidentStatusFilter === 'resolved' ? i.status === 'Resolved' : i.status !== 'Resolved'))).length}
                </span>
              </div>
            </label>
            <label className="layer-item">
              <input type="checkbox" checked={layers.crowd} onChange={(e) => setLayers({ ...layers, crowd: e.target.checked })} />
              <div className="layer-icon-box crowd"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1 }}>
                <span>Crowd</span>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#2563EB', background: '#EFF6FF', padding: '1px 6px', borderRadius: '8px' }}>
                  {incidents.filter(i => i.type === 'crowd' && (incidentStatusFilter === 'all' || (incidentStatusFilter === 'resolved' ? i.status === 'Resolved' : i.status !== 'Resolved'))).length}
                </span>
              </div>
            </label>
            <label className="layer-item">
              <input type="checkbox" checked={layers.weather} onChange={(e) => setLayers({ ...layers, weather: e.target.checked })} />
              <div className="layer-icon-box weather"><svg viewBox="0 0 24 24"><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/><path d="M8 16v3"/><path d="M12 16v3"/><path d="M16 16v3"/></svg></div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1 }}>
                <span>Weather</span>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#0284C7', background: '#F0F9FF', padding: '1px 6px', borderRadius: '8px' }}>
                  {(weatherStations.length || 4) + incidents.filter(i => i.type === 'weather' && (incidentStatusFilter === 'all' || (incidentStatusFilter === 'resolved' ? i.status === 'Resolved' : i.status !== 'Resolved'))).length}
                </span>
              </div>
            </label>
            <label className="layer-item">
              <input type="checkbox" checked={layers.alerts} onChange={(e) => setLayers({ ...layers, alerts: e.target.checked })} />
              <div className="layer-icon-box alerts"><svg viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg></div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1 }}>
                <span>Alerts</span>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#DC2626', background: '#FEF2F2', padding: '1px 6px', borderRadius: '8px' }}>
                  {incidents.filter(i => i.severity === 'Critical' && (incidentStatusFilter === 'all' || (incidentStatusFilter === 'resolved' ? i.status === 'Resolved' : i.status !== 'Resolved'))).length}
                </span>
              </div>
            </label>
            <label className="layer-item">
              <input type="checkbox" checked={layers.complaints} onChange={(e) => setLayers({ ...layers, complaints: e.target.checked })} />
              <div className="layer-icon-box" style={{ background: '#FEF3C7', color: '#D97706' }}>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  <line x1="9" y1="10" x2="15" y2="10" />
                  <line x1="12" y1="7" x2="12" y2="13" />
                </svg>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1 }}>
                <span>Civic Grievances</span>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#D97706', background: '#FEF3C7', padding: '1px 6px', borderRadius: '8px' }}>
                  {filteredComplaints.length}
                </span>
              </div>
            </label>

            {layers.complaints && (
              <div style={{ marginTop: '8px', padding: '8px', background: '#FFFBEB', borderRadius: '8px', border: '1px solid #FDE68A', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Grievance Filters
                </div>
                <select
                  value={civicCategoryFilter}
                  onChange={(e) => setCivicCategoryFilter(e.target.value)}
                  style={{ width: '100%', padding: '4px 6px', fontSize: '0.72rem', borderRadius: '6px', border: '1px solid #CBD5E1', outline: 'none', background: '#FFFFFF', color: '#0F172A' }}
                >
                  <option value="all">All Categories</option>
                  <option value="Pothole">Pothole / Road</option>
                  <option value="Garbage">Garbage / Waste</option>
                  <option value="Water">Water Leakage</option>
                  <option value="Drainage">Drainage & Flooding</option>
                  <option value="Streetlight">Streetlight Failure</option>
                  <option value="Traffic">Traffic Hazard</option>
                </select>

                <select
                  value={civicStatusFilter}
                  onChange={(e) => setCivicStatusFilter(e.target.value)}
                  style={{ width: '100%', padding: '4px 6px', fontSize: '0.72rem', borderRadius: '6px', border: '1px solid #CBD5E1', outline: 'none', background: '#FFFFFF', color: '#0F172A' }}
                >
                  <option value="all">All Statuses</option>
                  <option value="Submitted">Submitted</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Assigned">Assigned</option>
                  <option value="Crew Dispatched">Crew Dispatched</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                </select>

                <select
                  value={civicDeptFilter}
                  onChange={(e) => setCivicDeptFilter(e.target.value)}
                  style={{ width: '100%', padding: '4px 6px', fontSize: '0.72rem', borderRadius: '6px', border: '1px solid #CBD5E1', outline: 'none', background: '#FFFFFF', color: '#0F172A' }}
                >
                  <option value="all">All Departments</option>
                  <option value="BBMP Road">BBMP Road Infrastructure</option>
                  <option value="BBMP Solid">BBMP Solid Waste</option>
                  <option value="BWSSB">BWSSB Water Division</option>
                  <option value="Stormwater">BBMP Stormwater & Drain</option>
                  <option value="BESCOM">BESCOM Electrical</option>
                  <option value="Traffic">Bengaluru Traffic Police</option>
                </select>
              </div>
            )}
          </div>

          <div className="panel-section-head">
            <span>Filters</span>
            <button onClick={resetFilters} style={{ color: '#059669' }}>Reset</button>
          </div>

          <div className="filter-group">
            <div className="filter-label">Incident Status</div>
            <select className="filter-select" value={incidentStatusFilter} onChange={(e) => handleIncidentStatusChange(e.target.value)}>
              <option value="active">Active Only</option>
              <option value="acknowledged">Acknowledged Only</option>
              <option value="resolved">Resolved Only</option>
              <option value="all">All Statuses (Active + Resolved)</option>
            </select>
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
              <span style={{ display: 'inline-block', width: 12, height: 12, background: '#EF4444', borderRadius: 3, marginRight: 4 }}></span> Critical ({incidents.filter(i => i.severity === 'Critical' && (incidentStatusFilter === 'all' || (incidentStatusFilter === 'resolved' ? i.status === 'Resolved' : i.status !== 'Resolved'))).length})
            </label>
            <label className="layer-item" style={{ marginBottom: 4 }}>
              <input type="checkbox" checked={severities.High} onChange={(e) => setSeverities({ ...severities, High: e.target.checked })} />
              <span style={{ display: 'inline-block', width: 12, height: 12, background: '#F97316', borderRadius: 3, marginRight: 4 }}></span> High ({incidents.filter(i => i.severity === 'High' && (incidentStatusFilter === 'all' || (incidentStatusFilter === 'resolved' ? i.status === 'Resolved' : i.status !== 'Resolved'))).length})
            </label>
            <label className="layer-item" style={{ marginBottom: 4 }}>
              <input type="checkbox" checked={severities.Moderate} onChange={(e) => setSeverities({ ...severities, Moderate: e.target.checked })} />
              <span style={{ display: 'inline-block', width: 12, height: 12, background: '#D97706', borderRadius: 3, marginRight: 4 }}></span> Moderate ({incidents.filter(i => i.severity === 'Moderate' && (incidentStatusFilter === 'all' || (incidentStatusFilter === 'resolved' ? i.status === 'Resolved' : i.status !== 'Resolved'))).length})
            </label>
            <label className="layer-item">
              <input type="checkbox" checked={severities.Low} onChange={(e) => setSeverities({ ...severities, Low: e.target.checked })} />
              <span style={{ display: 'inline-block', width: 12, height: 12, background: '#94A3B8', borderRadius: 3, marginRight: 4 }}></span> Low ({incidents.filter(i => i.severity === 'Low' && (incidentStatusFilter === 'all' || (incidentStatusFilter === 'resolved' ? i.status === 'Resolved' : i.status !== 'Resolved'))).length})
            </label>
          </div>

          <div className="filter-group">
            <div className="filter-label">Data Source</div>
            <label className="layer-item" style={{ marginBottom: 4 }}>
              <input type="checkbox" checked={sources.traffic} onChange={(e) => setSources({ ...sources, traffic: e.target.checked })} /> Traffic ({incidents.filter(i => i.type === 'traffic').length})
            </label>
            <label className="layer-item" style={{ marginBottom: 4 }}>
              <input type="checkbox" checked={sources.crowd} onChange={(e) => setSources({ ...sources, crowd: e.target.checked })} /> Crowd ({incidents.filter(i => i.type === 'crowd').length})
            </label>
            <label className="layer-item">
              <input type="checkbox" checked={sources.weather} onChange={(e) => setSources({ ...sources, weather: e.target.checked })} /> Weather ({(weatherStations.length || 4) + incidents.filter(i => i.type === 'weather').length})
            </label>
          </div>

          <div className="filter-group">
            <div className="filter-label">Zone / Area</div>
            <select className="filter-select" value={zone} onChange={(e) => handleZoneChange(e.target.value)}>
              <option value="All Zones">All Zones (Full City)</option>
              <option value="Marathahalli">Marathahalli (Outer Ring Road)</option>
              <option value="Whitefield">Whitefield (IT Corridor)</option>
              <option value="Hebbal">Hebbal (Airport Expressway)</option>
              <option value="Indiranagar">Indiranagar (100ft Road)</option>
              <option value="Koramangala">Koramangala (Sony World)</option>
              <option value="Electronic City">Electronic City (Elevated)</option>
              <option value="BTM Layout">BTM Layout (Ring Road)</option>
              <option value="Silk Board">Silk Board Junction</option>
              <option value="Majestic">Majestic Intermodal Hub</option>
              <option value="Bellandur">Bellandur Tech Zone</option>
              <option value="Peenya">Peenya Industrial Area</option>
              <option value="Jayanagar">Jayanagar Commercial</option>
              <option value="MG Road">MG Road Central</option>
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

          {/* Scale Bar & Free OpenStreetMap Attribution */}
          <div className="map-scale-bar" title="OpenStreetMap Free Tile Server">
            <span>5 km</span>
            <span style={{ margin: '0 6px', color: '#94A3B8' }}>•</span>
            <span style={{ color: '#059669', fontWeight: 700 }}>OpenStreetMap (Free &amp; Open)</span>
          </div>

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
          {selectedComplaint ? (
            <div>
              <div className="drawer-head">
                <button className="drawer-collapse-btn" onClick={() => setIsRightCollapsed(true)} title="Collapse Drawer">
                  <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
                <div className="drawer-title-group">
                  <div className="drawer-icon-box" style={{ background: '#FEF3C7', color: '#D97706' }}>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  </div>
                  <div>
                    <div className="drawer-title" style={{ fontFamily: 'monospace' }}>{selectedComplaint.ticket_number}</div>
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px', borderRadius: '12px', background: '#FEF3C7', color: '#D97706' }}>
                      {selectedComplaint.status || 'Submitted'}
                    </span>
                  </div>
                </div>
                <button className="btn-close-drawer" onClick={() => setSelectedComplaint(null)} title="Close Complaint">
                  <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>

              <div style={{ padding: '0.9rem', fontSize: '0.8rem', color: '#334155' }}>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0F172A', marginBottom: '6px', lineHeight: 1.35 }}>
                  {selectedComplaint.title}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.45, marginBottom: '12px' }}>
                  {selectedComplaint.description}
                </div>

                {selectedComplaint.image_url && (
                  <div style={{ marginBottom: '12px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #E2E8F0' }}>
                    <img src={selectedComplaint.image_url} alt="Evidence" style={{ width: '100%', height: '140px', objectFit: 'cover', display: 'block' }} />
                  </div>
                )}

                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '10px', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748B' }}>Verification Status:</span>
                    <span style={{
                      fontWeight: 800,
                      fontSize: '0.72rem',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      background: selectedComplaint.verification_status === 'Verified' ? '#ECFDF5' :
                                  selectedComplaint.verification_status === 'Needs Review' ? '#FFFBEB' :
                                  selectedComplaint.verification_status === 'Rejected' ? '#FEF2F2' :
                                  selectedComplaint.verification_status === 'Duplicate' ? '#F5F3FF' : '#EFF6FF',
                      color: selectedComplaint.verification_status === 'Verified' ? '#047857' :
                             selectedComplaint.verification_status === 'Needs Review' ? '#B45309' :
                             selectedComplaint.verification_status === 'Rejected' ? '#B91C1C' :
                             selectedComplaint.verification_status === 'Duplicate' ? '#6D28D9' : '#1D4ED8',
                      border: `1px solid ${selectedComplaint.verification_status === 'Verified' ? '#A7F3D0' :
                                          selectedComplaint.verification_status === 'Needs Review' ? '#FDE68A' :
                                          selectedComplaint.verification_status === 'Rejected' ? '#FECACA' :
                                          selectedComplaint.verification_status === 'Duplicate' ? '#DDD6FE' : '#BFDBFE'}`
                    }}>
                      {selectedComplaint.verification_status || 'Pending Verification'}
                    </span>
                  </div>

                  {selectedComplaint.verification_reason && (
                    <div style={{ background: '#FFFFFF', padding: '6px 8px', borderRadius: '6px', border: '1px solid #E2E8F0', color: '#1E293B', fontSize: '0.72rem' }}>
                      <span style={{ color: '#64748B', fontWeight: 600 }}>Decision Note: </span>
                      {selectedComplaint.verification_reason}
                    </div>
                  )}

                  {selectedComplaint.verified_by && (
                    <div><span style={{ color: '#64748B' }}>Verified By:</span> <strong>{selectedComplaint.verified_by}</strong> {selectedComplaint.verified_at ? `(${selectedComplaint.verified_at.slice(0, 16)})` : ''}</div>
                  )}

                  {selectedComplaint.duplicate_of_id && (
                    <div style={{ background: '#F5F3FF', border: '1px solid #DDD6FE', padding: '4px 8px', borderRadius: '6px', color: '#6D28D9' }}>
                      <strong>Linked Primary Incident:</strong> {selectedComplaint.duplicate_of_id}
                    </div>
                  )}

                  {Array.isArray(selectedComplaint.road_geometry) && selectedComplaint.road_geometry.length > 1 && (
                    <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', padding: '4px 8px', borderRadius: '6px', color: '#DC2626', fontWeight: 700 }}>
                      Road Segment: Outlined in Red on Map ({selectedComplaint.road_geometry.length} Waypoints)
                    </div>
                  )}

                  {selectedComplaint.evidence_assessment && (
                    <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', padding: '6px 8px', borderRadius: '6px', fontSize: '0.7rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 700, color: '#166534' }}>Computer Vision Assessment</span>
                        <span style={{ fontWeight: 800, color: '#15803D' }}>{Math.round((selectedComplaint.evidence_assessment.confidence || 0) * 100)}% Match</span>
                      </div>
                      <div style={{ color: '#166534', lineHeight: 1.35 }}>
                        {selectedComplaint.evidence_assessment.reason || selectedComplaint.evidence_assessment.rationale}
                      </div>
                    </div>
                  )}

                  <div><span style={{ color: '#64748B' }}>Category:</span> <strong>{selectedComplaint.category}</strong></div>
                  <div><span style={{ color: '#64748B' }}>Urgency:</span> <strong style={{ color: selectedComplaint.urgency === 'Critical' ? '#DC2626' : '#D97706' }}>{selectedComplaint.urgency || 'Normal'}</strong></div>
                  <div><span style={{ color: '#64748B' }}>Assigned Dept:</span> <strong>{selectedComplaint.assigned_department || selectedComplaint.assigned_authority || 'Pending Assignment'}</strong></div>
                  <div><span style={{ color: '#64748B' }}>Location:</span> <span>{selectedComplaint.landmark_address || selectedComplaint.ward_zone || 'Bengaluru'}</span></div>
                  <div><span style={{ color: '#64748B' }}>Coordinates:</span> <span style={{ fontFamily: 'monospace' }}>{Number(selectedComplaint.latitude).toFixed(4)}, {Number(selectedComplaint.longitude).toFixed(4)}</span></div>
                  <div><span style={{ color: '#64748B' }}>Reported At:</span> <span>{selectedComplaint.created_at}</span></div>
                </div>

                {/* Dispatch & Console Action */}
                <button
                  onClick={() => onNavigateToGrievance && onNavigateToGrievance(selectedComplaint.ticket_number)}
                  style={{
                    width: '100%',
                    background: '#2563EB',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                    marginBottom: '8px'
                  }}
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
                  <span>Dispatch &amp; Manage in Console &rarr;</span>
                </button>

                <button
                  onClick={() => setSelectedComplaint(null)}
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: '1px solid #CBD5E1',
                    color: '#475569',
                    padding: '7px 10px',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Switch to Telemetry Incidents
                </button>
              </div>
            </div>
          ) : activeInc ? (
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
                <button className="btn-close-drawer" onClick={() => setIsRightCollapsed(true)} title="Close Drawer">
                  <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
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
                      <div className="dmb-sub down">-{Math.abs(activeInc.traffic_speed_change || 62)}%</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2 }}>Traffic Speed</div>
                    </div>

                    <div className="drawer-metric-box">
                      <div className="dmb-label"><svg viewBox="0 0 24 24" style={{ color: '#2563EB' }}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> {activeInc.crowd_density} /km²</div>
                      <div className="dmb-sub up">+{activeInc.crowd_density_change || 18}%</div>
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
                    <div className="dm-item"><svg viewBox="0 0 24 24" width="12" height="12" fill={activeInc.status === 'Resolved' ? '#10B981' : (activeInc.severity === 'Critical' ? '#EF4444' : '#F59E0B')} style={{ marginRight: 6 }}><circle cx="12" cy="12" r="6"/></svg> Current Status: <strong style={{ marginLeft: 4, color: activeInc.status === 'Resolved' ? '#059669' : 'inherit' }}>{activeInc.status}</strong></div>
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

                  {/* Operational Advisory Protocol Card */}
                  <div className="drawer-ai-card">
                    <div className="dai-head">
                      <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                      <span>Operational Advisory Protocol</span>
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
                        <div style={{ padding: '4px 0', borderBottom: '1px solid #F1F5F9' }}><strong>Historical Congestion:</strong> +34% vs last week</div>
                        <div style={{ padding: '4px 0', borderBottom: '1px solid #F1F5F9' }}><strong>Nearest Transit Station:</strong> Bus Stop (120m)</div>
                        <div style={{ padding: '4px 0' }}><strong>Sensor Status:</strong> 12 Active Nodes</div>
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
          ) : null}
        </div>
      </div>
    </div>
  );
}
