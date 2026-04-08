import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Image } from 'expo-image';
import { supabase } from '../services/supabaseClient';
import { Spacing, Rounding } from '../utils/theme';
import { useTheme } from '../components/ThemeContext';
import { useToast } from '../components/ToastContext';
import { FontAwesome } from '@expo/vector-icons';
import { validateEmail, validatePassword, getMissingFields } from '../utils/validation';
import { useAuth } from '../components/AuthContext';

export const LoginScreen = ({ navigation }) => {
    const { theme, shadows } = useTheme();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const { showToast } = useToast();
    const { authError, setAuthError } = useAuth();

    const styles = useMemo(() => createStyles(theme, shadows), [theme, shadows]);

    const handleLogin = async () => {
        if (loading) return;

        // Validation
        const missing = getMissingFields({ Email: email, Password: password });
        if (missing) {
            showToast(`${missing} is required`, 'warning');
            return;
        }

        if (!validateEmail(email)) {
            showToast('Please enter a valid email address', 'warning');
            return;
        }

        if (!validatePassword(password)) {
            showToast('Password must be at least 6 characters', 'warning');
            return;
        }

        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        setLoading(false);
        if (error) {
            console.error('Login error details:', error);
            showToast(error.message, 'error');
        }
    };

    return (
        <KeyboardAvoidingView 
            style={styles.container} 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={styles.content}>
                <View style={styles.header}>
                    <Image 
                        source={require('../../assets/images/TaskLogo.png')} 
                        style={styles.logo}
                        resizeMode="contain"
                    />
                    <Text style={styles.title}>Welcome Back</Text>
                    <Text style={styles.subtitle}>Sign in to join the community</Text>
                </View>

                {authError && (
                    <View style={[styles.errorBox, { backgroundColor: theme.error + '10', borderColor: theme.error }]}>
                        <FontAwesome name="exclamation-triangle" size={16} color={theme.error} style={{ marginRight: 10 }} />
                        <Text style={[styles.errorText, { color: theme.error }]}>{authError}</Text>
                        <TouchableOpacity onPress={() => setAuthError(null)} style={{ marginLeft: 10 }}>
                            <FontAwesome name="times-circle" size={16} color={theme.error} />
                        </TouchableOpacity>
                    </View>
                )}

                <View style={styles.card}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Email Address</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="neighbor@example.com"
                            placeholderTextColor={theme.textMuted}
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Password</Text>
                        <View style={styles.passwordContainer}>
                            <TextInput
                                style={styles.passwordInput}
                                placeholder="Your secret password"
                                placeholderTextColor={theme.textMuted}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                            />
                            <TouchableOpacity 
                                style={styles.eyeIcon} 
                                onPress={() => setShowPassword(!showPassword)}
                            >
                                <FontAwesome 
                                    name={showPassword ? "eye" : "eye-slash"} 
                                    size={20} 
                                    color={theme.textMuted} 
                                />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <TouchableOpacity 
                        style={[styles.button, loading && styles.buttonDisabled]} 
                        onPress={handleLogin} 
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={theme.white} />
                        ) : (
                            <Text style={styles.buttonText}>Sign In</Text>
                        )}
                    </TouchableOpacity>

                    <View style={styles.footer}>
                        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                            <Text style={styles.footerLink}>New here? Join us</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => showToast('This feature is coming soon!', 'info')}>
                            <Text style={styles.footerLinkMuted}>Forgot Password?</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
};

const createStyles = (theme, shadows) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.background,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        padding: Spacing.lg,
    },
    header: {
        marginBottom: Spacing.xl,
        alignItems: 'center',
    },
    logo: {
        width: 120,
        height: 120,
        marginBottom: Spacing.md,
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        color: theme.primary,
        marginBottom: Spacing.xs,
    },
    subtitle: {
        fontSize: 16,
        color: theme.textMuted,
        fontWeight: '500',
    },
    card: {
        backgroundColor: theme.card,
        padding: Spacing.xl,
        borderRadius: Rounding.soft,
        ...shadows.medium,
        borderWidth: theme.isDarkMode ? 1 : 0,
        borderColor: theme.border,
    },
    inputGroup: {
        marginBottom: Spacing.md,
    },
    label: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.text,
        marginBottom: Spacing.xs,
        marginLeft: 4,
    },
    input: {
        borderWidth: 1.5,
        borderColor: theme.border,
        padding: Spacing.md,
        borderRadius: Rounding.standard,
        fontSize: 16,
        color: theme.text,
        backgroundColor: theme.input,
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: theme.border,
        borderRadius: Rounding.standard,
        backgroundColor: theme.input,
        overflow: 'hidden',
    },
    passwordInput: {
        flex: 1,
        padding: Spacing.md,
        fontSize: 16,
        color: theme.text,
    },
    eyeIcon: {
        paddingHorizontal: Spacing.md,
        height: '100%',
        justifyContent: 'center',
    },
    button: {
        backgroundColor: theme.primary,
        padding: Spacing.md,
        borderRadius: Rounding.pill,
        alignItems: 'center',
        marginTop: Spacing.lg,
        ...shadows.accent,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: theme.white,
        fontSize: 18,
        fontWeight: '700',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: Spacing.xl,
        paddingTop: Spacing.md,
    },
    footerLink: {
        color: theme.accent,
        fontWeight: '700',
        fontSize: 14,
    },
    footerLinkMuted: {
        color: theme.textMuted,
        fontWeight: '600',
        fontSize: 14,
    },
    errorBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: Spacing.md,
        borderRadius: Rounding.standard,
        borderWidth: 1,
        marginBottom: Spacing.lg,
    },
    errorText: {
        flex: 1,
        fontSize: 13,
        fontWeight: '700',
    }
});
