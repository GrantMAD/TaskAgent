import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Spacing, Rounding } from '../../utils/theme';

export const TaskMediaSection = ({ task, theme, shadows }) => {
    if (!task.image_url && !task.completion_image_url) return null;

    return (
        <>
            {/* Original Task Photo */}
            {task.image_url && (
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.primary }]}>Task Photo</Text>
                    <View style={[styles.mediaContainer, { borderColor: theme.border }, shadows.subtle]}>
                        <Image source={{ uri: task.image_url }} style={styles.mediaImage} contentFit="cover" />
                    </View>
                </View>
            )}

            {/* Completion Photo */}
            {task.completion_image_url && (
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.primary }]}>Completion Proof</Text>
                    <View style={[styles.mediaContainer, { borderColor: theme.border }, shadows.subtle]}>
                        <Image source={{ uri: task.completion_image_url }} style={styles.mediaImage} contentFit="cover" />
                    </View>
                </View>
            )}
        </>
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
    mediaContainer: {
        width: '100%',
        height: 200,
        borderRadius: Rounding.soft,
        overflow: 'hidden',
        marginTop: Spacing.sm,
        borderWidth: 1,
    },
    mediaImage: {
        width: '100%',
        height: '100%',
    },
});
