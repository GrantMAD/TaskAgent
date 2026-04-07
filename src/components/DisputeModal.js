import React, { useState } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    Modal, 
    TouchableOpacity, 
    TextInput, 
    ScrollView, 
    KeyboardAvoidingView, 
    Platform,
    ActivityIndicator
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useTheme } from './ThemeContext';
import { Spacing } from '../utils/theme';
import { disputeService } from '../services/disputeService';
import { useToast } from './ToastContext';
import { useAuth } from './AuthContext';

export const DisputeModal = ({ visible, onClose, taskId, taskTitle, otherPartyId, onDisputeRaised }) => {
    const { theme, shadows } = useTheme();
    const { showToast } = useToast();
    const { session } = useAuth();
    const styles = createStyles(theme, shadows);

    const [reason, setReason] = useState('');
    const [details, setDetails] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const disputeReasons = [
        'Task not completed as described',
        'Worker was unprofessional',
        'Poster is refusing to pay/confirm',
        'Payment amount disagreement',
        'Other'
    ];

    const handleSubmit = async () => {
        if (!reason || isSubmitting) return;
        if (!session?.user) {
            showToast('Please login to raise a dispute', 'warning');
            return;
        }

        setIsSubmitting(true);
        try {
            await disputeService.raiseDispute({
                task_id: taskId,
                task_title: taskTitle,
                raised_by_id: session.user.id,
                reason,
                details,
                other_party_id: otherPartyId
            });

            showToast('Dispute raised successfully', 'success');
            onDisputeRaised?.();
            onClose();
        } catch (error) {
            console.error('Dispute Error:', error);
            showToast('Failed to raise dispute', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.modalOverlay}
            >
                <View style={styles.modalContainer}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerTitleContainer}>
                            <FontAwesome name="shield" size={20} color={theme.white} />
                            <Text style={styles.headerTitle}>Raise Dispute</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <FontAwesome name="times" size={20} color={theme.white} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
                        <View style={styles.alertBox}>
                            <FontAwesome name="info-circle" size={16} color="#B45309" />
                            <Text style={styles.alertText}>
                                Disputes halt the payment process. An admin will mediate and resolve the issue fairly.
                            </Text>
                        </View>

                        <Text style={styles.label}>PRIMARY REASON</Text>
                        <View style={styles.reasonsContainer}>
                            {disputeReasons.map((r) => (
                                <TouchableOpacity
                                    key={r}
                                    onPress={() => setReason(r)}
                                    style={[
                                        styles.reasonButton,
                                        reason === r && styles.reasonButtonActive
                                    ]}
                                >
                                    <Text style={[
                                        styles.reasonText,
                                        reason === r && styles.reasonTextActive
                                    ]}>
                                        {r}
                                    </Text>
                                    {reason === r && <FontAwesome name="check-circle" size={16} color={theme.accent} />}
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.label}>TELL US WHAT HAPPENED</Text>
                        <TextInput
                            style={styles.textArea}
                            multiline
                            numberOfLines={4}
                            value={details}
                            onChangeText={setDetails}
                            placeholder="Provide as much detail as possible..."
                            placeholderTextColor={theme.textMuted}
                        />

                        <TouchableOpacity
                            onPress={handleSubmit}
                            disabled={!reason || isSubmitting}
                            style={[
                                styles.submitButton,
                                (!reason || isSubmitting) && styles.submitButtonDisabled
                            ]}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator color={theme.white} />
                            ) : (
                                <>
                                    <FontAwesome name="warning" size={16} color={theme.white} style={{ marginRight: 8 }} />
                                    <Text style={styles.submitButtonText}>OPEN DISPUTE</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const createStyles = (theme, shadows) => StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: theme.surface,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        maxHeight: '90%',
    },
    header: {
        backgroundColor: theme.accent,
        padding: Spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
    },
    headerTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerTitle: {
        color: theme.white,
        fontSize: 18,
        fontWeight: '900',
        textTransform: 'uppercase',
        marginLeft: 12,
    },
    closeButton: {
        padding: 4,
    },
    content: {
        padding: Spacing.lg,
    },
    contentContainer: {
        paddingBottom: 40,
    },
    alertBox: {
        backgroundColor: '#FFFBEB',
        padding: Spacing.md,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'flex-start',
        borderWidth: 1,
        borderColor: '#FEF3C7',
        marginBottom: Spacing.lg,
    },
    alertText: {
        flex: 1,
        marginLeft: 10,
        fontSize: 12,
        fontWeight: '700',
        color: '#92400E',
        lineHeight: 18,
    },
    label: {
        fontSize: 10,
        fontWeight: '900',
        color: theme.textMuted,
        letterSpacing: 1.5,
        marginBottom: 12,
        marginLeft: 4,
    },
    reasonsContainer: {
        marginBottom: Spacing.lg,
    },
    reasonButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: Spacing.md,
        backgroundColor: theme.background,
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: theme.border,
    },
    reasonButtonActive: {
        borderColor: theme.accent,
        backgroundColor: theme.isDarkMode ? 'rgba(230, 138, 0, 0.1)' : '#FFFBF5',
    },
    reasonText: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.text,
    },
    reasonTextActive: {
        color: theme.accent,
    },
    textArea: {
        backgroundColor: theme.background,
        borderRadius: 16,
        padding: Spacing.md,
        height: 120,
        textAlignVertical: 'top',
        color: theme.text,
        fontSize: 14,
        fontWeight: '600',
        borderWidth: 1,
        borderColor: theme.border,
        marginBottom: Spacing.xl,
    },
    submitButton: {
        backgroundColor: theme.accent,
        padding: 18,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.accent,
    },
    submitButtonDisabled: {
        opacity: 0.5,
    },
    submitButtonText: {
        color: theme.white,
        fontSize: 16,
        fontWeight: '900',
    }
});
