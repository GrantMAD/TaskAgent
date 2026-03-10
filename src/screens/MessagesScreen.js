import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { messageService } from '../services/messageService';
import { supabase } from '../services/supabaseClient';
import { UserAvatar } from '../components/UserAvatar';
import { Spacing, Rounding } from '../utils/theme';
import { useTheme } from '../components/ThemeContext';
import { FontAwesome } from '@expo/vector-icons';

export const MessagesScreen = ({ navigation }) => {
    const { theme, shadows } = useTheme();
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const styles = useMemo(() => createStyles(theme, shadows), [theme, shadows]);

    useEffect(() => {
        fetchConversations();
    }, []);

    const fetchConversations = async (isRefreshing = false) => {
        if (isRefreshing) setRefreshing(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            const data = await messageService.getConversations(session.user.id);
            setConversations(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        fetchConversations(true);
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
                <Text style={styles.headerTitle}>Neighbor Chat</Text>
                <Text style={styles.headerSubtitle}>Manage your task communications</Text>
            </View>

            <FlatList
                data={conversations}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl 
                        refreshing={refreshing} 
                        onRefresh={onRefresh} 
                        colors={[theme.accent]}
                        tintColor={theme.accent}
                    />
                }
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.conversationRow}
                        onPress={() => navigation.navigate('Chat', { conversationId: item.id })}
                        activeOpacity={0.7}
                    >
                        <UserAvatar user={{ name: 'User' }} size={56} />
                        <View style={styles.textContainer}>
                            <View style={styles.rowHeader}>
                                <Text style={styles.taskTitle} numberOfLines={1}>{item.task?.title || 'Unknown Task'}</Text>
                                <FontAwesome name="chevron-right" size={12} color={theme.border} />
                            </View>
                            <Text style={styles.preview} numberOfLines={1}>Tap to view messages...</Text>
                        </View>
                    </TouchableOpacity>
                )}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <FontAwesome name="comments-o" size={48} color={theme.border} style={styles.emptyIcon} />
                        <Text style={styles.emptyText}>No conversations yet.</Text>
                        <Text style={styles.emptySubtext}>Message a neighbor about a task to start!</Text>
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
        fontSize: 15,
        color: 'rgba(255, 255, 255, 0.8)',
        marginTop: 4,
    },
    listContent: {
        paddingVertical: Spacing.sm,
        paddingBottom: 100, // Space for tab bar
    },
    conversationRow: {
        flexDirection: 'row',
        backgroundColor: theme.card,
        padding: Spacing.md,
        marginHorizontal: Spacing.md,
        marginVertical: 4,
        borderRadius: Rounding.soft,
        alignItems: 'center',
        ...shadows.subtle,
        borderWidth: 1,
        borderColor: theme.border,
    },
    textContainer: {
        marginLeft: Spacing.md,
        flex: 1,
    },
    rowHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    taskTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.primary,
        flex: 1,
        marginRight: 8,
    },
    preview: {
        color: theme.textMuted,
        marginTop: 2,
        fontSize: 14,
    },
    emptyState: {
        padding: Spacing.xl,
        alignItems: 'center',
        marginTop: 40,
    },
    emptyIcon: {
        marginBottom: Spacing.md,
    },
    emptyText: {
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
