import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { Spacing, Rounding, LightTheme } from '../utils/theme';
import { FontAwesome } from '@expo/vector-icons';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // You can also log the error to an error reporting service
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    }

    render() {
        if (this.state.hasError) {
            // Render fallback UI
            return (
                <SafeAreaView style={styles.container}>
                    <View style={styles.content}>
                        <View style={styles.iconContainer}>
                            <FontAwesome name="exclamation-triangle" size={60} color={LightTheme.error} />
                        </View>
                        <Text style={styles.title}>Oops! Something went wrong.</Text>
                        <Text style={styles.subtitle}>
                            {"We encountered an unexpected error. Don't worry, your data is safe."}
                        </Text>
                        {__DEV__ && this.state.error && (
                            <View style={styles.errorBox}>
                                <Text style={styles.errorText}>{this.state.error.toString()}</Text>
                            </View>
                        )}
                        <TouchableOpacity style={styles.button} onPress={this.handleReset}>
                            <FontAwesome name="refresh" size={16} color={LightTheme.white} style={styles.buttonIcon} />
                            <Text style={styles.buttonText}>Try Again</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: LightTheme.background,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.xl,
    },
    iconContainer: {
        marginBottom: Spacing.xl,
        padding: Spacing.xl,
        backgroundColor: 'rgba(231, 76, 60, 0.1)',
        borderRadius: 100,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: LightTheme.primary,
        marginBottom: Spacing.md,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: LightTheme.textMuted,
        textAlign: 'center',
        marginBottom: Spacing.xxl,
        lineHeight: 24,
    },
    errorBox: {
        backgroundColor: LightTheme.card,
        padding: Spacing.md,
        borderRadius: Rounding.standard,
        marginBottom: Spacing.xl,
        width: '100%',
        borderLeftWidth: 4,
        borderLeftColor: LightTheme.error,
    },
    errorText: {
        color: LightTheme.error,
        fontFamily: 'monospace',
        fontSize: 12,
    },
    button: {
        backgroundColor: LightTheme.accent,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.xl,
        borderRadius: Rounding.pill,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    buttonIcon: {
        marginRight: Spacing.sm,
    },
    buttonText: {
        color: LightTheme.white,
        fontWeight: '700',
        fontSize: 16,
    },
});

export default ErrorBoundary;
