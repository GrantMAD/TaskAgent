import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { userService } from '../services/userService';
import { supabase } from '../services/supabaseClient';
import { UserAvatar } from '../components/UserAvatar';
import { RatingStars } from '../components/RatingStars';
import { Colors, Spacing, Rounding, Shadow } from '../utils/theme';
import { FontAwesome } from '@expo/vector-icons';

export const ProfileScreen = ({ navigation }) => {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            const data = await userService.getUserProfile(session.user.id);
            setProfile(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) Alert.alert('Error', error.message);
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }
    
    if (!profile) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Profile not found</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
                <View style={styles.avatarWrapper}>
                    <UserAvatar user={profile} size={120} />
                </View>
                <Text style={styles.name}>{profile.name}</Text>
                <RatingStars rating={profile.rating || 5} />
                
                <View style={styles.statsContainer}>
                    <View style={styles.statBox}>
                        <Text style={styles.statNumber}>{profile.completed_tasks || 0}</Text>
                        <Text style={styles.statLabel}>COMPLETED</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statBox}>
                        <Text style={styles.statNumber}>{profile.rating?.toFixed(1) || '5.0'}</Text>
                        <Text style={styles.statLabel}>RATING</Text>
                    </View>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>About Me</Text>
                <View style={styles.card}>
                    <Text style={styles.bio}>{profile.bio || 'No bio provided.'}</Text>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Contact Information</Text>
                <View style={styles.card}>
                    <View style={styles.contactItem}>
                        <FontAwesome name="envelope" size={16} color={Colors.primary} style={styles.contactIcon} />
                        <Text style={styles.contactText}>{profile.email}</Text>
                    </View>
                    <View style={styles.contactDivider} />
                    <View style={styles.contactItem}>
                        <FontAwesome name="phone" size={16} color={Colors.primary} style={styles.contactIcon} />
                        <Text style={styles.contactText}>{profile.phone || 'No phone provided'}</Text>
                    </View>
                </View>
            </View>

            <View style={styles.actions}>
                <TouchableOpacity style={styles.primaryButton} onPress={() => Alert.alert('WIP')}>
                    <FontAwesome name="edit" size={18} color={Colors.white} style={styles.buttonIcon} />
                    <Text style={styles.primaryButtonText}>Edit Profile</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('TaskHistory')}>
                    <FontAwesome name="history" size={18} color={Colors.primary} style={styles.buttonIcon} />
                    <Text style={styles.secondaryButtonText}>Task History</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.secondaryButton} onPress={() => Alert.alert('WIP')}>
                    <FontAwesome name="star" size={18} color={Colors.primary} style={styles.buttonIcon} />
                    <Text style={styles.secondaryButtonText}>View Reviews</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <FontAwesome name="sign-out" size={18} color={Colors.error} style={styles.buttonIcon} />
                    <Text style={styles.logoutButtonText}>Sign Out</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.background,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.background,
    },
    emptyText: {
        color: Colors.textMuted,
        fontSize: 16,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 100, // Extra space for tab bar
    },
    header: {
        backgroundColor: Colors.primary,
        paddingTop: 60,
        paddingBottom: Spacing.xl,
        paddingHorizontal: Spacing.lg,
        alignItems: 'center',
        borderBottomLeftRadius: Rounding.soft,
        borderBottomRightRadius: Rounding.soft,
        ...Shadow.medium,
    },
    avatarWrapper: {
        borderWidth: 4,
        borderColor: Colors.white,
        borderRadius: 100,
        ...Shadow.subtle,
    },
    name: {
        fontSize: 26,
        fontWeight: '800',
        color: Colors.white,
        marginTop: Spacing.md,
        marginBottom: Spacing.xs,
        textAlign: 'center',
    },
    statsContainer: {
        flexDirection: 'row',
        backgroundColor: Colors.white,
        marginTop: Spacing.lg,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.xl,
        borderRadius: Rounding.standard,
        ...Shadow.subtle,
        width: '80%',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    statBox: {
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 20,
        fontWeight: '800',
        color: Colors.primary,
    },
    statLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: Colors.textMuted,
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        height: '80%',
        backgroundColor: Colors.border,
    },
    section: {
        padding: Spacing.lg,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.primary,
        marginBottom: Spacing.sm,
        marginLeft: 4,
    },
    card: {
        backgroundColor: Colors.white,
        padding: Spacing.md,
        borderRadius: Rounding.soft,
        ...Shadow.subtle,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    bio: {
        fontSize: 15,
        color: Colors.text,
        lineHeight: 22,
    },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
    },
    contactIcon: {
        width: 24,
        marginRight: Spacing.sm,
    },
    contactText: {
        fontSize: 15,
        color: Colors.text,
        fontWeight: '500',
    },
    contactDivider: {
        height: 1,
        backgroundColor: Colors.border,
        marginVertical: Spacing.sm,
    },
    actions: {
        padding: Spacing.lg,
        marginTop: Spacing.sm,
    },
    primaryButton: {
        backgroundColor: Colors.accent,
        flexDirection: 'row',
        padding: Spacing.md,
        borderRadius: Rounding.pill,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.md,
        ...Shadow.accent,
    },
    primaryButtonText: {
        color: Colors.white,
        fontWeight: '700',
        fontSize: 16,
    },
    secondaryButton: {
        backgroundColor: Colors.white,
        flexDirection: 'row',
        padding: Spacing.md,
        borderRadius: Rounding.pill,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: Colors.primary,
        marginBottom: Spacing.md,
    },
    secondaryButtonText: {
        color: Colors.primary,
        fontWeight: '700',
        fontSize: 16,
    },
    logoutButton: {
        backgroundColor: 'transparent',
        flexDirection: 'row',
        padding: Spacing.md,
        borderRadius: Rounding.pill,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: Colors.error,
        marginTop: Spacing.md,
    },
    logoutButtonText: {
        color: Colors.error,
        fontWeight: '700',
        fontSize: 16,
    },
    buttonIcon: {
        marginRight: 10,
    }
});
