import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { taskService } from '../services/taskService';
import { supabase } from '../services/supabaseClient';
import { TaskCard } from '../components/TaskCard';
import { Colors, Spacing, Rounding, Shadow } from '../utils/theme';
import { FontAwesome } from '@expo/vector-icons';

export const TaskHistoryScreen = ({ navigation }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [userId, setUserId] = useState(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                setUserId(session.user.id);
                fetchHistory(session.user.id);
            }
        });
    }, []);

    const fetchHistory = async (uid, isRefreshing = false) => {
        if (isRefreshing) setRefreshing(true);
        try {
            const data = await taskService.getTaskHistory(uid);
            setHistory(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        if (userId) fetchHistory(userId, true);
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <FontAwesome name="chevron-left" size={20} color={Colors.white} />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>Task History</Text>
                </View>
                <View style={styles.headerSpacer} />
            </View>

            <FlatList
                data={history}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />
                }
                renderItem={({ item }) => {
                    const isPoster = item.poster_id === userId;
                    return (
                        <View style={styles.historyItemWrapper}>
                            <View style={[styles.roleBadge, { backgroundColor: isPoster ? Colors.primary : Colors.accent }]}>
                                <Text style={styles.roleText}>{isPoster ? 'HIRING' : 'WORKING'}</Text>
                            </View>
                            <TaskCard
                                task={item}
                                onPress={() => navigation.navigate('TaskDetail', { taskId: item.id })}
                            />
                        </View>
                    );
                }}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <FontAwesome name="history" size={48} color={Colors.border} style={styles.emptyIcon} />
                        <Text style={styles.emptyText}>No completed tasks yet.</Text>
                        <Text style={styles.emptySubtext}>Your journey in the marketplace starts here!</Text>
                    </View>
                }
            />
        </View>
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
    header: {
        backgroundColor: Colors.primary,
        paddingTop: 60,
        paddingBottom: Spacing.md,
        paddingHorizontal: Spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomLeftRadius: Rounding.soft,
        borderBottomRightRadius: Rounding.soft,
        ...Shadow.medium,
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
        color: Colors.white,
    },
    headerSpacer: {
        width: 40,
    },
    listContent: {
        paddingVertical: Spacing.md,
        paddingBottom: 100,
    },
    historyItemWrapper: {
        position: 'relative',
    },
    roleBadge: {
        position: 'absolute',
        top: 12,
        right: 24,
        zIndex: 5,
        paddingHorizontal: 10,
        paddingVertical: 2,
        borderRadius: Rounding.tight,
        ...Shadow.subtle,
    },
    roleText: {
        color: Colors.white,
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    emptyState: {
        padding: Spacing.xl,
        alignItems: 'center',
        marginTop: 60,
    },
    emptyIcon: {
        marginBottom: Spacing.md,
    },
    emptyText: {
        color: Colors.text,
        fontSize: 18,
        fontWeight: '700',
        textAlign: 'center',
    },
    emptySubtext: {
        color: Colors.textMuted,
        fontSize: 14,
        textAlign: 'center',
        marginTop: 8,
    }
});
