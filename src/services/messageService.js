import { supabase } from './supabaseClient'
import { notificationService } from './notificationService'

export const messageService = {
    getConversations: async (userId) => {
        // A real app would join tasks and users to get rich conversation data
        const { data, error } = await supabase
            .from('conversations')
            .select('*, task:tasks(title, poster_id, assigned_worker_id)')
        // we'd typically filter where user is poster or worker
        if (error) throw error
        return data
    },

    getMessages: async (conversationId) => {
        const { data, error } = await supabase
            .from('messages')
            .select('*, sender:users(id, name, profile_image)')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true })
        if (error) throw error
        return data
    },

    sendMessage: async (conversationId, senderId, text, imageUrl = null) => {
        // Fetch conversation to find the other_user_id
        const { data: conv, error: convError } = await supabase
            .from('conversations')
            .select('*, task:tasks(poster_id, assigned_worker_id)')
            .eq('id', conversationId)
            .single()
        
        if (convError) throw convError

        // Determine recipient
        let otherId = conv.user1_id === senderId ? conv.user2_id : conv.user1_id;
        if (!otherId && conv.task) {
            otherId = conv.task.poster_id === senderId ? conv.task.assigned_worker_id : conv.task.poster_id;
        }

        const { data, error } = await supabase
            .from('messages')
            .insert([{
                conversation_id: conversationId,
                sender_id: senderId,
                message_text: text,
                image_url: imageUrl
            }])
        if (error) throw error

        if (otherId) {
            await notificationService.createNotification(
                otherId,
                'New Message',
                text.substring(0, 30) + (text.length > 30 ? '...' : ''),
                'MESSAGE',
                conversationId
            )
        }

        return data
    },

    createConversation: async (taskId) => {
        const { data, error } = await supabase
            .from('conversations')
            .insert([{ task_id: taskId }])
            .select()
        if (error) throw error
        return data[0]
    }
}
