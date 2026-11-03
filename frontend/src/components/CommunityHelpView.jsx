import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  MapPin, ThumbsUp, ThumbsDown, Users, CheckCircle, AlertTriangle, 
  Camera, Video, Play, Clock, ArrowRight, Search, RefreshCw, 
  Compass, Crosshair, X, ChevronDown, Check, Activity, FileText, 
  ShieldAlert, AlertCircle, Sparkles, Navigation, Info, Eye
} from 'lucide-react';
import { API_BASE } from '../config/api';

// Popular Bengaluru landmark locations for instant location switching
const PRESET_LOCALITIES = [
  { name: 'Marathahalli, Bengaluru', lat: 12.9569, lng: 77.7011, ward: 'East Zone (Mahadevapura)' },
  { name: 'Bellandur, Bengaluru', lat: 12.9352, lng: 77.6953, ward: 'East Zone (Mahadevapura)' },
  { name: 'Indiranagar, Bengaluru', lat: 12.9784, lng: 77.6408, ward: 'East Zone (Indiranagar)' },
  { name: 'Koramangala, Bengaluru', lat: 12.9352, lng: 77.6245, ward: 'South Zone (Koramangala)' },
  { name: 'HSR Layout, Bengaluru', lat: 12.9121, lng: 77.6446, ward: 'South Zone (HSR / BTM)' },
  { name: 'Electronic City, Bengaluru', lat: 12.8452, lng: 77.6602, ward: 'Bommanahalli Zone' },
  { name: 'Whitefield, Bengaluru', lat: 12.9863, lng: 77.7308, ward: 'East Zone (Whitefield)' },
  { name: 'MG Road / CBD, Bengaluru', lat: 12.9756, lng: 77.6067, ward: 'Central Zone (CBD)' },
  { name: 'Hebbal, Bengaluru', lat: 13.0358, lng: 77.5970, ward: 'North Zone (Hebbal)' }
];

// Helper: Haversine distance in meters
function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 999999;
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// Resilient API Fetch
async function apiCall(endpoint, options = {}) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, options);
    if (res.ok) return res;
    if (API_BASE.startsWith('http')) {
      const localRes = await fetch(`/api${endpoint}`, options);
      if (localRes.ok) return localRes;
    }
    return res;
  } catch (err) {
    if (API_BASE.startsWith('http')) {
      return await fetch(`/api${endpoint}`, options);
    }
    throw err;
  }
}

