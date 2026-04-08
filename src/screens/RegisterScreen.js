import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { supabase } from '../services/supabaseClient';
import { Spacing, Rounding } from '../utils/theme';
import { useTheme } from '../components/ThemeContext';
import { useToast } from '../components/ToastContext';
import { FontAwesome } from '@expo/vector-icons';
import { validateEmail, validatePassword, validatePhone, getMissingFields } from '../utils/validation';

export const RegisterScreen = ({ navigation }) => {
    const { theme, shadows } = useTheme();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const { showToast } = useToast();

    const styles = useMemo(() => createStyles(theme, shadows), [theme, shadows]);

    const handleRegister = async () => {
        if (loading) return;

        // Validation
        const missing = getMissingFields({ 
            Name: name, 
            Email: email, 
            Phone: phone, 
            Password: password 
        });
        
        if (missing) {
            showToast(`${missing} is required`, 'warning');
            return;
        }

        if (!validateEmail(email)) {
            showToast('Please enter a valid email address', 'warning');
            return;
        }

        if (!validatePhone(phone)) {
            showToast('Please enter a valid phone number', 'warning');
            return;
        }

        if (!validatePassword(password)) {
            showToast('Password must be at least 6 characters', 'warning');
            return;
        }

        setLoading(true);
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    name,
                    phone,
                }
            }
        });

        setLoading(false);
        if (error) {
            showToast(error.message, 'error');
            return;
        }

        if (data.user) {
            if (data.session) {
                showToast('Welcome to the community!', 'success');
            } else {
                showToast('Check your email for a confirmation link.', 'success');
                navigation.navigate('Login');
            }
        }
    };

    return (
        <KeyboardAvoidingView 
            style={styles.container} 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <Image 
                        source={require('../../assets/images/TaskLogo.png')} 
                        style={styles.logo}
                        resizeMode="contain"
                    />
                    <Text style={styles.title}>Join Us</Text>
                    <Text style={styles.subtitle}>Create an account to get started</Text>
                </View>

                <View style={styles.card}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Full Name</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="John Doe"
                            placeholderTextColor={theme.textMuted}
                            value={name}
                            onChangeText={setName}
                        />
                    </View>

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
                        <Text style={styles.label}>Phone Number</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="0400 000 000"
                            placeholderTextColor={theme.textMuted}
                            value={phone}
                            onChangeText={setPhone}
                            keyboardType="phone-pad"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Password</Text>
                        <View style={styles.passwordContainer}>
                            <TextInput
                                style={styles.passwordInput}
                                placeholder="Create a password"
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
                        onPress={handleRegister} 
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={theme.white} />
                        ) : (
                            <Text style={styles.buttonText}>Create Account</Text>
                        )}
                    </TouchableOpacity>

                    <View style={styles.footer}>
                        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                            <Text style={styles.footerLink}>Already have an account? Sign In</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const createStyles = (theme, shadows) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.background,
    },
    scrollContent: {
        padding: Spacing.lg,
        paddingBottom: Spacing.xl,
        justifyContent: 'center',
        flexGrow: 1,
    },
    header: {
        marginBottom: Spacing.xl,
        alignItems: 'center',
    },
    logo: {
        width: 100,
        height: 100,
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
        alignItems: 'center',
        marginTop: Spacing.xl,
    },
    footerLink: {
        color: theme.accent,
        fontWeight: '700',
        fontSize: 14,
    }
});
