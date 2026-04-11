import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Spacing, Rounding } from '../../utils/theme';
import TaskMap from '../TaskMap';

export const TaskLocationSection = ({ task, theme, shadows, isPoster, isWorker, distance }) => {
    return (
        <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.primary }]}>Location</Text>
            <View style={[styles.posterCard, { backgroundColor: theme.card, borderColor: theme.border }, shadows.subtle]}>
                <FontAwesome name="map-marker" size={24} color={theme.accent} style={{ marginRight: 15 }} />
                <Text style={[styles.addressText, { color: theme.text }]}>
                    {isPoster || isWorker 
                        ? (task.address || 'Address not set') 
                        : (distance ? `${distance.toFixed(1)} km away` : 'Location shared when hired')
                    }
                </Text>
            </View>

            {/* Map - Only show if coordinates are available AND (isPoster OR isWorker) */}
            {(isPoster || isWorker) && task.location_lat && task.location_lng && (
                <View style={[styles.mapContainer, { borderColor: theme.border }, shadows.subtle]}>
                    <TaskMap 
                        latitude={task.location_lat}
                        longitude={task.location_lng}
                        title={task.title}
                        Rounding={Rounding.soft}
                    />
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    section: {
        paddingHorizontal: Spacing.lg,
        marginTop: Spacing.md,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: Spacing.sm,
        marginLeft: 4,
    },
    posterCard: {
        flexDirection: 'row',
        padding: Spacing.md,
        borderRadius: Rounding.soft,
        alignItems: 'center',
        borderWidth: 1,
    },
    addressText: {
        fontSize: 16,
        fontWeight: '600',
        flex: 1,
    },
    mapContainer: {
        height: 200,
        marginTop: Spacing.md,
        borderRadius: Rounding.soft,
        overflow: 'hidden',
        borderWidth: 1,
    },
});
