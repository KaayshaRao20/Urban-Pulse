import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config/api';

/**
 * TermsConditionsView
 * Reproduces the exact Terms & Conditions UI from UrbanPulse specifications:
 * - City skyline hero banner
 * - 6 structured guideline cards (Responsible Use, Location, Safety, Privacy, Enforcement, Violation)
 * - Full-width Acknowledgement Card with checkbox verification
 * - View Full Terms modal with comprehensive policy & appeal mechanism
 * - Integrated acceptance & enforcement workflow
 */
export default function TermsConditionsView({
  user,
  onAccepted,
  onDeclined,
  isModal = false,
  onClose = null,
  showNotice = true
}) {
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(null);
  const [showFullTerms, setShowFullTerms] = useState(false);
  const [showAppealModal, setShowAppealModal] = useState(false);
  const [appealReason, setAppealReason] = useState('');
  const [appealSubmitting, setAppealSubmitting] = useState(false);
  const [appealSuccess, setAppealSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Identifier from user prop or localStorage
  const userIdentifier = user?.id || user?.email || user?.username || localStorage.getItem('up_user_id') || localStorage.getItem('citizen_email') || 'citizen_guest';

  // Fetch current consent status and latest active version
  const fetchStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/consent/status?user_id=${encodeURIComponent(userIdentifier)}&email=${encodeURIComponent(user?.email || '')}`);
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        if (data.accepted && !data.requires_consent) {
          setAgreed(true);
        }
      }
    } catch (err) {
      console.warn('[UrbanPulse Consent] Status fetch note:', err);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [userIdentifier]);

  // Handle Accept & Continue
  const handleAccept = async () => {
    if (!agreed || submitting) return;
    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE}/consent/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id || userIdentifier,
          email: user?.email || (userIdentifier.includes('@') ? userIdentifier : null),
          version: status?.active_version || 'v1.0',
          checkbox_accepted: true
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to record acceptance.');
      }

      setSuccessMsg('Terms & Conditions accepted successfully.');
      setStatus((prev) => ({
        ...prev,
        accepted: true,
        requires_consent: false,
        user_accepted_version: status?.active_version || 'v1.0'
      }));

      // Cache consent locally
      localStorage.setItem('up_terms_accepted_version', status?.active_version || 'v1.0');
      localStorage.setItem('up_terms_accepted_at', new Date().toISOString());

      if (onAccepted) {
        setTimeout(() => onAccepted(data), 600);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Network error while recording consent.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Decline
  const handleDecline = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await fetch(`${API_BASE}/consent/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id || userIdentifier,
          email: user?.email,
          version: status?.active_version || 'v1.0',
          reason: 'Citizen declined terms on prompt'
        })
      });
      if (onDeclined) onDeclined();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Submit appeal for suspension
  const handleSendAppeal = async (e) => {
    e.preventDefault();
    if (!appealReason.trim() || appealSubmitting) return;
    setAppealSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/consent/appeal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_identifier: userIdentifier,
          reason: appealReason.trim()
        })
      });
      if (res.ok) {
        setAppealSuccess(true);
        setTimeout(() => {
          setShowAppealModal(false);
          setAppealSuccess(false);
          setAppealReason('');
          fetchStatus();
        }, 2000);
      }
    } catch (err) {
      alert('Failed to submit appeal. Please try again.');
    } finally {
      setAppealSubmitting(false);
    }
  };

  const isSuspended = status?.enforcement_status && ['suspended', 'temporary_suspension', 'permanent_suspension', 'terminated'].includes(status.enforcement_status);
  const activeVersion = status?.active_version || 'v1.0';
  const lastUpdated = status?.last_updated || '03 Nov 2026';
  const isAlreadyAccepted = status?.accepted && !status?.requires_consent;

  return (
    <div className="terms-conditions-container" style={{
      width: '100%',
      maxWidth: isModal ? '860px' : '100%',
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: 20,
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* ACCOUNT SUSPENSION ALERT (IF ENFORCED) */}
      {isSuspended && (
        <div style={{
          background: '#FEF2F2',
          border: '1px solid #F87171',
          borderRadius: 12,
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 14
        }}>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: '50%',
            background: '#FEE2E2',
            color: '#DC2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: '0 0 4px 0', color: '#991B1B', fontSize: '0.96rem', fontWeight: 700 }}>
              Account Access Suspended
            </h4>
            <p style={{ margin: '0 0 8px 0', color: '#7F1D1D', fontSize: '0.84rem', lineHeight: 1.5 }}>
              Your citizen account has been placed under enforcement due to: <strong>{status?.enforcement_reason || 'Violation of UrbanPulse Terms & Conditions'}</strong>.
              While your account is suspended, report submission, community voting, and live evidence verifications are disabled.
            </p>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setShowAppealModal(true)}
                style={{
                  background: '#DC2626',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: 6,
                  fontSize: '0.80rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Submit Administrative Appeal
              </button>
              {status?.enforcement_timestamp && (
                <span style={{ fontSize: '0.74rem', color: '#991B1B' }}>
                  Enforced on: {new Date(status.enforcement_timestamp).toLocaleString()}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS / ERROR NOTICES */}
      {successMsg && (
        <div style={{
          background: '#ECFDF5',
          border: '1px solid #10B981',
          color: '#065F46',
          borderRadius: 8,
          padding: '10px 16px',
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <span>✓</span>
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div style={{
          background: '#FEF2F2',
          border: '1px solid #EF4444',
          color: '#991B1B',
          borderRadius: 8,
          padding: '10px 16px',
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <span>⚠</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* TOP HERO BANNER (MATCHING SCREENSHOT WITH BLUE GRADIENT & SKYLINE SILHOUETTE) */}
      <div style={{
        position: 'relative',
        background: 'linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 50%, #2563EB 100%)',
        borderRadius: 14,
        padding: '24px 28px',
        color: '#FFFFFF',
        overflow: 'hidden',
        boxShadow: '0 8px 24px -4px rgba(30, 58, 138, 0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Subtle City Skyline Silhouette in Background */}
        <div style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          height: '100%',
          width: '45%',
          pointerEvents: 'none',
          opacity: 0.15,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'flex-end'
        }}>
          <svg viewBox="0 0 500 150" width="100%" height="100%" preserveAspectRatio="none" fill="#FFFFFF">
            <rect x="20" y="40" width="35" height="110" />
            <rect x="65" y="70" width="25" height="80" />
            <rect x="100" y="20" width="40" height="130" />
            <polygon points="120,5 105,20 135,20" />
            <rect x="150" y="55" width="30" height="95" />
            <rect x="190" y="30" width="45" height="120" />
            <rect x="245" y="75" width="30" height="75" />
            <rect x="285" y="45" width="35" height="105" />
            <rect x="330" y="15" width="42" height="135" />
            <polygon points="351,0 338,15 364,15" />
            <rect x="380" y="60" width="28" height="90" />
            <rect x="418" y="35" width="38" height="115" />
            <rect x="465" y="65" width="30" height="85" />
          </svg>
        </div>

        {/* Content on Left */}
        <div style={{ position: 'relative', zIndex: 2, maxWidth: '680px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: 'rgba(255, 255, 255, 0.18)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(4px)'
            }}>
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#FFFFFF" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 700, letterSpacing: '-0.3px', color: '#FFFFFF' }}>
                Terms & Conditions
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                <span style={{ fontSize: '0.72rem', background: 'rgba(255, 255, 255, 0.22)', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>
                  Active {activeVersion}
                </span>
                {isAlreadyAccepted && (
                  <span style={{ fontSize: '0.72rem', background: 'rgba(16, 185, 129, 0.28)', border: '1px solid rgba(16, 185, 129, 0.6)', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>
                    Accepted on this device
                  </span>
                )}
              </div>
            </div>
          </div>
          <p style={{ margin: '8px 0 0 0', fontSize: '0.86rem', lineHeight: 1.5, color: '#E0E7FF', opacity: 0.95 }}>
            Please review and accept our terms before submitting civic reports. These guidelines ensure responsible use and authentic community-driven reporting.
          </p>
        </div>
      </div>

      {/* 6 GUIDELINE CARDS (3x2 GRID REPRODUCING SCREENSHOT EXACTLY) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 16
      }}>
        {/* CARD 1: Responsible Use */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: 12,
          padding: '20px 22px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: '#EFF6FF',
              border: '1px solid #BFDBFE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2563EB'
            }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: '#0F172A' }}>
              Responsible Use
            </h3>
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.82rem', color: '#475569', lineHeight: 1.55 }}>
            <li style={{ marginBottom: 6 }}>Submit only genuine and accurate civic reports.</li>
            <li style={{ marginBottom: 6 }}>Do not submit duplicate, false, misleading, or abusive reports.</li>
            <li>Use respectful and appropriate language while interacting on the platform.</li>
          </ul>
        </div>

        {/* CARD 2: Location & Evidence Permission */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: 12,
          padding: '20px 22px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: '#EFF6FF',
              border: '1px solid #BFDBFE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2563EB'
            }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: '#0F172A' }}>
              Location & Evidence Permission
            </h3>
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.82rem', color: '#475569', lineHeight: 1.55 }}>
            <li style={{ marginBottom: 6 }}>Your location (GPS) is used to show nearby issues and to geotag your reports.</li>
            <li style={{ marginBottom: 6 }}>Live photo/video verification requires you to be physically near the reported issue.</li>
            <li>Submit only evidence (photos/videos) that you own or are authorised to share.</li>
          </ul>
        </div>

        {/* CARD 3: Safety Restrictions */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: 12,
          padding: '20px 22px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: '#EFF6FF',
              border: '1px solid #BFDBFE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2563EB'
            }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: '#0F172A' }}>
              Safety Restrictions
            </h3>
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.82rem', color: '#475569', lineHeight: 1.55 }}>
            <li style={{ marginBottom: 6 }}>Do not enter dangerous, private, or restricted areas to capture evidence.</li>
            <li style={{ marginBottom: 6 }}>Do not approach live electrical wires, floodwater, or any other hazardous sites.</li>
            <li style={{ marginBottom: 6 }}>UrbanPulse is not for emergency reporting.</li>
            <li>Contact local emergency services for immediate danger or life-threatening situations.</li>
          </ul>
        </div>

        {/* CARD 4: Privacy & Data Use */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: 12,
          padding: '20px 22px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: '#EFF6FF',
              border: '1px solid #BFDBFE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2563EB'
            }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: '#0F172A' }}>
              Privacy & Data Use
            </h3>
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.82rem', color: '#475569', lineHeight: 1.55 }}>
            <li style={{ marginBottom: 6 }}>Your location, issue details, photos, and videos are collected and processed to provide and improve civic services.</li>
            <li>This information is used only for legitimate civic management purposes and is accessible to authorised personnel as per applicable policy.</li>
          </ul>
        </div>

        {/* CARD 5: Account & Enforcement */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: 12,
          padding: '20px 22px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: '#EFF6FF',
              border: '1px solid #BFDBFE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2563EB'
            }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <line x1="18" y1="8" x2="23" y2="13" />
                <line x1="23" y1="8" x2="18" y2="13" />
              </svg>
            </div>
            <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: '#0F172A' }}>
              Account & Enforcement
            </h3>
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.82rem', color: '#475569', lineHeight: 1.55 }}>
            <li style={{ marginBottom: 6 }}>False, abusive, fraudulent, spam, or malicious submissions may result in warnings or temporary account restrictions.</li>
            <li>You can contact support to appeal or request a review of any enforcement action on your account.</li>
          </ul>
        </div>

        {/* CARD 6: Violation & Consequences (MANDATORY LEGAL CLAUSE) */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: 12,
          padding: '20px 22px',
          border: '1px solid #FECACA',
          boxShadow: '0 1px 3px rgba(220, 38, 38, 0.05)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#DC2626'
            }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
              </svg>
            </div>
            <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: '#B91C1C' }}>
              Violation & Consequences
            </h3>
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.82rem', color: '#475569', lineHeight: 1.55 }}>
            <li style={{ marginBottom: 6 }}>
              Any serious or deliberate violation of these Terms & Conditions, including fraudulent reporting, malicious submissions, impersonation, abuse, or unlawful activity, may result in permanent suspension or termination of your UrbanPulse account.
            </li>
            <li>
              Where required by applicable law, suspected unlawful activity or relevant evidence may be reported to the appropriate authorities.
            </li>
          </ul>
        </div>
      </div>

      {/* FULL-WIDTH ACKNOWLEDGEMENT CARD (MATCHING SCREENSHOT WITH CHECKBOX & DISABLED BUTTON LOGIC) */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: 14,
        padding: '24px 28px',
        border: '1px solid #DBEAFE',
        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: 16
      }}>
        {/* Header of Acknowledgement Card */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: '#EFF6FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2563EB'
            }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 11 12 14 22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: '#0F172A' }}>
                  Your Acknowledgement
                </h4>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  background: '#DBEAFE',
                  color: '#1D4ED8',
                  padding: '2px 8px',
                  borderRadius: 4,
                  letterSpacing: '0.5px'
                }}>
                  REQUIRED
                </span>
              </div>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748B' }}>
                You must accept these terms to continue using the platform.
              </p>
            </div>
          </div>
        </div>

        {/* Checkbox Acceptance Row */}
        <div style={{
          background: '#F8FAFC',
          border: agreed ? '1.5px solid #2563EB' : '1px solid #E2E8F0',
          borderRadius: 10,
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          transition: 'all 0.15s ease',
          cursor: isSuspended ? 'not-allowed' : 'pointer'
        }}
        onClick={() => !isSuspended && setAgreed(!agreed)}
        >
          <input
            type="checkbox"
            id="terms-ack-checkbox"
            checked={agreed}
            disabled={isSuspended}
            onChange={(e) => setAgreed(e.target.checked)}
            style={{
              width: 18,
              height: 18,
              marginTop: 2,
              accentColor: '#2563EB',
              cursor: isSuspended ? 'not-allowed' : 'pointer',
              flexShrink: 0
            }}
          />
          <label
            htmlFor="terms-ack-checkbox"
            style={{
              fontSize: '0.84rem',
              color: '#334155',
              lineHeight: 1.5,
              cursor: isSuspended ? 'not-allowed' : 'pointer',
              userSelect: 'none'
            }}
          >
            I have read, understood, and agree to the <strong>Terms & Conditions</strong> and <strong>Privacy Policy</strong>. I confirm that all reports I submit will be accurate, truthful, and comply with the guidelines stated above.
          </label>
        </div>

        {/* Footer Meta & Action Button */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          paddingTop: 4
        }}>
          {/* Version Info & Full Terms Link */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: '0.76rem', color: '#64748B', fontWeight: 500 }}>
              Version: <strong>{activeVersion}</strong> &nbsp;|&nbsp; Last Updated: <strong>{lastUpdated}</strong>
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowFullTerms(true);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#2563EB',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: 0,
                textDecoration: 'underline'
              }}
            >
              <span>View Full Terms</span>
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </button>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isModal && onDeclined && (
              <button
                type="button"
                onClick={handleDecline}
                disabled={submitting}
                style={{
                  background: '#F1F5F9',
                  color: '#475569',
                  border: '1px solid #CBD5E1',
                  padding: '9px 18px',
                  borderRadius: 8,
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Decline
              </button>
            )}

            <button
              type="button"
              onClick={handleAccept}
              disabled={!agreed || submitting || isSuspended}
              style={{
                background: (!agreed || isSuspended)
                  ? '#94A3B8'
                  : 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                color: '#FFFFFF',
                border: 'none',
                padding: '9px 24px',
                borderRadius: 8,
                fontSize: '0.86rem',
                fontWeight: 600,
                cursor: (!agreed || isSuspended) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: (!agreed || isSuspended)
                  ? 'none'
                  : '0 4px 12px rgba(37, 99, 235, 0.3)',
                transition: 'all 0.15s ease'
              }}
            >
              {submitting ? (
                <span>Recording Consent...</span>
              ) : isAlreadyAccepted ? (
                <>
                  <span>Terms Accepted</span>
                  <span>✓</span>
                </>
              ) : (
                <>
                  <span>Accept & Continue</span>
                  <span>→</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* VIEW FULL TERMS MODAL */}
      {showFullTerms && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(4px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: 16,
            width: '100%',
            maxWidth: 720,
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#F8FAFC'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0F172A' }}>
                  UrbanPulse Civic Platform – Master Terms of Service & Privacy Charter
                </h3>
                <span style={{ fontSize: '0.74rem', color: '#64748B' }}>
                  Active Version: {activeVersion} • Last Revised: {lastUpdated}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowFullTerms(false)}
                style={{
                  background: '#E2E8F0',
                  border: 'none',
                  borderRadius: '50%',
                  width: 32,
                  height: 32,
                  cursor: 'pointer',
                  fontWeight: 700,
                  color: '#475569'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '24px 28px', overflowY: 'auto', fontSize: '0.85rem', color: '#334155', lineHeight: 1.6 }}>
              <h4 style={{ color: '#1E3A8A', marginTop: 0 }}>1. Introduction & Citizen Purpose</h4>
              <p>
                UrbanPulse is an intelligent civic redressal platform engineered to bridge Bengaluru residents with municipal bodies including the Bruhat Bengaluru Mahanagara Palike (BBMP), Bangalore Water Supply and Sewerage Board (BWSSB), Bangalore Electricity Supply Company (BESCOM), and Traffic Police. By registering or using the platform, you enter into a binding agreement to adhere to these operational and legal standards.
              </p>

              <h4 style={{ color: '#1E3A8A' }}>2. Geolocation and Live Evidence Processing</h4>
              <p>
                UrbanPulse leverages device GPS coordinates and camera capture for geotagging civic grievances and verifying nearby community reports. When submitting live photographic or video evidence, the platform verifies physical proximity within a 50-metre radius of the incident. You agree not to spoof GPS coordinates or upload synthetic media disguised as real-time evidence.
              </p>

              <h4 style={{ color: '#1E3A8A' }}>3. Public Safety & Physical Restraint</h4>
              <p>
                Citizens must prioritize personal and public safety. Never trespass into restricted zones, approach live electrical lines, or wade into deep floodwaters to capture media. UrbanPulse is non-emergency; for immediate life threats, always call emergency dispatch 112.
              </p>

              <h4 style={{ color: '#1E3A8A' }}>4. Community Voting & Verification Integrity</h4>
              <p>
                The Community Help module permits one vote per citizen per issue. Disputes must contain verifiable rationale. Malicious coordination to suppress legitimate complaints is strictly prohibited.
              </p>

              <h4 style={{ color: '#1E3A8A' }}>5. Suspension, Termination & Legal Prosecution</h4>
              <p style={{ background: '#FEF2F2', padding: 12, borderRadius: 8, border: '1px solid #FECACA', color: '#991B1B' }}>
                <strong>Strict Misconduct Clause:</strong> Any serious or deliberate violation of these Terms & Conditions, including fraudulent reporting, malicious submissions, impersonation, abuse, or unlawful activity, may result in permanent suspension or termination of your UrbanPulse account. Where required by applicable law, suspected unlawful activity or relevant evidence may be reported to the appropriate authorities.
              </p>

              <h4 style={{ color: '#1E3A8A' }}>6. Administrative Appeal Mechanism</h4>
              <p>
                Citizens whose accounts have been flagged or suspended maintain the right to submit an administrative review explaining the grievance context. Appeals are evaluated by municipal supervisors within 3 business days.
              </p>
            </div>

            <div style={{
              padding: '14px 24px',
              borderTop: '1px solid #E2E8F0',
              display: 'flex',
              justifyContent: 'flex-end',
              background: '#F8FAFC'
            }}>
              <button
                type="button"
                onClick={() => setShowFullTerms(false)}
                style={{
                  background: '#2563EB',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '8px 20px',
                  borderRadius: 6,
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Close Charter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* APPEAL MODAL */}
      {showAppealModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(4px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: 14,
            width: '100%',
            maxWidth: 500,
            padding: 24,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 700, color: '#0F172A' }}>
              Submit Administrative Appeal
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '0.82rem', color: '#64748B', lineHeight: 1.5 }}>
              Please provide a clear justification explaining why the enforcement action on your account should be reconsidered by municipal administrators.
            </p>

            {appealSuccess ? (
              <div style={{
                background: '#ECFDF5',
                color: '#065F46',
                border: '1px solid #A7F3D0',
                padding: '12px 16px',
                borderRadius: 8,
                fontSize: '0.85rem',
                textAlign: 'center'
              }}>
                ✓ Appeal submitted successfully. Municipal officers will review your submission.
              </div>
            ) : (
              <form onSubmit={handleSendAppeal}>
                <textarea
                  value={appealReason}
                  onChange={(e) => setAppealReason(e.target.value)}
                  placeholder="Explain the context or error regarding the reported violation (min 10 characters)..."
                  rows={4}
                  required
                  minLength={10}
                  style={{
                    width: '100%',
                    padding: 12,
                    borderRadius: 8,
                    border: '1px solid #CBD5E1',
                    fontSize: '0.84rem',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                    marginBottom: 16
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => setShowAppealModal(false)}
                    style={{
                      background: '#F1F5F9',
                      color: '#475569',
                      border: '1px solid #CBD5E1',
                      padding: '8px 16px',
                      borderRadius: 6,
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={appealSubmitting || appealReason.trim().length < 10}
                    style={{
                      background: appealReason.trim().length < 10 ? '#94A3B8' : '#2563EB',
                      color: '#FFFFFF',
                      border: 'none',
                      padding: '8px 18px',
                      borderRadius: 6,
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: appealReason.trim().length < 10 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {appealSubmitting ? 'Submitting...' : 'Submit Appeal'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
