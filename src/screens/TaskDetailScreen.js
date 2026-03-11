import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Alert } from 'react-native';
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

export const TaskDetailScreen = ({ route, navigation }) => {
    const { theme, shadows } = useTheme();
    const { userLocation, calculateDistance } = useLocation();
    const { taskId } = route.params;
    const [task, setTask] = useState(null);
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [session, setSession] = useState(null);
    const { showToast } = useToast();
    
    const styles = useMemo(() => createStyles(theme, shadows), [theme, shadows]);

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
    const [modalType, setModalVisibleType] = useState('HIRE'); // 'HIRE', 'COMPLETE', or 'APPROVE'
    const [selectedApplicant, setSelectedApplicant] = useState(null);

    // Review Modal State
    const [reviewModalVisible, setReviewModalVisible] = useState(false);
    const [reviewLoading, setReviewLoading] = useState(false);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });
        fetchTaskDetails();
    }, [taskId]);

    const fetchTaskDetails = async () => {
        try {
            const data = await taskService.getTaskDetails(taskId);
            setTask(data);
            
            // If the user is the poster, fetch applications
            const { data: { session } } = await supabase.auth.getSession();
            if (session && session.user.id === data.poster_id) {
                const apps = await taskService.getTaskApplications(taskId);
                setApplications(apps);
            }
        } catch (error) {
            console.error(error);
            showToast('Could not load task details', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleApply = async () => {
        try {
            if (!session) return;
            await taskService.applyForTask(taskId, session.user.id, "I would like to apply for this task!");
            showToast('Application submitted successfully!', 'success');
        } catch (error) {
            showToast(error.message, 'error');
        }
    };

    const handleMessagePoster = async () => {
        try {
            const conv = await messageService.createConversation(taskId);
            navigation.navigate('Chat', { conversationId: conv.id });
        } catch (error) {
            showToast(error.message, 'error');
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

    const handleModalConfirm = () => {
        if (modalType === 'HIRE') {
            handleConfirmHire();
        } else if (modalType === 'COMPLETE') {
            handleConfirmComplete();
        } else {
            handleConfirmApprove();
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
            await taskService.markTaskComplete(taskId);
            showToast('Work submitted for confirmation!', 'success');
            fetchTaskDetails();
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setLoading(false);
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

    if (loading && !task) {
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
                <View style={styles.headerSpacer} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.titleSection}>
                    <View style={styles.categoryBadge}>
                        <Text style={styles.categoryText}>{task.category}</Text>
                    </View>
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

                {/* Poster View: Applicants List */}
                {isPoster && task.status === 'OPEN' && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Applicants ({applications.length})</Text>
                        {applications.length > 0 ? (
                            applications.map((app) => (
                                <View key={app.id} style={styles.applicantCard}>
                                    <UserAvatar user={app.worker} size={40} />
                                    <View style={styles.applicantInfo}>
                                        <Text style={styles.applicantName}>{app.worker.name}</Text>
                                        <RatingStars rating={app.worker.rating || 5} />
                                    </View>
                                    <TouchableOpacity 
                                        style={styles.acceptButtonSmall}
                                        onPress={() => triggerHireModal(app.worker_id, app.worker.name)}
                                    >
                                        <Text style={styles.acceptButtonTextSmall}>Hire</Text>
                                    </TouchableOpacity>
                                </View>
                            ))
                        ) : (
                            <View style={styles.card}>
                                <Text style={styles.emptyTextSmall}>No applicants yet.</Text>
                            </View>
                        )}
                    </View>
                )}

                {/* General View: Posted By */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Posted By</Text>
                    {task.poster && (
                        <TouchableOpacity 
                            style={styles.posterCard}
                            onPress={() => showToast('This feature is coming soon!', 'info')}
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
                <View style={styles.actions}>
                    {/* Poster Action: Confirm Completion */}
                    {isPoster && task.status === 'PENDING_CONFIRMATION' && (
                        <TouchableOpacity style={styles.completeButton} onPress={triggerApproveModal}>
                            <FontAwesome name="check-square-o" size={18} color={theme.white} style={styles.buttonIcon} />
                            <Text style={styles.applyButtonText}>Confirm Completion</Text>
                        </TouchableOpacity>
                    )}

                    {/* Worker Action: Mark as Complete */}
                    {isWorker && task.status === 'ASSIGNED' && (
                        <TouchableOpacity style={[styles.completeButton, { backgroundColor: theme.success }]} onPress={triggerCompleteModal}>
                            <FontAwesome name="check-circle" size={18} color={theme.white} style={styles.buttonIcon} />
                            <Text style={styles.applyButtonText}>Mark as Complete</Text>
                        </TouchableOpacity>
                    )}

                    {/* Tasker Action: Apply */}
                    {!isPoster && !isWorker && task.status === 'OPEN' && (
                        <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
                            <FontAwesome name="check-circle" size={18} color={theme.white} style={styles.buttonIcon} />
                            <Text style={styles.applyButtonText}>Apply for Task</Text>
                        </TouchableOpacity>
                    )}

                    {/* Universal Action: Message */}
                    {session && (
                        <TouchableOpacity style={styles.messageButton} onPress={handleMessagePoster}>
                            <FontAwesome name="envelope" size={18} color={theme.primary} style={styles.buttonIcon} />
                            <Text style={styles.messageButtonText}>
                                {isPoster ? 'Message Worker' : 'Message Neighbor'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Informational Badges */}
                {isPoster && task.status === 'ASSIGNED' && (
                    <View style={styles.infoBadge}>
                        <FontAwesome name="handshake-o" size={16} color={theme.primary} style={{ marginRight: 8 }} />
                        <Text style={styles.infoBadgeText}>Worker Assigned & In Progress</Text>
                    </View>
                )}

                {task.status === 'PENDING_CONFIRMATION' && (
                    <View style={[styles.infoBadge, { backgroundColor: theme.isDarkMode ? 'rgba(230, 138, 0, 0.2)' : '#FFF4E5' }]}>
                        <FontAwesome name="clock-o" size={16} color={theme.accent} style={{ marginRight: 8 }} />
                        <Text style={[styles.infoBadgeText, { color: theme.accent }]}>
                            {isWorker ? 'Waiting for Poster to confirm completion' : 'Worker has marked this as complete. Confirm?'}
                        </Text>
                    </View>
                )}

                {task.status === 'COMPLETED' && (
                    <View style={[styles.infoBadge, { backgroundColor: theme.isDarkMode ? 'rgba(40, 167, 69, 0.2)' : '#E8F3ED' }]}>
                        <FontAwesome name="check-circle" size={16} color={theme.success} style={{ marginRight: 8 }} />
                        <Text style={[styles.infoBadgeText, { color: theme.success }]}>
                            This task is successfully completed!
                        </Text>
                    </View>
                )}
            </ScrollView>

            <ConfirmationModal 
                visible={modalVisible}
                title={
                    modalType === 'HIRE' ? "Hire Applicant" : 
                    modalType === 'COMPLETE' ? "Mark Task Complete" : 
                    "Confirm Completion"
                }
                message={
                    modalType === 'HIRE' ? `Are you sure you want to hire ${selectedApplicant?.name} for this task?` : 
                    modalType === 'COMPLETE' ? "Are you finished with this task? This will notify the poster to confirm." : 
                    "Has the work been completed to your satisfaction? This will officially close the task."
                }
                confirmText={
                    modalType === 'HIRE' ? "Approve" : 
                    modalType === 'COMPLETE' ? "Submit Work" : 
                    "Approve & Close"
                }
                type={modalType === 'COMPLETE' || modalType === 'APPROVE' ? 'success' : 'primary'}
                onConfirm={handleModalConfirm}
                onCancel={() => setModalVisible(false)}
            />

            <ReviewModal 
                visible={reviewModalVisible}
                userName={task.worker?.name || "your neighbor"}
                loading={reviewLoading}
                onSubmit={handleReviewSubmit}
                onCancel={() => setReviewModalVisible(false)}
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
    applicantCard: {
        flexDirection: 'row',
        backgroundColor: theme.card,
        padding: Spacing.md,
        borderRadius: Rounding.soft,
        alignItems: 'center',
        ...shadows.subtle,
        borderWidth: 1,
        borderColor: theme.border,
        marginBottom: Spacing.sm,
    },
    applicantInfo: {
        flex: 1,
        marginLeft: Spacing.md,
    },
    applicantName: {
        fontSize: 15,
        fontWeight: '700',
        color: theme.text,
    },
    acceptButtonSmall: {
        backgroundColor: theme.primary,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: Rounding.pill,
    },
    acceptButtonTextSmall: {
        color: theme.white,
        fontWeight: '700',
        fontSize: 13,
    },
    emptyTextSmall: {
        color: theme.textMuted,
        fontSize: 14,
        fontStyle: 'italic',
    },
    actions: {
        padding: Spacing.lg,
        marginTop: Spacing.xl,
    },
    applyButton: {
        backgroundColor: theme.accent,
        flexDirection: 'row',
        padding: Spacing.md,
        borderRadius: Rounding.pill,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.md,
        ...shadows.accent,
    },
    completeButton: {
        backgroundColor: theme.primary, // Using primary navy for approval
        flexDirection: 'row',
        padding: Spacing.md,
        borderRadius: Rounding.pill,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.md,
        ...shadows.subtle,
    },
    applyButtonText: {
        color: theme.white,
        fontWeight: '700',
        fontSize: 18,
    },
    messageButton: {
        backgroundColor: theme.surface,
        flexDirection: 'row',
        padding: Spacing.md,
        borderRadius: Rounding.pill,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: theme.primary,
    },
    messageButtonText: {
        color: theme.primary,
        fontWeight: '700',
        fontSize: 16,
    },
    buttonIcon: {
        marginRight: 10,
    },
    infoBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: Spacing.xl,
        backgroundColor: theme.isDarkMode ? 'rgba(255,255,255,0.05)' : '#E8EFF4',
        padding: Spacing.md,
        marginHorizontal: Spacing.lg,
        borderRadius: Rounding.standard,
    },
    infoBadgeText: {
        color: theme.primary,
        fontWeight: '600',
        fontSize: 14,
        textAlign: 'center',
        flex: 1,
    },
    mapContainer: {
        marginTop: Spacing.md,
        borderRadius: Rounding.soft,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme.border,
        height: 200,
        ...shadows.subtle,
    },
    mapView: {
        width: '100%',
        height: '100%',
    }
});
