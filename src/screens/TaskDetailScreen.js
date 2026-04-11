import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Share } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome } from '@expo/vector-icons';
import { taskService } from '../services/taskService';
import { messageService } from '../services/messageService';
import { supabase } from '../services/supabaseClient';
import { Spacing, Rounding } from '../utils/theme';
import { useTheme } from '../components/ThemeContext';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { ReviewModal } from '../components/ReviewModal';
import { useToast } from '../components/ToastContext';
import { useLocation } from '../components/LocationContext';
import { TaskDetailSkeleton } from '../components/skeletons/SkeletonPlaceholders';
import { useAuth } from '../components/AuthContext';
import { ApplicantList } from '../components/task-detail/ApplicantList';
import { TaskActions } from '../components/task-detail/TaskActions';
import { TaskStatusBanner } from '../components/task-detail/TaskStatusBanner';
import { TaskMediaSection } from '../components/task-detail/TaskMediaSection';
import { TaskLocationSection } from '../components/task-detail/TaskLocationSection';
import { TaskPosterSection } from '../components/task-detail/TaskPosterSection';
import { ApplicationModal } from '../components/ApplicationModal';
import { ReportModal } from '../components/ReportModal';
import { DisputeModal } from '../components/DisputeModal';
import { CURRENCY_SYMBOL, TASK_STATUS } from '../utils/constants';
import { interactionService } from '../services/interactionService';
import { disputeService } from '../services/disputeService';
import { useTaskDetailActions } from '../hooks/useTaskDetailActions';
import { Image } from 'expo-image';

