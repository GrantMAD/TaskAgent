import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert, Modal, ActivityIndicator } from 'react-native';
import { NotificationSkeleton } from '../components/skeletons/SkeletonPlaceholders';
import { Spacing, Rounding } from '../utils/theme';
import { FontAwesome } from '@expo/vector-icons';
import { useTheme } from '../components/ThemeContext';
import { useNotifications } from '../components/NotificationContext';
import { useToast } from '../components/ToastContext';
import { taskService } from '../services/taskService';

export const NotificationsScreen = ({ navigation, route }) => {
    const { theme, shadows } = useTheme();
    const { showToast } = useToast();
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
    
    const [actionLoading, setActionLoading] = useState(false);
    
    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [modalData, setModalData] = useState(null); // { type, task, previousWorker }

    // Handle deep link from dropdown
    useEffect(() => {
        if (route.params?.notificationId && notifications.length > 0) {
            const notif = notifications.find(n => n.id === route.params.notificationId);
            if (notif) {
                handleNotificationPress(notif);
                // Clear param so it doesn't re-trigger
                navigation.setParams({ notificationId: null });
            }
        }
    }, [route.params?.notificationId, notifications]);

    const handleNotificationPress = async (item) => {
        if (!item.is_read) {
            markAsRead(item.id);
        }

        // Action Logic for recurring tasks
        if (item.type === 'RECURRING_APPROVAL') {
            prepareRecurringApproval(item);
            return;
        }

        if (item.type === 'RECURRING_INVITATION') {
            prepareRecurringInvitation(item);
            return;
        }

        // Navigation Logic
        switch (item.type) {
            case 'APPLICATION':
            case 'HIRED':
            case 'COMPLETED':
            case 'INVITATION_ACCEPTED':
            case 'INVITATION_DECLINED':
                if (item.related_id) {
                    navigation.navigate('MainDrawer', { 
                        screen: 'Main', 
                        params: {
                            screen: 'HomeTab', 
                            params: { 
                                screen: 'TaskDetail', 
                                params: { taskId: item.related_id } 
                            }
                        }
                    });
                }
                break;
            case 'MESSAGE':
                if (item.related_id) {
                    navigation.navigate('MainDrawer', { 
                        screen: 'Main', 
                        params: {
                            screen: 'MessagesTab', 
                            params: { 
                                screen: 'Chat', 
                                params: { conversationId: item.related_id } 
                            }
                        }
                    });
                }
                break;
            default:
                break;
        }
    };

    const prepareRecurringApproval = async (item) => {
        setActionLoading(true);
        try {
            const { data: task } = await supabase
                .from('tasks')
                .select('id, title, parent_template_id')
                .eq('id', item.related_id)
                .single();

            if (!task) throw new Error('Task not found');

            const { data: lastTasks } = await supabase
                .from('tasks')
                .select('assigned_worker_id')
                .eq('parent_template_id', task.parent_template_id)
                .not('assigned_worker_id', 'is', null)
                .order('created_at', { ascending: false })
                .limit(1);

            let previousWorker = null;
            if (lastTasks && lastTasks.length > 0) {
                previousWorker = await userService.getUserProfile(lastTasks[0].assigned_worker_id);
            }

            setModalData({
                type: 'APPROVAL',
                task,
                previousWorker
            });
            setModalVisible(true);
        } catch (error) {
            Alert.alert('Error', error.message);
        } finally {
            setActionLoading(false);
        }
    };

    const prepareRecurringInvitation = async (item) => {
        setActionLoading(true);
        try {
            const { data: task } = await supabase
                .from('tasks')
                .select('id, title')
                .eq('id', item.related_id)
                .single();

            if (!task) throw new Error('Task not found');

            setModalData({
                type: 'INVITATION',
                task
            });
            setModalVisible(true);
        } catch (error) {
            Alert.alert('Error', error.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleAction = async (actionType) => {
        setActionLoading(true);
        try {
            if (modalData.type === 'APPROVAL') {
                if (actionType === 'REHIRE') {
                    await taskService.approveRecurringTask(modalData.task.id, modalData.previousWorker.id);
                    showToast(`Invitation sent to ${modalData.previousWorker.name}`, 'success');
                } else if (actionType === 'PUBLIC') {
                    await taskService.approveRecurringTask(modalData.task.id, null);
                    showToast('Task is now live for everyone', 'success');
                }
            } else if (modalData.type === 'INVITATION') {
                if (actionType === 'ACCEPT') {
                    await taskService.respondToRecurringInvitation(modalData.task.id, true);
                    showToast('You have been assigned to the task!', 'success');
                } else if (actionType === 'DECLINE') {
                    await taskService.respondToRecurringInvitation(modalData.task.id, false);
                    showToast('Invitation declined', 'info');
                }
            }
            setModalVisible(false);
            refreshNotifications();
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setActionLoading(false);
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
                            style={[
                                styles.notificationCard, 
                                !item.is_read && styles.unreadCard,
                                (item.type === 'RECURRING_APPROVAL' || item.type === 'RECURRING_INVITATION') && styles.actionCard
                            ]}
                            onPress={() => handleNotificationPress(item)}
                        >
                            <View style={[styles.iconContainer, { backgroundColor: item.is_read ? theme.border : (item.type.includes('RECURRING') ? theme.accent : theme.primary) }]}>
                                <FontAwesome 
                                    name={item.type === 'MESSAGE' ? 'envelope' : (item.type.includes('RECURRING') ? 'repeat' : 'bell')} 
                                    size={18} 
                                    color={item.is_read ? theme.textMuted : theme.white} 
                                />
                            </View>
                            <View style={styles.content}>
                                <Text style={styles.title}>{item.title}</Text>
                                <Text style={styles.message}>{item.message}</Text>
                                <Text style={styles.time}>{formatTime(item.created_at)}</Text>
                                
                                {(item.type === 'RECURRING_APPROVAL' || item.type === 'RECURRING_INVITATION') && (
                                    <View style={styles.actionPrompt}>
                                        <Text style={styles.actionText}>TAP TO TAKE ACTION</Text>
                                        <FontAwesome name="hand-pointer-o" size={12} color={theme.accent} style={{ marginLeft: 5 }} />
                                    </View>
                                )}
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

            {/* ACTION MODAL */}
            <Modal
                transparent={true}
                visible={modalVisible}
                animationType="slide"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {modalData?.type === 'APPROVAL' ? 'Approve Task' : 'Task Invitation'}
                            </Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <FontAwesome name="times" size={20} color={theme.textMuted} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalContent}>
                            <Text style={styles.taskTitle}>{modalData?.task?.title}</Text>
                            
                            {modalData?.type === 'APPROVAL' ? (
                                <>
                                    <Text style={styles.modalMessage}>
                                        This recurring task is ready. Choose how you'd like to proceed:
                                    </Text>
                                    
                                    {modalData.previousWorker && (
                                        <TouchableOpacity 
                                            style={styles.rehireCard}
                                            onPress={() => handleAction('REHIRE')}
                                            disabled={actionLoading}
                                        >
                                            <UserAvatar user={modalData.previousWorker} size={50} />
                                            <View style={styles.rehireInfo}>
                                                <Text style={styles.rehireName}>Hire {modalData.previousWorker.name} again</Text>
                                                <Text style={styles.rehireSub}>Invite previous worker directly</Text>
                                            </View>
                                            <FontAwesome name="chevron-right" size={14} color={theme.accent} />
                                        </TouchableOpacity>
                                    )}

                                    <TouchableOpacity 
                                        style={styles.publicButton}
                                        onPress={() => handleAction('PUBLIC')}
                                        disabled={actionLoading}
                                    >
                                        <FontAwesome name="globe" size={20} color={theme.white} style={{ marginRight: 10 }} />
                                        <Text style={styles.publicButtonText}>Post Publicly</Text>
                                    </TouchableOpacity>
                                </>
                            ) : (
                                <>
                                    <Text style={styles.modalMessage}>
                                        You've been invited back for this task. Would you like to accept?
                                    </Text>
                                    
                                    <View style={styles.invitationRow}>
                                        <TouchableOpacity 
                                            style={styles.declineButton}
                                            onPress={() => handleAction('DECLINE')}
                                            disabled={actionLoading}
                                        >
                                            <Text style={styles.declineText}>Decline</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity 
                                            style={styles.acceptButton}
                                            onPress={() => handleAction('ACCEPT')}
                                            disabled={actionLoading}
                                        >
                                            <Text style={styles.acceptText}>Accept</Text>
                                        </TouchableOpacity>
                                    </View>
                                </>
                            )}
                            
                            {actionLoading && (
                                <ActivityIndicator size="small" color={theme.accent} style={{ marginTop: 20 }} />
                            )}
                        </View>
                    </View>
                </View>
            </Modal>
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
    actionCard: {
        borderLeftWidth: 4,
        borderLeftColor: theme.accent,
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
    actionPrompt: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        backgroundColor: theme.accent + '10',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        alignSelf: 'flex-start',
    },
    actionText: {
        fontSize: 10,
        fontWeight: '900',
        color: theme.accent,
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
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.lg,
    },
    modalContainer: {
        width: '100%',
        backgroundColor: theme.surface,
        borderRadius: Rounding.soft,
        overflow: 'hidden',
        ...shadows.medium,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
        backgroundColor: theme.background,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: theme.primary,
    },
    modalContent: {
        padding: Spacing.lg,
    },
    taskTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: theme.accent,
        marginBottom: Spacing.sm,
    },
    modalMessage: {
        fontSize: 15,
        color: theme.text,
        marginBottom: Spacing.lg,
        lineHeight: 22,
    },
    rehireCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.background,
        padding: Spacing.md,
        borderRadius: Rounding.standard,
        marginBottom: Spacing.md,
        borderWidth: 1,
        borderColor: theme.accent,
    },
    rehireInfo: {
        flex: 1,
        marginLeft: Spacing.md,
    },
    rehireName: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.text,
    },
    rehireSub: {
        fontSize: 12,
        color: theme.textMuted,
    },
    publicButton: {
        flexDirection: 'row',
        backgroundColor: theme.primary,
        padding: Spacing.md,
        borderRadius: Rounding.pill,
        alignItems: 'center',
        justifyContent: 'center',
    },
    publicButtonText: {
        color: theme.white,
        fontSize: 16,
        fontWeight: '700',
    },
    invitationRow: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    declineButton: {
        flex: 1,
        padding: Spacing.md,
        borderRadius: Rounding.pill,
        borderWidth: 2,
        borderColor: theme.error,
        alignItems: 'center',
    },
    acceptButton: {
        flex: 1,
        padding: Spacing.md,
        borderRadius: Rounding.pill,
        backgroundColor: theme.success,
        alignItems: 'center',
    },
    declineText: {
        color: theme.error,
        fontWeight: '700',
        fontSize: 16,
    },
    acceptText: {
        color: theme.white,
        fontWeight: '700',
        fontSize: 16,
    }
});