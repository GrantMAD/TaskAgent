import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Spacing, Rounding } from '../utils/theme';
import { useTheme } from './ThemeContext';

const { width } = Dimensions.get('window');

export const AdminAnalyticsSection = ({ analytics, categories }) => {
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
                    value={`R${analytics.avgBudget}`} 
                    icon="money" 
                    color="#F59E0B" 
                />
                <MetricPill 
                    label="Total Jobs" 
                    value={analytics.totalTasks} 
                    icon="briefcase" 
                    color="#8B5CF6" 
                />
            </View>

            <View style={[styles.chartCard, { backgroundColor: theme.card, borderColor: theme.border }, shadows.medium]}>
                <Text style={[styles.chartTitle, { color: theme.text }]}>Popular Categories</Text>
                {categories.slice(0, 5).map((cat, index) => {
                    const percentage = (cat.count / analytics.totalTasks) * 100;
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
    }
});
