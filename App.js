import React from 'react';
import { AppNavigator } from './src/navigation/AppNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LogBox } from 'react-native';
import { ToastProvider } from './src/components/ToastContext';
import { ThemeProvider } from './src/components/ThemeContext';
import { LocationProvider } from './src/components/LocationContext';

// Suppress known deprecation warnings
LogBox.ignoreLogs(['props.pointerEvents is deprecated']);

export default function App() {
    return (
        <SafeAreaProvider style={{ flex: 1 }}>
            <ThemeProvider>
                <ToastProvider>
                    <LocationProvider>
                        <AppNavigator />
                    </LocationProvider>
                </ToastProvider>
            </ThemeProvider>
        </SafeAreaProvider>
    );
}
