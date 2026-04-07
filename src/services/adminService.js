import { supabase } from './supabaseClient';
import { TASK_STATUS } from '../utils/constants';

export const adminService = {
    /**
     * Get top-level dashboard statistics
     */
    getDashboardStats: async () => {
        const [
            { count: userCount, error: userError },
            { count: taskCount, error: taskError },
            { count: reportCount, error: reportError }
        ] = await Promise.all([
            supabase.from('users').select('*', { count: 'exact', head: true }),
            supabase.from('tasks').select('*', { count: 'exact', head: true }).neq('status', TASK_STATUS.COMPLETED),
            supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'PENDING')
        ]);

        if (userError) throw userError;
        if (taskError) throw taskError;
        if (reportError) throw reportError;

        return {
            totalUsers: userCount || 0,
            activeTasks: taskCount || 0,
            pendingReports: reportCount || 0
        };
    },

    /**
     * Get all users
     */
    getAllUsers: async () => {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    /**
     * Get all active tasks
     */
    getAllTasks: async () => {
        const { data, error } = await supabase
            .from('tasks')
            .select('*, poster:users!poster_id(name)')
            .neq('status', TASK_STATUS.COMPLETED)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    /**
     * Get list of reports
     */
    getReports: async (pendingOnly = true) => {
        let query = supabase
            .from('reports')
            .select(`
                *,
                reporter:users!reporter_id(name),
                reported_user:users!reported_user_id(name),
                reported_task:tasks!reported_task_id(title)
            `);
        
        if (pendingOnly) {
            query = query.eq('status', 'PENDING');
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    /**
     * Update a report's status
     */
    updateReportStatus: async (reportId, status, resolutionText = null) => {
        const updateData = { status };
        if (resolutionText) {
            updateData.resolution_text = resolutionText;
            updateData.resolution_at = new Date().toISOString();
        }

        const { data, error } = await supabase
            .from('reports')
            .update(updateData)
            .eq('id', reportId)
            .select();

        if (error) throw error;
        return data[0];
    },

    /**
     * Get user platform stats (created vs completed tasks)
     */
    getUserStats: async (userId) => {
        const [
            { count: createdCount, error: createdError },
            { count: completedCount, error: completedError }
        ] = await Promise.all([
            supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('poster_id', userId),
            supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('assigned_worker_id', userId).eq('status', TASK_STATUS.COMPLETED)
        ]);

        if (createdError) throw createdError;
        if (completedError) throw completedError;

        return {
            createdTasks: createdCount || 0,
            completedTasks: completedCount || 0
        };
    },

    /**
     * Suspend or reactivate a user account
     */
    updateUserSuspension: async (userId, isSuspended, suspensionReason = null) => {
        const { data, error } = await supabase
            .from('users')
            .update({ 
                is_suspended: isSuspended,
                suspension_reason: suspensionReason
            })
            .eq('id', userId)
            .select();

        if (error) throw error;
        return data[0];
    },

    /**
     * Get detailed analytics for the platform
     */
    getDetailedAnalytics: async () => {
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

        const [
            { count: newUsers7d, error: u7Error },
            { count: newUsers30d, error: u30Error },
            { count: totalTasks, error: tError },
            { count: completedTasks, error: cError },
            { data: budgetData, error: bError },
            avgReplyTime
        ] = await Promise.all([
            supabase.from('users').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
            supabase.from('users').select('*', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo),
            supabase.from('tasks').select('*', { count: 'exact', head: true }),
            supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', TASK_STATUS.COMPLETED),
            supabase.from('tasks').select('payment_amount'),
            adminService.calculatePlatformAvgReplyTime()
        ]);

        if (u7Error) throw u7Error;
        if (u30Error) throw u30Error;
        if (tError) throw tError;
        if (cError) throw cError;
        if (bError) throw bError;

        const avgBudget = budgetData.length > 0 
            ? budgetData.reduce((sum, item) => sum + (Number(item.payment_amount) || 0), 0) / budgetData.length 
            : 0;

        return {
            newUsers7d: newUsers7d || 0,
            newUsers30d: newUsers30d || 0,
            totalTasks: totalTasks || 0,
            completedTasks: completedTasks || 0,
            completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
            avgBudget: avgBudget.toFixed(2),
            avgReplyTime
        };
    },

    /**
     * Calculate platform-wide average reply time
     */
    calculatePlatformAvgReplyTime: async () => {
        try {
            const { data: messages, error } = await supabase
                .from('messages')
                .select('conversation_id, sender_id, created_at')
                .order('created_at', { ascending: true })
                .limit(1000); // Sample last 1k messages for performance

            if (error || !messages || messages.length === 0) return 'N/A';

            let totalDiff = 0;
            let count = 0;

            const grouped = messages.reduce((acc, msg) => {
                if (!acc[msg.conversation_id]) acc[msg.conversation_id] = [];
                acc[msg.conversation_id].push(msg);
                return acc;
            }, {});

            Object.values(grouped).forEach(msgs => {
                for (let i = 0; i < msgs.length - 1; i++) {
                    if (msgs[i].sender_id !== msgs[i+1].sender_id) {
                        const start = new Date(msgs[i].created_at);
                        const end = new Date(msgs[i+1].created_at);
                        totalDiff += (end - start) / (1000 * 60);
                        count++;
                    }
                }
            });

            if (count === 0) return 'N/A';
            const avg = totalDiff / count;
            
            if (avg < 60) return `${Math.round(avg)}m`;
            if (avg < 1440) return `${Math.round(avg / 60)}h`;
            return `${Math.round(avg / 1440)}d`;
        } catch {
            return 'N/A';
        }
    },

    /**
     * Get task distribution by category
     */
    getCategoryStats: async () => {
        const { data, error } = await supabase
            .from('tasks')
            .select('category');

        if (error) throw error;

        const stats = data.reduce((acc, item) => {
            const cat = item.category || 'Other';
            acc[cat] = (acc[cat] || 0) + 1;
            return acc;
        }, {});

        // Convert to array and sort by count
        return Object.entries(stats)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
    },

    /**
     * Get market insights (Supply vs Demand gaps)
     * Queries the market_service_gaps view.
     */
    getMarketInsights: async () => {
        const { data, error } = await supabase
            .from('market_service_gaps')
            .select('*');
        
        if (error) throw error;
        return data;
    },

    /**
     * Get platform-wide reputation and trust analytics
     */
    getReputationAnalytics: async () => {
        try {
            // Fetch all users with at least one completed task to calculate reputation distribution
            const { data: users, error: userError } = await supabase
                .from('users')
                .select('id, name, profile_image, rating, completed_tasks')
                .gt('completed_tasks', 0)
                .order('rating', { ascending: false })
                .limit(100);

            if (userError) throw userError;

            // Note: Since reliability scores are calculated on-the-fly in the service,
            // for global admin stats we'll sample the Top 10 users and calculate their 
            // full reliability reports to show "Superstars"
            const { reliabilityService } = require('./reliabilityService');
            
            const superstarPromises = users.slice(0, 5).map(async (u) => {
                const report = await reliabilityService.getUserReliability(u.id);
                return {
                    ...u,
                    reliability: report
                };
            });

            const superstars = await Promise.all(superstarPromises);

            // Calculate distribution based on Star Ratings (since we can't batch-calculate 
            // 100+ composite scores efficiently without a DB function)
            const distribution = {
                exceptional: users.filter(u => u.rating >= 4.8).length,
                high: users.filter(u => u.rating >= 4.0 && u.rating < 4.8).length,
                consistent: users.filter(u => u.rating >= 3.0 && u.rating < 4.0).length,
                low: users.filter(u => u.rating < 3.0).length
            };

            const avgRating = users.length > 0 
                ? users.reduce((sum, u) => sum + u.rating, 0) / users.length 
                : 0;

            return {
                avgRating: avgRating.toFixed(1),
                totalActiveWorkers: users.length,
                distribution,
                superstars
            };
        } catch (error) {
            console.error('Reputation Analytics Error:', error);
            throw error;
        }
    }
};
