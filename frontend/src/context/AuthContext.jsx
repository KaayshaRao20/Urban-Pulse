import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { API_BASE } from '../config/api';

const AuthContext = createContext(null);

const SESSION_STORAGE_KEY = 'urbanpulse_auth_session';
const LEGACY_STORAGE_KEY = 'urbanpulse_officer_session';

// Pre-configured municipal authorized officers for instant verification and testing
export const DEMO_OFFICERS = [
  {
    id: 'off-kaaysha-01',
    username: '01kaaysha',
    badgeId: '01KAAYSHA',
    name: 'Duty Commander Kaaysha (City 01)',
    email: '01kaaysha@urbanpulse.gov.in',
    department: 'Smart City Integrated Command & Control Centre (ICCC)',
    role: 'officer',
    clearance: 'Municipal Security Clearance Level 5',
    assignedZone: 'Bengaluru Metropolitan Area (City Code 01)',
    phone: '+91 98450 12345'
  },
  {
    id: 'off-bbmp-01',
    username: 'engineer.rao',
    badgeId: 'BBMP-ENG-8412',
    name: 'Executive Engineer K. S. Rao',
    email: 'engineer.rao@bbmp.gov.in',
    department: 'BBMP Road Infrastructure Cell',
    role: 'officer',
    clearance: 'Municipal Security Clearance Level 4',
    assignedZone: 'Mahadevapura / East Corridor',
    phone: '+91 80 2222 1188'
  },
  {
    id: 'off-bwssb-02',
    username: 'murthy.water',
    badgeId: 'BWSSB-HYD-5021',
    name: 'Chief Hydrologist K. S. Murthy',
    email: 'murthy.water@bwssb.gov.in',
    department: 'BWSSB Water Supply Division',
    role: 'supervisor',
    clearance: 'Municipal Security Clearance Level 4',
    assignedZone: 'Bengaluru East & Central',
    phone: '+91 80 2294 5100'
  },
  {
    id: 'off-admin-00',
    username: 'admin',
    badgeId: 'CMD-DIR-0001',
    name: 'Chief Duty Commander V. Nayak',
    email: 'admin@urbanpulse.gov.in',
    department: 'Smart City Integrated Command & Control Centre (ICCC)',
    role: 'admin',
    clearance: 'Master Command Level 5 (Root Clearance)',
    assignedZone: 'Bengaluru Metropolitan Area',
    phone: '+91 80 2266 0000'
  }
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // Restore authenticated session from localStorage on startup
  useEffect(() => {
    try {
      const savedSession = localStorage.getItem(SESSION_STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        if (parsed && (parsed.email || parsed.id)) {
          setUser(parsed);
          setIsAuthenticated(true);
        }
      }
    } catch (e) {
      console.warn('[UrbanPulse Auth] Failed to restore cached session:', e);
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } finally {
      setAuthLoading(false);
    }

    // Check for incoming Supabase OAuth callback or session
    if (isSupabaseConfigured && supabase.auth) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session && session.user) {
          handleGoogleSession(session);
        }
      }).catch(err => {
        console.warn('[UrbanPulse Auth] Supabase session check note:', err);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
          handleGoogleSession(session);
        }
      });

      return () => {
        if (subscription && subscription.unsubscribe) subscription.unsubscribe();
      };
    }
  }, []);

  // Handle Google OAuth Session sync with backend
  const handleGoogleSession = async (session) => {
    if (!session || !session.user) return;
    try {
      const res = await fetch(`${API_BASE}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: session.access_token,
          email: session.user.email,
          full_name: session.user.user_metadata?.full_name || session.user.email.split('@')[0],
          google_id: session.user.id,
          avatar_url: session.user.user_metadata?.avatar_url
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          const authUser = { ...data.user, token: data.access_token || session.access_token };
          setUser(authUser);
          setIsAuthenticated(true);
          localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(authUser));
        }
      }
    } catch (err) {
      console.warn('[UrbanPulse Auth] Google sync failed:', err);
    }
  };

  /**
   * Unified Login: accepts username (e.g. 01kaaysha), email, badge, or phone + password
   */
  const login = async (credentials) => {
    const { identifier, email, badgeId, password, department } = credentials;
    const cleanIdent = (identifier || email || badgeId || '').trim();

    // 1. Authenticate against FastAPI backend /api/auth/login
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: cleanIdent,
          email: cleanIdent,
          badgeId: cleanIdent,
          password: password,
          department
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        const authUser = {
          ...(data.user || data.officer),
          token: data.access_token
        };
        setUser(authUser);
        setIsAuthenticated(true);
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(authUser));
        localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(authUser));
        setIsAuthModalOpen(false);
        return { success: true, user: authUser, role: data.role };
      } else if (!res.ok) {
        throw new Error(data.detail || 'Authentication failed. Please verify your credentials.');
      }
    } catch (backendErr) {
      // If network unreachable, check demo officers for offline fallback
      if (backendErr.message.includes('Failed to fetch') || backendErr.message.includes('NetworkError')) {
        const matched = DEMO_OFFICERS.find(
          o => o.email.toLowerCase() === cleanIdent.toLowerCase() ||
               o.badgeId.toUpperCase() === cleanIdent.toUpperCase() ||
               (o.username && o.username.toLowerCase() === cleanIdent.toLowerCase())
        );
        if (matched) {
          setUser(matched);
          setIsAuthenticated(true);
          localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(matched));
          return { success: true, user: matched, role: matched.role };
        }
      }
      throw backendErr;
    }
  };

  /**
   * Citizen Registration
   */
  const register = async (userData) => {
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: userData.full_name || userData.fullName,
          email: userData.email,
          phone: userData.phone,
          password: userData.password,
          confirm_password: userData.confirm_password || userData.confirmPassword
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Registration failed');
      }
      return data;
    } catch (err) {
      throw err;
    }
  };

  /**
   * OTP Verification
   */
  const verifyOtp = async (email, otp) => {
    try {
      const res = await fetch(`${API_BASE}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'OTP verification failed');
      }
      if (data.user) {
        const authUser = { ...data.user, token: data.access_token };
        setUser(authUser);
        setIsAuthenticated(true);
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(authUser));
      }
      return data;
    } catch (err) {
      throw err;
    }
  };

  /**
   * Resend OTP
   */
  const resendOtp = async (email) => {
    try {
      const res = await fetch(`${API_BASE}/auth/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to resend code');
      return data;
    } catch (err) {
      throw err;
    }
  };

  /**
   * Forgot Password request
   */
  const forgotPassword = async (email) => {
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to send recovery code');
      return data;
    } catch (err) {
      throw err;
    }
  };

  /**
   * Reset Password with token
   */
  const resetPassword = async (email, token, newPassword) => {
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token, new_password: newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Password reset failed');
      return data;
    } catch (err) {
      throw err;
    }
  };

  /**
   * Google OAuth Sign In
   */
  const loginWithGoogle = async () => {
    if (isSupabaseConfigured && supabase.auth) {
      try {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin
          }
        });
        if (error) throw error;
        return data;
      } catch (err) {
        console.warn('[UrbanPulse Auth] Supabase OAuth error, using direct flow:', err);
      }
    }

    // Direct fallback for testing / environments without active Supabase OAuth client
    // Simulates or uses mock Google account verification
    const demoGoogleEmail = 'google.citizen@urbanpulse.org';
    try {
      const res = await fetch(`${API_BASE}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: demoGoogleEmail,
          full_name: 'Verified Google Citizen',
          google_id: 'google-uid-demo-992',
          avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'
        })
      });
      const data = await res.json();
      if (res.ok && data.user) {
        const authUser = { ...data.user, token: data.access_token };
        setUser(authUser);
        setIsAuthenticated(true);
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(authUser));
        return { success: true, user: authUser, role: data.role };
      }
    } catch (e) {
      throw new Error('Google sign-in could not be completed. Please use email & password.');
    }
  };

  /**
   * Account Linking for Google
   */
  const linkGoogleAccount = async (email, googleId, password) => {
    try {
      const res = await fetch(`${API_BASE}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          google_id: googleId,
          password
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Account linking failed');
      if (data.user) {
        const authUser = { ...data.user, token: data.access_token };
        setUser(authUser);
        setIsAuthenticated(true);
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(authUser));
        return { success: true, user: authUser };
      }
      return data;
    } catch (err) {
      throw err;
    }
  };

  const logout = async () => {
    if (isSupabaseConfigured && supabase.auth) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        // ignore
      }
    }
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  };

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);

  return (
    <AuthContext.Provider
      value={{
        user,
        officer: user, // Backward compatibility: all components expecting 'officer' continue to work seamlessly
        isAuthenticated,
        authLoading,
        login,
        register,
        verifyOtp,
        resendOtp,
        forgotPassword,
        resetPassword,
        loginWithGoogle,
        linkGoogleAccount,
        logout,
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