export default function CommunityHelpView({ 
  userLat = 12.9569, 
  userLng = 77.7011, 
  userAddress = 'Marathahalli, Bengaluru',
  user = null,
  showToast = (msg) => console.log(msg)
}) {
  // Current active location
  const [coords, setCoords] = useState({ lat: userLat || 12.9569, lng: userLng || 77.7011 });
  const [localityText, setLocalityText] = useState(userAddress || 'Marathahalli, Bengaluru');
  const [radiusKm, setRadiusKm] = useState(2.0);
  const [gpsAccuracy, setGpsAccuracy] = useState(8.0);
  const [gpsStatus, setGpsStatus] = useState('locked'); // 'locating' | 'locked' | 'denied'

  // Tab & Filter States
  const [activeTab, setActiveTab] = useState('nearby'); // 'nearby' | 'contributions' | 'verifications'
  const [sortOption, setSortOption] = useState('newest'); // 'newest' | 'most_supported' | 'most_verified'
  const [loading, setLoading] = useState(false);

  // Issues Data from Backend
  const [issues, setIssues] = useState([]);
  const [stats, setStats] = useState({
    total_grievances: 9,
    field_squads_dispatched: 1,
    resolved_within_sla: '95.8%',
    avg_dispatch_response: '1.4 hrs'
  });
  const [recentActivities, setRecentActivities] = useState([
    { id: '1', description: '28 citizens supported an issue', time_ago: '5 min ago', icon: 'thumbs_up', color: '#16A34A' },
    { id: '2', description: 'A report was challenged with evidence', time_ago: '18 min ago', icon: 'thumbs_down', color: '#DC2626' },
    { id: '3', description: 'On-site verification added (video)', time_ago: '27 min ago', icon: 'users', color: '#2563EB' }
  ]);

  // Modals
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectedIssueForDetails, setSelectedIssueForDetails] = useState(null);
  const [issueDetailsData, setIssueDetailsData] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Challenge Modal State
  const [challengeModalIssue, setChallengeModalIssue] = useState(null);
  const [challengeCategory, setChallengeCategory] = useState('already_resolved');
  const [challengeReason, setChallengeReason] = useState('');
  const [challengeSubmitting, setChallengeSubmitting] = useState(false);

  // On-Site Live Verification Camera Modal
  const [verifyModalIssue, setVerifyModalIssue] = useState(null);
  const [verifyDistance, setVerifyDistance] = useState(null);
  const [liveStreamActive, setLiveStreamActive] = useState(false);
  const [captureMode, setCaptureMode] = useState('photo'); // 'photo' | 'video'
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [capturedPreviewUrl, setCapturedPreviewUrl] = useState(null);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [verifyNotes, setVerifyNotes] = useState('');
  const [submittingVerification, setSubmittingVerification] = useState(false);

  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const videoChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const streamRef = useRef(null);

  // Citizen Identifier
  const activeCitizenId = user?.email || user?.citizen_email || 'ramesh@citizen.blr.in';
  const activeCitizenName = user?.name || user?.citizen_name || 'Ramesh Kumar';

  // 1. Fetch nearby issues from backend using geographic filtering
  const fetchNearbyIssues = useCallback(async (currentLat = coords.lat, currentLng = coords.lng, currentRadius = radiusKm) => {
    setLoading(true);
    try {
      const url = `/community/issues?lat=${currentLat}&lng=${currentLng}&radius_km=${currentRadius}&citizen_id=${encodeURIComponent(activeCitizenId)}&tab=${activeTab}&sort=${sortOption}`;
      const res = await apiCall(url);
      if (res.ok) {
        const data = await res.json();
        setIssues(data.issues || []);
        if (data.stats) setStats(data.stats);
        if (data.locality) setLocalityText(data.locality);
        if (data.recent_activity && data.recent_activity.length > 0) {
          setRecentActivities(data.recent_activity);
        }
      }
    } catch (err) {
      console.warn('Community Help issues fetch notice:', err);
    } finally {
      setLoading(false);
    }
  }, [coords.lat, coords.lng, radiusKm, activeCitizenId, activeTab, sortOption]);

  useEffect(() => {
    fetchNearbyIssues();
  }, [fetchNearbyIssues]);

  // Sync coords if parent passes new props
  useEffect(() => {
    if (userLat && userLng && (userLat !== coords.lat || userLng !== coords.lng)) {
      setCoords({ lat: userLat, lng: userLng });
      if (userAddress) setLocalityText(userAddress);
    }
  }, [userLat, userLng, userAddress]);

  // 2. Real GPS Re-Detection Function
  const handleDetectLiveGps = (silent = false) => {
    if (!navigator.geolocation) {
      setGpsStatus('denied');
      if (!silent) showToast('Geolocation is not supported by your device browser.');
      return;
    }
    setGpsStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        const acc = Math.round(pos.coords.accuracy || 8);
        setCoords({ lat, lng });
        setGpsAccuracy(acc);
        setGpsStatus('locked');
        fetchNearbyIssues(lat, lng, radiusKm);
        if (!silent) showToast(`Live GPS locked at ${lat}, ${lng} (±${acc}m accuracy)`);
        setShowLocationModal(false);
      },
      (err) => {
        setGpsStatus('denied');
        if (!silent) showToast('GPS access denied. You can select your area manually.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // 3. Support / Verify Action Handler
  const handleSupportClick = async (issue) => {
    // If user is already supporting, toggle it off directly
    if (issue.user_vote === 'support') {
      try {
        const res = await apiCall(`/community/issues/${issue.id}/support`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            citizen_id: activeCitizenId,
            citizen_name: activeCitizenName
          })
        });
        if (res.ok) {
          const data = await res.json();
          setIssues(prev => prev.map(iss => iss.id === issue.id ? {
            ...iss,
            support_count: Math.max(0, iss.support_count - 1),
            user_vote: null
          } : iss));
          showToast('Support vote withdrawn');
        }
      } catch (e) {
        showToast('Network error while updating vote');
      }
      return;
    }

    // Prompt user: Check physical proximity for on-site verification vs quick support
    const dist = calculateDistanceMeters(coords.lat, coords.lng, issue.latitude, issue.longitude);
    if (dist <= 50) {
      // User is physically near the defect! Prompt live camera verification
      openVerificationModal(issue, dist);
    } else {
      // User is further away: Cast standard community support vote
      try {
        const res = await apiCall(`/community/issues/${issue.id}/support`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            citizen_id: activeCitizenId,
            citizen_name: activeCitizenName
          })
        });
        if (res.ok) {
          const data = await res.json();
          setIssues(prev => prev.map(iss => iss.id === issue.id ? {
            ...iss,
            support_count: iss.support_count + 1,
            challenge_count: iss.user_vote === 'challenge' ? Math.max(0, iss.challenge_count - 1) : iss.challenge_count,
            user_vote: 'support'
          } : iss));
          showToast(`Issue ${issue.ticket_number} supported!`);
        }
      } catch (e) {
        showToast('Failed to record support vote');
      }
    }
  };

  // 4. Challenge Report Handlers
  const openChallengeModal = (issue) => {
    setChallengeModalIssue(issue);
    setChallengeCategory('already_resolved');
    setChallengeReason(issue.user_challenge_reason || '');
  };

  const submitChallenge = async () => {
    if (!challengeModalIssue) return;
    if (!challengeReason.trim() || challengeReason.trim().length < 5) {
      showToast('Please provide an explanation (minimum 5 characters)');
      return;
    }

    setChallengeSubmitting(true);
    try {
      const res = await apiCall(`/community/issues/${challengeModalIssue.id}/challenge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          citizen_id: activeCitizenId,
          citizen_name: activeCitizenName,
          category: challengeCategory,
          reason: challengeReason.trim()
        })
      });

      if (res.ok) {
        const data = await res.json();
        setIssues(prev => prev.map(iss => iss.id === challengeModalIssue.id ? {
          ...iss,
          challenge_count: iss.user_vote === 'challenge' ? iss.challenge_count : iss.challenge_count + 1,
          support_count: iss.user_vote === 'support' ? Math.max(0, iss.support_count - 1) : iss.support_count,
          user_vote: 'challenge',
          user_challenge_reason: challengeReason.trim()
        } : iss));
        showToast('Challenge recorded with community feedback');
        setChallengeModalIssue(null);
      } else {
        const errData = await res.json().catch(() => ({}));
        showToast(errData.detail || 'Failed to submit challenge');
      }
    } catch (err) {
      showToast('Network error while challenging report');
    } finally {
      setChallengeSubmitting(false);
    }
  };

  // 5. On-Site Live Verification & In-App Camera Handlers (Strict 50m check)
  const openVerificationModal = (issue, directDist = null) => {
    const dist = directDist !== null 
      ? directDist 
      : calculateDistanceMeters(coords.lat, coords.lng, issue.latitude, issue.longitude);
    setVerifyModalIssue(issue);
    setVerifyDistance(dist);
    setCapturedBlob(null);
    setCapturedPreviewUrl(null);
    setVerifyNotes('');
    setCaptureMode('photo');

    // Only start camera if user is within 50m
    if (dist <= 50) {
      startCamera();
    }
  };

  const startCamera = async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setLiveStreamActive(true);
    } catch (err) {
      console.warn('Camera access warning:', err);
      showToast('Camera access unavailable. Please grant camera permission.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setLiveStreamActive(false);
  };

  const closeVerificationModal = () => {
    stopCamera();
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setVerifyModalIssue(null);
    setCapturedBlob(null);
    setCapturedPreviewUrl(null);
  };

  // Take live photo
  const captureLivePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (blob) {
        setCapturedBlob(blob);
        const url = URL.createObjectURL(blob);
        setCapturedPreviewUrl(url);
        stopCamera();
      }
    }, 'image/jpeg', 0.9);
  };

  // Start live video recording
  const startLiveVideoRecording = () => {
    if (!streamRef.current) return;
    videoChunksRef.current = [];
    try {
      const recorder = new MediaRecorder(streamRef.current, { mimeType: 'video/webm' });
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) videoChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(videoChunksRef.current, { type: 'video/webm' });
        setCapturedBlob(blob);
        const url = URL.createObjectURL(blob);
        setCapturedPreviewUrl(url);
        stopCamera();
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecordingVideo(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(s => {
          if (s >= 5) {
            stopLiveVideoRecording();
            return 5;
          }
          return s + 1;
        });
      }, 1000);
    } catch (e) {
      showToast('Video recording could not be started');
    }
  };

  const stopLiveVideoRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsRecordingVideo(false);
  };

  const retakeEvidence = () => {
    setCapturedBlob(null);
    setCapturedPreviewUrl(null);
    startCamera();
  };

  // Submit on-site verified evidence
  const submitOnsiteVerification = async () => {
    if (!verifyModalIssue || !capturedBlob) return;
    setSubmittingVerification(true);
    try {
      const formData = new FormData();
      const fname = captureMode === 'video' ? 'live_verif.webm' : 'live_verif.jpg';
      formData.append('file', capturedBlob, fname);
      formData.append('citizen_id', activeCitizenId);
      formData.append('citizen_name', activeCitizenName);
      formData.append('user_lat', coords.lat);
      formData.append('user_lng', coords.lng);
      formData.append('gps_accuracy', gpsAccuracy);
      formData.append('evidence_type', captureMode);
      formData.append('notes', verifyNotes || 'Live verified on-site');

      const res = await apiCall(`/community/issues/${verifyModalIssue.id}/verify-onsite`, {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        setIssues(prev => prev.map(iss => iss.id === verifyModalIssue.id ? {
          ...iss,
          on_site_verified_count: data.on_site_verified_count || iss.on_site_verified_count + 1,
          support_count: iss.user_vote === 'support' ? iss.support_count : iss.support_count + 1,
          user_vote: 'support',
          user_verified: true
        } : iss));
        showToast(`On-site verification submitted! (${data.distance_meters}m from defect)`);
        closeVerificationModal();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.detail || 'On-site verification rejected');
      }
    } catch (err) {
      showToast('Network error while submitting verification');
    } finally {
      setSubmittingVerification(false);
    }
  };

  // 6. View Details Modal Handler
  const handleViewDetails = async (issue) => {
    setSelectedIssueForDetails(issue);
    setLoadingDetails(true);
    try {
      const res = await apiCall(`/community/issues/${issue.id}/details`);
      if (res.ok) {
        const data = await res.json();
        setIssueDetailsData(data);
      }
    } catch (e) {
      console.warn('Details fetch notice:', e);
    } finally {
      setLoadingDetails(false);
    }
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ------------------------------------------------------------- */}
      {/* Top 4 Stat Metric Cards (Matching Screenshot)                 */}
      {/* ------------------------------------------------------------- */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: 12
      }}>
        <div style={{
          background: '#FFFFFF',
          borderRadius: 14,
          padding: '14px 18px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
            TOTAL GRIEVANCES LOGGED
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0F172A', marginTop: 2 }}>
            {stats.total_grievances || 9}
          </div>
          <div style={{ fontSize: '0.70rem', color: '#16A34A', fontWeight: 600, marginTop: 2 }}>
            (Your Area)
          </div>
        </div>

        <div style={{
          background: '#FFFFFF',
          borderRadius: 14,
          padding: '14px 18px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
            FIELD SQUADS DISPATCHED
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#2563EB', marginTop: 2 }}>
            {stats.field_squads_dispatched || 1}
          </div>
          <div style={{ fontSize: '0.70rem', color: '#2563EB', fontWeight: 600, marginTop: 2 }}>
            Active on Arterial Corridors
          </div>
        </div>

        <div style={{
          background: '#FFFFFF',
          borderRadius: 14,
          padding: '14px 18px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
            RESOLVED WITHIN SLA
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#16A34A', marginTop: 2 }}>
            {stats.resolved_within_sla || '95.8%'}
          </div>
          <div style={{ fontSize: '0.70rem', color: '#16A34A', fontWeight: 600, marginTop: 2 }}>
            Municipal SLA Compliance
          </div>
        </div>

        <div style={{
          background: '#FFFFFF',
          borderRadius: 14,
          padding: '14px 18px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
            AVG DISPATCH RESPONSE
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0F172A', marginTop: 2 }}>
            {stats.avg_dispatch_response || '1.4 hrs'}
          </div>
          <div style={{ fontSize: '0.70rem', color: '#64748B', fontWeight: 500, marginTop: 2 }}>
            Triage to First Squad Movement
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Hero Banner Card with Skyline Art & Location Bar              */}
      {/* ------------------------------------------------------------- */}
      <div style={{
        background: 'linear-gradient(135deg, #EEF6FF 0%, #F5F9FF 50%, #E8F2FE 100%)',
        borderRadius: 18,
        border: '1px solid #BFDBFE',
        padding: '20px 24px 16px 24px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(37,99,235,0.04)'
      }}>
        {/* Soft Background Skyline Art (Right Side) */}
        <div style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          width: '42%',
          height: '100%',
          pointerEvents: 'none',
          opacity: 0.85
        }}>
          <svg viewBox="0 0 400 140" fill="none" style={{ width: '100%', height: '100%' }}>
            {/* Soft rolling hills */}
            <path d="M0,140 C100,100 200,120 400,90 L400,140 Z" fill="#DCEAFE" />
            <path d="M80,140 C180,95 280,110 400,105 L400,140 Z" fill="#BAE6FD" opacity="0.6" />
            {/* Stylized trees & skyline */}
            <circle cx="340" cy="85" r="14" fill="#6EE7B7" opacity="0.75" />
            <rect x="338" y="99" width="4" height="20" fill="#3B82F6" opacity="0.4" />
            <circle cx="310" cy="95" r="10" fill="#93C5FD" opacity="0.8" />
            <rect x="309" y="105" width="2" height="15" fill="#3B82F6" opacity="0.4" />
            {/* Distant building silhouettes */}
            <rect x="250" y="70" width="16" height="50" rx="2" fill="#BFDBFE" opacity="0.7" />
            <rect x="272" y="55" width="20" height="65" rx="2" fill="#93C5FD" opacity="0.6" />
            <rect x="365" y="60" width="18" height="60" rx="2" fill="#BAE6FD" opacity="0.8" />
          </svg>
        </div>

        {/* Banner Content (Header) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative', zIndex: 1, marginBottom: 18 }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: '#FFFFFF',
            border: '1.5px solid #BFDBFE',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(37,99,235,0.12)',
            color: '#2563EB'
          }}>
            <Users size={26} strokeWidth={2.2} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.3px' }}>
              Community Help
            </h1>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.86rem', color: '#475569', fontWeight: 500 }}>
              Support, verify, or challenge reported issues in your nearby area.
            </p>
          </div>
        </div>

        {/* Location Bar at bottom of Hero */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: 12,
          padding: '8px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
          border: '1px solid #DBEAFE',
          position: 'relative',
          zIndex: 1
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: '#EFF6FF',
              padding: '5px 10px',
              borderRadius: 8,
              fontSize: '0.78rem',
              fontWeight: 700,
              color: '#1E40AF'
            }}>
              <MapPin size={14} color="#2563EB" />
              <span>Your Location</span>
            </div>

            <div style={{
              fontSize: '0.84rem',
              fontWeight: 700,
              color: '#1E293B',
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              padding: '5px 12px',
              borderRadius: 8
            }}>
              {localityText} <span style={{ color: '#64748B', fontWeight: 500 }}>• Within {radiusKm} km</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowLocationModal(true)}
            style={{
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: 8,
              padding: '6px 14px',
              fontSize: '0.78rem',
              fontWeight: 600,
              color: '#2563EB',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.15s ease'
            }}
          >
            <Compass size={14} />
            <span>Change Location</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Filter Tabs & Sort Row                                        */}
      {/* ------------------------------------------------------------- */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 10
      }}>
        {/* Left Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={() => setActiveTab('nearby')}
            style={{
              background: activeTab === 'nearby' ? '#2563EB' : '#FFFFFF',
              color: activeTab === 'nearby' ? '#FFFFFF' : '#334155',
              border: activeTab === 'nearby' ? '1px solid #2563EB' : '1px solid #E2E8F0',
              borderRadius: 20,
              padding: '7px 16px',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              boxShadow: activeTab === 'nearby' ? '0 2px 6px rgba(37,99,235,0.25)' : 'none'
            }}
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="18" x2="20" y2="18" />
            </svg>
            <span>Nearby Issues ({issues.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('contributions')}
            style={{
              background: activeTab === 'contributions' ? '#2563EB' : '#FFFFFF',
              color: activeTab === 'contributions' ? '#FFFFFF' : '#334155',
              border: activeTab === 'contributions' ? '1px solid #2563EB' : '1px solid #E2E8F0',
              borderRadius: 20,
              padding: '7px 16px',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Users size={14} />
            <span>My Contributions</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('verifications')}
            style={{
              background: activeTab === 'verifications' ? '#2563EB' : '#FFFFFF',
              color: activeTab === 'verifications' ? '#FFFFFF' : '#334155',
              border: activeTab === 'verifications' ? '1px solid #2563EB' : '1px solid #E2E8F0',
              borderRadius: 20,
              padding: '7px 16px',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <CheckCircle size={14} />
            <span>Verification History</span>
          </button>
        </div>

        {/* Right Sort Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            style={{
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: 8,
              padding: '6px 12px',
              fontSize: '0.78rem',
              fontWeight: 600,
              color: '#334155',
              cursor: 'pointer'
            }}
          >
            <option value="newest">Sort: Newest</option>
            <option value="most_supported">Sort: Most Supported</option>
            <option value="most_verified">Sort: Most Verified</option>
          </select>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Main 2-Column Grid (Cards on Left, Info Cards on Right)       */}
      {/* ------------------------------------------------------------- */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) 320px',
        gap: 16,
        alignItems: 'start'
      }}>
        {/* Left Column: List of Issue Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {loading && (
            <div style={{
              background: '#FFFFFF',
              borderRadius: 14,
              padding: 30,
              textAlign: 'center',
              color: '#64748B',
              fontSize: '0.88rem'
            }}>
              <RefreshCw className="animate-spin" size={20} style={{ margin: '0 auto 8px auto', color: '#2563EB' }} />
              Discovering verified civic issues within {radiusKm} km of your location...
            </div>
          )}

          {!loading && issues.length === 0 && (
            <div style={{
              background: '#FFFFFF',
              borderRadius: 14,
              padding: '36px 20px',
              textAlign: 'center',
              border: '1px solid #E2E8F0'
            }}>
              <CheckCircle size={36} color="#16A34A" style={{ margin: '0 auto 10px auto' }} />
              <h3 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: '#0F172A' }}>
                No Unresolved Issues in this {radiusKm} km Radius
              </h3>
              <p style={{ margin: 0, fontSize: '0.80rem', color: '#64748B' }}>
                Your immediate vicinity is clean and verified by local municipal squads.
              </p>
              <button
                type="button"
                onClick={() => setRadiusKm(5.0)}
                style={{
                  marginTop: 14,
                  background: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  color: '#2563EB',
                  borderRadius: 8,
                  padding: '6px 14px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Expand Radius to 5 km
              </button>
            </div>
          )}

          {!loading && issues.map((issue) => (
            <div
              key={issue.id}
              style={{
                background: '#FFFFFF',
                borderRadius: 14,
                border: '1px solid #E2E8F0',
                padding: '14px 16px',
                display: 'flex',
                gap: 16,
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                transition: 'box-shadow 0.15s ease',
                position: 'relative'
              }}
            >
              {/* Thumbnail Container */}
              <div style={{
                width: 150,
                minWidth: 150,
                height: 115,
                borderRadius: 10,
                overflow: 'hidden',
                position: 'relative',
                background: '#F1F5F9'
              }}>
                <img
                  src={issue.image_url}
                  alt={issue.title}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=80';
                  }}
                />

                {/* Photo Count or Video Length Badge */}
                <div style={{
                  position: 'absolute',
                  bottom: 6,
                  left: 6,
                  background: 'rgba(15, 23, 42, 0.75)',
                  backdropFilter: 'blur(4px)',
                  color: '#FFFFFF',
                  borderRadius: 6,
                  padding: '2px 6px',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}>
                  {issue.is_video ? (
                    <>
                      <Play size={10} fill="#FFFFFF" />
                      <span>{issue.video_duration || '0:18'}</span>
                    </>
                  ) : (
                    <>
                      <Camera size={11} />
                      <span>{issue.media_count || 2}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Middle Information Area */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  {/* Top Line: Ticket ID + Reported Date */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{
                      background: '#EFF6FF',
                      border: '1px solid #BFDBFE',
                      color: '#2563EB',
                      fontSize: '0.70rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 6,
                      fontFamily: 'monospace'
                    }}>
                      {issue.ticket_number || issue.id}
                    </span>

                    <span style={{
                      fontSize: '0.68rem',
                      color: '#64748B',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}>
                      <Clock size={11} />
                      <span>{issue.reported_date_formatted}</span>
                    </span>
                  </div>

                  {/* Title */}
                  <h3 style={{
                    margin: '3px 0 3px 0',
                    fontSize: '0.94rem',
                    fontWeight: 700,
                    color: '#0F172A',
                    lineHeight: 1.3
                  }}>
                    {issue.title}
                  </h3>

                  {/* Location with Pin */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: '0.72rem',
                    color: '#64748B',
                    marginBottom: 4
                  }}>
                    <MapPin size={12} color="#64748B" />
                    <span>{issue.landmark_address}</span>
                  </div>

                  {/* Description */}
                  <p style={{
                    margin: '0 0 6px 0',
                    fontSize: '0.76rem',
                    color: '#475569',
                    lineHeight: 1.35
                  }}>
                    {issue.description}
                  </p>

                  {/* Badges: Category & Severity */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{
                      background: '#EFF6FF',
                      color: '#1D4ED8',
                      fontSize: '0.68rem',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: 6
                    }}>
                      {issue.category}
                    </span>

                    <span style={{
                      background: issue.urgency === 'Critical' || issue.urgency === 'High' ? '#FEF2F2' : '#FFFBEB',
                      color: issue.urgency === 'Critical' || issue.urgency === 'High' ? '#DC2626' : '#D97706',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 6,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 3
                    }}>
                      <span>◆</span> {issue.urgency}
                    </span>
                  </div>
                </div>

                {/* Bottom Stats Row */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  marginTop: 8,
                  paddingTop: 6,
                  borderTop: '1px solid #F1F5F9'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    color: issue.user_vote === 'support' ? '#16A34A' : '#334155'
                  }}>
                    <ThumbsUp size={14} color={issue.user_vote === 'support' ? '#16A34A' : '#16A34A'} fill={issue.user_vote === 'support' ? '#DCFCE7' : 'none'} />
                    <span>{issue.support_count} Support</span>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    color: issue.user_vote === 'challenge' ? '#DC2626' : '#64748B'
                  }}>
                    <ThumbsDown size={14} color={issue.user_vote === 'challenge' ? '#DC2626' : '#DC2626'} fill={issue.user_vote === 'challenge' ? '#FEE2E2' : 'none'} />
                    <span>{issue.challenge_count} Challenge</span>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    color: issue.user_verified ? '#2563EB' : '#2563EB'
                  }}>
                    <Users size={14} color="#2563EB" />
                    <span>{issue.on_site_verified_count} On-Site Verified</span>
                  </div>
                </div>
              </div>

              {/* Right Action Column */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: 8,
                minWidth: 135
              }}>
                {/* 1. Support / Verify Button */}
                <button
                  type="button"
                  onClick={() => handleSupportClick(issue)}
                  style={{
                    background: issue.user_vote === 'support' ? '#DCFCE7' : '#FFFFFF',
                    border: '1.5px solid #16A34A',
                    color: '#15803D',
                    borderRadius: 8,
                    padding: '7px 12px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    transition: 'all 0.15s ease'
                  }}
                >
                  <ThumbsUp size={13} fill={issue.user_vote === 'support' ? '#16A34A' : 'none'} />
                  <span>{issue.user_vote === 'support' ? 'Supported' : 'Support / Verify'}</span>
                </button>

                {/* 2. Challenge Report Button */}
                <button
                  type="button"
                  onClick={() => openChallengeModal(issue)}
                  style={{
                    background: issue.user_vote === 'challenge' ? '#FEE2E2' : '#FFFFFF',
                    border: '1.5px solid #EF4444',
                    color: '#DC2626',
                    borderRadius: 8,
                    padding: '7px 12px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    transition: 'all 0.15s ease'
                  }}
                >
                  <ThumbsDown size={13} fill={issue.user_vote === 'challenge' ? '#DC2626' : 'none'} />
                  <span>{issue.user_vote === 'challenge' ? 'Challenged' : 'Challenge Report'}</span>
                </button>

                {/* 3. View Details Link */}
                <button
                  type="button"
                  onClick={() => handleViewDetails(issue)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#2563EB',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    padding: '4px 0'
                  }}
                >
                  <span>View Details</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Right Column: "About Community Help" & "Community Activity" */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* 1. About Community Help Card */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: 14,
            border: '1px solid #E2E8F0',
            padding: '16px 18px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: '#EFF6FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563EB'
              }}>
                <Users size={15} />
              </div>
              <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: '#0F172A' }}>
                About Community Help
              </h3>
            </div>

            <p style={{ margin: '0 0 12px 0', fontSize: '0.76rem', color: '#475569', lineHeight: 1.4 }}>
              A citizen collaboration space to validate, support, or challenge reported issues with on-site evidence.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: '0.75rem', color: '#334155' }}>
                <Check size={14} color="#16A34A" strokeWidth={2.6} style={{ marginTop: 2, flexShrink: 0 }} />
                <span>Support genuine issues</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: '0.75rem', color: '#334155' }}>
                <Check size={14} color="#16A34A" strokeWidth={2.6} style={{ marginTop: 2, flexShrink: 0 }} />
                <span>Challenge incorrect or resolved reports</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: '0.75rem', color: '#334155' }}>
                <Check size={14} color="#16A34A" strokeWidth={2.6} style={{ marginTop: 2, flexShrink: 0 }} />
                <span>Submit photo or video evidence (live)</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: '0.75rem', color: '#334155' }}>
                <Check size={14} color="#16A34A" strokeWidth={2.6} style={{ marginTop: 2, flexShrink: 0 }} />
                <span>Location verification at the issue site (within 50 m)</span>
              </div>
            </div>
          </div>

          {/* 2. Community Activity (Your Area) Card */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: 14,
            border: '1px solid #E2E8F0',
            padding: '16px 18px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: '#EFF6FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563EB'
              }}>
                <Activity size={15} />
              </div>
              <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: '#0F172A' }}>
                Community Activity <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 500 }}>(Your Area)</span>
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recentActivities.map((act, idx) => (
                <div
                  key={act.id || idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    paddingBottom: idx !== recentActivities.length - 1 ? 8 : 0,
                    borderBottom: idx !== recentActivities.length - 1 ? '1px solid #F1F5F9' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: act.icon === 'thumbs_up' ? '#DCFCE7' : act.icon === 'thumbs_down' ? '#FEE2E2' : '#DBEAFE',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {act.icon === 'thumbs_up' && <ThumbsUp size={12} color="#16A34A" />}
                      {act.icon === 'thumbs_down' && <ThumbsDown size={12} color="#DC2626" />}
                      {act.icon === 'users' && <Users size={12} color="#2563EB" />}
                    </div>
                    <span style={{ fontSize: '0.74rem', color: '#1E293B', fontWeight: 600 }}>
                      {act.description}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.68rem', color: '#94A3B8', whiteSpace: 'nowrap' }}>
                    {act.time_ago}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: Change Location Modal                                */}
      {/* ------------------------------------------------------------- */}
      {showLocationModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 16
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: 16,
            maxWidth: 460,
            width: '100%',
            padding: 22,
            boxShadow: '0 20px 40px rgba(0,0,0,0.18)',
            border: '1px solid #E2E8F0'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Compass size={18} color="#2563EB" />
                <h3 style={{ margin: 0, fontSize: '1rem', color: '#0F172A', fontWeight: 800 }}>
                  Select Community Discovery Area
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowLocationModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Live GPS Button */}
            <button
              type="button"
              onClick={() => handleDetectLiveGps(false)}
              style={{
                width: '100%',
                background: '#EFF6FF',
                border: '1.5px solid #BFDBFE',
                borderRadius: 10,
                padding: '10px 14px',
                color: '#1D4ED8',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginBottom: 14
              }}
            >
              <Crosshair size={16} />
              <span>Use My Live Device GPS (Auto-Detect)</span>
            </button>

            <div style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase' }}>
              Or choose a popular Bengaluru locality:
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
              {PRESET_LOCALITIES.map((loc) => (
                <button
                  key={loc.name}
                  type="button"
                  onClick={() => {
                    setCoords({ lat: loc.lat, lng: loc.lng });
                    setLocalityText(loc.name);
                    fetchNearbyIssues(loc.lat, loc.lng, radiusKm);
                    setShowLocationModal(false);
                    showToast(`Location switched to ${loc.name}`);
                  }}
                  style={{
                    background: localityText.includes(loc.name.split(',')[0]) ? '#EFF6FF' : '#F8FAFC',
                    border: localityText.includes(loc.name.split(',')[0]) ? '1px solid #93C5FD' : '1px solid #E2E8F0',
                    borderRadius: 8,
                    padding: '8px 12px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.80rem', fontWeight: 700, color: '#0F172A' }}>{loc.name}</div>
                    <div style={{ fontSize: '0.68rem', color: '#64748B' }}>{loc.ward}</div>
                  </div>
                  {localityText.includes(loc.name.split(',')[0]) && (
                    <Check size={16} color="#2563EB" />
                  )}
                </button>
              ))}
            </div>

            {/* Radius Slider */}
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                <span>Discovery Radius</span>
                <span style={{ color: '#2563EB', fontWeight: 800 }}>{radiusKm} km</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="10.0"
                step="0.5"
                value={radiusKm}
                onChange={(e) => setRadiusKm(parseFloat(e.target.value))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: Challenge Report Modal (Required Reason)             */}
      {/* ------------------------------------------------------------- */}
      {challengeModalIssue && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 16
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: 16,
            maxWidth: 480,
            width: '100%',
            padding: 22,
            boxShadow: '0 20px 40px rgba(0,0,0,0.18)',
            border: '1px solid #E2E8F0'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ThumbsDown size={18} color="#DC2626" />
                <h3 style={{ margin: 0, fontSize: '1rem', color: '#0F172A', fontWeight: 800 }}>
                  Challenge Report • {challengeModalIssue.ticket_number}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setChallengeModalIssue(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ margin: '0 0 14px 0', fontSize: '0.78rem', color: '#475569', lineHeight: 1.4 }}>
              Help keep the community feed accurate. State why this report is incorrect, already fixed, or a duplicate.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
              <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155' }}>
                Dispute Category:
              </label>
              <select
                value={challengeCategory}
                onChange={(e) => setChallengeCategory(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid #CBD5E1',
                  fontSize: '0.80rem',
                  fontWeight: 600,
                  color: '#1E293B'
                }}
              >
                <option value="already_resolved">Already Resolved / Defect No Longer Present</option>
                <option value="duplicate">Duplicate Report of Another Incident</option>
                <option value="incorrect_location">Incorrect Location / Wrong Landmark</option>
                <option value="not_an_issue">Not a Public Civic Hazard / Private Property</option>
                <option value="other">Other Community Feedback</option>
              </select>

              <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155' }}>
                Detailed Explanation <span style={{ color: '#DC2626' }}>*</span>:
              </label>
              <textarea
                rows={3}
                placeholder="Explain why you are disputing this report (e.g. BBMP asphalt crew finished patching this morning)..."
                value={challengeReason}
                onChange={(e) => setChallengeReason(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid #CBD5E1',
                  fontSize: '0.80rem',
                  color: '#1E293B',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setChallengeModalIssue(null)}
                style={{
                  background: '#F1F5F9',
                  border: '1px solid #CBD5E1',
                  color: '#475569',
                  borderRadius: 8,
                  padding: '7px 14px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={submitChallenge}
                disabled={challengeSubmitting || !challengeReason.trim()}
                style={{
                  background: '#DC2626',
                  border: 'none',
                  color: '#FFFFFF',
                  borderRadius: 8,
                  padding: '7px 18px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: challengeSubmitting || !challengeReason.trim() ? 'not-allowed' : 'pointer',
                  opacity: challengeSubmitting || !challengeReason.trim() ? 0.6 : 1
                }}
              >
                {challengeSubmitting ? 'Recording...' : 'Submit Challenge'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 3: On-Site Live Verification & In-App Camera (50m Rule) */}
      {/* ------------------------------------------------------------- */}
      {verifyModalIssue && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 16
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: 18,
            maxWidth: 520,
            width: '100%',
            padding: 22,
            boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
            border: '1px solid #E2E8F0',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Camera size={18} color="#2563EB" />
                <h3 style={{ margin: 0, fontSize: '1rem', color: '#0F172A', fontWeight: 800 }}>
                  On-Site Live Verification (50m Radius)
                </h3>
              </div>
              <button
                type="button"
                onClick={closeVerificationModal}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* GPS Distance Status Banner */}
            {verifyDistance !== null && (
              <div style={{
                background: verifyDistance <= 50 ? '#ECFDF5' : '#FEF2F2',
                border: verifyDistance <= 50 ? '1.5px solid #86EFAC' : '1.5px solid #FCA5A5',
                borderRadius: 10,
                padding: '10px 14px',
                marginBottom: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 10
              }}>
                {verifyDistance <= 50 ? (
                  <CheckCircle size={20} color="#16A34A" style={{ flexShrink: 0 }} />
                ) : (
                  <AlertTriangle size={20} color="#DC2626" style={{ flexShrink: 0 }} />
                )}
                <div style={{ fontSize: '0.78rem', lineHeight: 1.4 }}>
                  {verifyDistance <= 50 ? (
                    <div>
                      <strong style={{ color: '#166534' }}>Location Verified: </strong>
                      <span style={{ color: '#14532D' }}>
                        You are <strong>{verifyDistance}m</strong> from this reported defect (within permitted 50m radius).
                      </span>
                    </div>
                  ) : (
                    <div>
                      <strong style={{ color: '#991B1B' }}>Outside 50m Permitted Radius: </strong>
                      <span style={{ color: '#7F1D1D' }}>
                        You are <strong>{verifyDistance}m</strong> away. Physical presence within 50 meters is strictly required to capture live on-site evidence.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* If User is Outside 50m: Block camera and provide alternate options */}
            {verifyDistance !== null && verifyDistance > 50 && (
              <div style={{ textAlign: 'center', padding: '16px 10px' }}>
                <Navigation size={38} color="#DC2626" style={{ margin: '0 auto 10px auto' }} />
                <p style={{ fontSize: '0.82rem', color: '#334155', margin: '0 0 16px 0', lineHeight: 1.45 }}>
                  To prevent fraudulent or spoofed verifications, photo/video evidence can only be submitted when your device GPS is verified within 50 meters of <strong>{verifyModalIssue.landmark_address}</strong>.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => {
                      // Cast instant support vote from distance
                      handleSupportClick(verifyModalIssue);
                      closeVerificationModal();
                    }}
                    style={{
                      background: '#16A34A',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: 8,
                      padding: '10px 16px',
                      fontSize: '0.80rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Cast Community Support Vote from Distance (No On-Site Media)
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDetectLiveGps(false)}
                    style={{
                      background: '#EFF6FF',
                      color: '#2563EB',
                      border: '1px solid #BFDBFE',
                      borderRadius: 8,
                      padding: '8px 14px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Retry Device GPS Coordinates
                  </button>
                </div>
              </div>
            )}

            {/* If User is Within 50m: Live In-App Camera Viewfinder */}
            {verifyDistance !== null && verifyDistance <= 50 && (
              <div>
                {/* Photo / Video Switcher */}
                {!capturedPreviewUrl && (
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    <button
                      type="button"
                      onClick={() => setCaptureMode('photo')}
                      style={{
                        flex: 1,
                        background: captureMode === 'photo' ? '#2563EB' : '#F1F5F9',
                        color: captureMode === 'photo' ? '#FFFFFF' : '#475569',
                        border: 'none',
                        borderRadius: 8,
                        padding: '7px 12px',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6
                      }}
                    >
                      <Camera size={14} />
                      <span>Live Photo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCaptureMode('video')}
                      style={{
                        flex: 1,
                        background: captureMode === 'video' ? '#2563EB' : '#F1F5F9',
                        color: captureMode === 'video' ? '#FFFFFF' : '#475569',
                        border: 'none',
                        borderRadius: 8,
                        padding: '7px 12px',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6
                      }}
                    >
                      <Video size={14} />
                      <span>Live Video Clip (3-5s)</span>
                    </button>
                  </div>
                )}

                {/* Viewfinder / Preview */}
                <div style={{
                  width: '100%',
                  height: 240,
                  borderRadius: 12,
                  overflow: 'hidden',
                  background: '#0F172A',
                  position: 'relative',
                  marginBottom: 12
                }}>
                  {!capturedPreviewUrl ? (
                    <>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />

                      {/* Viewfinder crosshairs */}
                      <div style={{
                        position: 'absolute',
                        inset: 20,
                        border: '1.5px dashed rgba(255,255,255,0.4)',
                        borderRadius: 8,
                        pointerEvents: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.8)', borderRadius: '50%' }}></div>
                      </div>

                      {/* Recording Timer Badge */}
                      {isRecordingVideo && (
                        <div style={{
                          position: 'absolute',
                          top: 10,
                          right: 10,
                          background: '#DC2626',
                          color: '#FFFFFF',
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5
                        }}>
                          <span style={{ width: 8, height: 8, background: '#FFFFFF', borderRadius: '50%' }}></span>
                          <span>REC 0:0{recordingSeconds} / 0:05</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {captureMode === 'video' ? (
                        <video
                          src={capturedPreviewUrl}
                          controls
                          autoPlay
                          playsInline
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <img
                          src={capturedPreviewUrl}
                          alt="Captured Live Proof"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      )}
                    </>
                  )}
                </div>

                {/* Shutter / Record Controls */}
                {!capturedPreviewUrl ? (
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                    {captureMode === 'photo' ? (
                      <button
                        type="button"
                        onClick={captureLivePhoto}
                        style={{
                          background: '#2563EB',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '50%',
                          width: 52,
                          height: 52,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          boxShadow: '0 4px 12px rgba(37,99,235,0.35)'
                        }}
                      >
                        <Camera size={24} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={isRecordingVideo ? stopLiveVideoRecording : startLiveVideoRecording}
                        style={{
                          background: isRecordingVideo ? '#DC2626' : '#2563EB',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: 24,
                          padding: '10px 22px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        <Video size={16} />
                        <span>{isRecordingVideo ? 'Stop Recording' : 'Record 3-5s Clip'}</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div>
                    <input
                      type="text"
                      placeholder="Add an on-site note (e.g. measured 3ft width across lane)..."
                      value={verifyNotes}
                      onChange={(e) => setVerifyNotes(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: '1px solid #CBD5E1',
                        fontSize: '0.78rem',
                        marginBottom: 12
                      }}
                    />

                    <div style={{ display: 'flex', gap: 10 }}>
                      <button
                        type="button"
                        onClick={retakeEvidence}
                        style={{
                          flex: 1,
                          background: '#F1F5F9',
                          border: '1px solid #CBD5E1',
                          color: '#475569',
                          borderRadius: 8,
                          padding: '9px 14px',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Retake Footage
                      </button>

                      <button
                        type="button"
                        onClick={submitOnsiteVerification}
                        disabled={submittingVerification}
                        style={{
                          flex: 2,
                          background: '#16A34A',
                          border: 'none',
                          color: '#FFFFFF',
                          borderRadius: 8,
                          padding: '9px 18px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: submittingVerification ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6
                        }}
                      >
                        <CheckCircle size={14} />
                        <span>{submittingVerification ? 'Verifying...' : 'Submit Verified On-Site Evidence'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 4: Complete Issue Details Modal                         */}
      {/* ------------------------------------------------------------- */}
      {selectedIssueForDetails && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.5)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 16
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: 18,
            maxWidth: 580,
            width: '100%',
            padding: 22,
            boxShadow: '0 25px 50px rgba(0,0,0,0.2)',
            border: '1px solid #E2E8F0',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  background: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  color: '#2563EB',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  padding: '3px 9px',
                  borderRadius: 6,
                  fontFamily: 'monospace'
                }}>
                  {selectedIssueForDetails.ticket_number}
                </span>
                <span style={{
                  background: '#FEF2F2',
                  color: '#DC2626',
                  fontSize: '0.70rem',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: 6
                }}>
                  {selectedIssueForDetails.urgency} Priority
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedIssueForDetails(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Main Image */}
            <div style={{
              width: '100%',
              height: 220,
              borderRadius: 12,
              overflow: 'hidden',
              marginBottom: 14,
              background: '#F1F5F9'
            }}>
              <img
                src={selectedIssueForDetails.image_url}
                alt={selectedIssueForDetails.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>

            <h3 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', color: '#0F172A', fontWeight: 800 }}>
              {selectedIssueForDetails.title}
            </h3>

            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.76rem', color: '#64748B', marginBottom: 10 }}>
              <MapPin size={13} color="#2563EB" />
              <span>{selectedIssueForDetails.landmark_address}</span>
            </div>

            <p style={{ margin: '0 0 14px 0', fontSize: '0.80rem', color: '#334155', lineHeight: 1.45 }}>
              {selectedIssueForDetails.description}
            </p>

            {/* Community Stats Bar */}
            <div style={{
              background: '#F8FAFC',
              borderRadius: 10,
              border: '1px solid #E2E8F0',
              padding: '10px 14px',
              display: 'flex',
              justifyContent: 'space-around',
              marginBottom: 16
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#16A34A' }}>
                  {selectedIssueForDetails.support_count}
                </div>
                <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600 }}>Citizens Supported</div>
              </div>

              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#DC2626' }}>
                  {selectedIssueForDetails.challenge_count}
                </div>
                <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600 }}>Disputes / Challenges</div>
              </div>

              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#2563EB' }}>
                  {selectedIssueForDetails.on_site_verified_count}
                </div>
                <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600 }}>On-Site Verified</div>
              </div>
            </div>

            {/* Verifications List if Available */}
            {selectedIssueForDetails.verifications && selectedIssueForDetails.verifications.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginBottom: 8, textTransform: 'uppercase' }}>
                  Recent On-Site Verifications (Within 50m)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {selectedIssueForDetails.verifications.map((v, i) => (
                    <div
                      key={v.id || i}
                      style={{
                        background: '#EFF6FF',
                        border: '1px solid #DBEAFE',
                        borderRadius: 8,
                        padding: '6px 10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.74rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <CheckCircle size={14} color="#16A34A" />
                        <span><strong>{v.citizen_name}</strong> confirmed on-site ({v.distance_meters}m)</span>
                      </div>
                      <span style={{ color: '#64748B', fontSize: '0.68rem' }}>{v.created_at}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons inside Details */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={() => {
                  setSelectedIssueForDetails(null);
                  handleSupportClick(selectedIssueForDetails);
                }}
                style={{
                  flex: 1,
                  background: '#16A34A',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 8,
                  padding: '9px 14px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6
                }}
              >
                <ThumbsUp size={14} />
                <span>Support / Verify Issue</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedIssueForDetails(null);
                  openChallengeModal(selectedIssueForDetails);
                }}
                style={{
                  flex: 1,
                  background: '#FFFFFF',
                  color: '#DC2626',
                  border: '1.5px solid #EF4444',
                  borderRadius: 8,
                  padding: '9px 14px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6
                }}
              >
                <ThumbsDown size={14} />
                <span>Challenge Report</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
