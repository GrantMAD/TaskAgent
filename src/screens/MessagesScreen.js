import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { messageService } from '../services/messageService';
import { supabase } from '../services/supabaseClient';
import { UserAvatar } from '../components/UserAvatar';

export const MessagesScreen = ({ navigation }) => {
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchConversations();
    }, []);

    const fetchConversations = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            const data = await messageService.getConversations(session.user.id);
            setConversations(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

    return (
        <View style={styles.container}>
            <FlatList
                data={conversations}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.conversationRow}
                        onPress={() => navigation.navigate('Chat', { conversationId: item.id })}
                    >
                        <UserAvatar user={{ name: 'User' }} size={48} />
                        <View style={styles.textContainer}>
                            <Text style={styles.taskTitle}>{item.task?.title || 'Unknown Task'}</Text>
                            <Text style={styles.preview} numberOfLines={1}>Tap to view messages...</Text>
                        </View>
                    </TouchableOpacity>
                )}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    conversationRow: {
        flexDirection: 'row',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        alignItems: 'center',
    },
    textContainer: {
        marginLeft: 12,
        flex: 1,
    },
    taskTitle: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    preview: {
        color: '#666',
        marginTop: 4,
    }
});
