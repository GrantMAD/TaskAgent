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
                        <TouchableOpacity onPress={() => navigation.navigate('PublicProfile', { userId: app.worker_id })}>
                            <UserAvatar user={app.worker} size={40} />
                        </TouchableOpacity>
                        <View style={styles.applicantInfo}>
                            <TouchableOpacity onPress={() => navigation.navigate('PublicProfile', { userId: app.worker_id })}>
                                <Text style={styles.applicantName}>{app.worker.name}</Text>
                            </TouchableOpacity>
                            <RatingStars rating={app.worker.rating || 5} />
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <TouchableOpacity 
                                style={[styles.acceptButtonSmall, { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.primary, marginRight: 8, paddingHorizontal: 12 }]}
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
});
