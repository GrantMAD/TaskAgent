import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, TouchableWithoutFeedback } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Spacing, Rounding } from '../utils/theme';
import { useTheme } from '../components/ThemeContext';

export const ApplicationModal = ({ visible, onClose, onSubmit, taskTitle }) => {
    const { theme, shadows } = useTheme();
    const [message, setMessage] = useState('');
    const styles = createStyles(theme, shadows);

    const handleSubmit = () => {
        onSubmit(message || 'I would like to apply for this task!');
        setMessage('');
    };

    return (
        <Modal
            transparent={true}
            visible={visible}
            animationType="slide"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.modalOverlay}>
                    <TouchableWithoutFeedback>
                        <KeyboardAvoidingView 
                            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                            style={styles.modalContent}
                        >
                            <View style={styles.header}>
                                <Text style={styles.title}>Apply for Task</Text>
                                <TouchableOpacity onPress={onClose}>
                                    <FontAwesome name="times" size={20} color={theme.textMuted} />
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.subtitle}>
                                Task: <Text style={{ color: theme.primary, fontWeight: '700' }}>{taskTitle}</Text>
                            </Text>

                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>SEND A MESSAGE TO THE NEIGHBOUR</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Explain why you're a good fit or ask a question..."
                                    placeholderTextColor={theme.textMuted}
                                    multiline
                                    numberOfLines={4}
                                    value={message}
                                    onChangeText={setMessage}
                                    maxLength={500}
                                />
                                <Text style={styles.charCount}>{message.length}/500</Text>
                            </View>

                            <TouchableOpacity 
                                style={styles.applyButton} 
                                onPress={handleSubmit}
                            >
                                <Text style={styles.applyButtonText}>Send Application</Text>
                            </TouchableOpacity>
                        </KeyboardAvoidingView>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

const createStyles = (theme, shadows) => StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: Spacing.lg,
    },
    modalContent: {
        backgroundColor: theme.surface,
        borderRadius: Rounding.soft,
        padding: Spacing.lg,
        ...shadows.medium,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
        color: theme.primary,
    },
    subtitle: {
        fontSize: 14,
        color: theme.textMuted,
        marginBottom: Spacing.lg,
    },
    inputContainer: {
        marginBottom: Spacing.xl,
    },
    label: {
        fontSize: 10,
        fontWeight: '800',
        color: theme.textMuted,
        marginBottom: 8,
        letterSpacing: 0.5,
    },
    input: {
        backgroundColor: theme.isDarkMode ? 'rgba(255,255,255,0.05)' : '#F8F9FA',
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: Rounding.standard,
        padding: Spacing.md,
        color: theme.text,
        fontSize: 16,
        textAlignVertical: 'top',
        minHeight: 120,
    },
    charCount: {
        fontSize: 10,
        color: theme.textMuted,
        textAlign: 'right',
        marginTop: 4,
        marginRight: 4,
        fontWeight: '600',
    },
    applyButton: {
        backgroundColor: theme.accent,
        padding: Spacing.md,
        borderRadius: Rounding.pill,
        alignItems: 'center',
        ...shadows.accent,
    },
    applyButtonText: {
        color: theme.white,
        fontSize: 16,
        fontWeight: '800',
    },
});
