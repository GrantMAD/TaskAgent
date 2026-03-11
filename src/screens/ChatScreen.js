import React, { useEffect, useState, useRef, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { messageService } from '../services/messageService';
import { supabase } from '../services/supabaseClient';
import { MessageBubble } from '../components/MessageBubble';
import { MessageSkeleton } from '../components/skeletons/SkeletonPlaceholders';
import { UserAvatar } from '../components/UserAvatar';
import { Spacing, Rounding } from '../utils/theme';
import { useTheme } from '../components/ThemeContext';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { useToast } from '../components/ToastContext';

export const ChatScreen = ({ route, navigation }) => {
    const { theme, shadows } = useTheme();
    const { conversationId } = route.params;
    const [messages, setMessages] = useState([]);
    const [conversation, setConversation] = useState(null);
    const [text, setText] = useState('');
    const [userId, setUserId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isOtherTyping, setIsOtherTyping] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const typingTimeoutRef = useRef(null);
    const channelRef = useRef(null);
    const { showToast } = useToast();
    const flatListRef = useRef(null);

    const styles = useMemo(() => createStyles(theme, shadows), [theme, shadows]);

    const otherUser = useMemo(() => {
        if (!conversation || !userId) return null;
        return conversation.user1_id === userId ? conversation.user2 : conversation.user1;
    }, [conversation, userId]);

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
        fetchChatDetails();

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
                        // 1. Avoid duplicates if we already have this message (real ID match)
                        if (prev.find(m => m.id === payload.new.id)) return prev;
                        
                        // 2. Optimistic match: replace temp message with real one from DB
                        // We check for matching sender, text, and that the ID starts with 'temp-'
                        const optimisticIndex = prev.findIndex(m => 
                            m.sender_id === payload.new.sender_id && 
                            m.message_text === payload.new.message_text && 
                            m.id.toString().startsWith('temp-')
                        );

                        if (optimisticIndex !== -1) {
                            const updatedMessages = [...prev];
                            updatedMessages[optimisticIndex] = {
                                ...payload.new,
                                status: 'sent'
                            };
                            return updatedMessages;
                        }
                        
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

    const fetchChatDetails = async () => {
        try {
            const [conv, msgs] = await Promise.all([
                messageService.getConversation(conversationId),
                messageService.getMessages(conversationId)
            ]);
            setConversation(conv);
            setMessages(msgs);
        } catch (error) {
            console.error('Error fetching chat details:', error);
            showToast('Could not load conversation', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchMessages = async () => {
        // This is now handled in fetchChatDetails
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

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.7,
        });

        if (!result.canceled) {
            setSelectedImage(result.assets[0].uri);
        }
    };

    const handleSend = async () => {
        if ((!text.trim() && !selectedImage) || !userId) return;
        
        const messageText = text.trim();
        const imageToUpload = selectedImage;
        const tempId = `temp-${Date.now()}`;
        
        setText('');
        setSelectedImage(null);

        // Stop typing status
        if (channelRef.current) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'typing',
                payload: { userId, isTyping: false }
            });
        }

        // Optimistic UI Update (using local URI for immediate display)
        const optimisticMessage = {
            id: tempId,
            conversation_id: conversationId,
            sender_id: userId,
            message_text: messageText,
            image_url: imageToUpload,
            created_at: new Date().toISOString(),
            status: 'sending'
        };

        setMessages((prev) => [...prev, optimisticMessage]);

        try {
            let uploadedUrl = null;
            if (imageToUpload) {
                // Keep track of upload but don't block the UI
                uploadedUrl = await messageService.uploadChatImage(userId, imageToUpload);
            }
            
            // sendMessage now returns the created message record with its real ID
            const realMessage = await messageService.sendMessage(conversationId, userId, messageText, uploadedUrl);
            
            // Swap tempId with the real ID to prevent duplicate when real-time insert hits
            setMessages((prev) => prev.map(msg => 
                msg.id === tempId 
                    ? { ...realMessage, status: 'sent' } 
                    : msg
            ));
        } catch (error) {
            console.error(error);
            showToast('Failed to send message', 'error');
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
                <View style={styles.headerInfoContainer}>
                    <UserAvatar user={otherUser} size={36} />
                    <View style={styles.headerTextContainer}>
                        <Text style={styles.headerTitle} numberOfLines={1}>{otherUser?.name || 'Neighbor'}</Text>
                        {conversation?.task?.title && (
                            <Text style={styles.headerSubtitle} numberOfLines={1}>{conversation.task.title}</Text>
                        )}
                    </View>
                </View>
                <TouchableOpacity 
                    style={styles.headerAction}
                    onPress={() => conversation?.task_id && navigation.navigate('Main', { 
                        screen: 'HomeTab', 
                        params: { 
                            screen: 'TaskDetail', 
                            params: { taskId: conversation.task_id } 
                        } 
                    })}
                >
                    <FontAwesome name="info-circle" size={20} color={theme.white} />
                </TouchableOpacity>
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

            {selectedImage && (
                <View style={styles.imagePreviewContainer}>
                    <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
                    <TouchableOpacity 
                        style={styles.removeImageButton} 
                        onPress={() => setSelectedImage(null)}
                    >
                        <FontAwesome name="times-circle" size={24} color={theme.accent} />
                    </TouchableOpacity>
                </View>
            )}

            <View style={[styles.inputContainer, shadows.medium]}>
                <TouchableOpacity style={styles.attachButton} onPress={pickImage}>
                    <Ionicons name="camera-outline" size={26} color={theme.primary} />
                </TouchableOpacity>
                <TextInput
                    style={styles.input}
                    value={text}
                    onChangeText={handleTextChange}
                    placeholder="Type a message..."
                    placeholderTextColor={theme.textMuted}
                    multiline
                />
                <TouchableOpacity 
                    style={[styles.sendButton, (!text.trim() && !selectedImage) && styles.sendButtonDisabled]} 
                    onPress={handleSend}
                    disabled={!text.trim() && !selectedImage}
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
    headerInfoContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 5,
    },
    headerTextContainer: {
        marginLeft: 10,
        flex: 1,
    },
    headerAction: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: theme.white,
    },
    headerSubtitle: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: '600',
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
        alignItems: 'center', // Changed from flex-end for better vertical alignment
        borderTopWidth: 1,
        borderTopColor: theme.border,
        paddingBottom: Platform.OS === 'ios' ? 30 : Spacing.sm,
    },
    attachButton: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        backgroundColor: theme.input,
        borderWidth: 1.5,
        borderColor: theme.border,
        borderRadius: Rounding.standard,
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 10 : 8,
        paddingBottom: Platform.OS === 'ios' ? 10 : 8,
        marginRight: 10,
        fontSize: 16,
        maxHeight: 120,
        minHeight: 42,
        color: theme.text,
        textAlignVertical: 'center',
    },
    sendButton: {
        backgroundColor: theme.accent,
        width: 44,
        height: 44,
        borderRadius: Rounding.pill,
        alignItems: 'center',
        justifyContent: 'center',
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
    },
    imagePreviewContainer: {
        padding: Spacing.md,
        backgroundColor: theme.surface,
        borderTopWidth: 1,
        borderTopColor: theme.border,
        flexDirection: 'row',
    },
    imagePreview: {
        width: 100,
        height: 100,
        borderRadius: Rounding.standard,
    },
    removeImageButton: {
        position: 'absolute',
        top: 5,
        left: 95,
        backgroundColor: theme.surface,
        borderRadius: 12,
    }
});
