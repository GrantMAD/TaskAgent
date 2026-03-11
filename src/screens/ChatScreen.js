import React, { useEffect, useState, useRef, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { messageService } from '../services/messageService';
import { supabase } from '../services/supabaseClient';
import { MessageBubble } from '../components/MessageBubble';
import { MessageSkeleton } from '../components/skeletons/SkeletonPlaceholders';
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
    const [isOtherTyping, setIsOtherTyping] = useState(false);
    const typingTimeoutRef = useRef(null);
    const channelRef = useRef(null);
    const { showToast } = useToast();
    const flatListRef = useRef(null);

    const styles = useMemo(() => createStyles(theme, shadows), [theme, shadows]);

    useEffect(() => {
        let currentUserId;
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                currentUserId = session.user.id;
                setUserId(currentUserId);
                // Mark existing messages as read
                messageService.markMessagesAsRead(conversationId, currentUserId);
            }
        });
        fetchMessages();

        // Subscribe to messages and typing events
        const channel = supabase
            .channel(`public:messages:conversation_id=eq.${conversationId}`)
            .on('postgres_changes', {
                event: '*', // Listen to all changes (INSERT, UPDATE)
                schema: 'public',
                table: 'messages',
                filter: `conversation_id=eq.${conversationId}`
            }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    setMessages((prev) => {
                        // Avoid duplicates if we already have this message (e.g. from optimistic UI)
                        if (prev.find(m => m.id === payload.new.id)) return prev;
                        
                        // If it's from the other user, mark it as read immediately since we are on this screen
                        if (payload.new.sender_id !== currentUserId) {
                            messageService.markMessagesAsRead(conversationId, currentUserId);
                        }
                        
                        return [...prev, payload.new];
                    });
                } else if (payload.eventType === 'UPDATE') {
                    // Update the message in our state (usually for is_read status)
                    setMessages((prev) => prev.map(msg => 
                        msg.id === payload.new.id ? { ...msg, ...payload.new } : msg
                    ));
                }
            })
            .on('broadcast', { event: 'typing' }, (payload) => {
                if (payload.payload.userId !== currentUserId) {
                    setIsOtherTyping(payload.payload.isTyping);
                }
            })
            .subscribe();

        channelRef.current = channel;

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

    const handleTextChange = (val) => {
        setText(val);
        
        // Broadcast typing status
        if (channelRef.current && userId) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'typing',
                payload: { userId, isTyping: true }
            });

            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            
            typingTimeoutRef.current = setTimeout(() => {
                if (channelRef.current) {
                    channelRef.current.send({
                        type: 'broadcast',
                        event: 'typing',
                        payload: { userId, isTyping: false }
                    });
                }
            }, 3000);
        }
    };

    const handleSend = async () => {
        if (!text.trim() || !userId) return;
        const messageText = text.trim();
        const tempId = `temp-${Date.now()}`;
        setText('');

        // Stop typing immediately on send
        if (channelRef.current) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'typing',
                payload: { userId, isTyping: false }
            });
        }

        // Optimistic UI Update
        const optimisticMessage = {
            id: tempId,
            conversation_id: conversationId,
            sender_id: userId,
            message_text: messageText,
            created_at: new Date().toISOString(),
            status: 'sending'
        };

        setMessages((prev) => [...prev, optimisticMessage]);

        try {
            await messageService.sendMessage(conversationId, userId, messageText);
            // The real-time subscription will handle replacing this or adding the real one
            // We'll update the optimistic message status to 'sent' or just let the real one arrive
            setMessages((prev) => prev.map(msg => msg.id === tempId ? { ...msg, status: 'sent' } : msg));
        } catch (error) {
            console.error(error);
            showToast('Failed to send message', 'error');
            // Rollback: Remove the optimistic message
            setMessages((prev) => prev.filter(msg => msg.id !== tempId));
        }
    };

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

            <View style={{ flex: 1 }}>
                {loading ? (
                    <MessageSkeleton />
                ) : (
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        keyExtractor={(item) => item.id.toString()}
                        contentContainerStyle={styles.messageList}
                        showsVerticalScrollIndicator={false}
                        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
                        renderItem={({ item }) => (
                            <MessageBubble
                                message={item}
                                isMine={item.sender_id === userId}
                                status={item.status}
                            />
                        )}
                    />
                )}
                {isOtherTyping && (
                    <View style={styles.typingIndicator}>
                        <Text style={styles.typingText}>Neighbor is typing...</Text>
                    </View>
                )}
            </View>

            <View style={[styles.inputContainer, shadows.medium]}>
                <TextInput
                    style={styles.input}
                    value={text}
                    onChangeText={handleTextChange}
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
    },
    typingIndicator: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: 4,
        marginBottom: 4,
    },
    typingText: {
        fontSize: 12,
        fontStyle: 'italic',
        color: theme.textMuted,
    }
});
