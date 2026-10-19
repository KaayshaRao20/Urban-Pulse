import React, { useState, useEffect, useRef } from 'react';
import { API_BASE } from '../config/api';

export default function GrievanceManagementView({ initialTicketId }) {
  // Data States
  const [complaints, setComplaints] = useState([]);
  const [selectedTicketId, setSelectedTicketId] = useState(initialTicketId || null);
  const [dossier, setDossier] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterUrgency, setFilterUrgency] = useState('all');

  // Interactive Modals
  const [activeModal, setActiveModal] = useState(null); // 'assign', 'dispatch', 'resolve', 'reject', 'reopen', 'preview_img'
  const [modalData, setModalData] = useState({});
  const [previewImgUrl, setPreviewImgUrl] = useState('');

  // Mini Map ref for dossier
  const dossierMapRef = useRef(null);
  const dossierMapInst = useRef(null);
  const dossierMarkerRef = useRef(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Auth header config for authority requests
  const authHeaders = {
    'Content-Type': 'application/json',
    'X-Authority-Role': 'officer',
    'X-Authority-Actor': 'Municipal Duty Officer (Control 01)'
  };

  // Handle external initialTicketId change
  useEffect(() => {
    if (initialTicketId) {
      setSelectedTicketId(initialTicketId);
      loadDossier(initialTicketId);
    }
  }, [initialTicketId]);

  // Fetch metrics & list
  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [metricsRes, listRes, deptsRes] = await Promise.all([
        fetch(`${API_BASE}/grievances/authority/metrics`, { headers: authHeaders }),
        fetch(`${API_BASE}/grievances/authority/list?limit=100`, { headers: authHeaders }),
        fetch(`${API_BASE}/grievances/departments`)
      ]);

      if (metricsRes.ok) {
        const m = await metricsRes.json();
        setMetrics(m);
      }

      if (listRes.ok) {
        const l = await listRes.json();
        setComplaints(l.grievances || []);
        const targetId = initialTicketId || selectedTicketId;
        if (targetId) {
          loadDossier(targetId);
        } else if (l.grievances && l.grievances.length > 0) {
          loadDossier(l.grievances[0].ticket_number);
        }
      }

      if (deptsRes.ok) {
        const d = await deptsRes.json();
        setDepartments(d.departments || []);
      }
    } catch (e) {
      console.warn("Failed fetching grievance authority data:", e);
    } finally {
      setLoading(false);
    }
  };

  // Fetch detailed single ticket dossier
  const loadDossier = async (ticketId) => {
    setSelectedTicketId(ticketId);
    try {
      const res = await fetch(`${API_BASE}/grievances/authority/${ticketId}`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setDossier(data);
      }
    } catch (e) {
      console.warn("Failed fetching dossier for", ticketId, e);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Update dossier mini map when ticket changes
  useEffect(() => {
    if (!dossier || !dossier.complaint || !window.L || !dossierMapRef.current) return;

    const lat = dossier.complaint.latitude;
    const lng = dossier.complaint.longitude;

    if (!lat || !lng) return;

    if (!dossierMapInst.current) {
      const map = window.L.map(dossierMapRef.current, {
        zoomControl: true,
        attributionControl: false
      }).setView([lat, lng], 14);

      window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(map);

      const pinIcon = window.L.divIcon({
        html: `<div style="width:26px; height:26px; border-radius:50%; background:#EF4444; border:3px solid white; box-shadow:0 3px 10px rgba(0,0,0,0.35); display:flex; align-items:center; justify-content:center;">
          <div style="width:8px; height:8px; border-radius:50%; background:white;"></div>
        </div>`,
        className: 'custom-map-pin',
        iconSize: [26, 26],
        iconAnchor: [13, 13]
      });

      const marker = window.L.marker([lat, lng], { icon: pinIcon }).addTo(map);
      dossierMapInst.current = map;
      dossierMarkerRef.current = marker;
    } else {
      dossierMapInst.current.setView([lat, lng], 14);
      dossierMarkerRef.current.setLatLng([lat, lng]);
      setTimeout(() => dossierMapInst.current?.invalidateSize(), 150);
    }
  }, [dossier]);

  // Status transitions
  const handleReview = async () => {
    if (!selectedTicketId) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/grievances/authority/${selectedTicketId}/review`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ notes: 'Verified location and hazard profile. Ready for squad allocation.' })
      });
      if (res.ok) {
        showToast(`Complaint ${selectedTicketId} moved to Under Review`);
        fetchAllData();
        loadDossier(selectedTicketId);
      }
    } catch (e) {
      showToast('Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTicketId) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/grievances/authority/${selectedTicketId}/assign`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          department: modalData.department || departments[0]?.name,
          squad: modalData.squad,
          officer: modalData.officer || 'Supervising Ward Engineer',
          notes: modalData.notes
        })
      });
      if (res.ok) {
        showToast(`Complaint assigned to ${modalData.department || departments[0]?.name}`);
        setActiveModal(null);
        setModalData({});
        fetchAllData();
        loadDossier(selectedTicketId);
      }
    } catch (e) {
      showToast('Assignment failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDispatchSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTicketId) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/grievances/authority/${selectedTicketId}/dispatch`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          squad: modalData.squad || 'Rapid Response Squad Alpha',
          eta: modalData.eta || '30-45 Minutes',
          instructions: modalData.instructions || 'Mobilize immediate repair equipment.'
        })
      });
      if (res.ok) {
        showToast(`Field Crew Dispatched with ETA ${modalData.eta || '30-45 Minutes'}`);
        setActiveModal(null);
        setModalData({});
        fetchAllData();
        loadDossier(selectedTicketId);
      }
    } catch (e) {
      showToast('Dispatch failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleInProgress = async () => {
    if (!selectedTicketId) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/grievances/authority/${selectedTicketId}/in-progress`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ notes: 'Field crew arrived on site. Perimeter cordoned; repair work commenced.' })
      });
      if (res.ok) {
        showToast(`Complaint ${selectedTicketId} is now In Progress`);
        fetchAllData();
        loadDossier(selectedTicketId);
      }
    } catch (e) {
      showToast('Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolveSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTicketId) return;
    setActionLoading(true);
    try {
      const form = new FormData();
      form.append('resolution_notes', modalData.resolution_notes || 'Civil remediation completed to municipal code standards.');
      if (modalData.resolution_file) {
        form.append('resolution_image', modalData.resolution_file);
      }

      const res = await fetch(`${API_BASE}/grievances/authority/${selectedTicketId}/resolve`, {
        method: 'POST',
        headers: {
          'X-Authority-Role': 'officer',
          'X-Authority-Actor': 'Municipal Duty Officer'
        },
        body: form
      });
      if (res.ok) {
        showToast(`Complaint ${selectedTicketId} marked as Resolved`);
        setActiveModal(null);
        setModalData({});
        fetchAllData();
        loadDossier(selectedTicketId);
      }
    } catch (e) {
      showToast('Resolution submission failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTicketId) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/grievances/authority/${selectedTicketId}/reject`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          reason: modalData.reject_reason || 'Out of jurisdiction / duplicate report.'
        })
      });
      if (res.ok) {
        showToast(`Complaint ${selectedTicketId} rejected`);
        setActiveModal(null);
        setModalData({});
        fetchAllData();
        loadDossier(selectedTicketId);
      }
    } catch (e) {
      showToast('Rejection failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReopenSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTicketId) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/grievances/authority/${selectedTicketId}/reopen`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          reason: modalData.reopen_reason || 'Supervisor review indicates secondary patch required.',
          target_department: modalData.target_department
        })
      });
      if (res.ok) {
        showToast(`Complaint ${selectedTicketId} reopened for secondary intervention`);
        setActiveModal(null);
        setModalData({});
        fetchAllData();
        loadDossier(selectedTicketId);
      }
    } catch (e) {
      showToast('Reopen failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Filter complaints
  const filteredComplaints = complaints.filter(c => {
    if (filterCategory !== 'all' && !c.category?.toLowerCase().includes(filterCategory.toLowerCase())) return false;
    if (filterStatus !== 'all' && c.status?.toLowerCase() !== filterStatus.toLowerCase()) return false;
    if (filterDepartment !== 'all' && !c.assigned_department?.toLowerCase().includes(filterDepartment.toLowerCase())) return false;
    if (filterUrgency !== 'all' && c.urgency?.toLowerCase() !== filterUrgency.toLowerCase()) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match = c.ticket_number?.toLowerCase().includes(q)
        || c.title?.toLowerCase().includes(q)
        || c.description?.toLowerCase().includes(q)
        || c.landmark_address?.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const getUrgencyBadge = (urgency) => {
    switch (urgency) {
      case 'Critical': return { bg: 'rgba(239, 68, 68, 0.16)', color: '#FCA5A5', border: 'rgba(239, 68, 68, 0.35)' };
      case 'High': return { bg: 'rgba(245, 158, 11, 0.16)', color: '#FCD34D', border: 'rgba(245, 158, 11, 0.35)' };
      case 'Moderate': return { bg: 'rgba(59, 130, 246, 0.16)', color: '#93C5FD', border: 'rgba(59, 130, 246, 0.35)' };
      default: return { bg: 'rgba(148, 163, 184, 0.14)', color: '#334155', border: 'rgba(148, 163, 184, 0.25)' };
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Submitted': return { bg: '#F1F5F9', border: '#CBD5E1', color: '#475569', dot: '#64748B' };
      case 'Under Review': return { bg: '#FEF3C7', border: '#FDE68A', color: '#92400E', dot: '#D97706' };
      case 'Assigned': return { bg: '#EFF6FF', border: '#BFDBFE', color: '#1D4ED8', dot: '#2563EB' };
      case 'Crew Dispatched':
      case 'Field Squad Dispatched': return { bg: '#EFF6FF', border: '#BFDBFE', color: '#1D4ED8', dot: '#2563EB' };
      case 'In Progress': return { bg: '#EFF6FF', border: '#BFDBFE', color: '#1E40AF', dot: '#2563EB' };
      case 'Resolved': return { bg: '#ECFDF5', border: '#A7F3D0', color: '#047857', dot: '#059669' };
      case 'Rejected': return { bg: '#FEF2F2', border: '#FECACA', color: '#B91C1C', dot: '#DC2626' };
      case 'Reopened': return { bg: '#FFFBEB', border: '#FDE68A', color: '#B45309', dot: '#D97706' };
      default: return { bg: '#F1F5F9', border: '#CBD5E1', color: '#475569', dot: '#64748B' };
    }
  };

  const currentComplaint = dossier?.complaint || complaints.find(c => c.ticket_number === selectedTicketId);

  return (
    <div className="view-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          background: '#0F172A',
          color: '#FFFFFF',
          padding: '10px 18px',
          borderRadius: '10px',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.35)',
          backdropFilter: 'blur(16px)',
          zIndex: 99999,
          fontSize: '0.8rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          border: '1px solid #334155',
          animation: 'fadeIn 0.2s ease'
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981' }}></span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="glass-header-card" style={{ flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              background: 'rgba(37, 99, 235, 0.18)',
              color: '#60A5FA',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              fontSize: '0.68rem',
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: '6px',
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}>
              Authority Console
            </span>
            <h1 className="page-title" style={{ fontSize: '1.25rem', margin: 0, color: '#0F172A' }}>
              Civic Grievance Management & Field Dispatch
            </h1>
          </div>
          <p className="page-subtitle" style={{ margin: '3px 0 0 0', color: '#64748B' }}>
            Inter-agency triage, squad dispatch, and resolution verification network for BBMP, BWSSB, BESCOM, and BTP.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={fetchAllData}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#F1F5F9',
              border: '1px solid #CBD5E1',
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: '#0F172A',
              cursor: 'pointer',
              transition: 'background 0.15s ease'
            }}
            title="Refresh All Complaints & Metrics"
          >
            <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" strokeWidth="2.5">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            <span>Sync Data</span>
          </button>
        </div>
      </div>

      {/* Top Municipal KPI Metric Ribbons */}
      {metrics && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '10px',
          marginTop: '0.85rem'
        }}>
          <div className="glass-panel" style={{ padding: '10px 12px' }}>
            <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600 }}>Total Complaints</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
              {metrics.total_complaints}
            </div>
            <div style={{ fontSize: '0.65rem', color: '#059669', marginTop: '2px', fontWeight: 600 }}>
              Across 8 BBMP Zones
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '10px 12px' }}>
            <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600 }}>Awaiting Assignment</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#D97706', marginTop: '2px' }}>
              {metrics.awaiting_assignment_count}
            </div>
            <div style={{ fontSize: '0.65rem', color: '#D97706', marginTop: '2px', fontWeight: 600 }}>
              {metrics.submitted_count} New &bull; {metrics.under_review_count} In Review
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '10px 12px' }}>
            <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600 }}>Active in Field</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#2563EB', marginTop: '2px' }}>
              {metrics.active_field_count}
            </div>
            <div style={{ fontSize: '0.65rem', color: '#2563EB', marginTop: '2px', fontWeight: 600 }}>
              {metrics.dispatched_count} Dispatched &bull; {metrics.in_progress_count} Repairing
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '10px 12px' }}>
            <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600 }}>Resolved & Closed</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#059669', marginTop: '2px' }}>
              {metrics.resolved_count}
            </div>
            <div style={{ fontSize: '0.65rem', color: '#059669', marginTop: '2px', fontWeight: 600 }}>
              SLA Compliance: {metrics.sla_compliance_pct}%
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '10px 12px' }}>
            <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600 }}>Escalated / Reopened</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#DC2626', marginTop: '2px' }}>
              {metrics.reopened_count}
            </div>
            <div style={{ fontSize: '0.65rem', color: '#64748B', marginTop: '2px' }}>
              {metrics.rejected_count} Rejected / Non-Jurisdictional
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '10px 12px' }}>
            <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600 }}>Avg Resolution Time</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
              {metrics.avg_resolution_hours}h
            </div>
            <div style={{ fontSize: '0.65rem', color: '#64748B', marginTop: '2px' }}>
              Response: {metrics.avg_response_hours}h
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Toolbar */}
      <div className="glass-panel" style={{ padding: '10px 14px', marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
          <input
            type="text"
            placeholder="Filter ticket, landmark, title, or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '7px 12px',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              fontSize: '0.78rem',
              color: '#0F172A',
              background: '#FFFFFF'
            }}
          />
        </div>

        {/* Status Filter */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ padding: '7px 10px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '0.76rem', color: '#0F172A', background: '#FFFFFF' }}
        >
          <option value="all">All Statuses</option>
          <option value="Submitted">Submitted (New)</option>
          <option value="Under Review">Under Review</option>
          <option value="Assigned">Assigned</option>
          <option value="Crew Dispatched">Crew Dispatched</option>
          <option value="In Progress">In Progress</option>
          <option value="Resolved">Resolved</option>
          <option value="Rejected">Rejected</option>
          <option value="Reopened">Reopened</option>
        </select>

        {/* Category Filter */}
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          style={{ padding: '7px 10px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '0.76rem', color: '#0F172A', background: '#FFFFFF' }}
        >
          <option value="all">All Categories</option>
          <option value="Pothole">Pothole / Road Damage</option>
          <option value="Garbage">Garbage / Solid Waste</option>
          <option value="Water Leakage">Water Leakage</option>
          <option value="Drainage">Drainage & Flooding</option>
          <option value="Streetlight">Streetlight Failure</option>
          <option value="Traffic Hazard">Traffic Hazard</option>
          <option value="Other">Other Civic Issue</option>
        </select>

        {/* Department Filter */}
        <select
          value={filterDepartment}
          onChange={(e) => setFilterDepartment(e.target.value)}
          style={{ padding: '7px 10px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '0.76rem', color: '#0F172A', background: '#FFFFFF' }}
        >
          <option value="all">All Departments</option>
          {departments.map(d => (
            <option key={d.id} value={d.name}>{d.name}</option>
          ))}
        </select>

        {/* Urgency Filter */}
        <select
          value={filterUrgency}
          onChange={(e) => setFilterUrgency(e.target.value)}
          style={{ padding: '7px 10px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '0.76rem', color: '#0F172A', background: '#FFFFFF' }}
        >
          <option value="all">All Urgency</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Moderate">Moderate</option>
          <option value="Low">Low</option>
        </select>

        <button
          onClick={() => {
            setSearchQuery('');
            setFilterCategory('all');
            setFilterStatus('all');
            setFilterDepartment('all');
            setFilterUrgency('all');
          }}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#60A5FA',
            fontSize: '0.74rem',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          Reset Filters
        </button>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grievance-main-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(330px, 390px) 1fr',
        gap: '16px',
        marginTop: '1rem',
        alignItems: 'start'
      }}>
        {/* LEFT COLUMN: Complaint Feed List */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          maxHeight: 'calc(100vh - 270px)',
          overflowY: 'auto',
          paddingRight: '4px'
        }}>
          {filteredComplaints.length === 0 ? (
            <div className="glass-panel" style={{ padding: '30px', textAlign: 'center', color: '#64748B', fontSize: '0.8rem' }}>
              No civic complaints match the selected filter criteria.
            </div>
          ) : (
            filteredComplaints.map(c => {
              const isSelected = c.ticket_number === selectedTicketId;
              const urg = getUrgencyBadge(c.urgency);
              const sta = getStatusBadge(c.status);

              return (
                <div
                  key={c.ticket_number}
                  onClick={() => loadDossier(c.ticket_number)}
                  style={{
                    background: isSelected ? 'rgba(37, 99, 235, 0.08)' : '#FFFFFF',
                    border: isSelected ? '2px solid #2563EB' : '1px solid #E2E8F0',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? '0 2px 8px rgba(37, 99, 235, 0.15)' : '0 1px 3px rgba(0,0,0,0.05)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        color: '#0F172A',
                        background: '#F1F5F9',
                        padding: '1px 6px',
                        borderRadius: '4px'
                      }}>
                        {c.ticket_number}
                      </span>
                      <span style={{
                        fontSize: '0.66rem',
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: urg.bg,
                        color: urg.color,
                        border: `1px solid ${urg.border}`
                      }}>
                        {c.urgency}
                      </span>
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      color: sta.color,
                      background: sta.bg,
                      padding: '2px 7px',
                      borderRadius: '10px'
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: sta.dot }}></span>
                      <span>{c.status}</span>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0F172A', marginBottom: 4, lineHeight: 1.3 }}>
                    {c.title}
                  </div>

                  <div style={{ fontSize: '0.72rem', color: '#64748B', marginBottom: 8, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" fill="none" strokeWidth="2">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                    </svg>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '270px' }}>
                      {c.landmark_address || c.ward_zone}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #E2E8F0', paddingTop: 6, fontSize: '0.68rem', color: '#64748B' }}>
                    <span>{c.assigned_department || c.assigned_authority || 'Triage Required'}</span>
                    <span>{c.created_at?.split(' ')[0]}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* RIGHT COLUMN: Selected Complaint Officer Dossier */}
        {currentComplaint ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Top Dossier Header Card */}
            <div className="glass-panel" style={{ padding: '16px 20px', background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 4 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>
                      {currentComplaint.ticket_number}
                    </span>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      background: getStatusBadge(currentComplaint.status).bg,
                      color: getStatusBadge(currentComplaint.status).color
                    }}>
                      {currentComplaint.status}
                    </span>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      background: getUrgencyBadge(currentComplaint.urgency).bg,
                      color: getUrgencyBadge(currentComplaint.urgency).color
                    }}>
                      {currentComplaint.urgency} Urgency
                    </span>
                  </div>
                  <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: '4px 0 2px 0' }}>
                    {currentComplaint.title}
                  </h2>
                  <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
                    Category: <strong style={{ color: '#0F172A' }}>{currentComplaint.category}</strong> &bull; Target SLA: <strong style={{ color: '#6EE7B7' }}>Within {currentComplaint.sla_hours}h</strong>
                  </div>
                </div>

                {/* Workflow Operational Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {currentComplaint.status === 'Submitted' && (
                    <button
                      onClick={handleReview}
                      disabled={actionLoading}
                      style={{
                        background: '#F1F5F9',
                        color: '#0F172A',
                        border: '1px solid #CBD5E1',
                        padding: '7px 14px',
                        borderRadius: '8px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Verify & Review
                    </button>
                  )}

                  {(currentComplaint.status === 'Submitted' || currentComplaint.status === 'Under Review' || currentComplaint.status === 'Reopened') && (
                    <button
                      onClick={() => {
                        setModalData({
                          department: currentComplaint.assigned_department || departments[0]?.name,
                          squad: departments[0]?.squads?.[0]?.name || ''
                        });
                        setActiveModal('assign');
                      }}
                      style={{
                        background: '#2563EB',
                        color: '#FFFFFF',
                        border: 'none',
                        padding: '7px 14px',
                        borderRadius: '8px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Assign Department & Squad
                    </button>
                  )}

                  {currentComplaint.status === 'Assigned' && (
                    <button
                      onClick={() => {
                        setModalData({
                          squad: currentComplaint.assigned_squad || 'Rapid Response Squad',
                          eta: '30-45 Minutes'
                        });
                        setActiveModal('dispatch');
                      }}
                      style={{
                        background: '#1D4ED8',
                        color: '#FFFFFF',
                        border: 'none',
                        padding: '7px 14px',
                        borderRadius: '8px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Dispatch Field Squad
                    </button>
                  )}

                  {(currentComplaint.status === 'Crew Dispatched' || currentComplaint.status === 'Field Squad Dispatched') && (
                    <button
                      onClick={handleInProgress}
                      disabled={actionLoading}
                      style={{
                        background: '#0284C7',
                        color: '#FFFFFF',
                        border: 'none',
                        padding: '7px 14px',
                        borderRadius: '8px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Mark In Progress (Arrival)
                    </button>
                  )}

                  {(currentComplaint.status === 'In Progress' || currentComplaint.status === 'Crew Dispatched' || currentComplaint.status === 'Field Squad Dispatched') && (
                    <button
                      onClick={() => {
                        setModalData({ resolution_notes: 'Remediation completed to municipal specifications.' });
                        setActiveModal('resolve');
                      }}
                      style={{
                        background: '#059669',
                        color: '#FFFFFF',
                        border: 'none',
                        padding: '7px 14px',
                        borderRadius: '8px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Resolve & Close Ticket
                    </button>
                  )}

                  {currentComplaint.status !== 'Resolved' && currentComplaint.status !== 'Rejected' && (
                    <button
                      onClick={() => {
                        setModalData({ reject_reason: 'Non-jurisdictional private property or duplicate entry.' });
                        setActiveModal('reject');
                      }}
                      style={{
                        background: 'rgba(239, 68, 68, 0.12)',
                        color: '#FCA5A5',
                        border: '1px solid rgba(239, 68, 68, 0.35)',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Reject
                    </button>
                  )}

                  {(currentComplaint.status === 'Resolved' || currentComplaint.status === 'Rejected') && (
                    <button
                      onClick={() => {
                        setModalData({ reopen_reason: 'Secondary patch or verification required.' });
                        setActiveModal('reopen');
                      }}
                      style={{
                        background: '#FFFBEB',
                        color: '#B45309',
                        border: '1px solid #FDE68A',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Reopen Complaint
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Middle Grid: Description & Contact + Map & Photos */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: '14px' }}>
              {/* Left Column: Complaint Details & Citizen Contact */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="glass-panel" style={{ padding: '14px 16px', background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
                  <h3 style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0F172A', margin: '0 0 8px 0' }}>
                    Incident Description & Supporting Context
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#334155', lineHeight: 1.5, margin: 0 }}>
                    {currentComplaint.description}
                  </p>

                  {currentComplaint.dispatch_notes && (
                    <div style={{ marginTop: '10px', background: '#EFF6FF', padding: '10px', borderRadius: '8px', border: '1px solid #BFDBFE', fontSize: '0.76rem' }}>
                      <strong style={{ color: '#1D4ED8' }}>Field Dispatch Directive:</strong>
                      <div style={{ color: '#1E3A8A', marginTop: 2 }}>{currentComplaint.dispatch_notes}</div>
                      {currentComplaint.dispatch_eta && (
                        <div style={{ marginTop: 4, fontWeight: 700, color: '#2563EB' }}>ETA: {currentComplaint.dispatch_eta}</div>
                      )}
                    </div>
                  )}

                  {currentComplaint.resolution_notes && (
                    <div style={{ marginTop: '10px', background: '#ECFDF5', padding: '10px', borderRadius: '8px', border: '1px solid #A7F3D0', fontSize: '0.76rem' }}>
                      <strong style={{ color: '#047857' }}>Official Resolution Closure:</strong>
                      <div style={{ color: '#065F46', marginTop: 2 }}>{currentComplaint.resolution_notes}</div>
                    </div>
                  )}

                  {currentComplaint.rejection_reason && (
                    <div style={{ marginTop: '10px', background: '#FEF2F2', padding: '10px', borderRadius: '8px', border: '1px solid #FECACA', fontSize: '0.76rem' }}>
                      <strong style={{ color: '#B91C1C' }}>Rejection Rationale:</strong>
                      <div style={{ color: '#991B1B', marginTop: 2 }}>{currentComplaint.rejection_reason}</div>
                    </div>
                  )}

                  {currentComplaint.reopen_reason && (
                    <div style={{ marginTop: '10px', background: '#FFFBEB', padding: '10px', borderRadius: '8px', border: '1px solid #FDE68A', fontSize: '0.76rem' }}>
                      <strong style={{ color: '#B45309' }}>Reopen Rationale (Count: {currentComplaint.reopen_count}):</strong>
                      <div style={{ color: '#92400E', marginTop: 2 }}>{currentComplaint.reopen_reason}</div>
                    </div>
                  )}
                </div>

                {/* Citizen Contact Card */}
                <div className="glass-panel" style={{ padding: '14px 16px', background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <h3 style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                      Citizen Reporting Profile
                    </h3>
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      padding: '1px 6px',
                      borderRadius: '4px',
                      background: currentComplaint.is_anonymous ? 'rgba(148, 163, 184, 0.14)' : 'rgba(16, 185, 129, 0.15)',
                      color: currentComplaint.is_anonymous ? '#94A3B8' : '#6EE7B7'
                    }}>
                      {currentComplaint.is_anonymous ? 'Anonymous Lodging' : 'Identified Citizen'}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.76rem' }}>
                    <div>
                      <span style={{ color: '#64748B' }}>Citizen Name:</span>
                      <div style={{ fontWeight: 700, color: '#0F172A' }}>{currentComplaint.citizen_name || 'Anonymous'}</div>
                    </div>
                    <div>
                      <span style={{ color: '#64748B' }}>Contact Phone:</span>
                      <div style={{ fontWeight: 700, color: '#0F172A' }}>{currentComplaint.citizen_phone || 'Not Supplied'}</div>
                    </div>
                    <div>
                      <span style={{ color: '#64748B' }}>Contact Email:</span>
                      <div style={{ fontWeight: 700, color: '#0F172A' }}>{currentComplaint.citizen_email || 'Not Supplied'}</div>
                    </div>
                    <div>
                      <span style={{ color: '#64748B' }}>Assigned Department:</span>
                      <div style={{ fontWeight: 700, color: '#60A5FA' }}>{currentComplaint.assigned_department || 'Pending Assignment'}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: GIS Location & Attached Photographs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="glass-panel" style={{ padding: '14px 16px', background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <h3 style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                      Geotagged Pinpoint & Coordinates
                    </h3>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: '#64748B' }}>
                      {currentComplaint.latitude?.toFixed(4)}, {currentComplaint.longitude?.toFixed(4)}
                    </span>
                  </div>

                  <div
                    ref={dossierMapRef}
                    style={{
                      width: '100%',
                      height: 160,
                      borderRadius: '8px',
                      overflow: 'hidden',
                      border: '1px solid #E2E8F0',
                      marginBottom: '8px'
                    }}
                  />
                  <div style={{ fontSize: '0.72rem', color: '#64748B', lineHeight: 1.35 }}>
                    <strong style={{ color: '#334155' }}>Landmark:</strong> {currentComplaint.landmark_address || 'Unspecified'} ({currentComplaint.ward_zone || 'Bengaluru'})
                  </div>
                </div>

                {/* Photo Previews */}
                <div className="glass-panel" style={{ padding: '14px 16px', background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
                  <h3 style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0F172A', margin: '0 0 8px 0' }}>
                    Photographic Verification
                  </h3>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B' }}>Citizen Incident Evidence</span>
                      {currentComplaint.image_url ? (
                        <div
                          onClick={() => {
                            setPreviewImgUrl(currentComplaint.image_url);
                            setActiveModal('preview_img');
                          }}
                          style={{
                            marginTop: 4,
                            borderRadius: '8px',
                            overflow: 'hidden',
                            height: 110,
                            border: '1px solid #E2E8F0',
                            cursor: 'pointer'
                          }}
                        >
                          <img
                            src={currentComplaint.image_url}
                            alt="Incident Evidence"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                      ) : (
                        <div style={{ height: 110, background: '#FFFFFF', border: '1px dashed #CBD5E1', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', color: '#64748B', marginTop: 4 }}>
                          No image submitted
                        </div>
                      )}
                    </div>

                    <div>
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B' }}>Resolution Proof Photo</span>
                      {currentComplaint.resolution_image_url ? (
                        <div
                          onClick={() => {
                            setPreviewImgUrl(currentComplaint.resolution_image_url);
                            setActiveModal('preview_img');
                          }}
                          style={{
                            marginTop: 4,
                            borderRadius: '8px',
                            overflow: 'hidden',
                            height: 110,
                            border: '1px solid #10B981',
                            cursor: 'pointer'
                          }}
                        >
                          <img
                            src={currentComplaint.resolution_image_url}
                            alt="Resolution Proof"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                      ) : (
                        <div style={{ height: 110, background: '#FFFFFF', border: '1px dashed #CBD5E1', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', color: '#64748B', marginTop: 4 }}>
                          Awaiting closure photo
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Audit Trail & Outbound Notifications */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '14px' }}>
              {/* Audit Trail Stepper */}
              <div className="glass-panel" style={{ padding: '14px 16px', background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
                <h3 style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0F172A', margin: '0 0 10px 0' }}>
                  Chronological Municipal Audit Trail
                </h3>
                {(!dossier?.history || dossier.history.length === 0) ? (
                  <div style={{ fontSize: '0.75rem', color: '#64748B' }}>No historical entries recorded.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {dossier.history.map((h, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px',
                          borderLeft: '2px solid #CBD5E1',
                          paddingLeft: '12px',
                          position: 'relative'
                        }}
                      >
                        <div style={{
                          position: 'absolute',
                          left: -5,
                          top: 4,
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: '#3B82F6'
                        }}></div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <strong style={{ fontSize: '0.76rem', color: '#0F172A' }}>
                              {h.action} &rarr; {h.new_status}
                            </strong>
                            <span style={{ fontSize: '0.66rem', color: '#64748B', fontFamily: 'var(--font-mono)' }}>
                              {h.timestamp}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: 2 }}>
                            By <strong style={{ color: '#334155' }}>{h.actor_name}</strong> ({h.actor_role})
                          </div>
                          {h.notes && (
                            <div style={{ fontSize: '0.72rem', color: '#334155', background: '#FFFFFF', border: '1px solid #E2E8F0', padding: '4px 8px', borderRadius: '4px', marginTop: 4 }}>
                              {h.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notifications Dispatched */}
              <div className="glass-panel" style={{ padding: '14px 16px', background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
                <h3 style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0F172A', margin: '0 0 10px 0' }}>
                  Outbound Notification Log
                </h3>
                {(!dossier?.notifications || dossier.notifications.length === 0) ? (
                  <div style={{ fontSize: '0.75rem', color: '#64748B' }}>No notifications dispatched for this ticket.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {dossier.notifications.map((n, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: '#FFFFFF',
                          borderRadius: '8px',
                          padding: '8px 10px',
                          border: '1px solid #E2E8F0',
                          fontSize: '0.72rem'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong style={{ color: '#0F172A' }}>{n.subject}</strong>
                          <span style={{ fontSize: '0.64rem', color: '#6EE7B7', fontWeight: 700 }}>
                            {n.channel} &bull; {n.status}
                          </span>
                        </div>
                        <div style={{ color: '#334155', marginTop: 2 }}>{n.message}</div>
                        <div style={{ fontSize: '0.64rem', color: '#64748B', marginTop: 4 }}>
                          Recipient: {n.recipient_type} ({n.recipient_contact}) &bull; {n.sent_at}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', color: '#64748B', background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
            Select a civic complaint from the left panel to inspect the full officer dossier.
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* INTERACTIVE MODALS                                                  */}
      {/* =================================================================== */}

      {/* 1. Assign Department Modal */}
      {activeModal === 'assign' && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999
        }}>
          <div className="glass-panel" style={{ width: '480px', maxWidth: '90vw', padding: '24px', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', margin: '0 0 12px 0' }}>
              Assign Department & Field Squad
            </h3>

            <form onSubmit={handleAssignSubmit}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Responsible Department *
                </label>
                <select
                  value={modalData.department || departments[0]?.name}
                  onChange={(e) => {
                    const selectedD = departments.find(d => d.name === e.target.value);
                    setModalData({
                      ...modalData,
                      department: e.target.value,
                      squad: selectedD?.squads?.[0]?.name || ''
                    });
                  }}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#0F172A', fontSize: '0.8rem' }}
                >
                  {departments.map(d => (
                    <option key={d.id} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Designated Field Squad
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rapid Pothole Patch Unit Alpha"
                  value={modalData.squad || ''}
                  onChange={(e) => setModalData({ ...modalData, squad: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#0F172A', fontSize: '0.8rem' }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Supervisory Allocation Notes
                </label>
                <textarea
                  rows="3"
                  placeholder="Add triage notes or priority instructions for the squad..."
                  value={modalData.notes || ''}
                  onChange={(e) => setModalData({ ...modalData, notes: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#0F172A', fontSize: '0.8rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', color: '#334155', padding: '8px 16px', borderRadius: '8px', fontSize: '0.78rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{ background: '#2563EB', color: '#FFFFFF', border: 'none', padding: '8px 18px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Dispatch Squad Modal */}
      {activeModal === 'dispatch' && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999
        }}>
          <div className="glass-panel" style={{ width: '480px', maxWidth: '90vw', padding: '24px', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', margin: '0 0 12px 0' }}>
              Dispatch Field Squad & Vehicle
            </h3>

            <form onSubmit={handleDispatchSubmit}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Dispatched Field Squad *
                </label>
                <input
                  type="text"
                  value={modalData.squad || ''}
                  onChange={(e) => setModalData({ ...modalData, squad: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#0F172A', fontSize: '0.8rem' }}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Estimated On-Site Arrival (ETA) *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 25 Minutes, 1 Hour"
                  value={modalData.eta || ''}
                  onChange={(e) => setModalData({ ...modalData, eta: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#0F172A', fontSize: '0.8rem' }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Field Directive & Instructions
                </label>
                <textarea
                  rows="3"
                  placeholder="Specify equipment requirements (e.g. cold-mix asphalt, excavator, suction pump)..."
                  value={modalData.instructions || ''}
                  onChange={(e) => setModalData({ ...modalData, instructions: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#0F172A', fontSize: '0.8rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', color: '#334155', padding: '8px 16px', borderRadius: '8px', fontSize: '0.78rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{ background: '#1D4ED8', color: '#FFFFFF', border: 'none', padding: '8px 18px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  Issue Dispatch Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Resolve Complaint Modal */}
      {activeModal === 'resolve' && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999
        }}>
          <div className="glass-panel" style={{ width: '500px', maxWidth: '90vw', padding: '24px', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', margin: '0 0 12px 0' }}>
              Verify & Record Resolution Closure
            </h3>

            <form onSubmit={handleResolveSubmit}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Official Resolution Notes *
                </label>
                <textarea
                  rows="3"
                  required
                  placeholder="Describe repair actions taken, materials applied, and safety verification..."
                  value={modalData.resolution_notes || ''}
                  onChange={(e) => setModalData({ ...modalData, resolution_notes: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#0F172A', fontSize: '0.8rem' }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Attach Resolution Proof Photograph
                </label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => setModalData({ ...modalData, resolution_file: e.target.files[0] })}
                  style={{ fontSize: '0.78rem', color: '#334155' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', color: '#334155', padding: '8px 16px', borderRadius: '8px', fontSize: '0.78rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{ background: '#059669', color: '#FFFFFF', border: 'none', padding: '8px 18px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  Complete Resolution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Reject Complaint Modal */}
      {activeModal === 'reject' && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999
        }}>
          <div className="glass-panel" style={{ width: '480px', maxWidth: '90vw', padding: '24px', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#DC2626', margin: '0 0 12px 0' }}>
              Reject Complaint Ticket
            </h3>

            <form onSubmit={handleRejectSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Formal Rejection Rationale *
                </label>
                <textarea
                  rows="3"
                  required
                  placeholder="Specify why this complaint cannot be serviced (e.g. duplicate ticket, private residential compound, false alarm)..."
                  value={modalData.reject_reason || ''}
                  onChange={(e) => setModalData({ ...modalData, reject_reason: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#0F172A', fontSize: '0.8rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', color: '#334155', padding: '8px 16px', borderRadius: '8px', fontSize: '0.78rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{ background: '#DC2626', color: '#FFFFFF', border: 'none', padding: '8px 18px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Reopen Complaint Modal */}
      {activeModal === 'reopen' && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999
        }}>
          <div className="glass-panel" style={{ width: '480px', maxWidth: '90vw', padding: '24px', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', margin: '0 0 12px 0' }}>
              Supervisor Ticket Reopening
            </h3>

            <form onSubmit={handleReopenSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Reopening Rationale *
                </label>
                <textarea
                  rows="3"
                  required
                  placeholder="Detail grounds for reopening (e.g. secondary road cave-in, incomplete drain de-silting)..."
                  value={modalData.reopen_reason || ''}
                  onChange={(e) => setModalData({ ...modalData, reopen_reason: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#0F172A', fontSize: '0.8rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', color: '#334155', padding: '8px 16px', borderRadius: '8px', fontSize: '0.78rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{ background: '#2563EB', color: '#FFFFFF', border: 'none', padding: '8px 18px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  Reopen Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Image Preview Modal */}
      {activeModal === 'preview_img' && (
        <div
          onClick={() => setActiveModal(null)}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: '#FFFFFF',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            cursor: 'zoom-out'
          }}
        >
          <div style={{ maxWidth: '85vw', maxHeight: '85vh', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
            <img src={previewImgUrl} alt="Inspection Fullview" style={{ maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain', display: 'block' }} />
          </div>
        </div>
      )}
    </div>
  );
}
