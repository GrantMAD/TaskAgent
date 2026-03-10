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
    switch (type) {
        case 'subtle':
            return {
                shadowColor,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 5,
                elevation: 2,
            };
        case 'medium':
            return {
                shadowColor,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 10,
                elevation: 4,
            };
        case 'accent':
            return {
                shadowColor: theme.accent,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 10,
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
