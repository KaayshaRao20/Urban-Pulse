import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[UrbanPulse ErrorBoundary caught error]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetState = () => {
    try {
      localStorage.removeItem('urbanpulse_auth_session');
      localStorage.removeItem('urbanpulse_officer_session');
      sessionStorage.clear();
    } catch (e) {}
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          width: '100vw',
          backgroundColor: '#0B132B',
          color: '#F8FAFC',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
          boxSizing: 'border-box'
        }}>
          <div style={{
            maxWidth: '560px',
            width: '100%',
            background: 'rgba(255, 255, 255, 0.04)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '16px',
            padding: '36px 32px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            textAlign: 'center'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #1d5fd1 0%, #0fa97a 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              boxShadow: '0 8px 24px rgba(29, 95, 209, 0.4)'
            }}>
              <svg viewBox="0 0 40 40" width="32" height="32" aria-hidden="true">
                <path d="M6 22h7l3-8 5 15 4-11 2 4h7" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            <div style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '1.5px',
              color: '#38BDF8',
              textTransform: 'uppercase',
              marginBottom: '8px'
            }}>
              UrbanPulse Autonomous Safety Net
            </div>

            <h1 style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: '#FFFFFF',
              margin: '0 0 12px 0'
            }}>
              Interface Protected
            </h1>

            <p style={{
              fontSize: '0.92rem',
              color: '#94A3B8',
              lineHeight: 1.6,
              margin: '0 0 28px 0'
            }}>
              UrbanPulse caught an interface rendering exception safely to prevent a blank display.
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={this.handleReload}
                style={{
                  background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '12px 24px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)'
                }}
              >
                Reload Interface
              </button>

              <button
                onClick={this.handleResetState}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#E2E8F0',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '10px',
                  padding: '12px 20px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Reset &amp; Return Home
              </button>
            </div>

            {this.state.error && (
              <details style={{ marginTop: '24px', textAlign: 'left', background: 'rgba(0,0,0,0.25)', padding: '12px', borderRadius: '8px', fontSize: '0.78rem', color: '#CBD5E1', overflowX: 'auto' }}>
                <summary style={{ cursor: 'pointer', color: '#38BDF8', fontWeight: 600 }}>Diagnostic Details</summary>
                <pre style={{ margin: '8px 0 0 0', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {this.state.error?.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
