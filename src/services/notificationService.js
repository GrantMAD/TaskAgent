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
            .channel(`public:notifications:user_id=eq.${userId}`)
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
    }
}
