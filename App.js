import React from 'react';
import { AppNavigator } from './src/navigation/AppNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LogBox } from 'react-native';
import { ToastProvider } from './src/components/ToastContext';
import { ThemeProvider } from './src/components/ThemeContext';
import { LocationProvider } from './src/components/LocationContext';
import { AuthProvider } from './src/components/AuthContext';
import ErrorBoundary from './src/components/ErrorBoundary';

// Suppress known deprecation warnings
// Suppress known deprecation warnings from libraries
LogBox.ignoreLogs([
    'props.pointerEvents is deprecated',
    'Use style.pointerEvents'
]);

export default function App() {
    return (
        <SafeAreaProvider style={{ flex: 1 }}>
            <ErrorBoundary>
                <AuthProvider>
                    <ThemeProvider>
                        <ToastProvider>
                            <LocationProvider>
                                <AppNavigator />
                            </LocationProvider>
                        </ToastProvider>
                    </ThemeProvider>
                </AuthProvider>
            </ErrorBoundary>
        </SafeAreaProvider>
    );
}
