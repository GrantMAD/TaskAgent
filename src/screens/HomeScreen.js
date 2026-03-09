import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { taskService } from '../services/taskService';
import { TaskCard } from '../components/TaskCard';

export const HomeScreen = ({ navigation }) => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        try {
            const data = await taskService.getNearbyTasks();
            // just take top 3 for home screen
            setTasks(data.slice(0, 3));
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Recently Posted Tasks</Text>
            <FlatList
                data={tasks}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <TaskCard
                        task={item}
                        onPress={() => navigation.navigate('TaskDetail', { taskId: item.id })}
                    />
                )}
            />
            <TouchableOpacity
                style={styles.button}
                onPress={() => navigation.navigate('TaskFeed')}
            >
                <Text style={styles.buttonText}>View All Tasks</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        margin: 16,
    },
    button: {
        backgroundColor: '#007AFF',
        padding: 16,
        margin: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    }
});
