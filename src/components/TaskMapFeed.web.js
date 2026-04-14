import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

const TaskMapFeed = ({ theme }) => {
    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.content}>
                <FontAwesome name="map-o" size={48} color={theme.textMuted} />
                <Text style={[styles.text, { color: theme.text }]}>Map View is not available in the mobile-web preview.</Text>
                <Text style={[styles.subtext, { color: theme.textMuted }]}>Please use a mobile emulator or the dedicated web application.</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    content: {
        alignItems: 'center',
        maxWidth: 300,
    },
    text: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        marginTop: 20,
    },
    subtext: {
        fontSize: 14,
        textAlign: 'center',
        marginTop: 10,
    }
});

export default TaskMapFeed;
