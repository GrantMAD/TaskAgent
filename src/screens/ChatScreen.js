import React, { useEffect, useState, useRef, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { messageService } from '../services/messageService';
import { supabase } from '../services/supabaseClient';
import { MessageBubble } from '../components/MessageBubble';
import { Spacing, Rounding } from '../utils/theme';
import { useTheme } from '../components/ThemeContext';
import { FontAwesome } from '@expo/vector-icons';
import { useToast } from '../components/ToastContext';

export const ChatScreen = ({ route, navigation }) => {
    const { theme, shadows } = useTheme();
    const { conversationId } = route.params;
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState('');
    const [userId, setUserId] = useState(null);
    const [loading, setLoading] = useState(true);
    const { showToast } = useToast();
    const flatListRef = useRef(null);

    const styles = useMemo(() => createStyles(theme, shadows), [theme, shadows]);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) setUserId(session.user.id);
        });
        fetchMessages();

        // Subscribe to new messages
        const channel = supabase
            .channel(`public:messages:conversation_id=eq.${conversationId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `conversation_id=eq.${conversationId}`
            }, (payload) => {
                setMessages((prev) => [...prev, payload.new]);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [conversationId]);

    const fetchMessages = async () => {
        try {
            const data = await messageService.getMessages(conversationId);
            setMessages(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async () => {
        if (!text.trim() || !userId) return;
        const messageText = text.trim();
        setText('');
        try {
            await messageService.sendMessage(conversationId, userId, messageText);
        } catch (error) {
            console.error(error);
            showToast('Failed to send message', 'error');
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.primary} />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <FontAwesome name="chevron-left" size={20} color={theme.white} />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>Chat</Text>
                </View>
                <View style={styles.headerSpacer} />
            </View>

            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.messageList}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                    <MessageBubble message={item} isMine={item.sender_id === userId} />
                )}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
            />

            <View style={[styles.inputContainer, shadows.medium]}>
                <TextInput
                    style={styles.input}
                    value={text}
                    onChangeText={setText}
                    placeholder="Type a message..."
                    placeholderTextColor={theme.textMuted}
                    multiline
                />
                <TouchableOpacity 
                    style={[styles.sendButton, !text.trim() && styles.sendButtonDisabled]} 
                    onPress={handleSend}
                    disabled={!text.trim()}
                >
                    <FontAwesome name="send" size={18} color={theme.white} />
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
};

const createStyles = (theme, shadows) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.background,
    },
    header: {
        backgroundColor: theme.primary,
        paddingTop: 60,
        paddingBottom: Spacing.md,
        paddingHorizontal: Spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomLeftRadius: Rounding.soft,
        borderBottomRightRadius: Rounding.soft,
        ...shadows.medium,
        zIndex: 10,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
    },
    headerTitleContainer: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: theme.white,
    },
    headerSpacer: {
        width: 40,
    },
    messageList: {
        paddingVertical: Spacing.md,
        paddingBottom: 20,
    },
    inputContainer: {
        flexDirection: 'row',
        padding: Spacing.sm,
        paddingHorizontal: Spacing.md,
        backgroundColor: theme.surface,
        alignItems: 'flex-end',
        borderTopWidth: 1,
        borderTopColor: theme.border,
        paddingBottom: Platform.OS === 'ios' ? 30 : Spacing.sm, // Adjust for tab bar overlap if needed
    },
    input: {
        flex: 1,
        backgroundColor: theme.input,
        borderWidth: 1.5,
        borderColor: theme.border,
        borderRadius: Rounding.standard,
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 10,
        marginRight: 10,
        fontSize: 16,
        maxHeight: 100,
        color: theme.text,
    },
    sendButton: {
        backgroundColor: theme.accent,
        width: 48,
        height: 48,
        borderRadius: Rounding.pill,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 2,
        ...shadows.accent,
    },
    sendButtonDisabled: {
        backgroundColor: theme.border,
        opacity: 0.6,
    }
});
