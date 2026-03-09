import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated } from 'react-native';
import { Colors, Spacing, Rounding, Shadow } from '../utils/theme';
import { FontAwesome } from '@expo/vector-icons';

export const ConfirmationModal = ({ 
    visible, 
    title, 
    message, 
    confirmText = 'Confirm', 
    cancelText = 'Cancel', 
    onConfirm, 
    onCancel,
    type = 'primary' // 'primary', 'danger', 'success'
}) => {
    return (
        <Modal
            transparent={true}
            visible={visible}
            animationType="fade"
            onRequestClose={onCancel}
        >
            <View style={styles.overlay}>
                <View style={[styles.modalCard, Shadow.medium]}>
                    <View style={styles.header}>
                        <Text style={styles.title}>{title}</Text>
                        <TouchableOpacity onPress={onCancel} style={styles.closeIcon}>
                            <FontAwesome name="times" size={20} color={Colors.textMuted} />
                        </TouchableOpacity>
                    </View>
                    
                    <Text style={styles.message}>{message}</Text>
                    
                    <View style={styles.footer}>
                        <TouchableOpacity 
                            style={styles.cancelButton} 
                            onPress={onCancel}
                        >
                            <Text style={styles.cancelButtonText}>{cancelText}</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={[
                                styles.confirmButton, 
                                type === 'danger' ? styles.dangerButton : type === 'success' ? styles.successButton : styles.primaryButton
                            ]} 
                            onPress={onConfirm}
                        >
                            <Text style={styles.confirmButtonText}>{confirmText}</Text>
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
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.lg,
    },
    modalCard: {
        backgroundColor: Colors.white,
        borderRadius: Rounding.soft,
        width: '100%',
        maxWidth: 400,
        padding: Spacing.lg,
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
        color: Colors.primary,
    },
    closeIcon: {
        padding: 4,
    },
    message: {
        fontSize: 16,
        color: Colors.text,
        lineHeight: 24,
        marginBottom: Spacing.xl,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: Spacing.md,
    },
    cancelButton: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: Rounding.pill,
    },
    cancelButtonText: {
        color: Colors.textMuted,
        fontWeight: '700',
        fontSize: 15,
    },
    confirmButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: Rounding.pill,
        ...Shadow.subtle,
    },
    primaryButton: {
        backgroundColor: Colors.primary,
    },
    dangerButton: {
        backgroundColor: Colors.error,
    },
    successButton: {
        backgroundColor: Colors.success,
    },
    confirmButtonText: {
        color: Colors.white,
        fontWeight: '700',
        fontSize: 15,
    },
});
