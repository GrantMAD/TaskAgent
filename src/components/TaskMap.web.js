import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

const TaskMap = () => {
    return (
        <View style={styles.container}>
            <FontAwesome name="map-marker" size={24} color="#666" />
            <Text style={styles.text}>Map preview not available on web</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        height: '100%',
        backgroundColor: '#f5f5f5',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 12,
    },
    text: {
        marginTop: 8,
        fontSize: 12,
        color: '#666',
        fontWeight: '600',
    }
});

export default TaskMap;
