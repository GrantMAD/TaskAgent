import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { UserAvatar } from '../../components/UserAvatar';
import { RatingStars } from '../../components/RatingStars';
import { Spacing, Rounding } from '../../utils/theme';
import { useTheme } from '../../components/ThemeContext';
import { reliabilityService } from '../../services/reliabilityService';

const ApplicantItem = ({ app, navigation, onMessage, onHire, theme, shadows }) => {
    const [reliability, setReliability] = useState(null);
    const [loading, setLoading] = useState(true);
    const styles = createStyles(theme, shadows);

    useEffect(() => {
        if (!app.worker_id) return;
        const fetchReliability = async () => {
            try {
                const data = await reliabilityService.getUserReliability(app.worker_id);
                setReliability(data);
            } catch (err) {
                console.warn('Applicant Reliability Load Error:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchReliability();
    }, [app.worker_id]);

    if (!app.worker) return null; // Safety: Don't render if user deleted their account

    return (
        <View style={styles.applicantCard}>
            <View style={styles.applicantHeader}>
                <TouchableOpacity onPress={() => navigation.navigate('PublicProfile', { userId: app.worker_id })}>
                    <UserAvatar user={app.worker} size={40} />
                </TouchableOpacity>
                <View style={styles.applicantInfo}>
                    <TouchableOpacity onPress={() => navigation.navigate('PublicProfile', { userId: app.worker_id })}>
                        <Text style={styles.applicantName}>{app.worker.name}</Text>
                    </TouchableOpacity>
                    <View style={styles.ratingRow}>
                        <RatingStars rating={app.worker.rating || 5} size={12} />
                        {loading ? (
                            <ActivityIndicator size="small" color={theme.primary} style={{ marginLeft: 8 }} />
                        ) : reliability && (
                            <View style={styles.reliabilityBadgeSmall}>
                                <FontAwesome name="shield" size={10} color={theme.primary} />
                                <Text style={styles.reliabilityTextSmall}>{reliability.score}</Text>
                            </View>
                        )}
                    </View>
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
    );
};

export const ApplicantList = ({ applications, navigation, onMessage, onHire }) => {
    const { theme, shadows } = useTheme();
    const styles = createStyles(theme, shadows);

    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Applicants ({applications.length})</Text>
            {applications.length > 0 ? (
                applications.map((app) => (
                    <ApplicantItem 
                        key={app.id} 
                        app={app} 
                        navigation={navigation} 
                        onMessage={onMessage} 
                        onHire={onHire}
                        theme={theme}
                        shadows={shadows}
                    />
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
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    reliabilityBadgeSmall: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.isDarkMode ? 'rgba(255,255,255,0.05)' : '#E8EFF4',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 8,
    },
    reliabilityTextSmall: {
        fontSize: 10,
        fontWeight: '800',
        color: theme.primary,
        marginLeft: 4,
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
