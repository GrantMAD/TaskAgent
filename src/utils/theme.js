export const LightTheme = {
    primary: '#1A3D5D',
    accent: '#E68A00',
    background: '#F8F9FA',
    surface: '#FFFFFF',
    text: '#1A3D5D',
    textMuted: '#6C757D',
    border: '#E9ECEF',
    white: '#FFFFFF',
    black: '#000000',
    error: '#DC3545',
    success: '#28A745',
    card: '#FFFFFF',
    input: '#FAFBFA',
    shadow: '#1A3D5D',
};

export const DarkTheme = {
    primary: '#2C5375', // Slightly lighter navy for contrast
    accent: '#FF9F1A', // Brighter orange
    background: '#121212', // Material dark background
    surface: '#1E1E1E', // Dark grey surface
    text: '#E1E1E1', // Light grey text
    textMuted: '#A0A0A0',
    border: '#333333',
    white: '#FFFFFF',
    black: '#000000',
    error: '#CF6679',
    success: '#81C784',
    card: '#1E1E1E',
    input: '#2C2C2C',
    shadow: '#000000',
};

// Default export for backward compatibility during migration
export const Colors = LightTheme;

export const Spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
};

export const Rounding = {
    soft: 16,
    standard: 12,
    pill: 100,
};

export const getShadow = (type, theme = LightTheme) => {
    const shadowColor = theme.shadow || theme.primary;
    
    // Helper to add opacity to hex or use rgba
    const withOpacity = (color, opacity) => {
        if (color.startsWith('#')) {
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${opacity})`;
        }
        return color;
    };

    switch (type) {
        case 'subtle':
            return {
                boxShadow: [{
                    offsetX: 0,
                    offsetY: 2,
                    blur: 5,
                    color: withOpacity(shadowColor, 0.1)
                }],
                elevation: 2,
            };
        case 'medium':
            return {
                boxShadow: [{
                    offsetX: 0,
                    offsetY: 4,
                    blur: 10,
                    color: withOpacity(shadowColor, 0.2)
                }],
                elevation: 4,
            };
        case 'accent':
            return {
                boxShadow: [{
                    offsetX: 0,
                    offsetY: 4,
                    blur: 10,
                    color: withOpacity(theme.accent, 0.3)
                }],
                elevation: 5,
            };
        default:
            return {};
    }
};

export const Shadow = {
    subtle: getShadow('subtle'),
    medium: getShadow('medium'),
    accent: getShadow('accent'),
};
