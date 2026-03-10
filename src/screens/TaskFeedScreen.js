import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { taskService } from '../services/taskService';
import { TaskCard } from '../components/TaskCard';
import { Spacing, Rounding } from '../utils/theme';
import { useTheme } from '../components/ThemeContext';

export const TaskFeedScreen = ({ navigation }) => {
    const { theme, shadows } = useTheme();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const styles = useMemo(() => createStyles(theme, shadows), [theme, shadows]);

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        try {
            const data = await taskService.getNearbyTasks();
            setTasks(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchTasks();
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Local Jobs</Text>
                <Text style={styles.headerSubtitle}>Discover opportunities to help your neighbors and earn.</Text>
            </View>

            <View style={styles.descriptionSection}>
                <Text style={styles.descriptionText}>
                    Browse through available tasks in your area. You can apply for any job that matches your skills. 
                    Once the poster approves your application, you can start chatting and get to work!
                </Text>
            </View>

            <FlatList
                data={tasks}
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
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>No open tasks in your area right now. Check back later!</Text>
                    </View>
                }
            />
        </View>
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
    header: {
        backgroundColor: theme.primary,
        paddingTop: Spacing.lg,
        paddingBottom: Spacing.lg,
        paddingHorizontal: Spacing.lg,
        borderBottomLeftRadius: Rounding.soft,
        borderBottomRightRadius: Rounding.soft,
        ...shadows.medium,
        zIndex: 10,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: theme.white,
    },
    headerSubtitle: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.7)',
        marginTop: 4,
        fontWeight: '600',
    },
    descriptionSection: {
        padding: Spacing.lg,
        backgroundColor: theme.isDarkMode ? 'rgba(255,255,255,0.05)' : '#E8EFF4',
        marginHorizontal: Spacing.md,
        marginTop: Spacing.md,
        borderRadius: Rounding.standard,
        borderWidth: 1,
        borderColor: theme.border,
    },
    descriptionText: {
        fontSize: 14,
        color: theme.isDarkMode ? theme.text : theme.primary,
        lineHeight: 20,
        fontWeight: '500',
    },
    listContent: {
        paddingVertical: Spacing.md,
        paddingBottom: 100, // Extra space for tab bar
    },
    emptyState: {
        padding: Spacing.xl,
        alignItems: 'center',
    },
    emptyText: {
        color: theme.textMuted,
        fontSize: 16,
        textAlign: 'center',
    }
});