export const TaskDetailScreen = ({ route, navigation }) => {
    const { theme, shadows } = useTheme();
    const { session, savedTaskIds, toggleSavedTask } = useAuth();
    const { userLocation, calculateDistance } = useLocation();
    const { taskId } = route.params;
    const [task, setTask] = useState(null);
    const [applications, setApplications] = useState([]);
    const [dispute, setDispute] = useState(null);
    const [hasApplied, setHasApplied] = useState(false);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const { showToast } = useToast();
    const scrollRef = useRef(null);
    
    const styles = useMemo(() => createStyles(theme, shadows), [theme, shadows]);

    const isSaved = useMemo(() => savedTaskIds.includes(taskId), [savedTaskIds, taskId]);

    const distance = useMemo(() => {
        if (userLocation && task?.location_lat && task?.location_lng) {
            return calculateDistance(
                userLocation.latitude,
                userLocation.longitude,
                task.location_lat,
                task.location_lng
            );
        }
        return null;
    }, [userLocation, task?.location_lat, task?.location_lng, calculateDistance]);

    const fetchTaskDetails = useCallback(async (isRefreshing = false) => {
        if (isRefreshing) setRefreshing(true);
        try {
            const data = await taskService.getTaskDetails(taskId);
            setTask(data);

            if (!data) {
                setLoading(false);
                setRefreshing(false);
                return;
            }
            
            const apps = await taskService.getTaskApplications(taskId);
            setApplications(apps);

            if (session) {
                const userApplication = apps.find(app => app.worker_id === session.user.id);
                setHasApplied(!!userApplication);
            }

            if (data.status === TASK_STATUS.DISPUTED) {
                const disputeData = await disputeService.getTaskDispute(taskId);
                setDispute(disputeData);
            } else {
                setDispute(null);
            }
        } catch (error) {
            console.error(error);
            showToast('Could not load task details', 'error');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [taskId, session, showToast]);

    // Hook for modal actions
    const {
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
    } = useTaskDetailActions(task, session, taskId, fetchTaskDetails, showToast, navigation);

    useEffect(() => {
        setLoading(true);
        fetchTaskDetails();

        const channel = supabase
            .channel(`task-${taskId}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'tasks',
                filter: `id=eq.${taskId}`
            }, () => {
                fetchTaskDetails();
            })
            .subscribe();

        const appSubscription = taskService.subscribeToTaskApplications(taskId, () => {
            fetchTaskDetails();
        });

        return () => {
            supabase.removeChannel(channel);
            supabase.removeChannel(appSubscription);
        };
    }, [taskId, fetchTaskDetails]);

    useEffect(() => {
        if (taskId) {
            interactionService.logTaskView(session?.user?.id, taskId);
            taskService.incrementTaskView(taskId);
        }
    }, [taskId, session?.user?.id]);

    const formatDate = (dateString = '') => {
        if (!dateString) return 'recently';
        const utcDateString = (dateString.includes('T') && !dateString.endsWith('Z') && !dateString.includes('+')) 
            ? `${dateString}Z` 
            : dateString;
        const date = new Date(utcDateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
        
        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
        return date.toLocaleDateString();
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: `Check out this task on Task Agent: ${task.title}\n\nBudget: ${CURRENCY_SYMBOL}${task.payment_amount}\nCategory: ${task.category}\n\nDescription: ${task.description}`,
                title: task.title,
            });
        } catch {
            showToast('Could not share task', 'error');
        }
    };

    const onRefresh = () => {
        fetchTaskDetails(true);
    };

    const handleToggleSave = async () => {
        const wasSaved = isSaved;
        await toggleSavedTask(taskId);
        showToast(wasSaved ? 'Removed from saved tasks' : 'Task saved successfully!', 'success');
    };

    const isPoster = session?.user?.id === task?.poster_id;
    const isWorker = session?.user?.id === task?.assigned_worker_id;

    const handleMessageApplicant = async (applicantId) => {
        try {
            if (!session) return;
            const conv = await messageService.getOrCreateConversation(taskId, session.user.id, applicantId);
            navigation.navigate('Main', {
                screen: 'MessagesTab',
                params: {
                    screen: 'Chat',
                    params: { conversationId: conv.id }
                }
            });
        } catch (error) {
            showToast(error.message, 'error');
        }
    };

    const handleMessagePoster = async () => {
        try {
            if (!session) {
                showToast('Please login to message neighbours', 'info');
                return;
            }

            const currentUserId = session.user.id;
            const posterId = task.poster_id;
            const workerId = task.assigned_worker_id;
            const otherUserId = isPoster ? workerId : posterId;

            if (!otherUserId) {
                showToast('Recipient not identified. Wait for someone to be assigned or apply.', 'info');
                return;
            }

            const conv = await messageService.getOrCreateConversation(taskId, currentUserId, otherUserId);
            navigation.navigate('Main', {
                screen: 'MessagesTab',
                params: {
                    screen: 'Chat',
                    params: { conversationId: conv.id }
                }
            });
        } catch (error) {
            console.error('Conversation Error:', error);
            showToast(error.message || 'Could not start conversation', 'error');
        }
    };

    if (loading && !task && !refreshing) {
        return (
            <View style={styles.container}>
                <LinearGradient colors={[theme.primary, theme.secondary || '#1E40AF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <FontAwesome name="chevron-left" size={20} color={theme.white} />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerTitle} numberOfLines={1}>Task Details</Text>
                    </View>
                    <View style={styles.headerRight} />
                </LinearGradient>
                <TaskDetailSkeleton />
            </View>
        );
    }

    if (!task) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Task not found</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <LinearGradient colors={[theme.primary, theme.secondary || '#1E40AF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <FontAwesome name="chevron-left" size={20} color={theme.white} />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle} numberOfLines={1}>Task Details</Text>
                </View>
                <View style={styles.headerRight}>
                    {isPoster && task.status === TASK_STATUS.OPEN && (
                        <TouchableOpacity 
                            onPress={() => navigation.navigate('Main', { 
                                screen: 'CreateTab', 
                                params: { taskId: task.id, isEditing: true } 
                            })} 
                            style={styles.headerAction}
                        >
                            <FontAwesome name="pencil" size={18} color={theme.white} />
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={handleToggleSave} style={styles.headerAction}>
                        <FontAwesome name={isSaved ? "heart" : "heart-o"} size={18} color={isSaved ? theme.error : theme.white} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleShare} style={styles.headerAction}>
                        <FontAwesome name="share-alt" size={20} color={theme.white} />
                    </TouchableOpacity>
                    {session?.user?.id !== task.poster_id && (
                        <TouchableOpacity onPress={() => setReportModalVisible(true)} style={styles.headerAction}>
                            <FontAwesome name="flag" size={18} color={theme.white} />
                        </TouchableOpacity>
                    )}
                </View>
            </LinearGradient>

            <ScrollView 
                ref={scrollRef}
                contentContainerStyle={styles.scrollContent} 
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.accent]} tintColor={theme.accent} />}
            >
                {showSuccessBanner && (
                    <View style={styles.successBanner}>
                        <LinearGradient colors={['#10B981', '#059669']} style={styles.successBannerGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                            <View style={styles.successIconContainer}><FontAwesome name="check-circle" size={24} color="#FFF" /></View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.successBannerTitle}>Application Sent!</Text>
                                <Text style={styles.successBannerText}>The poster has been notified. Check your messages for updates.</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowSuccessBanner(false)} style={styles.successBannerClose}>
                                <FontAwesome name="times" size={16} color="#FFF" />
                            </TouchableOpacity>
                        </LinearGradient>
                    </View>
                )}

                {task.status === TASK_STATUS.DISPUTED && (
                    <View style={styles.disputeBanner}>
                        <View style={styles.disputeIconContainer}><FontAwesome name="shield" size={24} color="#FFF" /></View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.disputeBannerTitle}>Dispute in Progress</Text>
                            <Text style={styles.disputeBannerText}>
                                {dispute?.raised_by?.id === session?.user?.id 
                                    ? "You have raised a dispute. An admin will review it shortly."
                                    : "A dispute has been raised. An admin is reviewing the situation."}
                            </Text>
                        </View>
                    </View>
                )}

                <View style={styles.titleSection}>
                    <View style={styles.categoryBadge}><Text style={styles.categoryText}>{task.category}</Text></View>
                    <Text style={styles.postedDate}>Posted {formatDate(task.created_at)}</Text>
                    <Text style={styles.title}>{task.title}</Text>
                    <View style={styles.priceRow}>
                        <View>
                            <Text style={styles.priceLabel}>Status</Text>
                            <Text style={[styles.statusText, { color: task.status === TASK_STATUS.OPEN || task.status === TASK_STATUS.COMPLETED ? theme.success : theme.accent }]}>
                                {task.status.replace('_', ' ')}
                            </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.priceLabel}>Budget</Text>
                            <Text style={styles.payment}>{CURRENCY_SYMBOL}{task.payment_amount}</Text>
                        </View>
                    </View>
                </View>

                <TaskLocationSection task={task} theme={theme} shadows={shadows} isPoster={isPoster} isWorker={isWorker} distance={distance} />

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Description</Text>
                    <View style={styles.card}><Text style={styles.description}>{task.description}</Text></View>
                </View>

                <TaskMediaSection task={task} theme={theme} shadows={shadows} />

                {isPoster && task.status === TASK_STATUS.OPEN && (
                    <ApplicantList applications={applications} navigation={navigation} onMessage={handleMessageApplicant} onHire={triggerHireModal} />
                )}

                <TaskPosterSection task={task} theme={theme} shadows={shadows} navigation={navigation} />

                <TaskActions 
                    task={task} session={session} isPoster={isPoster} isWorker={isWorker} hasApplied={hasApplied}
                    onApply={triggerApplyModal} onMessagePoster={handleMessagePoster} onConfirmCompletion={triggerApproveModal}
                    onMarkAsComplete={triggerCompleteModal} onCancel={triggerCancelModal} onCancelApplication={handleCancelApplication}
                    onRaiseDispute={() => setDisputeModalVisible(true)}
                />

                <TaskStatusBanner task={task} isPoster={isPoster} isWorker={isWorker} />
            </ScrollView>

            <ConfirmationModal 
                visible={modalVisible}
                title={modalType === 'HIRE' ? "Hire Applicant" : modalType === 'COMPLETE' ? "Mark Task Complete" : modalType === 'CANCEL' ? "Cancel Task" : modalType === 'WITHDRAW' ? "Withdraw Application" : "Confirm Completion"}
                message={modalType === 'HIRE' ? `Are you sure you want to hire ${selectedApplicant?.name} for this task?` : modalType === 'COMPLETE' ? "Are you finished with this task? This will notify the poster to confirm." : modalType === 'CANCEL' ? "Are you sure you want to cancel this task? Any current applicants will be notified." : modalType === 'WITHDRAW' ? "Are you sure you want to withdraw your application? The poster will be notified." : "Has the work been completed to your satisfaction? This will officially close the task."}
                confirmText={modalType === 'HIRE' ? "Approve" : modalType === 'COMPLETE' ? "Submit Work" : modalType === 'CANCEL' ? "Yes, Cancel Task" : modalType === 'WITHDRAW' ? "Withdraw" : "Approve & Close"}
                type={modalType === 'COMPLETE' || modalType === 'APPROVE' ? 'success' : (modalType === 'CANCEL' || modalType === 'WITHDRAW') ? 'danger' : 'primary'}
                onConfirm={handleModalConfirm}
                onCancel={() => { setModalVisible(false); setCompletionImage(null); }}
            >
                {modalType === 'COMPLETE' && (
                    <View style={styles.modalPhotoSection}>
                        <Text style={styles.modalPhotoLabel}>ADD COMPLETION PHOTO (OPTIONAL)</Text>
                        {completionImage ? (
                            <View style={styles.modalImagePreviewContainer}>
                                <Image source={{ uri: completionImage }} style={styles.modalImagePreview} />
                                <TouchableOpacity style={styles.modalRemoveImageButton} onPress={() => setCompletionImage(null)}>
                                    <FontAwesome name="times-circle" size={24} color={theme.error} />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <TouchableOpacity style={styles.modalAddPhotoButton} onPress={pickCompletionImage}>
                                <FontAwesome name="camera" size={20} color={theme.primary} />
                                <Text style={styles.modalAddPhotoText}>CAPTURE PROOF</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </ConfirmationModal>

            <ReviewModal visible={reviewModalVisible} userName={task?.worker?.name || "your neighbour"} loading={reviewLoading} onSubmit={handleReviewSubmit} onCancel={() => setReviewModalVisible(false)} />
            <ApplicationModal visible={applyModalVisible} onClose={() => setApplyModalVisible(false)} onSubmit={handleApply} taskTitle={task?.title} />
            <ReportModal visible={reportModalVisible} onClose={() => setReportModalVisible(false)} reportedTaskId={taskId} reportedUserId={task?.poster_id} type="task" />
            <DisputeModal visible={disputeModalVisible} onClose={() => setDisputeModalVisible(false)} taskId={taskId} taskTitle={task?.title} otherPartyId={isPoster ? task?.assigned_worker_id : task?.poster_id} onDisputeRaised={fetchTaskDetails} />
        </View>
    );
};

const createStyles = (theme, shadows) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background },
    emptyText: { color: theme.textMuted, fontSize: 16 },
    header: { backgroundColor: theme.primary, paddingTop: Spacing.lg, paddingBottom: Spacing.md, paddingHorizontal: Spacing.lg, flexDirection: 'row', alignItems: 'center', borderBottomLeftRadius: Rounding.soft, borderBottomRightRadius: Rounding.soft, ...shadows.medium, zIndex: 10 },
    backButton: { width: 40, height: 40, justifyContent: 'center' },
    headerTitleContainer: { flex: 1, alignItems: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '800', color: theme.white },
    headerRight: { flexDirection: 'row', alignItems: 'center', width: 80, justifyContent: 'flex-end' },
    headerAction: { paddingHorizontal: Spacing.sm, height: 40, justifyContent: 'center', alignItems: 'center' },
    scrollContent: { paddingBottom: 120 },
    titleSection: { padding: Spacing.lg, backgroundColor: theme.card, borderBottomLeftRadius: Rounding.soft, borderBottomRightRadius: Rounding.soft, ...shadows.subtle, marginBottom: Spacing.md },
    categoryBadge: { backgroundColor: theme.isDarkMode ? 'rgba(255,255,255,0.05)' : '#E8EFF4', paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Rounding.pill, alignSelf: 'flex-start', marginBottom: Spacing.sm },
    categoryText: { color: theme.primary, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
    postedDate: { fontSize: 12, color: theme.textMuted, fontWeight: '600', marginBottom: 4 },
    title: { fontSize: 26, fontWeight: '800', color: theme.primary, marginBottom: Spacing.md },
    priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: theme.border, paddingTop: Spacing.md },
    priceLabel: { fontSize: 12, color: theme.textMuted, fontWeight: '700', textTransform: 'uppercase', marginBottom: 2 },
    statusText: { fontSize: 16, fontWeight: '800', textTransform: 'capitalize' },
    payment: { fontSize: 28, fontWeight: '900', color: theme.accent },
    section: { paddingHorizontal: Spacing.lg, marginTop: Spacing.md },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: theme.primary, marginBottom: Spacing.sm, marginLeft: 4 },
    card: { backgroundColor: theme.card, padding: Spacing.md, borderRadius: Rounding.soft, ...shadows.subtle, borderWidth: 1, borderColor: theme.border },
    description: { fontSize: 16, color: theme.text },
    successBanner: { margin: Spacing.lg, borderRadius: Rounding.soft, overflow: 'hidden', elevation: 8, shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
    successBannerGradient: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg },
    successIconContainer: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
    successBannerTitle: { color: '#FFF', fontSize: 18, fontWeight: '900', marginBottom: 2 },
    successBannerText: { color: 'rgba(255, 255, 255, 0.9)', fontSize: 13, fontWeight: '600' },
    successBannerClose: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 10 },
    disputeBanner: { margin: Spacing.lg, padding: Spacing.lg, backgroundColor: '#F59E0B', borderRadius: Rounding.soft, flexDirection: 'row', alignItems: 'center', elevation: 4, shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
    disputeIconContainer: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
    disputeBannerTitle: { color: '#FFF', fontSize: 18, fontWeight: '900', marginBottom: 2 },
    disputeBannerText: { color: 'rgba(255, 255, 255, 0.9)', fontSize: 13, fontWeight: '600' },
    modalPhotoSection: { marginTop: Spacing.md, marginBottom: Spacing.sm, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: theme.border },
    modalPhotoLabel: { fontSize: 10, fontWeight: '800', color: theme.primary, marginBottom: 10, textAlign: 'center' },
    modalAddPhotoButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.isDarkMode ? 'rgba(255,255,255,0.05)' : '#F0F4F8', borderWidth: 1.5, borderStyle: 'dashed', borderColor: theme.border, borderRadius: Rounding.standard, padding: Spacing.md },
    modalAddPhotoText: { marginLeft: 10, fontSize: 12, fontWeight: '700', color: theme.primary },
    modalImagePreviewContainer: { width: '100%', height: 120, borderRadius: Rounding.standard, overflow: 'hidden', position: 'relative' },
    modalImagePreview: { width: '100%', height: '100%' },
    modalRemoveImageButton: { position: 'absolute', top: 5, right: 5, backgroundColor: theme.white, borderRadius: 12 }
});
