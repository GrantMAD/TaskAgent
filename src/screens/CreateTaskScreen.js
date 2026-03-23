import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ActivityIndicator, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Modal, Alert, Image, Switch } from 'react-native';
import { taskService } from '../services/taskService';
import { supabase } from '../services/supabaseClient';
import { Spacing, Rounding } from '../utils/theme';
import { useTheme } from '../components/ThemeContext';
import { FontAwesome } from '@expo/vector-icons';
import { useToast } from '../components/ToastContext';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { TASK_CATEGORIES, CURRENCY_SYMBOL } from '../utils/constants';
import { validateEmail, validatePassword, validatePhone, getMissingFields } from '../utils/validation';
import { useAuth } from '../components/AuthContext';

export const CreateTaskScreen = ({ navigation }) => {
    const { theme, shadows } = useTheme();
    const { session } = useAuth();
    // Form State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [paymentAmount, setPaymentAmount] = useState('');
    const [address, setAddress] = useState('');
    const [locationLat, setLocationLat] = useState(null);
    const [locationLng, setLocationLng] = useState(null);
    const [image, setImage] = useState(null);
    const [loading, setLoading] = useState(false);

    // Recurring Task State
    const [isRecurring, setIsRecurring] = useState(false);
    const [frequency, setFrequency] = useState('weekly');

    // Fair-Price Estimator State
    const [fairPriceEstimate, setFairPriceEstimate] = useState(null);
    const [isEstimatingPrice, setIsEstimatingPrice] = useState(false);

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            showToast('Permission to access gallery is required', 'warning');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.7,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
        }
    };
    
    // Suggestion State
    const [suggestions, setSuggestions] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isLocating, setIsLocating] = useState(false);

    // Modal State
    const [isModalVisible, setIsModalVisible] = useState(false);
    
    const { showToast } = useToast();

    const styles = useMemo(() => createStyles(theme, shadows), [theme, shadows]);

    useEffect(() => {
        // Toggle the Drawer (parent) header
        const parent = navigation.getParent();
        if (parent) {
            parent.setOptions({
                headerShown: !isModalVisible
            });
        }
        
        // Sync the form state with navigation params so the TabBar knows when to hide
        navigation.setParams({ isFormOpen: isModalVisible });

        return () => {
            if (parent) {
                parent.setOptions({ headerShown: true });
            }
        };
    }, [isModalVisible, navigation]);

    useEffect(() => {
        const fetchEstimate = async () => {
            if (!category) {
                setFairPriceEstimate(null);
                return;
            }
            setIsEstimatingPrice(true);
            const estimate = await taskService.getFairPriceEstimate(category);
            setFairPriceEstimate(estimate);
            setIsEstimatingPrice(false);
        };
        fetchEstimate();
    }, [category]);

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
        let addr = '';
        try {
            if (Platform.OS === 'web') {
                const revResponse = await fetch(`https://photon.komoot.io/reverse?lon=${longitude}&lat=${latitude}`);
                const revData = await revResponse.json();
                if (revData.features && revData.features.length > 0) {
                    const f = revData.features[0].properties;
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
        
        // WEB-SPECIFIC DIRECT APPROACH
        if (Platform.OS === 'web') {
            
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
        const missing = getMissingFields({ 
            Title: title, 
            Description: description, 
            Category: category, 
            Budget: paymentAmount, 
            Location: address 
        });

        if (missing) {
            showToast(`${missing} is required`, 'warning');
            return;
        }

        const budgetNum = parseFloat(paymentAmount);
        if (isNaN(budgetNum) || budgetNum <= 0) {
            showToast('Please enter a valid budget amount', 'warning');
            return;
        }

        setLoading(true);
        try {
            if (!session) throw new Error('Not logged in');

            let imageUrl = null;
            if (image) {
                imageUrl = await taskService.uploadTaskImage(image, session.user.id);
            }

            const taskData = {
                title,
                description,
                category,
                payment_amount: parseFloat(paymentAmount),
                poster_id: session.user.id,
                address,
                location_lat: locationLat,
                location_lng: locationLng,
                image_url: imageUrl
            };

            if (isRecurring) {
                const templateData = {
                    ...taskData,
                    frequency,
                    is_active: true,
                    next_occurrence_at: null
                };
                await taskService.createTaskTemplate(templateData);
                // Trigger generation of the first instance
                await taskService.processRecurringTasks(session.user.id);
                showToast('Recurring task series created!', 'success');
            } else {
                await taskService.createTask(taskData);
                showToast('Your task is live!', 'success');
            }
            
            // Reset and close
            setTitle('');
            setDescription('');
            setCategory('');
            setPaymentAmount('');
            setAddress('');
            setLocationLat(null);
            setLocationLng(null);
            setImage(null);
            setIsRecurring(false);
            setFrequency('weekly');
            setIsModalVisible(false);

            // Redirect to Jobs screen
            navigation.navigate('TasksTab');
            
        } catch (error) {
            if (error.code === 'TASK_LIMIT_EXCEEDED') {
                showToast('You have reached the limit of 5 active tasks.', 'warning');
            } else {
                showToast(error.message, 'error');
            }
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
                    <View style={styles.landingHeaderRow}>
                        <FontAwesome name="pencil-square-o" size={32} color={theme.primary} style={styles.landingHeaderIcon} />
                        <View>
                            <Text style={styles.landingTitle}>Post a New Job</Text>
                            <Text style={styles.landingSubtitle}>Get help from your neighborhood</Text>
                        </View>
                    </View>
                    <Text style={styles.landingDescription}>
                        Whether it's moving furniture, cleaning, or a quick tech fix, 
                        find trusted local help for any task.
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

            {/* Form Modal (Refactored to View for layered UI compatibility) */}
            {isModalVisible && (
                <View style={StyleSheet.absoluteFill}>
                    <View style={styles.backdrop} />
                    <KeyboardAvoidingView 
                        style={styles.modalContainer} 
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    >
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={() => setIsModalVisible(false)} style={styles.closeButton}>
                                <FontAwesome name="times" size={24} color={theme.primary} />
                            </TouchableOpacity>
                            <View style={styles.modalHeaderInfo}>
                                <Text style={styles.modalHeaderTitle}>Task Details</Text>
                                <Text style={styles.modalHeaderSubtitle}>Provide info to attract help</Text>
                            </View>
                            <View style={{ width: 40 }} />
                        </View>

                        <ScrollView contentContainerStyle={styles.formScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>WHAT DO YOU NEED HELP WITH? <Text style={styles.required}>*</Text></Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. Help moving furniture"
                                    placeholderTextColor={theme.textMuted}
                                    value={title}
                                    onChangeText={setTitle}
                                    maxLength={50}
                                />
                                <Text style={styles.charCount}>{title.length}/50</Text>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>CATEGORY <Text style={styles.required}>*</Text></Text>
                                <View style={styles.categoryGrid}>
                                    {TASK_CATEGORIES.map((cat) => (
                                        <TouchableOpacity
                                            key={cat.value}
                                            style={[
                                                styles.catChip,
                                                category === cat.value && { backgroundColor: theme.primary, borderColor: theme.primary }
                                            ]}
                                            onPress={() => setCategory(cat.value)}
                                        >
                                            <FontAwesome 
                                                name={cat.icon} 
                                                size={12} 
                                                color={category === cat.value ? theme.white : theme.primary} 
                                            />
                                            <Text style={[
                                                styles.catChipText,
                                                category === cat.value && { color: theme.white }
                                            ]}>
                                                {cat.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>BUDGET ({CURRENCY_SYMBOL}) <Text style={styles.required}>*</Text></Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder={`e.g. 50`}
                                    placeholderTextColor={theme.textMuted}
                                    value={paymentAmount}
                                    onChangeText={setPaymentAmount}
                                    keyboardType="numeric"
                                />
                                {isEstimatingPrice ? (
                                    <View style={styles.estimateContainer}>
                                        <ActivityIndicator size="small" color={theme.textMuted} />
                                        <Text style={styles.estimateText}>Calculating fair price...</Text>
                                    </View>
                                ) : fairPriceEstimate ? (
                                    <View style={styles.estimateContainer}>
                                        <Text style={styles.estimateText}>💡 Similar tasks average <Text style={styles.estimateHighlight}>{CURRENCY_SYMBOL}{fairPriceEstimate}</Text></Text>
                                    </View>
                                ) : null}
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>PHOTOS (OPTIONAL)</Text>
                                {image ? (
                                    <View style={styles.imagePreviewContainer}>
                                        <Image source={{ uri: image }} style={styles.imagePreview} />
                                        <TouchableOpacity style={styles.removeImageButton} onPress={() => setImage(null)}>
                                            <FontAwesome name="times-circle" size={24} color={theme.error} />
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <TouchableOpacity style={styles.addPhotoButton} onPress={pickImage}>
                                        <FontAwesome name="camera" size={20} color={theme.primary} />
                                        <Text style={styles.addPhotoText}>ADD PHOTO</Text>
                                    </TouchableOpacity>
                                )}
                            </View>

                            <View style={styles.inputGroup}>
                                <View style={styles.labelRow}>
                                    <Text style={styles.label}>LOCATION / ADDRESS <Text style={styles.required}>*</Text></Text>
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
                                <View style={styles.rowBetween}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.label}>MAKE THIS A RECURRING TASK?</Text>
                                        <Text style={styles.subLabel}>Automatically repost this task periodically</Text>
                                    </View>
                                    <Switch
                                        value={isRecurring}
                                        onValueChange={setIsRecurring}
                                        trackColor={{ false: theme.border, true: theme.accent }}
                                        thumbColor={theme.white}
                                    />
                                </View>
                            </View>

                            {isRecurring && (
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>FREQUENCY</Text>
                                    <View style={styles.categoryGrid}>
                                        {['daily', 'weekly', 'bi-weekly', 'monthly'].map((freq) => (
                                            <TouchableOpacity
                                                key={freq}
                                                style={[
                                                    styles.catChip,
                                                    frequency === freq && { backgroundColor: theme.accent, borderColor: theme.accent }
                                                ]}
                                                onPress={() => setFrequency(freq)}
                                            >
                                                <Text style={[
                                                    styles.catChipText,
                                                    frequency === freq && { color: theme.white }
                                                ]}>
                                                    {freq.charAt(0).toUpperCase() + freq.slice(1)}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            )}

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>DESCRIPTION <Text style={styles.required}>*</Text></Text>
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    placeholder="Provide some details about the task..."
                                    placeholderTextColor={theme.textMuted}
                                    value={description}
                                    onChangeText={setDescription}
                                    multiline
                                    numberOfLines={4}
                                    textAlignVertical="top"
                                    maxLength={1000}
                                />
                                <Text style={styles.charCount}>{description.length}/1000</Text>
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
                </View>
            )}
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
    landingHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    landingHeaderIcon: {
        marginRight: 15,
    },
    landingTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: theme.primary,
    },
    landingSubtitle: {
        fontSize: 14,
        color: theme.accent,
        fontWeight: '700',
        marginTop: 2,
    },
    landingDescription: {
        fontSize: 15,
        color: theme.textMuted,
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: Spacing.md,
        marginTop: Spacing.sm,
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
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: theme.background,
        paddingTop: Platform.OS === 'ios' ? 50 : 10,
        zIndex: 1000,
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
    modalHeaderInfo: {
        alignItems: 'center',
    },
    modalHeaderTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: theme.primary,
    },
    modalHeaderSubtitle: {
        fontSize: 11,
        color: theme.textMuted,
        fontWeight: '600',
    },
    formScroll: {
        padding: Spacing.lg,
        paddingBottom: 50,
    },
    inputGroup: {
        marginBottom: Spacing.md,
    },
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
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
    subLabel: {
        fontSize: 10,
        color: theme.textMuted,
        marginLeft: 4,
        marginTop: 2,
    },
    required: {
        color: theme.error,
        marginLeft: 2,
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
    charCount: {
        fontSize: 10,
        color: theme.textMuted,
        textAlign: 'right',
        marginTop: 4,
        marginRight: 4,
        fontWeight: '600',
    },
    inputLoader: {
        position: 'absolute',
        right: 15,
        top: 15,
    },
    estimateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: Spacing.sm,
        paddingHorizontal: 4,
    },
    estimateText: {
        fontSize: 12,
        color: theme.textMuted,
        marginLeft: 4,
        fontWeight: '500',
    },
    estimateHighlight: {
        color: theme.primary,
        fontWeight: '700',
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
    addPhotoButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.isDarkMode ? 'rgba(255,255,255,0.05)' : '#F0F4F8',
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: theme.border,
        borderRadius: Rounding.standard,
        padding: Spacing.lg,
    },
    addPhotoText: {
        marginLeft: 10,
        fontSize: 14,
        fontWeight: '700',
        color: theme.primary,
    },
    imagePreviewContainer: {
        width: '100%',
        height: 200,
        borderRadius: Rounding.standard,
        overflow: 'hidden',
        position: 'relative',
    },
    imagePreview: {
        width: '100%',
        height: '100%',
    },
    removeImageButton: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: theme.white,
        borderRadius: 15,
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
    },
    categoryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -4,
        marginTop: 8,
    },
    catChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: Rounding.pill,
        borderWidth: 1.5,
        borderColor: theme.border,
        margin: 4,
        backgroundColor: theme.surface,
    },
    catChipText: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.primary,
        marginLeft: 6,
    }
});
