import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Image, ScrollView } from 'react-native';
import { supabase } from '../services/supabaseClient';
import { Colors, Spacing, Rounding, Shadow } from '../utils/theme';
import { useToast } from '../components/ToastContext';

export const RegisterScreen = ({ navigation }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { showToast } = useToast();

    const handleRegister = async () => {
        if (loading) return;
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
                            placeholderTextColor={Colors.textMuted}
                            value={name}
                            onChangeText={setName}
                        />
                    </View>

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
                        <Text style={styles.label}>Phone Number</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="0400 000 000"
                            placeholderTextColor={Colors.textMuted}
                            value={phone}
                            onChangeText={setPhone}
                            keyboardType="phone-pad"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Password</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Create a password"
                            placeholderTextColor={Colors.textMuted}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                    </View>

                    <TouchableOpacity 
                        style={[styles.button, loading && styles.buttonDisabled]} 
                        onPress={handleRegister} 
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={Colors.white} />
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
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
        alignItems: 'center',
        marginTop: Spacing.xl,
    },
    footerLink: {
        color: Colors.accent,
        fontWeight: '700',
        fontSize: 14,
    }
});
