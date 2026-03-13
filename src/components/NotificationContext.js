import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { notificationService } from '../services/notificationService';
import { useToast } from './ToastContext';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const { showToast } = useToast();

    const fetchCounts = useCallback(async (userId) => {
        if (!userId) return;
        setLoading(true);
        try {
            // Fetch notification unread count
            const { count: notifCount, error: notifError } = await supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('is_read', false);
            
            if (notifError) throw notifError;
            setUnreadCount(notifCount || 0);

            // Fetch message unread count
            // Note: We need to know which conversations the user is in to be perfectly accurate,
            // but we can also just count messages where is_read is false and sender_id is NOT us,
            // AND the message belongs to a conversation where we are user1 or user2.
            // A simpler way is to use an RPC or just fetch our conversations and sum counts.
            const { data: convs, error: convError } = await supabase
                .from('conversations')
                .select('id')
                .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);
            
            if (convError) throw convError;
            
            if (convs && convs.length > 0) {
                const convIds = convs.map(c => c.id);
                const { count: msgCount, error: msgError } = await supabase
                    .from('messages')
                    .select('*', { count: 'exact', head: true })
                    .in('conversation_id', convIds)
                    .neq('sender_id', userId)
                    .eq('is_read', false);
                
                if (msgError) throw msgError;
                setUnreadMessagesCount(msgCount || 0);
            } else {
                setUnreadMessagesCount(0);
            }
        } catch (error) {
            console.error('Error fetching counts:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchNotifications = useCallback(async (userId) => {
        if (!userId) return;
        try {
            const data = await notificationService.getNotifications(userId);
            setNotifications(data);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    }, []);

    useEffect(() => {
        let notifSub;
        let msgSub;
        let userId;

        const setup = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                userId = session.user.id;
                fetchCounts(userId);
                fetchNotifications(userId);

                notifSub = notificationService.subscribeToNotifications(userId, (newNotif) => {
                    setNotifications(prev => [newNotif, ...prev]);
                    setUnreadCount(prev => prev + 1);
                    showToast(`New ${newNotif.title}`, 'info');
                });

                // Subscribe to messages for badge updates
                msgSub = supabase
                    .channel('global-message-unread')
                    .on('postgres_changes', { 
                        event: '*', 
                        schema: 'public', 
                        table: 'messages' 
                    }, () => {
                        // Refresh counts when any message changes
                        // (Ideally we'd filter by user's conversations, but for badge, a quick re-fetch is okay)
                        fetchCounts(userId);
                    })
                    .subscribe();
            }
        };

        setup();

        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session) {
                userId = session.user.id;
                fetchCounts(userId);
                fetchNotifications(userId);
                if (notifSub) notifSub.unsubscribe();
                if (msgSub) supabase.removeChannel(msgSub);
                
                notifSub = notificationService.subscribeToNotifications(userId, (newNotif) => {
                    setNotifications(prev => [newNotif, ...prev]);
                    setUnreadCount(prev => prev + 1);
                    showToast(`New ${newNotif.title}`, 'info');
                });

                msgSub = supabase
                    .channel('global-message-unread')
                    .on('postgres_changes', { 
                        event: '*', 
                        schema: 'public', 
                        table: 'messages' 
                    }, () => {
                        fetchCounts(userId);
                    })
                    .subscribe();
            } else if (event === 'SIGNED_OUT') {
                setNotifications([]);
                setUnreadCount(0);
                setUnreadMessagesCount(0);
                if (notifSub) notifSub.unsubscribe();
                if (msgSub) supabase.removeChannel(msgSub);
            }
        });

        return () => {
            if (notifSub) notifSub.unsubscribe();
            if (msgSub) supabase.removeChannel(msgSub);
            authListener?.subscription?.unsubscribe();
        };
    }, [fetchCounts, fetchNotifications, showToast]);

    // Optimistic Actions
    const markAsRead = async (id) => {
        const previousNotifs = [...notifications];
        const target = notifications.find(n => n.id === id);
        if (!target || target.is_read) return;

        // Optimistic UI
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));

        try {
            await notificationService.markAsRead(id);
        } catch (error) {
            setNotifications(previousNotifs);
            setUnreadCount(previousNotifs.filter(n => !n.is_read).length);
            showToast('Failed to update notification', 'error');
        }
    };

    const markAllAsRead = async () => {
        const previousNotifs = [...notifications];
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // Optimistic UI
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);

        try {
            await notificationService.markAllAsRead(session.user.id);
        } catch (error) {
            setNotifications(previousNotifs);
            setUnreadCount(previousNotifs.filter(n => !n.is_read).length);
            showToast('Failed to mark all as read', 'error');
        }
    };

    const deleteNotification = async (id) => {
        const previousNotifs = [...notifications];
        const target = notifications.find(n => n.id === id);
        if (!target) return;

        // Optimistic UI
        setNotifications(prev => prev.filter(n => n.id !== id));
        if (!target.is_read) {
            setUnreadCount(prev => Math.max(0, prev - 1));
        }

        try {
            await notificationService.deleteNotification(id);
            showToast('Notification deleted', 'info');
        } catch (error) {
            setNotifications(previousNotifs);
            setUnreadCount(previousNotifs.filter(n => !n.is_read).length);
            showToast('Failed to delete notification', 'error');
        }
    };

    return (
        <NotificationContext.Provider value={{ 
            notifications, 
            unreadCount, 
            unreadMessagesCount,
            loading, 
            markAsRead, 
            markAllAsRead, 
            deleteNotification,
            refreshNotifications: () => {
                supabase.auth.getSession().then(({ data: { session } }) => {
                    if (session) {
                        fetchNotifications(session.user.id);
                        fetchCounts(session.user.id);
                    }
                });
            }
        }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};
