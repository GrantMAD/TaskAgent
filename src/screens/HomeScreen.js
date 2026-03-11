import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { taskService } from '../services/taskService';
import { TaskCard } from '../components/TaskCard';
import { Skeleton } from '../components/skeletons/Skeleton';
import { TaskCardSkeleton } from '../components/skeletons/SkeletonPlaceholders';
import { Spacing, Rounding } from '../utils/theme';
import { useTheme } from '../components/ThemeContext';
import { supabase } from '../services/supabaseClient';
import { FontAwesome } from '@expo/vector-icons';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const HomeScreen = ({ navigation }) => {
    const { theme, shadows } = useTheme();
    const [myGigs, setMyGigs] = useState([]);
    const [myPostedTasks, setMyPostedTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [profile, setProfile] = useState(null);

    const styles = useMemo(() => createStyles(theme, shadows), [theme, shadows]);

    useEffect(() => {
        fetchAllData();
        checkLocationPermission();
    }, []);

    const checkLocationPermission = async () => {
        try {
            const hasSeenPrompt = await AsyncStorage.getItem('hasSeenLocationPrompt');
            if (hasSeenPrompt) return;

            const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
            
            if (existingStatus !== 'granted') {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') {
                    console.log('Location permission granted');
                }
            }
            
            await AsyncStorage.setItem('hasSeenLocationPrompt', 'true');
        } catch (error) {
            console.error('Error checking location permission:', error);
        }
    };

    const fetchAllData = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session) {
                // Fetch Profile for stats
                const { data: userData } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();
                setProfile(userData);

                // 1. Get Tasks I'm Hired For (Worker Role)
                const gigsData = await taskService.getMyAssignedTasks(session.user.id);
                setMyGigs(gigsData);

                // 2. Get Tasks I Created (Poster Role)
                const postedData = await taskService.getMyPostedTasks(session.user.id);
                setMyPostedTasks(postedData);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchAllData();
    };

    return (
        <ScrollView 
            style={styles.container} 
            showsVerticalScrollIndicator={false}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />
            }
        >
            <View style={styles.welcomeSection}>
                <View style={styles.welcomeHeader}>
                    {loading ? (
                        <Skeleton width={150} height={28} />
                    ) : (
                        <Text style={styles.welcomeText}>Hello, {profile?.name?.split(' ')[0] || 'Neighbor'}</Text>
                    )}
                </View>
                <Text style={styles.subtitleText}>Your neighborhood task hub</Text>
                
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        {loading ? (
                            <Skeleton width={30} height={20} style={{ marginBottom: 4 }} />
                        ) : (
                            <Text style={styles.statNumber}>{profile?.completed_tasks || 0}</Text>
                        )}
                        <Text style={styles.statLabel}>Jobs Done</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        {loading ? (
                            <Skeleton width={30} height={20} style={{ marginBottom: 4 }} />
                        ) : (
                            <Text style={styles.statNumber}>{profile?.rating?.toFixed(1) || '5.0'}</Text>
                        )}
                        <Text style={styles.statLabel}>Rating</Text>
                    </View>
                </View>
            </View>

            {loading ? (
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Skeleton width={120} height={20} />
                    </View>
                    <TaskCardSkeleton />
                    <TaskCardSkeleton />
                </View>
            ) : (
                <>
                    {/* In Progress Sections */}
                    {(myPostedTasks.length > 0 || myGigs.length > 0) ? (
                        <>
                            {myPostedTasks.length > 0 && (
                                <View style={styles.section}>
                                    <View style={styles.sectionHeader}>
                                        <Text style={styles.sectionTitle}>My Active Postings</Text>
                                    </View>
                                    {myPostedTasks.map((item) => (
                                        <TaskCard
                                            key={item.id}
                                            task={item}
                                            onPress={() => navigation.navigate('TaskDetail', { taskId: item.id })}
                                        />
                                    ))}
                                </View>
                            )}

                            {myGigs.length > 0 && (
                                <View style={styles.section}>
                                    <View style={styles.sectionHeader}>
                                        <Text style={styles.sectionTitle}>Jobs In Progress</Text>
                                    </View>
                                    {myGigs.map((item) => (
                                        <TaskCard
                                            key={item.id}
                                            task={item}
                                            onPress={() => navigation.navigate('TaskDetail', { taskId: item.id })}
                                        />
                                    ))}
                                </View>
                            )}
                        </>
                    ) : (
                        <View style={styles.emptyHub}>
                            <FontAwesome name="calendar-check-o" size={50} color={theme.border} />
                            <Text style={styles.emptyHubText}>No active tasks right now.</Text>
                            <TouchableOpacity 
                                style={styles.browseButton}
                                onPress={() => navigation.navigate('TasksTab')}
                            >
                                <Text style={styles.browseButtonText}>Browse Local Jobs</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </>
            )}

            {/* Quick Tips Section */}
            <View style={styles.tipsSection}>
                <Text style={styles.sectionTitleAlt}>Neighborhood Tips</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tipsScroll}>
                    <View style={styles.tipCard}>
                        <FontAwesome name="shield" size={24} color={theme.accent} />
                        <Text style={styles.tipTitle}>Stay Safe</Text>
                        <Text style={styles.tipDesc}>Always meet in public places for the first time.</Text>
                    </View>
                    <View style={styles.tipCard}>
                        <FontAwesome name="star" size={24} color={theme.accent} />
                        <Text style={styles.tipTitle}>Build Trust</Text>
                        <Text style={styles.tipDesc}>Complete tasks on time to earn 5-star reviews.</Text>
                    </View>
                    <View style={styles.tipCard}>
                        <FontAwesome name="comments" size={24} color={theme.accent} />
                        <Text style={styles.tipTitle}>Communicate</Text>
                        <Text style={styles.tipDesc}>Keep neighbors updated through the chat.</Text>
                    </View>
                </ScrollView>
            </View>
        </ScrollView>
    );
};

