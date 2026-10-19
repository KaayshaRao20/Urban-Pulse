import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';
import {
  POPULAR_INDIC_LANGUAGES,
  ALL_GOOGLE_LANGUAGES,
  applyGoogleTranslate,
  getSavedGoogleLang,
  initGoogleTranslate
} from '../i18n/googleLanguages';

export default function LanguageSelector() {
  const { currentLanguage, changeLanguage, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeLangCode, setActiveLangCode] = useState(() => getSavedGoogleLang());
  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const searchInputRef = useRef(null);

  // Initialize Google Translate script and element
  useEffect(() => {
    initGoogleTranslate();
  }, []);

  // Sync state with saved cookie / storage on mount
  useEffect(() => {
    const saved = getSavedGoogleLang();
    if (saved) {
      setActiveLangCode(saved);
      if (['en', 'kn', 'hi', 'ta', 'te'].includes(saved)) {
        changeLanguage(saved);
      }
    }
  }, [changeLanguage]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Focus search input when opened
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Find active language object
  const currentLangObj = useMemo(() => {
    return (
      ALL_GOOGLE_LANGUAGES.find((l) => l.code === activeLangCode) ||
      POPULAR_INDIC_LANGUAGES.find((l) => l.code === activeLangCode) || {
        code: 'en',
        name: 'English',
        nativeName: 'English'
      }
    );
  }, [activeLangCode]);

  // Filter languages based on search query
  const filteredLanguages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return ALL_GOOGLE_LANGUAGES;
    return ALL_GOOGLE_LANGUAGES.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.nativeName.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // Select language and apply Google Translate
  const handleSelectLanguage = (langCode) => {
    setActiveLangCode(langCode);
    applyGoogleTranslate(langCode);

    // If we have custom high-res translations for this code, sync React context too
    if (['en', 'kn', 'hi', 'ta', 'te'].includes(langCode)) {
      changeLanguage(langCode);
    }

    setIsOpen(false);
    setSearchQuery('');
    buttonRef.current?.focus();
  };

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      buttonRef.current?.focus();
    }
  };

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', display: 'inline-block' }}
      onKeyDown={handleKeyDown}
      className="notranslate"
    >
      {/* Trigger Button in Header */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={`Language: ${currentLangObj.nativeName}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 12px 6px 10px',
          borderRadius: 20,
          background: 'var(--card-bg, #FFFFFF)',
          border: isOpen ? '1.5px solid #2563EB' : '1px solid var(--card-border, #CBD5E1)',
          color: 'var(--text-title, #0F172A)',
          fontSize: '0.82rem',
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: isOpen
            ? '0 0 0 3px rgba(37, 99, 235, 0.15)'
            : '0 1px 3px rgba(0, 0, 0, 0.05)',
          transition: 'all 0.15s ease'
        }}
      >
        {/* Globe / Google Translate Vector Icon */}
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="#2563EB"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>

        {/* Selected Language Native Text */}
        <span style={{ letterSpacing: '0.01em', fontFamily: 'var(--font-sans)' }}>
          {currentLangObj.nativeName}
        </span>

        {/* Script Badge */}
        <span
          style={{
            fontSize: '0.68rem',
            fontWeight: 800,
            background: 'rgba(37, 99, 235, 0.1)',
            color: '#2563EB',
            padding: '1px 6px',
            borderRadius: 10,
            border: '1px solid rgba(37, 99, 235, 0.2)'
          }}
        >
          {currentLangObj.code.toUpperCase()}
        </span>

        {/* Chevron Icon */}
        <svg
          viewBox="0 0 24 24"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          aria-hidden="true"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s ease',
            color: '#64748B'
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Full Multi-Language Dropdown Panel */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Google Translate Languages"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: 330,
            maxHeight: 520,
            background: 'var(--card-bg, #FFFFFF)',
            border: '1px solid var(--card-border, #CBD5E1)',
            borderRadius: 14,
            boxShadow: '0 16px 36px rgba(15, 23, 42, 0.18), 0 4px 12px rgba(0, 0, 0, 0.08)',
            padding: '10px 8px 8px',
            zIndex: 1200,
            display: 'flex',
            flexDirection: 'column',
            animation: 'fadeIn 0.15s ease-out'
          }}
        >
          {/* Header & Google Translate Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '2px 8px 8px',
              borderBottom: '1px solid var(--card-border-subtle, #F1F5F9)'
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  color: 'var(--text-title, #0F172A)'
                }}
              >
                Select Language
              </div>
              <div
                style={{
                  fontSize: '0.66rem',
                  color: 'var(--text-muted, #64748B)',
                  fontWeight: 500
                }}
              >
                100+ languages powered by Google Translate
              </div>
            </div>

            {/* Google Translate Badge */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '3px 8px',
                borderRadius: 12,
                background: 'rgba(37, 99, 235, 0.08)',
                border: '1px solid rgba(37, 99, 235, 0.2)',
                fontSize: '0.64rem',
                fontWeight: 700,
                color: '#2563EB'
              }}
            >
              <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                <path d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0014.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/>
              </svg>
              <span>Google</span>
            </div>
          </div>

          {/* Search Box */}
          <div style={{ padding: '8px 4px 6px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'var(--bg-subtle, #F8FAFC)',
                border: '1px solid var(--card-border, #CBD5E1)',
                borderRadius: 8,
                padding: '6px 10px'
              }}
            >
              <svg
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="none"
                stroke="#64748B"
                strokeWidth="2.2"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search languages (e.g. Kannada, Hindi, Spanish...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  fontSize: '0.78rem',
                  color: 'var(--text-title, #0F172A)',
                  width: '100%',
                  fontFamily: 'inherit'
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{
                    border: 'none',
                    background: 'none',
                    color: '#94A3B8',
                    cursor: 'pointer',
                    padding: 0,
                    fontSize: '0.8rem',
                    fontWeight: 700
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Quick Select: Major Indian / State Languages */}
          {!searchQuery && (
            <div style={{ padding: '4px 4px 8px', borderBottom: '1px solid var(--card-border-subtle, #F1F5F9)' }}>
              <div
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--text-muted, #64748B)',
                  marginBottom: 6,
                  paddingLeft: 4
                }}
              >
                Regional & Official Languages
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 4
                }}
              >
                {POPULAR_INDIC_LANGUAGES.slice(0, 9).map((lang) => {
                  const isSelected = activeLangCode === lang.code;
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => handleSelectLanguage(lang.code)}
                      style={{
                        padding: '6px 4px',
                        borderRadius: 6,
                        border: isSelected ? '1.5px solid #2563EB' : '1px solid var(--card-border, #E2E8F0)',
                        background: isSelected ? 'rgba(37, 99, 235, 0.1)' : 'var(--card-bg, #FFFFFF)',
                        color: isSelected ? '#1D4ED8' : 'var(--text-title, #0F172A)',
                        fontSize: '0.74rem',
                        fontWeight: isSelected ? 800 : 600,
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.1s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 1
                      }}
                    >
                      <span style={{ fontSize: '0.76rem', fontWeight: 700 }}>{lang.nativeName}</span>
                      <span style={{ fontSize: '0.62rem', color: '#64748B' }}>{lang.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Scrollable Language List */}
          <div
            style={{
              overflowY: 'auto',
              maxHeight: 250,
              padding: '4px 2px',
              display: 'flex',
              flexDirection: 'column',
              gap: 2
            }}
          >
            <div
              style={{
                fontSize: '0.65rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-muted, #64748B)',
                padding: '4px 6px 2px'
              }}
            >
              {searchQuery ? `Matching Languages (${filteredLanguages.length})` : 'All Languages (A–Z)'}
            </div>

            {filteredLanguages.length === 0 ? (
              <div
                style={{
                  padding: '16px',
                  textAlign: 'center',
                  fontSize: '0.78rem',
                  color: 'var(--text-muted, #64748B)'
                }}
              >
                No languages found matching "{searchQuery}"
              </div>
            ) : (
              filteredLanguages.map((lang) => {
                const isSelected = activeLangCode === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleSelectLanguage(lang.code)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '7px 10px',
                      borderRadius: 6,
                      border: 'none',
                      background: isSelected ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
                      color: isSelected ? '#1D4ED8' : 'var(--text-title, #0F172A)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.1s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'rgba(0, 0, 0, 0.04)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                        {lang.nativeName}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted, #64748B)' }}>
                        ({lang.name})
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        style={{
                          fontSize: '0.62rem',
                          fontWeight: 700,
                          color: '#64748B',
                          background: 'rgba(0, 0, 0, 0.05)',
                          padding: '1px 5px',
                          borderRadius: 4
                        }}
                      >
                        {lang.code}
                      </span>
                      {isSelected && (
                        <svg
                          viewBox="0 0 24 24"
                          width="14"
                          height="14"
                          fill="none"
                          stroke="#2563EB"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer with Reset to Original English and Google Gadget */}
          <div
            style={{
              padding: '8px 6px 4px',
              borderTop: '1px solid var(--card-border-subtle, #F1F5F9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 4
            }}
          >
            <button
              type="button"
              onClick={() => handleSelectLanguage('en')}
              style={{
                background: 'transparent',
                border: '1px solid var(--card-border, #CBD5E1)',
                padding: '4px 10px',
                borderRadius: 6,
                fontSize: '0.72rem',
                fontWeight: 600,
                color: 'var(--text-muted, #64748B)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5
              }}
            >
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              <span>Reset to English</span>
            </button>

            <span
              style={{
                fontSize: '0.66rem',
                color: 'var(--text-muted, #64748B)',
                fontWeight: 600
              }}
            >
              107+ Languages Available
            </span>
          </div>
        </div>
      )}

      {/* Persistent Google Translate Mount Element */}
      <div
        id="google_translate_element"
        style={{
          position: 'absolute',
          top: -9999,
          left: -9999,
          width: 1,
          height: 1,
          opacity: 0,
          pointerEvents: 'none'
        }}
      />
    </div>
  );
}
