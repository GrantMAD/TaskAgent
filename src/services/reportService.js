import { supabase } from './supabaseClient';

export const reportService = {
    /**
     * Submit a report for a user or a task
     * @param {Object} reportData 
     * @param {string} reportData.reporter_id - The user ID of the person reporting
     * @param {string} [reportData.reported_user_id] - The user ID being reported (optional if task is reported)
     * @param {string} [reportData.reported_task_id] - The task ID being reported (optional if user is reported)
     * @param {string} reportData.reason - The reason for reporting
     * @param {string} [reportData.details] - Additional details
     */
    submitReport: async (reportData) => {
        const { data, error } = await supabase
            .from('reports')
            .insert([reportData])
            .select();
        
        if (error) throw error;
        return data[0];
    }
};
