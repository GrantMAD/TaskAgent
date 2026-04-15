import { supabase } from './supabaseClient'
import { notificationService } from './notificationService'
import { rateLimitService } from './rateLimitService'
import { sanitizeString, sanitizeObject } from '../utils/sanitization'
import * as ImageManipulator from 'expo-image-manipulator';
import { TASK_STATUS } from '../utils/constants';

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
        const isLimitReached = await rateLimitService.checkTaskLimit(taskData.poster_id);
        if (isLimitReached) {
            const error = new Error('You have reached the limit of 5 active tasks. Please complete or cancel an existing task before posting a new one.');
            error.code = 'TASK_LIMIT_EXCEEDED';
            throw error;
        }

        // Sanitize inputs
        const sanitizedData = {
            ...sanitizeObject(taskData, ['title', 'description', 'address'])
        };

        // If inviting a specific worker, set status to INVITED
        if (sanitizedData.assigned_worker_id) {
            sanitizedData.status = TASK_STATUS.INVITED;
        }

        const { data, error } = await supabase.from('tasks').insert([sanitizedData]).select()
        if (error) throw error;

        const newTask = data[0];

        // --- INVITATION NOTIFICATION ---
        if (newTask.assigned_worker_id) {
            try {
                const { data: poster } = await supabase
                    .from('users')
                    .select('name')
                    .eq('id', newTask.poster_id)
                    .single();

                await notificationService.createNotification(
                    newTask.assigned_worker_id,
                    'Private Task Invitation',
                    `${poster?.name || 'A neighbor'} invited you to a task: ${newTask.title}`,
                    'TASK_INVITATION',
                    newTask.id
                );
            } catch (notifyError) {
                console.warn('Error sending invitation notification:', notifyError);
            }
            return newTask;
        }

        // --- SKILL-BASED NOTIFICATIONS (Only for OPEN tasks) ---
        if (newTask.status === TASK_STATUS.OPEN) {
            try {
                const { data: matchingUsers } = await supabase
                    .from('users')
                    .select('id')
                    .contains('skills', [newTask.category])
                    .neq('id', newTask.poster_id)
                    .limit(20);

                if (matchingUsers && matchingUsers.length > 0) {
                    const notifications = matchingUsers.map(user => ({
                        user_id: user.id,
                        title: 'Perfect Match! 🎯',
                        message: `A new ${newTask.category} task was just posted nearby: ${newTask.title}`,
                        type: 'PERFECT_MATCH',
                        related_id: newTask.id
                    }));

                    await supabase.from('notifications').insert(notifications);
                }
            } catch (matchError) {
                console.warn('Silent error sending skill notifications:', matchError);
            }
        }

        return newTask;
    },

    updateTask: async (taskId, taskData) => {
        // Sanitize inputs
        const sanitizedData = {
            ...sanitizeObject(taskData, ['title', 'description', 'address'])
        };

        const { data, error } = await supabase
            .from('tasks')
            .update(sanitizedData)
            .eq('id', taskId)
            .select();

        if (error) throw error;
        return data[0];
    },

    getNearbyTasks: async (userId = null, lat = null, lng = null, limit = 10, offset = 0) => {
        // Use the smart proximity RPC if we have user context and location
        if (userId && lat && lng) {
            return taskService.getPersonalizedTasks(userId, lat, lng, limit, offset);
        }

        const { data, error } = await supabase
            .from('tasks')
            .select('*, poster:users!poster_id(id, name, profile_image, rating)')
            .or(`status.eq.${TASK_STATUS.OPEN}${userId ? `,and(poster_id.eq.${userId},status.in.(${TASK_STATUS.INVITED},${TASK_STATUS.ASSIGNED},${TASK_STATUS.PENDING_CONFIRMATION},${TASK_STATUS.DISPUTED})),and(assigned_worker_id.eq.${userId},status.in.(${TASK_STATUS.INVITED},${TASK_STATUS.ASSIGNED},${TASK_STATUS.PENDING_CONFIRMATION},${TASK_STATUS.DISPUTED}))` : ''}`)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);
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
            .select('*, worker:users!worker_id(id, name, profile_image, rating, completed_tasks)')
            .eq('task_id', taskId)
        if (error) throw error
        return data
    },

    getMyAssignedTasks: async (workerId) => {
        const { data, error } = await supabase
            .from('tasks')
            .select('*, poster:users!poster_id(id, name, profile_image, rating)')
            .eq('assigned_worker_id', workerId)
            .in('status', [TASK_STATUS.ASSIGNED, TASK_STATUS.PENDING_CONFIRMATION])
            .order('created_at', { ascending: false })
        if (error) throw error
        return data
    },

    getMyPostedTasks: async (posterId) => {
        const { data, error } = await supabase
            .from('tasks')
            .select(`
                *,
                worker:users!assigned_worker_id(id, name, profile_image, rating)
            `)
            .eq('poster_id', posterId)
            .in('status', [TASK_STATUS.OPEN, TASK_STATUS.ASSIGNED, TASK_STATUS.PENDING_CONFIRMATION])
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data;
    },

    getAppliedTasks: async (workerId) => {
        const { data, error } = await supabase
            .from('task_applications')
            .select(`
                task:tasks(
                    *,
                    poster:users!poster_id(id, name, profile_image, rating)
                )
            `)
            .eq('worker_id', workerId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        return (data || [])
            .map(item => item.task)
            .filter(task => 
                task && 
                task.status !== TASK_STATUS.COMPLETED && 
                task.status !== TASK_STATUS.CANCELLED &&
                task.assigned_worker_id !== workerId
            );
    },

    getTaskHistory: async (userId) => {
        const { data, error } = await supabase
            .from('tasks')
            .select('*, poster:users!poster_id(id, name, profile_image, rating), worker:users!assigned_worker_id(id, name, profile_image, rating)')
            .eq('status', TASK_STATUS.COMPLETED)
            .or(`poster_id.eq.${userId},assigned_worker_id.eq.${userId}`)
            .order('created_at', { ascending: false })
        if (error) throw error
        return data
    },

    getPastTaskers: async (userId) => {
        const { data, error } = await supabase
            .from('tasks')
            .select('worker:users!assigned_worker_id(id, name, profile_image, rating)')
            .eq('poster_id', userId)
            .eq('status', TASK_STATUS.COMPLETED)
            .not('assigned_worker_id', 'is', null);
        
        if (error) throw error;
        
        // Return unique taskers
        const uniqueTaskers = [];
        const seenIds = new Set();
        
        for (const item of data) {
            if (item.worker && !seenIds.has(item.worker.id)) {
                uniqueTaskers.push(item.worker);
                seenIds.add(item.worker.id);
            }
        }
        
        return uniqueTaskers;
    },

    getPersonalizedTasks: async (userId, lat = null, lng = null, limit = 10, offset = 0) => {
        const { data, error } = await supabase
            .rpc('get_personalized_tasks', {
                p_user_id: userId,
                p_lat: lat,
                p_lng: lng,
                p_limit: limit,
                p_offset: offset
            });

        if (error) throw error;

        if (data.length === 0) return [];

        const posterIds = [...new Set(data.map(t => t.poster_id))];
        const { data: posters } = await supabase
            .from('users')
            .select('id, name, profile_image, rating')
            .in('id', posterIds);
        
        const posterMap = (posters || []).reduce((acc, p) => {
            acc[p.id] = p;
            return acc;
        }, {});

        return data.map(t => ({
            ...t,
            poster: posterMap[t.poster_id]
        }));
    },

    incrementTaskView: async (taskId) => {
        const { error } = await supabase
            .rpc('increment_task_view', { t_id: taskId });
        
        if (error) {
            console.warn('Increment task view RPC failed, skipping view count update');
        }
    },

    applyForTask: async (taskId, workerId, message) => {
        const isRateLimited = await rateLimitService.checkRateLimit('task_applications', 'worker_id', workerId, 60);
        if (isRateLimited) {
            const error = new Error('Slow down! You can only apply for one task per minute. Please wait a moment before trying again.');
            error.code = 'RATE_LIMIT_EXCEEDED';
            throw error;
        }

        // Fetch poster_id and title for notification
        const { data: task, error: fetchError } = await supabase
            .from('tasks')
            .select('poster_id, title')
            .eq('id', taskId)
            .single()
        
        if (fetchError) throw fetchError

        const { data: worker, error: workerError } = await supabase
            .from('users')
            .select('name')
            .eq('id', workerId)
            .single()

        if (workerError) throw workerError

        const { data, error } = await supabase
            .from('task_applications')
            .insert([{ 
                task_id: taskId, 
                worker_id: workerId, 
                message: sanitizeString(message) 
            }])
        if (error) throw error

        await notificationService.createNotification(
            task.poster_id,
            'New Application',
            `${worker.name} applied for your task: ${task.title}`,
            'APPLICATION',
            taskId
        )

        return data
    },

    cancelApplication: async (taskId, workerId) => {
        const { data: task, error: fetchError } = await supabase
            .from('tasks')
            .select('poster_id, title')
            .eq('id', taskId)
            .single();
        
        if (fetchError) throw fetchError;

        const { error } = await supabase
            .from('task_applications')
            .delete()
            .eq('task_id', taskId)
            .eq('worker_id', workerId);
        
        if (error) throw error;

        await notificationService.createNotification(
            task.poster_id,
            'Application Withdrawn',
            `A worker has withdrawn their application for "${task.title}".`,
            'WITHDRAWAL',
            taskId
        );
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
            .update({ assigned_worker_id: workerId, status: TASK_STATUS.ASSIGNED })
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
                status: TASK_STATUS.PENDING_CONFIRMATION,
                completion_image_url: completionImageUrl
            })
            .eq('id', taskId)
        if (error) throw error

        await notificationService.createNotification(
            task.poster_id,
            'Work Submitted',
            `Tasker marked ${task.title} as complete.`,
            TASK_STATUS.COMPLETED,
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
            .update({ status: TASK_STATUS.COMPLETED })
            .eq('id', taskId)
        if (error) throw error

        await notificationService.createNotification(
            task.assigned_worker_id,
            'Payment Released',
            `Job ${task.title} is officially complete!`,
            TASK_STATUS.COMPLETED,
            taskId
        )

        return data
    },

    cancelTask: async (taskId) => {
        try {
            // 1. Get task details and applicants
            const { data: task, error: taskError } = await supabase
                .from('tasks')
                .select('title, poster_id')
                .eq('id', taskId)
                .single();

            if (taskError) throw taskError;

            const { data: applicants, error: appError } = await supabase
                .from('task_applications')
                .select('worker_id')
                .eq('task_id', taskId);

            if (appError) throw appError;

            // 2. Notify all applicants
            if (applicants && applicants.length > 0) {
                const notifications = applicants.map(app => ({
                    user_id: app.worker_id,
                    title: 'Task Cancelled',
                    message: `The task "${task.title}" has been cancelled by the poster.`,
                    type: 'task_cancelled',
                    related_id: taskId
                }));

                const { error: notifyError } = await supabase
                    .from('notifications')
                    .insert(notifications);

                if (notifyError) console.error('Error notifying applicants:', notifyError);
            }

            // 3. Update task status
            const { data, error } = await supabase
                .from('tasks')
                .update({ status: TASK_STATUS.CANCELLED })
                .eq('id', taskId);

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error in cancelTask:', error);
            throw error;
        }
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

    processRecurringTasks: async (userId) => {
        if (!userId) return;
        try {
            const now = new Date().toISOString();
            // Get templates FOR THIS USER where next_occurrence_at is due (lte now) or null (first time)
            const { data: templates, error: fetchError } = await supabase
                .from('task_templates')
                .select('*')
                .eq('poster_id', userId)
                .eq('is_active', true)
                .or(`next_occurrence_at.lte.${now},next_occurrence_at.is.null`)

            if (fetchError) throw fetchError;
            if (!templates || templates.length === 0) return;

            for (const template of templates) {
                // Determine if this is the first instance or a recurrence
                const isFirstInstance = !template.last_generated_at;
                

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
                    status: isFirstInstance ? TASK_STATUS.OPEN : TASK_STATUS.PENDING_APPROVAL
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
                    status: TASK_STATUS.INVITED 
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
                    status: TASK_STATUS.OPEN 
                })
                .eq('id', taskId);
            
            if (error) throw error;
        }
    },

    respondToInvitation: async (taskId, accept) => {
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
                .update({ status: TASK_STATUS.ASSIGNED })
                .eq('id', taskId);
            
            if (error) throw error;

            await notificationService.createNotification(
                task.poster_id,
                'Invitation Accepted',
                `The worker has accepted your task: ${task.title}`,
                'INVITATION_ACCEPTED',
                taskId
            );
        } else {
            // Worker declined - post publicly
            const { error } = await supabase
                .from('tasks')
                .update({ 
                    assigned_worker_id: null, 
                    status: TASK_STATUS.OPEN 
                })
                .eq('id', taskId);
            
            if (error) throw error;

            await notificationService.createNotification(
                task.poster_id,
                'Invitation Declined',
                `The worker declined your task invitation. It is now posted publicly: ${task.title}`,
                'INVITATION_DECLINED',
                taskId
            );
        }
    },

    // Alias for backward compatibility
    respondToRecurringInvitation: async (taskId, accept) => {
        return taskService.respondToInvitation(taskId, accept);
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

    getFairPriceEstimate: async (category) => {
        try {
            const { data, error } = await supabase
                .from('tasks')
                .select('payment_amount')
                .eq('category', category)
                .eq('status', TASK_STATUS.COMPLETED)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            if (!data || data.length === 0) return null;

            const sum = data.reduce((acc, task) => acc + (Number(task.payment_amount) || 0), 0);
            return Math.round(sum / data.length);
        } catch (error) {
            console.error('Error fetching fair price estimate:', error);
            return null;
        }
    },

    subscribeToTasks: (channelName, callback) => {
        return supabase
            .channel(channelName)
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
