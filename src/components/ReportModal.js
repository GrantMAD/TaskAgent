import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useTheme } from './ThemeContext';
import { Spacing, Rounding } from '../utils/theme';
import { reportService } from '../services/reportService';
import { useToast } from './ToastContext';
import { useAuth } from './AuthContext';

const REASONS = [
    'Scam or Fraud',
    'Inappropriate Content',
    'Offensive Behavior',
    'Misleading Information',
    'Spam',
    'Other'
];

export const ReportModal = ({ 
    visible, 
    onClose, 
    reportedUserId, 
    reportedTaskId, 
    type = 'task' // 'task' or 'user'
}) => {
    const { theme } = useTheme();
    const { session } = useAuth();
    const { showToast } = useToast();
    const [selectedReason, setSelectedReason] = useState('');
    const [details, setDetails] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!selectedReason) {
            showToast('Please select a reason', 'warning');
            return;
        }

        if (!session) {
            showToast('You must be logged in to report', 'error');
            return;
        }

        setLoading(true);
        try {
            await reportService.submitReport({
                reporter_id: session.user.id,
                reported_user_id: reportedUserId || null,
                reported_task_id: reportedTaskId || null,
                reason: selectedReason,
                details: details.trim(),
            });

            showToast('Report submitted correctly. Thank you for keeping our community safe!', 'success');
            onClose();
            // Reset state
            setSelectedReason('');
            setDetails('');
        } catch (error) {
            console.error('Report Error:', error);
            showToast('Failed to submit report. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.modalContainer}
            >
                <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: theme.primary }]}>
                            Report {type === 'task' ? 'Task' : 'Neighbor'}
                        </Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <FontAwesome name="times" size={20} color={theme.textMuted} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        <Text style={[styles.label, { color: theme.text }]}>Why are you reporting this?</Text>
                        <View style={styles.reasonsContainer}>
                            {REASONS.map((reason) => (
                                <TouchableOpacity 
                                    key={reason}
                                    style={[
                                        styles.reasonItem, 
                                        { 
                                            borderColor: theme.border,
                                            backgroundColor: selectedReason === reason ? theme.primary : 'transparent'
                                        }
                                    ]}
                                    onPress={() => setSelectedReason(reason)}
                                >
                                    <Text style={[
                                        styles.reasonText, 
                                        { color: selectedReason === reason ? theme.white : theme.text }
                                    ]}>
                                        {reason}
                                    </Text>
                                    {selectedReason === reason && (
                                        <FontAwesome name="check-circle" size={16} color={theme.white} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={[styles.label, { color: theme.text, marginTop: Spacing.lg }]}>Details (Optional)</Text>
                        <TextInput
                            style={[
                                styles.input, 
                                { 
                                    backgroundColor: theme.background, 
                                    color: theme.text,
                                    borderColor: theme.border,
                                }
                            ]}
                            placeholder="Provide more information..."
                            placeholderTextColor={theme.textMuted}
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                            value={details}
                            onChangeText={setDetails}
                            maxLength={500}
                        />
                        <Text style={[styles.charCount, { color: theme.textMuted }]}>{details.length}/500</Text>

                        <View style={styles.footer}>
                            <TouchableOpacity 
                                style={[styles.submitButton, { backgroundColor: theme.error }]} 
                                onPress={handleSubmit}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <>
                                        <FontAwesome name="flag" size={16} color="#fff" style={{ marginRight: 8 }} />
                                        <Text style={styles.submitButtonText}>Submit Report</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                                <Text style={[styles.cancelButtonText, { color: theme.textMuted }]}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        borderTopLeftRadius: Rounding.soft,
        borderTopRightRadius: Rounding.soft,
        padding: Spacing.lg,
        maxHeight: '85%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
    },
    closeButton: {
        padding: 5,
    },
    label: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: Spacing.md,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    reasonsContainer: {
        marginBottom: Spacing.md,
    },
    reasonItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.md,
        borderWidth: 1.5,
        borderRadius: Rounding.standard,
        marginBottom: Spacing.sm,
    },
    reasonText: {
        fontSize: 15,
        fontWeight: '600',
    },
    input: {
        borderWidth: 1.5,
        borderRadius: Rounding.standard,
        padding: Spacing.md,
        fontSize: 16,
        minHeight: 100,
    },
    charCount: {
        fontSize: 10,
        textAlign: 'right',
        marginTop: 4,
        fontWeight: '600',
    },
    footer: {
        marginTop: Spacing.xl,
        marginBottom: Spacing.xl,
    },
    submitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing.md,
        borderRadius: Rounding.pill,
        marginBottom: Spacing.md,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '800',
    },
    cancelButton: {
        alignItems: 'center',
        padding: Spacing.sm,
    },
    cancelButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
});
