import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config/api';
import PredictiveIntelligencePanel from './PredictiveIntelligencePanel';

export default function DataView({ onNavigate }) {
  const [dataStatus, setDataStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'live', 'delayed', 'disconnected'

  const fetchStatus = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/data/sources/status`);
      if (!res.ok) {
        throw new Error(`Failed to load data status (HTTP ${res.status})`);
      }
      const json = await res.json();
      setDataStatus(json);
    } catch (err) {
      console.error('[DataView] Error fetching data source telemetry:', err);
      setError(err.message || 'Unable to communicate with data telemetry service.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Auto-refresh every 30 seconds while the page remains open
    const interval = setInterval(() => {
      fetchStatus(true);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const sources = dataStatus?.sources || [];
  const summary = dataStatus?.summary || {
    total_sources: 7,
    live_connections: 0,
    live_ingestion: 0,
    delayed_sources: 0,
    disconnected_sources: 0,
    total_records_ingested: 0,
    last_audited_at: 'Loading...',
    freshness_status: 'Evaluating data telemetry...'
  };

  const filteredSources = sources.filter(src => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'live') {
      return src.connection_status === 'Live' && src.ingestion_status === 'Live';
    }
    if (activeFilter === 'delayed') {
      return src.connection_status === 'Delayed' || src.ingestion_status === 'Delayed';
    }
    if (activeFilter === 'historical') {
      return src.connection_status === 'Historical' || src.ingestion_status === 'Historical';
    }
    if (activeFilter === 'disconnected') {
      return src.connection_status === 'Disconnected' || src.ingestion_status === 'Disconnected' || src.connection_status === 'Unknown';
    }
    return true;
  });

  const getStatusBadge = (status) => {
    const s = (status || 'Unknown').toLowerCase();
    if (s === 'live') {
      return {
        bg: 'rgba(16, 185, 129, 0.12)',
        border: '#10B981',
        text: '#10B981',
        dot: '#10B981',
        label: 'Live'
      };
    }
    if (s === 'delayed') {
      return {
        bg: 'rgba(245, 158, 11, 0.12)',
        border: '#F59E0B',
        text: '#F59E0B',
        dot: '#F59E0B',
        label: 'Delayed'
      };
    }
    if (s === 'disconnected') {
      return {
        bg: 'rgba(239, 68, 68, 0.12)',
        border: '#EF4444',
        text: '#EF4444',
        dot: '#EF4444',
        label: 'Disconnected'
      };
    }
    if (s === 'historical') {
      return {
        bg: 'rgba(99, 102, 241, 0.12)',
        border: '#6366F1',
        text: '#6366F1',
        dot: '#6366F1',
        label: 'Historical'
      };
    }
    return {
      bg: 'rgba(148, 163, 184, 0.12)',
      border: '#94A3B8',
      text: '#94A3B8',
      dot: '#94A3B8',
      label: 'Unknown'
    };
  };

  const getSourceIcon = (id) => {
    switch (id) {
      case 'weather_api':
      case 'weather_imd':
        return (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
          </svg>
        );
      case 'google_maps_traffic':
        return (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="10" rx="2" />
            <circle cx="7" cy="18" r="2" />
            <circle cx="17" cy="18" r="2" />
            <path d="M5 11l2-6h10l2 6" />
          </svg>
        );
      case 'crowd_bmrcl_parquet':
        return (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        );
      case 'civic_complaints_db':
        return (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            <line x1="9" y1="10" x2="15" y2="10" />
            <line x1="12" y1="7" x2="12" y2="13" />
          </svg>
        );
      case 'emergency_alerts_db':
        return (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        );
      case 'xgboost_predictive_engine':
        return (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
        );
      case 'osm_geospatial_tiles':
        return (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
            <line x1="8" y1="2" x2="8" y2="18" />
            <line x1="16" y1="6" x2="16" y2="22" />
          </svg>
        );
      default:
        return (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <ellipse cx="12" cy="5" rx="9" ry="3" />
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
          </svg>
        );
    }
  };

  return (
    <div className="view-container predictive-calendar-container" style={{ padding: '1.25rem', maxWidth: '1440px', margin: '0 auto' }}>
      
      {/* ===================================================================== */}
      {/* 1. HEADER SECTION                                                     */}
      {/* ===================================================================== */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '1.25rem',
        paddingBottom: '1rem',
        borderBottom: '1px solid var(--border-color, rgba(226, 232, 240, 0.8))'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #10B981, #059669)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
            }}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5">
                <ellipse cx="12" cy="5" rx="9" ry="3" />
                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
              </svg>
            </div>
            <div>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--text-primary, #0F172A)', letterSpacing: '-0.02em' }}>
                Live Data Ingestion & Source Telemetry
              </h1>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary, #64748B)' }}>
                Real-time operational connection verification, ingestion diagnostics, and freshness threshold tracking.
              </p>
            </div>
          </div>
        </div>

        {/* Audit Refresh & Sync Timestamp */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            fontSize: '0.75rem',
            color: 'var(--text-secondary, #64748B)',
            background: 'var(--bg-card, #FFFFFF)',
            padding: '6px 12px',
            borderRadius: '6px',
            border: '1px solid var(--border-color, #E2E8F0)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: '#10B981',
              display: 'inline-block',
              boxShadow: '0 0 8px #10B981'
            }} />
            <span>Audited: <strong>{summary.last_audited_at}</strong></span>
          </div>

          <button
            onClick={() => fetchStatus(true)}
            disabled={refreshing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#0F172A',
              color: '#FFFFFF',
              border: 'none',
              padding: '7px 14px',
              borderRadius: '6px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: refreshing ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s ease',
              boxShadow: '0 2px 6px rgba(15, 23, 42, 0.15)'
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }}
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            <span>{refreshing ? 'Auditing Sources...' : 'Run Audit Check'}</span>
          </button>
        </div>
      </div>

      {/* Error Notice if Backend is unreachable */}
      {error && (
        <div style={{
          background: '#FEF2F2',
          border: '1px solid #FECACA',
          color: '#991B1B',
          padding: '10px 14px',
          borderRadius: '8px',
          fontSize: '0.82rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 2. SUMMARY KPI STAT CARDS                                             */}
      {/* ===================================================================== */}
      <div className="data-kpi-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '0.9rem',
        marginBottom: '1.25rem'
      }}>
        {/* Total Monitored */}
        <div style={{
          background: 'var(--bg-card, #FFFFFF)',
          border: '1px solid var(--border-color, #E2E8F0)',
          borderRadius: '10px',
          padding: '1rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary, #64748B)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Total Data Sources
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary, #0F172A)', margin: '4px 0' }}>
            {summary.total_sources}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#10B981', fontWeight: 600 }}>
            {summary.freshness_status}
          </div>
        </div>

        {/* Live Ingestion Streams */}
        <div style={{
          background: 'var(--bg-card, #FFFFFF)',
          border: '1px solid var(--border-color, #E2E8F0)',
          borderRadius: '10px',
          padding: '1rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary, #64748B)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Active Ingestion Streams
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10B981', margin: '4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{summary.live_ingestion}</span>
            <span style={{
              fontSize: '0.68rem',
              fontWeight: 700,
              background: 'rgba(16, 185, 129, 0.14)',
              color: '#059669',
              padding: '2px 8px',
              borderRadius: '12px'
            }}>
              LIVE
            </span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary, #64748B)' }}>
            Receiving & parsing records within freshness thresholds
          </div>
        </div>

        {/* Delayed / Out of Window */}
        <div style={{
          background: 'var(--bg-card, #FFFFFF)',
          border: '1px solid var(--border-color, #E2E8F0)',
          borderRadius: '10px',
          padding: '1rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary, #64748B)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Delayed Streams
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: summary.delayed_sources > 0 ? '#F59E0B' : 'var(--text-primary, #0F172A)', margin: '4px 0' }}>
            {summary.delayed_sources}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary, #64748B)' }}>
            Exceeded expected latency window
          </div>
        </div>

        {/* Historical / Archived Datasets */}
        <div style={{
          background: 'var(--bg-card, #FFFFFF)',
          border: '1px solid var(--border-color, #E2E8F0)',
          borderRadius: '10px',
          padding: '1rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary, #64748B)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Historical / Archived
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#6366F1', margin: '4px 0' }}>
            {summary.historical_sources || 1}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary, #64748B)' }}>
            Static ground-truth archives
          </div>
        </div>

        {/* Disconnected / Unconfigured */}
        <div style={{
          background: 'var(--bg-card, #FFFFFF)',
          border: '1px solid var(--border-color, #E2E8F0)',
          borderRadius: '10px',
          padding: '1rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary, #64748B)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Disconnected / Unconfigured
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: summary.disconnected_sources > 0 ? '#EF4444' : 'var(--text-primary, #0F172A)', margin: '4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{summary.disconnected_sources}</span>
            {summary.disconnected_sources > 0 && (
              <span style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                background: 'rgba(239, 68, 68, 0.12)',
                color: '#EF4444',
                padding: '2px 8px',
                borderRadius: '12px'
              }}>
                DISCONNECTED
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary, #64748B)' }}>
            Google Maps API unconfigured
          </div>
        </div>

        {/* Total Records Ingested */}
        <div style={{
          background: 'var(--bg-card, #FFFFFF)',
          border: '1px solid var(--border-color, #E2E8F0)',
          borderRadius: '10px',
          padding: '1rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary, #64748B)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Total Records Ingested
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#3B82F6', margin: '4px 0' }}>
            {summary.total_records_ingested.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary, #64748B)' }}>
            Across all verified data pipelines
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 3. FILTER TABS                                                        */}
      {/* ===================================================================== */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '1rem',
        overflowX: 'auto',
        paddingBottom: '4px'
      }}>
        <button
          onClick={() => setActiveFilter('all')}
          style={{
            padding: '6px 14px',
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontWeight: 700,
            border: activeFilter === 'all' ? '1px solid #0F172A' : '1px solid var(--border-color, #E2E8F0)',
            background: activeFilter === 'all' ? '#0F172A' : 'var(--bg-card, #FFFFFF)',
            color: activeFilter === 'all' ? '#FFFFFF' : 'var(--text-secondary, #64748B)',
            cursor: 'pointer'
          }}
        >
          All Sources ({sources.length})
        </button>

        <button
          onClick={() => setActiveFilter('live')}
          style={{
            padding: '6px 14px',
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontWeight: 700,
            border: activeFilter === 'live' ? '1px solid #10B981' : '1px solid var(--border-color, #E2E8F0)',
            background: activeFilter === 'live' ? '#10B981' : 'var(--bg-card, #FFFFFF)',
            color: activeFilter === 'live' ? '#FFFFFF' : 'var(--text-secondary, #64748B)',
            cursor: 'pointer'
          }}
        >
          Live Ingestion ({summary.live_ingestion})
        </button>

        <button
          onClick={() => setActiveFilter('delayed')}
          style={{
            padding: '6px 14px',
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontWeight: 700,
            border: activeFilter === 'delayed' ? '1px solid #F59E0B' : '1px solid var(--border-color, #E2E8F0)',
            background: activeFilter === 'delayed' ? '#F59E0B' : 'var(--bg-card, #FFFFFF)',
            color: activeFilter === 'delayed' ? '#FFFFFF' : 'var(--text-secondary, #64748B)',
            cursor: 'pointer'
          }}
        >
          Delayed ({summary.delayed_sources})
        </button>

        <button
          onClick={() => setActiveFilter('historical')}
          style={{
            padding: '6px 14px',
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontWeight: 700,
            border: activeFilter === 'historical' ? '1px solid #6366F1' : '1px solid var(--border-color, #E2E8F0)',
            background: activeFilter === 'historical' ? '#6366F1' : 'var(--bg-card, #FFFFFF)',
            color: activeFilter === 'historical' ? '#FFFFFF' : 'var(--text-secondary, #64748B)',
            cursor: 'pointer'
          }}
        >
          Historical ({summary.historical_sources || 1})
        </button>

        <button
          onClick={() => setActiveFilter('disconnected')}
          style={{
            padding: '6px 14px',
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontWeight: 700,
            border: activeFilter === 'disconnected' ? '1px solid #EF4444' : '1px solid var(--border-color, #E2E8F0)',
            background: activeFilter === 'disconnected' ? '#EF4444' : 'var(--bg-card, #FFFFFF)',
            color: activeFilter === 'disconnected' ? '#FFFFFF' : 'var(--text-secondary, #64748B)',
            cursor: 'pointer'
          }}
        >
          Disconnected / Unconfigured ({summary.disconnected_sources})
        </button>
      </div>

      {/* ===================================================================== */}
      {/* 4. DATA SOURCES CARDS GRID                                            */}
      {/* ===================================================================== */}
      <div className="data-sources-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 360px), 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        {filteredSources.map((src) => {
          const connBadge = getStatusBadge(src.connection_status);
          const ingestBadge = getStatusBadge(src.ingestion_status);

          return (
            <div
              key={src.id}
              style={{
                background: 'var(--bg-card, #FFFFFF)',
                border: '1px solid var(--border-color, #E2E8F0)',
                borderRadius: '12px',
                padding: '1.1rem',
                boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease'
              }}
            >
              <div>
                {/* Header: Icon, Name, Provider */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: 'var(--bg-secondary, #F1F5F9)',
                      color: 'var(--text-primary, #0F172A)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {getSourceIcon(src.id)}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '0.92rem', fontWeight: 800, margin: 0, color: 'var(--text-primary, #0F172A)', lineHeight: 1.3 }}>
                        {src.name}
                      </h3>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary, #64748B)', marginTop: '2px' }}>
                        {src.provider}
                      </div>
                    </div>
                  </div>
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    background: 'var(--bg-secondary, #F8FAFC)',
                    color: 'var(--text-secondary, #475569)',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    border: '1px solid var(--border-color, #E2E8F0)',
                    whiteSpace: 'nowrap'
                  }}>
                    {src.category}
                  </span>
                </div>

                {/* Status Badges Row (Distinguishing API Connection vs Ingestion) */}
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 10px',
                  background: 'var(--bg-secondary, #F8FAFC)',
                  borderRadius: '8px',
                  marginBottom: '0.85rem'
                }}>
                  {/* API Connection Status */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary, #64748B)', fontWeight: 600 }}>
                      API Connection:
                    </span>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      background: connBadge.bg,
                      color: connBadge.text,
                      border: `1px solid ${connBadge.border}`
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: connBadge.dot }} />
                      {connBadge.label}
                    </span>
                  </div>

                  {/* Data Ingestion Status */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary, #64748B)', fontWeight: 600 }}>
                      Ingestion:
                    </span>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      background: ingestBadge.bg,
                      color: ingestBadge.text,
                      border: `1px solid ${ingestBadge.border}`
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: ingestBadge.dot }} />
                      {ingestBadge.label}
                    </span>
                  </div>

                  {/* Freshness Window Badge */}
                  <span style={{
                    marginLeft: 'auto',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    color: '#6366F1',
                    background: 'rgba(99, 102, 241, 0.08)',
                    padding: '2px 8px',
                    borderRadius: '4px'
                  }}>
                    Max Lag: {src.freshness_threshold}
                  </span>
                </div>

                {/* Timestamps & Telemetry Metrics Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '8px',
                  fontSize: '0.74rem',
                  marginBottom: '0.85rem'
                }}>
                  <div style={{ background: 'var(--bg-secondary, #FAFAFA)', padding: '6px 8px', borderRadius: '6px' }}>
                    <div style={{ color: 'var(--text-secondary, #64748B)', fontSize: '0.68rem', fontWeight: 600 }}>
                      Last Data Received
                    </div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary, #0F172A)', marginTop: '2px' }}>
                      {src.last_successful_data_received || 'Never (Unconfigured)'}
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-secondary, #FAFAFA)', padding: '6px 8px', borderRadius: '6px' }}>
                    <div style={{ color: 'var(--text-secondary, #64748B)', fontSize: '0.68rem', fontWeight: 600 }}>
                      Latest Ingestion Time
                    </div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary, #0F172A)', marginTop: '2px' }}>
                      {src.latest_successful_ingestion || 'Never (No records)'}
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-secondary, #FAFAFA)', padding: '6px 8px', borderRadius: '6px' }}>
                    <div style={{ color: 'var(--text-secondary, #64748B)', fontSize: '0.68rem', fontWeight: 600 }}>
                      Most Recent Record Timestamp
                    </div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary, #0F172A)', marginTop: '2px' }}>
                      {src.most_recent_record_timestamp || 'None'}
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-secondary, #FAFAFA)', padding: '6px 8px', borderRadius: '6px' }}>
                    <div style={{ color: 'var(--text-secondary, #64748B)', fontSize: '0.68rem', fontWeight: 600 }}>
                      Records Ingested (Recent Window)
                    </div>
                    <div style={{ fontWeight: 700, color: '#2563EB', marginTop: '2px' }}>
                      {src.records_received_recent_window ? src.records_received_recent_window.toLocaleString() : '0 records'}
                    </div>
                  </div>
                </div>

                {/* Error Banner or Diagnostic Verification */}
                {src.most_recent_error ? (
                  <div style={{
                    background: '#FEF2F2',
                    border: '1px solid #FECACA',
                    color: '#991B1B',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    fontSize: '0.72rem',
                    marginBottom: '0.75rem',
                    lineHeight: 1.4
                  }}>
                    <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5, marginBottom: '2px' }}>
                      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      <span>Ingestion Error / Notice:</span>
                    </div>
                    <div>{src.most_recent_error}</div>
                  </div>
                ) : (
                  <div style={{
                    background: '#F0FDF4',
                    border: '1px solid #BBF7D0',
                    color: '#166534',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    fontSize: '0.72rem',
                    marginBottom: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}>
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span><strong>Data Pipeline Active:</strong> {src.freshness_state}</span>
                  </div>
                )}
              </div>

              {/* Footer: Provenance & Technical Endpoint Details */}
              <div style={{
                borderTop: '1px solid var(--border-color, #E2E8F0)',
                paddingTop: '8px',
                marginTop: '4px',
                fontSize: '0.68rem',
                color: 'var(--text-secondary, #64748B)',
                display: 'flex',
                flexDirection: 'column',
                gap: '3px'
              }}>
                <div><strong>Provenance:</strong> {src.provenance_details}</div>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <strong>Endpoint:</strong> <code>{src.endpoint}</code>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ===================================================================== */}
      {/* 5. DATA INGESTION & FRESHNESS POLICY REFERENCE TABLE                  */}
      {/* ===================================================================== */}
      <div style={{
        background: 'var(--bg-card, #FFFFFF)',
        border: '1px solid var(--border-color, #E2E8F0)',
        borderRadius: '12px',
        padding: '1.25rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary, #0F172A)', margin: '0 0 0.5rem 0' }}>
          UrbanPulse Data Governance & Freshness Policy
        </h3>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #64748B)', margin: '0 0 1rem 0' }}>
          Strict integrity standards: an API connection is distinguished from real data storage. Disconnected sources are never falsely reported as operational.
        </p>

        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', minWidth: '650px', borderCollapse: 'collapse', fontSize: '0.74rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary, #F8FAFC)', borderBottom: '1px solid var(--border-color, #E2E8F0)' }}>
                <th style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--text-secondary, #475569)' }}>Data Source</th>
                <th style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--text-secondary, #475569)' }}>Category</th>
                <th style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--text-secondary, #475569)' }}>Connection</th>
                <th style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--text-secondary, #475569)' }}>Ingestion</th>
                <th style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--text-secondary, #475569)' }}>Max Stale Threshold</th>
                <th style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--text-secondary, #475569)' }}>Data Provenance / Standard</th>
              </tr>
            </thead>
            <tbody>
              {sources.map(s => {
                const connBadge = getStatusBadge(s.connection_status);
                const ingestBadge = getStatusBadge(s.ingestion_status);
                return (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color, #F1F5F9)' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--text-primary, #0F172A)' }}>
                      {s.name}
                    </td>
                    <td style={{ padding: '8px 12px', color: 'var(--text-secondary, #64748B)' }}>
                      {s.category}
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        background: connBadge.bg,
                        color: connBadge.text,
                        border: `1px solid ${connBadge.border}`
                      }}>
                        {connBadge.label}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        background: ingestBadge.bg,
                        color: ingestBadge.text,
                        border: `1px solid ${ingestBadge.border}`
                      }}>
                        {ingestBadge.label}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', fontWeight: 600, color: '#6366F1' }}>
                      {s.freshness_threshold}
                    </td>
                    <td style={{ padding: '8px 12px', color: 'var(--text-secondary, #64748B)' }}>
                      {s.provenance_details}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 6. MULTI-HORIZON PREDICTIVE INTELLIGENCE & MODEL PROVENANCE AUDIT   */}
      {/* ===================================================================== */}
      <PredictiveIntelligencePanel onNavigate={onNavigate} />

    </div>
  );
}
