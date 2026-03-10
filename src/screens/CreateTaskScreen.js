import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ActivityIndicator, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Modal, Alert } from 'react-native';
import { taskService } from '../services/taskService';
import { supabase } from '../services/supabaseClient';
import { Spacing, Rounding } from '../utils/theme';
import { useTheme } from '../components/ThemeContext';
import { FontAwesome } from '@expo/vector-icons';
import { useToast } from '../components/ToastContext';
import * as Location from 'expo-location';

export const CreateTaskScreen = ({ navigation }) => {
    const { theme, shadows } = useTheme();
    // Form State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [paymentAmount, setPaymentAmount] = useState('');
    const [address, setAddress] = useState('');
    const [locationLat, setLocationLat] = useState(null);
    const [locationLng, setLocationLng] = useState(null);
    const [loading, setLoading] = useState(false);
    
    // Suggestion State
    const [suggestions, setSuggestions] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isLocating, setIsLocating] = useState(false);

    // Modal State
    const [isModalVisible, setIsModalVisible] = useState(false);
    
    const { showToast } = useToast();

    const styles = useMemo(() => createStyles(theme, shadows), [theme, shadows]);

    const handleAddressChange = async (text) => {
        setAddress(text);
        if (text.length > 2) {
            setIsSearching(true);
            try {
                const response = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(text)}&limit=5`);
                const data = await response.json();
                const processed = data.features.map(f => ({
                    label: [f.properties.name, f.properties.street, f.properties.city, f.properties.country].filter(Boolean).join(', '),
                    lat: f.geometry.coordinates[1],
                    lng: f.geometry.coordinates[0]
                }));
                setSuggestions(processed);
                setShowSuggestions(true);
            } catch (error) {
                console.error('Photon fetch error:', error);
            } finally {
                setIsSearching(false);
            }
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
        }
    };

    const selectSuggestion = (item) => {
        setAddress(item.label);
        setLocationLat(item.lat);
        setLocationLng(item.lng);
        setShowSuggestions(false);
        setSuggestions([]);
    };

    const handleReverseGeocode = async (latitude, longitude) => {
        console.log('Step 4: Reverse geocoding...');
        let addr = '';
        try {
            if (Platform.OS === 'web') {
                const revResponse = await fetch(`https://photon.komoot.io/reverse?lon=${longitude}&lat=${latitude}`);
                const revData = await revResponse.json();
                if (revData.features && revData.features.length > 0) {
                    const f = revData.features[0].properties;
                    console.log('Photon properties:', f);
                    // Build a more detailed address
                    const parts = [
                        f.name !== f.street ? f.name : null,
                        f.housenumber,
                        f.street,
                        f.district,
                        f.city,
                        f.postcode,
                        f.state,
                        f.country
                    ].filter(Boolean);
                    
                    // Remove duplicates (sometimes name is same as street or city)
                    addr = [...new Set(parts)].join(', ');
                }
            } else {
                const [rg] = await Location.reverseGeocodeAsync({ latitude, longitude });
                if (rg) {
                    addr = [rg.name, rg.street, rg.city, rg.region, rg.country].filter(Boolean).join(', ');
                }
            }

            if (addr) {
                console.log('Final Address:', addr);
                setAddress(addr);
                showToast('Location updated!', 'success');
            } else {
                setAddress(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
                showToast('Coordinates found, but address lookup failed.', 'warning');
            }
        } catch (e) {
            console.error('Reverse Geocode Error:', e);
            setAddress(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        }
    };

    const getCurrentLocation = async () => {
        setIsLocating(true);
        console.log('--- Location Fetch Started ---');
        
        // WEB-SPECIFIC DIRECT APPROACH
        if (Platform.OS === 'web') {
            console.log('Web detected. Secure Context:', window.isSecureContext);
            
            if (!window.isSecureContext && window.location.hostname !== 'localhost') {
                showToast('Location requires HTTPS or localhost.', 'error');
                setIsLocating(false);
                return;
            }

            if (window.navigator.geolocation) {
                window.navigator.geolocation.getCurrentPosition(
                    async (pos) => {
                        const { latitude, longitude } = pos.coords;
                        setLocationLat(latitude);
                        setLocationLng(longitude);
                        await handleReverseGeocode(latitude, longitude);
                        setIsLocating(false);
                    },
                    (err) => {
                        console.error('Browser Geolocation Error:', err.code, err.message);
                        let msg = 'Location error.';
                        if (err.code === 1) {
                            msg = 'Permission denied. Click the LOCK ICON in your URL bar and set Location to ALLOW, then refresh.';
                            Alert.alert('Permission Needed', 'Your browser is blocking location. Please click the lock icon in the address bar, allow location, and refresh the page.');
                        } else if (err.code === 2) {
                            msg = 'Position unavailable.';
                        } else if (err.code === 3) {
                            msg = 'Request timed out.';
                        }
                        showToast(msg, 'error');
                        setIsLocating(false);
                    },
                    { timeout: 10000, enableHighAccuracy: false }
                );
                return;
            }
        }

        // NATIVE MOBILE APPROACH (iOS/Android App)
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                showToast('Location permission denied.', 'error');
                return;
            }

            const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            if (location) {
                setLocationLat(location.coords.latitude);
                setLocationLng(location.coords.longitude);
                await handleReverseGeocode(location.coords.latitude, location.coords.longitude);
            }
        } catch (error) {
            console.error('Native Location Error:', error);
            showToast('Error: ' + error.message, 'error');
        } finally {
            setIsLocating(false);
        }
    };

    const handleSubmit = async () => {
        if (!title || !description || !category || !paymentAmount || !address) {
            showToast('Please fill out all fields.', 'warning');
            return;
        }

        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not logged in');

            const taskData = {
                title,
                description,
                category,
                payment_amount: parseFloat(paymentAmount),
                poster_id: session.user.id,
                address,
                location_lat: locationLat,
                location_lng: locationLng,
            };

            await taskService.createTask(taskData);
            showToast('Your task is live!', 'success');
            
            // Reset and close
            setTitle('');
            setDescription('');
            setCategory('');
            setPaymentAmount('');
            setAddress('');
            setLocationLat(null);
            setLocationLng(null);
            setIsModalVisible(false);

            // Redirect to Jobs screen
            navigation.navigate('TasksTab');
            
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* Landing Content */}
            <ScrollView contentContainerStyle={styles.landingContent} showsVerticalScrollIndicator={false}>
                <View style={styles.heroSection}>
                    <View style={styles.iconCircle}>
                        <FontAwesome name="rocket" size={50} color={theme.white} />
                    </View>
                    <Text style={styles.landingTitle}>Post a New Job</Text>
                    <Text style={styles.landingDescription}>
                        Need a hand with something? Whether it's moving furniture, cleaning, or a quick tech fix, 
                        your neighbors are ready to help. Post a task and get it done today!
                    </Text>
                </View>

                <View style={styles.benefitList}>
                    <View style={styles.benefitItem}>
                        <FontAwesome name="check-circle" size={20} color={theme.accent} />
                        <Text style={styles.benefitText}>Set your own fair price</Text>
                    </View>
                    <View style={styles.benefitItem}>
                        <FontAwesome name="check-circle" size={20} color={theme.accent} />
                        <Text style={styles.benefitText}>Choose from trusted neighbors</Text>
                    </View>
                    <View style={styles.benefitItem}>
                        <FontAwesome name="check-circle" size={20} color={theme.accent} />
                        <Text style={styles.benefitText}>Secure and easy communication</Text>
                    </View>
                </View>

                <TouchableOpacity 
                    style={styles.openModalButton}
                    onPress={() => setIsModalVisible(true)}
                >
                    <Text style={styles.openModalButtonText}>CREATE TASK</Text>
                    <FontAwesome name="arrow-right" size={18} color={theme.white} style={{ marginLeft: 10 }} />
                </TouchableOpacity>
            </ScrollView>

            {/* Form Modal */}
            <Modal
                visible={isModalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setIsModalVisible(false)}
            >
                <KeyboardAvoidingView 
                    style={styles.modalContainer} 
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setIsModalVisible(false)} style={styles.closeButton}>
                            <FontAwesome name="times" size={24} color={theme.primary} />
                        </TouchableOpacity>
                        <Text style={styles.modalHeaderTitle}>Task Details</Text>
                        <View style={{ width: 40 }} />
                    </View>

                    <ScrollView contentContainerStyle={styles.formScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>WHAT DO YOU NEED HELP WITH?</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Help moving furniture"
                                placeholderTextColor={theme.textMuted}
                                value={title}
                                onChangeText={setTitle}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>CATEGORY</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Delivery, Cleaning, Tech"
                                placeholderTextColor={theme.textMuted}
                                value={category}
                                onChangeText={setCategory}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>BUDGET</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. 50"
                                placeholderTextColor={theme.textMuted}
                                value={paymentAmount}
                                onChangeText={setPaymentAmount}
                                keyboardType="numeric"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <View style={styles.labelRow}>
                                <Text style={styles.label}>LOCATION / ADDRESS</Text>
                                <TouchableOpacity onPress={getCurrentLocation} disabled={isLocating} style={styles.locateButton}>
                                    {isLocating ? <ActivityIndicator size="small" color={theme.accent} /> : <FontAwesome name="location-arrow" size={14} color={theme.accent} />}
                                    <Text style={styles.locateText}>Use Current</Text>
                                </TouchableOpacity>
                            </View>
                            <View>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. 123 Neighborhood St"
                                    placeholderTextColor={theme.textMuted}
                                    value={address}
                                    onChangeText={handleAddressChange}
                                />
                                {isSearching && <ActivityIndicator style={styles.inputLoader} color={theme.accent} />}
                            </View>

                            {showSuggestions && suggestions.length > 0 && (
                                <View style={styles.suggestionsContainer}>
                                    {suggestions.map((item, index) => (
                                        <TouchableOpacity 
                                            key={index} 
                                            style={[styles.suggestionItem, index === suggestions.length - 1 && { borderBottomWidth: 0 }]} 
                                            onPress={() => selectSuggestion(item)}
                                        >
                                            <FontAwesome name="map-marker" size={16} color={theme.textMuted} style={{ marginRight: 10 }} />
                                            <Text style={styles.suggestionText} numberOfLines={1}>{item.label}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>DESCRIPTION</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Provide some details about the task..."
                                placeholderTextColor={theme.textMuted}
                                value={description}
                                onChangeText={setDescription}
                                multiline
                                numberOfLines={4}
                                textAlignVertical="top"
                            />
                        </View>

                        <TouchableOpacity 
                            style={[styles.submitButton, loading && styles.buttonDisabled]} 
                            onPress={handleSubmit} 
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color={theme.white} />
                            ) : (
                                <>
                                    <FontAwesome name="paper-plane" size={18} color={theme.white} style={styles.buttonIcon} />
                                    <Text style={styles.submitButtonText}>PUBLISH TASK</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </ScrollView>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
};

const createStyles = (theme, shadows) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.background,
    },
    landingContent: {
        padding: Spacing.xl,
        paddingBottom: 150,
        alignItems: 'center',
    },
    heroSection: {
        alignItems: 'center',
        marginTop: Spacing.xl,
        marginBottom: Spacing.xl,
    },
    iconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: theme.primary,
        justifyContent: 'center',
        alignItems: 'center',
        ...shadows.medium,
        marginBottom: Spacing.lg,
    },
    landingTitle: {
        fontSize: 32,
        fontWeight: '800',
        color: theme.primary,
        textAlign: 'center',
        marginBottom: Spacing.md,
    },
    landingDescription: {
        fontSize: 16,
        color: theme.textMuted,
        textAlign: 'center',
        lineHeight: 24,
        paddingHorizontal: Spacing.md,
    },
    benefitList: {
        width: '100%',
        backgroundColor: theme.card,
        padding: Spacing.lg,
        borderRadius: Rounding.soft,
        ...shadows.subtle,
        marginBottom: Spacing.xl,
        borderWidth: 1,
        borderColor: theme.border,
    },
    benefitItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    benefitText: {
        fontSize: 15,
        color: theme.text,
        fontWeight: '600',
        marginLeft: Spacing.md,
    },
    openModalButton: {
        backgroundColor: theme.accent,
        flexDirection: 'row',
        width: '100%',
        padding: Spacing.lg,
        borderRadius: Rounding.pill,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.accent,
    },
    openModalButtonText: {
        color: theme.white,
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: 1,
    },
    // Modal Styles
    modalContainer: {
        flex: 1,
        backgroundColor: theme.background,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: Spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
        backgroundColor: theme.surface,
    },
    closeButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
    },
    modalHeaderTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: theme.primary,
    },
    formScroll: {
        padding: Spacing.lg,
        paddingBottom: 50,
    },
    inputGroup: {
        marginBottom: Spacing.md,
    },
    labelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.xs,
        paddingRight: 4,
    },
    label: {
        fontSize: 11,
        fontWeight: '800',
        color: theme.primary,
        marginLeft: 4,
        letterSpacing: 0.5,
    },
    locateButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    locateText: {
        fontSize: 11,
        fontWeight: '700',
        color: theme.accent,
        marginLeft: 4,
    },
    input: {
        borderWidth: 1.5,
        borderColor: theme.border,
        padding: Spacing.md,
        borderRadius: Rounding.standard,
        fontSize: 16,
        color: theme.text,
        backgroundColor: theme.input,
    },
    inputLoader: {
        position: 'absolute',
        right: 15,
        top: 15,
    },
    suggestionsContainer: {
        backgroundColor: theme.card,
        borderRadius: Rounding.standard,
        borderWidth: 1,
        borderColor: theme.border,
        marginTop: 5,
        ...shadows.subtle,
        overflow: 'hidden',
    },
    suggestionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
    },
    suggestionText: {
        fontSize: 14,
        color: theme.text,
        flex: 1,
    },
    textArea: {
        minHeight: 120,
    },
    submitButton: {
        backgroundColor: theme.accent,
        flexDirection: 'row',
        padding: Spacing.md,
        borderRadius: Rounding.pill,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: Spacing.lg,
        ...shadows.accent,
    },
    submitButtonText: {
        color: theme.white,
        fontSize: 18,
        fontWeight: '800',
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonIcon: {
        marginRight: 10,
    }
});
