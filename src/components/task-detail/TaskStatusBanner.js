import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Spacing, Rounding } from '../../utils/theme';
import { useTheme } from '../../components/ThemeContext';

export const TaskStatusBanner = ({ task, isPoster, isWorker }) => {
    const { theme } = useTheme();
    const styles = createStyles(theme);

    return (
        <View>
            {isPoster && task.status === 'ASSIGNED' && (
                <View style={[styles.infoBadge, { backgroundColor: theme.isDarkMode ? 'rgba(74, 144, 226, 0.2)' : '#E6F0FA' }]}>
                    <FontAwesome name="handshake-o" size={16} color={theme.primary} style={styles.icon} />
                    <Text style={[styles.infoBadgeText, { color: theme.primary }]}>Worker Assigned & In Progress</Text>
                </View>
            )}

            {task.status === 'PENDING_CONFIRMATION' && (
                <View style={[styles.infoBadge, { backgroundColor: theme.isDarkMode ? 'rgba(230, 138, 0, 0.2)' : '#FFF4E5' }]}>
                    <FontAwesome name="clock-o" size={16} color={theme.accent} style={styles.icon} />
                    <Text style={[styles.infoBadgeText, { color: theme.accent }]}>
                        {isWorker ? 'Waiting for Poster to confirm completion' : 'Worker has marked this as complete. Confirm?'}
                    </Text>
                </View>
            )}

            {task.status === 'COMPLETED' && (
                <View style={[styles.infoBadge, { backgroundColor: theme.isDarkMode ? 'rgba(40, 167, 69, 0.2)' : '#E8F3ED' }]}>
                    <FontAwesome name="check-circle" size={16} color={theme.success} style={styles.icon} />
                    <Text style={[styles.infoBadgeText, { color: theme.success }]}>
                        This task is successfully completed!
                    </Text>
                </View>
            )}

            {task.status === 'DISPUTED' && (
                <View style={[styles.infoBadge, { backgroundColor: '#FFFBEB' }]}>
                    <FontAwesome name="shield" size={16} color="#B45309" style={styles.icon} />
                    <Text style={[styles.infoBadgeText, { color: '#92400E' }]}>
                        Dispute in Progress. An admin is mediating.
                    </Text>
                </View>
            )}
        </View>
    );
};

const createStyles = (theme) => StyleSheet.create({
    infoBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.md,
        marginHorizontal: Spacing.lg,
        marginBottom: Spacing.lg,
        borderRadius: Rounding.standard,
    },
    infoBadgeText: {
        fontSize: 14,
        fontWeight: '700',
        flex: 1,
    },
    icon: {
        marginRight: 8,
    },
});
