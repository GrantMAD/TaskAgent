import React, { useEffect, useState, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { taskService } from '../services/taskService';
import { TaskCard } from '../components/TaskCard';
import { Skeleton } from '../components/skeletons/Skeleton';
import { TaskCardSkeleton } from '../components/skeletons/SkeletonPlaceholders';
import { Spacing, Rounding } from '../utils/theme';
import { supabase } from '../services/supabaseClient';
import { NEIGHBORHOOD_TIPS } from '../utils/constants';
import { FontAwesome } from '@expo/vector-icons';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../components/AuthContext';
import { useTheme } from '../components/ThemeContext';
import { EmptyState } from '../components/EmptyState';

export const HomeScreen = ({ navigation }) => {
    const { theme, shadows } = useTheme();
    const { session } = useAuth();
    const [myGigs, setMyGigs] = useState([]);
    const [myPostedTasks, setMyPostedTasks] = useState([]);
    const [appliedTasks, setAppliedTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [profile, setProfile] = useState(null);
    const [rotatedTips, setRotatedTips] = useState([]);
    
    // Refs to track current lists for the realtime listener without causing loops
    const myPostedTasksRef = useRef([]);
    const myGigsRef = useRef([]);
    const appliedTasksRef = useRef([]);
    
    useEffect(() => {
        myPostedTasksRef.current = myPostedTasks;
    }, [myPostedTasks]);

    useEffect(() => {
        myGigsRef.current = myGigs;
    }, [myGigs]);

    useEffect(() => {
        appliedTasksRef.current = appliedTasks;
    }, [appliedTasks]);

    const styles = useMemo(() => createStyles(theme, shadows), [theme, shadows]);

    useEffect(() => {
        checkLocationPermission();
        rotateTips();
    }, [session]);

    useEffect(() => {
        fetchAllData();

        // Subscribe to real-time task updates
        let subscription;
        let appSubscription;
        
        const setupSubscriptions = async () => {
            if (session) {
                const userId = session.user.id;
                
                // 1. Task Table Subscription
                subscription = taskService.subscribeToTasks('home_tasks_channel', (payload) => {
                    const { new: newRecord, old: oldRecord } = payload;
                    const changedId = newRecord?.id || oldRecord?.id;
                    
                    const isRelevant = (
                        newRecord?.poster_id === userId || 
                        newRecord?.assigned_worker_id === userId ||
                        oldRecord?.poster_id === userId || 
                        oldRecord?.assigned_worker_id === userId ||
                        myPostedTasksRef.current.some(t => t.id === changedId) ||
                        myGigsRef.current.some(t => t.id === changedId) ||
                        appliedTasksRef.current.some(t => t.id === changedId) ||
                        !newRecord
                    );

                    if (isRelevant) {
                        fetchAllData();
                    }
                });

                // 2. Task Applications Table Subscription
                appSubscription = supabase
                    .channel('home_applications_channel')
                    .on('postgres_changes', {
                        event: '*',
                        schema: 'public',
                        table: 'task_applications'
                    }, (payload) => {
                        const { new: newRecord, old: oldRecord } = payload;
                        if (newRecord?.worker_id === userId || oldRecord?.worker_id === userId) {
                            fetchAllData();
                        }
                    })
                    .subscribe();
            }
        };

        setupSubscriptions();

        return () => {
            if (subscription) supabase.removeChannel(subscription);
            if (appSubscription) supabase.removeChannel(appSubscription);
        };
    }, [session]); 

    // Reliable fallback: refresh when the screen comes into focus
    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            fetchAllData();
        });
        return unsubscribe;
    }, [navigation]);

    const checkLocationPermission = async () => {
        try {
            const hasSeenPrompt = await AsyncStorage.getItem('hasSeenLocationPrompt');
            if (hasSeenPrompt) return;

            const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
            
            if (existingStatus !== 'granted') {
                await Location.requestForegroundPermissionsAsync();
            }
            
            await AsyncStorage.setItem('hasSeenLocationPrompt', 'true');
        } catch (error) {
            console.error('Error checking location permission:', error);
        }
    };

    const rotateTips = () => {
        // Shuffle the tips and pick first 4
        const shuffled = [...NEIGHBORHOOD_TIPS].sort(() => 0.5 - Math.random());
        setRotatedTips(shuffled.slice(0, 4));
    };

    const fetchAllData = async () => {
        try {
            // Process recurring tasks to generate any due instances
            if (session?.user?.id) {
                await taskService.processRecurringTasks(session.user.id);
            }

            if (session) {
                // Fetch Profile for stats
                const { data: userData } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();
                setProfile(userData);

                // Fetch all task lists in parallel
                const [gigsData, postedData, appliedData] = await Promise.all([
                    taskService.getMyAssignedTasks(session.user.id),
                    taskService.getMyPostedTasks(session.user.id),
                    taskService.getAppliedTasks(session.user.id)
                ]);

                setMyGigs(gigsData);
                setMyPostedTasks(postedData);
                setAppliedTasks(appliedData);
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
        rotateTips(); // Manually rotate on pull-to-refresh
    };

    return (
        <ScrollView 
            style={styles.container} 
            showsVerticalScrollIndicator={false}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />
            }
        >
            <LinearGradient
                colors={[theme.primary, theme.secondary || '#1E40AF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.welcomeSection}
            >
                <View style={styles.welcomeHeader}>
                    {loading ? (
                        <Skeleton width={150} height={28} />
                    ) : (
                        <View style={styles.welcomeGreeting}>
                            <FontAwesome name="hand-paper-o" size={24} color={theme.accent} style={{ marginRight: 10 }} />
                            <Text style={styles.welcomeText}>Hello, {profile?.name?.split(' ')[0] || 'Neighbor'}</Text>
                        </View>
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
            </LinearGradient>

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
                    {(myPostedTasks.length > 0 || myGigs.length > 0 || appliedTasks.length > 0) ? (
                        <>
                            {myPostedTasks.length > 0 && (
                                <View style={styles.section}>
                                    <View style={styles.sectionHeader}>
                                        <FontAwesome name="bullhorn" size={20} color={theme.primary} style={styles.headerIcon} />
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

                            {appliedTasks.length > 0 && (
                                <View style={styles.section}>
                                    <View style={styles.sectionHeader}>
                                        <FontAwesome name="send" size={18} color={theme.primary} style={styles.headerIcon} />
                                        <Text style={styles.sectionTitle}>My Applications</Text>
                                    </View>
                                    {appliedTasks.map((item) => (
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
                                        <FontAwesome name="briefcase" size={20} color={theme.primary} style={styles.headerIcon} />
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
                        <EmptyState 
                            icon="calendar-check-o" 
                            title="No active tasks right now." 
                            buttonText="Browse Local Jobs" 
                            onPress={() => navigation.navigate('TasksTab')} 
                            containerStyle={{ marginTop: 20 }}
                        />
                    )}
                </>
            )}

            {/* Quick Tips Section */}
            <View style={styles.tipsSection}>
                <View style={styles.sectionHeaderAlt}>
                    <FontAwesome name="lightbulb-o" size={20} color={theme.primary} style={styles.headerIcon} />
                    <Text style={styles.sectionTitleAlt}>Neighborhood Tips</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tipsScroll}>
                    {rotatedTips.map((tip) => (
                        <View key={tip.id} style={styles.tipCard}>
                            <FontAwesome name={tip.icon} size={24} color={theme.accent} />
                            <Text style={styles.tipTitle}>{tip.title}</Text>
                            <Text style={styles.tipDesc}>{tip.description}</Text>
                        </View>
                    ))}
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
    welcomeSection: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.xl,
        paddingTop: Spacing.lg,
        borderBottomLeftRadius: Rounding.soft,
        borderBottomRightRadius: Rounding.soft,
        marginBottom: Spacing.md,
        ...shadows.medium,
    },
    welcomeGreeting: {
        flexDirection: 'row',
        alignItems: 'center',
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
        flexDirection: 'row',
        alignItems: 'center',
    },
    sectionHeaderAlt: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: Spacing.lg,
        marginBottom: Spacing.md,
    },
    headerIcon: {
        marginRight: 10,
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
