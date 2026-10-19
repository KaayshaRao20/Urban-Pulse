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

  // Submenu Tab State: 'queue' (Grievance Queue & Triage) vs 'verified_issues' (Verified Civic Issues)
  const [activeSection, setActiveSection] = useState('queue');

  // Verified Civic Issues States
  const [verifiedIssues, setVerifiedIssues] = useState([]);
  const [verifiedCounts, setVerifiedCounts] = useState({
    total: 0,
    pending: 0,
    verified: 0,
    needs_review: 0,
    duplicate: 0,
    rejected: 0
  });
  const [verifiedLoading, setVerifiedLoading] = useState(false);
  const [vStatusFilter, setVStatusFilter] = useState('all');
  const [vCategoryFilter, setVCategoryFilter] = useState('all');
  const [vUrgencyFilter, setVUrgencyFilter] = useState('all');
  const [vWardFilter, setVWardFilter] = useState('all');
  const [vSearchQuery, setVSearchQuery] = useState('');

  // Verified Modals & Decisions
  const [selectedVerifiedIssue, setSelectedVerifiedIssue] = useState(null);
  const [verificationDecision, setVerificationDecision] = useState('Verified');
  const [verificationReason, setVerificationReason] = useState('');
  const [immediateDispatch, setImmediateDispatch] = useState(false);
  const [dispatchDept, setDispatchDept] = useState('BBMP Road Infrastructure Cell');
  const [dispatchSquad, setDispatchSquad] = useState('Rapid Response Squad Alpha');
  const [dispatchInstructions, setDispatchInstructions] = useState('');
  const [cvAssessing, setCvAssessing] = useState(false);

  // Duplicate Link Modal States
  const [linkTargetId, setLinkTargetId] = useState('');
  const [linkReason, setLinkReason] = useState('');

  // Mini Map ref for inspection modal
  const inspectMapRef = useRef(null);
  const inspectMapInst = useRef(null);

  // Interactive Modals
  const [activeModal, setActiveModal] = useState(null); // 'assign', 'dispatch', 'resolve', 'reject', 'reopen', 'preview_img', 'inspect_verify', 'link_duplicate'
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

  // Fetch verified civic issues from API
  const fetchVerifiedIssues = async () => {
    try {
      setVerifiedLoading(true);
      const params = new URLSearchParams();
      if (vStatusFilter !== 'all') params.append('status', vStatusFilter);
      if (vCategoryFilter !== 'all') params.append('category', vCategoryFilter);
      if (vUrgencyFilter !== 'all') params.append('urgency', vUrgencyFilter);
      if (vWardFilter !== 'all') params.append('ward', vWardFilter);
      if (vSearchQuery.trim()) params.append('search', vSearchQuery.trim());

      const queryStr = params.toString() ? `?${params.toString()}` : '';
      const res = await fetch(`${API_BASE}/grievances/verified-issues${queryStr}`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setVerifiedIssues(data.issues || []);
        if (data.counts) {
          setVerifiedCounts(data.counts);
        }
      }
    } catch (e) {
      console.warn("Failed fetching verified civic issues:", e);
    } finally {
      setVerifiedLoading(false);
    }
  };

  // Fetch metrics & list
  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [metricsRes, listRes, deptsRes] = await Promise.all([
        fetch(`${API_BASE}/grievances/authority/metrics`, { headers: authHeaders }),
        fetch(`${API_BASE}/grievances/authority/list?limit=100`, { headers: authHeaders }),
        fetch(`${API_BASE}/grievances/departments`),
        fetchVerifiedIssues()
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

  // Sync verified issues whenever its filters or section change
  useEffect(() => {
    if (activeSection === 'verified_issues') {
      fetchVerifiedIssues();
    }
  }, [vStatusFilter, vCategoryFilter, vUrgencyFilter, vWardFilter, vSearchQuery, activeSection]);

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

  // Interactive modal map for Verified Issues inspection
  useEffect(() => {
    if (activeModal !== 'inspect_verify' || !selectedVerifiedIssue || !window.L) {
      if (inspectMapInst.current) {
        inspectMapInst.current.remove();
        inspectMapInst.current = null;
      }
      return;
    }

    const lat = selectedVerifiedIssue.latitude;
    const lng = selectedVerifiedIssue.longitude;
    if (!lat || !lng) return;

    const timer = setTimeout(() => {
      if (!inspectMapRef.current) return;
      if (inspectMapInst.current) {
        inspectMapInst.current.remove();
        inspectMapInst.current = null;
      }

      try {
        const map = window.L.map(inspectMapRef.current, {
          zoomControl: true,
          attributionControl: false
        }).setView([lat, lng], 15);

        window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19
        }).addTo(map);

        let hasGeometry = false;
        if (selectedVerifiedIssue.road_geometry?.geometry?.coordinates) {
          try {
            const rawCoords = selectedVerifiedIssue.road_geometry.geometry.coordinates;
            const latLngs = rawCoords.map(c => [c[1], c[0]]);
            const poly = window.L.polyline(latLngs, {
              color: '#DC2626',
              weight: 6,
              opacity: 0.9,
              lineCap: 'round',
              lineJoin: 'round'
            }).addTo(map);
            poly.bindPopup(`<b>Verified Road Damage Corridor</b><br/>${selectedVerifiedIssue.road_geometry.properties?.road_name || 'Corridor'}`);
            map.fitBounds(poly.getBounds(), { padding: [25, 25] });
            hasGeometry = true;
          } catch (err) {
            console.warn("Error drawing polyline in modal:", err);
          }
        }

        const pinIcon = window.L.divIcon({
          html: `<div style="width:26px; height:26px; border-radius:50%; background:#DC2626; border:3px solid white; box-shadow:0 3px 10px rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center;">
            <div style="width:8px; height:8px; border-radius:50%; background:white;"></div>
          </div>`,
          className: 'custom-map-pin',
          iconSize: [26, 26],
          iconAnchor: [13, 13]
        });

        const marker = window.L.marker([lat, lng], { icon: pinIcon }).addTo(map);
        marker.bindPopup(`<b>${selectedVerifiedIssue.ticket_number}</b><br/>${selectedVerifiedIssue.title || selectedVerifiedIssue.category}`);

        if (!hasGeometry) {
          map.setView([lat, lng], 15);
        }

        inspectMapInst.current = map;
        setTimeout(() => map.invalidateSize(), 200);
      } catch (err) {
        console.warn("Error mounting Leaflet inspect map:", err);
      }
    }, 120);

    return () => {
      clearTimeout(timer);
      if (inspectMapInst.current) {
        inspectMapInst.current.remove();
        inspectMapInst.current = null;
      }
    };
  }, [activeModal, selectedVerifiedIssue]);

  const handleOpenInspect = (issue) => {
    setSelectedVerifiedIssue(issue);
    setVerificationDecision(
      ['Verified', 'Needs Review', 'Rejected'].includes(issue.verification_status)
        ? issue.verification_status
        : 'Verified'
    );
    setVerificationReason(issue.verification_reason || '');
    setImmediateDispatch(false);
    setDispatchDept(issue.assigned_department || 'BBMP Road Infrastructure Cell');
    setDispatchSquad('Rapid Response Squad Alpha');
    setDispatchInstructions('Mobilize crew to verified location for immediate containment and repair.');
    setActiveModal('inspect_verify');
  };

  const handleOpenLinkDuplicate = (issue, defaultTargetId = '') => {
    setSelectedVerifiedIssue(issue);
    const target = defaultTargetId || issue.duplicate_candidates?.[0]?.ticket_number || '';
    setLinkTargetId(target);
    setLinkReason(
      target
        ? `Identical civic defect confirmed at same location within active time window (${issue.duplicate_candidates?.[0]?.distance_meters ? Math.round(issue.duplicate_candidates[0].distance_meters) + 'm away' : 'proximate'}).`
        : ''
    );
    setActiveModal('link_duplicate');
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    if (!selectedVerifiedIssue) return;
    if (!verificationReason.trim() || verificationReason.trim().length < 5) {
      showToast('Please provide a descriptive verification rationale (at least 5 characters).');
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/grievances/authority/${selectedVerifiedIssue.ticket_number}/verify-evidence`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          decision: verificationDecision,
          reason: verificationReason.trim(),
          dispatch_now: immediateDispatch,
          department: dispatchDept,
          squad: dispatchSquad,
          instructions: dispatchInstructions
        })
      });
      if (res.ok) {
        const result = await res.json();
        showToast(result.message || `Evidence recorded as ${verificationDecision}`);
        setActiveModal(null);
        fetchVerifiedIssues();
        fetchAllData();
      } else {
        const err = await res.json();
        showToast(err.detail || 'Verification submission failed');
      }
    } catch (e) {
      showToast('Network error during verification');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLinkDuplicateSubmit = async (e) => {
    e.preventDefault();
    if (!selectedVerifiedIssue) return;
    if (!linkTargetId.trim()) {
      showToast('Please select or enter the primary complaint ID.');
      return;
    }
    if (!linkReason.trim()) {
      showToast('Please provide a justification for linking this duplicate.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/grievances/authority/${selectedVerifiedIssue.ticket_number}/link-duplicate`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          target_ticket_id: linkTargetId.trim().toUpperCase(),
          reason: linkReason.trim()
        })
      });
      if (res.ok) {
        const result = await res.json();
        showToast(result.message || `Successfully linked duplicate to ${linkTargetId}`);
        setActiveModal(null);
        fetchVerifiedIssues();
        fetchAllData();
      } else {
        const err = await res.json();
        showToast(err.detail || 'Failed to link duplicate');
      }
    } catch (e) {
      showToast('Network error linking duplicate');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRerunCV = async (ticketNumber) => {
    setCvAssessing(true);
    try {
      const res = await fetch(`${API_BASE}/grievances/authority/${ticketNumber}/assess-evidence`, {
        method: 'POST',
        headers: authHeaders
      });
      if (res.ok) {
        const data = await res.json();
        showToast(`CV Analysis Complete: ${data.evidence_assessment?.status} (${(data.evidence_assessment?.confidence_score * 100).toFixed(0)}% confidence)`);
        if (selectedVerifiedIssue && selectedVerifiedIssue.ticket_number === ticketNumber) {
          setSelectedVerifiedIssue(prev => ({
            ...prev,
            evidence_assessment: data.evidence_assessment
          }));
        }
        fetchVerifiedIssues();
      } else {
        showToast('Evidence assessment failed');
      }
    } catch (e) {
      showToast('Failed to connect to image analysis service');
    } finally {
      setCvAssessing(false);
    }
  };

  const getVerificationStatusBadge = (status) => {
    switch (status) {
      case 'Verified':
        return {
          bg: '#ECFDF5',
          border: '#A7F3D0',
          color: '#047857',
          dot: '#059669',
          label: 'Verified Evidence',
          icon: '✓'
        };
      case 'Needs Review':
        return {
          bg: '#FFFBEB',
          border: '#FDE68A',
          color: '#B45309',
          dot: '#D97706',
          label: 'Needs Officer Review',
          icon: '!'
        };
      case 'Duplicate':
        return {
          bg: '#F5F3FF',
          border: '#DDD6FE',
          color: '#6D28D9',
          dot: '#7C3AED',
          label: 'Duplicate Incident',
          icon: '⧉'
        };
      case 'Rejected':
        return {
          bg: '#FEF2F2',
          border: '#FECACA',
          color: '#B91C1C',
          dot: '#DC2626',
          label: 'Rejected',
          icon: '✕'
        };
      case 'Pending Verification':
      default:
        return {
          bg: '#EFF6FF',
          border: '#BFDBFE',
          color: '#1D4ED8',
          dot: '#2563EB',
          label: 'Pending Verification',
          icon: '⏱'
        };
    }
  };

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

      {/* Submenu Navigation Tabs */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginTop: '0.85rem',
        borderBottom: '1px solid #E2E8F0',
        paddingBottom: '2px'
      }}>
        <button
          onClick={() => setActiveSection('queue')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'none',
            border: 'none',
            borderBottom: activeSection === 'queue' ? '2.5px solid #2563EB' : '2.5px solid transparent',
            padding: '8px 16px',
            fontWeight: activeSection === 'queue' ? 700 : 500,
            color: activeSection === 'queue' ? '#2563EB' : '#64748B',
            fontSize: '0.84rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" fill="none" strokeWidth="2.2">
            <line x1="8" y1="6" x2="21" y2="6"></line>
            <line x1="8" y1="12" x2="21" y2="12"></line>
            <line x1="8" y1="18" x2="21" y2="18"></line>
            <line x1="3" y1="6" x2="3.01" y2="6"></line>
            <line x1="3" y1="12" x2="3.01" y2="12"></line>
            <line x1="3" y1="18" x2="3.01" y2="18"></line>
          </svg>
          <span>Grievance Queue & Triage</span>
          <span style={{
            background: activeSection === 'queue' ? '#EFF6FF' : '#F1F5F9',
            color: activeSection === 'queue' ? '#2563EB' : '#64748B',
            fontSize: '0.7rem',
            fontWeight: 700,
            padding: '2px 7px',
            borderRadius: '12px',
            border: '1px solid #CBD5E1'
          }}>
            {complaints.length}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveSection('verified_issues');
            fetchVerifiedIssues();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'none',
            border: 'none',
            borderBottom: activeSection === 'verified_issues' ? '2.5px solid #059669' : '2.5px solid transparent',
            padding: '8px 16px',
            fontWeight: activeSection === 'verified_issues' ? 700 : 500,
            color: activeSection === 'verified_issues' ? '#059669' : '#64748B',
            fontSize: '0.84rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" fill="none" strokeWidth="2.2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <span>Verified Civic Issues</span>
          <span style={{
            background: activeSection === 'verified_issues' ? '#ECFDF5' : '#F1F5F9',
            color: activeSection === 'verified_issues' ? '#059669' : '#64748B',
            fontSize: '0.7rem',
            fontWeight: 700,
            padding: '2px 7px',
            borderRadius: '12px',
            border: '1px solid #A7F3D0'
          }}>
            {verifiedCounts.verified ? `${verifiedCounts.verified} Verified` : `${verifiedCounts.total || 0} Reports`}
          </span>
        </button>
      </div>

      {activeSection === 'queue' && (
        <>
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
      </>
      )}

      {/* =================================================================== */}
      {/* VERIFIED CIVIC ISSUES FEATURE WORKSPACE                             */}
      {/* =================================================================== */}
      {activeSection === 'verified_issues' && (
        <div className="verified-civic-issues-workspace" style={{ marginTop: '0.85rem' }}>
          {/* Top Municipal KPI Metric Ribbons for Verified Issues */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '10px'
          }}>
            <div className="glass-panel" style={{ padding: '10px 12px', borderTop: '3px solid #64748B' }}>
              <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600 }}>Total Civic Reports</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
                {verifiedCounts.total}
              </div>
              <div style={{ fontSize: '0.65rem', color: '#64748B', marginTop: '2px', fontWeight: 500 }}>
                Across All City Sectors
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '10px 12px', borderTop: '3px solid #2563EB' }}>
              <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600 }}>Pending Verification</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#2563EB', marginTop: '2px' }}>
                {verifiedCounts.pending}
              </div>
              <div style={{ fontSize: '0.65rem', color: '#2563EB', marginTop: '2px', fontWeight: 600 }}>
                Awaiting Evidence Triage
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '10px 12px', borderTop: '3px solid #059669' }}>
              <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600 }}>Verified Civic Issues</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#059669', marginTop: '2px' }}>
                {verifiedCounts.verified}
              </div>
              <div style={{ fontSize: '0.65rem', color: '#059669', marginTop: '2px', fontWeight: 600 }}>
                Confirmed Defect Geometry
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '10px 12px', borderTop: '3px solid #D97706' }}>
              <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600 }}>Needs Review</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#D97706', marginTop: '2px' }}>
                {verifiedCounts.needs_review}
              </div>
              <div style={{ fontSize: '0.65rem', color: '#D97706', marginTop: '2px', fontWeight: 600 }}>
                Inconclusive Evidence
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '10px 12px', borderTop: '3px solid #7C3AED' }}>
              <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600 }}>Duplicate Submissions</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#7C3AED', marginTop: '2px' }}>
                {verifiedCounts.duplicate}
              </div>
              <div style={{ fontSize: '0.65rem', color: '#7C3AED', marginTop: '2px', fontWeight: 600 }}>
                Proximity / Temporal Matches
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '10px 12px', borderTop: '3px solid #DC2626' }}>
              <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600 }}>Rejected Reports</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#DC2626', marginTop: '2px' }}>
                {verifiedCounts.rejected}
              </div>
              <div style={{ fontSize: '0.65rem', color: '#64748B', marginTop: '2px', fontWeight: 500 }}>
                Excluded From Road Damage
              </div>
            </div>
          </div>

          {/* Quick Status Filter Pills Bar */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            marginTop: '0.85rem',
            alignItems: 'center'
          }}>
            {[
              { id: 'all', label: 'All Reports', count: verifiedCounts.total },
              { id: 'Pending Verification', label: 'Pending Verification', count: verifiedCounts.pending, color: '#2563EB' },
              { id: 'Verified', label: 'Verified Issues', count: verifiedCounts.verified, color: '#059669' },
              { id: 'Needs Review', label: 'Needs Review', count: verifiedCounts.needs_review, color: '#D97706' },
              { id: 'Duplicate', label: 'Duplicates', count: verifiedCounts.duplicate, color: '#7C3AED' },
              { id: 'Rejected', label: 'Rejected', count: verifiedCounts.rejected, color: '#DC2626' }
            ].map(tab => {
              const active = vStatusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setVStatusFilter(tab.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '0.74rem',
                    fontWeight: active ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    background: active ? '#0F172A' : '#FFFFFF',
                    color: active ? '#FFFFFF' : '#334155',
                    border: active ? '1px solid #0F172A' : '1px solid #CBD5E1',
                    boxShadow: active ? '0 2px 6px rgba(15,23,42,0.18)' : 'none'
                  }}
                >
                  <span>{tab.label}</span>
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    padding: '1px 6px',
                    borderRadius: '10px',
                    background: active ? 'rgba(255,255,255,0.22)' : '#F1F5F9',
                    color: active ? '#FFFFFF' : (tab.color || '#64748B')
                  }}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Filter and Search Toolbar */}
          <div className="glass-panel" style={{
            padding: '10px 14px',
            marginTop: '0.75rem',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px',
            alignItems: 'center'
          }}>
            <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
              <input
                type="text"
                placeholder="Search by ticket ID, landmark, road name, citizen description..."
                value={vSearchQuery}
                onChange={(e) => setVSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.78rem',
                  color: '#0F172A',
                  background: '#FFFFFF'
                }}
              />
            </div>

            {/* Category Filter */}
            <select
              value={vCategoryFilter}
              onChange={(e) => setVCategoryFilter(e.target.value)}
              style={{ padding: '7px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.76rem', color: '#0F172A', background: '#FFFFFF' }}
            >
              <option value="all">All Issue Categories</option>
              <option value="Pothole">Pothole / Road Damage</option>
              <option value="Garbage">Garbage / Solid Waste</option>
              <option value="Water Leakage">Water Leakage</option>
              <option value="Drainage">Drainage & Flooding</option>
              <option value="Streetlight">Streetlight Failure</option>
              <option value="Traffic Hazard">Traffic Hazard</option>
              <option value="Other">Other Civic Defect</option>
            </select>

            {/* Urgency Filter */}
            <select
              value={vUrgencyFilter}
              onChange={(e) => setVUrgencyFilter(e.target.value)}
              style={{ padding: '7px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.76rem', color: '#0F172A', background: '#FFFFFF' }}
            >
              <option value="all">All Urgency Levels</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Moderate">Moderate</option>
              <option value="Low">Low</option>
            </select>

            {/* Ward Filter */}
            <select
              value={vWardFilter}
              onChange={(e) => setVWardFilter(e.target.value)}
              style={{ padding: '7px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.76rem', color: '#0F172A', background: '#FFFFFF' }}
            >
              <option value="all">All Wards / Zones</option>
              <option value="Ward 85">Ward 85 (Doddanekkundi / Marathahalli)</option>
              <option value="Ward 150">Ward 150 (Bellandur / Sarjapur)</option>
              <option value="Ward 174">Ward 174 (HSR Layout)</option>
              <option value="Ward 112">Ward 112 (Domlur / Indiranagar)</option>
              <option value="Ward 160">Ward 160 (Rajarajeshwari Nagar)</option>
            </select>

            <button
              onClick={() => {
                setVSearchQuery('');
                setVCategoryFilter('all');
                setVUrgencyFilter('all');
                setVWardFilter('all');
                setVStatusFilter('all');
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#2563EB',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Reset Filters
            </button>

            <button
              onClick={fetchVerifiedIssues}
              disabled={verifiedLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                background: '#F1F5F9',
                border: '1px solid #CBD5E1',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.74rem',
                fontWeight: 600,
                color: '#0F172A',
                cursor: 'pointer'
              }}
              title="Sync Verified Civic Issues"
            >
              <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" fill="none" strokeWidth="2.5" style={{ animation: verifiedLoading ? 'spin 1s linear infinite' : 'none' }}>
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              <span>{verifiedLoading ? 'Syncing...' : 'Sync'}</span>
            </button>
          </div>

          {/* List of Verified Civic Reports */}
          <div style={{ marginTop: '0.85rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {verifiedIssues.length === 0 ? (
              <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: '#64748B', background: '#FFFFFF' }}>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>
                  No civic reports match your filter criteria
                </div>
                <p style={{ fontSize: '0.78rem', margin: 0 }}>
                  Adjust status, category, or search parameters to inspect reported issues.
                </p>
              </div>
            ) : (
              verifiedIssues.map(issue => {
                const staBadge = getVerificationStatusBadge(issue.verification_status);
                const urgBadge = getUrgencyBadge(issue.urgency);
                const cv = issue.evidence_assessment || {};
                const hasGeometry = Boolean(issue.road_geometry?.geometry?.coordinates);
                const hasDuplicates = issue.duplicate_candidates && issue.duplicate_candidates.length > 0;
                const isDuplicateLinked = issue.verification_status === 'Duplicate';

                return (
                  <div
                    key={issue.ticket_number}
                    className="glass-panel"
                    style={{
                      padding: '16px 18px',
                      background: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '12px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                      transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                      borderLeft: `4px solid ${staBadge.dot}`
                    }}
                  >
                    {/* Card Header Row */}
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      paddingBottom: '10px',
                      borderBottom: '1px solid #F1F5F9'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{
                          fontFamily: 'monospace',
                          fontSize: '0.82rem',
                          fontWeight: 800,
                          color: '#0F172A',
                          background: '#F1F5F9',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          border: '1px solid #CBD5E1'
                        }}>
                          {issue.ticket_number}
                        </span>

                        <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                          Submitted: <strong>{issue.timestamp}</strong>
                        </span>

                        <span style={{
                          fontSize: '0.7rem',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: '#F8FAFC',
                          color: '#475569',
                          border: '1px solid #E2E8F0',
                          fontWeight: 600
                        }}>
                          {issue.ward || 'BBMP Ward'} &bull; {issue.zone || 'Municipal Zone'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {/* Urgency Badge */}
                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          padding: '3px 9px',
                          borderRadius: '6px',
                          textTransform: 'uppercase',
                          background: urgBadge.bg,
                          color: urgBadge.color,
                          border: `1px solid ${urgBadge.border}`
                        }}>
                          {issue.urgency} Urgency
                        </span>

                        {/* Verification Status Pill */}
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '3px 10px',
                          borderRadius: '20px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          background: staBadge.bg,
                          color: staBadge.color,
                          border: `1px solid ${staBadge.border}`
                        }}>
                          <span>{staBadge.icon}</span>
                          <span>{staBadge.label}</span>
                        </span>
                      </div>
                    </div>

                    {/* Card Content Grid */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '130px minmax(260px, 1.8fr) minmax(240px, 1.4fr) minmax(180px, 1fr)',
                      gap: '16px',
                      alignItems: 'start',
                      marginTop: '12px'
                    }}>
                      {/* Column 1: Captured Camera Evidence Thumbnail */}
                      <div>
                        {issue.image_url ? (
                          <div
                            onClick={() => {
                              setPreviewImgUrl(issue.image_url);
                              setActiveModal('preview_img');
                            }}
                            style={{
                              width: '100%',
                              height: '105px',
                              borderRadius: '8px',
                              overflow: 'hidden',
                              border: '1px solid #CBD5E1',
                              position: 'relative',
                              cursor: 'pointer',
                              background: '#0F172A'
                            }}
                            title="Click to view full captured camera evidence"
                          >
                            <img
                              src={issue.image_url}
                              alt="Captured civic evidence"
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            <div style={{
                              position: 'absolute',
                              bottom: 0,
                              left: 0,
                              right: 0,
                              padding: '2px 4px',
                              background: 'rgba(15,23,42,0.85)',
                              color: '#FFFFFF',
                              fontSize: '0.62rem',
                              fontWeight: 600,
                              textAlign: 'center',
                              backdropFilter: 'blur(4px)'
                            }}>
                              Live Camera Evidence
                            </div>
                          </div>
                        ) : (
                          <div style={{
                            width: '100%',
                            height: '105px',
                            borderRadius: '8px',
                            border: '1px dashed #CBD5E1',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#94A3B8',
                            fontSize: '0.68rem',
                            textAlign: 'center',
                            padding: '8px'
                          }}>
                            <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" fill="none" strokeWidth="1.5" style={{ marginBottom: 4 }}>
                              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                              <circle cx="8.5" cy="8.5" r="1.5" />
                              <polyline points="21 15 16 10 5 21" />
                            </svg>
                            <span>No Photo Attached</span>
                          </div>
                        )}
                      </div>

                      {/* Column 2: Issue Title, Category, Address & Road Geometry */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                          <span style={{
                            background: '#F1F5F9',
                            color: '#2563EB',
                            border: '1px solid #BFDBFE',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: '4px'
                          }}>
                            {issue.category}
                          </span>
                        </div>

                        <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0F172A', margin: '0 0 4px 0' }}>
                          {issue.title}
                        </h4>

                        <p style={{
                          fontSize: '0.76rem',
                          color: '#475569',
                          margin: '0 0 8px 0',
                          lineHeight: '1.35',
                          maxHeight: '3.6em',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {issue.description}
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.72rem', color: '#64748B' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" fill="none" strokeWidth="2">
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                              <circle cx="12" cy="10" r="3" />
                            </svg>
                            <span>{issue.address || issue.landmark_address || 'Bengaluru Municipal Area'}</span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontFamily: 'monospace', color: '#475569' }}>
                              GPS: {issue.latitude?.toFixed(4)}° N, {issue.longitude?.toFixed(4)}° E
                            </span>

                            {/* Road Geometry Highlight Indicator */}
                            {hasGeometry ? (
                              <span style={{
                                background: 'rgba(220, 38, 38, 0.1)',
                                color: '#DC2626',
                                border: '1px solid rgba(220, 38, 38, 0.3)',
                                padding: '2px 7px',
                                borderRadius: '4px',
                                fontWeight: 700,
                                fontSize: '0.68rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#DC2626' }}></span>
                                Red Road Segment Active
                              </span>
                            ) : (
                              <span style={{
                                background: '#F8FAFC',
                                color: '#64748B',
                                border: '1px solid #E2E8F0',
                                padding: '2px 7px',
                                borderRadius: '4px',
                                fontSize: '0.68rem'
                              }}>
                                Point Incident Marker
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Column 3: Computer Vision Evidence Assessment & Duplicate Flags */}
                      <div style={{
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: '8px',
                        padding: '10px 12px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                            CV Evidence Diagnostic
                          </span>
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            color: cv.confidence_score >= 0.75 ? '#059669' : (cv.confidence_score >= 0.45 ? '#D97706' : '#64748B')
                          }}>
                            {cv.confidence_score ? `${Math.round(cv.confidence_score * 100)}% Defect Match` : 'Awaiting CV'}
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div style={{ width: '100%', height: '5px', background: '#E2E8F0', borderRadius: '3px', overflow: 'hidden', marginBottom: '8px' }}>
                          <div style={{
                            width: `${cv.confidence_score ? Math.round(cv.confidence_score * 100) : 0}%`,
                            height: '100%',
                            background: cv.confidence_score >= 0.75 ? '#059669' : (cv.confidence_score >= 0.45 ? '#D97706' : '#94A3B8'),
                            transition: 'width 0.4s ease'
                          }}></div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.7rem', color: '#475569' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Sharpness / Blur:</span>
                            <strong>{cv.is_blurry ? 'Blurry' : 'Sharp'} ({cv.sharpness_score ? cv.sharpness_score.toFixed(0) : 'N/A'})</strong>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Illumination:</span>
                            <strong>{cv.is_dark ? 'Dim / Underexposed' : 'Adequate daylight'}</strong>
                          </div>

                          {cv.detected_features && cv.detected_features.length > 0 && (
                            <div style={{ marginTop: '3px' }}>
                              <div style={{ fontSize: '0.66rem', color: '#64748B' }}>Morphological Patterns:</div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginTop: '2px' }}>
                                {cv.detected_features.map((feat, idx) => (
                                  <span key={idx} style={{
                                    fontSize: '0.62rem',
                                    background: '#EFF6FF',
                                    color: '#1E40AF',
                                    padding: '1px 5px',
                                    borderRadius: '4px',
                                    border: '1px solid #DBEAFE'
                                  }}>
                                    {feat}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Duplicate Alert Card inside column */}
                        {hasDuplicates && !isDuplicateLinked && (
                          <div style={{
                            marginTop: '8px',
                            padding: '6px 8px',
                            background: '#F5F3FF',
                            border: '1px solid #DDD6FE',
                            borderRadius: '6px',
                            fontSize: '0.68rem'
                          }}>
                            <div style={{ fontWeight: 700, color: '#6D28D9', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span>⚠️ Duplicate Candidate Detected</span>
                            </div>
                            <div style={{ color: '#4C1D95', marginTop: '2px' }}>
                              Matches <strong>{issue.duplicate_candidates[0].ticket_number}</strong> ({Math.round(issue.duplicate_candidates[0].distance_meters)}m away, {Math.round(issue.duplicate_candidates[0].duplicate_score * 100)}% match)
                            </div>
                            <button
                              onClick={() => handleOpenLinkDuplicate(issue, issue.duplicate_candidates[0].ticket_number)}
                              style={{
                                marginTop: '4px',
                                background: '#7C3AED',
                                color: '#FFFFFF',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '3px 8px',
                                fontSize: '0.66rem',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              Link as Duplicate
                            </button>
                          </div>
                        )}

                        {isDuplicateLinked && (
                          <div style={{
                            marginTop: '8px',
                            padding: '5px 8px',
                            background: '#F5F3FF',
                            border: '1px solid #DDD6FE',
                            borderRadius: '6px',
                            fontSize: '0.68rem',
                            color: '#6D28D9'
                          }}>
                            🔗 Linked to Primary: <strong>{issue.duplicate_of_id}</strong>
                          </div>
                        )}
                      </div>

                      {/* Column 4: Authority Verification Status & Actions */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {issue.verification_reason && (
                          <div style={{
                            background: '#F8FAFC',
                            border: '1px solid #E2E8F0',
                            borderRadius: '6px',
                            padding: '6px 8px',
                            fontSize: '0.7rem'
                          }}>
                            <div style={{ fontSize: '0.64rem', fontWeight: 700, color: '#64748B' }}>Decision Note:</div>
                            <div style={{ color: '#1E293B', fontStyle: 'italic', marginTop: '2px', lineHeight: '1.25' }}>
                              "{issue.verification_reason}"
                            </div>
                            {issue.verified_by && (
                              <div style={{ fontSize: '0.62rem', color: '#64748B', marginTop: '3px' }}>
                                &mdash; {issue.verified_by}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Action Buttons */}
                        <button
                          onClick={() => handleOpenInspect(issue)}
                          style={{
                            width: '100%',
                            padding: '7px 12px',
                            borderRadius: '6px',
                            background: '#0F172A',
                            color: '#FFFFFF',
                            border: 'none',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            boxShadow: '0 2px 4px rgba(15,23,42,0.1)'
                          }}
                        >
                          <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" strokeWidth="2.5">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                          <span>Inspect & Verify</span>
                        </button>

                        <button
                          onClick={() => handleOpenLinkDuplicate(issue)}
                          style={{
                            width: '100%',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            background: '#F1F5F9',
                            color: '#334155',
                            border: '1px solid #CBD5E1',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '5px'
                          }}
                        >
                          <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" fill="none" strokeWidth="2">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                          </svg>
                          <span>Link Duplicate</span>
                        </button>

                        <button
                          onClick={() => handleRerunCV(issue.ticket_number)}
                          disabled={cvAssessing}
                          style={{
                            width: '100%',
                            padding: '5px 10px',
                            borderRadius: '6px',
                            background: 'transparent',
                            color: '#64748B',
                            border: '1px solid #E2E8F0',
                            fontSize: '0.68rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                          }}
                          title="Re-run Computer Vision Edge Analysis"
                        >
                          <svg viewBox="0 0 24 24" width="11" height="11" stroke="currentColor" fill="none" strokeWidth="2">
                            <polyline points="23 4 23 10 17 10" />
                            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                          </svg>
                          <span>Re-assess CV</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

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

      {/* 7. Evidence Inspection & Decision Modal */}
      {activeModal === 'inspect_verify' && selectedVerifiedIssue && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '16px'
        }}>
          <div className="glass-panel" style={{
            width: '940px',
            maxWidth: '96vw',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            background: '#FFFFFF',
            border: '1px solid #CBD5E1',
            borderRadius: '14px',
            boxShadow: '0 25px 70px rgba(0,0,0,0.45)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#F8FAFC'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    fontFamily: 'monospace',
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    background: '#0F172A',
                    color: '#FFFFFF',
                    padding: '2px 8px',
                    borderRadius: '6px'
                  }}>
                    {selectedVerifiedIssue.ticket_number}
                  </span>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    Evidence Inspection & Officer Verification
                  </h3>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '3px' }}>
                  Submitted: {selectedVerifiedIssue.timestamp} &bull; {selectedVerifiedIssue.ward} ({selectedVerifiedIssue.zone}) &bull; Urgency: <strong style={{ color: '#DC2626' }}>{selectedVerifiedIssue.urgency}</strong>
                </div>
              </div>

              <button
                onClick={() => setActiveModal(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.25rem',
                  color: '#64748B',
                  cursor: 'pointer',
                  padding: '4px 8px'
                }}
              >
                &times;
              </button>
            </div>

            {/* Modal Body: Two Columns */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(320px, 1.1fr) minmax(340px, 1.25fr)',
              gap: '20px',
              padding: '20px',
              overflowY: 'auto',
              maxHeight: 'calc(92vh - 80px)'
            }}>
              {/* Left Column: Photo Evidence & Interactive Leaflet Mini Map */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Photo Evidence */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155' }}>
                      Citizen Camera Evidence Photo
                    </label>
                    {selectedVerifiedIssue.camera_metadata?.source && (
                      <span style={{ fontSize: '0.66rem', color: '#059669', fontWeight: 700, background: '#ECFDF5', padding: '1px 6px', borderRadius: '4px' }}>
                        LIVE CAMERA CAPTURE
                      </span>
                    )}
                  </div>

                  {selectedVerifiedIssue.image_url ? (
                    <div
                      onClick={() => {
                        setPreviewImgUrl(selectedVerifiedIssue.image_url);
                        setActiveModal('preview_img');
                      }}
                      style={{
                        width: '100%',
                        height: '220px',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        border: '1px solid #CBD5E1',
                        background: '#0F172A',
                        cursor: 'zoom-in',
                        position: 'relative'
                      }}
                    >
                      <img
                        src={selectedVerifiedIssue.image_url}
                        alt="Citizen captured evidence"
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                      <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        padding: '4px 8px',
                        background: 'rgba(15,23,42,0.85)',
                        color: '#FFFFFF',
                        fontSize: '0.66rem',
                        display: 'flex',
                        justifyContent: 'space-between'
                      }}>
                        <span>Click to expand full resolution</span>
                        <span>{selectedVerifiedIssue.camera_metadata?.resolution || 'Original Resolution'}</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      height: '160px',
                      borderRadius: '8px',
                      border: '1px dashed #CBD5E1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#94A3B8',
                      fontSize: '0.78rem'
                    }}>
                      No photograph submitted with this report.
                    </div>
                  )}
                </div>

                {/* Leaflet Incident & Road Geometry Mini Map */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155' }}>
                      Incident Location & Road Geometry
                    </label>
                    {selectedVerifiedIssue.road_geometry?.geometry?.coordinates ? (
                      <span style={{ fontSize: '0.66rem', color: '#DC2626', fontWeight: 700, background: '#FEF2F2', padding: '1px 6px', borderRadius: '4px' }}>
                        RED CORRIDOR SEGMENT ATTACHED
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.66rem', color: '#64748B' }}>
                        Point Incident Marker
                      </span>
                    )}
                  </div>

                  <div
                    ref={inspectMapRef}
                    style={{
                      width: '100%',
                      height: '190px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      overflow: 'hidden',
                      zIndex: 1
                    }}
                  />

                  <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '6px', lineHeight: '1.3' }}>
                    <strong>Address:</strong> {selectedVerifiedIssue.address || selectedVerifiedIssue.landmark_address}<br />
                    <strong>GPS Coordinates:</strong> {selectedVerifiedIssue.latitude?.toFixed(5)}° N, {selectedVerifiedIssue.longitude?.toFixed(5)}° E
                    {selectedVerifiedIssue.road_geometry?.properties?.road_name && (
                      <div>
                        <strong>Road Corridor:</strong> <span style={{ color: '#DC2626', fontWeight: 700 }}>{selectedVerifiedIssue.road_geometry.properties.road_name}</span> (Segment ID: {selectedVerifiedIssue.road_geometry.properties.segment_id})
                      </div>
                    )}
                  </div>
                </div>

                {/* Duplicate matches if any */}
                {selectedVerifiedIssue.duplicate_candidates && selectedVerifiedIssue.duplicate_candidates.length > 0 && (
                  <div style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: '#F5F3FF',
                    border: '1px solid #DDD6FE'
                  }}>
                    <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#6D28D9', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>⚠️ Potential Duplicate Incident Match</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#4C1D95', marginTop: '4px' }}>
                      Complaint <strong>{selectedVerifiedIssue.duplicate_candidates[0].ticket_number}</strong> is located {Math.round(selectedVerifiedIssue.duplicate_candidates[0].distance_meters)}m away with {Math.round(selectedVerifiedIssue.duplicate_candidates[0].duplicate_score * 100)}% defect similarity ({selectedVerifiedIssue.duplicate_candidates[0].time_diff_hours?.toFixed(1)}h apart).
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenLinkDuplicate(selectedVerifiedIssue, selectedVerifiedIssue.duplicate_candidates[0].ticket_number)}
                      style={{
                        marginTop: '6px',
                        background: '#7C3AED',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Link Directly to Primary #{selectedVerifiedIssue.duplicate_candidates[0].ticket_number}
                    </button>
                  </div>
                )}
              </div>

              {/* Right Column: Computer Vision Diagnostic & Officer Decision Form */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* CV Diagnostic Card */}
                <div style={{
                  padding: '12px 14px',
                  borderRadius: '10px',
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0F172A', textTransform: 'uppercase' }}>
                        Computer Vision Evidence Assessment
                      </div>
                      <div style={{ fontSize: '0.64rem', color: '#64748B' }}>
                        {selectedVerifiedIssue.evidence_assessment?.cv_engine || 'UrbanPulse DefectMorphology v2.4 (OpenCV + PIL)'}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRerunCV(selectedVerifiedIssue.ticket_number)}
                      disabled={cvAssessing}
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        borderRadius: '6px',
                        padding: '3px 8px',
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        color: '#0F172A',
                        cursor: 'pointer'
                      }}
                    >
                      {cvAssessing ? 'Assessing...' : 'Re-run CV'}
                    </button>
                  </div>

                  {/* Confidence Bar */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.72rem' }}>
                    <span style={{ color: '#475569' }}>Morphological Defect Confidence:</span>
                    <strong style={{
                      color: (selectedVerifiedIssue.evidence_assessment?.confidence_score || 0) >= 0.75
                        ? '#059669'
                        : (selectedVerifiedIssue.evidence_assessment?.confidence_score || 0) >= 0.45 ? '#D97706' : '#DC2626'
                    }}>
                      {selectedVerifiedIssue.evidence_assessment?.confidence_score ? Math.round(selectedVerifiedIssue.evidence_assessment.confidence_score * 100) : 0}%
                    </strong>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: '#E2E8F0', borderRadius: '3px', overflow: 'hidden', marginBottom: '10px' }}>
                    <div style={{
                      width: `${selectedVerifiedIssue.evidence_assessment?.confidence_score ? Math.round(selectedVerifiedIssue.evidence_assessment.confidence_score * 100) : 0}%`,
                      height: '100%',
                      background: (selectedVerifiedIssue.evidence_assessment?.confidence_score || 0) >= 0.75
                        ? '#059669'
                        : (selectedVerifiedIssue.evidence_assessment?.confidence_score || 0) >= 0.45 ? '#D97706' : '#DC2626'
                    }}></div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.7rem' }}>
                    <div style={{ background: '#FFFFFF', padding: '6px 8px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                      <div style={{ color: '#64748B', fontSize: '0.64rem' }}>Laplacian Blur Variance:</div>
                      <div style={{ fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>
                        {selectedVerifiedIssue.evidence_assessment?.sharpness_score ? selectedVerifiedIssue.evidence_assessment.sharpness_score.toFixed(1) : 'N/A'}{' '}
                        <span style={{ fontSize: '0.62rem', color: selectedVerifiedIssue.evidence_assessment?.is_blurry ? '#DC2626' : '#059669' }}>
                          ({selectedVerifiedIssue.evidence_assessment?.is_blurry ? 'Blurry' : 'Sharp'})
                        </span>
                      </div>
                    </div>

                    <div style={{ background: '#FFFFFF', padding: '6px 8px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                      <div style={{ color: '#64748B', fontSize: '0.64rem' }}>Illumination Index:</div>
                      <div style={{ fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>
                        {selectedVerifiedIssue.evidence_assessment?.brightness_score ? selectedVerifiedIssue.evidence_assessment.brightness_score.toFixed(1) : 'N/A'}{' '}
                        <span style={{ fontSize: '0.62rem', color: selectedVerifiedIssue.evidence_assessment?.is_dark ? '#DC2626' : '#059669' }}>
                          ({selectedVerifiedIssue.evidence_assessment?.is_dark ? 'Underexposed' : 'Adequate'})
                        </span>
                      </div>
                    </div>
                  </div>

                  {selectedVerifiedIssue.evidence_assessment?.detected_features && selectedVerifiedIssue.evidence_assessment.detected_features.length > 0 && (
                    <div style={{ marginTop: '8px' }}>
                      <div style={{ fontSize: '0.66rem', color: '#64748B', marginBottom: '3px' }}>Detected Visual Defect Signatures:</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {selectedVerifiedIssue.evidence_assessment.detected_features.map((feat, idx) => (
                          <span key={idx} style={{
                            fontSize: '0.66rem',
                            background: '#EFF6FF',
                            color: '#1E40AF',
                            padding: '2px 7px',
                            borderRadius: '4px',
                            border: '1px solid #BFDBFE'
                          }}>
                            {feat}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedVerifiedIssue.evidence_assessment?.recommendation && (
                    <div style={{
                      marginTop: '8px',
                      fontSize: '0.68rem',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      background: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      color: '#334155'
                    }}>
                      <strong>Algorithm Recommendation:</strong> {selectedVerifiedIssue.evidence_assessment.recommendation}
                    </div>
                  )}
                </div>

                {/* Authorized Officer Decision Form */}
                <form onSubmit={handleVerifySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#0F172A', marginBottom: '6px' }}>
                      Verification Decision *
                    </label>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                      {[
                        { id: 'Verified', label: 'Verified', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', icon: '✓', desc: 'Valid civic issue' },
                        { id: 'Needs Review', label: 'Needs Review', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', icon: '!', desc: 'Inconclusive proof' },
                        { id: 'Rejected', label: 'Rejected', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', icon: '✕', desc: 'Invalid / Excluded' }
                      ].map(opt => {
                        const isSelected = verificationDecision === opt.id;
                        return (
                          <div
                            key={opt.id}
                            onClick={() => setVerificationDecision(opt.id)}
                            style={{
                              padding: '8px 10px',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              border: isSelected ? `2px solid ${opt.color}` : '1px solid #E2E8F0',
                              background: isSelected ? opt.bg : '#FFFFFF',
                              transition: 'all 0.15s ease',
                              textAlign: 'center'
                            }}
                          >
                            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: opt.color, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                              <span>{opt.icon}</span>
                              <span>{opt.label}</span>
                            </div>
                            <div style={{ fontSize: '0.62rem', color: '#64748B', marginTop: '2px' }}>
                              {opt.desc}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Mandatory Verification Reason */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#0F172A', marginBottom: '4px' }}>
                      Officer Verification Rationale / Reason *
                    </label>
                    <textarea
                      rows="3"
                      required
                      placeholder="State precise factual grounds for verification, review, or rejection (e.g. 'Photo matches outer ring road asphalt cave-in; confirmed actionable road damage')..."
                      value={verificationReason}
                      onChange={(e) => setVerificationReason(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '0.78rem',
                        color: '#0F172A',
                        background: '#FFFFFF',
                        fontFamily: 'inherit'
                      }}
                    />
                    <div style={{ fontSize: '0.64rem', color: '#64748B', marginTop: '2px' }}>
                      Decision reason will be appended to the official grievance audit log and transmitted to citizen status feed.
                    </div>
                  </div>

                  {/* Immediate Response Squad Dispatch Option (Only when verifying) */}
                  {verificationDecision === 'Verified' && (
                    <div style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: '#EFF6FF',
                      border: '1px solid #BFDBFE'
                    }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.74rem', fontWeight: 700, color: '#1E40AF' }}>
                        <input
                          type="checkbox"
                          checked={immediateDispatch}
                          onChange={(e) => setImmediateDispatch(e.target.checked)}
                        />
                        <span>Dispatch Field Response Squad Immediately</span>
                      </label>

                      {immediateDispatch && (
                        <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#334155', marginBottom: '2px' }}>
                              Department Allocation
                            </label>
                            <select
                              value={dispatchDept}
                              onChange={(e) => setDispatchDept(e.target.value)}
                              style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.74rem', color: '#0F172A', background: '#FFFFFF' }}
                            >
                              {departments.map(d => (
                                <option key={d.id} value={d.name}>{d.name}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#334155', marginBottom: '2px' }}>
                              Field Squad & ETA
                            </label>
                            <input
                              type="text"
                              value={dispatchSquad}
                              onChange={(e) => setDispatchSquad(e.target.value)}
                              placeholder="Squad designation..."
                              style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.74rem', color: '#0F172A', background: '#FFFFFF' }}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#334155', marginBottom: '2px' }}>
                              Field Squad Instructions
                            </label>
                            <input
                              type="text"
                              value={dispatchInstructions}
                              onChange={(e) => setDispatchInstructions(e.target.value)}
                              placeholder="e.g. Mobilize cold-mix asphalt patching squad..."
                              style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.74rem', color: '#0F172A', background: '#FFFFFF' }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Submit Actions */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                    <button
                      type="button"
                      onClick={() => setActiveModal(null)}
                      style={{
                        background: '#F1F5F9',
                        border: '1px solid #CBD5E1',
                        color: '#334155',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={actionLoading}
                      style={{
                        background: verificationDecision === 'Verified' ? '#059669' : (verificationDecision === 'Rejected' ? '#DC2626' : '#D97706'),
                        color: '#FFFFFF',
                        border: 'none',
                        padding: '8px 20px',
                        borderRadius: '8px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <span>{actionLoading ? 'Recording...' : `Record ${verificationDecision}`}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. Link Duplicate Modal */}
      {activeModal === 'link_duplicate' && selectedVerifiedIssue && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '16px'
        }}>
          <div className="glass-panel" style={{
            width: '540px',
            maxWidth: '92vw',
            background: '#FFFFFF',
            border: '1px solid #CBD5E1',
            borderRadius: '12px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#7C3AED', margin: 0 }}>
                  Link Secondary Civic Report as Duplicate
                </h3>
                <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px' }}>
                  Associate <strong>{selectedVerifiedIssue.ticket_number}</strong> with an existing active incident
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', color: '#64748B', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            <div style={{
              background: '#F5F3FF',
              border: '1px solid #DDD6FE',
              borderRadius: '8px',
              padding: '10px 12px',
              fontSize: '0.72rem',
              color: '#4C1D95',
              lineHeight: '1.4',
              marginBottom: '16px'
            }}>
              <strong>Audit Preservation Notice:</strong> Linking this report preserves the original citizen report, camera evidence, GPS coordinates, and submission timestamp. Both tickets will maintain synchronized audit trails without data loss.
            </div>

            <form onSubmit={handleLinkDuplicateSubmit}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Target Primary Incident Ticket Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BBMP-2026-1042"
                  value={linkTargetId}
                  onChange={(e) => setLinkTargetId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.8rem',
                    color: '#0F172A',
                    fontFamily: 'monospace',
                    fontWeight: 700
                  }}
                />
                {selectedVerifiedIssue.duplicate_candidates && selectedVerifiedIssue.duplicate_candidates.length > 0 && (
                  <div style={{ marginTop: '6px', fontSize: '0.68rem', color: '#64748B' }}>
                    Suggested Candidate:{' '}
                    <button
                      type="button"
                      onClick={() => setLinkTargetId(selectedVerifiedIssue.duplicate_candidates[0].ticket_number)}
                      style={{
                        background: '#EDE9FE',
                        color: '#6D28D9',
                        border: '1px solid #DDD6FE',
                        borderRadius: '4px',
                        padding: '1px 6px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {selectedVerifiedIssue.duplicate_candidates[0].ticket_number} ({Math.round(selectedVerifiedIssue.duplicate_candidates[0].distance_meters)}m away)
                    </button>
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Association Justification / Audit Reason *
                </label>
                <textarea
                  rows="3"
                  required
                  placeholder="Explain why this complaint is a duplicate (e.g. 'Identical pothole on Marathahalli flyover down-ramp reported 35 minutes later; coordinates match within 25 meters')..."
                  value={linkReason}
                  onChange={(e) => setLinkReason(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.78rem',
                    color: '#0F172A',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  style={{
                    background: '#F1F5F9',
                    border: '1px solid #CBD5E1',
                    color: '#334155',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{
                    background: '#7C3AED',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '8px 18px',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {actionLoading ? 'Linking...' : 'Confirm Duplicate Association'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
