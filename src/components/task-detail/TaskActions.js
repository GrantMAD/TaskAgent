import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Spacing, Rounding } from '../../utils/theme';
import { useTheme } from '../../components/ThemeContext';

export const TaskActions = ({ 
    task, 
    session, 
    isPoster, 
    isWorker, 
    hasApplied, 
    onApply, 
    onMessagePoster, 
    onConfirmCompletion, 
    onMarkAsComplete,
    onCancel,
    onCancelApplication
}) => {
    const { theme, shadows } = useTheme();
    const styles = createStyles(theme, shadows);

    return (
        <View style={styles.actions}>
            {isPoster && task.status === 'OPEN' && (
                <TouchableOpacity style={[styles.cancelButton]} onPress={onCancel}>
                    <FontAwesome name="times-circle" size={18} color={theme.error} style={styles.buttonIcon} />
                    <Text style={styles.cancelButtonText}>Cancel Task</Text>
                </TouchableOpacity>
            )}

            {/* Poster Action: Confirm Completion */}
            {isPoster && task.status === 'PENDING_CONFIRMATION' && (
                <TouchableOpacity style={styles.completeButton} onPress={onConfirmCompletion}>
                    <FontAwesome name="check-square-o" size={18} color={theme.white} style={styles.buttonIcon} />
                    <Text style={styles.applyButtonText}>Confirm Completion</Text>
                </TouchableOpacity>
            )}

            {/* Worker Action: Mark as Complete */}
            {isWorker && task.status === 'ASSIGNED' && (
                <TouchableOpacity style={[styles.completeButton, { backgroundColor: theme.success }]} onPress={onMarkAsComplete}>
                    <FontAwesome name="check-circle" size={18} color={theme.white} style={styles.buttonIcon} />
                    <Text style={styles.applyButtonText}>Mark as Complete</Text>
                </TouchableOpacity>
            )}

            {/* Tasker Action: Apply / Withdraw */}
            {!isPoster && !isWorker && task.status === 'OPEN' && (
                <View>
                    <TouchableOpacity 
                        style={[styles.applyButton, hasApplied && styles.disabledButton]} 
                        onPress={onApply}
                        disabled={hasApplied}
                        activeOpacity={0.7}
                    >
                        <FontAwesome 
                            name={hasApplied ? "clock-o" : "check-circle"} 
                            size={18} 
                            color={theme.white} 
                            style={styles.buttonIcon} 
                        />
                        <Text style={styles.applyButtonText}>
                            {hasApplied ? 'Waiting for Approval' : 'Apply for Task'}
                        </Text>
                    </TouchableOpacity>

                    {hasApplied && (
                        <TouchableOpacity 
                            style={styles.withdrawButton} 
                            onPress={() => {
                                console.log('Withdraw pressed');
                                onCancelApplication();
                            }}
                            activeOpacity={0.6}
                        >
                            <FontAwesome name="undo" size={14} color={theme.textMuted} style={styles.buttonIcon} />
                            <Text style={styles.withdrawButtonText}>Withdraw Application</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* Universal Action: Message */}
            {session && (!isPoster || task.assigned_worker_id) && (
                <TouchableOpacity style={styles.messageButton} onPress={onMessagePoster}>
                    <FontAwesome name="envelope" size={18} color={theme.primary} style={styles.buttonIcon} />
                    <Text style={styles.messageButtonText}>
                        {isPoster ? 'Message Tasker' : 'Message Poster'}
                    </Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

const createStyles = (theme, shadows) => StyleSheet.create({
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
    disabledButton: {
        backgroundColor: theme.border,
        opacity: 0.8,
    },
    completeButton: {
        backgroundColor: theme.primary,
        flexDirection: 'row',
        padding: Spacing.md,
        borderRadius: Rounding.pill,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.md,
        ...shadows.medium,
    },
    messageButton: {
        backgroundColor: theme.surface,
        flexDirection: 'row',
        padding: Spacing.md,
        borderRadius: Rounding.pill,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: theme.primary,
        ...shadows.subtle,
    },
    cancelButton: {
        backgroundColor: theme.surface,
        flexDirection: 'row',
        padding: Spacing.md,
        borderRadius: Rounding.pill,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: theme.error,
        marginBottom: Spacing.md,
        ...shadows.subtle,
    },
    applyButtonText: {
        color: theme.white,
        fontSize: 16,
        fontWeight: '800',
    },
    messageButtonText: {
        color: theme.primary,
        fontSize: 16,
        fontWeight: '800',
    },
    cancelButtonText: {
        color: theme.error,
        fontSize: 16,
        fontWeight: '800',
    },
    buttonIcon: {
        marginRight: 10,
    },
    withdrawButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.md,
        marginTop: -Spacing.xs,
        marginBottom: Spacing.md,
        borderRadius: Rounding.pill,
        backgroundColor: theme.surface,
        borderWidth: 1,
        borderColor: theme.border,
        borderStyle: 'dashed',
    },
    withdrawButtonText: {
        color: theme.textMuted,
        fontSize: 14,
        fontWeight: '700',
    },
});
