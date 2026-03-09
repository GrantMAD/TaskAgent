import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Button, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { taskService } from '../services/taskService';
import { messageService } from '../services/messageService';
import { supabase } from '../services/supabaseClient';

export const TaskDetailScreen = ({ route, navigation }) => {
    const { taskId } = route.params;
    const [task, setTask] = useState(null);
    const [loading, setLoading] = useState(true);
    const [session, setSession] = useState(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });
        fetchTaskDetails();
    }, [taskId]);

    const fetchTaskDetails = async () => {
        try {
            const data = await taskService.getTaskDetails(taskId);
            setTask(data);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Could not load task details');
        } finally {
            setLoading(false);
        }
    };

    const handleApply = async () => {
        try {
            if (!session) return;
            await taskService.applyForTask(taskId, session.user.id, "I would like to apply for this task!");
            Alert.alert('Success', 'Applied successfully');
        } catch (error) {
            Alert.alert('Error', error.message);
        }
    };

    const handleMessagePoster = async () => {
        try {
            const conv = await messageService.createConversation(taskId);
            navigation.navigate('Chat', { conversationId: conv.id });
        } catch (error) {
            Alert.alert('Error', error.message);
        }
    };

    if (loading) return <ActivityIndicator style={{ flex: 1 }} />;
    if (!task) return <Text style={{ flex: 1, textAlign: 'center' }}>Task not found</Text>;

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>{task.title}</Text>
            <Text style={styles.payment}>${task.payment_amount}</Text>
            <Text style={styles.category}>{task.category}</Text>
            <Text style={styles.status}>{task.status}</Text>

            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{task.description}</Text>

            <Text style={styles.sectionTitle}>Posted By</Text>
            {task.poster && (
                <Text style={styles.posterName}>{task.poster.name} (Rating: {task.poster.rating})</Text>
            )}

            {session && session.user.id !== task.poster_id && task.status === 'OPEN' && (
                <View style={styles.actions}>
                    <Button title="Apply for Task" onPress={handleApply} />
                    <View style={{ height: 16 }} />
                    <Button title="Message Poster" onPress={handleMessagePoster} color="#4CD964" />
                </View>
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    payment: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'green',
        marginVertical: 8,
    },
    category: {
        fontSize: 16,
        color: '#666',
    },
    status: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 16,
        marginBottom: 8,
    },
    description: {
        fontSize: 16,
        lineHeight: 24,
    },
    posterName: {
        fontSize: 16,
    },
    actions: {
        marginTop: 32,
        marginBottom: 64,
    }
});
