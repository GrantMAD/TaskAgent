import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { supabase } from '../services/supabaseClient';
import { Colors, Spacing, Rounding, Shadow } from '../utils/theme';
import { useToast } from '../components/ToastContext';

export const LoginScreen = ({ navigation }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { showToast } = useToast();

    const handleLogin = async () => {
        if (loading) return;
        setLoading(true);
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        setLoading(false);
        if (error) {
            console.error('Login error details:', error);
            showToast(error.message, 'error');
        } else {
            console.log('Login success:', data.session ? 'Session established' : 'No session');
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

                <View style={styles.card}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Email Address</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="neighbor@example.com"
                            placeholderTextColor={Colors.textMuted}
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Password</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Your secret password"
                            placeholderTextColor={Colors.textMuted}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                    </View>

                    <TouchableOpacity 
                        style={[styles.button, loading && styles.buttonDisabled]} 
                        onPress={handleLogin} 
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={Colors.white} />
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
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
        color: Colors.primary,
        marginBottom: Spacing.xs,
    },
    subtitle: {
        fontSize: 16,
        color: Colors.textMuted,
        fontWeight: '500',
    },
    card: {
        backgroundColor: Colors.white,
        padding: Spacing.xl,
        borderRadius: Rounding.soft,
        ...Shadow.medium,
    },
    inputGroup: {
        marginBottom: Spacing.md,
    },
    label: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: Spacing.xs,
        marginLeft: 4,
    },
    input: {
        borderWidth: 1.5,
        borderColor: Colors.border,
        padding: Spacing.md,
        borderRadius: Rounding.standard,
        fontSize: 16,
        color: Colors.text,
        backgroundColor: '#FAFBFA',
    },
    button: {
        backgroundColor: Colors.primary,
        padding: Spacing.md,
        borderRadius: Rounding.pill,
        alignItems: 'center',
        marginTop: Spacing.lg,
        ...Shadow.accent,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: Colors.white,
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
        color: Colors.accent,
        fontWeight: '700',
        fontSize: 14,
    },
    footerLinkMuted: {
        color: Colors.textMuted,
        fontWeight: '600',
        fontSize: 14,
    }
});
