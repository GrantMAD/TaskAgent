import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { taskService } from '../services/taskService';
import { userService } from '../services/userService';
import { TASK_STATUS } from '../utils/constants';

export const useTaskDetailActions = (task, session, taskId, fetchTaskDetails, showToast, navigation, setTask, setApplications, setHasApplied) => {
    // General Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [modalType, setModalVisibleType] = useState('HIRE'); // 'HIRE', 'COMPLETE', 'APPROVE', 'CANCEL', or 'WITHDRAW'
    const [selectedApplicant, setSelectedApplicant] = useState(null);
    const [completionImage, setCompletionImage] = useState(null);
    const [showSuccessBanner, setShowSuccessBanner] = useState(false);
    
    // Application Modal State
    const [applyModalVisible, setApplyModalVisible] = useState(false);

    // Review Modal State
    const [reviewModalVisible, setReviewModalVisible] = useState(false);
    const [reviewLoading, setReviewLoading] = useState(false);

    // Report Modal State
    const [reportModalVisible, setReportModalVisible] = useState(false);

    // Dispute Modal State
    const [disputeModalVisible, setDisputeModalVisible] = useState(false);

    const pickCompletionImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            showToast('Permission to access gallery is required', 'warning');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.7,
        });

        if (!result.canceled) {
            setCompletionImage(result.assets[0].uri);
        }
    };

    const handleApply = async (message) => {
        if (!session) return;
        
        const previousApplications = [...(task.applications || [])];
        const previousHasApplied = false; // Assuming they haven't applied yet if they are calling this
        
        // Optimistic Update
        setApplyModalVisible(false);
        setHasApplied(true);
        const tempApplication = {
            id: `temp-${Date.now()}`,
            task_id: taskId,
            worker_id: session.user.id,
            message: message,
            created_at: new Date().toISOString(),
            worker: {
                id: session.user.id,
                name: session.user.user_metadata?.full_name || 'You',
                profile_image: session.user.user_metadata?.avatar_url || null,
                rating: 5.0 // Placeholder
            }
        };
        setApplications(prev => [tempApplication, ...prev]);
        setShowSuccessBanner(true);

        try {
            await taskService.applyForTask(taskId, session.user.id, message);
            showToast('Application submitted successfully!', 'success');
            fetchTaskDetails();
        } catch (error) {
            // Rollback
            setHasApplied(previousHasApplied);
            setApplications(prev => prev.filter(app => app.id !== tempApplication.id));
            setShowSuccessBanner(false);
            
            if (error.code === 'RATE_LIMIT_EXCEEDED') {
                showToast(error.message, 'warning');
            } else {
                showToast(error.message || 'Could not apply for task', 'error');
            }
        }
    };

    const triggerApplyModal = () => {
        if (!session) {
            showToast('Please login to apply for tasks', 'info');
            return;
        }
        setApplyModalVisible(true);
    };

    const triggerHireModal = (workerId, workerName) => {
        setModalVisibleType('HIRE');
        setSelectedApplicant({ id: workerId, name: workerName });
        setModalVisible(true);
    };

    const triggerCompleteModal = () => {
        setModalVisibleType('COMPLETE');
        setModalVisible(true);
    };

    const triggerApproveModal = () => {
        setModalVisibleType('APPROVE');
        setModalVisible(true);
    };
    
    const triggerCancelModal = () => {
        setModalVisibleType('CANCEL');
        setModalVisible(true);
    };

    const handleConfirmWithdraw = async () => {
        setModalVisible(false);
        const previousApplications = [...(task.applications || [])];
        
        // Optimistic Update
        setHasApplied(false);
        setApplications(prev => prev.filter(app => app.worker_id !== session.user.id));
        setShowSuccessBanner(false);

        try {
            await taskService.cancelApplication(taskId, session.user.id);
            showToast('Application withdrawn', 'info');
            fetchTaskDetails();
        } catch (error) {
            // Rollback
            setHasApplied(true);
            // We can't easily restore the exact application object without keeping it
            fetchTaskDetails(); 
            showToast(error.message, 'error');
        }
    };

    const handleConfirmCancel = async () => {
        setModalVisible(false);
        const previousStatus = task.status;
        
        // Optimistic Update
        setTask(prev => ({ ...prev, status: TASK_STATUS.CANCELLED }));
        
        try {
            await taskService.cancelTask(taskId);
            showToast('Task cancelled successfully', 'success');
            navigation.goBack();
        } catch (error) {
            // Rollback
            setTask(prev => ({ ...prev, status: previousStatus }));
            showToast(error.message, 'error');
        }
    };

    const handleConfirmHire = async () => {
        if (!selectedApplicant) return;
        setModalVisible(false);
        
        const previousStatus = task.status;
        const previousWorkerId = task.assigned_worker_id;
        
        // Optimistic Update
        setTask(prev => ({ 
            ...prev, 
            status: TASK_STATUS.ASSIGNED, 
            assigned_worker_id: selectedApplicant.id,
            worker: { name: selectedApplicant.name } // Partial update for UI
        }));

        try {
            await taskService.assignWorker(taskId, selectedApplicant.id);
            showToast(`${selectedApplicant.name} has been hired!`, 'success');
            fetchTaskDetails();
        } catch (error) {
            // Rollback
            setTask(prev => ({ ...prev, status: previousStatus, assigned_worker_id: previousWorkerId }));
            showToast(error.message, 'error');
        } finally {
            setSelectedApplicant(null);
        }
    };

    const handleConfirmComplete = async () => {
        setModalVisible(false);
        const previousStatus = task.status;
        
        // Optimistic Update
        setTask(prev => ({ ...prev, status: TASK_STATUS.PENDING_CONFIRMATION }));

        try {
            let completionUrl = null;
            if (completionImage) {
                completionUrl = await taskService.uploadTaskImage(completionImage, session.user.id);
                // After upload, we could update the task with the URL optimistically too, but it's okay for now
            }
            await taskService.markTaskComplete(taskId, completionUrl);
            showToast('Work submitted for confirmation!', 'success');
            fetchTaskDetails();
        } catch (error) {
            // Rollback
            setTask(prev => ({ ...prev, status: previousStatus }));
            showToast(error.message, 'error');
        } finally {
            setCompletionImage(null);
        }
    };

    const handleConfirmApprove = async () => {
        setModalVisible(false);
        const previousStatus = task.status;
        
        // Optimistic Update
        setTask(prev => ({ ...prev, status: TASK_STATUS.COMPLETED }));

        try {
            await taskService.confirmCompletion(taskId);
            setReviewModalVisible(true);
            showToast('Task completed successfully!', 'success');
            fetchTaskDetails();
        } catch (error) {
            // Rollback
            setTask(prev => ({ ...prev, status: previousStatus }));
            showToast(error.message, 'error');
        }
    };

    const handleReviewSubmit = async (rating, comment) => {
        setReviewLoading(true);
        try {
            await userService.submitReview({
                reviewer_id: session.user.id,
                reviewed_user_id: task.assigned_worker_id,
                task_id: taskId,
                rating,
                comment
            });
            setReviewModalVisible(false);
            showToast('Thank you for your feedback!', 'success');
        } catch (error) {
            showToast('Failed to save review: ' + error.message, 'error');
        } finally {
            setReviewLoading(false);
        }
    };

    const handleModalConfirm = () => {
        if (modalType === 'HIRE') {
            handleConfirmHire();
        } else if (modalType === 'COMPLETE') {
            handleConfirmComplete();
        } else if (modalType === 'CANCEL') {
            handleConfirmCancel();
        } else if (modalType === 'WITHDRAW') {
            handleConfirmWithdraw();
        } else {
            handleConfirmApprove();
        }
    };

    const handleCancelApplication = () => {
        setModalVisibleType('WITHDRAW');
        setModalVisible(true);
    };

    return {
        modalVisible,
        setModalVisible,
        modalType,
        selectedApplicant,
        completionImage,
        setCompletionImage,
        showSuccessBanner,
        setShowSuccessBanner,
        applyModalVisible,
        setApplyModalVisible,
        reviewModalVisible,
        setReviewModalVisible,
        reviewLoading,
        reportModalVisible,
        setReportModalVisible,
        disputeModalVisible,
        setDisputeModalVisible,
        pickCompletionImage,
        handleApply,
        triggerApplyModal,
        triggerHireModal,
        triggerCompleteModal,
        triggerApproveModal,
        triggerCancelModal,
        handleModalConfirm,
        handleReviewSubmit,
        handleCancelApplication
    };
};
