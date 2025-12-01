import React, { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

function ThemeToggle() {
    const [theme, setTheme] = useState(() => {
        // Check localStorage first, default to 'dark'
        const savedTheme = localStorage.getItem('theme') || 'dark';
        return savedTheme;
    });

    // Apply theme on mount and when it changes
    useEffect(() => {
        const root = document.documentElement;

        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }

        localStorage.setItem('theme', theme);

        // Debug log
        console.log('Theme changed to:', theme, 'Dark class present:', root.classList.contains('dark'));
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => {
            const newTheme = prev === 'dark' ? 'light' : 'dark';
            console.log('Toggling theme from', prev, 'to', newTheme);
            return newTheme;
        });
    };

    return (
        <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
    );
}

export default ThemeToggle;
