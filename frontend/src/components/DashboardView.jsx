import React, { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

export default function DashboardView({ telemetryData }) {
  const trafficChartRef = useRef(null);
  const crowdChartRef = useRef(null);
  const weatherChartRef = useRef(null);

  const trafficInst = useRef(null);
  const crowdInst = useRef(null);
  const weatherInst = useRef(null);

  useEffect(() => {
    // Traffic Chart Initialization
    if (trafficChartRef.current) {
      if (trafficInst.current) trafficInst.current.destroy();
      const ctx = trafficChartRef.current.getContext('2d');
      const history = telemetryData?.traffic?.history || [
        { time: '14:00', speed: 28 }, { time: '14:05', speed: 24 },
        { time: '14:10', speed: 22 }, { time: '14:15', speed: 19 },
        { time: '14:20', speed: 18 }, { time: '14:25', speed: 18 }
      ];

      trafficInst.current = new Chart(ctx, {
        type: 'line',
        data: {
          labels: history.map(h => h.time),
          datasets: [{
            label: 'Avg Speed (km/h)',
            data: history.map(h => h.speed),
            borderColor: '#EF4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            fill: true,
            tension: 0.3,
            borderWidth: 2,
            pointRadius: 3
          }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
      });
    }

    // Crowd Chart Initialization
    if (crowdChartRef.current) {
      if (crowdInst.current) crowdInst.current.destroy();
      const ctx = crowdChartRef.current.getContext('2d');
      const history = telemetryData?.crowd?.history || [
        { time: '14:00', density: 380 }, { time: '14:05', density: 410 },
        { time: '14:10', density: 450 }, { time: '14:15', density: 490 },
        { time: '14:20', density: 510 }, { time: '14:25', density: 520 }
      ];

      crowdInst.current = new Chart(ctx, {
        type: 'line',
        data: {
          labels: history.map(h => h.time),
          datasets: [{
            label: 'Crowd Density (people/km²)',
            data: history.map(h => h.density),
            borderColor: '#2563EB',
            backgroundColor: 'rgba(37, 99, 235, 0.1)',
            fill: true,
            tension: 0.3,
            borderWidth: 2,
            pointRadius: 3
          }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
      });
    }

    // Weather Chart Initialization
    if (weatherChartRef.current) {
      if (weatherInst.current) weatherInst.current.destroy();
      const ctx = weatherChartRef.current.getContext('2d');

      weatherInst.current = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['10:00', '11:00', '12:00', '13:00', '14:00'],
          datasets: [{
            label: 'Rainfall (mm)',
            data: [0.0, 0.2, 0.8, 1.5, 2.4],
            backgroundColor: '#0284C7',
            borderRadius: 4
          }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
      });
    }

    return () => {
      if (trafficInst.current) trafficInst.current.destroy();
      if (crowdInst.current) crowdInst.current.destroy();
      if (weatherInst.current) weatherInst.current.destroy();
    };
  }, []);

  // Update telemetry data dynamically on chart instances
  useEffect(() => {
    if (telemetryData?.traffic?.history && trafficInst.current) {
      trafficInst.current.data.labels = telemetryData.traffic.history.map(h => h.time);
      trafficInst.current.data.datasets[0].data = telemetryData.traffic.history.map(h => h.speed);
      trafficInst.current.update('none');
    }
    if (telemetryData?.crowd?.history && crowdInst.current) {
      crowdInst.current.data.labels = telemetryData.crowd.history.map(h => h.time);
      crowdInst.current.data.datasets[0].data = telemetryData.crowd.history.map(h => h.density);
      crowdInst.current.update('none');
    }
  }, [telemetryData]);

  const traffic = telemetryData?.traffic || { condition: 'Heavy Congestion', avg_speed_kmh: 18, congestion_level_pct: 62 };
  const crowd = telemetryData?.crowd || { density_level: 'High Density', current_density: 520, peak_today: 610 };
  const weather = telemetryData?.weather || { condition: 'Light Rain', temp_c: 24, rainfall_mm: 2.4 };

  return (
    <div className="dashboard-view">
      {/* Dashboard Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Command Center Overview</h1>
          <p className="page-subtitle">Real-Time City Infrastructure & Telemetry Feed</p>
        </div>
        <div className="hdr-right-controls">
          <div className="live-indicator-pill">
            <span className="dot-live"></span>
            <span>LIVE STREAM</span>
          </div>
        </div>
      </div>

      {/* 4 KPI Cards Grid */}
      <div className="grid-kpis">
        <div className="kpi-card">
          <div className="kpi-head">
            <span className="kpi-title">Traffic Velocity</span>
            <div className="kpi-icon-box traffic">
              <svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="8" rx="2"/><path d="M5 11l2-5h10l2 5"/><circle cx="7.5" cy="15.5" r="1.5"/><circle cx="16.5" cy="15.5" r="1.5"/></svg>
            </div>
          </div>
          <div className="kpi-val">{traffic.avg_speed_kmh} km/h</div>
          <div className="kpi-foot">
            <span className="kpi-badge critical">{traffic.condition}</span>
            <span style={{ color: 'var(--text-muted)' }}>{traffic.congestion_level_pct}% Congestion</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-head">
            <span className="kpi-title">Crowd Footfall</span>
            <div className="kpi-icon-box crowd">
              <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
          </div>
          <div className="kpi-val">{crowd.current_density} /km²</div>
          <div className="kpi-foot">
            <span className="kpi-badge moderate">{crowd.density_level}</span>
            <span style={{ color: 'var(--text-muted)' }}>Peak: {crowd.peak_today} /km²</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-head">
            <span className="kpi-title">Weather Conditions</span>
            <div className="kpi-icon-box weather">
              <svg viewBox="0 0 24 24"><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/><path d="M8 16v3"/><path d="M12 16v3"/><path d="M16 16v3"/></svg>
            </div>
          </div>
          <div className="kpi-val">{weather.temp_c}°C</div>
          <div className="kpi-foot">
            <span className="kpi-badge normal">{weather.condition}</span>
            <span style={{ color: 'var(--text-muted)' }}>{weather.rainfall_mm} mm Precip</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-head">
            <span className="kpi-title">Metro Operations</span>
            <div className="kpi-icon-box metro">
              <svg viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="16" rx="2"/><path d="M4 11h16M12 3v8M8 19l-2 3M16 19l2 3"/></svg>
            </div>
          </div>
          <div className="kpi-val">98.4%</div>
          <div className="kpi-foot">
            <span className="kpi-badge normal">Optimal Frequency</span>
            <span style={{ color: 'var(--text-muted)' }}>Purple & Green Lines</span>
          </div>
        </div>
      </div>

      {/* 3 Analytics Charts Grid */}
      <div className="grid-charts">
        <div className="chart-card">
          <div className="chart-head">
            <div className="chart-title-group">
              <svg viewBox="0 0 24 24" style={{ color: '#EF4444' }}><rect x="3" y="11" width="18" height="8" rx="2"/><path d="M5 11l2-5h10l2 5"/><circle cx="7.5" cy="15.5" r="1.5"/><circle cx="16.5" cy="15.5" r="1.5"/></svg>
              <span>Traffic Speed Trend</span>
            </div>
          </div>
          <div className="chart-stats-row">
            <div className="chart-stat-item"><span>Current Speed</span><strong>{traffic.avg_speed_kmh} km/h</strong></div>
            <div className="chart-stat-item"><span>Congestion</span><strong>{traffic.congestion_level_pct}%</strong></div>
          </div>
          <div className="chart-container">
            <canvas ref={trafficChartRef}></canvas>
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-head">
            <div className="chart-title-group">
              <svg viewBox="0 0 24 24" style={{ color: '#2563EB' }}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              <span>Crowd Density Trend</span>
            </div>
          </div>
          <div className="chart-stats-row">
            <div className="chart-stat-item"><span>Current Density</span><strong>{crowd.current_density} /km²</strong></div>
            <div className="chart-stat-item"><span>Peak</span><strong>{crowd.peak_today} /km²</strong></div>
          </div>
          <div className="chart-container">
            <canvas ref={crowdChartRef}></canvas>
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-head">
            <div className="chart-title-group">
              <svg viewBox="0 0 24 24" style={{ color: '#059669' }}><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/><path d="M8 16v3"/><path d="M12 16v3"/><path d="M16 16v3"/></svg>
              <span>Weather & Rain Feed</span>
            </div>
          </div>
          <div className="chart-stats-row">
            <div className="chart-stat-item"><span>Temp</span><strong>{weather.temp_c}°C</strong></div>
            <div className="chart-stat-item"><span>Precipitation</span><strong>{weather.rainfall_mm} mm</strong></div>
          </div>
          <div className="chart-container">
            <canvas ref={weatherChartRef}></canvas>
          </div>
        </div>
      </div>

      {/* 3 Bottom Details Grid */}
      <div className="grid-details">
        <div className="detail-card">
          <div className="detail-card-header">
            <div className="detail-title-group">
              <svg viewBox="0 0 24 24" style={{ color: '#059669' }}><circle cx="12" cy="12" r="3"/></svg>
              <span>AI Recommendations</span>
            </div>
            <a className="view-all-link">View All ›</a>
          </div>
          <div className="detail-list">
            <div className="detail-item"><span>Divert Marathahalli ORR Outflow to Service Lane</span><strong style={{ color: '#059669' }}>High Priority</strong></div>
            <div className="detail-item"><span>Extend Green Signal Duration at Hebbal Flyover</span><strong style={{ color: '#D97706' }}>Medium Priority</strong></div>
            <div className="detail-item"><span>Deploy Auxiliary Bus Shuttles at Whitefield</span><strong style={{ color: '#059669' }}>High Priority</strong></div>
          </div>
        </div>

        <div className="detail-card">
          <div className="detail-card-header">
            <div className="detail-title-group">
              <svg viewBox="0 0 24 24" style={{ color: '#EF4444' }}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/></svg>
              <span>Recent Alerts</span>
            </div>
            <a className="view-all-link">View All ›</a>
          </div>
          <div className="detail-list">
            <div className="detail-item"><span>High Congestion detected on Outer Ring Road</span><strong style={{ color: '#EF4444' }}>Critical</strong></div>
            <div className="detail-item"><span>Pedestrian footfall surge at Silk Board Interchange</span><strong style={{ color: '#D97706' }}>Moderate</strong></div>
            <div className="detail-item"><span>Light precipitation causing road speed reduction</span><strong style={{ color: '#2563EB' }}>Info</strong></div>
          </div>
        </div>

        <div className="detail-card">
          <div className="detail-card-header">
            <div className="detail-title-group">
              <svg viewBox="0 0 24 24" style={{ color: '#059669' }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              <span>System Health Status</span>
            </div>
            <a className="view-all-link">View All ›</a>
          </div>
          <div className="detail-list">
            <div className="detail-item"><span>Traffic Telemetry Feed</span><strong style={{ color: '#059669' }}>Operational</strong></div>
            <div className="detail-item"><span>Crowd Density Sensor Network</span><strong style={{ color: '#059669' }}>Operational</strong></div>
            <div className="detail-item"><span>Meteorological API Integration</span><strong style={{ color: '#059669' }}>Operational</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
}
