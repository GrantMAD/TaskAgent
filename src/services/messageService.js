import { supabase } from './supabaseClient'

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
        const { data, error } = await supabase
            .from('messages')
            .insert([{
                conversation_id: conversationId,
                sender_id: senderId,
                message_text: text,
                image_url: imageUrl
            }])
        if (error) throw error
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
