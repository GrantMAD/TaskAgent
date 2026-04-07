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
                    <UserAvatar user={app.worker} size={44} />
                </TouchableOpacity>
                
                <View style={styles.applicantMainInfo}>
                    <TouchableOpacity onPress={() => navigation.navigate('PublicProfile', { userId: app.worker_id })}>
                        <Text style={styles.applicantName}>{app.worker.name}</Text>
                    </TouchableOpacity>
                    <RatingStars rating={app.worker.rating || 5} size={12} />
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

            <View style={styles.metricsContainer}>
                {!loading && reliability ? (
                    <>
                        <View style={styles.metricsRow}>
                            <View style={styles.trustSignalItem}>
                                <FontAwesome name="briefcase" size={10} color={theme.textMuted} />
                                <Text style={styles.trustSignalText}>{app.worker.completed_tasks || 0} jobs done</Text>
                            </View>
                            <View style={styles.trustSignalItem}>
                                <FontAwesome name="shield" size={10} color={theme.primary} />
                                <Text style={styles.trustSignalText}>Score: {reliability.score}</Text>
                            </View>
                        </View>
                        
                        <View style={styles.metricsRow}>
                            <View style={styles.trustSignalItem}>
                                <FontAwesome name="bolt" size={10} color={theme.accent} />
                                <Text style={styles.trustSignalText}>Replies {reliability.metrics.replyTime.label}</Text>
                            </View>
                            <View style={styles.trustSignalItem}>
                                <FontAwesome name="check-circle" size={10} color={theme.success} />
                                <Text style={styles.trustSignalText}>{reliability.metrics.completion.rate}% Done</Text>
                            </View>
                        </View>
                    </>
                ) : (
                    loading && <ActivityIndicator size="small" color={theme.primary} style={{ alignSelf: 'flex-start', marginTop: 4 }} />
                )}
            </View>
            
            {app.message && (
                <View style={styles.messageBox}>
                    <Text style={styles.applicantMessage}>
                        {`"${app.message}"`}
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
    applicantMainInfo: {
        flex: 1,
        marginLeft: Spacing.md,
        justifyContent: 'center',
    },
    applicantName: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.text,
        marginBottom: 2,
    },
    metricsContainer: {
        marginTop: Spacing.sm,
        paddingLeft: 44 + Spacing.md,
    },
    metricsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    trustSignalItem: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '50%', // Split row in half
    },
    trustSignalText: {
        fontSize: 11,
        fontWeight: '500',
        color: theme.textMuted,
        marginLeft: 6,
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
