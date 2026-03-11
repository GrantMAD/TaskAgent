import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Spacing, Rounding } from '../utils/theme';
import { useTheme } from './ThemeContext';
import { FontAwesome } from '@expo/vector-icons';

export const ConfirmationModal = ({ 
    visible, 
    title, 
    message, 
    confirmText = 'Confirm', 
    cancelText = 'Cancel', 
    onConfirm, 
    onCancel,
    type = 'primary', // 'primary', 'danger', 'success'
    children
}) => {
    const { theme, shadows } = useTheme();
    const styles = useMemo(() => createStyles(theme, shadows), [theme, shadows]);

    return (
        <Modal
            transparent={true}
            visible={visible}
            animationType="fade"
            onRequestClose={onCancel}
        >
            <View style={styles.overlay}>
                <View style={[styles.modalCard, shadows.medium]}>
                    <View style={styles.header}>
                        <Text style={styles.title}>{title}</Text>
                        <TouchableOpacity onPress={onCancel} style={styles.closeIcon}>
                            <FontAwesome name="times" size={20} color={theme.textMuted} />
                        </TouchableOpacity>
                    </View>
                    
                    <Text style={styles.message}>{message}</Text>

                    {children}
                    
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

const createStyles = (theme, shadows) => StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.lg,
    },
    modalCard: {
        backgroundColor: theme.surface,
        borderRadius: Rounding.soft,
        width: '100%',
        maxWidth: 400,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: theme.border,
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
    closeIcon: {
        padding: 4,
    },
    message: {
        fontSize: 16,
        color: theme.text,
        lineHeight: 24,
        marginBottom: Spacing.md,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: Spacing.xl,
    },
    cancelButton: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: Rounding.pill,
    },
    cancelButtonText: {
        color: theme.textMuted,
        fontWeight: '700',
        fontSize: 15,
    },
    confirmButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: Rounding.pill,
        marginLeft: Spacing.sm,
        ...shadows.subtle,
    },
    primaryButton: {
        backgroundColor: theme.primary,
    },
    dangerButton: {
        backgroundColor: theme.error,
    },
    successButton: {
        backgroundColor: theme.success,
    },
    confirmButtonText: {
        color: theme.white,
        fontWeight: '700',
        fontSize: 15,
    },
});
