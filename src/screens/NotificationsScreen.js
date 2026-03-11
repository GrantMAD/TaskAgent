import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { NotificationSkeleton } from '../components/skeletons/SkeletonPlaceholders';
import { Spacing, Rounding } from '../utils/theme';
import { FontAwesome } from '@expo/vector-icons';
import { useTheme } from '../components/ThemeContext';
import { useNotifications } from '../components/NotificationContext';

export const NotificationsScreen = ({ navigation }) => {
    const { theme, shadows } = useTheme();
    const styles = useMemo(() => createStyles(theme, shadows), [theme, shadows]);
    const { 
        notifications, 
        loading, 
        unreadCount, 
        markAsRead, 
        markAllAsRead, 
        deleteNotification,
        refreshNotifications 
    } = useNotifications();

    const handleNotificationPress = async (item) => {
        if (!item.is_read) {
            markAsRead(item.id);
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
                <TouchableOpacity onPress={markAllAsRead}>
                    <Text style={styles.markAllText}>Mark all read</Text>
                </TouchableOpacity>
            </View>

            {loading && notifications.length === 0 ? (
                <View style={styles.listContent}>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                        <NotificationSkeleton key={i} />
                    ))}
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={loading} onRefresh={refreshNotifications} tintColor={theme.accent} />
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
                                    onPress={() => deleteNotification(item.id)}
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
