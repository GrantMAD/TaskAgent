import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { useTheme } from '../ThemeContext';

export const Skeleton = ({ width, height, borderRadius, style }) => {
    const { theme } = useTheme();
    const pulseAnim = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        const sharedAnimationConfig = {
            duration: 1000,
            useNativeDriver: false,
        };

        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    ...sharedAnimationConfig,
                    toValue: 0.7,
                }),
                Animated.timing(pulseAnim, {
                    ...sharedAnimationConfig,
                    toValue: 0.3,
                }),
            ])
        ).start();
    }, [pulseAnim]);

    const backgroundColor = theme.isDarkMode 
        ? 'rgba(255, 255, 255, 0.12)' 
        : 'rgba(0, 0, 0, 0.12)';

    return (
        <Animated.View
            style={[
                {
                    width,
                    height,
                    borderRadius: borderRadius || 4,
                    backgroundColor,
                    opacity: pulseAnim,
                },
                style,
            ]}
        />
    );
};
