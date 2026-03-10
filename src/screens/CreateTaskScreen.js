import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Modal, Image } from 'react-native';
import { taskService } from '../services/taskService';
import { supabase } from '../services/supabaseClient';
import { Spacing, Rounding } from '../utils/theme';
import { useTheme } from '../components/ThemeContext';
import { FontAwesome } from '@expo/vector-icons';
import { useToast } from '../components/ToastContext';

export const CreateTaskScreen = ({ navigation }) => {
    const { theme, shadows } = useTheme();
    // Form State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [paymentAmount, setPaymentAmount] = useState('');
    const [address, setAddress] = useState('');
    const [loading, setLoading] = useState(false);
    
    // Modal State
    const [isModalVisible, setIsModalVisible] = useState(false);
    
    const { showToast } = useToast();

    const styles = useMemo(() => createStyles(theme, shadows), [theme, shadows]);

    const handleSubmit = async () => {
        if (!title || !description || !category || !paymentAmount || !address) {
            showToast('Please fill out all fields.', 'warning');
            return;
        }

        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not logged in');

            const taskData = {
                title,
                description,
                category,
                payment_amount: parseFloat(paymentAmount),
                poster_id: session.user.id,
                address,
            };

            await taskService.createTask(taskData);
            showToast('Your task is live!', 'success');
            
            // Reset and close
            setTitle('');
            setDescription('');
            setCategory('');
            setPaymentAmount('');
            setAddress('');
            setIsModalVisible(false);

            // Redirect to Jobs screen
            navigation.navigate('TasksTab');
            
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* Landing Content */}
            <ScrollView contentContainerStyle={styles.landingContent} showsVerticalScrollIndicator={false}>
                <View style={styles.heroSection}>
                    <View style={styles.iconCircle}>
                        <FontAwesome name="rocket" size={50} color={theme.white} />
                    </View>
                    <Text style={styles.landingTitle}>Post a New Job</Text>
                    <Text style={styles.landingDescription}>
                        Need a hand with something? Whether it's moving furniture, cleaning, or a quick tech fix, 
                        your neighbors are ready to help. Post a task and get it done today!
                    </Text>
                </View>

                <View style={styles.benefitList}>
                    <View style={styles.benefitItem}>
                        <FontAwesome name="check-circle" size={20} color={theme.accent} />
                        <Text style={styles.benefitText}>Set your own fair price</Text>
                    </View>
                    <View style={styles.benefitItem}>
                        <FontAwesome name="check-circle" size={20} color={theme.accent} />
                        <Text style={styles.benefitText}>Choose from trusted neighbors</Text>
                    </View>
                    <View style={styles.benefitItem}>
                        <FontAwesome name="check-circle" size={20} color={theme.accent} />
                        <Text style={styles.benefitText}>Secure and easy communication</Text>
                    </View>
                </View>

                <TouchableOpacity 
                    style={styles.openModalButton}
                    onPress={() => setIsModalVisible(true)}
                >
                    <Text style={styles.openModalButtonText}>CREATE TASK</Text>
                    <FontAwesome name="arrow-right" size={18} color={theme.white} style={{ marginLeft: 10 }} />
                </TouchableOpacity>
            </ScrollView>

            {/* Form Modal */}
            <Modal
                visible={isModalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setIsModalVisible(false)}
            >
                <KeyboardAvoidingView 
                    style={styles.modalContainer} 
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setIsModalVisible(false)} style={styles.closeButton}>
                            <FontAwesome name="times" size={24} color={theme.primary} />
                        </TouchableOpacity>
                        <Text style={styles.modalHeaderTitle}>Task Details</Text>
                        <View style={{ width: 40 }} />
                    </View>

                    <ScrollView contentContainerStyle={styles.formScroll} showsVerticalScrollIndicator={false}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>WHAT DO YOU NEED HELP WITH?</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Help moving furniture"
                                placeholderTextColor={theme.textMuted}
                                value={title}
                                onChangeText={setTitle}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>CATEGORY</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Delivery, Cleaning, Tech"
                                placeholderTextColor={theme.textMuted}
                                value={category}
                                onChangeText={setCategory}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>BUDGET</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. 50"
                                placeholderTextColor={theme.textMuted}
                                value={paymentAmount}
                                onChangeText={setPaymentAmount}
                                keyboardType="numeric"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>LOCATION / ADDRESS</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. 123 Neighborhood St"
                                placeholderTextColor={theme.textMuted}
                                value={address}
                                onChangeText={setAddress}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>DESCRIPTION</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Provide some details about the task..."
                                placeholderTextColor={theme.textMuted}
                                value={description}
                                onChangeText={setDescription}
                                multiline
                                numberOfLines={4}
                                textAlignVertical="top"
                            />
                        </View>

                        <TouchableOpacity 
                            style={[styles.submitButton, loading && styles.buttonDisabled]} 
                            onPress={handleSubmit} 
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color={theme.white} />
                            ) : (
                                <>
                                    <FontAwesome name="paper-plane" size={18} color={theme.white} style={styles.buttonIcon} />
                                    <Text style={styles.submitButtonText}>PUBLISH TASK</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </ScrollView>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
};

