import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { messageService } from '../services/messageService';
import { supabase } from '../services/supabaseClient';
import { ConversationSkeleton } from '../components/skeletons/SkeletonPlaceholders';
import { UserAvatar } from '../components/UserAvatar';
import { Spacing, Rounding } from '../utils/theme';
import { useTheme } from '../components/ThemeContext';
import { FontAwesome } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

export const MessagesScreen = ({ navigation }) => {
    const { theme, shadows } = useTheme();
    const [conversations, setConversations] = useState([]);
    const [userId, setUserId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const styles = useMemo(() => createStyles(theme, shadows), [theme, shadows]);

    useFocusEffect(
        useCallback(() => {
            fetchConversations();
        }, [])
    );

    const fetchConversations = async (isRefreshing = false) => {
        if (isRefreshing) setRefreshing(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            const currentUserId = session.user.id;
            setUserId(currentUserId);
            const data = await messageService.getConversations(currentUserId);
            
            // Fetch unread counts for each conversation
            const conversationsWithUnread = await Promise.all(data.map(async (conv) => {
                const unreadCount = await messageService.getUnreadCount(conv.id, currentUserId);
                return { ...conv, unread_count: unreadCount };
            }));

            setConversations(conversationsWithUnread);
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

    const getOtherUser = (item) => {
        if (!userId) return { name: 'Neighbor' };
        return item.user1_id === userId ? item.user2 : item.user1;
    };

    const formatMessageTime = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const now = new Date();
        if (date.toDateString() === now.toDateString()) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Neighbor Chat</Text>
                    <Text style={styles.headerSubtitle}>Manage your task communications</Text>
                </View>
                <View style={styles.listContent}>
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <ConversationSkeleton key={i} />
                    ))}
                </View>
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
                renderItem={({ item }) => {
                    const otherUser = getOtherUser(item);
                    const lastMsg = item.last_message;
                    const hasUnread = item.unread_count > 0;

                    return (
                        <TouchableOpacity
                            style={[styles.conversationRow, hasUnread && styles.unreadRow]}
                            onPress={() => navigation.navigate('Chat', { conversationId: item.id })}
                            activeOpacity={0.7}
                        >
                            <UserAvatar user={otherUser} size={56} />
                            {hasUnread && <View style={styles.unreadBadge} />}
                            
                            <View style={styles.textContainer}>
                                <View style={styles.rowHeader}>
                                    <Text style={[styles.otherUserName, hasUnread && styles.unreadText]} numberOfLines={1}>
                                        {otherUser?.name || 'Neighbor'}
                                    </Text>
                                    <Text style={styles.timeText}>
                                        {formatMessageTime(lastMsg?.created_at)}
                                    </Text>
                                </View>
                                <Text style={[styles.preview, hasUnread && styles.unreadPreview]} numberOfLines={1}>
                                    {lastMsg ? (
                                        lastMsg.message_text || (lastMsg.image_url ? '📷 Image' : 'No content')
                                    ) : (
                                        'No messages yet'
                                    )}
                                </Text>
                            </View>
                            <FontAwesome name="chevron-right" size={12} color={theme.border} style={{ marginLeft: 10 }} />
                        </TouchableOpacity>
                    );
                }}
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
        position: 'relative',
    },
    unreadRow: {
        borderColor: theme.accent,
        backgroundColor: theme.isDarkMode ? 'rgba(230, 138, 0, 0.05)' : 'rgba(230, 138, 0, 0.02)',
    },
    unreadBadge: {
        position: 'absolute',
        top: 15,
        left: 60,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: theme.accent,
        borderWidth: 2,
        borderColor: theme.card,
        zIndex: 1,
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
    otherUserName: {
        fontSize: 17,
        fontWeight: '800',
        color: theme.primary,
        flex: 1,
    },
    unreadText: {
        fontWeight: '900',
    },
    timeText: {
        fontSize: 12,
        color: theme.textMuted,
        fontWeight: '600',
    },
    taskTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.textMuted,
        marginTop: 1,
    },
    preview: {
        color: theme.textMuted,
        marginTop: 2,
        fontSize: 14,
    },
    unreadPreview: {
        color: theme.text,
        fontWeight: '700',
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
