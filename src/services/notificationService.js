import { supabase } from './supabaseClient'

export const notificationService = {
    // Get all notifications for a specific user
    getNotifications: async (userId) => {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
        
        if (error) throw error
        return data
    },

    // Mark a notification as read
    markAsRead: async (notificationId) => {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notificationId)
        
        if (error) throw error
    },

    // Mark all notifications as read for a user
    markAllAsRead: async (userId) => {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', userId)
            .eq('is_read', false)
        
        if (error) throw error
    },

    // Create a new notification (Helper)
    createNotification: async (userId, title, message, type, relatedId = null) => {
        const { error } = await supabase
            .from('notifications')
            .insert([{
                user_id: userId,
                title,
                message,
                type,
                related_id: relatedId
            }]);
        
        if (error) throw error;
    },

    // Delete a notification
    deleteNotification: async (notificationId) => {
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', notificationId)
        
        if (error) throw error
    },

    // Subscribe to real-time notifications
    subscribeToNotifications: (userId, onNewNotification) => {
        return supabase
            .channel(`notifications:${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => {
                    onNewNotification(payload.new)
                }
            )
            .subscribe()
    },

    // Send a direct push notification via the Edge Function without creating an in-app record
    sendDirectPushNotification: async (userId, title, body, type, data = {}) => {
        try {
            // Get user's push token
            const { data: user, error: userError } = await supabase
                .from('users')
                .select('push_token')
                .eq('id', userId)
                .single();

            if (userError || !user?.push_token) return;

            // Trigger the push notification Edge Function directly
            // Note: The Edge Function currently expects a record from the notifications table
            // However, we can call it manually with a similar payload
            const response = await fetch('https://ejpjdinrwxodpizgybui.supabase.co/functions/v1/push-notifications', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqcGpkaW5yd3hvZHBpemd5YnVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNjE4NDIsImV4cCI6MjA4ODYzNzg0Mn0.kEO68nOssVBc5eFcBhSUhJ9I3cGkYevDyPqFLj81kOE`
                },
                body: JSON.stringify({
                    record: {
                        user_id: userId,
                        title,
                        body,
                        type,
                        ...data
                    }
                })
            });

            if (!response.ok) {
                console.error('Failed to send direct push notification:', await response.text());
            }
        } catch (error) {
            console.error('Error sending direct push notification:', error);
        }
    }
}
