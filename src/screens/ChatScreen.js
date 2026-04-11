import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Modal, TouchableWithoutFeedback } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { messageService } from '../services/messageService';
import { supabase } from '../services/supabaseClient';
import { MessageBubble } from '../components/MessageBubble';
import { MessageSkeleton } from '../components/skeletons/SkeletonPlaceholders';
import { UserAvatar } from '../components/UserAvatar';
import { ReportModal } from '../components/ReportModal';
import { Spacing, Rounding } from '../utils/theme';
import { useTheme } from '../components/ThemeContext';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { useToast } from '../components/ToastContext';
import { useAuth } from '../components/AuthContext';
import { useNotifications } from '../components/NotificationContext';

export const ChatScreen = ({ route, navigation }) => {
    const { theme, shadows } = useTheme();
    const { session } = useAuth();
    const { onlineUsers } = useNotifications();
    const { conversationId } = route.params;
    const [messages, setMessages] = useState([]);
    const [conversation, setConversation] = useState(null);
    const [text, setText] = useState('');
    const [userId, setUserId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [offset, setOffset] = useState(0);
    const LIMIT = 20;

    const [isOtherTyping, setIsOtherTyping] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [isReportModalVisible, setIsReportModalVisible] = useState(false);
    const [selectedMessageForReport, setSelectedMessageForReport] = useState(null);
    const [isActionModalVisible, setIsActionModalVisible] = useState(false);
    const [selectedMessageForAction, setSelectedMessageForAction] = useState(null);

    const typingTimeoutRef = useRef(null);
    const channelRef = useRef(null);
    const { showToast } = useToast();
    const flatListRef = useRef(null);

    const styles = useMemo(() => createStyles(theme, shadows), [theme, shadows]);

    const otherUser = useMemo(() => {
        if (!conversation || !userId) return null;
        const user = conversation.user1_id === userId ? conversation.user2 : conversation.user1;
        return user || { name: 'Deleted User', profile_image: null };
    }, [conversation, userId]);

    const fetchChatDetails = useCallback(async () => {
        try {
            const [conv, msgs] = await Promise.all([
                messageService.getConversation(conversationId),
                messageService.getMessages(conversationId, LIMIT, 0)
            ]);
            setConversation(conv);
            // Inverted: msgs come chronologically from service (after .reverse())
            // For inverted list, we need newest at start of array
            setMessages(msgs.reverse());
            setOffset(LIMIT);
            if (msgs.length < LIMIT) setHasMore(false);
        } catch (error) {
            console.error('Error fetching chat details:', error);
            showToast('Could not load conversation', 'error');
        } finally {
            setLoading(false);
        }
    }, [conversationId, showToast]);

    useEffect(() => {
        if (session) {
            setUserId(session.user.id);
            // Mark existing messages as read
            messageService.markMessagesAsRead(conversationId, session.user.id);
        }
        fetchChatDetails();

        // Subscribe to messages and typing events
        const channel = supabase
            .channel(`chat-${conversationId}`)
            .on('postgres_changes', {
                event: '*', // Listen to all changes (INSERT, UPDATE, DELETE)
                schema: 'public',
                table: 'messages',
                filter: `conversation_id=eq.${conversationId}`
            }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    // Check if message is from other user to mark as read
                    // We need to know who the current user is. 
                    // Since useEffect closure might have old userId, we'll get it from session or state
                    const checkMarkRead = async () => {
                        if (session && payload.new.sender_id !== session.user.id) {
                            messageService.markMessagesAsRead(conversationId, session.user.id);
                        }
                    };
                    checkMarkRead();

                    setMessages((prev) => {
                        // 1. Avoid duplicates if we already have this message (real ID match)
                        if (prev.find(m => m.id === payload.new.id)) return prev;
                        
                        // 2. Optimistic match: replace temp message with real one from DB
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
                        
                        // INVERTED: NEW MESSAGES AT THE START (BOTTOM OF SCREEN)
                        return [payload.new, ...prev];
                    });
                } else if (payload.eventType === 'UPDATE') {
                    // Update the message in our state (usually for is_read status)
                    setMessages((prev) => prev.map(msg => 
                        msg.id === payload.new.id ? { ...msg, ...payload.new } : msg
                    ));
                } else if (payload.eventType === 'DELETE') {
                    setMessages((prev) => prev.filter(msg => msg.id !== payload.old.id));
                }
            })
            .on('broadcast', { event: 'typing' }, (payload) => {
                if (payload.payload.userId !== session?.user?.id) {
                    setIsOtherTyping(payload.payload.isTyping);
                }
            })
            .subscribe();

        channelRef.current = channel;

        return () => {
            supabase.removeChannel(channel);
        };
    }, [conversationId, fetchChatDetails, session, showToast]);


    const loadMoreMessages = async () => {
        if (!hasMore || loadingMore) return;
        
        setLoadingMore(true);
        try {
            const olderMsgs = await messageService.getMessages(conversationId, LIMIT, offset);
            if (olderMsgs.length < LIMIT) {
                setHasMore(false);
            }
            // olderMsgs come chronologically [older ... newer]
            // We want [newest ... oldest] for inverted list
            setMessages(prev => [...prev, ...olderMsgs.reverse()]);
            setOffset(prev => prev + LIMIT);
        } catch (error) {
            console.error('Error loading more messages:', error);
        } finally {
            setLoadingMore(false);
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

        // INVERTED: NEW MESSAGE AT THE START (BOTTOM OF SCREEN)
        setMessages((prev) => [optimisticMessage, ...prev]);

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
            if (error.code === 'RATE_LIMIT_EXCEEDED') {
                showToast('Slow down! Wait a moment before sending again.', 'warning');
            } else {
                showToast('Failed to send message', 'error');
            }
            setMessages((prev) => prev.filter(msg => msg.id !== tempId));
        }
    };

    const handleDeleteMessage = async (messageId) => {
        try {
            await messageService.deleteMessage(messageId);
            // Real-time will handle state update via the UPDATE event, 
            // but we can also do it optimistically
            setMessages(prev => prev.map(m => 
                m.id === messageId 
                ? { ...m, message_text: '[DELETED]', image_url: null } 
                : m
            ));
            showToast('Message deleted', 'success');
        } catch (error) {
            console.error('Delete error:', error);
            showToast('Failed to delete message', 'error');
        }
    };

    const handleReportMessage = (message) => {
        setSelectedMessageForReport(message);
        setIsReportModalVisible(true);
    };

    const handleLongPress = useCallback((message) => {
        console.log('Long press detected for message:', message.id);
        setSelectedMessageForAction(message);
        setIsActionModalVisible(true);
    }, []);

    const handleActionModalOption = (option) => {
        setIsActionModalVisible(false);
        if (!selectedMessageForAction) return;

        if (option === 'delete') {
            handleDeleteMessage(selectedMessageForAction.id);
        } else if (option === 'report') {
            handleReportMessage(selectedMessageForAction);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.navigate('MessagesMain')} style={styles.backButton}>
                    <FontAwesome name="chevron-left" size={20} color={theme.white} />
                </TouchableOpacity>
                <View style={styles.headerInfoContainer}>
                    <View style={{ position: 'relative' }}>
                        <UserAvatar user={otherUser} size={38} />
                        {onlineUsers[otherUser?.id] && (
                            <View style={styles.onlineBadge} />
                        )}
                    </View>
                    <View style={styles.headerTextContainer}>
                        <Text style={styles.headerTitle} numberOfLines={1}>{otherUser?.name || 'Deleted User'}</Text>
                        {isOtherTyping ? (
                            <Text style={[styles.headerSubtitle, { color: theme.white, opacity: 1 }]}>Typing...</Text>
                        ) : onlineUsers[otherUser?.id] ? (
                            <Text style={styles.headerSubtitle}>Online Now</Text>
                        ) : (
                            <Text style={[styles.headerSubtitle, { opacity: 0.6 }]}>Offline</Text>
                        )}
                    </View>
                </View>
                <View style={{ width: 40 }} />
            </View>

            <View style={{ flex: 1 }}>
                {loading ? (
                    <MessageSkeleton />
                ) : (
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        inverted
                        keyExtractor={(item) => item.id.toString()}
                        contentContainerStyle={styles.messageList}
                        showsVerticalScrollIndicator={false}
                        initialNumToRender={15}
                        maxToRenderPerBatch={10}
                        windowSize={5}
                        removeClippedSubviews={true}
                        onEndReached={loadMoreMessages}
                        onEndReachedThreshold={0.3}
                        ListFooterComponent={loadingMore ? <ActivityIndicator color={theme.accent} style={{ margin: 10 }} /> : null}
                        renderItem={({ item }) => (
                            <MessageBubble
                                message={item}
                                isMine={item.sender_id === userId}
                                status={item.status}
                                onLongPress={handleLongPress}
                            />
                        )}
                    />
                )}
                {isOtherTyping && (
                    <View style={styles.typingIndicator}>
                        <Text style={styles.typingText}>{otherUser?.name || 'Neighbour'} is typing...</Text>
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

            <ReportModal 
                visible={isReportModalVisible}
                onClose={() => setIsReportModalVisible(false)}
                reportedUserId={selectedMessageForReport?.sender_id}
                type="user"
            />

            {/* Cross-platform Message Action Modal */}
            <Modal
                visible={isActionModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsActionModalVisible(false)}
            >
                <TouchableWithoutFeedback onPress={() => setIsActionModalVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.actionSheetContainer}>
                            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                                <View style={styles.actionSheetContent}>
                                    <Text style={styles.actionSheetTitle}>Message Options</Text>
                                    
                                    {selectedMessageForAction?.sender_id === session?.user?.id ? (
                                        <TouchableOpacity 
                                            style={[styles.actionButton, styles.deleteButton]} 
                                            onPress={() => handleActionModalOption('delete')}
                                        >
                                            <FontAwesome name="trash" size={20} color={theme.error} />
                                            <Text style={styles.deleteButtonText}>Delete Message</Text>
                                        </TouchableOpacity>
                                    ) : (
                                        <TouchableOpacity 
                                            style={styles.actionButton} 
                                            onPress={() => handleActionModalOption('report')}
                                        >
                                            <FontAwesome name="flag" size={20} color={theme.text} />
                                            <Text style={styles.actionButtonText}>Report Message</Text>
                                        </TouchableOpacity>
                                    )}
                                    
                                    <TouchableOpacity 
                                        style={[styles.actionButton, { marginTop: 10 }]} 
                                        onPress={() => setIsActionModalVisible(false)}
                                    >
                                        <Text style={[styles.actionButtonText, { color: theme.textMuted }]}>Cancel</Text>
                                    </TouchableOpacity>
                                </View>
                            </TouchableWithoutFeedback>
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </KeyboardAvoidingView>
    );
};

const createStyles = (theme, shadows) => StyleSheet.create({
    container: {
        flex: 1,
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
    onlineBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#10B981', // emerald-500
        borderWidth: 2.5,
        borderColor: theme.primary,
        zIndex: 2,
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
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    actionSheetContainer: {
        padding: Spacing.md,
    },
    actionSheetContent: {
        backgroundColor: theme.surface,
        borderRadius: Rounding.soft,
        padding: Spacing.lg,
        ...shadows.large,
    },
    actionSheetTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: theme.textMuted,
        textAlign: 'center',
        marginBottom: Spacing.lg,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.md,
        borderRadius: Rounding.standard,
        backgroundColor: theme.background,
        marginBottom: 8,
    },
    actionButtonText: {
        marginLeft: 12,
        fontSize: 16,
        fontWeight: '600',
        color: theme.text,
    },
    deleteButton: {
        backgroundColor: 'rgba(239, 68, 68, 0.05)',
    },
    deleteButtonText: {
        marginLeft: 12,
        fontSize: 16,
        fontWeight: '700',
        color: theme.error,
    }
});
