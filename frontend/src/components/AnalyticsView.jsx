import React, { useState, useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import { API_BASE } from '../config/api';

Chart.register(...registerables);

export default function AnalyticsView() {
  const [timeRange, setTimeRange] = useState('7d');
  const [selectedZone, setSelectedZone] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  // Analytics data state
  const [overviewData, setOverviewData] = useState({
    mobility_index: 74.2,
    mobility_index_delta: '+4.8%',
    avg_corridor_speed_kmh: 27.8,
    avg_corridor_speed_delta: '-3.2 km/h',
    hours_saved_monthly: 184,
    cross_domain_correlation_pct: 82.4,
    historical_trends: {
      timestamps: ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'],
      avg_speed_kmh: [24.2, 19.5, 32.1, 27.8, 21.0, 16.8, 25.4],
      congestion_pct: [68, 84, 45, 62, 79, 91, 55],
      crowd_density: [310, 420, 280, 520, 480, 680, 410],
      rainfall_mm: [0.0, 0.4, 0.2, 2.4, 4.8, 1.2, 0.0]
    },
    hourly_distribution: [
      { hour: '00:00 - 04:00', congestion: 12, label: 'Night Low' },
      { hour: '04:00 - 08:00', congestion: 38, label: 'Early Rise' },
      { hour: '08:00 - 12:00', congestion: 82, label: 'Morning Peak' },
      { hour: '12:00 - 16:00', congestion: 56, label: 'Afternoon Mid' },
      { hour: '16:00 - 20:00', congestion: 89, label: 'Evening Peak' },
      { hour: '20:00 - 24:00', congestion: 42, label: 'Night Descent' }
    ]
  });

  const [corridors, setCorridors] = useState([]);
  const [correlations, setCorrelations] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [civicAnalytics, setCivicAnalytics] = useState(null);
  const [activeDomainTab, setActiveDomainTab] = useState('mobility'); // 'mobility' | 'civic_hotspots'

  // Chart refs
  const trendChartRef = useRef(null);
  const hourlyChartRef = useRef(null);
  const trendChartInst = useRef(null);
  const hourlyChartInst = useRef(null);

  // Fetch all analytics data from backend
  useEffect(() => {
    let isMounted = true;
    const fetchAnalytics = async () => {
      setIsLoading(true);
      try {
        const [overviewRes, corridorsRes, correlationsRes, anomaliesRes, civicRes] = await Promise.all([
          fetch(`${API_BASE}/analytics/overview?time_range=${timeRange}`),
          fetch(`${API_BASE}/analytics/corridors`),
          fetch(`${API_BASE}/analytics/correlations`),
          fetch(`${API_BASE}/analytics/anomalies`),
          fetch(`${API_BASE}/grievances/authority/analytics?time_range=${timeRange}`, {
            headers: {
              'X-Authority-Role': 'officer',
              'X-Authority-Actor': 'Municipal Duty Officer (Control 01)'
            }
          })
        ]);

        if (overviewRes.ok) {
          const data = await overviewRes.json();
          if (isMounted) setOverviewData(data);
        }
        if (corridorsRes.ok) {
          const data = await corridorsRes.json();
          if (isMounted) setCorridors(data.corridors || []);
        }
        if (correlationsRes.ok) {
          const data = await correlationsRes.json();
          if (isMounted) setCorrelations(data.factors || []);
        }
        if (anomaliesRes.ok) {
          const data = await anomaliesRes.json();
          if (isMounted) setAnomalies(data.anomalies || []);
        }
        if (civicRes && civicRes.ok) {
          const cData = await civicRes.json();
          if (isMounted) setCivicAnalytics(cData);
        }
      } catch (err) {
        console.warn('Analytics backend offline or cached:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchAnalytics();
    return () => { isMounted = false; };
  }, [timeRange]);

  // Render Charts
  useEffect(() => {
    // 1. Velocity vs Congestion Trend Chart
    if (trendChartRef.current) {
      if (trendChartInst.current) trendChartInst.current.destroy();
      const ctx = trendChartRef.current.getContext('2d');
      const ht = overviewData.historical_trends;

      trendChartInst.current = new Chart(ctx, {
        type: 'line',
        data: {
          labels: ht.timestamps,
          datasets: [
            {
              label: 'Avg Speed (km/h)',
              data: ht.avg_speed_kmh,
              borderColor: '#10B981',
              backgroundColor: 'rgba(16, 185, 129, 0.08)',
              fill: true,
              tension: 0.35,
              borderWidth: 2.2,
              yAxisID: 'y'
            },
            {
              label: 'Congestion Level (%)',
              data: ht.congestion_pct,
              borderColor: '#EF4444',
              backgroundColor: 'rgba(239, 68, 68, 0.06)',
              fill: true,
              tension: 0.35,
              borderWidth: 2.2,
              borderDash: [4, 4],
              yAxisID: 'y1'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              labels: { font: { size: 11, family: 'Inter' }, boxWidth: 12 }
            },
            tooltip: {
              backgroundColor: 'rgba(15, 23, 42, 0.92)',
              titleFont: { size: 12, family: 'Inter', weight: '600' },
              bodyFont: { size: 11, family: 'Inter' },
              padding: 10,
              cornerRadius: 6
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { font: { size: 10, family: 'Inter' }, color: '#64748B' }
            },
            y: {
              type: 'linear',
              position: 'left',
              title: { display: true, text: 'Speed (km/h)', font: { size: 10, family: 'Inter' }, color: '#64748B' },
              grid: { color: 'rgba(226, 232, 240, 0.7)' },
              ticks: { font: { size: 10, family: 'Inter' }, color: '#64748B' }
            },
            y1: {
              type: 'linear',
              position: 'right',
              title: { display: true, text: 'Congestion (%)', font: { size: 10, family: 'Inter' }, color: '#64748B' },
              grid: { drawOnChartArea: false },
              ticks: { font: { size: 10, family: 'Inter' }, color: '#64748B' }
            }
          }
        }
      });
    }

    // 2. Hourly Distribution Bar Chart
    if (hourlyChartRef.current) {
      if (hourlyChartInst.current) hourlyChartInst.current.destroy();
      const ctx = hourlyChartRef.current.getContext('2d');
      const dist = overviewData.hourly_distribution;

      hourlyChartInst.current = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: dist.map(d => d.hour),
          datasets: [{
            label: 'Avg Congestion (%)',
            data: dist.map(d => d.congestion),
            backgroundColor: dist.map(d => d.congestion > 75 ? '#EF4444' : (d.congestion > 50 ? '#F59E0B' : '#3B82F6')),
            borderRadius: 6,
            barPercentage: 0.65
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: 'rgba(15, 23, 42, 0.92)',
              titleFont: { size: 11, family: 'Inter', weight: '600' },
              bodyFont: { size: 11, family: 'Inter' },
              padding: 8,
              cornerRadius: 6,
              callbacks: {
                afterLabel: (ctx) => `Profile: ${dist[ctx.dataIndex]?.label || ''}`
              }
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { font: { size: 9, family: 'Inter' }, color: '#64748B' }
            },
            y: {
              max: 100,
              grid: { color: 'rgba(226, 232, 240, 0.7)' },
              ticks: { font: { size: 10, family: 'Inter' }, color: '#64748B', stepSize: 25 }
            }
          }
        }
      });
    }

    return () => {
      if (trendChartInst.current) trendChartInst.current.destroy();
      if (hourlyChartInst.current) hourlyChartInst.current.destroy();
    };
  }, [overviewData]);

  // Filter corridors by zone if specified
  const filteredCorridors = selectedZone === 'all'
    ? corridors
    : corridors.filter(c => c.zone.toLowerCase() === selectedZone.toLowerCase());

  // Real CSV Export Function
  const handleExportCSV = () => {
    const headers = ['Corridor', 'Zone', 'Current Speed (km/h)', 'Baseline Speed (km/h)', 'Congestion Index (%)', 'Delay (mins)', 'Status', 'Primary Driver'];
    const rows = filteredCorridors.map(c => [
      `"${c.name}"`,
      `"${c.zone}"`,
      c.avg_speed,
      c.baseline_speed,
      c.congestion_index,
      c.delay_minutes,
      `"${c.status}"`,
      `"${c.primary_factor}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `UrbanPulse_Corridor_Analytics_${timeRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${filteredCorridors.length} corridors to CSV.`);
  };

  return (
    <div className="view-container">
      {/* Toast Notification */}
      {toastMsg && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: '#0F172A',
          color: '#FFFFFF',
          padding: '10px 18px',
          borderRadius: '10px',
          fontSize: '0.84rem',
          fontWeight: 600,
          boxShadow: '0 10px 25px rgba(0,0,0,0.25)',
          border: '1px solid #334155',
          zIndex: 9999,
          animation: 'fadeIn 0.2s ease'
        }}>
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-title)', margin: 0, letterSpacing: '-0.02em' }}>
            Cross-Domain Urban Analytics
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px', margin: 0 }}>
            Multivariate longitudinal telemetry, spatial bottleneck analysis, and anomaly attribution
          </p>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', background: 'rgba(226, 232, 240, 0.7)', backdropFilter: 'blur(8px)', padding: '3px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.7)' }}>
            {['24h', '7d', '30d', '90d'].map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                style={{
                  border: 'none',
                  background: timeRange === range ? '#FFFFFF' : 'transparent',
                  color: timeRange === range ? '#0F172A' : '#64748B',
                  fontWeight: timeRange === range ? 700 : 500,
                  fontSize: '0.8rem',
                  padding: '5px 14px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  boxShadow: timeRange === range ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.18s ease'
                }}
              >
                {range.toUpperCase()}
              </button>
            ))}
          </div>

          <select
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            style={{
              padding: '7px 14px',
              fontSize: '0.85rem',
              borderRadius: '10px',
              border: '1px solid rgba(226, 232, 240, 0.8)',
              background: 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(8px)',
              color: 'var(--text-body)',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            <option value="all">All City Zones</option>
            <option value="east">East Corridor (ORR / Whitefield)</option>
            <option value="south">South Corridor (Silk Board / E-City)</option>
            <option value="central">Central District (MG Road)</option>
            <option value="north">North Sector (Hebbal / Airport)</option>
          </select>
        </div>
      </div>

      {/* Domain Navigation Switcher */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #E2E8F0', paddingBottom: '10px' }}>
        <button
          onClick={() => setActiveDomainTab('mobility')}
          style={{
            background: activeDomainTab === 'mobility' ? '#2563EB' : '#FFFFFF',
            color: activeDomainTab === 'mobility' ? '#FFFFFF' : '#334155',
            border: activeDomainTab === 'mobility' ? '1px solid #2563EB' : '1px solid #CBD5E1',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '0.82rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: activeDomainTab === 'mobility' ? '0 2px 8px rgba(37, 99, 235, 0.25)' : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="8" rx="2"/><path d="M5 11l2-5h10l2 5"/><circle cx="7.5" cy="15.5" r="1.5"/><circle cx="16.5" cy="15.5" r="1.5"/></svg>
          <span>Corridor Mobility & Telemetry</span>
        </button>

        <button
          onClick={() => setActiveDomainTab('civic_hotspots')}
          style={{
            background: activeDomainTab === 'civic_hotspots' ? '#2563EB' : '#FFFFFF',
            color: activeDomainTab === 'civic_hotspots' ? '#FFFFFF' : '#334155',
            border: activeDomainTab === 'civic_hotspots' ? '1px solid #2563EB' : '1px solid #CBD5E1',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '0.82rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: activeDomainTab === 'civic_hotspots' ? '0 2px 8px rgba(37, 99, 235, 0.25)' : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="9" y1="10" x2="15" y2="10"/><line x1="12" y1="7" x2="12" y2="13"/></svg>
          <span>Civic Infrastructure Hotspots & Recurrence</span>
          <span style={{
            fontSize: '0.68rem',
            padding: '2px 7px',
            borderRadius: '10px',
            background: activeDomainTab === 'civic_hotspots' ? '#D97706' : '#E2E8F0',
            color: activeDomainTab === 'civic_hotspots' ? '#FFFFFF' : '#334155',
            fontWeight: 800
          }}>
            {civicAnalytics?.hotspots?.length || 6} Clusters
          </span>
        </button>
      </div>

      {activeDomainTab === 'mobility' ? (
        <>
          {/* 4 Glassmorphic KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="kpi-card">
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            City Mobility Index
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-title)', marginTop: '8px' }}>
            {overviewData.mobility_index} <span style={{ fontSize: '0.9rem', color: '#64748B', fontWeight: 500 }}>/ 100</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '0.78rem', color: '#10B981', fontWeight: 700 }}>
            <span>+{overviewData.mobility_index_delta}</span>
            <span style={{ color: '#64748B', fontWeight: 400 }}>vs previous cycle</span>
          </div>
        </div>

        <div className="kpi-card">
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Average Corridor Velocity
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-title)', marginTop: '8px' }}>
            {overviewData.avg_corridor_speed_kmh} <span style={{ fontSize: '0.9rem', color: '#64748B', fontWeight: 500 }}>km/h</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '0.78rem', color: '#EF4444', fontWeight: 700 }}>
            <span>-{overviewData.avg_corridor_speed_delta}</span>
            <span style={{ color: '#64748B', fontWeight: 400 }}>below free-flow target</span>
          </div>
        </div>

        <div className="kpi-card">
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Commuter Hours Saved
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#059669', marginTop: '8px' }}>
            {overviewData.hours_saved_monthly} hrs
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '0.78rem', color: '#059669', fontWeight: 700 }}>
            <span>Adaptive Signal Overrides</span>
          </div>
        </div>

        <div className="kpi-card">
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Cross-Domain Incident Linkage
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#2563EB', marginTop: '8px' }}>
            {overviewData.cross_domain_correlation_pct}%
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '0.78rem', color: '#64748B' }}>
            <span>Rainfall & Crowd surge driven</span>
          </div>
        </div>
      </div>

      {/* Visual Analytics Charts (2 Columns) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <div className="chart-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'var(--text-title)' }}>Velocity vs. Congestion Index Timeline</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Speed degradation under rising corridor demand</p>
            </div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, background: '#EFF6FF', color: '#1D4ED8', padding: '4px 10px', borderRadius: '20px' }}>Dual-Axis Feed</span>
          </div>
          <div style={{ height: '260px' }}>
            <canvas ref={trendChartRef}></canvas>
          </div>
        </div>

        <div className="chart-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'var(--text-title)' }}>Diurnal Congestion Density Curve</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Traffic pressure profiling across 24-hour diurnal blocks</p>
            </div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, background: '#FEF2F2', color: '#DC2626', padding: '4px 10px', borderRadius: '20px' }}>Peak Analysis</span>
          </div>
          <div style={{ height: '260px' }}>
            <canvas ref={hourlyChartRef}></canvas>
          </div>
        </div>
      </div>

      {/* Cross-Domain Correlation Matrix */}
      <div className="detail-card" style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'var(--text-title)', marginBottom: '14px' }}>
          Cross-Domain Feature Impact Correlations (Spearman & Pearson)
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
          {correlations.map((item, idx) => (
            <div key={idx} style={{ padding: '14px', borderRadius: '12px', background: 'rgba(248, 250, 252, 0.75)', border: '1px solid rgba(226, 232, 240, 0.8)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A' }}>{item.pair}</span>
                <span style={{
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  color: item.correlation_coefficient < 0 ? '#EF4444' : '#2563EB',
                  background: item.correlation_coefficient < 0 ? '#FEE2E2' : '#DBEAFE',
                  padding: '2px 8px',
                  borderRadius: '6px'
                }}>
                  {item.correlation_coefficient > 0 ? `+${item.correlation_coefficient}` : item.correlation_coefficient}
                </span>
              </div>
              <div style={{ fontSize: '0.76rem', color: '#64748B', lineHeight: '1.45' }}>
                {item.description}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Corridor Bottleneck Ranking Table */}
      <div className="detail-card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'var(--text-title)' }}>
              Critical Urban Corridor Bottlenecks
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
              Benchmarked speed, congestion index, and primary incident drivers
            </p>
          </div>
          <button
            onClick={handleExportCSV}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              border: '1px solid #CBD5E1',
              background: '#FFFFFF',
              padding: '7px 14px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 700,
              color: '#334155',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              transition: 'all 0.15s ease'
            }}
          >
            <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, stroke: 'currentColor', fill: 'none', strokeWidth: 2 }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <span>Export CSV</span>
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #E2E8F0', textAlign: 'left', color: '#64748B', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ padding: '10px 12px' }}>Corridor</th>
                <th style={{ padding: '10px 12px' }}>Zone</th>
                <th style={{ padding: '10px 12px' }}>Current Speed</th>
                <th style={{ padding: '10px 12px' }}>Baseline Speed</th>
                <th style={{ padding: '10px 12px' }}>Congestion Index</th>
                <th style={{ padding: '10px 12px' }}>Delay</th>
                <th style={{ padding: '10px 12px' }}>Status</th>
                <th style={{ padding: '10px 12px' }}>Primary Driver</th>
              </tr>
            </thead>
            <tbody>
              {filteredCorridors.map((c, i) => (
                <tr key={c.id || i} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s' }}>
                  <td style={{ padding: '12px', fontWeight: 700, color: '#0F172A' }}>{c.name}</td>
                  <td style={{ padding: '12px', color: '#64748B' }}>{c.zone}</td>
                  <td style={{ padding: '12px', fontWeight: 800, color: c.avg_speed < 20 ? '#EF4444' : '#10B981' }}>
                    {c.avg_speed} km/h
                  </td>
                  <td style={{ padding: '12px', color: '#64748B' }}>{c.baseline_speed} km/h</td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ flex: 1, height: '6px', background: '#E2E8F0', borderRadius: '3px', width: '60px' }}>
                        <div style={{
                          height: '100%',
                          width: `${c.congestion_index}%`,
                          background: c.congestion_index > 70 ? '#EF4444' : (c.congestion_index > 40 ? '#F59E0B' : '#10B981'),
                          borderRadius: '3px'
                        }}></div>
                      </div>
                      <span style={{ fontWeight: 700, fontSize: '0.8rem' }}>{c.congestion_index}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px', color: c.delay_minutes > 15 ? '#DC2626' : '#475569', fontWeight: 700 }}>
                    +{c.delay_minutes} min
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      background: c.status === 'Critical' ? '#FEF2F2' : (c.status === 'Moderate' ? '#FFFBEB' : '#ECFDF5'),
                      color: c.status === 'Critical' ? '#DC2626' : (c.status === 'Moderate' ? '#B45309' : '#065F46'),
                      border: `1px solid ${c.status === 'Critical' ? '#FECACA' : (c.status === 'Moderate' ? '#FDE68A' : '#A7F3D0')}`
                    }}>
                      {c.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px', color: '#64748B', fontSize: '0.8rem' }}>{c.primary_factor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Real-Time ML Anomaly Stream */}
      <div className="detail-card">
        <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'var(--text-title)', marginBottom: '14px' }}>
          Real-Time Telemetry Anomaly Diagnostics
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '14px' }}>
          {anomalies.map((anom) => (
            <div
              key={anom.id}
              style={{
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '14px',
                background: 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(8px)',
                borderLeft: `4px solid ${anom.severity === 'Critical' ? '#EF4444' : (anom.severity === 'High' ? '#F97316' : '#F59E0B')}`
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0F172A' }}>{anom.zone} Sector</span>
                <span style={{ fontSize: '0.75rem', color: '#64748B' }}>{anom.timestamp}</span>
              </div>
              <div style={{ fontSize: '0.82rem', color: '#334155', fontWeight: 600, marginBottom: '6px' }}>
                {anom.feature_trigger}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #F1F5F9' }}>
                <span style={{ color: '#DC2626', fontWeight: 700 }}>Impact: {anom.impact_metric}</span>
                <span style={{ color: '#059669', fontWeight: 700 }}>{anom.resolution_status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  ) : (
    <div className="civic-analytics-container">
      {/* Strict Distinction Banner */}
      <div style={{
        background: '#FEF3C7',
        border: '1px solid #FDE68A',
        borderRadius: '12px',
        padding: '14px 18px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px'
      }}>
        <div style={{
          width: 38,
          height: 38,
          borderRadius: '10px',
          background: '#FDE68A',
          color: '#B45309',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <div style={{ fontSize: '0.8rem', color: '#92400E', lineHeight: 1.45 }}>
          <strong style={{ fontSize: '0.85rem' }}>MUNICIPAL CIVIC GRIEVANCE TELEMETRY — UNVERIFIED CITIZEN OBSERVATIONS</strong><br/>
          Citizen grievances are aggregated across geographic coordinates to identify recurrent infrastructure failure patterns. Citizen reports remain unverified until physical inspection and validation by field squads, strictly kept distinct from automated IoT sensor observations.
        </div>
      </div>

      {/* 4 Civic Grievance KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="kpi-card">
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Total Grievances Logged
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-title)', marginTop: '8px' }}>
            {civicAnalytics?.summary?.total_complaints || 14} <span style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 500 }}>Tickets</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '0.78rem', color: '#059669', fontWeight: 700 }}>
            <span>100% Geotagged</span>
            <span style={{ color: '#64748B', fontWeight: 400 }}>coordinate verified</span>
          </div>
        </div>

        <div className="kpi-card">
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Active Hotspots
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#D97706', marginTop: '8px' }}>
            {civicAnalytics?.summary?.active_hotspots || 6} <span style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 500 }}>Corridors</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '0.78rem', color: '#DC2626', fontWeight: 700 }}>
            <span>{civicAnalytics?.summary?.chronic_clusters || 2} Chronic Clusters</span>
            <span style={{ color: '#64748B', fontWeight: 400 }}>pothole/drain</span>
          </div>
        </div>

        <div className="kpi-card">
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            SLA Compliance Rate
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#059669', marginTop: '8px' }}>
            {civicAnalytics?.summary?.overall_sla_compliance_pct || 96.2}%
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '0.78rem', color: '#059669', fontWeight: 700 }}>
            <span>+2.4% vs benchmark</span>
            <span style={{ color: '#64748B', fontWeight: 400 }}>statutory SLA</span>
          </div>
        </div>

        <div className="kpi-card">
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Avg Resolution Turnaround
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-title)', marginTop: '8px' }}>
            {civicAnalytics?.summary?.avg_resolution_hours || 14.6} <span style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 500 }}>Hours</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '0.78rem', color: '#2563EB', fontWeight: 700 }}>
            <span>Avg response: 1.4h</span>
            <span style={{ color: '#64748B', fontWeight: 400 }}>rapid crew dispatch</span>
          </div>
        </div>
      </div>

      {/* Spatial Recurrence Hotspots Table */}
      <div className="detail-card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'var(--text-title)' }}>
              Chronic Infrastructure Failure Hotspots
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
              Spatial clustering of recurring citizen complaints across BBMP, BWSSB, and BESCOM jurisdictions
            </p>
          </div>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#D97706', background: '#FEF3C7', padding: '4px 10px', borderRadius: '8px' }}>
            Predictive Maintenance Required
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #E2E8F0', textAlign: 'left', color: '#64748B', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ padding: '10px 12px' }}>Corridor Hotspot</th>
                <th style={{ padding: '10px 12px' }}>Zone</th>
                <th style={{ padding: '10px 12px' }}>Primary Category</th>
                <th style={{ padding: '10px 12px' }}>Recurrence</th>
                <th style={{ padding: '10px 12px' }}>Risk Score</th>
                <th style={{ padding: '10px 12px' }}>Linked Reports</th>
                <th style={{ padding: '10px 12px' }}>Department</th>
                <th style={{ padding: '10px 12px' }}>Preventive Action</th>
              </tr>
            </thead>
            <tbody>
              {(civicAnalytics?.hotspots || []).map((hs, i) => (
                <tr key={hs.id || i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '12px', fontWeight: 800, color: '#0F172A' }}>
                    <div>{hs.name}</div>
                    <span style={{ fontSize: '0.7rem', color: '#64748B', fontFamily: 'monospace' }}>{hs.latitude?.toFixed(4)}, {hs.longitude?.toFixed(4)}</span>
                  </td>
                  <td style={{ padding: '12px', color: '#64748B', fontSize: '0.8rem' }}>{hs.zone}</td>
                  <td style={{ padding: '12px', fontWeight: 700, color: '#334155' }}>{hs.primary_category}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      background: hs.recurrence_severity?.includes('Chronic') ? '#FEF2F2' : (hs.recurrence_severity?.includes('Critical') ? '#FFFBEB' : '#EFF6FF'),
                      color: hs.recurrence_severity?.includes('Chronic') ? '#DC2626' : (hs.recurrence_severity?.includes('Critical') ? '#D97706' : '#2563EB'),
                      border: `1px solid ${hs.recurrence_severity?.includes('Chronic') ? '#FECACA' : (hs.recurrence_severity?.includes('Critical') ? '#FDE68A' : '#BFDBFE')}`
                    }}>
                      {hs.recurrence_severity}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ flex: 1, height: '6px', background: '#E2E8F0', borderRadius: '3px', width: '55px' }}>
                        <div style={{
                          height: '100%',
                          width: `${hs.risk_score}%`,
                          background: hs.risk_score > 85 ? '#EF4444' : (hs.risk_score > 70 ? '#F59E0B' : '#10B981'),
                          borderRadius: '3px'
                        }}></div>
                      </div>
                      <span style={{ fontWeight: 800, fontSize: '0.8rem' }}>{hs.risk_score}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px', fontWeight: 700, color: '#0F172A', textAlign: 'center' }}>
                    <span style={{ background: '#F1F5F9', padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem' }}>
                      {hs.complaint_count} reports
                    </span>
                  </td>
                  <td style={{ padding: '12px', color: '#475569', fontSize: '0.75rem' }}>
                    {hs.responsible_department}
                  </td>
                  <td style={{ padding: '12px', color: '#334155', fontSize: '0.76rem', maxWidth: '280px', lineHeight: 1.35 }}>
                    {hs.recommended_preventive_action}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Category Breakdown & Department Performance */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="detail-card">
          <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'var(--text-title)', marginBottom: '12px' }}>
            Civic Category Recurrence & SLA Performance
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(civicAnalytics?.category_analytics || []).map((cat, i) => (
              <div key={i} style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '10px', background: '#FFFFFF' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.84rem', color: '#0F172A' }}>{cat.category}</span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#059669', background: '#ECFDF5', padding: '2px 6px', borderRadius: '4px' }}>
                    {cat.sla_compliance_pct}% SLA
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: '#64748B', marginBottom: '6px' }}>
                  <span>Reports: <strong>{cat.total_count}</strong> ({cat.percentage}%)</span>
                  <span>Avg: <strong>{cat.actual_avg_resolution_hours}h</strong> / Target {cat.target_sla_hours}h</span>
                </div>
                <div style={{ height: '4px', background: '#F1F5F9', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, (cat.total_count / 15) * 100)}%`, background: '#2563EB', borderRadius: '2px' }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="detail-card">
          <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'var(--text-title)', marginBottom: '12px' }}>
            Department Operational Readiness
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(civicAnalytics?.department_performance || []).map((dept, i) => (
              <div key={i} style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '10px', background: '#FFFFFF' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.84rem', color: '#0F172A' }}>{dept.department_name}</span>
                  <span style={{ fontSize: '0.72rem', color: '#64748B' }}>Target SLA: {dept.sla_target_hours}h</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748B', marginBottom: '6px' }}>
                  In-Charge: <strong>{dept.head_officer}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: '#334155' }}>
                  <span>Assigned: <strong>{dept.total_assigned}</strong></span>
                  <span>Resolved: <strong style={{ color: '#059669' }}>{dept.resolved_count}</strong></span>
                  <span>Squads: <strong style={{ color: '#2563EB' }}>{dept.active_squads_deployed} Active</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Predictive Maintenance Directives Deck */}
      <div className="detail-card">
        <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'var(--text-title)', marginBottom: '14px' }}>
          Predictive Maintenance Engineering Advisories
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '14px' }}>
          <div style={{ border: '1px solid #E2E8F0', borderRadius: '12px', padding: '14px', background: 'rgba(255,255,255,0.8)', borderLeft: '4px solid #EF4444' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0F172A' }}>Marathahalli ORR Corridor</span>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#DC2626' }}>High Priority</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#334155', lineHeight: 1.45 }}>
              Sub-base asphalt fatigue detected: 9 pothole complaints within 450m radius. Cold-mix patch degradation rate 3.4x baseline due to bus and heavy vehicle merging stress.
            </div>
            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #F1F5F9', fontSize: '0.72rem', color: '#64748B' }}>
              Directive: Schedule structural cold-milling and asphalt relay during night window (23:00 - 05:00).
            </div>
          </div>

          <div style={{ border: '1px solid #E2E8F0', borderRadius: '12px', padding: '14px', background: 'rgba(255,255,255,0.8)', borderLeft: '4px solid #F59E0B' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0F172A' }}>Ejipura Inner Ring Road</span>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#D97706' }}>Storm Precaution</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#334155', lineHeight: 1.45 }}>
              Underpass silt grates repeatedly clogged by street debris. Doppler rain telemetry projects 28mm precipitation within 36 hours.
            </div>
            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #F1F5F9', fontSize: '0.72rem', color: '#64748B' }}>
              Directive: Pre-deploy BBMP Suction Dewatering Unit SQ-DRN-1 before cloudburst onset.
            </div>
          </div>

          <div style={{ border: '1px solid #E2E8F0', borderRadius: '12px', padding: '14px', background: 'rgba(255,255,255,0.8)', borderLeft: '4px solid #2563EB' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0F172A' }}>Indiranagar 100ft Commercial Hub</span>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#2563EB' }}>SWM Logistics</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#334155', lineHeight: 1.45 }}>
              Food & retail commercial refuse exceeds local bin capacity by 160% on Friday/Saturday nights.
            </div>
            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #F1F5F9', fontSize: '0.72rem', color: '#64748B' }}>
              Directive: Position secondary mobile compactor at 12th Main junction from 21:00 onwards.
            </div>
          </div>
        </div>
      </div>
    </div>
  )}
    </div>
  );
}
