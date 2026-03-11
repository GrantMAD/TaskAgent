import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { notificationService } from '../services/notificationService';
import { useToast } from './ToastContext';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const { showToast } = useToast();

    const fetchNotifications = useCallback(async (userId) => {
        if (!userId) return;
        setLoading(true);
        try {
            const data = await notificationService.getNotifications(userId);
            setNotifications(data);
            setUnreadCount(data.filter(n => !n.is_read).length);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        let subscription;
        let userId;

        const setup = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                userId = session.user.id;
                fetchNotifications(userId);

                subscription = notificationService.subscribeToNotifications(userId, (newNotif) => {
                    setNotifications(prev => [newNotif, ...prev]);
                    setUnreadCount(prev => prev + 1);
                    showToast(`New ${newNotif.title}`, 'info');
                });
            }
        };

        setup();

        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session) {
                userId = session.user.id;
                fetchNotifications(userId);
                if (subscription) subscription.unsubscribe();
                subscription = notificationService.subscribeToNotifications(userId, (newNotif) => {
                    setNotifications(prev => [newNotif, ...prev]);
                    setUnreadCount(prev => prev + 1);
                    showToast(`New ${newNotif.title}`, 'info');
                });
            } else if (event === 'SIGNED_OUT') {
                setNotifications([]);
                setUnreadCount(0);
                if (subscription) subscription.unsubscribe();
            }
        });

        return () => {
            if (subscription) subscription.unsubscribe();
            authListener?.subscription?.unsubscribe();
        };
    }, [fetchNotifications, showToast]);

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
            loading, 
            markAsRead, 
            markAllAsRead, 
            deleteNotification,
            refreshNotifications: () => {
                supabase.auth.getSession().then(({ data: { session } }) => {
                    if (session) fetchNotifications(session.user.id);
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
