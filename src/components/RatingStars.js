import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../utils/theme';

export const RatingStars = memo(({ rating }) => {
    const roundedRating = Math.round(rating);
    const stars = Array(5).fill(0).map((_, i) => i < roundedRating ? '★' : '☆');

    return (
        <View style={styles.container}>
            <Text style={styles.stars}>{stars.join('')}</Text>
            <Text style={styles.text}>{rating.toFixed(1)}</Text>
        </View>
    );
});

RatingStars.displayName = 'RatingStars';

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    stars: {
        color: Colors.accent,
        fontSize: 18,
        marginRight: 4,
    },
    text: {
        color: Colors.textMuted,
        fontSize: 14,
        fontWeight: '600',
    }
});
