import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Skeleton } from './Skeleton';
import { Spacing, Rounding } from '../../utils/theme';
import { useTheme } from '../ThemeContext';

export const TaskCardSkeleton = () => {
    const { theme, shadows } = useTheme();
    return (
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, shadows.subtle]}>
            <View style={styles.header}>
                <Skeleton width="60%" height={24} />
                <Skeleton width="20%" height={24} />
            </View>
            <View style={styles.locationRow}>
                <Skeleton width={14} height={14} borderRadius={7} />
                <Skeleton width="40%" height={12} style={{ marginLeft: 6 }} />
            </View>
            <View style={styles.details}>
                <Skeleton width={80} height={20} borderRadius={Rounding.pill} />
                <Skeleton width={60} height={16} />
            </View>
        </View>
    );
};

export const NotificationSkeleton = () => {
    const { theme, shadows } = useTheme();
    return (
        <View style={[styles.notificationCard, { backgroundColor: theme.surface, borderColor: theme.border }, shadows.subtle]}>
            <Skeleton width={40} height={40} borderRadius={20} />
            <View style={styles.content}>
                <Skeleton width="50%" height={15} style={{ marginBottom: 6 }} />
                <Skeleton width="80%" height={13} style={{ marginBottom: 6 }} />
                <Skeleton width="30%" height={11} />
            </View>
            <Skeleton width={18} height={18} />
        </View>
    );
};

export const ConversationSkeleton = () => {
    const { theme } = useTheme();
    return (
        <View style={[styles.convoItem, { borderBottomColor: theme.border }]}>
            <Skeleton width={56} height={56} borderRadius={28} />
            <View style={styles.convoContent}>
                <View style={styles.convoHeader}>
                    <Skeleton width="40%" height={16} />
                    <Skeleton width="20%" height={12} />
                </View>
                <Skeleton width="70%" height={14} style={{ marginTop: 6 }} />
            </View>
        </View>
    );
};

export const ProfileSkeleton = () => {
    const { theme, shadows } = useTheme();
    return (
        <View style={styles.profileContainer}>
            <LinearGradient
                colors={[theme.primary, theme.secondary || '#1E40AF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.profileHeader, shadows.medium]}
            >
                <Skeleton width={100} height={100} borderRadius={50} style={{ alignSelf: 'center', marginBottom: Spacing.md, borderWidth: 3, borderColor: theme.white }} />
                <Skeleton width="50%" height={24} style={{ alignSelf: 'center', marginBottom: Spacing.sm }} />
                <Skeleton width="40%" height={16} style={{ alignSelf: 'center', marginBottom: Spacing.md }} />
                <View style={[styles.statsRow, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                    <Skeleton width="30%" height={30} />
                    <Skeleton width="30%" height={30} />
                    <Skeleton width="30%" height={30} />
                </View>
            </LinearGradient>
        </View>
    );
};

export const TaskDetailSkeleton = () => {
    const { theme } = useTheme();
    return (
        <View style={styles.detailContainer}>
            <LinearGradient
                colors={[theme.primary, theme.secondary || '#1E40AF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.detailHeader}
            >
                <Skeleton width="70%" height={32} style={{ marginBottom: Spacing.sm }} />
                <Skeleton width="40%" height={20} />
            </LinearGradient>
            <View style={styles.detailBody}>
                <View style={styles.detailRow}>
                    <Skeleton width="30%" height={20} />
                    <Skeleton width="30%" height={20} />
                </View>
                <Skeleton width="100%" height={120} style={{ marginVertical: Spacing.lg }} />
                <Skeleton width="60%" height={20} style={{ marginBottom: Spacing.sm }} />
                <Skeleton width="100%" height={15} style={{ marginBottom: 6 }} />
                <Skeleton width="100%" height={15} style={{ marginBottom: 6 }} />
                <Skeleton width="80%" height={15} />
            </View>
        </View>
    );
};

export const MessageSkeleton = () => {
    return (
        <View style={styles.chatPadding}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
                <View 
                    key={i} 
                    style={[
                        styles.msgSkeleton, 
                        { alignSelf: i % 2 === 0 ? 'flex-end' : 'flex-start' }
                    ]}
                >
                    <Skeleton 
                        width={i % 3 === 0 ? 200 : 150} 
                        height={40} 
                        borderRadius={Rounding.standard} 
                    />
                </View>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        padding: Spacing.md,
        marginVertical: Spacing.sm,
        marginHorizontal: Spacing.md,
        borderRadius: Rounding.soft,
        borderWidth: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    details: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
    },
    notificationCard: {
        flexDirection: 'row',
        padding: Spacing.md,
        borderRadius: Rounding.soft,
        marginBottom: Spacing.sm,
        alignItems: 'center',
        borderWidth: 1,
    },
    content: {
        flex: 1,
        marginLeft: Spacing.md,
    },
    convoItem: {
        flexDirection: 'row',
        padding: Spacing.md,
        alignItems: 'center',
        borderBottomWidth: 1,
    },
    convoContent: {
        flex: 1,
        marginLeft: Spacing.md,
    },
    convoHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    profileContainer: {
        flex: 1,
    },
    profileHeader: {
        padding: Spacing.xl,
        paddingBottom: Spacing.lg,
        borderBottomLeftRadius: Rounding.soft,
        borderBottomRightRadius: Rounding.soft,
    },
    statsRow: {
        flexDirection: 'row',
        marginTop: Spacing.lg,
        padding: Spacing.md,
        borderRadius: Rounding.standard,
        justifyContent: 'space-around',
    },
    detailContainer: {
        flex: 1,
    },
    detailHeader: {
        padding: Spacing.lg,
        paddingTop: 40,
        borderBottomLeftRadius: Rounding.soft,
        borderBottomRightRadius: Rounding.soft,
    },
    detailBody: {
        padding: Spacing.lg,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    chatPadding: {
        padding: Spacing.lg,
    },
    msgSkeleton: {
        marginBottom: Spacing.md,
    }
});
