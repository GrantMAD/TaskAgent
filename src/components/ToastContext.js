import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Platform, Modal } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Shadow, Spacing, Rounding } from '../utils/theme';
import { useTheme } from './ThemeContext';

const ToastContext = createContext();

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

export const ToastProvider = ({ children }) => {
    const { theme, shadows } = useTheme();
    const [toast, setToast] = useState({ visible: false, message: '', type: 'info', onPress: null });
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(-100)).current;
    const timerRef = useRef(null);

    const useNativeDriver = false; // Forced to false to resolve "native animated module is missing" warnings

    const hideToast = useCallback(() => {
        console.log('[Toast] Hiding');
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 250,
                useNativeDriver,
            }),
            Animated.timing(translateY, {
                toValue: -100,
                duration: 250,
                useNativeDriver,
            }),
        ]).start(() => {
            setToast(prev => ({ ...prev, visible: false }));
        });
    }, [fadeAnim, translateY, useNativeDriver]);

    const showToast = useCallback((message, type = 'info', onPress = null) => {
        console.log(`[Toast] Showing: ${message} (${type})`);
        // Clear existing timer
        if (timerRef.current) clearTimeout(timerRef.current);

        setToast({ visible: true, message, type, onPress });

        // Animate In
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver,
            }),
            Animated.spring(translateY, {
                toValue: 0,
                tension: 40,
                friction: 7,
                useNativeDriver,
            }),
        ]).start();

        // Auto Hide
        timerRef.current = setTimeout(hideToast, 3500);
    }, [fadeAnim, translateY, useNativeDriver, hideToast]);

    const getIcon = () => {
        switch (toast.type) {
            case 'success': return 'check-circle';
            case 'error': return 'times-circle';
            case 'warning': return 'exclamation-triangle';
            default: return 'info-circle';
        }
    };

    const getBackgroundColor = () => {
        switch (toast.type) {
            case 'success': return theme.success;
            case 'error': return theme.error;
            case 'warning': return theme.accent;
            default: return theme.primary;
        }
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <Modal
                visible={toast.visible}
                transparent={true}
                animationType="none"
                pointerEvents="box-none"
            >
                <View style={styles.modalOverlay} pointerEvents="box-none">
                    <Animated.View 
                        style={[
                            styles.toastContainer, 
                            { 
                                backgroundColor: getBackgroundColor(),
                                opacity: fadeAnim,
                                transform: [{ translateY }],
                                ...shadows.medium
                            }
                        ]}
                    >
                        <TouchableOpacity 
                            activeOpacity={0.9} 
                            onPress={() => {
                                if (toast.onPress) toast.onPress();
                                hideToast();
                            }}
                            disabled={!toast.onPress}
                            style={styles.content}
                        >
                            <FontAwesome name={getIcon()} size={20} color={theme.white} />
                            <Text style={styles.message}>{toast.message}</Text>
                            <TouchableOpacity onPress={hideToast} style={styles.closeButton}>
                                <FontAwesome name="times" size={16} color="rgba(255,255,100,0.7)" />
                            </TouchableOpacity>
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            </Modal>
        </ToastContext.Provider>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'transparent',
        zIndex: 999999,
        elevation: 100,
    },
    toastContainer: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 50 : 30,
        left: Spacing.md,
        right: Spacing.md,
        padding: Spacing.md,
        borderRadius: Rounding.standard,
        ...Shadow.medium,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    message: {
        color: 'white',
        fontSize: 14,
        fontWeight: '700',
        marginLeft: Spacing.sm,
        flex: 1,
    },
    closeButton: {
        padding: 4,
    }
});
