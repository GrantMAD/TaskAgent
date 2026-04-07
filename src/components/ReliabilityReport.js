import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Spacing, Rounding } from '../utils/theme';
import { useTheme } from './ThemeContext';


const ReliabilityReport = ({ reliability }) => {
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    if (!reliability || !reliability.metrics) return null;

    const { metrics, score, label } = reliability;

    const renderProgressBar = (value, color) => (
        <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${value}%`, backgroundColor: color }]} />
        </View>
    );

    // Internal helper for speed score display
    const calculateLocalSpeedScore = (minutes) => {
        if (minutes === null) return 75;
        if (minutes <= 60) return 100;
        if (minutes <= 180) return 90;
        if (minutes <= 720) return 75;
        if (minutes <= 1440) return 60;
        return 40;
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Trust Report</Text>
                    <Text style={styles.subtitle}>Derived from platform behavior</Text>
                </View>
                <View style={styles.scoreContainer}>
                    <Text style={styles.scoreValue}>{score}</Text>
                    <Text style={styles.scoreLabel}>{label}</Text>
                </View>
            </View>

            <View style={styles.grid}>
                {/* Primary Metrics */}
                <View style={styles.metricCard}>
                    <View style={styles.metricHeader}>
                        <FontAwesome name="check-circle" size={14} color={theme.success} />
                        <Text style={styles.metricTitle}>Completion</Text>
                    </View>
                    <Text style={styles.metricValue}>{metrics.completion.rate}%</Text>
                    {renderProgressBar(metrics.completion.rate, theme.success)}
                    <Text style={styles.metricDetail}>{metrics.completion.completed} jobs done</Text>
                </View>

                <View style={styles.metricCard}>
                    <View style={styles.metricHeader}>
                        <FontAwesome name="bolt" size={14} color={theme.accent} />
                        <Text style={styles.metricTitle}>Response</Text>
                    </View>
                    <Text style={styles.metricValue}>{metrics.replyTime.label}</Text>
                    {renderProgressBar(calculateLocalSpeedScore(metrics.replyTime.averageMinutes), theme.accent)}
                    <Text style={styles.metricDetail}>Avg reply time</Text>
                </View>

                {/* Advanced Metrics */}
                <View style={styles.metricCard}>
                    <View style={styles.metricHeader}>
                        <FontAwesome name="users" size={14} color={theme.primary} />
                        <Text style={styles.metricTitle}>Loyalty</Text>
                    </View>
                    <Text style={styles.metricValue}>{metrics.loyalty.repeatRate}%</Text>
                    {renderProgressBar(metrics.loyalty.repeatRate, theme.primary)}
                    <Text style={styles.metricDetail}>{metrics.loyalty.totalPosters} unique posters</Text>
                </View>

                <View style={styles.metricCard}>
                    <View style={styles.metricHeader}>
                        <FontAwesome name="fire" size={14} color="#FF5722" />
                        <Text style={styles.metricTitle}>Streak</Text>
                    </View>
                    <Text style={styles.metricValue}>{metrics.streak.current}</Text>
                    <View style={styles.streakDots}>
                        {[...Array(Math.min(metrics.streak.current, 5))].map((_, i) => (
                            <View key={i} style={styles.streakDot} />
                        ))}
                    </View>
                    <Text style={styles.metricDetail}>Best: {metrics.streak.best}</Text>
                </View>
            </View>

            {/* Recency Signal */}
            <View style={styles.recencyFooter}>
                <FontAwesome name="history" size={12} color={theme.textMuted} />
                <Text style={styles.recencyText}>
                    Recent Performance (Last 10): {metrics.recent.rate}% completion
                </Text>
            </View>
        </View>
    );
};

const createStyles = (theme) => StyleSheet.create({
    container: {
        backgroundColor: theme.card,
        borderRadius: Rounding.medium,
        padding: Spacing.md,
        marginVertical: Spacing.sm,
        borderWidth: 1,
        borderColor: theme.border,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.text,
    },
    subtitle: {
        fontSize: 12,
        color: theme.textMuted,
    },
    scoreContainer: {
        alignItems: 'center',
        backgroundColor: theme.primary + '10',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: Rounding.soft,
    },
    scoreValue: {
        fontSize: 20,
        fontWeight: '900',
        color: theme.primary,
    },
    scoreLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        color: theme.primary,
        textTransform: 'uppercase',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    metricCard: {
        width: '48%',
        backgroundColor: theme.background,
        borderRadius: Rounding.small,
        padding: Spacing.sm,
        marginBottom: Spacing.md,
    },
    metricHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.xs,
    },
    metricTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.textMuted,
        marginLeft: 6,
    },
    metricValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.text,
        marginVertical: 2,
    },
    progressContainer: {
        height: 4,
        backgroundColor: theme.border,
        borderRadius: 2,
        marginVertical: 4,
    },
    progressBar: {
        height: '100%',
        borderRadius: 2,
    },
    metricDetail: {
        fontSize: 10,
        color: theme.textMuted,
    },
    streakDots: {
        flexDirection: 'row',
        height: 4,
        marginVertical: 4,
    },
    streakDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#FF5722',
        marginRight: 4,
    },
    recencyFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: Spacing.xs,
        paddingTop: Spacing.sm,
        borderTopWidth: 1,
        borderTopColor: theme.border,
    },
    recencyText: {
        fontSize: 11,
        color: theme.textMuted,
        marginLeft: 6,
        fontStyle: 'italic',
    }
});

export default ReliabilityReport;
