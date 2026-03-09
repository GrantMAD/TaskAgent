import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Rounding, Shadow } from '../utils/theme';

export const MessageBubble = ({ message, isMine }) => {
    return (
        <View style={[styles.container, isMine ? styles.myContainer : styles.theirContainer]}>
            <View style={[
                styles.bubble, 
                isMine ? styles.myBubble : styles.theirBubble,
                Shadow.subtle
            ]}>
                <Text style={[styles.text, isMine ? styles.myText : styles.theirText]}>
                    {message.message_text}
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginVertical: 6,
        paddingHorizontal: Spacing.md,
        flexDirection: 'row',
    },
    myContainer: {
        justifyContent: 'flex-end',
    },
    theirContainer: {
        justifyContent: 'flex-start',
    },
    bubble: {
        maxWidth: '75%',
        padding: 12,
        borderRadius: Rounding.standard,
        borderWidth: 1,
    },
    myBubble: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
        borderBottomRightRadius: 2,
    },
    theirBubble: {
        backgroundColor: Colors.white,
        borderColor: Colors.border,
        borderBottomLeftRadius: 2,
    },
    text: {
        fontSize: 15,
        lineHeight: 20,
    },
    myText: {
        color: Colors.white,
        fontWeight: '500',
    },
    theirText: {
        color: Colors.primary,
        fontWeight: '500',
    }
});
