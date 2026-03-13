import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Spacing, Rounding } from '../utils/theme';
import { FontAwesome } from '@expo/vector-icons';
import { useTheme } from '../components/ThemeContext';
import { useLocation } from './LocationContext';

export const TaskCard = ({ task, onPress }) => {
    const { theme, shadows } = useTheme();
    const { userLocation, calculateDistance } = useLocation();
    const styles = useMemo(() => createStyles(theme, shadows), [theme, shadows]);

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

    return (
        <TouchableOpacity style={styles.card} onPress={onPress}>
            <View style={styles.header}>
                <Text style={styles.title} numberOfLines={1}>{task.title}</Text>
                <Text style={styles.payment}>{task.payment_amount}</Text>
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
};

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
        marginBottom: 4,
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
