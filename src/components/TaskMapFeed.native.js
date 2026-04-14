import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import { FontAwesome } from '@expo/vector-icons';
import { Spacing, Rounding } from '../utils/theme';
import { CURRENCY_SYMBOL } from '../utils/constants';
import { Image } from 'expo-image';

const { width } = Dimensions.get('window');

const TaskMapFeed = ({ tasks, userLocation, searchRadius, navigation, theme, shadows }) => {
    const [selectedTask, setSelectedTask] = useState(null);
    const mapRef = useRef(null);

    // Update map region when userLocation changes
    useEffect(() => {
        if (userLocation && mapRef.current) {
            mapRef.current.animateToRegion({
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
                latitudeDelta: searchRadius * 0.02, // Dynamic zoom based on radius
                longitudeDelta: searchRadius * 0.02,
            }, 1000);
        }
    }, [userLocation, searchRadius]);

    const handleMarkerPress = (task) => {
        setSelectedTask(task);
    };

    const handleMapPress = () => {
        setSelectedTask(null);
    };

    return (
        <View style={styles.container}>
            <MapView
                ref={mapRef}
                style={styles.map}
                provider={PROVIDER_GOOGLE}
                initialRegion={{
                    latitude: userLocation?.latitude || 0,
                    longitude: userLocation?.longitude || 0,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                }}
                onPress={handleMapPress}
                showsUserLocation={true}
                showsMyLocationButton={true}
            >
                {/* Search Radius Circle */}
                {userLocation && (
                    <Circle
                        center={{
                            latitude: userLocation.latitude,
                            longitude: userLocation.longitude,
                        }}
                        radius={searchRadius * 1000} // radius is in meters
                        fillColor="rgba(59, 130, 246, 0.1)"
                        strokeColor="rgba(59, 130, 246, 0.3)"
                        strokeWidth={1}
                    />
                )}

                {/* Task Markers */}
                {tasks.map((task) => (
                    <Marker
                        key={task.id}
                        coordinate={{
                            latitude: task.location_lat,
                            longitude: task.location_lng,
                        }}
                        onPress={() => handleMarkerPress(task)}
                        tracksViewChanges={false} // Optimization
                    >
                        <View style={[
                            styles.markerContainer, 
                            { backgroundColor: theme.primary },
                            selectedTask?.id === task.id && { backgroundColor: theme.accent, transform: [{ scale: 1.2 }] }
                        ]}>
                            <FontAwesome 
                                name={getCategoryIcon(task.category)} 
                                size={14} 
                                color={theme.white} 
                            />
                        </View>
                    </Marker>
                ))}
            </MapView>

            {/* Task Preview Card */}
            {selectedTask && (
                <View style={[styles.previewCardContainer, shadows.medium]}>
                    <TouchableOpacity 
                        style={[styles.previewCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                        onPress={() => navigation.navigate('TaskDetail', { taskId: selectedTask.id })}
                        activeOpacity={0.9}
                    >
                        <Image 
                            source={{ uri: selectedTask.image_url || 'https://via.placeholder.com/150' }} 
                            style={styles.previewImage}
                            contentFit="cover"
                        />
                        <View style={styles.previewInfo}>
                            <Text style={[styles.previewTitle, { color: theme.text }]} numberOfLines={1}>
                                {selectedTask.title}
                            </Text>
                            <View style={styles.previewDetailRow}>
                                <Text style={[styles.previewCategory, { color: theme.accent }]}>
                                    {selectedTask.category}
                                </Text>
                                <Text style={[styles.previewPrice, { color: theme.primary }]}>
                                    {CURRENCY_SYMBOL}{selectedTask.payment_amount}
                                </Text>
                            </View>
                        </View>
                        <View style={[styles.viewButton, { backgroundColor: theme.accent }]}>
                            <FontAwesome name="chevron-right" size={14} color={theme.white} />
                        </View>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

const getCategoryIcon = (category) => {
    switch (category) {
        case 'Cleaning': return 'tint';
        case 'Delivery': return 'truck';
        case 'Moving': return 'cube';
        case 'Gardening': return 'leaf';
        case 'Handyman': return 'wrench';
        case 'Tech': return 'laptop';
        case 'Pets': return 'paw';
        default: return 'briefcase';
    }
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    markerContainer: {
        padding: 8,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: '#FFF',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
    },
    previewCardContainer: {
        position: 'absolute',
        bottom: Spacing.xl,
        left: Spacing.lg,
        right: Spacing.lg,
    },
    previewCard: {
        flexDirection: 'row',
        borderRadius: Rounding.soft,
        overflow: 'hidden',
        height: 100,
        borderWidth: 1,
        alignItems: 'center',
    },
    previewImage: {
        width: 100,
        height: 100,
    },
    previewInfo: {
        flex: 1,
        padding: Spacing.md,
    },
    previewTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
    },
    previewDetailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
    },
    previewCategory: {
        fontSize: 12,
        fontWeight: '600',
    },
    previewPrice: {
        fontSize: 18,
        fontWeight: '800',
    },
    viewButton: {
        width: 40,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    }
});

export default TaskMapFeed;
