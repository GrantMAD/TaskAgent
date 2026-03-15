import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Alert, Image, ActivityIndicator, RefreshControl, Share } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { taskService } from '../services/taskService';
import { messageService } from '../services/messageService';
import { userService } from '../services/userService';
import { supabase } from '../services/supabaseClient';
import { Spacing, Rounding } from '../utils/theme';
import { useTheme } from '../components/ThemeContext';
import { FontAwesome } from '@expo/vector-icons';
import { UserAvatar } from '../components/UserAvatar';
import { RatingStars } from '../components/RatingStars';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { ReviewModal } from '../components/ReviewModal';
import { useToast } from '../components/ToastContext';
import { useLocation } from '../components/LocationContext';
import { TaskDetailSkeleton } from '../components/skeletons/SkeletonPlaceholders';
import TaskMap from '../components/TaskMap';
import { useAuth } from '../components/AuthContext';
import { ApplicantList } from '../components/task-detail/ApplicantList';
import { TaskActions } from '../components/task-detail/TaskActions';
import { TaskStatusBanner } from '../components/task-detail/TaskStatusBanner';
import { ApplicationModal } from '../components/ApplicationModal';
import { ReportModal } from '../components/ReportModal';

export const TaskDetailScreen = ({ route, navigation }) => {
    const { theme, shadows } = useTheme();
    const { session, savedTaskIds, toggleSavedTask } = useAuth();
    const { userLocation, calculateDistance } = useLocation();
    const { taskId } = route.params;
    const [task, setTask] = useState(null);
    const [applications, setApplications] = useState([]);
    const [hasApplied, setHasApplied] = useState(false);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const { showToast } = useToast();
    
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
    }, [userLocation, task?.location_lat, task?.location_lng]);

    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [modalType, setModalVisibleType] = useState('HIRE'); // 'HIRE', 'COMPLETE', 'APPROVE', or 'CANCEL'
    const [selectedApplicant, setSelectedApplicant] = useState(null);
    const [completionImage, setCompletionImage] = useState(null);

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

    // Application Modal State
    const [applyModalVisible, setApplyModalVisible] = useState(false);

    // Review Modal State
    const [reviewModalVisible, setReviewModalVisible] = useState(false);
    const [reviewLoading, setReviewLoading] = useState(false);

    // Report Modal State
    const [reportModalVisible, setReportModalVisible] = useState(false);

    useEffect(() => {
        fetchTaskDetails();

        // Subscribe to task changes
        const taskSubscription = taskService.subscribeToTasks((payload) => {
            if (payload.new?.id === taskId || payload.old?.id === taskId) {
                fetchTaskDetails();
            }
        });

        // Subscribe to applications for this task
        const appSubscription = taskService.subscribeToTaskApplications(taskId, () => {
            fetchTaskDetails(); 
        });

        return () => {
            supabase.removeChannel(taskSubscription);
            supabase.removeChannel(appSubscription);
        };
    }, [taskId]);

    const fetchTaskDetails = async (isRefreshing = false) => {
        if (isRefreshing) setRefreshing(true);
        try {
            const data = await taskService.getTaskDetails(taskId);
            setTask(data);
            
            // Always fetch applications to check if current user has applied
            const apps = await taskService.getTaskApplications(taskId);
            setApplications(apps);

            if (session) {
                const userApplication = apps.find(app => app.worker_id === session.user.id);
                setHasApplied(!!userApplication);
            }
        } catch (error) {
            console.error(error);
            showToast('Could not load task details', 'error');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
        return date.toLocaleDateString();
    };

    const handleShare = async () => {
        try {
            const result = await Share.share({
                message: `Check out this task on Task Agent: ${task.title}\n\nBudget: ${task.payment_amount}\nCategory: ${task.category}\n\nDescription: ${task.description}`,
                title: task.title,
            });
        } catch (error) {
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

    const handleApply = async (message) => {
        try {
            if (!session) return;
            setApplyModalVisible(false);
            setLoading(true);
            await taskService.applyForTask(taskId, session.user.id, message);
            showToast('Application submitted successfully!', 'success');
            fetchTaskDetails(); // Refresh to update button state
        } catch (error) {
            if (error.code === 'RATE_LIMIT_EXCEEDED') {
                showToast('Slow down! You can only apply once per minute.', 'warning');
            } else {
                showToast(error.message, 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    const triggerApplyModal = () => {
        if (!session) {
            showToast('Please login to apply for tasks', 'info');
            return;
        }
        setApplyModalVisible(true);
    };

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
                showToast('Please login to message neighbors', 'info');
                return;
            }

            // Determine recipient
            const currentUserId = session.user.id;
            const posterId = task.poster_id;
            const workerId = task.assigned_worker_id;

            // If user is poster, they message the worker. If they are worker/visitor, they message the poster.
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

    const handleModalConfirm = () => {
        if (modalType === 'HIRE') {
            handleConfirmHire();
        } else if (modalType === 'COMPLETE') {
            handleConfirmComplete();
        } else if (modalType === 'CANCEL') {
            handleConfirmCancel();
        } else {
            handleConfirmApprove();
        }
    };

    const handleConfirmCancel = async () => {
        setModalVisible(false);
        setLoading(true);
        try {
            await taskService.cancelTask(taskId);
            showToast('Task cancelled successfully', 'success');
            navigation.goBack();
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmHire = async () => {
        if (!selectedApplicant) return;
        setModalVisible(false);
        setLoading(true);
        try {
            await taskService.assignWorker(taskId, selectedApplicant.id);
            showToast(`${selectedApplicant.name} has been hired!`, 'success');
            fetchTaskDetails();
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setLoading(false);
            setSelectedApplicant(null);
        }
    };

    const handleConfirmComplete = async () => {
        setModalVisible(false);
        setLoading(true);
        try {
            let completionUrl = null;
            if (completionImage) {
                completionUrl = await taskService.uploadTaskImage(completionImage, session.user.id);
            }
            await taskService.markTaskComplete(taskId, completionUrl);
            showToast('Work submitted for confirmation!', 'success');
            fetchTaskDetails();
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setLoading(false);
            setCompletionImage(null);
        }
    };

    const handleConfirmApprove = async () => {
        setModalVisible(false);
        setLoading(true);
        try {
            await taskService.confirmCompletion(taskId);
            // On success, show review modal
            setReviewModalVisible(true);
            fetchTaskDetails();
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setLoading(false);
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

    if (loading && !task && !refreshing) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.primary} />
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

    const isPoster = session?.user?.id === task.poster_id;
    const isWorker = session?.user?.id === task.assigned_worker_id;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <FontAwesome name="chevron-left" size={20} color={theme.white} />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle} numberOfLines={1}>Task Details</Text>
                </View>
                <View style={styles.headerRight}>
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
            </View>

            <ScrollView 
                contentContainerStyle={styles.scrollContent} 
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl 
                        refreshing={refreshing} 
                        onRefresh={onRefresh} 
                        colors={[theme.accent]} 
                        tintColor={theme.accent}
                    />
                }
            >
                <View style={styles.titleSection}>
                    <View style={styles.categoryBadge}>
                        <Text style={styles.categoryText}>{task.category}</Text>
                    </View>
                    <Text style={styles.postedDate}>Posted {formatDate(task.created_at)}</Text>
                    <Text style={styles.title}>{task.title}</Text>
                    <View style={styles.priceRow}>
                        <View>
                            <Text style={styles.priceLabel}>Status</Text>
                            <Text style={[styles.statusText, { 
                                color: task.status === 'OPEN' ? theme.success : 
                                       task.status === 'COMPLETED' ? theme.success : theme.accent 
                            }]}>
                                {task.status.replace('_', ' ')}
                            </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.priceLabel}>Budget</Text>
                            <Text style={styles.payment}>{task.payment_amount}</Text>
                        </View>
                    </View>
                </View>

                {/* Location Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Location</Text>
                    <View style={styles.posterCard}>
                        <FontAwesome name="map-marker" size={24} color={theme.accent} style={{ marginRight: 15 }} />
                        <Text style={styles.addressText}>
                            {isPoster || isWorker 
                                ? (task.address || 'Address not set') 
                                : (distance ? `${distance.toFixed(1)} km away` : 'Location shared when hired')
                            }
                        </Text>
                    </View>

                    {/* Map - Only show if coordinates are available AND (isPoster OR isWorker) */}
                    {(isPoster || isWorker) && task.location_lat && task.location_lng && (
                        <View style={styles.mapContainer}>
                            <TaskMap 
                                latitude={task.location_lat}
                                longitude={task.location_lng}
                                title={task.title}
                                Rounding={Rounding.soft}
                            />
                        </View>
                    )}
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Description</Text>
                    <View style={styles.card}>
                        <Text style={styles.description}>{task.description}</Text>
                    </View>
                </View>

                {/* Media Section: Original Task Photo */}
                {task.image_url && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Task Photo</Text>
                        <View style={styles.mediaContainer}>
                            <Image source={{ uri: task.image_url }} style={styles.mediaImage} resizeMode="cover" />
                        </View>
                    </View>
                )}

                {/* Media Section: Completion Photo */}
                {task.completion_image_url && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Completion Proof</Text>
                        <View style={styles.mediaContainer}>
                            <Image source={{ uri: task.completion_image_url }} style={styles.mediaImage} resizeMode="cover" />
                        </View>
                    </View>
                )}

                {/* Poster View: Applicants List */}
                {isPoster && task.status === 'OPEN' && (
                    <ApplicantList 
                        applications={applications} 
                        navigation={navigation}
                        onMessage={handleMessageApplicant}
                        onHire={triggerHireModal}
                    />
                )}

                {/* General View: Posted By */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Posted By</Text>
                    {task.poster && (
                        <TouchableOpacity 
                            style={styles.posterCard}
                            onPress={() => navigation.navigate('PublicProfile', { userId: task.poster_id })}
                        >
                            <UserAvatar user={task.poster} size={50} />
                            <View style={styles.posterInfo}>
                                <Text style={styles.posterName}>{task.poster.name}</Text>
                                <RatingStars rating={task.poster.rating || 5} />
                            </View>
                            <FontAwesome name="chevron-right" size={14} color={theme.border} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Action Area */}
                <TaskActions 
                    task={task}
                    session={session}
                    isPoster={isPoster}
                    isWorker={isWorker}
                    hasApplied={hasApplied}
                    onApply={triggerApplyModal}
                    onMessagePoster={handleMessagePoster}
                    onConfirmCompletion={triggerApproveModal}
                    onMarkAsComplete={triggerCompleteModal}
                    onCancel={triggerCancelModal}
                />

                {/* Informational Badges */}
                <TaskStatusBanner 
                    task={task}
                    isPoster={isPoster}
                    isWorker={isWorker}
                />
            </ScrollView>

            <ConfirmationModal 
                visible={modalVisible}
                title={
                    modalType === 'HIRE' ? "Hire Applicant" : 
                    modalType === 'COMPLETE' ? "Mark Task Complete" : 
                    modalType === 'CANCEL' ? "Cancel Task" :
                    "Confirm Completion"
                }
                message={
                    modalType === 'HIRE' ? `Are you sure you want to hire ${selectedApplicant?.name} for this task?` : 
                    modalType === 'COMPLETE' ? "Are you finished with this task? This will notify the poster to confirm." : 
                    modalType === 'CANCEL' ? "Are you sure you want to cancel this task? It will be removed from the feed." :
                    "Has the work been completed to your satisfaction? This will officially close the task."
                }
                confirmText={
                    modalType === 'HIRE' ? "Approve" : 
                    modalType === 'COMPLETE' ? "Submit Work" : 
                    modalType === 'CANCEL' ? "Yes, Cancel" :
                    "Approve & Close"
                }
                type={modalType === 'COMPLETE' || modalType === 'APPROVE' ? 'success' : modalType === 'CANCEL' ? 'error' : 'primary'}
                onConfirm={handleModalConfirm}
                onCancel={() => {
                    setModalVisible(false);
                    setCompletionImage(null);
                }}
            >
                {modalType === 'COMPLETE' && (
                    <View style={styles.modalPhotoSection}>
                        <Text style={styles.modalPhotoLabel}>ADD COMPLETION PHOTO (OPTIONAL)</Text>
                        {completionImage ? (
                            <View style={styles.modalImagePreviewContainer}>
                                <Image source={{ uri: completionImage }} style={styles.modalImagePreview} />
                                <TouchableOpacity 
                                    style={styles.modalRemoveImageButton} 
                                    onPress={() => setCompletionImage(null)}
                                >
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

            <ReviewModal 
                visible={reviewModalVisible}
                userName={task.worker?.name || "your neighbor"}
                loading={reviewLoading}
                onSubmit={handleReviewSubmit}
                onCancel={() => setReviewModalVisible(false)}
            />

            <ApplicationModal 
                visible={applyModalVisible}
                onClose={() => setApplyModalVisible(false)}
                onSubmit={handleApply}
                taskTitle={task.title}
            />

            <ReportModal 
                visible={reportModalVisible}
                onClose={() => setReportModalVisible(false)}
                reportedTaskId={taskId}
                reportedUserId={task.poster_id}
                type="task"
            />
        </View>
    );
};

const createStyles = (theme, shadows) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.background,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.background,
    },
    emptyText: {
        color: theme.textMuted,
        fontSize: 16,
    },
    header: {
        backgroundColor: theme.primary,
        paddingTop: Spacing.lg,
        paddingBottom: Spacing.md,
        paddingHorizontal: Spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomLeftRadius: Rounding.soft,
        borderBottomRightRadius: Rounding.soft,
        ...shadows.medium,
        zIndex: 10,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
    },
    headerTitleContainer: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: theme.white,
    },
    headerSpacer: {
        width: 40,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        width: 80,
        justifyContent: 'flex-end',
    },
    headerAction: {
        paddingHorizontal: Spacing.sm,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        paddingBottom: 120,
    },
    titleSection: {
        padding: Spacing.lg,
        backgroundColor: theme.card,
        borderBottomLeftRadius: Rounding.soft,
        borderBottomRightRadius: Rounding.soft,
        ...shadows.subtle,
        marginBottom: Spacing.md,
    },
    categoryBadge: {
        backgroundColor: theme.isDarkMode ? 'rgba(255,255,255,0.05)' : '#E8EFF4',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderRadius: Rounding.pill,
        alignSelf: 'flex-start',
        marginBottom: Spacing.sm,
    },
    categoryText: {
        color: theme.primary,
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    postedDate: {
        fontSize: 12,
        color: theme.textMuted,
        fontWeight: '600',
        marginBottom: 4,
    },
    title: {
        fontSize: 26,
        fontWeight: '800',
        color: theme.primary,
        marginBottom: Spacing.md,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: theme.border,
        paddingTop: Spacing.md,
    },
    priceLabel: {
        fontSize: 12,
        color: theme.textMuted,
        fontWeight: '700',
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    statusText: {
        fontSize: 16,
        fontWeight: '800',
        textTransform: 'capitalize',
    },
    payment: {
        fontSize: 28,
        fontWeight: '900',
        color: theme.accent,
    },
    section: {
        paddingHorizontal: Spacing.lg,
        marginTop: Spacing.md,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.primary,
        marginBottom: Spacing.sm,
        marginLeft: 4,
    },
    card: {
        backgroundColor: theme.card,
        padding: Spacing.md,
        borderRadius: Rounding.soft,
        ...shadows.subtle,
        borderWidth: 1,
        borderColor: theme.border,
    },
    description: {
        fontSize: 16,
        color: theme.text,
        lineHeight: 24,
    },
    addressText: {
        fontSize: 16,
        color: theme.text,
        fontWeight: '600',
        flex: 1,
    },
    posterCard: {
        flexDirection: 'row',
        backgroundColor: theme.card,
        padding: Spacing.md,
        borderRadius: Rounding.soft,
        alignItems: 'center',
        ...shadows.subtle,
        borderWidth: 1,
        borderColor: theme.border,
    },
    posterInfo: {
        flex: 1,
        marginLeft: Spacing.md,
    },
    posterName: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.primary,
        marginBottom: 2,
    },
    mapContainer: {
        height: 200,
        marginTop: Spacing.md,
        borderRadius: Rounding.soft,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme.border,
        ...shadows.subtle,
    },
    mapView: {
        width: '100%',
        height: '100%',
    },
    mediaContainer: {
        width: '100%',
        height: 200,
        borderRadius: Rounding.soft,
        overflow: 'hidden',
        marginTop: Spacing.sm,
        borderWidth: 1,
        borderColor: theme.border,
        ...shadows.subtle,
    },
    mediaImage: {
        width: '100%',
        height: '100%',
    },
    modalPhotoSection: {
        marginTop: Spacing.md,
        marginBottom: Spacing.sm,
        paddingTop: Spacing.md,
        borderTopWidth: 1,
        borderTopColor: theme.border,
    },
    modalPhotoLabel: {
        fontSize: 10,
        fontWeight: '800',
        color: theme.primary,
        marginBottom: 10,
        textAlign: 'center',
    },
    modalAddPhotoButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.isDarkMode ? 'rgba(255,255,255,0.05)' : '#F0F4F8',
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: theme.border,
        borderRadius: Rounding.standard,
        padding: Spacing.md,
    },
    modalAddPhotoText: {
        marginLeft: 10,
        fontSize: 12,
        fontWeight: '700',
        color: theme.primary,
    },
    modalImagePreviewContainer: {
        width: '100%',
        height: 120,
        borderRadius: Rounding.standard,
        overflow: 'hidden',
        position: 'relative',
    },
    modalImagePreview: {
        width: '100%',
        height: '100%',
    },
    modalRemoveImageButton: {
        position: 'absolute',
        top: 5,
        right: 5,
        backgroundColor: theme.white,
        borderRadius: 12,
    }
});
