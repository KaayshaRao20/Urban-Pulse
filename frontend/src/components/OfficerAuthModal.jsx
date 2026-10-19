import React, { useState } from 'react';
import { useAuth, DEMO_OFFICERS } from '../context/AuthContext';
import { isSupabaseConfigured } from '../lib/supabaseClient';

export default function OfficerAuthModal({ isOpen, onClose, onSuccess }) {
  const { login, register } = useAuth();
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [authMode, setAuthMode] = useState('badge'); // 'badge' | 'email'
  const [badgeId, setBadgeId] = useState('BBMP-ENG-8412');
  const [email, setEmail] = useState('engineer.rao@bbmp.gov.in');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('bbmp2026');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('BBMP Road Infrastructure Cell');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      if (tab === 'register') {
        if (!fullName.trim() || !email.trim() || !password.trim()) {
          throw new Error('Full Name, Email and Password are required.');
        }
        const res = await register({
          full_name: fullName.trim(),
          email: email.trim(),
          badge_id: badgeId.trim() || undefined,
          password: password.trim(),
          department,
          phone: phone.trim() || undefined,
          role: 'officer'
        });
        if (res && res.success) {
          if (onSuccess) onSuccess(res.officer);
          if (onClose) onClose();
        }
      } else {
        const payload = authMode === 'badge' 
          ? { badgeId, password, department } 
          : { email, password, department };
        
        const res = await login(payload);
        if (res && res.success) {
          if (onSuccess) onSuccess(res.officer);
          if (onClose) onClose();
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed. Please verify municipal credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectDemoOfficer = (demo) => {
    setBadgeId(demo.badgeId);
    setEmail(demo.email);
    setPassword('bbmp2026');
    setDepartment(demo.department);
    setErrorMsg('');
  };

  return (
    <div className="officer-modal-backdrop" onClick={onClose}>
      <div className="officer-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header Ribbon */}
        <div className="officer-modal-ribbon">
          <div className="officer-modal-seal">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          </div>
          <div>
            <div className="officer-modal-gov-title">GOVERNMENT OF KARNATAKA | BBMP SMART CITY MISSION</div>
            <div className="officer-modal-main-title">Municipal Authority Command Portal</div>
          </div>
          <button type="button" className="officer-modal-close-btn" onClick={onClose} aria-label="Close modal">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Security Notice */}
        <div className="officer-modal-security-notice">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#3B82F6" strokeWidth="2" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <div>
            <strong>Restricted Access Gateway:</strong> This console is strictly reserved for authorized municipal engineers, dispatch officers, and command supervisors.
          </div>
        </div>

        {/* Connection Status Pill */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.74rem', color: '#64748B' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: isSupabaseConfigured ? '#10B981' : '#2563EB', display: 'inline-block' }}></span>
            <span>Auth Gateway: <strong style={{ color: '#0F172A' }}>{isSupabaseConfigured ? 'Supabase Cloud Auth' : 'Municipal Security Engine'}</strong></span>
          </div>
          <span style={{ fontSize: '0.7rem', color: '#64748B', fontFamily: 'monospace' }}>SEC-PROTO 4.2</span>
        </div>

        {/* Mode Switcher: Sign In vs Register */}
        <div style={{ display: 'flex', gap: '8px', padding: '0 24px 12px' }}>
          <button
            type="button"
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: tab === 'login' ? '1px solid #2563EB' : '1px solid #E2E8F0',
              background: tab === 'login' ? '#EFF6FF' : '#FFFFFF',
              color: tab === 'login' ? '#1D4ED8' : '#64748B'
            }}
            onClick={() => { setTab('login'); setErrorMsg(''); }}
          >
            Officer Sign In
          </button>
          <button
            type="button"
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: tab === 'register' ? '1px solid #2563EB' : '1px solid #E2E8F0',
              background: tab === 'register' ? '#EFF6FF' : '#FFFFFF',
              color: tab === 'register' ? '#1D4ED8' : '#64748B'
            }}
            onClick={() => { setTab('register'); setErrorMsg(''); }}
          >
            Register New Officer
          </button>
        </div>

        {/* Auth Method Switcher (only for login) */}
        {tab === 'login' && (
          <div className="officer-modal-tabs">
            <button
              type="button"
              className={`officer-modal-tab ${authMode === 'badge' ? 'active' : ''}`}
              onClick={() => setAuthMode('badge')}
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <circle cx="9" cy="10" r="2" />
                <line x1="15" y1="8" x2="17" y2="8" />
                <line x1="15" y1="12" x2="17" y2="12" />
                <line x1="7" y1="16" x2="17" y2="16" />
              </svg>
              <span>Official Badge ID</span>
            </button>
            <button
              type="button"
              className={`officer-modal-tab ${authMode === 'email' ? 'active' : ''}`}
              onClick={() => setAuthMode('email')}
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <span>Gov Email Address</span>
            </button>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="officer-modal-error">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#EF4444" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleFormSubmit} className="officer-modal-form">
          {tab === 'register' && (
            <div className="officer-form-field">
              <label>Full Officer Name</label>
              <div className="officer-input-wrap">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#64748B" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <input
                  type="text"
                  placeholder="e.g. Chief Eng. Aruna Sharma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          {tab === 'register' ? (
            <div className="officer-form-field">
              <label>Official Government Email</label>
              <div className="officer-input-wrap">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#64748B" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                </svg>
                <input
                  type="email"
                  placeholder="e.g. aruna.sharma@bbmp.gov.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
          ) : authMode === 'badge' ? (
            <div className="officer-form-field">
              <label>Municipal Badge Identifier</label>
              <div className="officer-input-wrap">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#64748B" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <input
                  type="text"
                  placeholder="e.g. BBMP-ENG-8412"
                  value={badgeId}
                  onChange={(e) => setBadgeId(e.target.value)}
                  required
                />
              </div>
            </div>
          ) : (
            <div className="officer-form-field">
              <label>Official Government Email</label>
              <div className="officer-input-wrap">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#64748B" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                </svg>
                <input
                  type="email"
                  placeholder="e.g. engineer.rao@bbmp.gov.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          {tab === 'register' && (
            <div className="officer-form-field">
              <label>Official Badge ID (Optional)</label>
              <div className="officer-input-wrap">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#64748B" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="16" rx="2" />
                  <circle cx="9" cy="10" r="2" />
                </svg>
                <input
                  type="text"
                  placeholder="e.g. BBMP-ENG-9921"
                  value={badgeId}
                  onChange={(e) => setBadgeId(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="officer-form-field">
            <label>{tab === 'register' ? 'Choose Password / PIN' : 'Security PIN / Access Token'}</label>
            <div className="officer-input-wrap">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#64748B" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <input
                type="password"
                placeholder={tab === 'register' ? 'Minimum 6 characters' : 'Enter municipal password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="officer-form-field">
            <label>Designated Municipal Department</label>
            <div className="officer-input-wrap">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#64748B" strokeWidth="2">
                <path d="M3 21h18" />
                <path d="M5 21V7l5-4v18" />
                <path d="M14 21V11l5 4v6" />
              </svg>
              <select value={department} onChange={(e) => setDepartment(e.target.value)}>
                <option value="BBMP Road Infrastructure Cell">BBMP Road Infrastructure Cell</option>
                <option value="BWSSB Water Supply Division">BWSSB Water Supply Division</option>
                <option value="BBMP Solid Waste Management (SWM)">BBMP Solid Waste Management (SWM)</option>
                <option value="BBMP Stormwater Drainage & BWSSB">BBMP Stormwater Drainage & BWSSB</option>
                <option value="BESCOM Electrical Infrastructure">BESCOM Electrical Infrastructure</option>
                <option value="Bengaluru Traffic Police (BTP) Command">Bengaluru Traffic Police (BTP) Command</option>
                <option value="Smart City Integrated Command & Control Centre (ICCC)">ICCC Command Desk</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="officer-submit-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span>Authenticating Security Clearance...</span>
            ) : tab === 'register' ? (
              <>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="8.5" cy="7" r="4" />
                  <line x1="20" y1="8" x2="20" y2="14" />
                  <line x1="23" y1="11" x2="17" y2="11" />
                </svg>
                <span>Register & Enter Command Console</span>
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                  <polyline points="10 17 15 12 10 7" />
                  <line x1="15" y1="12" x2="3" y2="12" />
                </svg>
                <span>Authorize & Enter Command Console</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Selection Demo Officers (only for login) */}
        {tab === 'login' && (
          <div className="officer-demo-section">
            <div className="officer-demo-header">One-Click Authorized Municipal Profiles:</div>
            <div className="officer-demo-grid">
              {DEMO_OFFICERS.map((demo) => (
                <button
                  key={demo.id}
                  type="button"
                  className={`officer-demo-pill ${(authMode === 'badge' ? badgeId === demo.badgeId : email === demo.email) ? 'active' : ''}`}
                  onClick={() => handleSelectDemoOfficer(demo)}
                >
                  <div style={{ fontWeight: 600, color: '#0F172A' }}>{demo.name}</div>
                  <div style={{ fontSize: '0.68rem', color: '#64748B' }}>{demo.badgeId} • {demo.department.split(' ')[0]}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
