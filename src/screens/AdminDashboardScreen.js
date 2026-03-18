import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../components/ThemeContext';
import { Spacing, Rounding } from '../utils/theme';
import { adminService } from '../services/adminService';
import { notificationService } from '../services/notificationService';
import { AdminStatCard } from '../components/AdminStatCard';
import { useToast } from '../components/ToastContext';
import { AdminDataModal } from '../components/AdminDataModal';
import { AdminAnalyticsSection } from '../components/AdminAnalyticsSection';

export const AdminDashboardScreen = ({ navigation }) => {
    const { theme, shadows } = useTheme();
    const { showToast } = useToast();
    const [stats, setStats] = useState(null);
    const [analytics, setAnalytics] = useState(null);
    const [categoryStats, setCategoryStats] = useState([]);
    const [marketInsights, setMarketInsights] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [modalType, setModalType] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [statsData, analyticsData, catData, marketData] = await Promise.all([
                adminService.getDashboardStats(),
                adminService.getDetailedAnalytics(),
                adminService.getCategoryStats(),
                adminService.getMarketInsights()
            ]);
            setStats(statsData);
            setAnalytics(analyticsData);
            setCategoryStats(catData);
            setMarketInsights(marketData);
        } catch (error) {
            console.error('Admin Dashboard Error:', error);
            showToast('Could not load admin data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    };

    const openDetails = (type) => {
        setModalType(type);
        setModalVisible(true);
    };

    const handleAdminAction = async (id, action, payload) => {
        try {
            if (action === 'resolve') {
                const result = await adminService.updateReportStatus(id, 'REVIEWED', payload);
                
                if (result && result.reporter_id) {
                    await notificationService.createNotification(
                        result.reporter_id,
                        'Report Resolved',
                        `Admin Resolution: ${payload || 'Your report has been reviewed and resolved.'}`,
                        'report_resolved',
                        id
                    );
                }

                showToast('Report resolved & user notified', 'success');
                setStats(prev => ({ ...prev, pendingReports: prev.pendingReports - 1 }));
                return true;
            }

            if (action === 'suspend' || action === 'reactivate') {
                const isSuspended = action === 'suspend';
                await adminService.updateUserSuspension(id, isSuspended, payload);
                
                showToast(
                    isSuspended ? 'User suspended' : 'User reactivated', 
                    isSuspended ? 'error' : 'success'
                );
                return true;
            }

            return false;
        } catch (error) {
            console.error(`Admin Action Error (${action}):`, error);
            showToast(`Failed to perform ${action}`, 'error');
            return false;
        }
    };

    if (loading && !refreshing) {
        return (
            <View style={[styles.container, { backgroundColor: theme.background }]}>
                <LinearGradient
                    colors={[theme.primary, theme.secondary || '#1E40AF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.header}
                >
                    <Text style={styles.headerTitle}>Admin Panel</Text>
                    <Text style={styles.headerSubtitle}>System-wide overview & control</Text>
                </LinearGradient>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.accent} />
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <LinearGradient
                colors={[theme.primary, theme.secondary || '#1E40AF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <Text style={styles.headerTitle}>Admin Panel</Text>
                <Text style={styles.headerSubtitle}>System-wide overview & control</Text>
            </LinearGradient>
            <ScrollView 
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} />
                }
            >
                {/* Stats Row */}
                <View style={styles.statsSection}>
                    <Text style={[styles.sectionTitle, { color: theme.primary }]}>Platform Overview</Text>
                    <Text style={[styles.sectionDesc, { color: theme.textMuted }]}>
                        Monitor neighborhood activity at a glance. Tap any card below to see detailed records and manage users, tasks, or flags.
                    </Text>

                    <AdminStatCard 
                        title="Users" 
                        value={stats?.totalUsers || 0} 
                        icon="users" 
                        color={theme.primary} 
                        onPress={() => openDetails('users')}
                    />
                    <View style={{ marginTop: Spacing.md }}>
                        <AdminStatCard 
                            title="Active Jobs" 
                            value={stats?.activeTasks || 0} 
                            icon="tasks" 
                            color={theme.accent} 
                            onPress={() => openDetails('tasks')}
                        />
                    </View>
                    <View style={{ marginTop: Spacing.md }}>
                        <AdminStatCard 
                            title="Reports" 
                            value={stats?.pendingReports || 0} 
                            icon="flag" 
                            color={theme.error} 
                            onPress={() => openDetails('reports')}
                        />
                    </View>
                </View>

                {/* Analytics Section */}
                <AdminAnalyticsSection 
                    analytics={analytics} 
                    categories={categoryStats} 
                    marketInsights={marketInsights}
                />
            </ScrollView>

            <AdminDataModal 
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                type={modalType}
                onAction={handleAdminAction}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingTop: 50,
        paddingBottom: Spacing.xl,
        paddingHorizontal: Spacing.lg,
        borderBottomLeftRadius: Rounding.soft,
        borderBottomRightRadius: Rounding.soft,
        zIndex: 10,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    headerSubtitle: {
        fontSize: 15,
        color: 'rgba(255, 255, 255, 0.8)',
        marginTop: 4,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        padding: Spacing.lg,
        paddingBottom: 40,
    },
    statsSection: {
        marginBottom: Spacing.xl,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    sectionDesc: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: Spacing.xl,
        fontWeight: '500',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    }
});
