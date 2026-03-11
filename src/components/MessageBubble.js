import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Spacing, Rounding } from '../utils/theme';
import { useTheme } from './ThemeContext';
import { FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';

export const MessageBubble = ({ message, isMine, status }) => {
    const { theme, shadows } = useTheme();
    const isSending = status === 'sending';
    const isRead = message.is_read;

    return (
        <View style={[styles.container, isMine ? styles.myContainer : styles.theirContainer]}>
            <View style={[
                styles.bubble, 
                isMine ? 
                    { backgroundColor: theme.primary, borderColor: theme.primary, borderBottomRightRadius: 2 } : 
                    { backgroundColor: theme.surface, borderColor: theme.border, borderBottomLeftRadius: 2 },
                isSending && { opacity: 0.7 },
                shadows.subtle
            ]}>
                <Text style={[
                    styles.text, 
                    isMine ? { color: theme.white } : { color: theme.text }
                ]}>
                    {message.message_text}
                </Text>
                {isMine && (
                    <View style={styles.statusContainer}>
                        {isSending ? (
                            <FontAwesome name="clock-o" size={10} color="rgba(255,255,255,0.5)" />
                        ) : (
                            <MaterialCommunityIcons 
                                name={isRead ? "check-all" : "check"} 
                                size={14} 
                                color={isRead ? theme.accent : "rgba(255,255,255,0.6)"} 
                            />
                        )}
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginVertical: 4,
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
        maxWidth: '80%',
        padding: 10,
        paddingHorizontal: 12,
        borderRadius: Rounding.standard,
        borderWidth: 1,
    },
    text: {
        fontSize: 15,
        lineHeight: 20,
        fontWeight: '500',
    },
    statusContainer: {
        alignSelf: 'flex-end',
        marginTop: 2,
        marginRight: -4,
    }
});
