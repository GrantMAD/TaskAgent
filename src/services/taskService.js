import { supabase } from './supabaseClient'

export const taskService = {
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

    applyForTask: async (taskId, workerId, message) => {
        const { data, error } = await supabase
            .from('task_applications')
            .insert([{ task_id: taskId, worker_id: workerId, message }])
        if (error) throw error
        return data
    },

    assignWorker: async (taskId, workerId) => {
        const { data, error } = await supabase
            .from('tasks')
            .update({ assigned_worker_id: workerId, status: 'ASSIGNED' })
            .eq('id', taskId)
        if (error) throw error
        return data
    },

    markTaskComplete: async (taskId) => {
        const { data, error } = await supabase
            .from('tasks')
            .update({ status: 'PENDING_CONFIRMATION' })
            .eq('id', taskId)
        if (error) throw error
        return data
    },

    confirmCompletion: async (taskId) => {
        const { data, error } = await supabase
            .from('tasks')
            .update({ status: 'COMPLETED' })
            .eq('id', taskId)
        if (error) throw error
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
