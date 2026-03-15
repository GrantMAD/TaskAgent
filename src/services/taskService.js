import { supabase } from './supabaseClient'
import { notificationService } from './notificationService'
import * as ImageManipulator from 'expo-image-manipulator';

export const taskService = {
    uploadTaskImage: async (uri, userId) => {
        try {
            // 1. Optimize image (compress and resize)
            const result = await ImageManipulator.manipulateAsync(
                uri,
                [{ resize: { width: 1200 } }], // Resize to max 1200px width
                { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
            );

            const optimizedUri = result.uri;
            const ext = optimizedUri.split('.').pop();
            const fileName = `${userId}/${Date.now()}.${ext}`;
            const filePath = `tasks/${fileName}`;

            // 2. Convert Optimized URI to Blob
            const response = await fetch(optimizedUri);
            const blob = await response.blob();

            const { error: uploadError } = await supabase.storage
                .from('task-media')
                .upload(filePath, blob);

            if (uploadError) throw uploadError;

            // 3. Get Public URL
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
    },

    // Recurring Tasks
    createTaskTemplate: async (templateData) => {
        const { data, error } = await supabase
            .from('task_templates')
            .insert([templateData])
            .select()
        if (error) throw error
        return data[0]
    },

    getMyRecurringTemplates: async (posterId) => {
        const { data, error } = await supabase
            .from('task_templates')
            .select('*')
            .eq('poster_id', posterId)
            .order('created_at', { ascending: false })
        if (error) throw error
        return data
    },

    updateTaskTemplate: async (templateId, updateData) => {
        const { data, error } = await supabase
            .from('task_templates')
            .update(updateData)
            .eq('id', templateId)
            .select()
        if (error) throw error
        return data[0]
    },

    deleteTaskTemplate: async (templateId) => {
        const { error } = await supabase
            .from('task_templates')
            .delete()
            .eq('id', templateId)
        if (error) throw error
    },

    calculateNextOccurrence: (frequency, lastDate = new Date()) => {
        const next = new Date(lastDate);
        switch (frequency) {
            case 'daily':
                next.setDate(next.getDate() + 1);
                break;
            case 'weekly':
                next.setDate(next.getDate() + 7);
                break;
            case 'bi-weekly':
                next.setDate(next.getDate() + 14);
                break;
            case 'monthly':
                next.setMonth(next.getMonth() + 1);
                break;
            default:
                break;
        }
        return next;
    },

    processRecurringTasks: async () => {
        try {
            const now = new Date().toISOString();
            // Get all active templates where next_occurrence_at is due (lte now) or null (first time)
            const { data: templates, error: fetchError } = await supabase
                .from('task_templates')
                .select('*')
                .eq('is_active', true)
                .or(`next_occurrence_at.lte.${now},next_occurrence_at.is.null`)

            if (fetchError) throw fetchError;
            if (!templates || templates.length === 0) return;

            for (const template of templates) {
                // Determine if this is the first instance or a recurrence
                const isFirstInstance = !template.last_generated_at;
                
                // If it's a recurrence, we need to find the last hired worker
                let previousWorkerId = null;
                if (!isFirstInstance) {
                    const { data: lastTasks } = await supabase
                        .from('tasks')
                        .select('assigned_worker_id')
                        .eq('parent_template_id', template.id)
                        .not('assigned_worker_id', 'is', null)
                        .order('created_at', { ascending: false })
                        .limit(1);
                    
                    if (lastTasks && lastTasks.length > 0) {
                        previousWorkerId = lastTasks[0].assigned_worker_id;
                    }
                }

                // Generate the task instance
                const taskData = {
                    poster_id: template.poster_id,
                    title: template.title,
                    description: template.description,
                    category: template.category,
                    payment_amount: template.payment_amount,
                    address: template.address,
                    location_lat: template.location_lat,
                    location_lng: template.location_lng,
                    image_url: template.image_url,
                    parent_template_id: template.id,
                    status: isFirstInstance ? 'OPEN' : 'PENDING_APPROVAL'
                };

                const { data: newTask, error: insertError } = await supabase
                    .from('tasks')
                    .insert([taskData])
                    .select()
                    .single();

                if (insertError) {
                    console.error(`Error generating task for template ${template.id}:`, insertError);
                    continue;
                }

                // If it's a recurrence, notify the poster to approve it
                if (!isFirstInstance) {
                    await notificationService.createNotification(
                        template.poster_id,
                        'Approve Recurring Task',
                        `Your recurring task "${template.title}" is due. Tap to approve and choose a worker.`,
                        'RECURRING_APPROVAL',
                        newTask.id
                    );
                }

                // Update template for next run
                const lastRefDate = template.next_occurrence_at ? new Date(template.next_occurrence_at) : new Date();
                const nextDate = taskService.calculateNextOccurrence(template.frequency, lastRefDate);
                
                // Check if we passed the end_date
                const isActive = template.end_date ? new Date(nextDate) <= new Date(template.end_date) : true;

                await supabase
                    .from('task_templates')
                    .update({
                        last_generated_at: now,
                        next_occurrence_at: nextDate.toISOString(),
                        is_active: isActive
                    })
                    .eq('id', template.id);
            }
        } catch (error) {
            console.error('Error processing recurring tasks:', error);
        }
    },

    approveRecurringTask: async (taskId, workerId = null) => {
        const { data: task, error: fetchError } = await supabase
            .from('tasks')
            .select('title, poster_id')
            .eq('id', taskId)
            .single();
        
        if (fetchError) throw fetchError;

        if (workerId) {
            // Re-hiring the same person
            const { error } = await supabase
                .from('tasks')
                .update({ 
                    assigned_worker_id: workerId, 
                    status: 'INVITED' 
                })
                .eq('id', taskId);
            
            if (error) throw error;

            await notificationService.createNotification(
                workerId,
                'Recurring Task Invitation',
                `You have been invited back for: ${task.title}. Would you like to accept?`,
                'RECURRING_INVITATION',
                taskId
            );
        } else {
            // Posting publicly
            const { error } = await supabase
                .from('tasks')
                .update({ 
                    assigned_worker_id: null, 
                    status: 'OPEN' 
                })
                .eq('id', taskId);
            
            if (error) throw error;
        }
    },

    respondToRecurringInvitation: async (taskId, accept) => {
        const { data: task, error: fetchError } = await supabase
            .from('tasks')
            .select('title, poster_id, assigned_worker_id')
            .eq('id', taskId)
            .single();
        
        if (fetchError) throw fetchError;

        if (accept) {
            // Worker accepted
            const { error } = await supabase
                .from('tasks')
                .update({ status: 'ASSIGNED' })
                .eq('id', taskId);
            
            if (error) throw error;

            await notificationService.createNotification(
                task.poster_id,
                'Invitation Accepted',
                `The worker has accepted your recurring task: ${task.title}`,
                'INVITATION_ACCEPTED',
                taskId
            );
        } else {
            // Worker declined - post publicly
            const { error } = await supabase
                .from('tasks')
                .update({ 
                    assigned_worker_id: null, 
                    status: 'OPEN' 
                })
                .eq('id', taskId);
            
            if (error) throw error;

            await notificationService.createNotification(
                task.poster_id,
                'Invitation Declined',
                `The worker declined your recurring task. It is now posted publicly: ${task.title}`,
                'INVITATION_DECLINED',
                taskId
            );
        }
    },

    // Saved / Favorited Tasks
    getSavedTaskIds: async (userId) => {
        const { data, error } = await supabase
            .from('saved_tasks')
            .select('task_id')
            .eq('user_id', userId);
        
        if (error) throw error;
        return data.map(item => item.task_id);
    },

    getSavedTasks: async (userId) => {
        const { data, error } = await supabase
            .from('saved_tasks')
            .select('task:tasks(*, poster:users!poster_id(id, name, profile_image, rating))')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        // Flatten the structure
        return data.map(item => item.task).filter(Boolean);
    },

    toggleSaveTask: async (userId, taskId, isCurrentlySaved) => {
        if (isCurrentlySaved) {
            const { error } = await supabase
                .from('saved_tasks')
                .delete()
                .eq('user_id', userId)
                .eq('task_id', taskId);
            if (error) throw error;
            return false;
        } else {
            const { error } = await supabase
                .from('saved_tasks')
                .insert([{ user_id: userId, task_id: taskId }]);
            if (error) throw error;
            return true;
        }
    },

    subscribeToTasks: (callback) => {
        return supabase
            .channel('tasks_channel')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'tasks'
            }, (payload) => {
                callback(payload);
            })
            .subscribe();
    },

    subscribeToTaskApplications: (taskId, callback) => {
        return supabase
            .channel(`task_apps_${taskId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'task_applications',
                filter: `task_id=eq.${taskId}`
            }, (payload) => {
                callback(payload);
            })
            .subscribe();
    }
}
