import { supabase } from './supabaseClient';
import { notificationService } from './notificationService';

export const disputeService = {
    /**
     * Raise a new dispute for a task
     * @param {Object} disputeData 
     */
    raiseDispute: async (disputeData) => {
        const { task_id, task_title, raised_by_id, reason, details, other_party_id } = disputeData;

        // 1. Create the dispute record
        const { data, error: disputeError } = await supabase
            .from('disputes')
            .insert([{
                task_id,
                raised_by_id,
                reason,
                details,
                status: 'PENDING'
            }])
            .select();

        if (disputeError) throw disputeError;

        // 2. Update the task status to DISPUTED
        const { error: taskError } = await supabase
            .from('tasks')
            .update({ status: 'DISPUTED' })
            .eq('id', task_id);

        if (taskError) throw taskError;

        // 3. Notify the other party
        if (other_party_id) {
            await notificationService.createNotification(
                other_party_id,
                'Dispute Raised',
                `A dispute has been raised on task "${task_title || task_id}". An admin will review it shortly.`,
                'dispute_raised',
                task_id
            );
        }

        return data[0];
    },

    /**
     * Get dispute details for a specific task
     * @param {string} taskId 
     */
    getTaskDispute: async (taskId) => {
        const { data, error } = await supabase
            .from('disputes')
            .select(`
                *,
                raised_by:users!raised_by_id(id, name, profile_image)
            `)
            .eq('task_id', taskId)
            .order('created_at', { ascending: false })
            .limit(1);

        if (error) throw error;
        return data[0];
    }
};
