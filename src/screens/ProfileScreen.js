import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { userService } from '../services/userService';
import { FontAwesome } from '@expo/vector-icons';
import { supabase } from '../services/supabaseClient';
import { ProfileSkeleton } from '../components/skeletons/SkeletonPlaceholders';
import { Spacing, Rounding } from '../utils/theme';
import { useTheme } from '../components/ThemeContext';
import { UserAvatar } from '../components/UserAvatar';
import { useToast } from '../components/ToastContext';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../components/AuthContext';

export const ProfileScreen = ({ navigation }) => {
    const { theme, shadows } = useTheme();
    const { session } = useAuth();
    const [profile, setProfile] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const { showToast } = useToast();

    const styles = useMemo(() => createStyles(theme, shadows), [theme, shadows]);

    useFocusEffect(
        React.useCallback(() => {
            fetchProfileData();
        }, [])
    );

    const fetchProfileData = async (isRefreshing = false) => {
        if (isRefreshing) setRefreshing(true);
        try {
            if (!session) return;

            const [userData, reviewData] = await Promise.all([
                userService.getUserProfile(session.user.id),
                userService.getUserReviews(session.user.id)
            ]);

            setProfile(userData);
            setReviews(reviewData);
        } catch (error) {
            console.error(error);
            showToast('Could not load profile', 'error');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        fetchProfileData(true);
    };

    const formatJoinDate = (dateString) => {
        if (!dateString) return 'Neighbor';
        const date = new Date(dateString);
        return `Member since ${date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
    };

    if (loading && !refreshing) {
        return <ProfileSkeleton />;
    }

    return (
        <ScrollView 
            style={styles.container} 
            showsVerticalScrollIndicator={false}
            refreshControl={
                <RefreshControl 
                    refreshing={refreshing} 
                    onRefresh={onRefresh} 
                    colors={[theme.accent]} 
                    tintColor={theme.accent}
                />
            }
        >
            <LinearGradient
                colors={[theme.primary, theme.secondary || '#1E40AF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <View style={styles.profileHeader}>
                    {profile?.profile_image ? (
                        <Image source={{ uri: profile.profile_image }} style={styles.profileImage} />
                    ) : (
                        <UserAvatar user={profile} size={100} />
                    )}
                    <Text style={styles.name}>{profile?.name}</Text>
                    <Text style={styles.phone}>{profile?.phone}</Text>
                    <Text style={styles.memberSince}>{formatJoinDate(profile?.created_at)}</Text>
                    
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{profile?.rating?.toFixed(1) || '0.0'}</Text>
                            <Text style={styles.statLabel}>Rating</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{profile?.completed_tasks || 0}</Text>
                            <Text style={styles.statLabel}>Jobs Done</Text>
                        </View>
                    </View>

                    <View style={styles.buttonRow}>
                        <TouchableOpacity 
                            style={styles.editButton}
                            onPress={() => navigation.navigate('EditProfile')}
                        >
                            <FontAwesome name="edit" size={16} color={theme.white} style={{ marginRight: 8 }} />
                            <Text style={styles.editButtonText}>Edit Profile</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={styles.savedButton}
                            onPress={() => navigation.navigate('SavedTasks')}
                        >
                            <FontAwesome name="heart" size={16} color={theme.white} style={{ marginRight: 8 }} />
                            <Text style={styles.savedButtonText}>Saved Tasks</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </LinearGradient>

            <View style={styles.content}>
                {/* Bio Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>About Me</Text>
                    <View style={styles.card}>
                        <Text style={styles.bioText}>
                            {profile?.bio || "No bio added yet. Tell your neighbors about yourself!"}
                        </Text>
                    </View>
                </View>

                {/* Skills Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Skills</Text>
                    <View style={styles.skillsContainer}>
                        {profile?.skills && profile.skills.length > 0 ? (
                            profile.skills.map((skill, index) => (
                                <View key={index} style={styles.skillBadge}>
                                    <Text style={styles.skillText}>{skill}</Text>
                                </View>
                            ))
                        ) : (
                            <Text style={styles.emptyText}>No skills listed yet.</Text>
                        )}
                    </View>
                </View>

                {/* Reviews Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Reviews ({reviews.length})</Text>
                    {reviews.length > 0 ? (
                        reviews.map((review) => (
                            <View key={review.id} style={styles.reviewCard}>
                                <View style={styles.reviewHeader}>
                                    <TouchableOpacity onPress={() => navigation.navigate('PublicProfile', { userId: review.reviewer.id })}>
                                        <UserAvatar user={review.reviewer} size={30} />
                                    </TouchableOpacity>
                                    <View style={styles.reviewInfo}>
                                        <TouchableOpacity onPress={() => navigation.navigate('PublicProfile', { userId: review.reviewer.id })}>
                                            <Text style={styles.reviewerName}>{review.reviewer.name}</Text>
                                        </TouchableOpacity>
                                        <View style={styles.ratingRow}>
                                            {[1, 2, 3, 4, 5].map((s) => (
                                                <FontAwesome 
                                                    key={s} 
                                                    name={s <= review.rating ? "star" : "star-o"} 
                                                    size={12} 
                                                    color={theme.accent} 
                                                />
                                            ))}
                                        </View>
                                    </View>
                                    <Text style={styles.reviewDate}>{new Date(review.created_at).toLocaleDateString()}</Text>
                                </View>
                                <Text style={styles.reviewComment}>{review.comment}</Text>
                            </View>
                        ))
                    ) : (
                        <View style={styles.card}>
                            <Text style={styles.emptyText}>No reviews yet.</Text>
                        </View>
                    )}
                </View>
            </View>
        </ScrollView>
    );
};

const createStyles = (theme, shadows) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.background,
    },
    header: {
        backgroundColor: theme.primary,
        paddingBottom: Spacing.xl,
        borderBottomLeftRadius: Rounding.soft,
        borderBottomRightRadius: Rounding.soft,
        ...shadows.medium,
    },
    profileHeader: {
        alignItems: 'center',
        paddingTop: Spacing.lg,
    },
    profileImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 3,
        borderColor: theme.white,
        marginBottom: Spacing.md,
    },
    name: {
        fontSize: 24,
        fontWeight: '800',
        color: theme.white,
    },
    phone: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.7)',
        marginTop: 4,
    },
    memberSince: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 4,
        fontWeight: '600',
    },
    statsRow: {
        flexDirection: 'row',
        marginTop: Spacing.lg,
        alignItems: 'center',
        width: '80%',
        justifyContent: 'space-around',
        backgroundColor: 'rgba(255,255,255,0.1)',
        padding: Spacing.md,
        borderRadius: Rounding.standard,
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 20,
        fontWeight: '800',
        color: theme.white,
    },
    statLabel: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.6)',
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        height: 30,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    buttonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        paddingHorizontal: Spacing.lg,
    },
    editButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.accent,
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: Rounding.pill,
        marginTop: Spacing.lg,
        marginRight: 8,
        ...shadows.subtle,
    },
    savedButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: Rounding.pill,
        marginTop: Spacing.lg,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
        ...shadows.subtle,
    },
    editButtonText: {
        color: theme.white,
        fontWeight: '700',
        fontSize: 14,
    },
    savedButtonText: {
        color: theme.white,
        fontWeight: '700',
        fontSize: 14,
    },
    content: {
        padding: Spacing.lg,
        paddingBottom: 100,
    },
    section: {
        marginBottom: Spacing.xl,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.primary,
        marginBottom: Spacing.md,
        marginLeft: 4,
    },
    card: {
        backgroundColor: theme.card,
        padding: Spacing.md,
        borderRadius: Rounding.soft,
        ...shadows.subtle,
        borderWidth: 1,
        borderColor: theme.border,
    },
    bioText: {
        fontSize: 15,
        color: theme.text,
        lineHeight: 22,
    },
    skillsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    skillBadge: {
        backgroundColor: theme.isDarkMode ? 'rgba(255,255,255,0.05)' : '#E8EFF4',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: Rounding.pill,
        marginRight: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: theme.border,
    },
    skillText: {
        color: theme.primary,
        fontWeight: '700',
        fontSize: 13,
    },
    reviewCard: {
        backgroundColor: theme.card,
        padding: Spacing.md,
        borderRadius: Rounding.soft,
        marginBottom: Spacing.md,
        ...shadows.subtle,
        borderWidth: 1,
        borderColor: theme.border,
    },
    reviewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    reviewInfo: {
        flex: 1,
        marginLeft: Spacing.sm,
    },
    reviewerName: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.primary,
    },
    ratingRow: {
        flexDirection: 'row',
        marginTop: 2,
    },
    reviewDate: {
        fontSize: 12,
        color: theme.textMuted,
    },
    reviewComment: {
        fontSize: 14,
        color: theme.text,
        lineHeight: 20,
    },
    emptyText: {
        color: theme.textMuted,
        fontSize: 14,
        fontStyle: 'italic',
    }
});
