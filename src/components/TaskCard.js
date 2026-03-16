import React, { useMemo, memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Spacing, Rounding } from '../utils/theme';
import { FontAwesome } from '@expo/vector-icons';
import { useTheme } from '../components/ThemeContext';
import { useLocation } from './LocationContext';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { CURRENCY_SYMBOL } from '../utils/constants';

export const TaskCard = memo(({ task, onPress }) => {
    const { theme, shadows } = useTheme();
    const { userLocation, calculateDistance } = useLocation();
    const { savedTaskIds, toggleSavedTask } = useAuth();
    const { showToast } = useToast();
    const styles = useMemo(() => createStyles(theme, shadows), [theme, shadows]);

    const isSaved = useMemo(() => savedTaskIds.includes(task.id), [savedTaskIds, task.id]);

    const distance = useMemo(() => {
        if (userLocation && task.location_lat && task.location_lng) {
            return calculateDistance(
                userLocation.latitude,
                userLocation.longitude,
                task.location_lat,
                task.location_lng
            );
        }
        return null;
    }, [userLocation, task.location_lat, task.location_lng]);

    const handleToggleSave = async (e) => {
        e.stopPropagation();
        const wasSaved = isSaved;
        await toggleSavedTask(task.id);
        showToast(wasSaved ? 'Removed from saved tasks' : 'Task saved successfully!', 'success');
    };

    return (
        <TouchableOpacity style={styles.card} onPress={onPress}>
            <View style={styles.header}>
                <View style={styles.titleContainer}>
                    <Text style={styles.title} numberOfLines={1}>{task.title}</Text>
                    <Text style={styles.payment}>{CURRENCY_SYMBOL}{task.payment_amount}</Text>
                </View>
                <TouchableOpacity 
                    onPress={handleToggleSave}
                    style={styles.saveButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <FontAwesome 
                        name={isSaved ? "heart" : "heart-o"} 
                        size={18} 
                        color={isSaved ? theme.error : theme.textMuted} 
                    />
                </TouchableOpacity>
            </View>
            
            <View style={styles.locationRow}>
                <FontAwesome name="map-marker" size={14} color={theme.accent} />
                <Text style={styles.locationText} numberOfLines={1}>
                    {distance ? `${distance.toFixed(1)} km away` : 'Location shared when hired'}
                </Text>
            </View>

            <View style={styles.details}>
                <View style={styles.badgeRow}>
                    <View style={styles.categoryBadge}>
                        <Text style={styles.category}>{task.category}</Text>
                    </View>
                    {task.parent_template_id && (
                        <View style={styles.recurringBadge}>
                            <FontAwesome name="refresh" size={10} color={theme.accent} style={{ marginRight: 4 }} />
                            <Text style={styles.recurringText}>RECURRING</Text>
                        </View>
                    )}
                </View>
                <View style={styles.statusBadge}>
                    <Text style={styles.status}>{task.status.replace('_', ' ')}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
});

const createStyles = (theme, shadows) => StyleSheet.create({
    card: {
        backgroundColor: theme.surface,
        padding: Spacing.md,
        marginVertical: Spacing.sm,
        marginHorizontal: Spacing.md,
        borderRadius: Rounding.soft,
        ...shadows.subtle,
        borderWidth: 1,
        borderColor: theme.border,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 4,
    },
    titleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        flex: 1,
        marginRight: Spacing.sm,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.primary,
        flex: 1,
        marginRight: Spacing.sm,
    },
    payment: {
        fontSize: 18,
        fontWeight: '800',
        color: theme.accent,
    },
    saveButton: {
        padding: 2,
        marginLeft: Spacing.xs,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    locationText: {
        fontSize: 12,
        color: theme.textMuted,
        marginLeft: 6,
        fontWeight: '500',
    },
    details: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
    },
    badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    categoryBadge: {
        backgroundColor: theme.isDarkMode ? 'rgba(44, 83, 117, 0.2)' : '#E8EFF4',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderRadius: Rounding.pill,
    },
    category: {
        color: theme.primary,
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    recurringBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.isDarkMode ? 'rgba(255, 171, 0, 0.1)' : '#FFF8E1',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderRadius: Rounding.pill,
        marginLeft: Spacing.xs,
        borderWidth: 1,
        borderColor: 'rgba(255, 171, 0, 0.2)',
    },
    recurringText: {
        color: theme.accent,
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    statusBadge: {
        paddingHorizontal: Spacing.sm,
    },
    status: {
        color: theme.textMuted,
        fontWeight: '600',
        fontSize: 11,
        textTransform: 'capitalize',
    }
});

