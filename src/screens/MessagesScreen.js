import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { messageService } from '../services/messageService';
import { supabase } from '../services/supabaseClient';
import { ConversationSkeleton } from '../components/skeletons/SkeletonPlaceholders';
import { UserAvatar } from '../components/UserAvatar';
import { Spacing, Rounding } from '../utils/theme';
import { FontAwesome } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../components/AuthContext';
import { useTheme } from '../components/ThemeContext';
import { useNotifications } from '../components/NotificationContext';
import { EmptyState } from '../components/EmptyState';

export const MessagesScreen = ({ navigation }) => {
    const { theme, shadows } = useTheme();
    const { session } = useAuth();
    const { onlineUsers } = useNotifications();
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
            if (!session) return;
            const currentUserId = session.user.id;
            setUserId(currentUserId);
            
            const data = await messageService.getConversations(currentUserId);
            setConversations(data);
        } catch (error) {
            console.error('Error fetching conversations:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Real-time subscription for new messages
    useEffect(() => {
        if (!userId) return;

        const channel = supabase
            .channel(`inbox-updates-${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                },
                async (payload) => {
                    const newMessage = payload.new;
                    
                    setConversations(currentConvs => {
                        const convIndex = currentConvs.findIndex(c => c.id === newMessage.conversation_id);
                        
                        if (convIndex > -1) {
                            // Update existing conversation
                            const updatedConvs = [...currentConvs];
                            const conv = { ...updatedConvs[convIndex] };
                            
                            // Update last message
                            conv.last_message = {
                                message_text: newMessage.message_text,
                                image_url: newMessage.image_url,
                                created_at: newMessage.created_at,
                                sender_id: newMessage.sender_id
                            };
                            
                            // Increment unread count if we are not the sender
                            if (newMessage.sender_id !== userId) {
                                conv.unread_count = (conv.unread_count || 0) + 1;
                            }
                            
                            // Move to top
                            updatedConvs.splice(convIndex, 1);
                            updatedConvs.unshift(conv);
                            return updatedConvs;
                        } else {
                            // New conversation or one not in current list
                            fetchConversations();
                            return currentConvs;
                        }
                    });
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'messages',
                },
                (payload) => {
                    const updatedMessage = payload.new;
                    // If a message was marked as read, update the unread count
                    if (updatedMessage.is_read) {
                        setConversations(currentConvs => {
                            const convIndex = currentConvs.findIndex(c => c.id === updatedMessage.conversation_id);
                            if (convIndex > -1) {
                                const updatedConvs = [...currentConvs];
                                const conv = { ...updatedConvs[convIndex] };
                                // Instead of complex logic, we'll just trigger a small re-fetch for unread counts 
                                // if we want extreme accuracy, but for a real-time feel, 
                                // we can just decrement if it makes sense.
                                // However, usually many messages are marked as read at once.
                                // Let's just do a quiet unread count refresh for this conversation
                                messageService.getUnreadCount(conv.id, userId).then(count => {
                                    setConversations(latestConvs => {
                                        return latestConvs.map(c => c.id === conv.id ? { ...c, unread_count: count } : c);
                                    });
                                });
                            }
                            return currentConvs;
                        });
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId]);

    const onRefresh = () => {
        fetchConversations(true);
    };

    const getOtherUser = (item) => {
        if (!userId) return { name: 'Neighbor' };
        const user = item.user1_id === userId ? item.user2 : item.user1;
        return user || { name: 'Deleted User', profile_image: null };
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

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[theme.primary, theme.secondary || '#1E40AF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <Text style={styles.headerTitle}>Neighbor Chat</Text>
                <Text style={styles.headerSubtitle}>Manage your task communications</Text>
            </LinearGradient>

            {loading && !refreshing ? (
                <View style={styles.listContent}>
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <ConversationSkeleton key={i} />
                    ))}
                </View>
            ) : (
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
                                <View style={{ position: 'relative' }}>
                                    <UserAvatar user={otherUser} size={56} />
                                    {onlineUsers[otherUser?.id] && (
                                        <View style={styles.onlineBadge} />
                                    )}
                                </View>
                                {hasUnread && <View style={styles.unreadBadge} />}
                                
                                <View style={styles.textContainer}>
                                    <View style={styles.rowHeader}>
                                        <Text style={[styles.otherUserName, hasUnread && styles.unreadText]} numberOfLines={1}>
                                            {otherUser?.name || 'Deleted User'}
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
                        <EmptyState 
                            icon="comments-o" 
                            title="No conversations yet." 
                            subtitle="Message a neighbor about a task to start!" 
                            buttonText="Browse Tasks"
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
    onlineBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#10B981', // emerald-500
        borderWidth: 3,
        borderColor: theme.card,
        zIndex: 2,
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
    }
});