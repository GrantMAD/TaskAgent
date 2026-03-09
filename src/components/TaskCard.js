import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export const TaskCard = ({ task, onPress }) => {
    return (
        <TouchableOpacity style={styles.card} onPress={onPress}>
            <View style={styles.header}>
                <Text style={styles.title}>{task.title}</Text>
                <Text style={styles.payment}>${task.payment_amount}</Text>
            </View>
            <View style={styles.details}>
                <Text style={styles.category}>{task.category}</Text>
                <Text style={styles.status}>{task.status}</Text>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#fff',
        padding: 16,
        marginVertical: 8,
        marginHorizontal: 16,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    payment: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'green',
    },
    details: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    category: {
        color: '#666',
    },
    status: {
        color: '#333',
        fontWeight: '500',
    }
});
