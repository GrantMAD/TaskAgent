import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const RatingStars = ({ rating }) => {
    const roundedRating = Math.round(rating);
    const stars = Array(5).fill(0).map((_, i) => i < roundedRating ? '★' : '☆');

    return (
        <View style={styles.container}>
            <Text style={styles.stars}>{stars.join('')}</Text>
            <Text style={styles.text}>{rating.toFixed(1)}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    stars: {
        color: '#FFD700',
        fontSize: 16,
        marginRight: 4,
    },
    text: {
        color: '#666',
        fontSize: 14,
    }
});
