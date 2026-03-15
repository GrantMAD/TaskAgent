import { supabase } from './supabaseClient'
import { notificationService } from './notificationService'
import { rateLimitService } from './rateLimitService'
import { sanitizeString } from '../utils/sanitization'

export const messageService = {
    getConversations: async (userId) => {
        const { data, error } = await supabase
            .from('conversations')
            .select(`
                *,
                task:tasks(title, poster_id, assigned_worker_id),
                user1:users!user1_id(id, name, profile_image),
                user2:users!user2_id(id, name, profile_image),
                last_message:messages!conversation_id(message_text, image_url, created_at, sender_id),
                unread_count:messages!conversation_id(count)
            `)
            .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
            .order('updated_at', { ascending: false });
        
        if (error) throw error;

        // Post-process to get the single last message and actual unread count
        // Note: Supabase's count/limit in select is tricky with joined tables, 
        // so we'll fetch them and handle the logic. 
        // For production scale, a view or RPC is better, but this works for now.
        return data.map(conv => {
            const messages = conv.last_message || [];
            const lastMsg = messages.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
            
            // Re-fetch unread count specifically for this user
            // (We'll do this in a separate step or via a more complex query if needed, 
            // but for now let's simplify)
            return {
                ...conv,
                last_message: lastMsg,
                // We'll calculate unread count in the screen or a separate service call 
                // to avoid complex join logic issues
            };
        });
    },

    getUnreadCount: async (conversationId, userId) => {
        const { count, error } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conversationId)
            .neq('sender_id', userId)
            .eq('is_read', false);
        
        if (error) throw error;
        return count || 0;
    },

    getConversation: async (conversationId) => {
        const { data, error } = await supabase
            .from('conversations')
            .select(`
                *,
                user1:users!user1_id(id, name, profile_image),
                user2:users!user2_id(id, name, profile_image),
                task:tasks(title)
            `)
            .eq('id', conversationId)
            .single();
        if (error) throw error;
        return data;
    },

    getMessages: async (conversationId, limit = 20, offset = 0) => {
        const { data, error } = await supabase
            .from('messages')
            .select('*, sender:users(id, name, profile_image)')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);
        
        if (error) throw error;
        // Return in chronological order for the UI, but we fetch newest first for pagination
        return data.reverse();
    },

    sendMessage: async (conversationId, senderId, text, imageUrl = null) => {
        const isRateLimited = await rateLimitService.checkRateLimit('messages', 'sender_id', senderId, 2);
        if (isRateLimited) {
            const error = new Error('Rate limit exceeded');
            error.code = 'RATE_LIMIT_EXCEEDED';
            throw error;
        }

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
                message_text: sanitizeString(text),
                image_url: imageUrl
            }])
            .select() // Added .select() to return the created record
            .single(); // Use .single() since we insert one record
        
        if (error) throw error

        if (otherId) {
            const notificationBody = text 
                ? (text.substring(0, 30) + (text.length > 30 ? '...' : ''))
                : 'Sent an image 📷';

            await notificationService.createNotification(
                otherId,
                'New Message',
                notificationBody,
                'MESSAGE',
                conversationId
            )
        }

        return data
    },

    getOrCreateConversation: async (taskId, user1Id, user2Id) => {
        // Try to find an existing conversation between these two users (ignoring task_id)
        const { data: existing, error: checkError } = await supabase
            .from('conversations')
            .select('*')
            .or(`and(user1_id.eq.${user1Id},user2_id.eq.${user2Id}),and(user1_id.eq.${user2Id},user2_id.eq.${user1Id})`)
            .maybeSingle();

        if (checkError) {
            console.error('Error checking for existing conversation:', checkError);
        }

        if (existing) {
            return existing;
        }

        // Create a new unique 1-on-1 conversation
        const { data, error } = await supabase
            .from('conversations')
            .insert([{ 
                user1_id: user1Id,
                user2_id: user2Id,
                task_id: taskId // Keep as reference for how they met, but won't be used for uniqueness anymore
            }])
            .select()
        if (error) throw error
        return data[0]
    },

    markMessagesAsRead: async (conversationId, userId) => {
        const { error } = await supabase
            .from('messages')
            .update({ is_read: true })
            .eq('conversation_id', conversationId)
            .neq('sender_id', userId)
            .eq('is_read', false);
        
        if (error) throw error;
    },

    uploadChatImage: async (userId, uri) => {
        try {
            const ext = uri.split('.').pop();
            const fileName = `${Date.now()}.${ext}`;
            const filePath = `${userId}/${fileName}`;

            const response = await fetch(uri);
            const blob = await response.blob();

            const { error: uploadError } = await supabase.storage
                .from('chat-images')
                .upload(filePath, blob, {
                    contentType: `image/${ext}`
                });

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
                .from('chat-images')
                .getPublicUrl(filePath);

            return data.publicUrl;
        } catch (error) {
            console.error('Error uploading chat image:', error);
            throw error;
        }
    }
}
