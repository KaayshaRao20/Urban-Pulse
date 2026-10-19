import React, { useState, useEffect, useMemo } from 'react';
import { API_BASE } from '../config/api';

export default function ReportsView() {
  // --- Data States ---
  const [reports, setReports] = useState([]);
  const [summary, setSummary] = useState({
    total_reports: 124,
    generated: 78,
    downloaded: 102,
    submitted: 18,
    recent_24h: 12,
    timestamp: '27 Sep 2026 14:32:18'
  });
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [selectedReportDetails, setSelectedReportDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // --- Filter States ---
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterSource, setFilterSource] = useState('all');
  const [filterDateRange, setFilterDateRange] = useState('last_7d');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterLocation, setFilterLocation] = useState('all');

  // --- Modal States ---
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // --- Generate Modal Form ---
  const [genType, setGenType] = useState('Traffic');
  const [genSource, setGenSource] = useState('Dashboard');
  const [genLocation, setGenLocation] = useState('Marathahalli');
  const [genDateRange, setGenDateRange] = useState('Last 24 Hours');
  const [genFormat, setGenFormat] = useState('PDF');
  const [genLoading, setGenLoading] = useState(false);

  // --- Upload Modal Form ---
  const [upName, setUpName] = useState('');
  const [upType, setUpType] = useState('Traffic');
  const [upSource, setUpSource] = useState('Uploaded');
  const [upLocation, setUpLocation] = useState('Bengaluru');
  const [upBy, setUpBy] = useState('Admin');
  const [upFormat, setUpFormat] = useState('PDF');
  const [upFile, setUpFile] = useState(null);
  const [upLoading, setUpLoading] = useState(false);

  // --- Submit Modal Form ---
  const [subTarget, setSubTarget] = useState('Municipal Commissioner & Directorate');
  const [subNotes, setSubNotes] = useState('Official report submission for administrative action.');
  const [subLoading, setSubLoading] = useState(false);

  // --- Detail Panel Collapsible Sections ---
  const [collapseInfo, setCollapseInfo] = useState(false);
  const [collapsePreview, setCollapsePreview] = useState(false);
  const [collapseInsights, setCollapseInsights] = useState(false);
  const [collapseDownloads, setCollapseDownloads] = useState(false);
  const [collapseSubmission, setCollapseSubmission] = useState(false);
  const [collapseTimeline, setCollapseTimeline] = useState(false);

  // --- Toast Feedback ---
  const [toastMessage, setToastMessage] = useState('');
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // --- Fetch Summary & Reports on Mount ---
  useEffect(() => {
    fetchSummary();
    fetchReports();
  }, []);

  const fetchSummary = async () => {
    try {
      const res = await fetch(`${API_BASE}/reports/summary`);
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch (e) {
      console.warn('Failed to load reports summary', e);
    }
  };

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (filterType !== 'all') params.append('report_type', filterType);
      if (filterSource !== 'all') params.append('source', filterSource);
      if (filterLocation !== 'all') params.append('location', filterLocation);
      if (filterStatus !== 'all') params.append('status', filterStatus);

      const res = await fetch(`${API_BASE}/reports?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setReports(data);
      }
    } catch (e) {
      console.warn('Failed to load reports', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch single report details when selected
  useEffect(() => {
    if (!selectedReportId) {
      setSelectedReportDetails(null);
      return;
    }
    const fetchDetails = async () => {
      try {
        const res = await fetch(`${API_BASE}/reports/${selectedReportId}`);
        if (res.ok) {
          const data = await res.json();
          setSelectedReportDetails(data);
        }
      } catch (e) {
        console.warn('Failed to load report details', e);
      }
    };
    fetchDetails();
  }, [selectedReportId]);

  // --- Handle Real Download ---
  const handleDownload = async (reportId, reportName) => {
    try {
      const res = await fetch(`${API_BASE}/reports/${reportId}/download?user=Admin (Urban Authority)`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${reportName.replace(/\s+/g, '_')}_${reportId}.txt`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

        showToast(`Downloaded ${reportName}`);
        fetchSummary();
        fetchReports();
        if (selectedReportId === reportId) {
          const detailRes = await fetch(`${API_BASE}/reports/${reportId}`);
          if (detailRes.ok) setSelectedReportDetails(await detailRes.json());
        }
      }
    } catch (e) {
      showToast('Download failed. Please try again.');
    }
  };

  // --- Handle Generate Report ---
  const handleGenerate = async (e) => {
    e.preventDefault();
    setGenLoading(true);
    try {
      const res = await fetch(`${API_BASE}/reports/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_type: genType,
          source: genSource,
          location: genLocation,
          date_range: genDateRange,
          file_format: genFormat,
          created_by: 'Admin'
        })
      });
      if (res.ok) {
        const data = await res.json();
        showToast(`Generated ${data.report.name}`);
        setShowGenerateModal(false);
        fetchSummary();
        fetchReports();
        setSelectedReportId(data.report.id);
      }
    } catch (e) {
      showToast('Generation failed.');
    } finally {
      setGenLoading(false);
    }
  };

  // --- Handle Upload Report ---
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!upName.trim()) {
      showToast('Please enter a report name.');
      return;
    }
    setUpLoading(true);
    try {
      const res = await fetch(`${API_BASE}/reports/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: upName.trim(),
          report_type: upType,
          source: upSource,
          location: upLocation,
          uploaded_by: upBy,
          file_format: upFormat,
          file_size: upFile ? `${(upFile.size / (1024 * 1024)).toFixed(1)} MB` : '2.1 MB'
        })
      });
      if (res.ok) {
        const data = await res.json();
        showToast(`Uploaded ${data.report.name}`);
        setShowUploadModal(false);
        setUpName('');
        setUpFile(null);
        fetchSummary();
        fetchReports();
        setSelectedReportId(data.report.id);
      }
    } catch (e) {
      showToast('Upload failed.');
    } finally {
      setUpLoading(false);
    }
  };

  // --- Handle Submit Report ---
  const handleSubmitReport = async (e) => {
    e.preventDefault();
    if (!selectedReportId) return;
    setSubLoading(true);
    try {
      const res = await fetch(`${API_BASE}/reports/${selectedReportId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submitted_to: subTarget,
          notes: subNotes
        })
      });
      if (res.ok) {
        const data = await res.json();
        showToast(`Submitted to ${subTarget}`);
        setShowSubmitModal(false);
        fetchSummary();
        fetchReports();
        setSelectedReportDetails(data.report);
      }
    } catch (e) {
      showToast('Submission failed.');
    } finally {
      setSubLoading(false);
    }
  };

  // --- Handle Archive ---
  const handleArchive = async (reportId) => {
    try {
      const res = await fetch(`${API_BASE}/reports/${reportId}/archive`, { method: 'POST' });
      if (res.ok) {
        showToast('Report archived.');
        setSelectedReportId(null);
        fetchReports();
      }
    } catch (e) {
      showToast('Archive failed.');
    }
  };

  // Helper: Severity / Status Badges
  const renderStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'available':
        return <span style={{ background: '#DCFCE7', color: '#166534', padding: '3px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 800 }}>Available</span>;
      case 'downloaded':
        return <span style={{ background: '#DBEAFE', color: '#1E40AF', padding: '3px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 800 }}>Downloaded</span>;
      case 'submitted':
        return <span style={{ background: '#FEF3C7', color: '#D97706', padding: '3px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 800 }}>Submitted</span>;
      case 'processing':
        return <span style={{ background: '#F1F5F9', color: '#475569', padding: '3px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 800 }}>Processing</span>;
      case 'archived':
        return <span style={{ background: '#F1F5F9', color: '#64748B', padding: '3px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 800 }}>Archived</span>;
      default:
        return <span style={{ background: '#DCFCE7', color: '#166534', padding: '3px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 800 }}>{status}</span>;
    }
  };

  // Helper: Report Type Pill Badges
  const renderTypePill = (type) => {
    let bg = '#DBEAFE';
    let color = '#2563EB';

    switch (type?.toLowerCase()) {
      case 'traffic':
        bg = '#DBEAFE'; color = '#2563EB'; break;
      case 'crowd':
        bg = '#BFDBFE'; color = '#1D4ED8'; break;
      case 'weather':
        bg = '#E0F2FE'; color = '#0284C7'; break;
      case 'alert':
        bg = '#FEE2E2'; color = '#DC2626'; break;
      case 'scenario':
        bg = '#F3E8FF'; color = '#7C3AED'; break;
      case 'focus':
        bg = '#CCFBF1'; color = '#0F766E'; break;
      case 'calendar':
        bg = '#D1FAE5'; color = '#065F46'; break;
      case 'civic grievance':
        bg = '#FEF3C7'; color = '#D97706'; break;
      case 'combined':
        bg = '#EDE9FE'; color = '#6D28D9'; break;
      default:
        bg = '#F1F5F9'; color = '#475569';
    }

    return (
      <span style={{ background: bg, color: color, padding: '3px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 800 }}>
        {type}
      </span>
    );
  };

  // Helper: Source Icon & Label
  const renderSourceLabel = (source) => {
    let iconPath = 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z';
    if (source?.toLowerCase().includes('focus')) iconPath = 'M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 14a4 4 0 1 1 0-8 4 4 0 0 1 0 8z';
    else if (source?.toLowerCase().includes('calendar')) iconPath = 'M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM16 2v4M8 2v4M3 10h18';
    else if (source?.toLowerCase().includes('alert')) iconPath = 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9';
    else if (source?.toLowerCase().includes('scenario')) iconPath = 'M10 2v7.31L4.2 18.5A2 2 0 0 0 5.8 21.5h12.4a2 2 0 0 0 1.6-3L14 9.31V2z';
    else if (source?.toLowerCase().includes('grievance') || source?.toLowerCase().includes('portal')) iconPath = 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z';
    else if (source?.toLowerCase().includes('system')) iconPath = 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z';
    else if (source?.toLowerCase().includes('upload')) iconPath = 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12';

    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#334155', fontWeight: 600 }}>
        <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" strokeWidth="2"><path d={iconPath}/></svg>
        <span>{source}</span>
      </span>
    );
  };

  // Helper: Table Row Icon
  const renderReportRowIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'traffic':
        return (
          <div style={{ width: 28, height: 28, borderRadius: '6px', background: '#DBEAFE', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          </div>
        );
      case 'crowd':
        return (
          <div style={{ width: 28, height: 28, borderRadius: '6px', background: '#BFDBFE', color: '#1D4ED8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/></svg>
          </div>
        );
      case 'weather':
        return (
          <div style={{ width: 28, height: 28, borderRadius: '6px', background: '#E0F2FE', color: '#0284C7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>
          </div>
        );
      case 'alert':
        return (
          <div style={{ width: 28, height: 28, borderRadius: '6px', background: '#FEE2E2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
          </div>
        );
      case 'scenario':
        return (
          <div style={{ width: 28, height: 28, borderRadius: '6px', background: '#F3E8FF', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/></svg>
          </div>
        );
      case 'calendar':
        return (
          <div style={{ width: 28, height: 28, borderRadius: '6px', background: '#D1FAE5', color: '#065F46', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </div>
        );
      case 'civic grievance':
        return (
          <div style={{ width: 28, height: 28, borderRadius: '6px', background: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="9" y1="10" x2="15" y2="10"/><line x1="12" y1="7" x2="12" y2="13"/></svg>
          </div>
        );
      default:
        return (
          <div style={{ width: 28, height: 28, borderRadius: '6px', background: '#EDE9FE', color: '#6D28D9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>
          </div>
        );
    }
  };

  return (
    <div className="view-container" style={{ position: 'relative' }}>
      
      {/* Toast Feedback */}
      {toastMessage && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: '#FFFFFF', color: '#FFFFFF', padding: '10px 18px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 9999 }}>
          {toastMessage}
        </div>
      )}

      {/* --- TOP HEADER ROW (Matching Reference Image) --- */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', gap: '1rem', flexWrap: 'wrap' }}>
        
        {/* Global Search Bar */}
        <div style={{ position: 'relative', width: 340, maxWidth: '100%' }}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#94A3B8" strokeWidth="2" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search reports, location, or type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '0.55rem 1rem 0.55rem 2.4rem', border: '1px solid #CBD5E1', borderRadius: '24px', fontSize: '0.8rem', background: '#FFFFFF', outline: 'none', color: '#0F172A' }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} title="Clear search" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          )}
        </div>

        {/* Right Header Status Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          
          {/* Live Data Badge + Dynamic Time */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#475569', background: '#FFFFFF', border: '1px solid #E2E8F0', padding: '0.35rem 0.75rem', borderRadius: '8px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#059669', fontWeight: 700 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', display: 'inline-block', boxShadow: '0 0 0 2px rgba(16,185,129,0.2)' }}></span>
              Live Data
            </span>
            <span style={{ color: '#334155' }}>|</span>
            <span style={{ fontWeight: 600, color: '#1E293B' }}>{summary.timestamp || '27 Sep 2026 14:32:18'}</span>
          </div>

          {/* Location Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#FFFFFF', border: '1px solid #E2E8F0', padding: '0.35rem 0.75rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, color: '#0F172A', cursor: 'pointer' }}>
            <svg viewBox="0 0 24 24" width="13" height="13" stroke="#EF4444" fill="none" strokeWidth="2"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
            <span>Bengaluru</span>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
          </div>

          {/* Quick Action Buttons */}
          <button onClick={() => { fetchSummary(); fetchReports(); }} title="Refresh Reports" style={{ width: 34, height: 34, borderRadius: '8px', background: '#FFFFFF', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', cursor: 'pointer' }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          </button>

          <button onClick={() => showToast('Archive download ready.')} title="Download All" style={{ width: 34, height: 34, borderRadius: '8px', background: '#FFFFFF', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', cursor: 'pointer' }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
          </button>

          <button onClick={() => {
            if (!document.fullscreenElement) {
              document.documentElement.requestFullscreen().catch(() => {});
            } else {
              document.exitFullscreen().catch(() => {});
            }
          }} title="Toggle Fullscreen" style={{ width: 34, height: 34, borderRadius: '8px', background: '#FFFFFF', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', cursor: 'pointer' }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
          </button>
        </div>
      </div>

      {/* --- PAGE TITLE & SUBTITLE --- */}
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.3px', margin: 0 }}>Reports</h1>
        <p style={{ fontSize: '0.82rem', color: '#64748B', marginTop: 4, marginBottom: 0 }}>View, generate, download and manage UrbanPulse reports.</p>
      </div>

      {/* --- SUMMARY CARDS ROW (5 Cards Matching Screenshot) --- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px', marginBottom: '1.25rem' }}>
        
        {/* 1. Total Reports */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1rem', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#DBEAFE', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600 }}>Total Reports</div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0F172A', lineHeight: 1, marginTop: 4 }}>{summary.total_reports}</div>
          </div>
        </div>

        {/* 2. Generated */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1rem', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="16 10 11 15 8 12"/></svg>
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600 }}>Generated</div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0F172A', lineHeight: 1, marginTop: 4 }}>{summary.generated}</div>
          </div>
        </div>

        {/* 3. Downloaded */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1rem', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#DBEAFE', color: '#1D4ED8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600 }}>Downloaded</div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0F172A', lineHeight: 1, marginTop: 4 }}>{summary.downloaded}</div>
          </div>
        </div>

        {/* 4. Submitted */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1rem', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#FFEDD5', color: '#EA580C', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600 }}>Submitted</div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0F172A', lineHeight: 1, marginTop: 4 }}>{summary.submitted}</div>
          </div>
        </div>

        {/* 5. Recent (24h) */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1rem', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#F3E8FF', color: '#9333EA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600 }}>Recent (24h)</div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0F172A', lineHeight: 1, marginTop: 4 }}>{summary.recent_24h}</div>
          </div>
        </div>
      </div>

      {/* --- FILTERS & ACTION CONTROLS TOOLBAR --- */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', marginBottom: '1.1rem' }}>
        
        {/* Left Filter Group */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          
          {/* Search Reports */}
          <div style={{ position: 'relative', width: 180 }}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#94A3B8" strokeWidth="2" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Search reports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') fetchReports(); }}
              style={{ width: '100%', padding: '0.42rem 0.6rem 0.42rem 1.9rem', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '0.78rem', outline: 'none', background: '#FFFFFF' }}
            />
          </div>

          {/* Report Type */}
          <select
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value); }}
            style={{ padding: '0.42rem 0.75rem', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 600, color: '#334155', background: '#FFFFFF', outline: 'none', cursor: 'pointer' }}
          >
            <option value="all">Report Type ∨</option>
            <option value="Civic Grievance">Civic Grievance</option>
            <option value="Traffic">Traffic</option>
            <option value="Crowd">Crowd</option>
            <option value="Weather">Weather</option>
            <option value="Alert">Alert</option>
            <option value="Scenario">Scenario</option>
            <option value="Focus">Focus</option>
            <option value="Calendar">Calendar</option>
            <option value="Combined">Combined</option>
            <option value="Student Service">Student Service</option>
          </select>

          {/* Source */}
          <select
            value={filterSource}
            onChange={(e) => { setFilterSource(e.target.value); }}
            style={{ padding: '0.42rem 0.75rem', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 600, color: '#334155', background: '#FFFFFF', outline: 'none', cursor: 'pointer' }}
          >
            <option value="all">Source ∨</option>
            <option value="Dashboard">Dashboard</option>
            <option value="Focus">Focus</option>
            <option value="Predictive Calendar">Predictive Calendar</option>
            <option value="Alerts & Incidents">Alerts & Incidents</option>
            <option value="Scenario Analysis">Scenario Analysis</option>
            <option value="System">System</option>
            <option value="Student Service">Student Service</option>
            <option value="Uploaded">Uploaded</option>
          </select>

          {/* Date Range */}
          <select
            value={filterDateRange}
            onChange={(e) => setFilterDateRange(e.target.value)}
            style={{ padding: '0.42rem 0.75rem', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 600, color: '#334155', background: '#FFFFFF', outline: 'none', cursor: 'pointer' }}
          >
            <option value="today">Today</option>
            <option value="last_24h">Last 24 Hours</option>
            <option value="last_7d">Last 7 Days</option>
            <option value="last_30d">Last 30 Days</option>
          </select>

          {/* Status */}
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); }}
            style={{ padding: '0.42rem 0.75rem', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 600, color: '#334155', background: '#FFFFFF', outline: 'none', cursor: 'pointer' }}
          >
            <option value="all">Status ∨</option>
            <option value="Available">Available</option>
            <option value="Downloaded">Downloaded</option>
            <option value="Submitted">Submitted</option>
          </select>

          {/* Location */}
          <select
            value={filterLocation}
            onChange={(e) => { setFilterLocation(e.target.value); }}
            style={{ padding: '0.42rem 0.75rem', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 600, color: '#334155', background: '#FFFFFF', outline: 'none', cursor: 'pointer' }}
          >
            <option value="all">Location ∨</option>
            <option value="Marathahalli">Marathahalli</option>
            <option value="MG Road">MG Road</option>
            <option value="Whitefield">Whitefield</option>
            <option value="Koramangala">Koramangala</option>
            <option value="Electronic City">Electronic City</option>
            <option value="Bengaluru">Bengaluru</option>
          </select>

          {/* Refresh Button */}
          <button
            onClick={() => { fetchSummary(); fetchReports(); }}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#059669', color: '#FFFFFF', border: 'none', borderRadius: '8px', padding: '0.42rem 0.85rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            Refresh
          </button>
        </div>

        {/* Right Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          
          {/* Upload Report Button */}
          <button
            onClick={() => setShowUploadModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0', borderRadius: '8px', padding: '0.45rem 0.95rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
            Upload Report
          </button>

          {/* Generate Report Button */}
          <button
            onClick={() => setShowGenerateModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#047857', color: '#FFFFFF', border: 'none', borderRadius: '8px', padding: '0.45rem 1.1rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
          >
            <span style={{ fontSize: '0.9rem', lineHeight: 1 }}>+</span>
            Generate Report
          </button>
        </div>
      </div>

      {/* --- MAIN LAYOUT: REPORTS TABLE + OPTIONAL RIGHT DETAIL PANEL --- */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedReportId ? '60% 39%' : '100%', gap: '16px', alignItems: 'start' }}>
        
        {/* === REPORTS TABLE CARD === */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.78rem' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 700, fontSize: '0.74rem' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Report Name</th>
                <th style={{ padding: '0.75rem 0.75rem' }}>Type</th>
                <th style={{ padding: '0.75rem 0.75rem' }}>Source</th>
                <th style={{ padding: '0.75rem 0.75rem' }}>Location</th>
                <th style={{ padding: '0.75rem 0.75rem' }}>Created By</th>
                <th style={{ padding: '0.75rem 0.75rem' }}>Date & Time</th>
                <th style={{ padding: '0.75rem 0.75rem' }}>Status</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
                    {isLoading ? 'Loading reports...' : 'No reports found matching criteria.'}
                  </td>
                </tr>
              ) : (
                reports.map(rep => {
                  const isSelected = selectedReportId === rep.id;
                  return (
                    <tr
                      key={rep.id}
                      onClick={() => setSelectedReportId(rep.id)}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        background: isSelected ? '#F0FDF4' : '#FFFFFF',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      {/* Report Name with Icon */}
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#0F172A' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {renderReportRowIcon(rep.report_type)}
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: selectedReportId ? 160 : 220 }}>
                            {rep.name}
                          </span>
                        </div>
                      </td>

                      {/* Type Pill */}
                      <td style={{ padding: '0.75rem 0.75rem' }}>
                        {renderTypePill(rep.report_type)}
                      </td>

                      {/* Source */}
                      <td style={{ padding: '0.75rem 0.75rem', color: '#334155' }}>
                        {renderSourceLabel(rep.source)}
                      </td>

                      {/* Location */}
                      <td style={{ padding: '0.75rem 0.75rem', color: '#475569', fontWeight: 600 }}>
                        {rep.location}
                      </td>

                      {/* Created By */}
                      <td style={{ padding: '0.75rem 0.75rem', color: '#475569' }}>
                        {rep.created_by}
                      </td>

                      {/* Date & Time */}
                      <td style={{ padding: '0.75rem 0.75rem', color: '#64748B', whiteSpace: 'nowrap' }}>
                        {rep.date_time}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '0.75rem 0.75rem' }}>
                        {renderStatusBadge(rep.status)}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
                          
                          {/* View Button */}
                          <button
                            onClick={() => setSelectedReportId(rep.id)}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '6px', padding: '0.3rem 0.6rem', fontSize: '0.72rem', fontWeight: 700, color: '#334155', cursor: 'pointer' }}
                          >
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            View
                          </button>

                          {/* Download Button */}
                          <button
                            onClick={() => handleDownload(rep.id, rep.name)}
                            title="Download Report"
                            style={{ background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '6px', padding: '0.3rem 0.45rem', fontSize: '0.72rem', color: '#334155', cursor: 'pointer' }}
                          >
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                          </button>

                          {/* More Options */}
                          <button
                            onClick={() => { setSelectedReportId(rep.id); setShowSubmitModal(true); }}
                            title="Submit / Forward"
                            style={{ background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '6px', padding: '0.3rem 0.45rem', fontSize: '0.72rem', color: '#334155', cursor: 'pointer' }}
                          >
                            ⋯
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* === RIGHT REPORT DETAIL PANEL (Collapsible Sections) === */}
        {selectedReportDetails && (
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            
            {/* Header: Title, Status, Close */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {renderReportRowIcon(selectedReportDetails.report_type)}
                  <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    {selectedReportDetails.name}
                  </h2>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 4 }}>
                  {renderTypePill(selectedReportDetails.report_type)}
                  {renderStatusBadge(selectedReportDetails.status)}
                </div>
              </div>
              <button
                onClick={() => setSelectedReportId(null)}
                style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 2 }}
                title="Close"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            {/* Quick Actions Row */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={() => handleDownload(selectedReportDetails.id, selectedReportDetails.name)}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', background: '#059669', color: '#FFFFFF', border: 'none', borderRadius: '6px', padding: '0.45rem 0.75rem', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer' }}
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                Download
              </button>
              <button
                onClick={() => setShowSubmitModal(true)}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', background: '#FFFFFF', color: '#0F172A', border: '1px solid #CBD5E1', borderRadius: '6px', padding: '0.45rem 0.75rem', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer' }}
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
                Submit / Share
              </button>
              <button
                onClick={() => handleArchive(selectedReportDetails.id)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', color: '#64748B', border: '1px solid #CBD5E1', borderRadius: '6px', padding: '0.45rem 0.65rem', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer' }}
                title="Archive"
              >
                Archive
              </button>
            </div>

            {/* Section 1: Report Information */}
            <div style={{ border: '1px solid #F1F5F9', borderRadius: '8px', padding: '0.75rem' }}>
              <div
                onClick={() => setCollapseInfo(!collapseInfo)}
                style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
              >
                <span>Report Information</span>
                <svg viewBox="0 0 24 24" width="12" height="12" stroke="#94A3B8" fill="none" strokeWidth="2" style={{ transform: collapseInfo ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s ease' }}><polyline points="6 9 12 15 18 9"/></svg>
              </div>
              {!collapseInfo && (
                <div style={{ marginTop: '0.6rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.74rem' }}>
                  <div><span style={{ color: '#64748B' }}>Report ID:</span> <strong style={{ color: '#0F172A' }}>{selectedReportDetails.id}</strong></div>
                  <div><span style={{ color: '#64748B' }}>Source:</span> <strong style={{ color: '#0F172A' }}>{selectedReportDetails.source}</strong></div>
                  <div><span style={{ color: '#64748B' }}>Location:</span> <strong style={{ color: '#0F172A' }}>{selectedReportDetails.location}</strong></div>
                  <div><span style={{ color: '#64748B' }}>Created By:</span> <strong style={{ color: '#0F172A' }}>{selectedReportDetails.created_by}</strong></div>
                  <div><span style={{ color: '#64748B' }}>Date/Time:</span> <strong style={{ color: '#0F172A' }}>{selectedReportDetails.date_time}</strong></div>
                  <div><span style={{ color: '#64748B' }}>Format:</span> <strong style={{ color: '#0F172A' }}>{selectedReportDetails.file_format} ({selectedReportDetails.file_size})</strong></div>
                  <div><span style={{ color: '#64748B' }}>Downloads:</span> <strong style={{ color: '#059669' }}>{selectedReportDetails.download_count || 0} times</strong></div>
                </div>
              )}
            </div>

            {/* Section 2: Report Preview */}
            <div style={{ border: '1px solid #F1F5F9', borderRadius: '8px', padding: '0.75rem' }}>
              <div
                onClick={() => setCollapsePreview(!collapsePreview)}
                style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
              >
                <span>Report Preview</span>
                <svg viewBox="0 0 24 24" width="12" height="12" stroke="#94A3B8" fill="none" strokeWidth="2" style={{ transform: collapsePreview ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s ease' }}><polyline points="6 9 12 15 18 9"/></svg>
              </div>
              {!collapsePreview && (
                <div style={{ marginTop: '0.6rem', fontSize: '0.76rem', color: '#334155' }}>
                  <div style={{ background: '#F8FAFC', padding: '0.65rem', borderRadius: '6px', border: '1px solid #E2E8F0', marginBottom: '8px', lineHeight: 1.45 }}>
                    {selectedReportDetails.preview_data?.executive_summary || selectedReportDetails.description}
                  </div>

                  {/* KPI Mini-Cards */}
                  {selectedReportDetails.preview_data?.kpis && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '8px' }}>
                      {selectedReportDetails.preview_data.kpis.map((kpi, i) => (
                        <div key={i} style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '6px 8px' }}>
                          <div style={{ fontSize: '0.68rem', color: '#64748B' }}>{kpi.label}</div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F172A', marginTop: 2 }}>{kpi.value}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Section 3: Key Insights */}
            <div style={{ border: '1px solid #F1F5F9', borderRadius: '8px', padding: '0.75rem' }}>
              <div
                onClick={() => setCollapseInsights(!collapseInsights)}
                style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
              >
                <span>Key Insights</span>
                <svg viewBox="0 0 24 24" width="12" height="12" stroke="#94A3B8" fill="none" strokeWidth="2" style={{ transform: collapseInsights ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s ease' }}><polyline points="6 9 12 15 18 9"/></svg>
              </div>
              {!collapseInsights && (
                <div style={{ marginTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.74rem', color: '#334155' }}>
                  {selectedReportDetails.preview_data?.key_insights?.map((ins, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                      <span style={{ color: '#059669', fontWeight: 800 }}>•</span>
                      <span>{ins}</span>
                    </div>
                  )) || <div>No insights specified.</div>}
                </div>
              )}
            </div>

            {/* Section 4: Download History */}
            <div style={{ border: '1px solid #F1F5F9', borderRadius: '8px', padding: '0.75rem' }}>
              <div
                onClick={() => setCollapseDownloads(!collapseDownloads)}
                style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
              >
                <span>Download History ({selectedReportDetails.download_history?.length || 0})</span>
                <svg viewBox="0 0 24 24" width="12" height="12" stroke="#94A3B8" fill="none" strokeWidth="2" style={{ transform: collapseDownloads ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s ease' }}><polyline points="6 9 12 15 18 9"/></svg>
              </div>
              {!collapseDownloads && (
                <div style={{ marginTop: '0.6rem', fontSize: '0.72rem', color: '#475569' }}>
                  {selectedReportDetails.download_history?.length > 0 ? (
                    selectedReportDetails.download_history.map((dh, i) => (
                      <div key={i} style={{ padding: '4px 0', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" fill="none" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                          <span>{dh.user}</span>
                        </span>
                        <span style={{ color: '#64748B' }}>{dh.downloaded_at}</span>
                      </div>
                    ))
                  ) : (
                    <div style={{ color: '#64748B' }}>No downloads recorded yet.</div>
                  )}
                </div>
              )}
            </div>

            {/* Section 5: Submission Details */}
            <div style={{ border: '1px solid #F1F5F9', borderRadius: '8px', padding: '0.75rem' }}>
              <div
                onClick={() => setCollapseSubmission(!collapseSubmission)}
                style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
              >
                <span>Submission Details</span>
                <svg viewBox="0 0 24 24" width="12" height="12" stroke="#94A3B8" fill="none" strokeWidth="2" style={{ transform: collapseSubmission ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s ease' }}><polyline points="6 9 12 15 18 9"/></svg>
              </div>
              {!collapseSubmission && (
                <div style={{ marginTop: '0.6rem', fontSize: '0.74rem' }}>
                  {selectedReportDetails.submission_info ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div><span style={{ color: '#64748B' }}>Submitted To:</span> <strong>{selectedReportDetails.submission_info.submitted_to}</strong></div>
                      <div><span style={{ color: '#64748B' }}>Submitted By:</span> <strong>{selectedReportDetails.submission_info.submitted_by}</strong></div>
                      <div><span style={{ color: '#64748B' }}>Date:</span> <strong>{selectedReportDetails.submission_info.submitted_at}</strong></div>
                      <div><span style={{ color: '#64748B' }}>Notes:</span> <em>"{selectedReportDetails.submission_info.notes}"</em></div>
                    </div>
                  ) : (
                    <div style={{ color: '#64748B' }}>Not yet submitted to an external agency.</div>
                  )}
                </div>
              )}
            </div>

            {/* Section 6: Activity Timeline */}
            <div style={{ border: '1px solid #F1F5F9', borderRadius: '8px', padding: '0.75rem' }}>
              <div
                onClick={() => setCollapseTimeline(!collapseTimeline)}
                style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
              >
                <span>Activity Timeline</span>
                <svg viewBox="0 0 24 24" width="12" height="12" stroke="#94A3B8" fill="none" strokeWidth="2" style={{ transform: collapseTimeline ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s ease' }}><polyline points="6 9 12 15 18 9"/></svg>
              </div>
              {!collapseTimeline && (
                <div style={{ marginTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.72rem' }}>
                  {selectedReportDetails.activity_timeline?.map((act, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#059669', marginTop: 5, flexShrink: 0 }}></span>
                      <div>
                        <div><strong>{act.action}</strong> by {act.user} <span style={{ color: '#64748B' }}>• {act.timestamp}</span></div>
                        <div style={{ color: '#64748B', marginTop: 1 }}>{act.details}</div>
                      </div>
                    </div>
                  )) || <div>No activity logged.</div>}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* GENERATE REPORT MODAL */}
      {/* ======================================================== */}
      {showGenerateModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001, backdropFilter: 'blur(2px)' }}>
          <div style={{ width: 440, maxWidth: '92%', background: '#FFFFFF', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 12px 36px rgba(0,0,0,0.2)', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem' }}>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>Generate Report</div>
              <button onClick={() => setShowGenerateModal(false)} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 2 }} title="Close">
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <form onSubmit={handleGenerate}>
              <div style={{ marginBottom: '0.85rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>Report Type:</label>
                <select value={genType} onChange={(e) => setGenType(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.8rem', color: '#0F172A', outline: 'none' }}>
                  <option value="Civic Grievance">Civic Grievance Redressal Audit</option>
                  <option value="Traffic">Traffic Situation Report</option>
                  <option value="Crowd">Crowd Assessment Report</option>
                  <option value="Weather">Weather Impact Report</option>
                  <option value="Alert">Incident Evaluation Report</option>
                  <option value="Scenario">Scenario Analysis Report</option>
                  <option value="Focus">Focus Corridor Report</option>
                  <option value="Calendar">Predictive Calendar Report</option>
                  <option value="Student Service">Student Service Report</option>
                  <option value="Combined">Urban Situation Report (Combined)</option>
                </select>
              </div>

              <div style={{ marginBottom: '0.85rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>Source Feature:</label>
                <select value={genSource} onChange={(e) => setGenSource(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.8rem', color: '#0F172A', outline: 'none' }}>
                  <option value="Grievance Portal">Grievance Portal</option>
                  <option value="Dashboard">Dashboard</option>
                  <option value="Focus">Focus</option>
                  <option value="Predictive Calendar">Predictive Calendar</option>
                  <option value="Alerts & Incidents">Alerts & Incidents</option>
                  <option value="Scenario Analysis">Scenario Analysis</option>
                  <option value="Student Service">Student Service</option>
                  <option value="System">System Automated</option>
                </select>
              </div>

              <div style={{ marginBottom: '0.85rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>Location / Zone:</label>
                <select value={genLocation} onChange={(e) => setGenLocation(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.8rem', color: '#0F172A', outline: 'none' }}>
                  <option value="Marathahalli">Marathahalli – Outer Ring Road</option>
                  <option value="MG Road">MG Road Corridor</option>
                  <option value="Whitefield">Whitefield IT Corridor</option>
                  <option value="Koramangala">Koramangala</option>
                  <option value="Silk Board">Silk Board Interchange</option>
                  <option value="Electronic City">Electronic City</option>
                  <option value="Bengaluru">Bengaluru (Citywide)</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>Date Range:</label>
                  <select value={genDateRange} onChange={(e) => setGenDateRange(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.8rem', color: '#0F172A', outline: 'none' }}>
                    <option value="Last 24 Hours">Last 24 Hours</option>
                    <option value="Last 7 Days">Last 7 Days</option>
                    <option value="Last 30 Days">Last 30 Days</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>Format:</label>
                  <select value={genFormat} onChange={(e) => setGenFormat(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.8rem', color: '#0F172A', outline: 'none' }}>
                    <option value="PDF">PDF Document</option>
                    <option value="DOCX">DOCX Word Document</option>
                    <option value="XLSX">XLSX Data Sheet</option>
                    <option value="CSV">CSV Raw Data</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" onClick={() => setShowGenerateModal(false)} style={{ padding: '0.45rem 1rem', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, color: '#475569', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={genLoading} style={{ padding: '0.45rem 1.1rem', background: '#059669', border: 'none', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, color: '#FFFFFF', cursor: 'pointer' }}>{genLoading ? 'Synthesizing...' : 'Generate Report'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* UPLOAD REPORT MODAL */}
      {/* ======================================================== */}
      {showUploadModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001, backdropFilter: 'blur(2px)' }}>
          <div style={{ width: 440, maxWidth: '92%', background: '#FFFFFF', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 12px 36px rgba(0,0,0,0.2)', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem' }}>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>Upload Report Document</div>
              <button onClick={() => setShowUploadModal(false)} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 2 }} title="Close">
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <form onSubmit={handleUpload}>
              <div style={{ marginBottom: '0.85rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>Report Title:</label>
                <input type="text" placeholder="e.g. Traffic Corridor Audit 2026" value={upName} onChange={(e) => setUpName(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.8rem', outline: 'none' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '0.85rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>Type:</label>
                  <select value={upType} onChange={(e) => setUpType(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.8rem', color: '#0F172A', outline: 'none' }}>
                    <option value="Traffic">Traffic</option>
                    <option value="Crowd">Crowd</option>
                    <option value="Weather">Weather</option>
                    <option value="Alert">Alert</option>
                    <option value="Student Service">Student Service</option>
                    <option value="Combined">Combined</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>Source Attribution:</label>
                  <select value={upSource} onChange={(e) => setUpSource(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.8rem', color: '#0F172A', outline: 'none' }}>
                    <option value="Uploaded">Uploaded</option>
                    <option value="Student Service">Student Service</option>
                    <option value="External Agency">External Agency</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '0.85rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>Location:</label>
                <input type="text" value={upLocation} onChange={(e) => setUpLocation(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.8rem', outline: 'none' }} />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>File (.pdf, .docx, .xlsx, .csv):</label>
                <input type="file" onChange={(e) => { if (e.target.files?.[0]) { setUpFile(e.target.files[0]); if (!upName) setUpName(e.target.files[0].name.replace(/\.[^/.]+$/, "")); } }} style={{ width: '100%', padding: '0.4rem', border: '1px dashed #CBD5E1', borderRadius: '6px', fontSize: '0.75rem' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" onClick={() => setShowUploadModal(false)} style={{ padding: '0.45rem 1rem', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, color: '#475569', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={upLoading} style={{ padding: '0.45rem 1.1rem', background: '#059669', border: 'none', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, color: '#FFFFFF', cursor: 'pointer' }}>{upLoading ? 'Uploading...' : 'Upload File'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUBMIT / FORWARD MODAL */}
      {/* ======================================================== */}
      {showSubmitModal && selectedReportDetails && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001, backdropFilter: 'blur(2px)' }}>
          <div style={{ width: 440, maxWidth: '92%', background: '#FFFFFF', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 12px 36px rgba(0,0,0,0.2)', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem' }}>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>Submit / Forward Report</div>
              <button onClick={() => setShowSubmitModal(false)} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 2 }} title="Close">
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <form onSubmit={handleSubmitReport}>
              <div style={{ marginBottom: '0.85rem', background: '#F8FAFC', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '0.72rem', color: '#64748B' }}>Report:</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A' }}>{selectedReportDetails.name}</div>
              </div>

              <div style={{ marginBottom: '0.85rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>Submit To Authority / Agency:</label>
                <select value={subTarget} onChange={(e) => setSubTarget(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.8rem', color: '#0F172A', outline: 'none' }}>
                  <option value="Municipal Commissioner & Directorate">Municipal Commissioner & Directorate</option>
                  <option value="Bengaluru Traffic Police (BTP) Command">Bengaluru Traffic Police (BTP) Command</option>
                  <option value="BBMP Disaster Management Cell">BBMP Disaster Management Cell</option>
                  <option value="BMRCL Metro Operations Control">BMRCL Metro Operations Control</option>
                  <option value="BMTC Dispatch Directorate">BMTC Dispatch Directorate</option>
                </select>
              </div>

              <div style={{ marginBottom: '1.1rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>Submission Notes:</label>
                <textarea rows={3} value={subNotes} onChange={(e) => setSubNotes(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.8rem', color: '#0F172A', outline: 'none', resize: 'none' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" onClick={() => setShowSubmitModal(false)} style={{ padding: '0.45rem 1rem', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, color: '#475569', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={subLoading} style={{ padding: '0.45rem 1.1rem', background: '#059669', border: 'none', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, color: '#FFFFFF', cursor: 'pointer' }}>{subLoading ? 'Submitting...' : 'Submit Report'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
