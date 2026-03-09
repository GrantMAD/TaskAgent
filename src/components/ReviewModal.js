import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { Colors, Spacing, Rounding, Shadow } from '../utils/theme';
import { FontAwesome } from '@expo/vector-icons';

export const ReviewModal = ({ 
    visible, 
    userName, 
    onSubmit, 
    onCancel,
    loading = false
}) => {
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');

    const handleRating = (value) => {
        setRating(value);
    };

    return (
        <Modal
            transparent={true}
            visible={visible}
            animationType="slide"
            onRequestClose={onCancel}
        >
            <View style={styles.overlay}>
                <View style={[styles.modalCard, Shadow.medium]}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Rate Your Neighbor</Text>
                        <TouchableOpacity onPress={onCancel} style={styles.closeIcon}>
                            <FontAwesome name="times" size={20} color={Colors.textMuted} />
                        </TouchableOpacity>
                    </View>
                    
                    <Text style={styles.subtitle}>How was your experience with {userName}?</Text>
                    
                    <View style={styles.starsContainer}>
                        {[1, 2, 3, 4, 5].map((star) => (
                            <TouchableOpacity 
                                key={star} 
                                onPress={() => handleRating(star)}
                                style={styles.starTouch}
                            >
                                <FontAwesome 
                                    name={star <= rating ? "star" : "star-o"} 
                                    size={40} 
                                    color={star <= rating ? Colors.accent : Colors.border} 
                                />
                            </TouchableOpacity>
                        ))}
                    </View>

                    <TextInput
                        style={styles.input}
                        placeholder="Leave a friendly comment about their work..."
                        placeholderTextColor={Colors.textMuted}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                        value={comment}
                        onChangeText={setComment}
                    />
                    
                    <View style={styles.footer}>
                        <TouchableOpacity 
                            style={[styles.submitButton, loading && styles.disabledButton]} 
                            onPress={() => onSubmit(rating, comment)}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color={Colors.white} />
                            ) : (
                                <Text style={styles.submitButtonText}>Submit Review</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'flex-end',
    },
    modalCard: {
        backgroundColor: Colors.white,
        borderTopLeftRadius: Rounding.soft,
        borderTopRightRadius: Rounding.soft,
        padding: Spacing.lg,
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        color: Colors.primary,
    },
    subtitle: {
        fontSize: 16,
        color: Colors.textMuted,
        marginBottom: Spacing.lg,
    },
    starsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: Spacing.xl,
        gap: 10,
    },
    starTouch: {
        padding: 5,
    },
    input: {
        backgroundColor: '#FAFBFA',
        borderWidth: 1.5,
        borderColor: Colors.border,
        borderRadius: Rounding.standard,
        padding: Spacing.md,
        fontSize: 16,
        color: Colors.text,
        minHeight: 100,
        marginBottom: Spacing.xl,
    },
    submitButton: {
        backgroundColor: Colors.accent,
        paddingVertical: 16,
        borderRadius: Rounding.pill,
        alignItems: 'center',
        ...Shadow.accent,
    },
    disabledButton: {
        opacity: 0.6,
    },
    submitButtonText: {
        color: Colors.white,
        fontWeight: '800',
        fontSize: 18,
    },
});
