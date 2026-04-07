import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Spacing, Rounding } from '../utils/theme';
import { useTheme } from './ThemeContext';
import { FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';

export const MessageBubble = memo(({ message, isMine, status, onLongPress }) => {
    const { theme, shadows } = useTheme();
    const isSending = status === 'sending';
    const isRead = message.is_read;
    const isDeleted = message.message_text === '[DELETED]';

    return (
        <View style={[styles.container, isMine ? styles.myContainer : styles.theirContainer]}>
            <TouchableOpacity 
                activeOpacity={0.8}
                delayLongPress={300}
                onLongPress={() => {
                    console.log('TouchableOpacity long-pressed for message:', message.id);
                    if (!isDeleted && onLongPress) {
                        onLongPress(message);
                    }
                }}
                style={[
                    styles.bubble, 
                    isMine ? 
                        { backgroundColor: theme.primary, borderColor: theme.primary, borderBottomRightRadius: 2 } : 
                        { backgroundColor: theme.surface, borderColor: theme.border, borderBottomLeftRadius: 2 },
                    isSending && { opacity: 0.7 },
                    shadows.subtle
                ]}
            >
                {message.image_url && !isDeleted && (
                    <Image 
                        source={{ uri: message.image_url }} 
                        style={styles.image}
                        contentFit="cover"
                        transition={200}
                    />
                )}
                {isDeleted ? (
                    <Text style={[
                        styles.text, 
                        { fontStyle: 'italic', color: isMine ? 'rgba(255,255,255,0.7)' : theme.textMuted }
                    ]}>
                        This message was deleted
                    </Text>
                ) : (
                    message.message_text && (
                        <Text style={[
                            styles.text, 
                            isMine ? { color: theme.white } : { color: theme.text }
                        ]}>
                            {message.message_text}
                        </Text>
                    )
                )}
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
            </TouchableOpacity>
        </View>
    );
});

MessageBubble.displayName = 'MessageBubble';

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
    image: {
        width: 200,
        height: 200,
        borderRadius: Rounding.soft,
        marginBottom: Spacing.xs,
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
