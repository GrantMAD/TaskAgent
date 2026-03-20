import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { userService } from '../services/userService';
import { messageService } from '../services/messageService';
import { supabase } from '../services/supabaseClient';
import { ProfileSkeleton } from '../components/skeletons/SkeletonPlaceholders';
import { Spacing, Rounding } from '../utils/theme';
import { useTheme } from '../components/ThemeContext';
import { FontAwesome } from '@expo/vector-icons';
import { UserAvatar } from '../components/UserAvatar';
import { useToast } from '../components/ToastContext';
import { useAuth } from '../components/AuthContext';
import { ReportModal } from '../components/ReportModal';
import { interactionService } from '../services/interactionService';

export const PublicProfileScreen = ({ route, navigation }) => {
    const { theme, shadows } = useTheme();
    const { session } = useAuth();
    const { userId } = route.params;
    const [profile, setProfile] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState(null);
    const { showToast } = useToast();
    const [reportModalVisible, setReportModalVisible] = useState(false);

    const styles = useMemo(() => createStyles(theme, shadows), [theme, shadows]);

    useEffect(() => {
        fetchProfileData();
        getCurrentUser();
        
        // Log profile view
        if (userId) {
            interactionService.logEvent('profile_view', session?.user?.id, userId);
        }
    }, [userId]);

    const getCurrentUser = () => {
        if (session) setCurrentUserId(session.user.id);
    };

    const formatJoinDate = (dateString) => {
        if (!dateString) return 'Neighbor';
        const date = new Date(dateString);
        return `Member since ${date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
    };

    const fetchProfileData = async () => {
        try {
            setLoading(true);
            const [userData, reviewData] = await Promise.all([
                userService.getUserProfile(userId),
                userService.getUserReviews(userId)
            ]);

            setProfile(userData);
            setReviews(reviewData);
        } catch (error) {
            console.error(error);
            showToast('Could not load profile', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleMessage = async () => {
        try {
            if (!currentUserId) {
                showToast('Please login to message neighbors', 'info');
                return;
            }

            if (currentUserId === userId) {
                showToast("You can't message yourself!", 'info');
                return;
            }

            // Note: Public profile messaging doesn't have a specific taskId context here
            // but the messageService can handle it or we could pass null
            const conv = await messageService.getOrCreateConversation(null, currentUserId, userId);
            
            // Navigate to Chat
            navigation.navigate('MainDrawer', {
                screen: 'Main',
                params: {
                    screen: 'MessagesTab',
                    params: {
                        screen: 'Chat',
                        params: { conversationId: conv.id }
                    }
                }
            });
        } catch (error) {
            console.error('Conversation Error:', error);
            showToast(error.message || 'Could not start conversation', 'error');
        }
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <LinearGradient
                    colors={[theme.primary, theme.secondary || '#1E40AF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.header}
                >
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <FontAwesome name="times" size={20} color={theme.white} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Profile</Text>
                    <View style={{ width: 40 }} />
                </LinearGradient>
                <ProfileSkeleton />
            </View>
        );
    }

    if (!profile) {
        return (
            <View style={styles.emptyContainer}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
                     <FontAwesome name="times" size={24} color={theme.primary} />
                </TouchableOpacity>
                <FontAwesome name="user-times" size={60} color={theme.textMuted} style={{ marginBottom: 20 }} />
                <Text style={[styles.emptyText, { fontSize: 20, fontWeight: '700', color: theme.primary }]}>Account no longer exists</Text>
                <Text style={[styles.emptyText, { marginTop: 10 }]}>This user has deleted their profile.</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[theme.primary, theme.secondary || '#1E40AF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <FontAwesome name="times" size={20} color={theme.white} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Profile</Text>
                <View style={styles.headerRight}>
                    {currentUserId && currentUserId !== userId && profile && (
                        <TouchableOpacity onPress={() => setReportModalVisible(true)} style={styles.headerAction}>
                            <FontAwesome name="flag" size={18} color={theme.white} />
                        </TouchableOpacity>
                    )}
                </View>
            </LinearGradient>

            <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                <LinearGradient
                    colors={[theme.primary, theme.secondary || '#1E40AF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.profileHero}
                >
                    <View style={styles.avatarContainer}>
                        {profile.profile_image ? (
                            <Image source={{ uri: profile.profile_image }} style={styles.profileImage} />
                        ) : (
                            <UserAvatar user={profile} size={100} />
                        )}
                    </View>
                    <Text style={styles.name}>{profile.name}</Text>
                    <Text style={styles.memberSince}>{formatJoinDate(profile.created_at)}</Text>
                    
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{profile.rating?.toFixed(1) || '0.0'}</Text>
                            <Text style={styles.statLabel}>Rating</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{profile.completed_tasks || 0}</Text>
                            <Text style={styles.statLabel}>Jobs Done</Text>
                        </View>
                    </View>

                    {currentUserId !== userId && (
                        <TouchableOpacity 
                            style={styles.messageButton}
                            onPress={handleMessage}
                        >
                            <FontAwesome name="envelope" size={16} color={theme.white} style={{ marginRight: 8 }} />
                            <Text style={styles.messageButtonText}>Message Neighbor</Text>
                        </TouchableOpacity>
                    )}
                </LinearGradient>

                <View style={styles.content}>
                    {/* Bio Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>About</Text>
                        <View style={styles.card}>
                            <Text style={styles.bioText}>
                                {profile.bio || `Hi, I'm ${profile.name.split(' ')[0]}! Looking forward to helping out in the neighborhood.`}
                            </Text>
                        </View>
                    </View>

                    {/* Skills Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Skills</Text>
                        <View style={styles.skillsContainer}>
                            {profile.skills && profile.skills.length > 0 ? (
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
                                        <TouchableOpacity onPress={() => navigation.push('PublicProfile', { userId: review.reviewer.id })}>
                                            <UserAvatar user={review.reviewer} size={30} />
                                        </TouchableOpacity>
                                        <View style={styles.reviewInfo}>
                                            <TouchableOpacity onPress={() => navigation.push('PublicProfile', { userId: review.reviewer.id })}>
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

            <ReportModal 
                visible={reportModalVisible}
                onClose={() => setReportModalVisible(false)}
                reportedUserId={userId}
                type="user"
            />
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
        paddingTop: Platform.OS === 'ios' ? 50 : 20,
        paddingBottom: Spacing.md,
        paddingHorizontal: Spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        ...shadows.medium,
        zIndex: 10,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: theme.white,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        width: 40,
        justifyContent: 'flex-end',
    },
    headerAction: {
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.background,
    },
    closeBtn: {
        position: 'absolute',
        top: 50,
        right: 20,
        padding: 10,
    },
    emptyText: {
        color: theme.textMuted,
        fontSize: 16,
    },
    scrollContainer: {
        flex: 1,
    },
    profileHero: {
        backgroundColor: theme.primary,
        alignItems: 'center',
        paddingTop: Spacing.xl,
        paddingBottom: Spacing.xl,
        borderBottomLeftRadius: Rounding.soft,
        borderBottomRightRadius: Rounding.soft,
        ...shadows.medium,
    },
    avatarContainer: {
        marginTop: Spacing.md,
        marginBottom: Spacing.sm,
    },
    profileImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 3,
        borderColor: theme.white,
    },
    name: {
        fontSize: 24,
        fontWeight: '800',
        color: theme.white,
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
    messageButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.accent,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: Rounding.pill,
        marginTop: Spacing.lg,
        ...shadows.subtle,
    },
    messageButtonText: {
        color: theme.white,
        fontWeight: '700',
        fontSize: 14,
    },
    content: {
        padding: Spacing.lg,
        paddingBottom: 50,
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
    }
});
