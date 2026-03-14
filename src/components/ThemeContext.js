import React, { createContext, useContext, useState, useEffect } from 'react';
import { LightTheme, DarkTheme, getShadow } from '../utils/theme';
import { supabase } from '../services/supabaseClient';
import { userService } from '../services/userService';
import { useAuth } from './AuthContext';

const ThemeContext = createContext();

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

export const ThemeProvider = ({ children }) => {
    const [isDarkMode, setIsDarkMode] = useState(false);
    const theme = isDarkMode ? DarkTheme : LightTheme;
    const { session } = useAuth();

    // Helper to get shadows dynamically
    const shadows = {
        subtle: getShadow('subtle', theme),
        medium: getShadow('medium', theme),
        accent: getShadow('accent', theme),
    };

    useEffect(() => {
        if (session) {
            fetchThemePreference();
        } else {
            setIsDarkMode(false);
        }
    }, [session]);

    const fetchThemePreference = async () => {
        if (session) {
            try {
                const profile = await userService.getUserProfile(session.user.id);
                if (profile && profile.dark_mode !== undefined) {
                    setIsDarkMode(profile.dark_mode);
                }
            } catch (error) {
                console.error('Error fetching theme preference:', error);
            }
        }
    };

    const toggleTheme = async () => {
        const newMode = !isDarkMode;
        setIsDarkMode(newMode);
        
        if (session) {
            try {
                await userService.updateUserProfile(session.user.id, { dark_mode: newMode });
            } catch (error) {
                console.error('Error saving theme preference:', error);
            }
        }
    };

    return (
        <ThemeContext.Provider value={{ theme, isDarkMode, toggleTheme, shadows }}>
            {children}
        </ThemeContext.Provider>
    );
};
