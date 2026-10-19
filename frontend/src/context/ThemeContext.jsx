import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  // Enterprise default is strictly 'light' mode
  const [theme, setThemeState] = useState(() => {
    try {
      const stored = localStorage.getItem('urbanpulse_theme');
      return stored === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('urbanpulse_theme', theme);
    } catch {
      // Ignore storage errors in private browsing
    }
    
    // Set data-theme on html root element
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.remove('theme-light', 'theme-dark');
    document.documentElement.classList.add(`theme-${theme}`);
    
    // Apply canvas background directly for seamless rendering
    if (theme === 'dark') {
      document.body.style.backgroundColor = '#0F172A';
      document.body.style.color = '#F1F5F9';
    } else {
      document.body.style.backgroundColor = '#F1F5F9';
      document.body.style.color = '#334155';
    }
  }, [theme]);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const setTheme = (mode) => {
    if (mode === 'dark' || mode === 'light') {
      setThemeState(mode);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, isDark: theme === 'dark', isLight: theme === 'light', toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
