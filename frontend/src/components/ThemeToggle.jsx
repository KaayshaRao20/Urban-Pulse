import React from 'react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle({ variant = 'pill', className = '' }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={`theme-toggle-btn theme-toggle-compact ${className}`}
        title={`Current: ${isDark ? 'Dark Mode' : 'Light Mode'} — Click to toggle`}
        aria-label="Toggle visual theme"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '34px',
          height: '34px',
          borderRadius: '8px',
          border: '1px solid var(--card-border, #CBD5E1)',
          background: 'var(--card-bg, #FFFFFF)',
          color: 'var(--text-body, #334155)',
          cursor: 'pointer',
          transition: 'all 0.18s ease',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}
      >
        {isDark ? (
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`theme-toggle-btn theme-toggle-pill ${className}`}
      title="Toggle Enterprise Theme (Light / Dark)"
      aria-label="Toggle system theme"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '7px',
        padding: '5px 11px',
        borderRadius: '8px',
        border: '1px solid var(--card-border, #CBD5E1)',
        background: 'var(--card-bg, #FFFFFF)',
        color: 'var(--text-body, #334155)',
        fontSize: '0.74rem',
        fontWeight: 700,
        cursor: 'pointer',
        transition: 'all 0.18s ease',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
      }}
    >
      {isDark ? (
        <>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#60A5FA" strokeWidth="2">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
          <span>Dark Mode</span>
        </>
      ) : (
        <>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#2563EB" strokeWidth="2">
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
          <span>Light Theme</span>
        </>
      )}
    </button>
  );
}
