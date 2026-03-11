import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Platform } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Colors, Shadow, Spacing, Rounding } from '../utils/theme';

const ToastContext = createContext();

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

export const ToastProvider = ({ children }) => {
    const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(-100)).current;
    const timerRef = useRef(null);

    const useNativeDriver = false; // Forced to false to resolve "native animated module is missing" warnings

    const showToast = useCallback((message, type = 'info') => {
        // Clear existing timer
        if (timerRef.current) clearTimeout(timerRef.current);

        setToast({ visible: true, message, type });

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
    }, [fadeAnim, translateY, useNativeDriver]);

    const hideToast = useCallback(() => {
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
            case 'success': return Colors.success;
            case 'error': return Colors.error;
            case 'warning': return Colors.accent;
            default: return Colors.primary;
        }
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {toast.visible && (
                <Animated.View 
                    style={[
                        styles.toastContainer, 
                        { 
                            backgroundColor: getBackgroundColor(),
                            opacity: fadeAnim,
                            transform: [{ translateY }]
                        }
                    ]}
                >
                    <View style={styles.content}>
                        <FontAwesome name={getIcon()} size={20} color={Colors.white} />
                        <Text style={styles.message}>{toast.message}</Text>
                        <TouchableOpacity onPress={hideToast} style={styles.closeButton}>
                            <FontAwesome name="times" size={16} color="rgba(255,255,255,0.7)" />
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            )}
        </ToastContext.Provider>
    );
};

const styles = StyleSheet.create({
    toastContainer: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 50 : 30,
        left: Spacing.md,
        right: Spacing.md,
        padding: Spacing.md,
        borderRadius: Rounding.standard,
        zIndex: 9999,
        ...Shadow.medium,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    message: {
        color: Colors.white,
        fontSize: 14,
        fontWeight: '700',
        marginLeft: Spacing.sm,
        flex: 1,
    },
    closeButton: {
        padding: 4,
    }
});
