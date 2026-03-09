import { supabase } from './supabaseClient'

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
        return data[0]
    }
}
