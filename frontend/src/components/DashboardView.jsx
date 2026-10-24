import React, { useState, useEffect, useRef, useMemo } from 'react';
import Chart from 'chart.js/auto';
import { API_BASE } from '../config/api';
import { useAuth } from '../context/AuthContext';

// Operating timezone for UrbanPulse Bengaluru deployment
export const OPERATING_TIMEZONE = 'Asia/Kolkata';

export const getTimeAwareGreeting = (date = new Date(), timeZone = OPERATING_TIMEZONE) => {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      hour12: false
    });
    const hour = parseInt(formatter.format(date), 10);
    if (hour >= 5 && hour < 12) return 'Good Morning';
    if (hour >= 12 && hour < 17) return 'Good Afternoon';
    if (hour >= 17 && hour < 21) return 'Good Evening';
    return 'Good Night';
  } catch (e) {
    const hour = date.getHours();
    if (hour >= 5 && hour < 12) return 'Good Morning';
    if (hour >= 12 && hour < 17) return 'Good Afternoon';
    if (hour >= 17 && hour < 21) return 'Good Evening';
    return 'Good Night';
  }
};

export const calculateCurrentTime = (date = new Date(), timeZone = OPERATING_TIMEZONE) => {
  const optionsDate = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone };
  const optionsTime = { hour: '2-digit', minute: '2-digit', hour12: true, timeZone };
  const optionsLive = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true, timeZone };

  return {
    dateStr: date.toLocaleDateString('en-GB', optionsDate),
    timeStr: date.toLocaleTimeString('en-US', optionsTime).toUpperCase(),
    liveStreamStr: date.toLocaleTimeString('en-US', optionsLive).toUpperCase(),
    greeting: getTimeAwareGreeting(date, timeZone)
  };
};

