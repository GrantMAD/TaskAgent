import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, ScrollView, Alert, RefreshControl } from 'react-native';
import { taskService } from '../services/taskService';
import { TaskCard } from '../components/TaskCard';
import { Colors, Spacing, Rounding, Shadow } from '../utils/theme';
import { supabase } from '../services/supabaseClient';
import { FontAwesome } from '@expo/vector-icons';

export const HomeScreen = ({ navigation }) => {
    const [nearbyTasks, setNearbyTasks] = useState([]);
    const [myGigs, setMyGigs] = useState([]);
    const [myPostedTasks, setMyPostedTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            
            // 1. Get Public Feed
            const nearbyData = await taskService.getNearbyTasks();
            setNearbyTasks(nearbyData.slice(0, 3));

            if (session) {
                // 2. Get Tasks I'm Hired For (Worker Role)
                const gigsData = await taskService.getMyAssignedTasks(session.user.id);
                setMyGigs(gigsData);

                // 3. Get Tasks I Created (Poster Role)
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

    return (
        <ScrollView 
            style={styles.container} 
            showsVerticalScrollIndicator={false}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />
            }
        >
            <View style={styles.welcomeSection}>
                <View style={styles.welcomeHeader}>
                    <Text style={styles.welcomeText}>Your Hub</Text>
                    <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                        <FontAwesome name="sign-out" size={22} color={Colors.white} />
                    </TouchableOpacity>
                </View>
                <Text style={styles.subtitleText}>Ready to help or get things done?</Text>
            </View>

            {/* My Postings Section (Tasks I created that are in progress) */}
            {myPostedTasks.length > 0 && (
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>My Task Postings</Text>
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

            {/* My Active Gigs Section (Tasks I'm working on) */}
            {myGigs.length > 0 && (
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Tasks I'm Doing</Text>
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

            {/* Nearby Tasks Section */}
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Browse New Tasks</Text>
                <TouchableOpacity onPress={() => navigation.navigate('TasksTab')}>
                    <Text style={styles.viewAllLink}>See all</Text>
                </TouchableOpacity>
            </View>

            {nearbyTasks.length > 0 ? (
                nearbyTasks.map((item) => (
                    <TaskCard
                        key={item.id}
                        task={item}
                        onPress={() => navigation.navigate('TaskDetail', { taskId: item.id })}
                    />
                ))
            ) : (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>No new tasks nearby yet!</Text>
                </View>
            )}

            <View style={styles.actionSection}>
                <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => navigation.navigate('CreateTab')}
                >
                    <Text style={styles.primaryButtonText}>Post a Task</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => navigation.navigate('TasksTab')}
                >
                    <Text style={styles.secondaryButtonText}>Browse Gigs</Text>
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
    welcomeSection: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.lg,
        paddingTop: 60,
        backgroundColor: Colors.primary,
        borderBottomLeftRadius: Rounding.soft,
        borderBottomRightRadius: Rounding.soft,
        marginBottom: Spacing.md,
        ...Shadow.medium,
    },
    welcomeHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    logoutButton: {
        padding: 4,
    },
    welcomeText: {
        fontSize: 28,
        fontWeight: '800',
        color: Colors.white,
    },
    subtitleText: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.8)',
        marginTop: 4,
    },
    section: {
        marginBottom: Spacing.md,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        marginTop: Spacing.md,
        marginBottom: Spacing.sm,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: Colors.primary,
    },
    viewAllLink: {
        color: Colors.accent,
        fontWeight: '700',
        fontSize: 14,
    },
    actionSection: {
        padding: Spacing.lg,
        marginTop: Spacing.md,
        paddingBottom: 120,
    },
    primaryButton: {
        backgroundColor: Colors.accent,
        padding: Spacing.md,
        borderRadius: Rounding.pill,
        alignItems: 'center',
        marginBottom: Spacing.sm,
        ...Shadow.accent,
    },
    primaryButtonText: {
        color: Colors.white,
        fontWeight: '700',
        fontSize: 18,
    },
    secondaryButton: {
        backgroundColor: Colors.white,
        padding: Spacing.md,
        borderRadius: Rounding.pill,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: Colors.primary,
    },
    secondaryButtonText: {
        color: Colors.primary,
        fontWeight: '700',
        fontSize: 16,
    },
    emptyState: {
        padding: Spacing.xl,
        alignItems: 'center',
    },
    emptyStateText: {
        color: Colors.textMuted,
        fontSize: 16,
    }
});
