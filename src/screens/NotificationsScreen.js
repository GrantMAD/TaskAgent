import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { notificationService } from '../services/notificationService';
import { supabase } from '../services/supabaseClient';
import { Spacing, Rounding } from '../utils/theme';
import { FontAwesome } from '@expo/vector-icons';
import { useToast } from '../components/ToastContext';
import { useTheme } from '../components/ThemeContext';

export const NotificationsScreen = ({ navigation }) => {
    const { theme, shadows } = useTheme();
    const styles = useMemo(() => createStyles(theme, shadows), [theme, shadows]);
    const { showToast } = useToast();

    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const unreadCount = notifications.filter(n => !n.is_read).length;

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async (isRefreshing = false) => {
        if (isRefreshing) setRefreshing(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            const data = await notificationService.getNotifications(session.user.id);
            setNotifications(data);
        } catch (error) {
            console.error(error);
            showToast('Failed to load notifications', 'error');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleMarkRead = async (id) => {
        try {
            await notificationService.markAsRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        } catch (error) {
            console.error(error);
        }
    };

    const handleDelete = async (id) => {
        try {
            await notificationService.deleteNotification(id);
            setNotifications(prev => prev.filter(n => n.id !== id));
            showToast('Notification deleted', 'info');
        } catch (error) {
            console.error(error);
            showToast('Failed to delete notification', 'error');
        }
    };

    const handleNotificationPress = async (item) => {
        if (!item.is_read) {
            handleMarkRead(item.id);
        }

        // Navigation Logic
        switch (item.type) {
            case 'APPLICATION':
            case 'HIRED':
            case 'COMPLETED':
                if (item.related_id) {
                    navigation.navigate('Main', { 
                        screen: 'HomeTab', 
                        params: { 
                            screen: 'TaskDetail', 
                            params: { taskId: item.related_id } 
                        } 
                    });
                }
                break;
            case 'MESSAGE':
                if (item.related_id) {
                    navigation.navigate('Main', { 
                        screen: 'MessagesTab', 
                        params: { 
                            screen: 'Chat', 
                            params: { conversationId: item.related_id } 
                        } 
                    });
                }
                break;
            default:
                break;
        }
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
                <View style={styles.headerLeft}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <FontAwesome name="chevron-left" size={20} color={theme.white} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Notifications</Text>
                    {unreadCount > 0 && (
                        <View style={styles.countBadge}>
                            <Text style={styles.countText}>{unreadCount}</Text>
                        </View>
                    )}
                </View>
                <TouchableOpacity 
                    onPress={async () => {
                        const { data: { session } } = await supabase.auth.getSession();
                        await notificationService.markAllAsRead(session.user.id);
                        fetchNotifications();
                    }}
                >
                    <Text style={styles.markAllText}>Mark all read</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={notifications}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={() => fetchNotifications(true)} tintColor={theme.accent} />
                }
                renderItem={({ item }) => (
                    <TouchableOpacity 
                        style={[styles.notificationCard, !item.is_read && styles.unreadCard]}
                        onPress={() => handleNotificationPress(item)}
                    >
                        <View style={[styles.iconContainer, { backgroundColor: item.is_read ? theme.border : theme.primary }]}>
                            <FontAwesome 
                                name={item.type === 'MESSAGE' ? 'envelope' : 'bell'} 
                                size={18} 
                                color={item.is_read ? theme.textMuted : theme.white} 
                            />
                        </View>
                        <View style={styles.content}>
                            <Text style={styles.title}>{item.title}</Text>
                            <Text style={styles.message}>{item.message}</Text>
                            <Text style={styles.time}>{formatTime(item.created_at)}</Text>
                        </View>
                        <View style={styles.cardRight}>
                            {!item.is_read && <View style={styles.unreadDot} />}
                            <TouchableOpacity 
                                style={styles.deleteButton} 
                                onPress={() => handleDelete(item.id)}
                            >
                                <FontAwesome name="trash-o" size={18} color={theme.error} />
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                )}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <FontAwesome name="bell-slash-o" size={50} color={theme.border} />
                        <Text style={styles.emptyText}>No notifications yet</Text>
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
    },
    header: {
        backgroundColor: theme.primary,
        paddingTop: Spacing.lg,
        paddingBottom: Spacing.md,
        paddingHorizontal: Spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        ...shadows.medium,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        marginRight: Spacing.md,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: theme.white,
    },
    countBadge: {
        backgroundColor: theme.accent,
        borderRadius: 12,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: Spacing.sm,
        paddingHorizontal: 6,
    },
    countText: {
        color: theme.white,
        fontSize: 11,
        fontWeight: '900',
    },
    markAllText: {
        color: theme.accent,
        fontSize: 12,
        fontWeight: '700',
    },
    listContent: {
        padding: Spacing.md,
        paddingBottom: 100,
    },
    notificationCard: {
        flexDirection: 'row',
        backgroundColor: theme.surface,
        padding: Spacing.md,
        borderRadius: Rounding.soft,
        marginBottom: Spacing.sm,
        alignItems: 'center',
        ...shadows.subtle,
        borderWidth: 1,
        borderColor: theme.border,
    },
    unreadCard: {
        borderColor: theme.accent,
        backgroundColor: theme.isDarkMode ? 'rgba(230, 138, 0, 0.05)' : '#FFFBF5',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
        marginLeft: Spacing.md,
    },
    title: {
        fontSize: 15,
        fontWeight: '700',
        color: theme.text,
    },
    message: {
        fontSize: 13,
        color: theme.text,
        marginTop: 2,
    },
    time: {
        fontSize: 11,
        color: theme.textMuted,
        marginTop: 4,
    },
    cardRight: {
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        height: '100%',
        minHeight: 40,
    },
    unreadDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: theme.accent,
        marginBottom: 8,
    },
    deleteButton: {
        padding: 8,
    },
    emptyState: {
        marginTop: 100,
        alignItems: 'center',
    },
    emptyText: {
        marginTop: Spacing.md,
        color: theme.textMuted,
        fontSize: 16,
    }
});
