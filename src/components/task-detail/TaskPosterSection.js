import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Spacing, Rounding } from '../../utils/theme';
import { UserAvatar } from '../UserAvatar';
import { RatingStars } from '../RatingStars';

export const TaskPosterSection = ({ task, theme, shadows, navigation }) => {
    return (
        <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.primary }]}>Posted By</Text>
            {task.poster ? (
                <TouchableOpacity 
                    style={[styles.posterCard, { backgroundColor: theme.card, borderColor: theme.border }, shadows.subtle]}
                    onPress={() => navigation.navigate('PublicProfile', { userId: task.poster_id })}
                >
                    <UserAvatar user={task.poster} size={50} />
                    <View style={styles.posterInfo}>
                        <Text style={[styles.posterName, { color: theme.primary }]}>{task.poster.name}</Text>
                        <RatingStars rating={task.poster.rating || 5} />
                    </View>
                    <FontAwesome name="chevron-right" size={14} color={theme.border} />
                </TouchableOpacity>
            ) : (
                <View style={[styles.posterCard, { backgroundColor: theme.card, borderColor: theme.border }, shadows.subtle]}>
                    <UserAvatar user={{ name: 'Deleted User' }} size={50} />
                    <View style={styles.posterInfo}>
                        <Text style={[styles.posterName, { color: theme.primary }]}>Deleted User</Text>
                        <Text style={[styles.postedDate, { color: theme.textMuted }]}>Account no longer exists</Text>
                    </View>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    section: {
        paddingHorizontal: Spacing.lg,
        marginTop: Spacing.md,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: Spacing.sm,
        marginLeft: 4,
    },
    posterCard: {
        flexDirection: 'row',
        padding: Spacing.md,
        borderRadius: Rounding.soft,
        alignItems: 'center',
        borderWidth: 1,
    },
    posterInfo: {
        flex: 1,
        marginLeft: Spacing.md,
    },
    posterName: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 2,
    },
    postedDate: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 4,
    },
});
