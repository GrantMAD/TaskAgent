import { supabase } from './supabaseClient'
import { notificationService } from './notificationService'

export const taskService = {
    uploadTaskImage: async (uri, userId) => {
        try {
            const ext = uri.split('.').pop();
            const fileName = `${userId}/${Date.now()}.${ext}`;
            const filePath = `tasks/${fileName}`;

            // Convert URI to Blob
            const response = await fetch(uri);
            const blob = await response.blob();

            const { error: uploadError } = await supabase.storage
                .from('task-media')
                .upload(filePath, blob);

            if (uploadError) throw uploadError;

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('task-media')
                .getPublicUrl(filePath);

            return publicUrl;
        } catch (error) {
            console.error('Upload error:', error);
            throw error;
        }
    },

    createTask: async (taskData) => {
        const { data, error } = await supabase.from('tasks').insert([taskData]).select()
        if (error) throw error
        return data[0]
    },

    getNearbyTasks: async () => {
        // In a real app we'd filter by distance, for now get all OPEN tasks
        const { data, error } = await supabase
            .from('tasks')
            .select('*, poster:users!poster_id(id, name, profile_image, rating)')
            .eq('status', 'OPEN')
            .order('created_at', { ascending: false })
        if (error) throw error
        return data
    },

    getTaskDetails: async (taskId) => {
        const { data, error } = await supabase
            .from('tasks')
            .select('*, poster:users!poster_id(id, name, profile_image, rating)')
            .eq('id', taskId)
            .single()
        if (error) throw error
        return data
    },

    getTaskApplications: async (taskId) => {
        const { data, error } = await supabase
            .from('task_applications')
            .select('*, worker:users!worker_id(id, name, profile_image, rating)')
            .eq('task_id', taskId)
        if (error) throw error
        return data
    },

    getMyAssignedTasks: async (workerId) => {
        const { data, error } = await supabase
            .from('tasks')
            .select('*, poster:users!poster_id(id, name, profile_image, rating)')
            .eq('assigned_worker_id', workerId)
            .in('status', ['ASSIGNED', 'PENDING_CONFIRMATION'])
            .order('created_at', { ascending: false })
        if (error) throw error
        return data
    },

    getMyPostedTasks: async (posterId) => {
        const { data, error } = await supabase
            .from('tasks')
            .select('*, worker:users!assigned_worker_id(id, name, profile_image, rating)')
            .eq('poster_id', posterId)
            .in('status', ['ASSIGNED', 'PENDING_CONFIRMATION'])
            .order('created_at', { ascending: false })
        if (error) throw error
        return data
    },

    getTaskHistory: async (userId) => {
        const { data, error } = await supabase
            .from('tasks')
            .select('*, poster:users!poster_id(id, name, profile_image, rating), worker:users!assigned_worker_id(id, name, profile_image, rating)')
            .eq('status', 'COMPLETED')
            .or(`poster_id.eq.${userId},assigned_worker_id.eq.${userId}`)
            .order('created_at', { ascending: false })
        if (error) throw error
        return data
    },

    applyForTask: async (taskId, workerId, message) => {
        // Fetch poster_id for notification
        const { data: task, error: fetchError } = await supabase
            .from('tasks')
            .select('poster_id')
            .eq('id', taskId)
            .single()
        
        if (fetchError) throw fetchError

        const { data, error } = await supabase
            .from('task_applications')
            .insert([{ task_id: taskId, worker_id: workerId, message }])
        if (error) throw error

        await notificationService.createNotification(
            task.poster_id,
            'New Application',
            'Someone applied for your job...',
            'APPLICATION',
            taskId
        )

        return data
    },

    assignWorker: async (taskId, workerId) => {
        // Fetch title for notification
        const { data: task, error: fetchError } = await supabase
            .from('tasks')
            .select('title')
            .eq('id', taskId)
            .single()
        
        if (fetchError) throw fetchError

        const { data, error } = await supabase
            .from('tasks')
            .update({ assigned_worker_id: workerId, status: 'ASSIGNED' })
            .eq('id', taskId)
        if (error) throw error

        await notificationService.createNotification(
            workerId,
            'You are hired!',
            `You have been assigned to: ${task.title}`,
            'HIRED',
            taskId
        )

        return data
    },

    markTaskComplete: async (taskId, completionImageUrl = null) => {
        // Fetch poster_id and title for notification
        const { data: task, error: fetchError } = await supabase
            .from('tasks')
            .select('poster_id, title')
            .eq('id', taskId)
            .single()
        
        if (fetchError) throw fetchError

        const { data, error } = await supabase
            .from('tasks')
            .update({ 
                status: 'PENDING_CONFIRMATION',
                completion_image_url: completionImageUrl
            })
            .eq('id', taskId)
        if (error) throw error

        await notificationService.createNotification(
            task.poster_id,
            'Work Submitted',
            `Tasker marked ${task.title} as complete.`,
            'COMPLETED',
            taskId
        )

        return data
    },

    confirmCompletion: async (taskId) => {
        // Fetch worker_id and title for notification
        const { data: task, error: fetchError } = await supabase
            .from('tasks')
            .select('assigned_worker_id, title')
            .eq('id', taskId)
            .single()
        
        if (fetchError) throw fetchError

        const { data, error } = await supabase
            .from('tasks')
            .update({ status: 'COMPLETED' })
            .eq('id', taskId)
        if (error) throw error

        await notificationService.createNotification(
            task.assigned_worker_id,
            'Payment Released',
            `Job ${task.title} is officially complete!`,
            'COMPLETED',
            taskId
        )

        return data
    },

    cancelTask: async (taskId) => {
        const { data, error } = await supabase
            .from('tasks')
            .update({ status: 'CANCELLED' })
            .eq('id', taskId)
        if (error) throw error
        return data
    }
}