const createStyles = (theme, shadows) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.background,
    },
    landingContent: {
        padding: Spacing.xl,
        paddingBottom: 150,
        alignItems: 'center',
    },
    heroSection: {
        alignItems: 'center',
        marginTop: Spacing.xl,
        marginBottom: Spacing.xl,
    },
    iconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: theme.primary,
        justifyContent: 'center',
        alignItems: 'center',
        ...shadows.medium,
        marginBottom: Spacing.lg,
    },
    landingTitle: {
        fontSize: 32,
        fontWeight: '800',
        color: theme.primary,
        textAlign: 'center',
        marginBottom: Spacing.md,
    },
    landingDescription: {
        fontSize: 16,
        color: theme.textMuted,
        textAlign: 'center',
        lineHeight: 24,
        paddingHorizontal: Spacing.md,
    },
    benefitList: {
        width: '100%',
        backgroundColor: theme.card,
        padding: Spacing.lg,
        borderRadius: Rounding.soft,
        ...shadows.subtle,
        marginBottom: Spacing.xl,
        borderWidth: 1,
        borderColor: theme.border,
    },
    benefitItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    benefitText: {
        fontSize: 15,
        color: theme.text,
        fontWeight: '600',
        marginLeft: Spacing.md,
    },
    openModalButton: {
        backgroundColor: theme.accent,
        flexDirection: 'row',
        width: '100%',
        padding: Spacing.lg,
        borderRadius: Rounding.pill,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.accent,
    },
    openModalButtonText: {
        color: theme.white,
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: 1,
    },
    // Modal Styles
    modalContainer: {
        flex: 1,
        backgroundColor: theme.background,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: Spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
        backgroundColor: theme.surface,
    },
    closeButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
    },
    modalHeaderTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: theme.primary,
    },
    formScroll: {
        padding: Spacing.lg,
        paddingBottom: 50,
    },
    inputGroup: {
        marginBottom: Spacing.md,
    },
    label: {
        fontSize: 11,
        fontWeight: '800',
        color: theme.primary,
        marginBottom: Spacing.xs,
        marginLeft: 4,
        letterSpacing: 0.5,
    },
    input: {
        borderWidth: 1.5,
        borderColor: theme.border,
        padding: Spacing.md,
        borderRadius: Rounding.standard,
        fontSize: 16,
        color: theme.text,
        backgroundColor: theme.input,
    },
    textArea: {
        minHeight: 120,
    },
    submitButton: {
        backgroundColor: theme.accent,
        flexDirection: 'row',
        padding: Spacing.md,
        borderRadius: Rounding.pill,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: Spacing.lg,
        ...shadows.accent,
    },
    submitButtonText: {
        color: theme.white,
        fontSize: 18,
        fontWeight: '800',
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonIcon: {
        marginRight: 10,
    }
});
