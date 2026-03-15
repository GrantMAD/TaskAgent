import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { useTheme } from '../components/ThemeContext';
import { Spacing, Rounding } from '../utils/theme';
import { FontAwesome } from '@expo/vector-icons';
import { useToast } from '../components/ToastContext';
import { useLocation } from '../components/LocationContext';
import { useAuth } from '../components/AuthContext';
import { userService } from '../services/userService';
import { supabase } from '../services/supabaseClient';

export const SettingsScreen = ({ navigation }) => {
    const { theme, isDarkMode, toggleTheme, shadows } = useTheme();
    const { user, userProfile, refreshProfile } = useAuth();
    const { searchRadius, updateSearchRadius } = useLocation();
    const { showToast } = useToast();
    const [updating, setUpdating] = useState(false);

    const styles = useMemo(() => createStyles(theme, shadows), [theme, shadows]);

    const handleThemeToggle = async (value) => {
        try {
            await toggleTheme();
            showToast(`Dark mode ${value ? 'enabled' : 'disabled'}`, 'info');
        } catch (error) {
            showToast('Failed to update preference', 'error');
        }
    };

    const handleNotificationToggle = async (key, value) => {
        if (!user) return;
        setUpdating(true);
        try {
            await userService.updateNotificationPreferences(user.id, { [key]: value });
            await refreshProfile();
            showToast('Preferences updated', 'success');
        } catch (error) {
            console.error(error);
            showToast('Failed to update notifications', 'error');
        } finally {
            setUpdating(false);
        }
    };

    const handleLogout = () => {
        Alert.alert(
            "Logout",
            "Are you sure you want to logout?",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Logout", 
                    style: "destructive",
                    onPress: async () => {
                        await supabase.auth.signOut();
                        navigation.reset({
                            index: 0,
                            routes: [{ name: 'Login' }],
                        });
                    }
                }
            ]
        );
    };

    const radiusOptions = [
        { label: '5km', value: 5 },
        { label: '10km', value: 10 },
        { label: '25km', value: 25 },
        { label: '50km', value: 50 },
        { label: 'All', value: 99999 },
    ];

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <FontAwesome name="chevron-left" size={20} color={theme.white} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Settings</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.sectionTitle}>Appearance</Text>
                
                <View style={styles.settingCard}>
                    <View style={styles.settingInfo}>
                        <View style={[styles.iconBox, { backgroundColor: isDarkMode ? '#555' : '#333' }]}>
                            <FontAwesome name="moon-o" size={18} color={theme.white} />
                        </View>
                        <View>
                            <Text style={styles.settingLabel}>Dark Mode</Text>
                            <Text style={styles.settingSublabel}>Adjust the app's appearance</Text>
                        </View>
                    </View>
                    <Switch
                        value={isDarkMode}
                        onValueChange={handleThemeToggle}
                        trackColor={{ false: theme.border, true: theme.accent }}
                        thumbColor={theme.white}
                    />
                </View>

                <Text style={styles.sectionTitle}>Notifications</Text>
                
                <View style={styles.settingCard}>
                    <View style={styles.settingInfo}>
                        <View style={[styles.iconBox, { backgroundColor: '#4A90E2' }]}>
                            <FontAwesome name="bell" size={18} color={theme.white} />
                        </View>
                        <View>
                            <Text style={styles.settingLabel}>Push Notifications</Text>
                            <Text style={styles.settingSublabel}>Receive alerts on your device</Text>
                        </View>
                    </View>
                    <Switch
                        value={userProfile?.push_notifications ?? true}
                        onValueChange={(val) => handleNotificationToggle('push_notifications', val)}
                        disabled={updating}
                        trackColor={{ false: theme.border, true: theme.accent }}
                        thumbColor={theme.white}
                    />
                </View>

                <View style={styles.settingCard}>
                    <View style={styles.settingInfo}>
                        <View style={[styles.iconBox, { backgroundColor: '#7ED321' }]}>
                            <FontAwesome name="refresh" size={18} color={theme.white} />
                        </View>
                        <View>
                            <Text style={styles.settingLabel}>Task Updates</Text>
                            <Text style={styles.settingSublabel}>Alerts about task status changes</Text>
                        </View>
                    </View>
                    <Switch
                        value={userProfile?.task_update_notifications ?? true}
                        onValueChange={(val) => handleNotificationToggle('task_update_notifications', val)}
                        disabled={updating}
                        trackColor={{ false: theme.border, true: theme.accent }}
                        thumbColor={theme.white}
                    />
                </View>

                <Text style={styles.sectionTitle}>Discovery</Text>

                <View style={[styles.settingCard, { flexDirection: 'column', alignItems: 'flex-start' }]}>
                    <View style={styles.settingInfo}>
                        <View style={[styles.iconBox, { backgroundColor: theme.accent }]}>
                            <FontAwesome name="map-marker" size={18} color={theme.white} />
                        </View>
                        <View>
                            <Text style={styles.settingLabel}>Job Search Distance</Text>
                            <Text style={styles.settingSublabel}>Show tasks within this radius</Text>
                        </View>
                    </View>
                    
                    <View style={styles.radiusSelector}>
                        {radiusOptions.map((opt) => (
                            <TouchableOpacity 
                                key={opt.value}
                                style={[
                                    styles.radiusButton,
                                    searchRadius === opt.value && styles.radiusButtonActive
                                ]}
                                onPress={() => updateSearchRadius(opt.value)}
                            >
                                <Text style={[
                                    styles.radiusText,
                                    searchRadius === opt.value && styles.radiusTextActive
                                ]}>
                                    {opt.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <Text style={styles.sectionTitle}>Account</Text>
                
                <TouchableOpacity 
                    style={styles.settingCard}
                    onPress={() => navigation.navigate('EditProfile')}
                >
                    <View style={styles.settingInfo}>
                        <View style={[styles.iconBox, { backgroundColor: theme.primary }]}>
                            <FontAwesome name="user" size={18} color={theme.white} />
                        </View>
                        <View>
                            <Text style={styles.settingLabel}>Profile Information</Text>
                            <Text style={styles.settingSublabel}>Edit your bio, skills, and photo</Text>
                        </View>
                    </View>
                    <FontAwesome name="chevron-right" size={14} color={theme.border} />
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.settingCard, { marginTop: Spacing.xl, borderColor: theme.error }]}
                    onPress={handleLogout}
                >
                    <View style={styles.settingInfo}>
                        <View style={[styles.iconBox, { backgroundColor: theme.error }]}>
                            <FontAwesome name="sign-out" size={18} color={theme.white} />
                        </View>
                        <View>
                            <Text style={[styles.settingLabel, { color: theme.error }]}>Log Out</Text>
                            <Text style={styles.settingSublabel}>Sign out of your account</Text>
                        </View>
                    </View>
                </TouchableOpacity>

                <View style={styles.footer}>
                    <Text style={styles.versionText}>Task Agent v1.0.0</Text>
                </View>
            </ScrollView>
        </View>
    );
};

