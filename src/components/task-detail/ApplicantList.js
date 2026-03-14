import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { UserAvatar } from '../../components/UserAvatar';
import { RatingStars } from '../../components/RatingStars';
import { Spacing, Rounding } from '../../utils/theme';
import { useTheme } from '../../components/ThemeContext';

export const ApplicantList = ({ applications, navigation, onMessage, onHire }) => {
    const { theme, shadows } = useTheme();
    const styles = createStyles(theme, shadows);

    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Applicants ({applications.length})</Text>
            {applications.length > 0 ? (
                applications.map((app) => (
                    <View key={app.id} style={styles.applicantCard}>
                        <View style={styles.applicantHeader}>
                            <TouchableOpacity onPress={() => navigation.navigate('PublicProfile', { userId: app.worker_id })}>
                                <UserAvatar user={app.worker} size={40} />
                            </TouchableOpacity>
                            <View style={styles.applicantInfo}>
                                <TouchableOpacity onPress={() => navigation.navigate('PublicProfile', { userId: app.worker_id })}>
                                    <Text style={styles.applicantName}>{app.worker.name}</Text>
                                </TouchableOpacity>
                                <RatingStars rating={app.worker.rating || 5} />
                            </View>
                            <View style={styles.actionButtons}>
                                <TouchableOpacity 
                                    style={[styles.msgButtonSmall, { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.primary }]}
                                    onPress={() => onMessage(app.worker_id)}
                                >
                                    <FontAwesome name="envelope" size={14} color={theme.primary} />
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={styles.acceptButtonSmall}
                                    onPress={() => onHire(app.worker_id, app.worker.name)}
                                >
                                    <Text style={styles.acceptButtonTextSmall}>Hire</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                        
                        {app.message && (
                            <View style={styles.messageBox}>
                                <Text style={styles.applicantMessage}>
                                    "{app.message}"
                                </Text>
                            </View>
                        )}
                    </View>
                ))
            ) : (
                <View style={styles.card}>
                    <Text style={styles.emptyTextSmall}>No applicants yet.</Text>
                </View>
            )}
        </View>
    );
};

const createStyles = (theme, shadows) => StyleSheet.create({
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
    applicantCard: {
        backgroundColor: theme.card,
        padding: Spacing.md,
        borderRadius: Rounding.soft,
        ...shadows.subtle,
        borderWidth: 1,
        borderColor: theme.border,
        marginBottom: Spacing.sm,
    },
    applicantHeader: {
        flexDirection: 'row',
        alignItems: 'center',
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
    applicantMessage: {
        fontSize: 13,
        color: theme.textMuted,
        fontStyle: 'italic',
        lineHeight: 18,
    },
    messageBox: {
        marginTop: Spacing.md,
        paddingTop: Spacing.sm,
        borderTopWidth: 1,
        borderTopColor: theme.border,
        paddingLeft: 4,
    },
    actionButtons: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    msgButtonSmall: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: Rounding.pill,
        marginRight: 8,
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
});
