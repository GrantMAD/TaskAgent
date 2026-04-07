import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import { Platform } from 'react-native';
import { userService } from '../services/userService';
import { useAuth } from './AuthContext';

const LocationContext = createContext();

export const LocationProvider = ({ children }) => {
    const [userLocation, setUserLocation] = useState(null);
    const [errorMsg, setErrorMsg] = useState(null);
    const [searchRadius, setSearchRadius] = useState(10); // Default 10km
    const { session } = useAuth();

    const loadSettings = useCallback(async () => {
        try {
            if (session) {
                const profile = await userService.getUserProfile(session.user.id);
                if (profile && profile.search_radius) {
                    setSearchRadius(profile.search_radius);
                }
            }
        } catch (e) {
            console.error('Error loading searchRadius:', e);
        }
    }, [session]);

    const updateSearchRadius = async (newRadius) => {
        try {
            setSearchRadius(newRadius);
            if (session) {
                await userService.updateSearchRadius(session.user.id, newRadius);
            }
        } catch (e) {
            console.error('Error saving searchRadius:', e);
        }
    };

    useEffect(() => {
        loadSettings();
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setErrorMsg('Permission to access location was denied');
                return;
            }

            // Get initial location
            try {
                let location;
                if (Platform.OS === 'web') {
                    // Browser native fallback for reliability
                    const pos = await new Promise((resolve, reject) => {
                        window.navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
                    });
                    location = {
                        coords: {
                            latitude: pos.coords.latitude,
                            longitude: pos.coords.longitude,
                        }
                    };
                } else {
                    location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                }
                setUserLocation(location.coords);
            } catch (e) {
                console.error("LocationProvider initial fetch error:", e);
            }

            // Subscribe to location updates
            const subscription = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.Balanced,
                    distanceInterval: 100, // Update every 100 meters
                },
                (location) => {
                    setUserLocation(location.coords);
                }
            );

            return () => subscription.remove();
        })();
    }, [loadSettings]);

    // Haversine formula to calculate distance in km
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        if (!lat1 || !lon1 || !lat2 || !lon2) return null;
        
        const R = 6371; // Radius of the earth in km
        const dLat = deg2rad(lat2 - lat1);
        const dLon = deg2rad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c; // Distance in km
        return d;
    };

    const deg2rad = (deg) => {
        return deg * (Math.PI / 180);
    };

    return (
        <LocationContext.Provider value={{ userLocation, calculateDistance, searchRadius, updateSearchRadius, errorMsg }}>
            {children}
        </LocationContext.Provider>
    );
};

export const useLocation = () => {
    const context = useContext(LocationContext);
    if (!context) {
        throw new Error('useLocation must be used within a LocationProvider');
    }
    return context;
};
