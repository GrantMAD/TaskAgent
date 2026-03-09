import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { taskService } from '../services/taskService';
import { supabase } from '../services/supabaseClient';
import { Colors, Spacing, Rounding, Shadow } from '../utils/theme';
import { FontAwesome } from '@expo/vector-icons';

export const CreateTaskScreen = ({ navigation }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [paymentAmount, setPaymentAmount] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!title || !description || !category || !paymentAmount) {
            Alert.alert('Missing Info', 'Please fill out all fields.');
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
            };

            const newTask = await taskService.createTask(taskData);
            Alert.alert('Success', 'Your task is live!', [
                { text: 'View Task', onPress: () => navigation.navigate('TaskDetail', { taskId: newTask.id }) }
            ]);
            
            // Clear form
            setTitle('');
            setDescription('');
            setCategory('');
            setPaymentAmount('');
            
        } catch (error) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView 
            style={styles.container} 
            behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}
            keyboardVerticalOffset={0}
        >
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Post a Gig</Text>
                <Text style={styles.headerSubtitle}>What do you need help with?</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.card}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>TASK TITLE</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Help moving furniture"
                            placeholderTextColor={Colors.textMuted}
                            value={title}
                            onChangeText={setTitle}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>CATEGORY</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Delivery, Cleaning, Tech"
                            placeholderTextColor={Colors.textMuted}
                            value={category}
                            onChangeText={setCategory}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>BUDGET ($)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Amount in dollars"
                            placeholderTextColor={Colors.textMuted}
                            value={paymentAmount}
                            onChangeText={setPaymentAmount}
                            keyboardType="numeric"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>DESCRIPTION</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Provide some details about the task..."
                            placeholderTextColor={Colors.textMuted}
                            value={description}
                            onChangeText={setDescription}
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                        />
                    </View>

                    <TouchableOpacity 
                        style={[styles.button, loading && styles.buttonDisabled]} 
                        onPress={handleSubmit} 
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={Colors.white} />
                        ) : (
                            <>
                                <FontAwesome name="paper-plane" size={18} color={Colors.white} style={styles.buttonIcon} />
                                <Text style={styles.buttonText}>PUBLISH TASK</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        backgroundColor: Colors.primary,
        paddingTop: 60,
        paddingBottom: Spacing.lg,
        paddingHorizontal: Spacing.lg,
        borderBottomLeftRadius: Rounding.soft,
        borderBottomRightRadius: Rounding.soft,
        ...Shadow.medium,
        zIndex: 10,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: Colors.white,
    },
    headerSubtitle: {
        fontSize: 15,
        color: 'rgba(255, 255, 255, 0.8)',
        marginTop: 4,
    },
    scrollContent: {
        padding: Spacing.lg,
        paddingBottom: 120, // Space for tab bar
    },
    card: {
        backgroundColor: Colors.white,
        padding: Spacing.xl,
        borderRadius: Rounding.soft,
        ...Shadow.medium,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    inputGroup: {
        marginBottom: Spacing.md,
    },
    label: {
        fontSize: 12,
        fontWeight: '800',
        color: Colors.primary,
        marginBottom: Spacing.xs,
        letterSpacing: 1,
    },
    input: {
        borderWidth: 1.5,
        borderColor: Colors.border,
        padding: Spacing.md,
        borderRadius: Rounding.standard,
        fontSize: 16,
        color: Colors.text,
        backgroundColor: '#FAFBFA',
    },
    textArea: {
        minHeight: 120,
    },
    button: {
        backgroundColor: Colors.accent,
        flexDirection: 'row',
        padding: Spacing.md,
        borderRadius: Rounding.pill,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: Spacing.lg,
        ...Shadow.accent,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: Colors.white,
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: 1,
    },
    buttonIcon: {
        marginRight: 10,
    }
});
