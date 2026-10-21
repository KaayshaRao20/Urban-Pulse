import React, { useState, useEffect, useRef, useMemo } from 'react';
import { API_BASE } from '../config/api';

const isVideoUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  const clean = url.toLowerCase().split('?')[0];
  return clean.endsWith('.webm') || clean.endsWith('.mp4') || clean.endsWith('.mov') || clean.endsWith('.ogg');
};

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
  const [lastSyncedTime, setLastSyncedTime] = useState('Just now');
  const [isSyncing, setIsSyncing] = useState(false);

  // Sub-Navigation Tab: 'queue' (Grievance Queue & Triage) vs 'verified_issues' (Verified Civic Issues)
  const [activeSection, setActiveSection] = useState('queue');

  // Detail Pane Internal Tab: 'overview', 'ai_analysis', 'location_map', 'comments', 'activity_log'
  const [activeDetailTab, setActiveDetailTab] = useState('overview');

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterUrgency, setFilterUrgency] = useState('all');
  const [filterWard, setFilterWard] = useState('all');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterDateRange, setFilterDateRange] = useState('30d');
  const [sortBy, setSortBy] = useState('latest');

  // Verified Civic Issues Tab States
  const [verifiedIssues, setVerifiedIssues] = useState([]);
  const [verifiedCounts, setVerifiedCounts] = useState({
    all: 0,
    pending_verification: 0,
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

  // Selected Verified Issue for Inspection & Decision Modal
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

  // Interactive Modals: 'work_order', 'assign', 'dispatch', 'resolve', 'reject', 'reopen', 'preview_img', 'inspect_verify', 'link_duplicate'
  const [activeModal, setActiveModal] = useState(null);
  const [modalData, setModalData] = useState({});
  const [previewImgUrl, setPreviewImgUrl] = useState('');

  // Inline Comments State (for Comments Tab)
  const [newCommentText, setNewCommentText] = useState('');
  const [internalComments, setInternalComments] = useState([
    {
      id: 1,
      author: 'Superintending Engineer R. K. Hegde',
      role: 'Authority Officer',
      text: 'Visual triage confirms 1.2m asphalt cavity. Rapid Pothole Unit Alpha alerted for sub-base compaction.',
      timestamp: '2 hours ago'
    },
    {
      id: 2,
      author: 'Field Supervisor K. Gowda',
      role: 'BBMP Field Squad Alpha',
      text: 'Traffic control cones staged at Marathahalli bridge approach. Cold-mix patch truck KA-01-EA-1044 en route.',
      timestamp: '1 hour ago'
    },
    {
      id: 3,
      author: 'Traffic Desk Officer Patil',
      role: 'BTP Command',
      text: 'Coordinated single-lane vehicular deceleration alert on Outer Ring Road variable messaging signs.',
      timestamp: '35 minutes ago'
    }
  ]);

  // Video playback state for Evidence Player
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const videoPlayerRef = useRef(null);

  // Mini Map refs
  const detailMapRef = useRef(null);
  const detailMapInst = useRef(null);
  const detailMarkerRef = useRef(null);
  const detailPolylineRef = useRef(null);

  const inspectMapRef = useRef(null);
  const inspectMapInst = useRef(null);

  // Auth headers for authority operations
  const authHeaders = useMemo(() => ({
    'Content-Type': 'application/json',
    'X-Authority-Role': 'officer',
    'X-Authority-Actor': 'Municipal Duty Officer (Control 01)'
  }), []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Fetch verified issues
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

  // Fetch all authority metrics and grievance list
  const fetchAllData = async (keepSelection = true) => {
    try {
      setIsSyncing(true);
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
        // Strictly honor Requirement 2: Do NOT auto-select report unless explicit targetId exists
        const explicitTarget = initialTicketId || (keepSelection ? selectedTicketId : null);
        if (explicitTarget) {
          loadDossier(explicitTarget);
        }
      }

      if (deptsRes.ok) {
        const d = await deptsRes.json();
        setDepartments(d.departments || []);
      }

      setLastSyncedTime('Just now');
    } catch (e) {
      console.warn("Failed fetching grievance authority data:", e);
      showToast('Error syncing grievance data with server');
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  };

  // Load single ticket dossier
  const loadDossier = async (ticketId) => {
    if (!ticketId) return;
    setSelectedTicketId(ticketId);
    try {
      const res = await fetch(`${API_BASE}/grievances/authority/${encodeURIComponent(ticketId)}`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setDossier(data);
      } else {
        // Fallback to local match if exists
        const localMatch = complaints.find(c => c.ticket_number === ticketId);
        if (localMatch) {
          setDossier({ complaint: localMatch, history: [], notifications: [] });
        }
      }
    } catch (e) {
      console.warn("Failed fetching dossier for", ticketId, e);
    }
  };

  // Handle external prop initialTicketId changes
  useEffect(() => {
    if (initialTicketId) {
      setSelectedTicketId(initialTicketId);
      loadDossier(initialTicketId);
    }
  }, [initialTicketId]);

  // Initial Data Fetch
  useEffect(() => {
    fetchAllData(true);
    // Interval for dynamic "Last synced" text
    const syncTimer = setInterval(() => {
      setLastSyncedTime(prev => {
        if (prev === 'Just now') return '1 minute ago';
        if (prev === '1 minute ago') return '2 minutes ago';
        if (prev === '2 minutes ago') return '3 minutes ago';
        return prev;
      });
    }, 60000);
    return () => clearInterval(syncTimer);
  }, []);

  // Update verified issues whenever its sub-filters change
  useEffect(() => {
    if (activeSection === 'verified_issues') {
      fetchVerifiedIssues();
    }
  }, [vStatusFilter, vCategoryFilter, vUrgencyFilter, vWardFilter, vSearchQuery, activeSection]);

  // Selected complaint object
  const currentComplaint = useMemo(() => {
    if (dossier?.complaint) return dossier.complaint;
    if (selectedTicketId) {
      return complaints.find(c => c.ticket_number === selectedTicketId) || null;
    }
    return null;
  }, [dossier, selectedTicketId, complaints]);

  // Filtered complaints for the left roster
  const filteredComplaints = useMemo(() => {
    return complaints.filter(c => {
      // Category filter
      if (filterCategory !== 'all' && !c.category?.toLowerCase().includes(filterCategory.toLowerCase())) {
        return false;
      }
      // Urgency filter
      if (filterUrgency !== 'all' && c.urgency?.toLowerCase() !== filterUrgency.toLowerCase()) {
        return false;
      }
      // Ward filter
      if (filterWard !== 'all') {
        const wStr = (c.ward_zone || '').toLowerCase();
        if (!wStr.includes(filterWard.toLowerCase())) return false;
      }
      // Department filter
      if (filterDepartment !== 'all') {
        const dStr = ((c.assigned_department || '') + ' ' + (c.assigned_authority || '')).toLowerCase();
        if (!dStr.includes(filterDepartment.toLowerCase())) return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hit =
          (c.ticket_number || '').toLowerCase().includes(q) ||
          (c.title || '').toLowerCase().includes(q) ||
          (c.description || '').toLowerCase().includes(q) ||
          (c.landmark_address || '').toLowerCase().includes(q) ||
          (c.ward_zone || '').toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'risk_desc') {
        return (b.risk_score || 0) - (a.risk_score || 0);
      }
      if (sortBy === 'oldest') {
        return (a.created_at || '').localeCompare(b.created_at || '');
      }
      // Default: latest first
      return (b.created_at || '').localeCompare(a.created_at || '');
    });
  }, [complaints, filterCategory, filterUrgency, filterWard, filterDepartment, searchQuery, sortBy]);

  // Leaflet Map Initialization for Location & Map Tab
  useEffect(() => {
    if (activeDetailTab !== 'location_map' || !currentComplaint || !window.L || !detailMapRef.current) {
      return;
    }

    const lat = currentComplaint.latitude || 12.9616;
    const lng = currentComplaint.longitude || 77.6977;

    const timer = setTimeout(() => {
      if (!detailMapRef.current) return;

      if (!detailMapInst.current) {
        const map = window.L.map(detailMapRef.current, {
          zoomControl: true,
          attributionControl: false
        }).setView([lat, lng], 15);

        window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19
        }).addTo(map);

        const pinIcon = window.L.divIcon({
          html: `<div style="width:28px; height:28px; border-radius:50%; background:#EF4444; border:3px solid white; box-shadow:0 3px 10px rgba(0,0,0,0.35); display:flex; align-items:center; justify-content:center;">
            <div style="width:8px; height:8px; border-radius:50%; background:white;"></div>
          </div>`,
          className: 'custom-map-pin',
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });

        const marker = window.L.marker([lat, lng], { icon: pinIcon }).addTo(map);
        marker.bindPopup(`<b>${currentComplaint.ticket_number}</b><br/>${currentComplaint.title}`);

        detailMapInst.current = map;
        detailMarkerRef.current = marker;
      } else {
        detailMapInst.current.setView([lat, lng], 15);
        if (detailMarkerRef.current) {
          detailMarkerRef.current.setLatLng([lat, lng]);
          detailMarkerRef.current.setPopupContent(`<b>${currentComplaint.ticket_number}</b><br/>${currentComplaint.title}`);
        }
        detailMapInst.current.invalidateSize();
      }

      // Draw road geometry polyline if present
      if (currentComplaint.road_geometry && Array.isArray(currentComplaint.road_geometry)) {
        if (detailPolylineRef.current) {
          detailMapInst.current.removeLayer(detailPolylineRef.current);
        }
        try {
          const poly = window.L.polyline(currentComplaint.road_geometry, {
            color: '#DC2626',
            weight: 6,
            opacity: 0.85
          }).addTo(detailMapInst.current);
          detailPolylineRef.current = poly;
        } catch (e) {
          console.warn("Polyline draw error:", e);
        }
      }
    }, 120);

    return () => clearTimeout(timer);
  }, [activeDetailTab, currentComplaint]);

  // Inspection modal map
  useEffect(() => {
    if (activeModal !== 'inspect_verify' || !selectedVerifiedIssue || !window.L || !inspectMapRef.current) {
      if (inspectMapInst.current) {
        inspectMapInst.current.remove();
        inspectMapInst.current = null;
      }
      return;
    }

    const lat = selectedVerifiedIssue.latitude || 12.9616;
    const lng = selectedVerifiedIssue.longitude || 77.6977;

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

        const pinIcon = window.L.divIcon({
          html: `<div style="width:26px; height:26px; border-radius:50%; background:#DC2626; border:3px solid white; box-shadow:0 3px 10px rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center;">
            <div style="width:8px; height:8px; border-radius:50%; background:white;"></div>
          </div>`,
          className: 'custom-map-pin',
          iconSize: [26, 26],
          iconAnchor: [13, 13]
        });

        window.L.marker([lat, lng], { icon: pinIcon }).addTo(map);
        inspectMapInst.current = map;
      } catch (err) {
        console.warn("Leaflet inspect error:", err);
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      if (inspectMapInst.current) {
        inspectMapInst.current.remove();
        inspectMapInst.current = null;
      }
    };
  }, [activeModal, selectedVerifiedIssue]);

  // Badges & Formatting Helpers
  const getUrgencyBadge = (urgency) => {
    const u = (urgency || '').toLowerCase();
    if (u.includes('critical')) {
      return { bg: '#EF4444', text: '#FFFFFF', border: '#DC2626', label: 'Critical' };
    }
    if (u.includes('high')) {
      return { bg: '#F97316', text: '#FFFFFF', border: '#EA580C', label: 'High' };
    }
    if (u.includes('med') || u.includes('mod')) {
      return { bg: '#F59E0B', text: '#FFFFFF', border: '#D97706', label: 'Medium' };
    }
    return { bg: '#10B981', text: '#FFFFFF', border: '#059669', label: 'Low' };
  };

  const getRiskColor = (score) => {
    const s = parseFloat(score || 0);
    if (s >= 8.5) return '#EF4444'; // Red
    if (s >= 7.0) return '#F97316'; // Orange
    if (s >= 5.0) return '#F59E0B'; // Amber
    return '#10B981'; // Green
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Resolved':
        return { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0', dot: '#10B981' };
      case 'In Progress':
        return { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE', dot: '#3B82F6' };
      case 'Crew Dispatched':
      case 'Field Squad Dispatched':
        return { bg: '#F5F3FF', text: '#7C3AED', border: '#DDD6FE', dot: '#8B5CF6' };
      case 'Assigned':
        return { bg: '#E0F2FE', text: '#0284C7', border: '#BAE6FD', dot: '#0EA5E9' };
      case 'Under Review':
        return { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A', dot: '#F59E0B' };
      case 'Rejected':
        return { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA', dot: '#EF4444' };
      case 'Reopened':
        return { bg: '#FEF2F2', text: '#B91C1C', border: '#FCA5A5', dot: '#DC2626' };
      case 'Pending Verification':
      case 'Submitted':
      default:
        return { bg: '#F8FAFC', text: '#475569', border: '#E2E8F0', dot: '#94A3B8' };
    }
  };

  // Actions
  const handleAssignSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!currentComplaint) return;
    setActionLoading(true);
    try {
      const dept = modalData.department || currentComplaint.assigned_department || departments[0]?.name || 'BBMP Road Infrastructure Cell';
      const squad = modalData.squad || currentComplaint.assigned_squad || 'Rapid Response Squad Alpha';
      const res = await fetch(`${API_BASE}/grievances/authority/${currentComplaint.ticket_number}/assign`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          department: dept,
          squad: squad,
          officer: modalData.officer || 'Supervising Ward Engineer',
          notes: modalData.notes || `Assigned to ${dept} - Squad: ${squad}`
        })
      });
      if (res.ok) {
        showToast(`Complaint ${currentComplaint.ticket_number} assigned to ${dept}`);
        setActiveModal(null);
        setModalData({});
        fetchAllData(true);
        loadDossier(currentComplaint.ticket_number);
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.detail || 'Failed to assign department');
      }
    } catch (e) {
      showToast('Network error during assignment');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateWorkOrderSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!currentComplaint) return;
    setActionLoading(true);
    try {
      const priority = modalData.priority || (currentComplaint.urgency || 'High');
      const hours = parseInt(modalData.target_hours || '24', 10);
      const squad = modalData.squad || currentComplaint.assigned_squad || 'Rapid Response Squad Alpha';
      const instructions = modalData.instructions || `Emergency repair authorized for ${currentComplaint.category}. Mobilize equipment to site.`;

      const res = await fetch(`${API_BASE}/grievances/authority/${currentComplaint.ticket_number}/work-order`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          priority: priority,
          assigned_squad: squad,
          target_completion_hours: hours,
          instructions: instructions
        })
      });
      if (res.ok) {
        const data = await res.json();
        showToast(`Work Order ${data.work_order_id} created successfully! Ticket updated to In Progress.`);
        setActiveModal(null);
        setModalData({});
        fetchAllData(true);
        loadDossier(currentComplaint.ticket_number);
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.detail || 'Failed to create work order');
      }
    } catch (e) {
      showToast('Network error creating work order');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestReview = async () => {
    if (!currentComplaint) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/grievances/authority/${currentComplaint.ticket_number}/review`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ notes: 'Officer requested detailed evidence and jurisdictional review.' })
      });
      if (res.ok) {
        showToast(`Complaint ${currentComplaint.ticket_number} placed Under Review`);
        fetchAllData(true);
        loadDossier(currentComplaint.ticket_number);
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.detail || 'Review request failed');
      }
    } catch (e) {
      showToast('Network error during review request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolveSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!currentComplaint) return;
    if (!modalData.resolution_notes || modalData.resolution_notes.trim().length < 5) {
      showToast('Please provide substantive resolution notes (at least 5 characters).');
      return;
    }
    setActionLoading(true);
    try {
      const formData = new FormData();
      formData.append('resolution_notes', modalData.resolution_notes.trim());
      if (modalData.resolution_file) {
        formData.append('resolution_image', modalData.resolution_file);
      }

      const res = await fetch(`${API_BASE}/grievances/authority/${currentComplaint.ticket_number}/resolve`, {
        method: 'POST',
        headers: {
          'X-Authority-Role': 'officer',
          'X-Authority-Actor': 'Municipal Duty Officer (Control 01)'
        },
        body: formData
      });
      if (res.ok) {
        showToast(`Complaint ${currentComplaint.ticket_number} marked as Resolved.`);
        setActiveModal(null);
        setModalData({});
        fetchAllData(true);
        loadDossier(currentComplaint.ticket_number);
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.detail || 'Resolution submission failed');
      }
    } catch (e) {
      showToast('Network error during resolution');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!currentComplaint) return;
    if (!modalData.reject_reason || modalData.reject_reason.trim().length < 5) {
      showToast('Please provide an official rejection rationale (at least 5 characters).');
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/grievances/authority/${currentComplaint.ticket_number}/reject`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ reason: modalData.reject_reason.trim() })
      });
      if (res.ok) {
        showToast(`Complaint ${currentComplaint.ticket_number} rejected.`);
        setActiveModal(null);
        setModalData({});
        fetchAllData(true);
        loadDossier(currentComplaint.ticket_number);
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.detail || 'Rejection failed');
      }
    } catch (e) {
      showToast('Network error during rejection');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddComment = (e) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    const newEntry = {
      id: Date.now(),
      author: 'Municipal Duty Officer (You)',
      role: 'Authority Officer',
      text: newCommentText.trim(),
      timestamp: 'Just now'
    };
    setInternalComments(prev => [newEntry, ...prev]);
    setNewCommentText('');
    showToast('Internal officer comment logged.');
  };

  // Close Detail Action (Preserves filters and scroll position as per Requirement 2)
  const handleCloseDetail = () => {
    setSelectedTicketId(null);
    setDossier(null);
    setActiveDetailTab('overview');
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterCategory('all');
    setFilterUrgency('all');
    setFilterWard('all');
    setFilterDepartment('all');
    setFilterDateRange('30d');
    setSortBy('latest');
    showToast('Filters reset to default');
  };

  return (
    <div style={{ padding: '20px 24px', background: '#F8FAFC', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '24px',
          zIndex: 9999,
          background: '#0F172A',
          color: '#FFFFFF',
          padding: '10px 18px',
          borderRadius: '10px',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.84rem',
          fontWeight: 600
        }}>
          <span style={{ color: '#10B981' }}>●</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP HEADER: Authority Console & Sync */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '18px' }}>
        <div>
          <div style={{ display: 'inline-block', background: '#EFF6FF', color: '#2563EB', padding: '2px 8px', borderRadius: '6px', fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px' }}>
            AUTHORITY CONSOLE
          </div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            Civic Grievance Management & Field Dispatch
          </h1>
          <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '4px 0 0 0', fontWeight: 400 }}>
            Inter-agency triage, squad dispatch, and resolution verification network for BBMP, BWSSB, BESCOM, and BTP.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
          <button
            onClick={() => fetchAllData(true)}
            disabled={isSyncing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#2563EB',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: isSyncing ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 6px rgba(37,99,235,0.25)',
              transition: 'background 0.15s ease'
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width="15"
              height="15"
              stroke="currentColor"
              fill="none"
              strokeWidth="2.4"
              style={{ animation: isSyncing ? 'spin 1s linear infinite' : 'none' }}
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            <span>{isSyncing ? 'Syncing...' : 'Sync Data'}</span>
          </button>
          <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 500 }}>
            Last synced: {lastSyncedTime}
          </span>
        </div>
      </div>

      {/* 6 KPI SUMMARY CARDS (Matching media_1792571959715_ef908bbd.jpg) */}
      <div className="grievance-kpi-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
        gap: '12px',
        marginBottom: '18px'
      }}>
        {/* Card 1: Total Civic Reports */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', color: '#2563EB' }}>
            <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" fill="none" strokeWidth="2.2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}>
              {metrics?.total_complaints || complaints.length || 124}
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', marginTop: '2px' }}>Total Civic Reports</div>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#10B981', marginTop: '2px' }}>↑ 12% from last week</div>
          </div>
        </div>

        {/* Card 2: Pending Verification */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#FFFBEB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D97706' }}>
            <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" fill="none" strokeWidth="2.2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}>
              {metrics?.pending_verification_count ?? 18}
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', marginTop: '2px' }}>Pending Verification</div>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#D97706', marginTop: '2px' }}>Awaiting Evidence Triage</div>
          </div>
        </div>

        {/* Card 3: Verified Civic Issues */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
            <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" fill="none" strokeWidth="2.2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}>
              {metrics?.verified_count ?? 42}
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', marginTop: '2px' }}>Verified Civic Issues</div>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#059669', marginTop: '2px' }}>Confirmed Defect Geometry</div>
          </div>
        </div>

        {/* Card 4: Needs Review */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EA580C' }}>
            <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" fill="none" strokeWidth="2.2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}>
              {metrics?.needs_review_count ?? 21}
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', marginTop: '2px' }}>Needs Review</div>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#EA580C', marginTop: '2px' }}>Inconclusive Evidence</div>
          </div>
        </div>

        {/* Card 5: Duplicate Submissions */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7C3AED' }}>
            <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" fill="none" strokeWidth="2.2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}>
              {metrics?.duplicate_count ?? 6}
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', marginTop: '2px' }}>Duplicate Submissions</div>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#7C3AED', marginTop: '2px' }}>Proximity / Temporal Matches</div>
          </div>
        </div>

        {/* Card 6: Rejected Reports */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#DC2626' }}>
            <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" fill="none" strokeWidth="2.2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}>
              {metrics?.rejected_count ?? 12}
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', marginTop: '2px' }}>Rejected Reports</div>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#DC2626', marginTop: '2px' }}>Excluded From Road Damage</div>
          </div>
        </div>
      </div>

      {/* SUB-TABS: Grievance Queue & Triage vs Verified Civic Issues */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #E2E8F0', marginBottom: '14px' }}>
        <button
          onClick={() => setActiveSection('queue')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'none',
            border: 'none',
            borderBottom: activeSection === 'queue' ? '2.5px solid #2563EB' : '2.5px solid transparent',
            padding: '10px 14px',
            fontSize: '0.86rem',
            fontWeight: activeSection === 'queue' ? 800 : 600,
            color: activeSection === 'queue' ? '#2563EB' : '#64748B',
            cursor: 'pointer'
          }}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" strokeWidth="2.2">
            <line x1="8" y1="6" x2="21" y2="6"></line>
            <line x1="8" y1="12" x2="21" y2="12"></line>
            <line x1="8" y1="18" x2="21" y2="18"></line>
            <line x1="3" y1="6" x2="3.01" y2="6"></line>
            <line x1="3" y1="12" x2="3.01" y2="12"></line>
            <line x1="3" y1="18" x2="3.01" y2="18"></line>
          </svg>
          <span>Grievance Queue & Triage</span>
          <span style={{
            background: activeSection === 'queue' ? '#2563EB' : '#E2E8F0',
            color: activeSection === 'queue' ? '#FFFFFF' : '#475569',
            fontSize: '0.7rem',
            fontWeight: 800,
            padding: '1px 8px',
            borderRadius: '12px'
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
            padding: '10px 14px',
            fontSize: '0.86rem',
            fontWeight: activeSection === 'verified_issues' ? 800 : 600,
            color: activeSection === 'verified_issues' ? '#059669' : '#64748B',
            cursor: 'pointer'
          }}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" strokeWidth="2.2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <span>Verified Civic Issues</span>
          <span style={{
            background: activeSection === 'verified_issues' ? '#059669' : '#E2E8F0',
            color: activeSection === 'verified_issues' ? '#FFFFFF' : '#475569',
            fontSize: '0.7rem',
            fontWeight: 800,
            padding: '1px 8px',
            borderRadius: '12px'
          }}>
            {metrics?.verified_count || verifiedCounts.verified || 42}
          </span>
        </button>
      </div>

      {/* FILTER BAR: Search, Dropdowns, Reset */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '10px',
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '10px',
        marginBottom: '16px'
      }}>
        {/* Search Input */}
        <div style={{ flex: '1 1 260px', position: 'relative' }}>
          <svg
            viewBox="0 0 24 24"
            width="15"
            height="15"
            stroke="#94A3B8"
            fill="none"
            strokeWidth="2"
            style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            placeholder="Search by ticket ID, landmark, road name, citizen description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '7px 12px 7px 32px',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              fontSize: '0.78rem',
              color: '#0F172A',
              outline: 'none',
              background: '#F8FAFC'
            }}
          />
        </div>

        {/* Category Dropdown */}
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          style={{ padding: '7px 10px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '0.78rem', color: '#0F172A', background: '#FFFFFF', cursor: 'pointer' }}
        >
          <option value="all">All Categories ˇ</option>
          <option value="Pothole">Pothole / Road Damage</option>
          <option value="Water">Water Leakage</option>
          <option value="Drainage">Drainage & Flooding</option>
          <option value="Streetlight">Streetlight Failure</option>
          <option value="Garbage">Garbage / Solid Waste</option>
          <option value="Traffic">Traffic Hazard</option>
        </select>

        {/* Urgency Dropdown */}
        <select
          value={filterUrgency}
          onChange={(e) => setFilterUrgency(e.target.value)}
          style={{ padding: '7px 10px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '0.78rem', color: '#0F172A', background: '#FFFFFF', cursor: 'pointer' }}
        >
          <option value="all">All Urgency Levels ˇ</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Moderate">Moderate / Medium</option>
          <option value="Low">Low</option>
        </select>

        {/* Ward Dropdown */}
        <select
          value={filterWard}
          onChange={(e) => setFilterWard(e.target.value)}
          style={{ padding: '7px 10px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '0.78rem', color: '#0F172A', background: '#FFFFFF', cursor: 'pointer' }}
        >
          <option value="all">All Wards / Zones ˇ</option>
          <option value="Ward 87">Ward 87 - Marathahalli</option>
          <option value="Ward 76">Ward 76 - Jayanagar</option>
          <option value="Ward 150">Ward 150 - Whitefield</option>
          <option value="Ward 95">Ward 95 - Koramangala</option>
          <option value="Ward 83">Ward 83 - Indiranagar</option>
          <option value="Mahadevapura">Mahadevapura Zone</option>
          <option value="South Zone">South Zone</option>
          <option value="East Zone">East Zone</option>
          <option value="Central Zone">Central Zone</option>
        </select>

        {/* Department Dropdown */}
        <select
          value={filterDepartment}
          onChange={(e) => setFilterDepartment(e.target.value)}
          style={{ padding: '7px 10px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '0.78rem', color: '#0F172A', background: '#FFFFFF', cursor: 'pointer' }}
        >
          <option value="all">All Departments ˇ</option>
          <option value="BBMP Road">BBMP Road Infrastructure</option>
          <option value="BWSSB">BWSSB Water Supply</option>
          <option value="BESCOM">BESCOM Electrical</option>
          <option value="SWM">BBMP Solid Waste Management</option>
          <option value="BTP">Bengaluru Traffic Police (BTP)</option>
        </select>

        {/* Date Range Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '0 8px', background: '#FFFFFF' }}>
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="#64748B" fill="none" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <select
            value={filterDateRange}
            onChange={(e) => setFilterDateRange(e.target.value)}
            style={{ border: 'none', background: 'transparent', fontSize: '0.78rem', color: '#0F172A', outline: 'none', padding: '7px 0', cursor: 'pointer' }}
          >
            <option value="today">Today</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days ˇ</option>
            <option value="all">All Time</option>
          </select>
        </div>

        {/* Reset Filters */}
        <button
          onClick={handleResetFilters}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'none',
            border: 'none',
            color: '#2563EB',
            fontSize: '0.78rem',
            fontWeight: 700,
            cursor: 'pointer',
            padding: '7px 10px'
          }}
        >
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2.2">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
          <span>Reset Filters</span>
        </button>

        {/* Sort Dropdown */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          style={{ marginLeft: 'auto', padding: '7px 10px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '0.78rem', color: '#0F172A', background: '#FFFFFF', fontWeight: 600, cursor: 'pointer' }}
        >
          <option value="latest">Sort: Latest First ˇ</option>
          <option value="oldest">Sort: Oldest First ˇ</option>
          <option value="risk_desc">Sort: Risk (High to Low) ˇ</option>
        </select>
      </div>

      {/* SECTION 1: GRIEVANCE QUEUE & TRIAGE VIEW */}
      {activeSection === 'queue' && (
        <div className="grievance-main-grid" style={{
          display: 'grid',
          gridTemplateColumns: currentComplaint ? 'minmax(330px, 380px) 1fr' : '1fr',
          gap: '16px',
          alignItems: 'start'
        }}>
          {/* LEFT ROSTER: Civic Reports List */}
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '14px 16px',
            maxHeight: 'calc(100vh - 270px)',
            overflowY: 'auto'
          }}>
            {/* Header: Civic Reports (count) + Export & Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #F1F5F9' }}>
              <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#0F172A' }}>
                Civic Reports ({filteredComplaints.length})
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => showToast('Grievance manifest exported to CSV.')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: '#475569',
                    cursor: 'pointer'
                  }}
                >
                  <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  <span>Export</span>
                </button>
                <button
                  style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '4px 8px', color: '#64748B', cursor: 'pointer', fontSize: '0.72rem' }}
                >
                  •••
                </button>
              </div>
            </div>

            {/* List of Report Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredComplaints.length === 0 ? (
                <div style={{ padding: '36px 16px', textAlign: 'center', color: '#64748B', fontSize: '0.82rem' }}>
                  No civic reports match the current filter criteria.
                </div>
              ) : (
                filteredComplaints.map(c => {
                  const isSelected = c.ticket_number === selectedTicketId;
                  const urg = getUrgencyBadge(c.urgency);
                  const riskColor = getRiskColor(c.risk_score || 5.0);

                  return (
                    <div
                      key={c.ticket_number}
                      onClick={() => loadDossier(c.ticket_number)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        background: isSelected ? '#FEF2F2' : '#FFFFFF',
                        border: isSelected ? '1px solid #FCA5A5' : '1px solid #E2E8F0',
                        borderLeft: isSelected ? '4px solid #EF4444' : '1px solid #E2E8F0',
                        borderRadius: '10px',
                        padding: '12px 14px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: isSelected ? '0 2px 8px rgba(239,68,68,0.1)' : '0 1px 2px rgba(0,0,0,0.02)'
                      }}
                    >
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        style={{ cursor: 'pointer', accentColor: '#EF4444' }}
                      />

                      {/* Thumbnail with video overlay if video */}
                      <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        position: 'relative',
                        background: '#0F172A',
                        flexShrink: 0
                      }}>
                        <img
                          src={c.image_url || '/api/grievances/images/sample_pothole.jpg'}
                          alt="Evidence thumbnail"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => { e.target.src = '/api/grievances/images/sample_pothole.jpg'; }}
                        />
                        {isVideoUrl(c.image_url) && (
                          <div style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'rgba(0,0,0,0.45)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <svg viewBox="0 0 24 24" width="10" height="10" fill="#0F172A">
                                <polygon points="5 3 19 12 5 21 5 3" />
                              </svg>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Text Details */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', fontFamily: 'monospace' }}>
                          {c.ticket_number}
                        </div>
                        <div style={{
                          fontSize: '0.86rem',
                          fontWeight: 800,
                          color: '#0F172A',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          lineHeight: 1.3
                        }}>
                          {c.title}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                          <svg viewBox="0 0 24 24" width="11" height="11" stroke="currentColor" fill="none" strokeWidth="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                            <circle cx="12" cy="10" r="3"></circle>
                          </svg>
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '170px' }}>
                            {c.landmark_address || c.ward_zone}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#94A3B8', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <svg viewBox="0 0 24 24" width="11" height="11" stroke="currentColor" fill="none" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                          </svg>
                          <span>2 hours ago | By Citizen</span>
                        </div>

                        {/* Category & Ward Tag Pills */}
                        <div style={{ display: 'flex', gap: '5px', marginTop: '5px', flexWrap: 'wrap' }}>
                          <span style={{ background: '#EFF6FF', color: '#2563EB', fontSize: '0.64rem', fontWeight: 700, padding: '1px 6px', borderRadius: '4px' }}>
                            {c.category?.includes('Pothole') ? 'Road Infrastructure' : c.category?.split('/')[0] || c.category}
                          </span>
                          <span style={{ background: '#F1F5F9', color: '#475569', fontSize: '0.64rem', fontWeight: 600, padding: '1px 6px', borderRadius: '4px' }}>
                            {c.ward_zone?.split('-')[0] || 'Ward 87'}
                          </span>
                        </div>
                      </div>

                      {/* Right Edge: Severity Pill, Risk Gauge & Chevron */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
                        <span style={{
                          background: urg.bg,
                          color: urg.text,
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '12px'
                        }}>
                          {urg.label}
                        </span>

                        {/* Circular Risk Badge */}
                        <div style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '50%',
                          border: `2.5px solid ${riskColor}`,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: '#FFFFFF'
                        }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>
                            {c.risk_score ? c.risk_score.toFixed(1) : '9.2'}
                          </span>
                          <span style={{ fontSize: '0.52rem', fontWeight: 700, color: riskColor, textTransform: 'uppercase', lineHeight: 1 }}>
                            Risk
                          </span>
                        </div>

                        <svg viewBox="0 0 24 24" width="14" height="14" stroke="#94A3B8" fill="none" strokeWidth="2.5">
                          <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT DETAIL PANE: Opened only when a report is clicked! */}
          {currentComplaint ? (
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '20px 24px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
            }}>
              {/* Header: Alert Icon, Title, Status & Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px', paddingBottom: '14px', borderBottom: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', flexShrink: 0 }}>
                    <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" fill="none" strokeWidth="2.2">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                      <line x1="12" y1="9" x2="12" y2="13"></line>
                      <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                        {currentComplaint.title}
                      </h2>
                      <span style={{ background: '#EFF6FF', color: '#2563EB', padding: '2px 8px', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 700, fontFamily: 'monospace' }}>
                        #{currentComplaint.ticket_number}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '6px', fontSize: '0.74rem', color: '#64748B', flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" strokeWidth="2">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                          <circle cx="12" cy="10" r="3"></circle>
                        </svg>
                        <span>{currentComplaint.landmark_address}</span>
                      </span>

                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" strokeWidth="2">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                          <line x1="16" y1="2" x2="16" y2="6"></line>
                          <line x1="8" y1="2" x2="8" y2="6"></line>
                          <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                        <span>Reported 2 hours ago ({currentComplaint.created_at})</span>
                      </span>

                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" strokeWidth="2">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                          <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                        <span>By Citizen</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right controls: Urgency pill, Status dropdown, Share, ..., Close button */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    background: getUrgencyBadge(currentComplaint.urgency).bg,
                    color: getUrgencyBadge(currentComplaint.urgency).text,
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    padding: '4px 10px',
                    borderRadius: '8px'
                  }}>
                    {getUrgencyBadge(currentComplaint.urgency).label}
                  </span>

                  <span style={{
                    background: getStatusBadge(currentComplaint.verification_status || currentComplaint.status).bg,
                    color: getStatusBadge(currentComplaint.verification_status || currentComplaint.status).text,
                    border: `1px solid ${getStatusBadge(currentComplaint.verification_status || currentComplaint.status).border}`,
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: '8px'
                  }}>
                    {currentComplaint.verification_status || currentComplaint.status} ˇ
                  </span>

                  <button
                    onClick={() => {
                      if (navigator.clipboard) {
                        navigator.clipboard.writeText(window.location.href);
                        showToast('Ticket link copied to clipboard.');
                      }
                    }}
                    style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '6px 10px', fontSize: '0.74rem', fontWeight: 600, color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" strokeWidth="2">
                      <circle cx="18" cy="5" r="3"></circle>
                      <circle cx="6" cy="12" r="3"></circle>
                      <circle cx="18" cy="19" r="3"></circle>
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                    </svg>
                    <span>Share</span>
                  </button>

                  <button
                    style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '6px 10px', color: '#64748B', cursor: 'pointer', fontSize: '0.74rem' }}
                  >
                    •••
                  </button>

                  {/* Close button (Requirement 2) */}
                  <button
                    onClick={handleCloseDetail}
                    title="Close Details (Esc)"
                    style={{
                      background: '#F1F5F9',
                      border: '1px solid #CBD5E1',
                      borderRadius: '8px',
                      padding: '6px 10px',
                      color: '#0F172A',
                      fontWeight: 800,
                      cursor: 'pointer',
                      fontSize: '0.85rem'
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* 5 Detail Tabs */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '1px solid #E2E8F0', margin: '14px 0 16px 0' }}>
                {[
                  { id: 'overview', label: 'Overview' },
                  { id: 'ai_analysis', label: 'AI Analysis' },
                  { id: 'location_map', label: 'Location & Map' },
                  { id: 'comments', label: `Comments (${internalComments.length})` },
                  { id: 'activity_log', label: 'Activity Log' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveDetailTab(tab.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      borderBottom: activeDetailTab === tab.id ? '2.5px solid #2563EB' : '2.5px solid transparent',
                      padding: '8px 10px',
                      fontSize: '0.82rem',
                      fontWeight: activeDetailTab === tab.id ? 800 : 600,
                      color: activeDetailTab === tab.id ? '#2563EB' : '#64748B',
                      cursor: 'pointer'
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* TAB 1: OVERVIEW TAB CONTENT (Pixel-accurate matching media_1792571959715_ef908bbd.jpg) */}
              {activeDetailTab === 'overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  {/* Top 3-Card Grid */}
                  <div className="grievance-detail-overview-grid" style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(280px, 1.2fr) minmax(240px, 1fr) minmax(260px, 1.1fr)',
                    gap: '14px',
                    alignItems: 'stretch'
                  }}>
                    {/* Card 1: Evidence (Video / Images) + Issue Details */}
                    <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0F172A' }}>
                        Evidence (Video / Images)
                      </div>

                      {/* Video Player */}
                      <div style={{
                        position: 'relative',
                        width: '100%',
                        height: '160px',
                        background: '#0F172A',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {isVideoUrl(currentComplaint.image_url) ? (
                          <video
                            ref={videoPlayerRef}
                            src={currentComplaint.image_url}
                            controls
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <>
                            <img
                              src={currentComplaint.image_url || '/api/grievances/images/sample_pothole.jpg'}
                              alt="Defect visual evidence"
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={(e) => { e.target.src = '/api/grievances/images/sample_pothole.jpg'; }}
                            />
                            {/* Play button overlay */}
                            <div
                              onClick={() => {
                                setPreviewImgUrl(currentComplaint.image_url || '/api/grievances/images/sample_pothole.jpg');
                                setActiveModal('preview_img');
                              }}
                              style={{
                                position: 'absolute',
                                width: '38px',
                                height: '38px',
                                borderRadius: '50%',
                                background: 'rgba(0,0,0,0.65)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                border: '2px solid white'
                              }}
                            >
                              <svg viewBox="0 0 24 24" width="16" height="16" fill="white">
                                <polygon points="5 3 19 12 5 21 5 3" />
                              </svg>
                            </div>
                            <div style={{ position: 'absolute', bottom: '6px', left: '10px', color: 'white', fontSize: '0.68rem', fontWeight: 600 }}>
                              0:00 / 0:15
                            </div>
                          </>
                        )}
                      </div>

                      {/* Extra thumbnail row + +2 More */}
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <div style={{ width: '48px', height: '40px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #CBD5E1' }}>
                          <img src="/api/grievances/images/sample_pothole.jpg" alt="Frame" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <div style={{ width: '48px', height: '40px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #CBD5E1' }}>
                          <img src="/api/grievances/images/sample_drainage.jpg" alt="Frame" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <div style={{
                          width: '48px',
                          height: '40px',
                          borderRadius: '6px',
                          background: '#F1F5F9',
                          border: '1px dashed #CBD5E1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          color: '#475569',
                          cursor: 'pointer'
                        }}>
                          +2 More
                        </div>
                      </div>

                      {/* Issue Details List */}
                      <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '10px' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>
                          Issue Details
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.74rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#64748B' }}>Category</span>
                            <span style={{ fontWeight: 700, color: '#0F172A' }}>
                              {currentComplaint.category?.includes('Pothole') ? 'Road Infrastructure' : currentComplaint.category}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#64748B' }}>Sub-category</span>
                            <span style={{ fontWeight: 700, color: '#0F172A' }}>
                              {currentComplaint.subcategory || 'Pothole'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#64748B' }}>Ward / Zone</span>
                            <span style={{ fontWeight: 700, color: '#0F172A' }}>
                              {currentComplaint.ward_zone || 'Ward 87 - Marathahalli'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#64748B' }}>Location (Lat, Long)</span>
                            <span style={{ fontWeight: 700, color: '#0F172A', fontFamily: 'monospace' }}>
                              {currentComplaint.latitude?.toFixed(4)}, {currentComplaint.longitude?.toFixed(4)}
                            </span>
                          </div>
                          <div style={{ marginTop: '4px' }}>
                            <span style={{ color: '#64748B', display: 'block', marginBottom: '2px' }}>Description</span>
                            <span style={{ color: '#1E293B', fontWeight: 500, lineHeight: 1.35 }}>
                              {currentComplaint.description}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card 2: AI Analysis (YOLO Detection) */}
                    <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 800, color: '#0F172A' }}>
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="#2563EB" fill="none" strokeWidth="2.2">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                        <span>AI Analysis (YOLO Detection)</span>
                      </div>

                      {/* Bounding box detection thumbnail */}
                      <div style={{ position: 'relative', width: '100%', height: '140px', borderRadius: '8px', overflow: 'hidden', background: '#0F172A' }}>
                        <img
                          src={currentComplaint.image_url || '/api/grievances/images/sample_pothole.jpg'}
                          alt="AI detection preview"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => { e.target.src = '/api/grievances/images/sample_pothole.jpg'; }}
                        />
                        {/* Red bounding box */}
                        <div style={{
                          position: 'absolute',
                          top: '25%',
                          left: '20%',
                          width: '55%',
                          height: '50%',
                          border: '2px solid #EF4444',
                          background: 'rgba(239, 68, 68, 0.15)',
                          borderRadius: '4px'
                        }}>
                          <span style={{ position: 'absolute', top: '-14px', left: 0, background: '#EF4444', color: 'white', fontSize: '0.55rem', fontWeight: 800, padding: '1px 4px', borderRadius: '2px' }}>
                            POTHOLE 87%
                          </span>
                        </div>
                      </div>

                      {/* Detected Category Pill */}
                      <div>
                        <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600, marginBottom: '4px' }}>
                          Detected Category
                        </div>
                        <span style={{
                          background: '#FEE2E2',
                          color: '#DC2626',
                          fontSize: '0.76rem',
                          fontWeight: 800,
                          padding: '3px 10px',
                          borderRadius: '6px',
                          display: 'inline-block'
                        }}>
                          {currentComplaint.category || 'Pothole / Road Damage'}
                        </span>
                      </div>

                      {/* Confidence Score */}
                      <div>
                        <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Confidence</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
                          {currentComplaint.ai_analysis?.confidence_display || '0.87 (87%)'}
                        </div>
                      </div>

                      {/* Additional Detections */}
                      <div>
                        <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600, marginBottom: '4px' }}>
                          Additional Detections
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.74rem', color: '#334155' }}>
                          {(currentComplaint.ai_analysis?.additional_detections || [
                            { label: 'Road Surface', confidence: 0.72 },
                            { label: 'Cracks', confidence: 0.68 }
                          ]).map((det, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ color: '#94A3B8' }}>⏱</span>
                              <span>{det.label} ({det.confidence})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Card 3: Risk Assessment */}
                    <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 800, color: '#0F172A' }}>
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="#EF4444" fill="none" strokeWidth="2.2">
                          <circle cx="12" cy="12" r="3"></circle>
                          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                        </svg>
                        <span>Risk Assessment</span>
                      </div>

                      {/* Radial Gauge and Progress Bars Side-by-Side */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        {/* Radial Gauge Circle */}
                        <div style={{
                          width: '90px',
                          height: '90px',
                          borderRadius: '50%',
                          border: '6px solid #EF4444',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <span style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0F172A', lineHeight: 1 }}>
                            {currentComplaint.risk_score ? currentComplaint.risk_score.toFixed(1) : '9.2'}
                          </span>
                          <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#EF4444', textTransform: 'uppercase', marginTop: '2px' }}>
                            High Risk
                          </span>
                        </div>

                        {/* Progress Bars */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.68rem' }}>
                          {[
                            { label: 'Public Safety Risk', val: currentComplaint.risk_breakdown?.public_safety || 9.0, color: '#EF4444' },
                            { label: 'Traffic Exposure', val: currentComplaint.risk_breakdown?.traffic_exposure || 8.5, color: '#F97316' },
                            { label: 'Severity (Size/Depth)', val: currentComplaint.risk_breakdown?.severity || 9.2, color: '#EF4444' },
                            { label: 'Weather Impact', val: currentComplaint.risk_breakdown?.weather_impact || 7.0, color: '#F59E0B' },
                            { label: 'Proximity to Sensitive Area', val: currentComplaint.risk_breakdown?.proximity || 6.8, color: '#F59E0B' }
                          ].map((item, idx) => (
                            <div key={idx}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px', color: '#475569', fontWeight: 600 }}>
                                <span>{item.label}</span>
                                <span style={{ fontWeight: 800, color: item.color }}>{item.val.toFixed(1)}</span>
                              </div>
                              <div style={{ width: '100%', height: '5px', background: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: `${item.val * 10}%`, height: '100%', background: item.color, borderRadius: '3px' }}></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Middle Row: AI Recommendations */}
                  <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 800, color: '#0F172A' }}>
                        <span style={{ color: '#7C3AED' }}>✦</span>
                        <span>AI Recommendations</span>
                      </div>
                      <button
                        onClick={() => setActiveDetailTab('ai_analysis')}
                        style={{ background: 'none', border: 'none', color: '#2563EB', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer' }}
                      >
                        View Detailed Analysis →
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {(currentComplaint.ai_recommendations || [
                        {
                          id: 1,
                          title: 'Schedule urgent repair within 24 hours.',
                          rationale: 'High safety risk and heavy traffic on Outer Ring Road.',
                          priority: 'High Priority'
                        },
                        {
                          id: 2,
                          title: 'Dispatch road maintenance team with patching equipment.',
                          rationale: 'Suitable for immediate temporary repair.',
                          priority: 'Recommended'
                        },
                        {
                          id: 3,
                          title: 'Place temporary warning signage and barricades.',
                          rationale: 'Reduce accident risk until permanent repair is completed.',
                          priority: 'Recommended'
                        }
                      ]).map((rec, i) => (
                        <div
                          key={i}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: '#F8FAFC',
                            border: '1px solid #E2E8F0',
                            borderRadius: '8px',
                            padding: '10px 14px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 800, flexShrink: 0 }}>
                              {rec.id || i + 1}
                            </div>
                            <div>
                              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0F172A' }}>
                                {rec.title}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '1px' }}>
                                Rationale: {rec.rationale}
                              </div>
                            </div>
                          </div>

                          <span style={{
                            background: rec.priority?.includes('High') ? '#FEE2E2' : '#EFF6FF',
                            color: rec.priority?.includes('High') ? '#DC2626' : '#2563EB',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            flexShrink: 0
                          }}>
                            {rec.priority || 'Recommended'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bottom Row: Dispatch & Assignment (Left 60%) + Actions (Right 40%) */}
                  <div className="grievance-dispatch-actions-grid" style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(320px, 1.4fr) minmax(260px, 1fr)',
                    gap: '14px',
                    alignItems: 'stretch'
                  }}>
                    {/* Dispatch & Assignment */}
                    <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 800, color: '#0F172A' }}>
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="#2563EB" fill="none" strokeWidth="2.2">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                          <circle cx="9" cy="7" r="4"></circle>
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                        <span>Dispatch & Assignment</span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.7rem', color: '#64748B', fontWeight: 600, marginBottom: '4px' }}>
                            Suggested Department
                          </label>
                          <select
                            value={modalData.department || currentComplaint.assigned_department || 'BBMP - Road Infrastructure'}
                            onChange={(e) => setModalData(prev => ({ ...prev, department: e.target.value }))}
                            style={{ width: '100%', padding: '7px 10px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.76rem', color: '#0F172A', background: '#FFFFFF' }}
                          >
                            <option value="BBMP - Road Infrastructure">BBMP - Road Infrastructure</option>
                            <option value="BWSSB Water Supply Division">BWSSB Water Supply Division</option>
                            <option value="BESCOM Electrical Infrastructure">BESCOM Electrical Infrastructure</option>
                            <option value="BBMP Solid Waste Management (SWM)">BBMP Solid Waste Management (SWM)</option>
                            <option value="Bengaluru Traffic Police (BTP)">Bengaluru Traffic Police (BTP)</option>
                          </select>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.7rem', color: '#64748B', fontWeight: 600, marginBottom: '4px' }}>
                            Assign to
                          </label>
                          <select
                            value={modalData.squad || currentComplaint.assigned_squad || 'Select Team / Officer'}
                            onChange={(e) => setModalData(prev => ({ ...prev, squad: e.target.value }))}
                            style={{ width: '100%', padding: '7px 10px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.76rem', color: '#0F172A', background: '#FFFFFF' }}
                          >
                            <option value="">Select Team / Officer ˇ</option>
                            <option value="Rapid Pothole Patch Unit Alpha">Rapid Pothole Patch Unit Alpha</option>
                            <option value="Asphalt Milling & Compactor Squad 2">Asphalt Milling & Compactor Squad 2</option>
                            <option value="Leakage Detection Squad 1">Leakage Detection Squad 1</option>
                            <option value="Compactor Truck Rapid Unit 9">Compactor Truck Rapid Unit 9</option>
                            <option value="Traffic Quick Reaction Team Alpha">Traffic Quick Reaction Team Alpha</option>
                          </select>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem', color: '#475569', marginTop: '2px' }}>
                        <svg viewBox="0 0 24 24" width="14" height="14" stroke="#64748B" fill="none" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"></circle>
                          <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        <span>Target Response Time:</span>
                        <span style={{ background: '#FFFBEB', color: '#B45309', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', border: '1px solid #FDE68A' }}>
                          24 hours (High Priority)
                        </span>
                      </div>
                    </div>

                    {/* Actions Card */}
                    <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0F172A' }}>
                        Actions
                      </div>

                      {/* Primary full-width button: Assign Department */}
                      <button
                        onClick={handleAssignSubmit}
                        disabled={actionLoading}
                        style={{
                          width: '100%',
                          background: '#2563EB',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '10px 14px',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          cursor: actionLoading ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          boxShadow: '0 2px 6px rgba(37,99,235,0.25)'
                        }}
                      >
                        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2.2">
                          <line x1="22" y1="2" x2="11" y2="13"></line>
                          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                        </svg>
                        <span>Assign Department</span>
                      </button>

                      {/* 3 Action Buttons in a Row */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                        {/* Create Work Order */}
                        <button
                          onClick={() => {
                            setModalData({
                              priority: currentComplaint.urgency || 'High',
                              target_hours: 24,
                              squad: currentComplaint.assigned_squad || 'Rapid Pothole Patch Unit Alpha',
                              instructions: `Remediate ${currentComplaint.category} on ${currentComplaint.landmark_address}.`
                            });
                            setActiveModal('work_order');
                          }}
                          style={{
                            background: '#FFFFFF',
                            border: '1px solid #CBD5E1',
                            borderRadius: '8px',
                            padding: '8px 4px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            color: '#0F172A',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                          }}
                        >
                          <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" fill="none" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                          </svg>
                          <span>Create Work Order</span>
                        </button>

                        {/* Request Review */}
                        <button
                          onClick={handleRequestReview}
                          disabled={actionLoading}
                          style={{
                            background: '#FFFFFF',
                            border: '1px solid #CBD5E1',
                            borderRadius: '8px',
                            padding: '8px 4px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            color: '#0F172A',
                            cursor: actionLoading ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                          }}
                        >
                          <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" fill="none" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                          </svg>
                          <span>Request Review</span>
                        </button>

                        {/* Resolve */}
                        <button
                          onClick={() => {
                            setModalData({ resolution_notes: 'Remediation completed to municipal civil engineering code.' });
                            setActiveModal('resolve');
                          }}
                          style={{
                            background: '#10B981',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '8px 4px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            color: '#FFFFFF',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                          }}
                        >
                          <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" fill="none" strokeWidth="2.4">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          <span>Resolve</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: AI ANALYSIS TAB */}
              {activeDetailTab === 'ai_analysis' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '16px' }}>
                    <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0F172A', margin: '0 0 10px 0' }}>
                      Automated Computer Vision Detection Pipeline
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                      <div style={{ background: '#FFFFFF', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                        <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600 }}>Laplacian Sharpness Variance</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
                          {currentComplaint.evidence_assessment?.blur_score || '145.2'}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: '#10B981', fontWeight: 700 }}>High Focal Sharpness (Clear)</div>
                      </div>

                      <div style={{ background: '#FFFFFF', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                        <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600 }}>Mean Ambient Brightness</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
                          {currentComplaint.evidence_assessment?.brightness || '128.0'} / 255
                        </div>
                        <div style={{ fontSize: '0.65rem', color: '#2563EB', fontWeight: 700 }}>Optimal Daylight Lux</div>
                      </div>

                      <div style={{ background: '#FFFFFF', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                        <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600 }}>Defect Geometry Match</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
                          {currentComplaint.category}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: '#7C3AED', fontWeight: 700 }}>Asphalt Pavement Discontinuity</div>
                      </div>
                    </div>

                    <div style={{ marginTop: '14px', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '12px' }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0F172A', marginBottom: '6px' }}>
                        Detected Visual Features:
                      </div>
                      <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.74rem', color: '#475569', lineHeight: 1.6 }}>
                        {(currentComplaint.evidence_assessment?.detected_features || [
                          "Road asphalt surface match: 82.5%",
                          "High-contrast cavity/crack boundary density (9.4%)",
                          "Localized structural surface defect: 1.2m diameter depth depression"
                        ]).map((f, idx) => (
                          <li key={idx}>{f}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: LOCATION & MAP TAB */}
              {activeDetailTab === 'location_map' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div
                    ref={detailMapRef}
                    style={{
                      width: '100%',
                      height: '380px',
                      borderRadius: '10px',
                      border: '1px solid #CBD5E1',
                      overflow: 'hidden'
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem', color: '#475569' }}>
                    <span>Landmark: <strong>{currentComplaint.landmark_address}</strong></span>
                    <span>Coordinates: <strong>{currentComplaint.latitude}° N, {currentComplaint.longitude}° E</strong></span>
                  </div>
                </div>
              )}

              {/* TAB 4: COMMENTS TAB */}
              {activeDetailTab === 'comments' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Add comment form */}
                  <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      placeholder="Add an internal municipal comment / triage note..."
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      style={{ flex: 1, padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '0.78rem' }}
                    />
                    <button
                      type="submit"
                      style={{ background: '#2563EB', color: '#FFFFFF', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Post Comment
                    </button>
                  </form>

                  {/* Comments feed */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {internalComments.map(c => (
                      <div key={c.id} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '12px 14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0F172A' }}>{c.author}</span>
                          <span style={{ fontSize: '0.68rem', color: '#94A3B8' }}>{c.timestamp}</span>
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#2563EB', fontWeight: 700, marginBottom: '4px' }}>{c.role}</div>
                        <div style={{ fontSize: '0.76rem', color: '#334155', lineHeight: 1.4 }}>{c.text}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 5: ACTIVITY LOG TAB */}
              {activeDetailTab === 'activity_log' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {((dossier?.history && dossier.history.length > 0) ? dossier.history : [
                    { action: 'SUBMITTED', actor_name: 'Citizen', timestamp: currentComplaint.created_at, notes: 'Complaint submitted with live video evidence.' },
                    { action: 'REVIEWED', actor_name: 'Duty Officer V. Nayak', timestamp: '2026-10-20 14:45:00', notes: 'Location validated near Outer Ring Road.' }
                  ]).map((event, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', borderLeft: '2px solid #2563EB', paddingLeft: '12px', paddingBottom: '12px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2563EB', marginLeft: '-17px', marginTop: '4px' }} />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0F172A' }}>{event.action}</span>
                          <span style={{ fontSize: '0.68rem', color: '#64748B' }}>by {event.actor_name}</span>
                          <span style={{ fontSize: '0.68rem', color: '#94A3B8' }}>{event.timestamp}</span>
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#475569', marginTop: '2px' }}>{event.notes}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* EMPTY DETAIL PLACEHOLDER (When selectedTicketId is null initially as per Requirement 2) */
            <div style={{
              background: '#FFFFFF',
              border: '1px dashed #CBD5E1',
              borderRadius: '12px',
              padding: '60px 24px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '400px'
            }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
                <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" fill="none" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                </svg>
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: '0 0 6px 0' }}>
                Select a Civic Report to Inspect
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#64748B', maxWidth: '360px', margin: 0, lineHeight: 1.4 }}>
                Click on any grievance in the list to view its complete video/image evidence, YOLO AI detection, risk assessment gauge, recommendations, and dispatch controls.
              </p>
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: VERIFIED CIVIC ISSUES VIEW */}
      {activeSection === 'verified_issues' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', minWidth: '720px', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}>
                  <th style={{ padding: '10px 12px' }}>Ticket ID</th>
                  <th style={{ padding: '10px 12px' }}>Issue & Landmark</th>
                  <th style={{ padding: '10px 12px' }}>Category</th>
                  <th style={{ padding: '10px 12px' }}>Status</th>
                  <th style={{ padding: '10px 12px' }}>Verification</th>
                  <th style={{ padding: '10px 12px' }}>Risk Score</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {verifiedIssues.map(issue => (
                  <tr key={issue.ticket_number} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 800, fontFamily: 'monospace' }}>
                      {issue.ticket_number}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontWeight: 700, color: '#0F172A' }}>{issue.title}</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748B' }}>{issue.landmark_address}</div>
                    </td>
                    <td style={{ padding: '10px 12px' }}>{issue.category}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        background: getStatusBadge(issue.status).bg,
                        color: getStatusBadge(issue.status).text,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontWeight: 700,
                        fontSize: '0.7rem'
                      }}>
                        {issue.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        background: issue.verification_status === 'Verified' ? '#ECFDF5' : '#FFFBEB',
                        color: issue.verification_status === 'Verified' ? '#059669' : '#D97706',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontWeight: 700,
                        fontSize: '0.7rem'
                      }}>
                        {issue.verification_status || 'Pending'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 800, color: getRiskColor(issue.risk_score || 5.0) }}>
                      {issue.risk_score ? issue.risk_score.toFixed(1) : '5.0'}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      <button
                        onClick={() => {
                          loadDossier(issue.ticket_number);
                          setActiveSection('queue');
                        }}
                        style={{ background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE', borderRadius: '6px', padding: '4px 10px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Inspect Dossier
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: CREATE WORK ORDER */}
      {activeModal === 'work_order' && currentComplaint && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '14px', width: '100%', maxWidth: '520px', padding: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #E2E8F0', paddingBottom: '10px' }}>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
                Create Municipal Work Order
              </div>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748B' }}>✕</button>
            </div>

            <form onSubmit={handleCreateWorkOrderSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Target Complaint</label>
                <input type="text" readOnly value={`${currentComplaint.ticket_number} - ${currentComplaint.title}`} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #E2E8F0', background: '#F8FAFC', fontSize: '0.78rem', color: '#475569' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Priority Level</label>
                  <select
                    value={modalData.priority || 'High'}
                    onChange={(e) => setModalData(prev => ({ ...prev, priority: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.78rem' }}
                  >
                    <option value="Critical">Critical (Immediate)</option>
                    <option value="High">High (24 Hours)</option>
                    <option value="Moderate">Moderate (48 Hours)</option>
                    <option value="Low">Low (72 Hours)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Target Completion</label>
                  <select
                    value={modalData.target_hours || 24}
                    onChange={(e) => setModalData(prev => ({ ...prev, target_hours: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.78rem' }}
                  >
                    <option value="12">12 Hours (Emergency)</option>
                    <option value="24">24 Hours (Standard)</option>
                    <option value="48">48 Hours</option>
                    <option value="72">72 Hours</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Assign Field Squad</label>
                <select
                  value={modalData.squad || currentComplaint.assigned_squad || 'Rapid Pothole Patch Unit Alpha'}
                  onChange={(e) => setModalData(prev => ({ ...prev, squad: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.78rem' }}
                >
                  <option value="Rapid Pothole Patch Unit Alpha">Rapid Pothole Patch Unit Alpha</option>
                  <option value="Asphalt Milling & Compactor Squad 2">Asphalt Milling & Compactor Squad 2</option>
                  <option value="Leakage Detection Squad 1">Leakage Detection Squad 1</option>
                  <option value="Compactor Truck Rapid Unit 9">Compactor Truck Rapid Unit 9</option>
                  <option value="Traffic Quick Reaction Team Alpha">Traffic Quick Reaction Team Alpha</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Work Instructions & Safety Protocol</label>
                <textarea
                  rows="3"
                  value={modalData.instructions || ''}
                  onChange={(e) => setModalData(prev => ({ ...prev, instructions: e.target.value }))}
                  placeholder="Specific repair specifications, materials to apply, and corridor traffic guidance..."
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.78rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFFFFF', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{ padding: '8px 18px', borderRadius: '6px', border: 'none', background: '#2563EB', color: '#FFFFFF', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  {actionLoading ? 'Issuing...' : 'Issue Work Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RESOLVE COMPLAINT */}
      {activeModal === 'resolve' && currentComplaint && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '14px', width: '100%', maxWidth: '480px', padding: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #E2E8F0', paddingBottom: '10px' }}>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
                Resolve Civic Complaint
              </div>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748B' }}>✕</button>
            </div>

            <form onSubmit={handleResolveSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Resolution Notes (Required)</label>
                <textarea
                  rows="3"
                  required
                  value={modalData.resolution_notes || ''}
                  onChange={(e) => setModalData(prev => ({ ...prev, resolution_notes: e.target.value }))}
                  placeholder="Detail the civil works completed, materials used, and sign-off confirmation..."
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.78rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Resolution Proof Photo (Optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setModalData(prev => ({ ...prev, resolution_file: e.target.files[0] }))}
                  style={{ width: '100%', fontSize: '0.78rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFFFFF', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{ padding: '8px 18px', borderRadius: '6px', border: 'none', background: '#10B981', color: '#FFFFFF', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  {actionLoading ? 'Resolving...' : 'Confirm Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: IMAGE PREVIEW MODAL */}
      {activeModal === 'preview_img' && previewImgUrl && (
        <div
          onClick={() => setActiveModal(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
        >
          <div style={{ maxWidth: '85vw', maxHeight: '85vh', position: 'relative' }}>
            <img src={previewImgUrl} alt="Enlarged evidence" style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: '8px', objectFit: 'contain' }} />
            <button
              onClick={() => setActiveModal(null)}
              style={{ position: 'absolute', top: '-40px', right: 0, background: 'none', border: 'none', color: '#FFFFFF', fontSize: '1.4rem', cursor: 'pointer' }}
            >
              ✕ Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
