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
    onMarkAsComplete 
}) => {
    const { theme, shadows } = useTheme();
    const styles = createStyles(theme, shadows);

    return (
        <View style={styles.actions}>
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

            {/* Tasker Action: Apply */}
            {!isPoster && !isWorker && task.status === 'OPEN' && (
                <TouchableOpacity 
                    style={[styles.applyButton, hasApplied && styles.disabledButton]} 
                    onPress={onApply}
                    disabled={hasApplied}
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
    buttonIcon: {
        marginRight: 10,
    },
});
