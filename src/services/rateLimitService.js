import { supabase } from './supabaseClient'

export const rateLimitService = {
    /**
     * Checks if a user has performed a specific action within a given timeframe.
     * @param {string} table - The table to check (e.g., 'messages', 'task_applications')
     * @param {string} userIdColumn - The column name for the user ID (e.g., 'sender_id', 'worker_id')
     * @param {string} userId - The ID of the user to check
     * @param {number} limitSeconds - The cooldown period in seconds
     * @returns {Promise<boolean>} - Returns true if rate limit is exceeded, false otherwise
     */
    checkRateLimit: async (table, userIdColumn, userId, limitSeconds) => {
        const cooldownDate = new Date(Date.now() - limitSeconds * 1000).toISOString();
        
        const { data, error } = await supabase
            .from(table)
            .select('id')
            .eq(userIdColumn, userId)
            .gt('created_at', cooldownDate)
            .limit(1);

        if (error) {
            console.error(`Rate limit check error for ${table}:`, error);
            return false; // Fail open to not block users on DB errors
        }

        return data.length > 0;
    },

    /**
     * Checks if a user has reached the maximum number of active tasks.
     * @param {string} userId - The ID of the user to check
     * @param {number} maxTasks - The maximum number of allowed active tasks
     * @returns {Promise<boolean>} - Returns true if limit is reached, false otherwise
     */
    checkTaskLimit: async (userId, maxTasks = 5) => {
        const { count, error } = await supabase
            .from('tasks')
            .select('*', { count: 'exact', head: true })
            .eq('poster_id', userId)
            .in('status', ['OPEN', 'ASSIGNED', 'PENDING_CONFIRMATION']);

        if (error) {
            console.error('Task limit check error:', error);
            return false;
        }

        return count >= maxTasks;
    }
}