const createStyles = (theme, shadows) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.background,
    },
    header: {
        backgroundColor: theme.primary,
        paddingTop: Spacing.lg,
        paddingBottom: Spacing.md,
        paddingHorizontal: Spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        ...shadows.medium,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: theme.white,
    },
    content: {
        padding: Spacing.lg,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: theme.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginTop: Spacing.lg,
        marginBottom: Spacing.md,
        marginLeft: 4,
    },
    settingCard: {
        flexDirection: 'row',
        backgroundColor: theme.card,
        padding: Spacing.md,
        borderRadius: Rounding.soft,
        marginBottom: Spacing.sm,
        alignItems: 'center',
        justifyContent: 'space-between',
        ...shadows.subtle,
        borderWidth: 1,
        borderColor: theme.border,
    },
    settingInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.md,
    },
    settingLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.text,
    },
    settingSublabel: {
        fontSize: 12,
        color: theme.textMuted,
        marginTop: 2,
    },
    footer: {
        marginTop: 40,
        alignItems: 'center',
    },
    versionText: {
        fontSize: 12,
        color: theme.textMuted,
        fontWeight: '600',
    },
    radiusSelector: {
        flexDirection: 'row',
        marginTop: Spacing.md,
        width: '100%',
        justifyContent: 'space-between',
        paddingTop: Spacing.sm,
        borderTopWidth: 1,
        borderTopColor: theme.border,
    },
    radiusButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: Rounding.pill,
        backgroundColor: theme.isDarkMode ? 'rgba(255,255,255,0.05)' : '#F0F0F0',
        borderWidth: 1,
        borderColor: theme.border,
    },
    radiusButtonActive: {
        backgroundColor: theme.accent,
        borderColor: theme.accent,
    },
    radiusText: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.textMuted,
    },
    radiusTextActive: {
        color: theme.white,
    }
});
