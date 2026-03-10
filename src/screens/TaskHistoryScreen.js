import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { taskService } from '../services/taskService';
import { TaskCard } from '../components/TaskCard';
import { supabase } from '../services/supabaseClient';
import { Spacing, Rounding } from '../utils/theme';
import { FontAwesome } from '@expo/vector-icons';
import { useTheme } from '../components/ThemeContext';

export const TaskHistoryScreen = ({ navigation }) => {
    const { theme, shadows } = useTheme();
    const styles = useMemo(() => createStyles(theme, shadows), [theme, shadows]);

    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                const data = await taskService.getTaskHistory(session.user.id);
                setTasks(data);
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
        fetchHistory();
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
                <Text style={styles.headerTitle}>Task History</Text>
                <Text style={styles.headerSubtitle}>A record of your completed neighborhood jobs.</Text>
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
                        <View style={styles.emptyIconCircle}>
                            <FontAwesome name="history" size={40} color={theme.textMuted} />
                        </View>
                        <Text style={styles.emptyTitle}>No history yet</Text>
                        <Text style={styles.emptySubtext}>Completed tasks will appear here.</Text>
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
    listContent: {
        paddingVertical: Spacing.md,
        paddingBottom: 100,
    },
    emptyState: {
        padding: Spacing.xl,
        alignItems: 'center',
        marginTop: 60,
    },
    emptyIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: theme.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.md,
        ...shadows.subtle,
    },
    emptyTitle: {
        color: theme.text,
        fontSize: 18,
        fontWeight: '700',
        textAlign: 'center',
    },
    emptySubtext: {
        color: theme.textMuted,
        fontSize: 14,
        textAlign: 'center',
        marginTop: 8,
    }
});
