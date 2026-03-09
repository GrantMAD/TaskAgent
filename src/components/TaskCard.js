import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Spacing, Rounding, Shadow } from '../utils/theme';

export const TaskCard = ({ task, onPress }) => {
    return (
        <TouchableOpacity style={styles.card} onPress={onPress}>
            <View style={styles.header}>
                <Text style={styles.title}>{task.title}</Text>
                <Text style={styles.payment}>${task.payment_amount}</Text>
            </View>
            <View style={styles.details}>
                <View style={styles.categoryBadge}>
                    <Text style={styles.category}>{task.category}</Text>
                </View>
                <View style={styles.statusBadge}>
                    <Text style={styles.status}>{task.status}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.surface,
        padding: Spacing.md,
        marginVertical: Spacing.sm,
        marginHorizontal: Spacing.md,
        borderRadius: Rounding.soft,
        ...Shadow.subtle,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: Spacing.sm,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.primary,
        flex: 1,
        marginRight: Spacing.sm,
    },
    payment: {
        fontSize: 18,
        fontWeight: '800',
        color: Colors.accent,
    },
    details: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    categoryBadge: {
        backgroundColor: '#E8EFF4', // Very light version of the logo blue
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderRadius: Rounding.pill,
    },
    category: {
        color: Colors.primary,
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    statusBadge: {
        paddingHorizontal: Spacing.sm,
    },
    status: {
        color: Colors.textMuted,
        fontWeight: '600',
        fontSize: 12,
    }
});
