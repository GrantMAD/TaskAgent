import React from 'react';
import { AppNavigator } from './src/navigation/AppNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LogBox } from 'react-native';

// Suppress known deprecation warnings
LogBox.ignoreLogs(['props.pointerEvents is deprecated']);

export default function App() {
    return (
        <SafeAreaProvider style={{ flex: 1 }}>
            <AppNavigator />
        </SafeAreaProvider>
    );
}
