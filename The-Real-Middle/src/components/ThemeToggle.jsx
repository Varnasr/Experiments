import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

const ThemeToggle = () => {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    // Load saved theme
    const savedTheme = localStorage.getItem('realMiddleTheme');
    if (savedTheme) {
      setIsDark(savedTheme === 'dark');
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
      // Default to dark
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = isDark ? 'light' : 'dark';
    setIsDark(!isDark);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('realMiddleTheme', newTheme);
  };

  return (
    <button
      onClick={toggleTheme}
      className="fixed top-4 right-20 z-40 p-3 rounded-lg border transition-all duration-300 theme-toggle-btn shadow-lg hover:scale-105
                 sm:top-4 sm:right-16 sm:p-2
                 md:top-4 md:right-20 md:p-3"
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      {isDark ? (
        <Sun className="w-5 h-5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-amber-400" />
      ) : (
        <Moon className="w-5 h-5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-slate-600" />
      )}
    </button>
  );
};

export default ThemeToggle;