import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

const THEMES = {
    dark: {
        label: '🌙 Dark',
        class: 'theme-dark',
    },
    light: {
        label: '☀️ Light',
        class: 'theme-light',
    },
    midnight: {
        label: '🌌 Midnight',
        class: 'theme-midnight',
    },
    ocean: {
        label: '🌊 Ocean',
        class: 'theme-ocean',
    },
    sunset: {
        label: '🌅 Sunset',
        class: 'theme-sunset',
    },
    emerald: {
        label: '💎 Emerald',
        class: 'theme-emerald',
    },
};

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(() => {
        return localStorage.getItem('sniplink-theme') || 'dark';
    });

    useEffect(() => {
        // Remove all theme classes
        Object.values(THEMES).forEach(t => {
            document.documentElement.classList.remove(t.class);
        });
        // Add current if not default dark
        if (theme !== 'dark') {
            document.documentElement.classList.add(THEMES[theme].class);
        }
        localStorage.setItem('sniplink-theme', theme);
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme, THEMES }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}
