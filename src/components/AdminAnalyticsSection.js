import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Spacing, Rounding } from '../utils/theme';
import { useTheme } from './ThemeContext';
import { CURRENCY_SYMBOL } from '../utils/constants';

const { width } = Dimensions.get('window');

export const AdminAnalyticsSection = ({ analytics, categories, marketInsights, reputation }) => {
    const { theme, shadows } = useTheme();

    if (!analytics || !categories) return null;

    const MetricPill = ({ label, value, icon, color, subValue }) => (
        <View style={[styles.metricPill, { backgroundColor: theme.card, borderColor: theme.border }, shadows.small]}>
            <View style={[styles.iconCircle, { backgroundColor: color + '20' }]}>
                <FontAwesome name={icon} size={14} color={color} />
            </View>
            <View style={styles.metricInfo}>
                <Text style={[styles.metricLabel, { color: theme.textMuted }]}>{label}</Text>
                <Text style={[styles.metricValue, { color: theme.text }]}>{value}</Text>
                {subValue && <Text style={[styles.subValue, { color: theme.success }]}>{subValue}</Text>}
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <FontAwesome name="line-chart" size={18} color={theme.primary} />
                <Text style={[styles.title, { color: theme.primary }]}>Insights & Trends</Text>
            </View>

            <View style={styles.metricsGrid}>
                <MetricPill 
                    label="New Users (7d)" 
                    value={analytics.newUsers7d} 
                    icon="user-plus" 
                    color="#3B82F6" 
                    subValue={`+${analytics.newUsers30d} this month`}
                />
                <MetricPill 
                    label="Completion Rate" 
                    value={`${analytics.completionRate.toFixed(1)}%`} 
                    icon="check-circle" 
                    color="#10B981" 
                />
                <MetricPill 
                    label="Avg. Budget"
                    value={`${CURRENCY_SYMBOL}${analytics.avgBudget}`}
                    icon="money"
                    color="#4ECDC4"
                />
                <MetricPill 
                    label="Total Jobs" 
                    value={analytics.totalTasks} 
                    icon="briefcase" 
                    color="#8B5CF6" 
                />
                <MetricPill 
                    label="Platform Avg Reply" 
                    value={analytics.avgReplyTime || 'N/A'} 
                    icon="bolt" 
                    color="#F59E0B" 
                />
                {reputation && (
                    <MetricPill 
                        label="Global Avg Rating" 
                        value={`${reputation.avgRating} / 5.0`} 
                        icon="star" 
                        color="#FCD34D" 
                    />
                )}
            </View>

            {/* Reputation & Trust Section */}
            {reputation && (
                <View style={[styles.chartCard, { backgroundColor: theme.card, borderColor: theme.border, marginBottom: Spacing.lg }, shadows.medium]}>
                    <Text style={[styles.chartTitle, { color: theme.text }]}>Trust & Reputation Distribution</Text>
                    <View style={styles.distributionRow}>
                        <View style={styles.distItem}>
                            <Text style={[styles.distCount, { color: theme.success }]}>{reputation.distribution.exceptional}</Text>
                            <Text style={[styles.distLabel, { color: theme.textMuted }]}>Exceptional (4.8+)</Text>
                        </View>
                        <View style={styles.distItem}>
                            <Text style={[styles.distCount, { color: theme.primary }]}>{reputation.distribution.high}</Text>
                            <Text style={[styles.distLabel, { color: theme.textMuted }]}>High (4.0+)</Text>
                        </View>
                        <View style={styles.distItem}>
                            <Text style={[styles.distCount, { color: theme.accent }]}>{reputation.distribution.consistent}</Text>
                            <Text style={[styles.distLabel, { color: theme.textMuted }]}>Consistent</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <Text style={[styles.chartTitle, { color: theme.text, marginTop: Spacing.md }]}>Superstar Neighbors</Text>
                    {reputation.superstars.map((user, idx) => (
                        <View key={user.id} style={styles.superstarRow}>
                            <View style={styles.superstarInfo}>
                                <Text style={styles.superstarRank}>{idx + 1}</Text>
                                <View>
                                    <Text style={[styles.superstarName, { color: theme.text }]}>{user.name}</Text>
                                    <Text style={[styles.superstarDetail, { color: theme.textMuted }]}>
                                        Score: {user.reliability?.score || 0} • {user.completed_tasks} jobs
                                    </Text>
                                </View>
                            </View>
                            <View style={[styles.superstarBadge, { backgroundColor: theme.primary + '15' }]}>
                                <FontAwesome name="shield" size={10} color={theme.primary} />
                                <Text style={[styles.superstarBadgeText, { color: theme.primary }]}>TOP TIER</Text>
                            </View>
                        </View>
                    ))}
                </View>
            )}

            {/* Popular Categories */}
            <View style={[styles.chartCard, { backgroundColor: theme.card, borderColor: theme.border }, shadows.medium]}>
                <Text style={[styles.chartTitle, { color: theme.text }]}>Popular Categories</Text>
                {categories.slice(0, 5).map((cat, index) => {
                    const percentage = (cat.count / (analytics.totalTasks || 1)) * 100;
                    return (
                        <View key={cat.name} style={styles.catRow}>
                            <View style={styles.catLabelRow}>
                                <Text style={[styles.catName, { color: theme.text }]}>{cat.name}</Text>
                                <Text style={[styles.catCount, { color: theme.textMuted }]}>{cat.count} jobs</Text>
                            </View>
                            <View style={[styles.progressBarBg, { backgroundColor: theme.background }]}>
                                <View 
                                    style={[
                                        styles.progressBarFill, 
                                        { 
                                            width: `${percentage}%`, 
                                            backgroundColor: index === 0 ? theme.primary : theme.accent 
                                        }
                                    ]} 
                                />
                            </View>
                        </View>
                    );
                })}
            </View>

            {/* New: Market Opportunity Insights */}
            {marketInsights && marketInsights.length > 0 && (
                <View style={[styles.chartCard, { backgroundColor: theme.card, borderColor: theme.border, marginTop: Spacing.lg }, shadows.medium]}>
                    <View style={styles.chartHeaderRow}>
                        <Text style={[styles.chartTitle, { color: theme.text, marginBottom: 0 }]}>Service Gap Analysis</Text>
                        <View style={styles.infoBadge}>
                            <Text style={styles.infoBadgeText}>OPPORTUNITY INDEX</Text>
                        </View>
                    </View>
                    <Text style={[styles.chartSubtitle, { color: theme.textMuted }]}>
                        High scores indicate many searches but few active tasks.
                    </Text>

                    {marketInsights.slice(0, 4).map((item) => (
                        <View key={item.category} style={styles.gapRow}>
                            <View style={styles.gapLabelRow}>
                                <Text style={[styles.gapCategory, { color: theme.text }]}>{item.category}</Text>
                                <View style={styles.gapStats}>
                                    <Text style={[styles.gapStatText, { color: theme.textMuted }]}>
                                        {item.search_count} searches vs {item.task_count} jobs
                                    </Text>
                                </View>
                            </View>
                            <View style={[styles.gapBarBg, { backgroundColor: theme.background }]}>
                                <View 
                                    style={[
                                        styles.gapBarFill, 
                                        { 
                                            width: `${Math.min(item.gap_score * 20, 100)}%`, 
                                            backgroundColor: item.gap_score > 2 ? theme.error : theme.success 
                                        }
                                    ]} 
                                />
                            </View>
                        </View>
                    ))}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginTop: Spacing.xl,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    title: {
        fontSize: 18,
        fontWeight: '800',
        marginLeft: Spacing.sm,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    metricsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: Spacing.lg,
    },
    metricPill: {
        width: (width - Spacing.lg * 2 - Spacing.sm) / 2,
        padding: Spacing.md,
        borderRadius: Rounding.soft,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    iconCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.sm,
    },
    metricInfo: {
        flex: 1,
    },
    metricLabel: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    metricValue: {
        fontSize: 16,
        fontWeight: '800',
    },
    subValue: {
        fontSize: 9,
        fontWeight: '600',
        marginTop: 1,
    },
    chartCard: {
        padding: Spacing.lg,
        borderRadius: Rounding.soft,
        borderWidth: 1,
    },
    chartTitle: {
        fontSize: 15,
        fontWeight: '800',
        marginBottom: Spacing.md,
    },
    catRow: {
        marginBottom: Spacing.md,
    },
    catLabelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    catName: {
        fontSize: 13,
        fontWeight: '700',
    },
    catCount: {
        fontSize: 12,
        fontWeight: '500',
    },
    progressBarBg: {
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    chartHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    chartSubtitle: {
        fontSize: 11,
        marginBottom: Spacing.md,
        fontWeight: '500',
    },
    infoBadge: {
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    infoBadgeText: {
        fontSize: 8,
        fontWeight: '900',
        color: '#D97706',
    },
    gapRow: {
        marginBottom: Spacing.md,
    },
    gapLabelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    gapCategory: {
        fontSize: 13,
        fontWeight: '700',
    },
    gapStatText: {
        fontSize: 11,
    },
    gapBarBg: {
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
    },
    gapBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(0,0,0,0.05)',
        marginVertical: Spacing.md,
    },
    distributionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: Spacing.sm,
    },
    distItem: {
        alignItems: 'center',
        flex: 1,
    },
    distCount: {
        fontSize: 18,
        fontWeight: '900',
    },
    distLabel: {
        fontSize: 9,
        fontWeight: '700',
        textTransform: 'uppercase',
        marginTop: 2,
    },
    superstarRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
        paddingBottom: Spacing.xs,
    },
    superstarInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    superstarRank: {
        fontSize: 14,
        fontWeight: '900',
        color: 'rgba(0,0,0,0.15)',
        width: 25,
    },
    superstarName: {
        fontSize: 14,
        fontWeight: '700',
    },
    superstarDetail: {
        fontSize: 11,
        fontWeight: '500',
    },
    superstarBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    superstarBadgeText: {
        fontSize: 8,
        fontWeight: '900',
        marginLeft: 4,
    }
});
