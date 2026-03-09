import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const MessageBubble = ({ message, isMine }) => {
    return (
        <View style={[styles.container, isMine ? styles.myContainer : styles.theirContainer]}>
            <View style={[styles.bubble, isMine ? styles.myBubble : styles.theirBubble]}>
                <Text style={[styles.text, isMine ? styles.myText : styles.theirText]}>
                    {message.message_text}
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginVertical: 4,
        paddingHorizontal: 16,
        flexDirection: 'row',
    },
    myContainer: {
        justifyContent: 'flex-end',
    },
    theirContainer: {
        justifyContent: 'flex-start',
    },
    bubble: {
        maxWidth: '80%',
        padding: 12,
        borderRadius: 16,
    },
    myBubble: {
        backgroundColor: '#007AFF',
        borderBottomRightRadius: 4,
    },
    theirBubble: {
        backgroundColor: '#E5E5EA',
        borderBottomLeftRadius: 4,
    },
    text: {
        fontSize: 16,
    },
    myText: {
        color: '#fff',
    },
    theirText: {
        color: '#000',
    }
});