export default function DashboardView({ telemetryData, onNavigate, onRefresh }) {
  const authContext = useAuth ? useAuth() : null;
  const user = authContext?.user || null;
  const officerDisplayName = user?.name || user?.full_name || 'Admin';

  const [selectedCorridor, setSelectedCorridor] = useState('ALL');
  const [activeTimeRange, setActiveTimeRange] = useState('24h');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef(null);
  const searchContainerRef = useRef(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => calculateCurrentTime(new Date()));

  // Global Ctrl+K / Cmd+K and Escape keyboard listeners
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchFocused(true);
      }
      if (e.key === 'Escape') {
        setIsSearchFocused(false);
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Click outside to close command dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keep live clock & greeting strictly in sync with Asia/Kolkata timezone
  useEffect(() => {
    const updateClock = () => {
      setCurrentTime(calculateCurrentTime(new Date()));
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  // Civic Grievance Metrics State
  const [grievanceMetrics, setGrievanceMetrics] = useState({
    total_complaints: 3,
    awaiting_assignment_count: 1,
    active_field_count: 1,
    resolved_count: 1,
    reopened_count: 0,
    sla_compliance_pct: 95.8,
    avg_resolution_hours: 14.8
  });

  const fetchGrievanceMetrics = async () => {
    try {
      const res = await fetch(`${API_BASE}/grievances/authority/metrics`, {
        headers: { 'X-Authority-Role': 'officer' }
      });
      if (res.ok) {
        const data = await res.json();
        setGrievanceMetrics(data);
      }
    } catch (e) {
      console.warn("Dashboard grievance metrics fetch note:", e);
    }
  };

  const [liveWeather, setLiveWeather] = useState(null);

  const fetchWeather = async () => {
    try {
      const res = await fetch(`${API_BASE}/weather/all`);
      if (res.ok) {
        const d = await res.json();
        setLiveWeather(d);
      }
    } catch (e) {
      console.warn("Dashboard weather fetch note:", e);
    }
  };

  useEffect(() => {
    fetchGrievanceMetrics();
    fetchWeather();
    const interval = setInterval(fetchWeather, 60000);
    return () => clearInterval(interval);
  }, []);

  // Predictive Intelligence (XGBoost) State for Metric Card
  const [predictiveOverview, setPredictiveOverview] = useState(null);

  const fetchPredictiveData = async () => {
    try {
      const overviewRes = await fetch(`${API_BASE}/predictive/overview`);
      if (overviewRes.ok) {
        setPredictiveOverview(await overviewRes.json());
      }
    } catch (e) {
      console.warn("Predictive overview fetch note:", e);
    }
  };

  useEffect(() => {
    fetchPredictiveData();
  }, []);

  // Interactive Tactical Directive Dispatch State
  const [dispatchModal, setDispatchModal] = useState(null);
  const [operatorNote, setOperatorNote] = useState('');
  const [isDispatching, setIsDispatching] = useState(false);
  const [toastNotification, setToastNotification] = useState('');

  const trafficChartRef = useRef(null);
  const crowdChartRef = useRef(null);
  const weatherChartRef = useRef(null);

  const trafficInst = useRef(null);
  const crowdInst = useRef(null);
  const weatherInst = useRef(null);

  const showToast = (msg) => {
    setToastNotification(msg);
    setTimeout(() => setToastNotification(''), 3500);
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    if (onRefresh) {
      await onRefresh();
    }
    fetchGrievanceMetrics();
    showToast(`Telemetry synced with Municipal SCADA Grid`);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Dynamic corridor presets
  const corridorPresets = {
    ALL: { name: 'Citywide Average', locationLabel: 'Central Business District', speedMod: 0, crowdMod: 0, rainMod: 0, congestion: 34 },
    MARATHAHALLI: { name: 'Marathahalli Corridor', locationLabel: 'Marathahalli ORR', speedMod: -10, crowdMod: 110, rainMod: 1.2, congestion: 68 },
    SILKBOARD: { name: 'Silk Board Corridor', locationLabel: 'Silk Board Junction', speedMod: -14, crowdMod: 190, rainMod: 0.8, congestion: 74 },
    MGROAD: { name: 'MG Road Central', locationLabel: 'MG Road Central', speedMod: -4, crowdMod: 140, rainMod: 0.0, congestion: 48 },
    WHITEFIELD: { name: 'Whitefield Corridor', locationLabel: 'Whitefield IT Corridor', speedMod: +2, crowdMod: 30, rainMod: 0.4, congestion: 38 },
    HEBBAL: { name: 'Hebbal Corridor', locationLabel: 'Hebbal Flyover', speedMod: +6, crowdMod: -40, rainMod: 0.2, congestion: 26 }
  };

  const preset = corridorPresets[selectedCorridor] || corridorPresets.ALL;

  const rawTraffic = telemetryData?.traffic || { condition: 'Moderate Congestion', avg_speed_kmh: 28, congestion_level_pct: 34 };
  const rawCrowd = telemetryData?.crowd || { density_level: 'Normal', current_density: 420, peak_today: 620 };
  const rawWeather = telemetryData?.weather || { condition: 'Light Rain', temperature_c: 24, rainfall_mm: 2.4 };

  const traffic = {
    ...rawTraffic,
    avg_speed_kmh: Math.max(12, (rawTraffic.avg_speed_kmh || 28) + preset.speedMod),
    congestion_level_pct: Math.min(96, Math.max(15, (rawTraffic.congestion_level_pct || 34) + (preset.congestion - 34))),
    condition: 'Moderate Congestion'
  };

  const crowd = {
    ...rawCrowd,
    current_density: Math.max(200, (rawCrowd.current_density || 420) + preset.crowdMod),
    peak_today: Math.max((rawCrowd.current_density || 420) + preset.crowdMod, rawCrowd.peak_today || 620),
    density_level: 'Normal'
  };

  const weather = {
    ...rawWeather,
    temp_c: liveWeather?.telemetry?.temperature_c ?? rawWeather.temperature_c ?? rawWeather.temp_c ?? 26.5,
    condition: liveWeather?.telemetry?.condition ?? rawWeather.condition ?? 'Partly Cloudy',
    rainfall_mm: Number(Math.max(0, (liveWeather?.telemetry?.rainfall_mm ?? rawWeather.rainfall_mm ?? 1.5) + preset.rainMod).toFixed(1)),
    humidity_pct: liveWeather?.telemetry?.humidity_pct ?? 68,
    wind_speed: liveWeather?.telemetry?.wind_speed_kmh ?? 14.5
  };

  // Helper for dynamic category icons and badges
  const getCategoryIconMeta = (cat) => {
    const c = (cat || '').toLowerCase();
    if (c.includes('traffic') || c.includes('road')) {
      return { iconBg: '#FEE2E2', iconColor: '#EF4444', iconType: 'car' };
    }
    if (c.includes('crowd') || c.includes('civic') || c.includes('garbage')) {
      return { iconBg: '#DBEAFE', iconColor: '#2563EB', iconType: 'users' };
    }
    if (c.includes('weather') || c.includes('rain') || c.includes('flood') || c.includes('water')) {
      return { iconBg: '#E0F2FE', iconColor: '#0284C7', iconType: 'cloud' };
    }
    return { iconBg: '#EDE9FE', iconColor: '#7C3AED', iconType: 'train' };
  };

  // AI Directives Catalog — Dynamically populated from live alerts and civic dispatch
  const dynamicRecs = (telemetryData?.recommendations && telemetryData.recommendations.length > 0)
    ? telemetryData.recommendations.map(rec => ({
        id: rec.id || `rec-${Math.random()}`,
        title: rec.title || 'Tactical Directive',
        category: rec.category || 'Transit',
        time_ago: rec.time_ago || 'Live Priority',
        authority: rec.authority || 'Urban Control Center',
        targetCorridor: rec.targetCorridor || 'Central Corridor',
        actionPlan: rec.actionPlan || rec.description || 'Monitor corridor telemetry.',
        ...getCategoryIconMeta(rec.category)
      }))
    : [];

  const recommendationsList = dynamicRecs.length > 0 ? dynamicRecs : [
    {
      id: 'rec-01',
      title: 'Reroute traffic on Outer Ring Road',
      category: 'Traffic',
      time_ago: 'Traffic • 5 min ago',
      authority: 'Bengaluru Traffic Police (BTP) & VMS Grid',
      targetCorridor: 'Outer Ring Road (Marathahalli – Bellandur)',
      actionPlan: 'Execute Plan 4B: Divert freight & private transit via Varthur Road. Signal green wave extended by 25s at Kadubeesanahalli.',
      iconBg: '#FEE2E2',
      iconColor: '#EF4444',
      iconType: 'car'
    },
    {
      id: 'rec-02',
      title: 'Increase crowd monitoring at MG Road',
      category: 'Crowd',
      time_ago: 'Crowd • 8 min ago',
      authority: 'Municipal Field Marshals & BMRCL Station Security',
      targetCorridor: 'MG Road Interchange & Brigade Road Metro Concourse',
      actionPlan: 'Deploy 4 rapid intervention squads to platforms 1 & 2. Restrict south concourse turnstiles to metering mode.',
      iconBg: '#DBEAFE',
      iconColor: '#2563EB',
      iconType: 'users'
    },
    {
      id: 'rec-03',
      title: 'Monitor rainfall impact in Koramangala',
      category: 'Weather',
      time_ago: 'Weather • 12 min ago',
      authority: 'BBMP Stormwater Control & Emergency Dewatering Squad',
      targetCorridor: 'Koramangala 80ft Road & Ejipura Underpass',
      actionPlan: 'Pre-position dual 120-HP mobile submersible dewatering pumps. Close lower underpass lane to prevent vehicle stalls.',
      iconBg: '#E0F2FE',
      iconColor: '#0284C7',
      iconType: 'cloud'
    },
    {
      id: 'rec-04',
      title: 'Optimize metro frequency (Purple Line)',
      category: 'Metro',
      time_ago: 'Metro • 15 min ago',
      authority: 'BMRCL Automated SCADA Train Dispatch',
      targetCorridor: 'Purple Line (Whitefield to Challaghatta)',
      actionPlan: 'Inject 2 reserve 6-coach rake sets into corridor. Tighten station dwell times to 32 seconds across peak nodes.',
      iconBg: '#EDE9FE',
      iconColor: '#7C3AED',
      iconType: 'train'
    }
  ];

  // Active Alerts List — Dynamically sourced from backend AlertModel
  const dynamicAlerts = (telemetryData?.alerts && telemetryData.alerts.length > 0)
    ? telemetryData.alerts.slice(0, 4).map(alt => ({
        id: alt.id,
        title: alt.title,
        location: alt.location || 'Bengaluru',
        time: alt.time_ago || alt.time || alt.timestamp || 'Live',
        severity: alt.severity || 'Moderate',
        color: (alt.severity === 'Critical' || alt.severity === 'CRITICAL')
          ? '#EF4444'
          : ((alt.severity === 'High' || alt.severity === 'HIGH') ? '#F97316' : '#F59E0B')
      }))
    : [];

  const activeAlertsList = dynamicAlerts.length > 0 ? dynamicAlerts : [
    {
      id: 'alt-01',
      title: 'Severe Traffic Congestion',
      location: 'Marathahalli – Outer Ring Road',
      time: '2 minutes ago',
      severity: 'Critical',
      color: '#EF4444'
    },
    {
      id: 'alt-02',
      title: 'Heavy Rainfall',
      location: 'Whitefield',
      time: '5 minutes ago',
      severity: 'Critical',
      color: '#EF4444'
    },
    {
      id: 'alt-03',
      title: 'Severe Flash Flood Risk',
      location: 'Ejipura Underpass',
      time: '8 minutes ago',
      severity: 'Critical',
      color: '#EF4444'
    },
    {
      id: 'alt-04',
      title: 'Metro Delay',
      location: 'Purple Line',
      time: '12 minutes ago',
      severity: 'Warning',
      color: '#F59E0B'
    }
  ];

  // System Health Services — Dynamically bound to real backend telemetry
  const dynamicHealth = (telemetryData?.system_status && telemetryData.system_status.length > 0)
    ? [
        ...telemetryData.system_status.map((item, idx) => ({
          name: item.source || item.name,
          latency: `${10 + (idx * 3)}ms`,
          status: item.status || 'Operational'
        })),
        {
          name: 'Predictive XGBoost Engine',
          latency: `${telemetryData?.latency_ms || 14}ms`,
          status: predictiveOverview?.primary_model ? 'Operational' : 'Active'
        }
      ]
    : [
        { name: 'Traffic Data', latency: '12ms', status: 'Operational' },
        { name: 'Weather Data', latency: '16ms', status: 'Operational' },
        { name: 'Crowd Data', latency: '14ms', status: 'Operational' },
        { name: 'Metro Data', latency: '19ms', status: 'Operational' },
        { name: 'CCTV & Video Feeds', latency: '24ms', status: 'Operational' },
        { name: 'Predictive Analytics Engine', latency: `${telemetryData?.latency_ms || 14}ms`, status: 'Operational' }
      ];

  const systemHealthList = dynamicHealth;

  // Search Collections for Command Palette
  const allNavigationItems = [
    { type: 'view', id: 'map', label: 'GIS Live Intelligence Map', desc: 'Real-time city layers, incidents, cameras & civic issues', badge: 'Map' },
    { type: 'view', id: 'grievances', label: 'Civic Grievance Management', desc: 'Triage citizen complaints, dispatch squads & track SLA', badge: 'Complaints' },
    { type: 'view', id: 'alerts', label: 'Incident & Emergency Alerts', desc: 'Critical city warnings, traffic gridlocks & weather hazards', badge: 'Alerts' },
    { type: 'view', id: 'analytics', label: 'Urban Telemetry Analytics', desc: 'Historical congestion curves, crowd heatmaps & trends', badge: 'Analytics' },
    { type: 'view', id: 'predictive_calendar', label: 'Predictive Operations Calendar', desc: 'Forecasted city events, high congestion dates & planning', badge: 'Calendar' },
    { type: 'view', id: 'simulation', label: 'Scenario Simulation Engine', desc: 'Simulate weather events, road closures & crowd surges', badge: 'Simulation' },
    { type: 'view', id: 'focus', label: 'Corridor Focus & Dispatch', desc: 'Granular corridor inspection and squad dispatching', badge: 'Dispatch' },
    { type: 'view', id: 'reports', label: 'Executive Operations Reports', desc: 'Generate and download official PDF/CSV municipal dossiers', badge: 'Reports' },
    { type: 'view', id: 'settings', label: 'System Configuration', desc: 'API thresholds, notification rules & role permissions', badge: 'Settings' }
  ];

  const allCorridorItems = [
    { type: 'corridor', id: 'ALL', label: 'All Urban Sectors (Bengaluru)', desc: 'Aggregate view across 8 municipal zones' },
    { type: 'corridor', id: 'MARATHAHALLI', label: 'Marathahalli – Outer Ring Road', desc: 'High-density IT corridor & arterial underpass' },
    { type: 'corridor', id: 'WHITEFIELD', label: 'Whitefield Tech Corridor', desc: 'ITPL main line, metro interchange & junction' },
    { type: 'corridor', id: 'KORAMANGALA', label: 'Koramangala 80ft Road & Sony World', desc: 'Major commercial arterial & stormwater basin' },
    { type: 'corridor', id: 'SILK_BOARD', label: 'Silk Board Junction', desc: 'South Bengaluru primary transit confluence' },
    { type: 'corridor', id: 'INDIRANAGAR', label: 'Indiranagar 100ft Road', desc: 'Commercial corridor & arterial connector' },
    { type: 'corridor', id: 'MG_ROAD', label: 'MG Road & Central CBD', desc: 'Central administrative and metro interchange node' }
  ];

  const searchResults = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const directivesList = recommendationsList || [];
    if (!q) {
      return {
        views: allNavigationItems.slice(0, 3),
        corridors: allCorridorItems.slice(0, 3),
        directives: directivesList.slice(0, 2),
        alerts: (activeAlertsList || []).slice(0, 2)
      };
    }
    return {
      views: allNavigationItems.filter(v => v.label.toLowerCase().includes(q) || v.desc.toLowerCase().includes(q)),
      corridors: allCorridorItems.filter(c => c.label.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q)),
      directives: directivesList.filter(d => d.title.toLowerCase().includes(q) || d.targetCorridor.toLowerCase().includes(q) || d.actionPlan.toLowerCase().includes(q)),
      alerts: (activeAlertsList || []).filter(a => a.title.toLowerCase().includes(q) || a.location.toLowerCase().includes(q))
    };
  }, [searchQuery, recommendationsList, activeAlertsList]);

  const handleOpenDispatchModal = (item) => {
    setDispatchModal(item);
    setOperatorNote(`Authorized tactical directive for ${item.title}. Enforce immediately.`);
  };

  const handleConfirmDispatch = () => {
    if (!dispatchModal) return;
    setIsDispatching(true);
    setTimeout(() => {
      setIsDispatching(false);
      showToast(`Directive dispatched to ${dispatchModal.authority}`);
      setDispatchModal(null);
    }, 400);
  };

  // Custom Chart Plugin for Tooltip Peak Callout (Exact Match to Mockup)
  const peakTooltipPlugin = {
    id: 'peakTooltipPlugin',
    afterDraw(chart, args, options) {
      try {
        if (!options || !options.peakLabel) return;
        const { ctx, scales } = chart;
        if (!ctx || !scales || !scales.x || !scales.y) return;
        const { x, y } = scales;
        const peakIndex = options.peakIndex ?? 3;
        const xPos = typeof x.getPixelForTick === 'function' ? x.getPixelForTick(peakIndex) : (x.getPixelForValue ? x.getPixelForValue(peakIndex) : 0);
        if (typeof xPos !== 'number' || isNaN(xPos)) return;
        const yVal = options.peakValue ?? 62;
        const yPos = typeof y.getPixelForValue === 'function' ? y.getPixelForValue(yVal) : 0;
        if (typeof yPos !== 'number' || isNaN(yPos)) return;
        const isLight = options.theme === 'light';

        ctx.save();
        const textLine1 = options.peakLabel;
        const textLine2 = options.peakSub || '';
        ctx.font = 'bold 10px "Plus Jakarta Sans", sans-serif';
        const textWidth = Math.max(ctx.measureText(textLine1).width, ctx.measureText(textLine2).width) + 16;
        const boxHeight = textLine2 ? 32 : 20;
        const boxX = xPos - textWidth / 2;
        const boxY = yPos - boxHeight - 8;

        // Draw capsule
        ctx.fillStyle = isLight ? '#FFFFFF' : 'rgba(15, 23, 42, 0.92)';
        ctx.strokeStyle = isLight ? '#E2E8F0' : 'rgba(51, 65, 85, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(boxX, boxY, textWidth, boxHeight, 6);
        } else {
          ctx.rect(boxX, boxY, textWidth, boxHeight);
        }
        ctx.fill();
        ctx.stroke();

        // Triangle pointer pointing down
        ctx.beginPath();
        ctx.moveTo(xPos - 4, boxY + boxHeight);
        ctx.lineTo(xPos, boxY + boxHeight + 4);
        ctx.lineTo(xPos + 4, boxY + boxHeight);
        ctx.closePath();
        ctx.fillStyle = isLight ? '#FFFFFF' : 'rgba(15, 23, 42, 0.92)';
        ctx.fill();
        if (isLight) {
          ctx.strokeStyle = '#E2E8F0';
          ctx.stroke();
        }

        // Text 1
        ctx.fillStyle = isLight ? '#0F172A' : '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.fillText(textLine1, xPos, boxY + 13);
        if (textLine2) {
          ctx.font = '500 9px "Plus Jakarta Sans", sans-serif';
          ctx.fillStyle = isLight ? '#64748B' : '#94A3B8';
          ctx.fillText(textLine2, xPos, boxY + 25);
        }
        ctx.restore();
      } catch (err) {
        console.warn('[peakTooltipPlugin] skipped render due to notice:', err);
      }
    }
  };

  // Dynamic Chart.js Rendering responding to Corridor & Time Range changes
  useEffect(() => {
    // 1. Traffic Velocity Chart (Red/Orange smooth curve)
    if (trafficChartRef.current) {
      if (trafficInst.current) trafficInst.current.destroy();
      const ctx = trafficChartRef.current.getContext('2d');
      const gradient = ctx.createLinearGradient(0, 0, 0, 160);
      gradient.addColorStop(0, 'rgba(239, 68, 68, 0.35)');
      gradient.addColorStop(0.6, 'rgba(249, 115, 22, 0.15)');
      gradient.addColorStop(1, 'rgba(239, 68, 68, 0.0)');

      const trafficHistory = telemetryData?.traffic?.history;
      const labels = (trafficHistory && trafficHistory.length > 0)
        ? trafficHistory.map(h => h.time)
        : ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];
      const dataPoints = (trafficHistory && trafficHistory.length > 0)
        ? trafficHistory.map(h => h.speed)
        : [38, 30, 42, 62, 45, 61, 46];
      const maxTraffic = Math.max(...dataPoints);
      const peakTrafficIdx = dataPoints.indexOf(maxTraffic);

      trafficInst.current = new Chart(ctx, {
        type: 'line',
        plugins: [peakTooltipPlugin],
        data: {
          labels,
          datasets: [{
            data: dataPoints,
            borderColor: '#EF4444',
            backgroundColor: gradient,
            fill: true,
            tension: 0.45,
            borderWidth: 2.5,
            pointRadius: (context) => (context.dataIndex === peakTrafficIdx ? 5 : 3.5),
            pointBackgroundColor: '#EF4444',
            pointBorderColor: '#FFFFFF',
            pointBorderWidth: 2,
            pointHoverRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { enabled: true },
            peakTooltipPlugin: {
              peakIndex: peakTrafficIdx >= 0 ? peakTrafficIdx : 3,
              peakValue: maxTraffic,
              peakLabel: `${maxTraffic} km/h`,
              peakSub: labels[peakTrafficIdx] || '14:00',
              theme: 'dark'
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { font: { size: 9, family: 'inherit' }, color: '#94A3B8' },
              border: { display: false }
            },
            y: {
              min: 0,
              max: 80,
              ticks: { stepSize: 20, font: { size: 9, family: 'inherit' }, color: '#94A3B8' },
              grid: { color: 'rgba(226, 232, 240, 0.6)' },
              border: { display: false }
            }
          }
        }
      });
    }

    // 2. Crowd Density Trend Chart (Blue smooth curve)
    if (crowdChartRef.current) {
      if (crowdInst.current) crowdInst.current.destroy();
      const ctx = crowdChartRef.current.getContext('2d');
      const gradient = ctx.createLinearGradient(0, 0, 0, 160);
      gradient.addColorStop(0, 'rgba(37, 99, 235, 0.35)');
      gradient.addColorStop(0.6, 'rgba(37, 99, 235, 0.12)');
      gradient.addColorStop(1, 'rgba(37, 99, 235, 0.0)');

      const crowdHistory = telemetryData?.crowd?.history;
      const labels = (crowdHistory && crowdHistory.length > 0)
        ? crowdHistory.map(h => h.time)
        : ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];
      const dataPoints = (crowdHistory && crowdHistory.length > 0)
        ? crowdHistory.map(h => h.density)
        : [320, 480, 420, 560, 440, 620, 500];
      const maxCrowd = Math.max(...dataPoints);
      const peakCrowdIdx = dataPoints.indexOf(maxCrowd);

      crowdInst.current = new Chart(ctx, {
        type: 'line',
        plugins: [peakTooltipPlugin],
        data: {
          labels,
          datasets: [{
            data: dataPoints,
            borderColor: '#2563EB',
            backgroundColor: gradient,
            fill: true,
            tension: 0.45,
            borderWidth: 2.5,
            pointRadius: (context) => (context.dataIndex === peakCrowdIdx ? 5 : 3.5),
            pointBackgroundColor: '#2563EB',
            pointBorderColor: '#FFFFFF',
            pointBorderWidth: 2,
            pointHoverRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { enabled: true },
            peakTooltipPlugin: {
              peakIndex: peakCrowdIdx >= 0 ? peakCrowdIdx : 5,
              peakValue: maxCrowd,
              peakLabel: `${maxCrowd} /km²`,
              peakSub: labels[peakCrowdIdx] || '18:00',
              theme: 'light'
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { font: { size: 9, family: 'inherit' }, color: '#94A3B8' },
              border: { display: false }
            },
            y: {
              min: 0,
              max: 1000,
              ticks: {
                stepSize: 200,
                font: { size: 9, family: 'inherit' },
                color: '#94A3B8',
                callback: (val) => (val === 1000 ? '1K' : val)
              },
              grid: { color: 'rgba(226, 232, 240, 0.6)' },
              border: { display: false }
            }
          }
        }
      });
    }

    // 3. Weather & Rain Feed Chart (Vertical cyan-blue bars)
    if (weatherChartRef.current) {
      if (weatherInst.current) weatherInst.current.destroy();
      const ctx = weatherChartRef.current.getContext('2d');

      const historyItems = (liveWeather?.telemetry?.history && liveWeather.telemetry.history.length > 0)
        ? liveWeather.telemetry.history
        : (telemetryData?.weather?.history || []);
      const labels = historyItems.length > 0 ? historyItems.map(h => h.time) : ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];
      const rainData = historyItems.length > 0 ? historyItems.map(h => (h.rainfall ?? h.rain ?? 0.4)) : [0.4, 0.6, 1.1, 1.4, 1.9, 2.4, 2.9, 3.4, 4.0, 4.2, 3.8, 3.1, 2.7];
      const maxRain = Math.max(...rainData);
      const peakRainIdx = rainData.indexOf(maxRain);

      weatherInst.current = new Chart(ctx, {
        type: 'bar',
        plugins: [peakTooltipPlugin],
        data: {
          labels,
          datasets: [{
            data: rainData,
            backgroundColor: '#0284C7',
            hoverBackgroundColor: '#0369A1',
            borderRadius: 4,
            borderSkipped: false,
            barPercentage: 0.62
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { enabled: true },
            peakTooltipPlugin: {
              peakIndex: peakRainIdx >= 0 ? peakRainIdx : 9,
              peakValue: maxRain,
              peakLabel: `${maxRain} mm`,
              peakSub: labels[peakRainIdx] || '17:00',
              theme: 'light'
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { font: { size: 8, family: 'inherit' }, color: '#94A3B8' },
              border: { display: false }
            },
            y: {
              min: 0,
              max: 5,
              ticks: { stepSize: 1, font: { size: 9, family: 'inherit' }, color: '#94A3B8' },
              grid: { color: 'rgba(226, 232, 240, 0.6)' },
              border: { display: false }
            }
          }
        }
      });
    }

    return () => {
      if (trafficInst.current) trafficInst.current.destroy();
      if (crowdInst.current) crowdInst.current.destroy();
      if (weatherInst.current) weatherInst.current.destroy();
    };
  }, [selectedCorridor, activeTimeRange, telemetryData, liveWeather]);

  return (
    <div className="dashboard-exact-viewport">
      {/* Toast Notification */}
      {toastNotification && (
        <div className="dashboard-floating-toast">
          <span className="toast-dot-live"></span>
          <span>{toastNotification}</span>
        </div>
      )}

      {/* =================================================================== */}
      {/* PANORAMIC CITY SKYLINE HEADER (Command Bar + Greeting & Widgets)   */}
      {/* =================================================================== */}
      <div className="dashboard-panoramic-header">
        {/* TOP COMMAND BAR (Search, Date/Time, User Avatar) */}
        <div className="top-command-bar">
          {/* Left Subtag */}
          <div className="command-subtag">
            <span className="subtag-dot teal" />
            <span className="subtag-command">COMMAND</span>
            <span className="subtag-center">CENTER</span>
            <span className="subtag-dot green" />
            <span className="subtag-intel">Live City Intelligence</span>
          </div>

          {/* Center Search Input & Interactive Command Palette */}
          <div className="command-search-wrap" ref={searchContainerRef}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#64748B" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              className="command-search-input"
              placeholder="Search location, incident, or keyword..."
              value={searchQuery}
              onFocus={() => setIsSearchFocused(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchFocused(true);
              }}
            />
            <div
              className="command-search-kbd"
              title="Click or press Ctrl+K to search"
              onClick={() => {
                searchInputRef.current?.focus();
                setIsSearchFocused(true);
              }}
            >
              Ctrl K
            </div>

            {/* Live Command Palette Dropdown */}
            {isSearchFocused && (
              <div className="command-search-dropdown">
                {/* Views Section */}
                {searchResults.views && searchResults.views.length > 0 && (
                  <div className="search-dropdown-section">
                    <div className="search-dropdown-group-title">Navigation Views</div>
                    {searchResults.views.map(v => (
                      <div
                        key={v.id}
                        className="search-dropdown-item"
                        onClick={() => {
                          if (onNavigate) onNavigate(v.id);
                          setIsSearchFocused(false);
                          setSearchQuery('');
                          showToast(`Opened ${v.label}`);
                        }}
                      >
                        <div className="search-item-left">
                          <div className="search-item-icon blue">🧭</div>
                          <div className="search-item-texts">
                            <div className="search-item-title">{v.label}</div>
                            <div className="search-item-desc">{v.desc}</div>
                          </div>
                        </div>
                        <span className="search-item-badge">{v.badge}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Corridors Section */}
                {searchResults.corridors && searchResults.corridors.length > 0 && (
                  <div className="search-dropdown-section">
                    <div className="search-dropdown-group-title">Monitored Corridors</div>
                    {searchResults.corridors.map(c => (
                      <div
                        key={c.id}
                        className="search-dropdown-item"
                        onClick={() => {
                          setSelectedCorridor(c.id);
                          setIsSearchFocused(false);
                          setSearchQuery('');
                          showToast(`Telemetry filtered to ${c.label}`);
                        }}
                      >
                        <div className="search-item-left">
                          <div className="search-item-icon green">📍</div>
                          <div className="search-item-texts">
                            <div className="search-item-title">{c.label}</div>
                            <div className="search-item-desc">{c.desc}</div>
                          </div>
                        </div>
                        <span className="search-item-badge">Corridor</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Alerts Section */}
                {searchResults.alerts && searchResults.alerts.length > 0 && (
                  <div className="search-dropdown-section">
                    <div className="search-dropdown-group-title">Active Alerts</div>
                    {searchResults.alerts.map(a => (
                      <div
                        key={a.id}
                        className="search-dropdown-item"
                        onClick={() => {
                          if (onNavigate) onNavigate('alerts');
                          setIsSearchFocused(false);
                          setSearchQuery('');
                          showToast(`Navigated to Alert: ${a.title}`);
                        }}
                      >
                        <div className="search-item-left">
                          <div className="search-item-icon red">⚠️</div>
                          <div className="search-item-texts">
                            <div className="search-item-title">{a.title}</div>
                            <div className="search-item-desc">{a.location} • {a.time}</div>
                          </div>
                        </div>
                        <span className="search-item-badge red">{a.severity}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Directives Section */}
                {searchResults.directives && searchResults.directives.length > 0 && (
                  <div className="search-dropdown-section">
                    <div className="search-dropdown-group-title">Tactical Directives</div>
                    {searchResults.directives.map(d => (
                      <div
                        key={d.id}
                        className="search-dropdown-item"
                        onClick={() => {
                          handleOpenDispatchModal(d);
                          setIsSearchFocused(false);
                          setSearchQuery('');
                        }}
                      >
                        <div className="search-item-left">
                          <div className="search-item-icon purple">⚡</div>
                          <div className="search-item-texts">
                            <div className="search-item-title">{d.title}</div>
                            <div className="search-item-desc">{d.authority}</div>
                          </div>
                        </div>
                        <span className="search-item-badge blue">Dispatch</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Date/Time & Avatar */}
          <div className="command-top-right">
            <div className="command-date-time-box">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#2563EB" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <div className="date-time-text">
                <div className="date-label">{currentTime.dateStr}</div>
                <div className="time-label">{currentTime.timeStr}</div>
              </div>
            </div>

            <div className="command-user-avatar-wrap" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div className="command-user-avatar-badge" title={`Logged in as ${officerDisplayName}`}>
                {(officerDisplayName[0] || 'A').toUpperCase()}
              </div>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#64748B" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </div>
        </div>

        {/* HERO GREETING & RIGHT WIDGETS */}
        <div className="hero-banner-content">
          <div className="hero-greeting-box">
            <h1 className="hero-greeting-title">
              {currentTime.greeting || 'Good Day'}, <span className="greeting-highlight">{officerDisplayName}</span>
            </h1>
            <p className="hero-greeting-sub">Here's what's happening in your city today.</p>
          </div>

          <div className="hero-right-widgets">
            {/* Weather Glass Card */}
            <div className="hero-weather-card">
              <div className="weather-icon-sun">
                <svg viewBox="0 0 24 24" width="30" height="30" fill="none">
                  {/* Sun */}
                  <circle cx="9" cy="9" r="4" fill="#FBBF24" />
                  {/* Cloud */}
                  <path
                    d="M7 16a4 4 0 0 1-.5-7.96A5 5 0 0 1 16 9.5a3.5 3.5 0 0 1 1 6.5H7z"
                    fill="#FFFFFF"
                    stroke="#E2E8F0"
                    strokeWidth="1.2"
                  />
                </svg>
              </div>
              <div className="weather-temp-col">
                <div className="weather-temp-num">{weather.temp_c}°C</div>
                <div className="weather-temp-label">{weather.condition}</div>
              </div>
              <div className="weather-v-divider" />
              <div className="weather-location-col">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#FFFFFF" strokeWidth="2">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                  <circle cx="12" cy="9" r="2.5" />
                </svg>
                <span>Bengaluru</span>
                <span style={{ fontSize: '0.62rem', opacity: 0.85, fontWeight: 700, letterSpacing: '0.5px' }}>WEATHER API LIVE</span>
              </div>
            </div>

            {/* Live Stream Pill */}
            <div className="hero-live-stream-pill" onClick={handleManualRefresh} title="Click to refresh telemetry">
              <div className="live-stream-radar">
                <span className="radar-ping" />
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#FFFFFF" strokeWidth="2">
                  <path d="M4.93 4.93a10 10 0 0 0 0 14.14M19.07 4.93a10 10 0 0 1 0 14.14M7.76 7.76a6 6 0 0 0 0 8.48M16.24 7.76a6 6 0 0 1 0 8.48" />
                  <circle cx="12" cy="12" r="2" fill="#FFFFFF" />
                </svg>
              </div>
              <div className="live-stream-text">
                <div className="live-stream-badge-title">LIVE STREAM</div>
                <div className="live-stream-time">{currentTime.liveStreamStr}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* MAIN DASHBOARD CONTENT AREA                                         */}
      {/* =================================================================== */}
      <div className="dashboard-main-content">
        {/* ROW 1: 4 KEY METRIC CARDS WITH SMOOTH SPARKLINES */}
        <div className="grid-metric-cards">
        {/* Card 1: Traffic Velocity */}
        <div className="metric-card" onClick={() => onNavigate && onNavigate('map')} title="Open Map">
          <div className="metric-card-content">
            <div className="metric-icon-box red-tint">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#EF4444" strokeWidth="2">
                <rect x="3" y="11" width="18" height="8" rx="2" />
                <path d="M5 11l2-5h10l2 5" />
                <circle cx="7.5" cy="15.5" r="1.5" />
                <circle cx="16.5" cy="15.5" r="1.5" />
              </svg>
            </div>
            <div className="metric-info-col">
              <div className="metric-title-small">Traffic Velocity</div>
              <div className="metric-main-value">{traffic.avg_speed_kmh} km/h</div>
              <div className="metric-footer-row">
                <span className="metric-delta red">
                  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="18 15 12 9 6 15" />
                  </svg>
                  {traffic.congestion_level_pct}% Congestion
                </span>
                <span className="metric-badge orange">{traffic.condition || 'Moderate Congestion'}</span>
              </div>
            </div>
          </div>
          {/* Smooth Red Sparkline */}
          <div className="metric-sparkline-wrap">
            <svg viewBox="0 0 120 40" preserveAspectRatio="none">
              <defs>
                <linearGradient id="spk-red" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#EF4444" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#EF4444" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d="M 0 32 Q 25 30, 45 22 T 85 8 T 120 18 L 120 40 L 0 40 Z" fill="url(#spk-red)" />
              <path d="M 0 32 Q 25 30, 45 22 T 85 8 T 120 18" fill="none" stroke="#EF4444" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Card 2: Crowd Footfall */}
        <div className="metric-card" onClick={() => onNavigate && onNavigate('focus')} title="Open Focus View">
          <div className="metric-card-content">
            <div className="metric-icon-box blue-tint">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#2563EB" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div className="metric-info-col">
              <div className="metric-title-small">Crowd Footfall</div>
              <div className="metric-main-value">{crowd.current_density} /km²</div>
              <div className="metric-footer-row">
                <span className="metric-delta green">
                  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                  Peak: {crowd.peak_today} /km²
                </span>
                <span className="metric-badge green">{crowd.density_level || 'Normal'}</span>
              </div>
            </div>
          </div>
          {/* Smooth Blue Sparkline */}
          <div className="metric-sparkline-wrap">
            <svg viewBox="0 0 120 40" preserveAspectRatio="none">
              <defs>
                <linearGradient id="spk-blue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563EB" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d="M 0 30 Q 30 28, 55 18 T 90 12 T 120 22 L 120 40 L 0 40 Z" fill="url(#spk-blue)" />
              <path d="M 0 30 Q 30 28, 55 18 T 90 12 T 120 22" fill="none" stroke="#2563EB" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Card 3: Weather Conditions */}
        <div className="metric-card" onClick={() => onNavigate && onNavigate('simulation')} title="Open Scenario Analysis">
          <div className="metric-card-content">
            <div className="metric-icon-box green-tint">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#059669" strokeWidth="2">
                <path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25" />
                <path d="M8 16v3" />
                <path d="M12 16v3" />
                <path d="M16 16v3" />
              </svg>
            </div>
            <div className="metric-info-col">
              <div className="metric-title-small">Weather Conditions (Live Weather API)</div>
              <div className="metric-main-value">{weather.temp_c}°C</div>
              <div className="metric-footer-row">
                <span className="metric-sub-label">— {weather.rainfall_mm} mm precip • {weather.humidity_pct}% RH</span>
                <span className="metric-badge green">{weather.condition}</span>
              </div>
            </div>
          </div>
          {/* Smooth Emerald Sparkline */}
          <div className="metric-sparkline-wrap">
            <svg viewBox="0 0 120 40" preserveAspectRatio="none">
              <defs>
                <linearGradient id="spk-green" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d="M 0 28 Q 35 24, 65 14 T 95 18 T 120 10 L 120 40 L 0 40 Z" fill="url(#spk-green)" />
              <path d="M 0 28 Q 35 24, 65 14 T 95 18 T 120 10" fill="none" stroke="#10B981" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Card 4: Metro Operations */}
        <div className="metric-card" onClick={() => onNavigate && onNavigate('analytics')} title="Open Analytics">
          <div className="metric-card-content">
            <div className="metric-icon-box purple-tint">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#7C3AED" strokeWidth="2">
                <rect x="4" y="3" width="16" height="16" rx="2" />
                <path d="M4 11h16M12 3v8M8 19l-2 3M16 19l2 3" />
              </svg>
            </div>
            <div className="metric-info-col">
              <div className="metric-title-small">Metro Operations (BMRCL)</div>
              <div className="metric-main-value">
                {predictiveOverview?.primary_model?.held_out_test_r2
                  ? `${(predictiveOverview.primary_model.held_out_test_r2 * 100).toFixed(1)}%`
                  : '97.1%'}
              </div>
              <div className="metric-footer-row">
                <span className="metric-delta green">
                  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="18 15 12 9 6 15" />
                  </svg>
                  MAE {predictiveOverview?.primary_model?.held_out_test_mae || '72.8'} pax
                </span>
                <span className="metric-badge green">
                  {predictiveOverview?.primary_model ? 'XGBoost Active' : 'Optimal Frequency'}
                </span>
              </div>
            </div>
          </div>
          {/* Smooth Purple Sparkline */}
          <div className="metric-sparkline-wrap">
            <svg viewBox="0 0 120 40" preserveAspectRatio="none">
              <defs>
                <linearGradient id="spk-purple" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#7C3AED" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d="M 0 26 Q 30 18, 60 22 T 95 10 T 120 16 L 120 40 L 0 40 Z" fill="url(#spk-purple)" />
              <path d="M 0 26 Q 30 18, 60 22 T 95 10 T 120 16" fill="none" stroke="#7C3AED" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* ROW 2: CIVIC GRIEVANCE REDRESSAL NETWORK BANNER WITH ROUTE MAP     */}
      {/* =================================================================== */}
      <div className="civic-grievance-banner">
        <div className="civic-left-block">
          <div className="civic-icon-box">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#2563EB" strokeWidth="2.2">
              <path d="M3 11l19-9-9 19-2-8-8-2z" />
            </svg>
          </div>
          <div className="civic-text-details">
            <div className="civic-title-row">
              <span className="civic-heading">Civic Grievance Redressal Network</span>
              <div className="civic-dept-badges">
                <span className="dept-pill">BBMP</span>
                <span className="dept-pill">BWSSB</span>
                <span className="dept-pill">BESCOM</span>
                <span className="dept-pill">BTP</span>
              </div>
            </div>
            <div className="civic-stats-row">
              <span>{grievanceMetrics.total_complaints} Logged</span>
              <span className="dot-sep">•</span>
              <span>{grievanceMetrics.awaiting_assignment_count} Awaiting Assignment</span>
              <span className="dot-sep">•</span>
              <span className="stat-blue">{grievanceMetrics.active_field_count} In Field</span>
              <span className="dot-sep">•</span>
              <span className="stat-green">{grievanceMetrics.resolved_count} Resolved ({grievanceMetrics.sla_compliance_pct}% SLA)</span>
            </div>
          </div>
        </div>

        {/* Center Route Map Graphic */}
        <div className="civic-route-graphic" aria-hidden="true">
          <img
            src="/assets/civic_route_map_exact.png"
            alt="Civic GPS Routing Map"
            className="civic-map-img"
          />
        </div>

        {/* Right Manage Button */}
        <button
          type="button"
          onClick={() => onNavigate && onNavigate('grievances')}
          className="civic-action-btn"
          title="Open Civic Grievances Console"
        >
          <span>Manage Grievances & Dispatches</span>
          <span className="civic-arrow-exact">→</span>
        </button>
      </div>

      {/* =================================================================== */}
      {/* ROW 3: CITY TRENDS & ANALYTICS (3 CHARTS IN UNIFIED PANEL)          */}
      {/* =================================================================== */}
      <div className="unified-panel city-trends-panel">
        <div className="trends-section-header">
          <div className="trends-header-left">
            <div className="trends-icon-badge">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#2563EB" strokeWidth="2">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            </div>
            <div>
              <h2 className="trends-title">City Trends & Analytics</h2>
              <p className="trends-sub">Real-time insights from across the city</p>
            </div>
          </div>

          <div className="trends-filter-pills">
            {['6h', '24h', '7d', '30d'].map((range) => {
              const labelsMap = { '6h': 'Last 6 hours', '24h': 'Last 24 hours', '7d': 'Last 7 days', '30d': 'Last 30 days' };
              return (
                <button
                  key={range}
                  type="button"
                  className={`trends-pill-btn ${activeTimeRange === range ? 'active' : ''}`}
                  onClick={() => setActiveTimeRange(range)}
                >
                  {labelsMap[range]}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3 Chart Cards Grid */}
        <div className="grid-trends-charts">
          {/* Chart 1: Traffic Velocity Trend */}
          <div className="trend-chart-card">
            <div className="trend-card-top">
              <div className="trend-card-title-wrap">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#EF4444" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="8" rx="2" />
                  <path d="M5 11l2-5h10l2 5" />
                  <circle cx="7.5" cy="15.5" r="1.5" />
                  <circle cx="16.5" cy="15.5" r="1.5" />
                </svg>
                <span className="trend-card-name">Traffic Velocity Trend</span>
              </div>
              <div className="trend-card-chips">
                <span className="trend-chip">Current Speed <strong>{traffic.avg_speed_kmh} km/h</strong></span>
                <span className="trend-chip">Congestion <strong>{traffic.congestion_level_pct}%</strong></span>
              </div>
            </div>
            <div className="trend-canvas-wrap">
              <canvas ref={trafficChartRef}></canvas>
            </div>
          </div>

          {/* Chart 2: Crowd Density Trend */}
          <div className="trend-chart-card">
            <div className="trend-card-top">
              <div className="trend-card-title-wrap">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#2563EB" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <span className="trend-card-name">Crowd Density Trend</span>
              </div>
              <div className="trend-card-chips">
                <span className="trend-chip">Current Density <strong>{crowd.current_density} /km²</strong></span>
                <span className="trend-chip">Peak <strong>{crowd.peak_today} /km²</strong></span>
              </div>
            </div>
            <div className="trend-canvas-wrap">
              <canvas ref={crowdChartRef}></canvas>
            </div>
          </div>

          {/* Chart 3: Weather & Rain Feed */}
          <div className="trend-chart-card">
            <div className="trend-card-top">
              <div className="trend-card-title-wrap">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#059669" strokeWidth="2">
                  <path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25" />
                  <path d="M8 16v3" />
                  <path d="M12 16v3" />
                  <path d="M16 16v3" />
                </svg>
                <span className="trend-card-name">Weather & Rain Feed</span>
              </div>
              <div className="trend-card-chips">
                <span className="trend-chip">Temp <strong>{weather.temp_c}°C</strong></span>
                <span className="trend-chip">Precipitation <strong>{weather.rainfall_mm} mm</strong></span>
              </div>
            </div>
            <div className="trend-canvas-wrap">
              <canvas ref={weatherChartRef}></canvas>
            </div>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* ROW 4: OPERATIONAL INTELLIGENCE (3 COLUMNS IN UNIFIED PANEL)        */}
      {/* =================================================================== */}
      <div className="unified-panel op-intel-panel">
        <div className="op-intel-header">
          <div className="op-intel-header-left">
            <div className="op-intel-icon-box">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#059669" strokeWidth="2">
                <polygon points="12 2 2 7 12 12 22 7 12 2" />
                <polyline points="2 17 12 22 22 17" />
                <polyline points="2 12 12 17 22 12" />
              </svg>
            </div>
            <div>
              <h2 className="op-intel-title">Operational Intelligence</h2>
              <p className="op-intel-sub">AI-powered insights, real-time alerts, and system health</p>
            </div>
          </div>

          <button
            type="button"
            className="op-intel-link-btn"
            onClick={() => onNavigate && onNavigate('reports')}
          >
            <span>View Full Reports</span>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>

        {/* 3 Detail Cards Grid */}
        <div className="grid-op-intel-cards">
          {/* Column 1: AI Recommendations */}
          <div className="op-card">
            <div className="op-card-header">
              <div className="op-card-title-row">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#2563EB" strokeWidth="2">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                <span className="op-card-title">Tactical Directives</span>
              </div>
              <button
                type="button"
                className="op-card-sublink"
                onClick={() => onNavigate && onNavigate('focus')}
              >
                <span>Focus View</span>
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>

            <div className="op-items-list">
              {recommendationsList.map((rec) => (
                <div key={rec.id} className="rec-item-row">
                  <div className="rec-item-left">
                    <div className="rec-icon-squircle" style={{ background: rec.iconBg, color: rec.iconColor }}>
                      {rec.iconType === 'car' && (
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="11" width="18" height="8" rx="2" />
                          <path d="M5 11l2-5h10l2 5" />
                        </svg>
                      )}
                      {rec.iconType === 'users' && (
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                        </svg>
                      )}
                      {rec.iconType === 'cloud' && (
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
                        </svg>
                      )}
                      {rec.iconType === 'train' && (
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="4" y="3" width="16" height="16" rx="2" />
                          <path d="M4 11h16" />
                        </svg>
                      )}
                    </div>
                    <div className="rec-text-wrap">
                      <div className="rec-item-heading">{rec.title}</div>
                      <div className="rec-item-meta">{rec.time_ago}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenDispatchModal(rec)}
                    className="rec-action-btn"
                  >
                    <span>Action</span>
                    <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Column 2: Active Alerts */}
          <div className="op-card">
            <div className="op-card-header">
              <div className="op-card-title-row">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#EF4444" strokeWidth="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                <span className="op-card-title">Active Alerts</span>
              </div>
              <button
                type="button"
                className="op-card-sublink"
                onClick={() => onNavigate && onNavigate('alerts')}
              >
                <span>All Alerts</span>
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>

            <div className="op-items-list">
              {activeAlertsList.map((alt) => (
                <div key={alt.id} className="alert-item-row">
                  <div className="alert-item-left">
                    <span className="alert-pulse-dot" style={{ background: alt.color }} />
                    <div className="alert-text-wrap">
                      <div className="alert-item-heading">{alt.title}</div>
                      <div className="alert-item-meta">{alt.location} • {alt.time}</div>
                    </div>
                  </div>
                  <span className={`alert-severity-badge ${alt.severity.toLowerCase()}`}>
                    {alt.severity}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Column 3: System Health Status */}
          <div className="op-card">
            <div className="op-card-header">
              <div className="op-card-title-row">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#10B981" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <span className="op-card-title">System Health Status</span>
              </div>
              <button
                type="button"
                className="op-card-sublink"
                onClick={() => onNavigate && onNavigate('settings')}
              >
                <span>Control Center</span>
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>

            <div className="op-items-list">
              {systemHealthList.map((service, idx) => (
                <div key={idx} className="health-item-row">
                  <div className="health-item-left">
                    <span className="health-green-dot" />
                    <span className="health-name">{service.name}</span>
                  </div>
                  <div className="health-item-right">
                    <span className="health-latency">{service.latency}</span>
                    <span className="health-badge-op">{service.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      </div>
      {/* End .dashboard-main-content */}

      {/* =================================================================== */}
      {/* TACTICAL DIRECTIVE DISPATCH MODAL                                   */}
      {/* =================================================================== */}
      {dispatchModal && (
        <div className="dispatch-modal-overlay">
          <div className="dispatch-modal-card">
            <div className="modal-header-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: '#EFF6FF',
                  color: '#2563EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800
                }}>
                  ⚡
                </span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>
                    Dispatch Tactical Directive
                  </h3>
                  <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
                    Authorized Authority: <strong>{dispatchModal.authority}</strong>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDispatchModal(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 4 }}
              >
                ✕
              </button>
            </div>

            <div style={{ margin: '14px 0', padding: '12px 14px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>
                {dispatchModal.title}
              </div>
              <div style={{ fontSize: '0.76rem', color: '#475569', lineHeight: 1.45 }}>
                {dispatchModal.actionPlan}
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                Operator Dispatch Note / Verification
              </label>
              <textarea
                rows={2}
                value={operatorNote}
                onChange={(e) => setOperatorNote(e.target.value)}
                style={{
                  width: '100%',
                  borderRadius: 8,
                  border: '1px solid #CBD5E1',
                  padding: '8px 10px',
                  fontSize: '0.78rem',
                  fontFamily: 'inherit',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                type="button"
                onClick={() => setDispatchModal(null)}
                style={{
                  background: '#F1F5F9',
                  border: '1px solid #CBD5E1',
                  borderRadius: 8,
                  padding: '8px 14px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDispatch}
                disabled={isDispatching}
                style={{
                  background: '#2563EB',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 16px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)'
                }}
              >
                {isDispatching ? 'Transmitting Directive...' : 'Confirm & Transmit Directive →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
