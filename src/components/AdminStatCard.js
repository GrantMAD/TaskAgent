import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useTheme } from './ThemeContext';
import { Spacing, Rounding } from '../utils/theme';

export const AdminStatCard = ({ title, value, icon, color, onPress }) => {
    const { theme, shadows } = useTheme();

    return (
        <TouchableOpacity 
            style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }, shadows.subtle]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
                <FontAwesome name={icon} size={24} color={color} />
            </View>
            <View style={styles.content}>
                <Text style={[styles.value, { color: theme.text }]}>{value}</Text>
                <Text style={[styles.title, { color: theme.textMuted }]}>{title}</Text>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.md,
        borderRadius: Rounding.standard,
        borderWidth: 1,
    },
    iconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.md,
    },
    content: {
        flex: 1,
    },
    value: {
        fontSize: 20,
        fontWeight: '800',
    },
    title: {
        fontSize: 12,
        fontWeight: '600',
        marginTop: 2,
    }
});
