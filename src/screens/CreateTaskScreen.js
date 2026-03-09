import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ScrollView } from 'react-native';
import { taskService } from '../services/taskService';
import { supabase } from '../services/supabaseClient';

export const CreateTaskScreen = ({ navigation }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [paymentAmount, setPaymentAmount] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
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
            Alert.alert('Success', 'Task created!');
            navigation.navigate('TaskDetail', { taskId: newTask.id });
        } catch (error) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Create Task</Text>
            <TextInput
                style={styles.input}
                placeholder="Title"
                value={title}
                onChangeText={setTitle}
            />
            <TextInput
                style={[styles.input, { height: 100 }]}
                placeholder="Description"
                value={description}
                onChangeText={setDescription}
                multiline
            />
            <TextInput
                style={styles.input}
                placeholder="Category"
                value={category}
                onChangeText={setCategory}
            />
            <TextInput
                style={styles.input}
                placeholder="Payment Amount ($)"
                value={paymentAmount}
                onChangeText={setPaymentAmount}
                keyboardType="numeric"
            />
            <Button title={loading ? 'Creating...' : 'Post Task'} onPress={handleSubmit} disabled={loading} />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 24,
        flexGrow: 1,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 24,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 12,
        marginBottom: 16,
        borderRadius: 8,
    }
});
