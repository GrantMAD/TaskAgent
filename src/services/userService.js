import { supabase } from './supabaseClient'
import { notificationService } from './notificationService'

export const userService = {
    getUserProfile: async (userId) => {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .maybeSingle()
        if (error) throw error
        return data
    },

    updateUserProfile: async (userId, updates) => {
        const { data, error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', userId)
        if (error) throw error
        return data
    },

    getUserReviews: async (userId) => {
        const { data, error } = await supabase
            .from('reviews')
            .select('*, reviewer:users!reviewer_id(id, name, profile_image)')
            .eq('reviewed_user_id', userId)
            .order('created_at', { ascending: false })
        if (error) throw error
        return data
    },

    submitReview: async (reviewData) => {
        const { data, error } = await supabase
            .from('reviews')
            .insert([reviewData])
            .select()
        if (error) throw error

        // Notify user about new review
        await notificationService.createNotification(
            reviewData.reviewed_user_id,
            'New Review',
            'You received a new rating!',
            'REVIEW',
            reviewData.task_id
        )

        return data[0]
    },

    // Upload profile image to avatars bucket
    uploadAvatar: async (userId, uri) => {
        try {
            const ext = uri.split('.').pop();
            const fileName = `${Date.now()}.${ext}`;
            const filePath = `${userId}/${fileName}`; // folder/file.ext

            // Fetch image and convert to blob
            const response = await fetch(uri);
            const blob = await response.blob();

            // Create form data or use array buffer
            // Supabase client can take blob directly in modern environments
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, blob, {
                    contentType: `image/${ext}`
                });

            if (uploadError) throw uploadError;

            // Get public URL
            const { data } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            return data.publicUrl;
        } catch (error) {
            console.error('Error uploading avatar:', error);
            throw error;
        }
    }
}