const createStyles = (theme, shadows) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.background,
    },
    welcomeSection: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.xl,
        paddingTop: Spacing.lg,
        backgroundColor: theme.primary,
        borderBottomLeftRadius: Rounding.soft,
        borderBottomRightRadius: Rounding.soft,
        marginBottom: Spacing.md,
        ...shadows.medium,
    },
    welcomeText: {
        fontSize: 28,
        fontWeight: '800',
        color: theme.white,
    },
    subtitleText: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.8)',
        marginTop: 4,
    },
    statsRow: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.1)',
        marginTop: Spacing.lg,
        padding: Spacing.md,
        borderRadius: Rounding.standard,
        alignItems: 'center',
        justifyContent: 'space-around',
    },
    statItem: {
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 20,
        fontWeight: '800',
        color: theme.white,
    },
    statLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.6)',
        textTransform: 'uppercase',
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        height: 30,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    section: {
        marginBottom: Spacing.md,
    },
    sectionHeader: {
        paddingHorizontal: Spacing.lg,
        marginTop: Spacing.md,
        marginBottom: Spacing.sm,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: theme.primary,
    },
    sectionTitleAlt: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.primary,
        marginHorizontal: Spacing.lg,
        marginBottom: Spacing.md,
    },
    emptyHub: {
        padding: 60,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyHubText: {
        color: theme.textMuted,
        fontSize: 16,
        marginTop: Spacing.md,
        marginBottom: Spacing.lg,
    },
    browseButton: {
        backgroundColor: theme.surface,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: Rounding.pill,
        borderWidth: 2,
        borderColor: theme.primary,
    },
    browseButtonText: {
        color: theme.primary,
        fontWeight: '700',
        fontSize: 14,
    },
    tipsSection: {
        marginTop: Spacing.md,
        paddingBottom: 120,
    },
    tipsScroll: {
        paddingLeft: Spacing.lg,
        paddingRight: Spacing.md,
    },
    tipCard: {
        backgroundColor: theme.card,
        width: 200,
        padding: Spacing.md,
        borderRadius: Rounding.soft,
        marginRight: Spacing.md,
        ...shadows.subtle,
        borderWidth: 1,
        borderColor: theme.border,
    },
    tipTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.primary,
        marginTop: Spacing.sm,
    },
    tipDesc: {
        fontSize: 12,
        color: theme.textMuted,
        marginTop: 4,
        lineHeight: 18,
    }
});
