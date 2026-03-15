import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { 
    useSharedValue, 
    useAnimatedStyle, 
    withRepeat, 
    withTiming, 
    withSequence,
    withDelay,
    Easing,
    FadeInUp
} from 'react-native-reanimated';
import { FontAwesome } from '@expo/vector-icons';
import { useTheme } from './ThemeContext';
import { Spacing, Rounding } from '../utils/theme';

/**
 * A reusable, animated empty state component to replace static placeholders.
 * Features:
 * - FadeInUp entry animation for the entire container.
 * - Floating/Bounce animation for the icon.
 * - Supports custom icons, titles, subtitles, and an action button.
 */
export const EmptyState = ({ 
    icon = "search", 
    title = "Nothing found", 
    subtitle, 
    buttonText, 
    onPress,
    containerStyle 
}) => {
    const { theme, shadows } = useTheme();
    const styles = useMemo(() => createStyles(theme, shadows), [theme, shadows]);

    // Icon floating animation
    const translateY = useSharedValue(0);

    useEffect(() => {
        translateY.value = withRepeat(
            withSequence(
                withTiming(-10, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
                withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
            ),
            -1) // Infinite repeat
        ;
    }, []);

    const animatedIconStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
    }));

    return (
        <Animated.View 
            entering={FadeInUp.duration(600).delay(200)}
            style={[styles.container, containerStyle]}
        >
            <Animated.View style={[styles.iconContainer, animatedIconStyle]}>
                <FontAwesome name={icon} size={60} color={theme.border} />
            </Animated.View>
            
            <Text style={styles.title}>{title}</Text>
            
            {subtitle && (
                <Text style={styles.subtitle}>{subtitle}</Text>
            )}

            {buttonText && onPress && (
                <TouchableOpacity 
                    style={styles.button} 
                    onPress={onPress}
                    activeOpacity={0.8}
                >
                    <Text style={styles.buttonText}>{buttonText}</Text>
                </TouchableOpacity>
            )}
        </Animated.View>
    );
};

const createStyles = (theme, shadows) => StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing.xl,
        marginTop: 40,
    },
    iconContainer: {
        marginBottom: Spacing.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: theme.primary,
        textAlign: 'center',
        marginBottom: Spacing.xs,
    },
    subtitle: {
        fontSize: 14,
        color: theme.textMuted,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: Spacing.xl,
        paddingHorizontal: Spacing.md,
    },
    button: {
        backgroundColor: theme.primary,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: Rounding.pill,
        ...shadows.subtle,
    },
    buttonText: {
        color: theme.white,
        fontWeight: '700',
        fontSize: 15,
    },
});
