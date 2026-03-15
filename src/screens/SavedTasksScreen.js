import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { taskService } from '../services/taskService';
import { TaskCard } from '../components/TaskCard';
import { TaskCardSkeleton } from '../components/skeletons/SkeletonPlaceholders';
import { Spacing, Rounding } from '../utils/theme';
import { useTheme } from '../components/ThemeContext';
import { EmptyState } from '../components/EmptyState';
import { useAuth } from '../components/AuthContext';
import { FontAwesome } from '@expo/vector-icons';

export const SavedTasksScreen = ({ navigation }) => {
    const { theme, shadows } = useTheme();
    const { user, savedTaskIds } = useAuth();
    const [savedTasks, setSavedTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const styles = useMemo(() => createStyles(theme, shadows), [theme, shadows]);

    useEffect(() => {
        fetchSavedTasks();
    }, [savedTaskIds]); // Re-fetch or filter when savedTaskIds change

    const fetchSavedTasks = async (isRefreshing = false) => {
        if (!user) return;
        if (isRefreshing) setRefreshing(true);
        
        try {
            const tasks = await taskService.getSavedTasks(user.id);
            setSavedTasks(tasks);
        } catch (error) {
            console.error('Error fetching saved tasks:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        fetchSavedTasks(true);
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <FontAwesome name="chevron-left" size={20} color={theme.white} />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>Saved Tasks</Text>
                </View>
                <View style={styles.headerSpacer} />
            </View>

            {loading && !refreshing ? (
                <View style={styles.listContent}>
                    {[1, 2, 3, 4].map((i) => (
                        <TaskCardSkeleton key={i} />
                    ))}
                </View>
            ) : (
                <FlatList
                    data={savedTasks}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />
                    }
                    renderItem={({ item }) => (
                        <TaskCard
                            task={item}
                            onPress={() => navigation.navigate('TaskDetail', { taskId: item.id })}
                        />
                    )}
                    ListEmptyComponent={
                        <EmptyState 
                            icon="heart-o" 
                            title="No saved tasks yet" 
                            subtitle="Tap the heart icon on any task to save it for later." 
                            buttonText="Browse Jobs" 
                            onPress={() => navigation.navigate('TasksTab')} 
                        />
                    }
                />
            )}
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
        borderBottomLeftRadius: Rounding.soft,
        borderBottomRightRadius: Rounding.soft,
        ...shadows.medium,
        zIndex: 10,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
    },
    headerTitleContainer: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: theme.white,
    },
    headerSpacer: {
        width: 40,
    },
    listContent: {
        paddingVertical: Spacing.sm,
        paddingBottom: 100,
    }
});
