import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Button, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { userService } from '../services/userService';
import { supabase } from '../services/supabaseClient';
import { UserAvatar } from '../components/UserAvatar';
import { RatingStars } from '../components/RatingStars';

export const ProfileScreen = ({ navigation }) => {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            const data = await userService.getUserProfile(session.user.id);
            setProfile(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) Alert.alert('Error', error.message);
    };

    if (loading) return <ActivityIndicator style={{ flex: 1 }} />;
    if (!profile) return <Text style={{ flex: 1, textAlign: 'center' }}>Profile not found</Text>;

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.header}>
                <UserAvatar user={profile} size={100} />
                <Text style={styles.name}>{profile.name}</Text>
                <RatingStars rating={profile.rating || 5} />
                <Text style={styles.stats}>Completed Tasks: {profile.completed_tasks || 0}</Text>
            </View>

            <Text style={styles.sectionTitle}>Bio</Text>
            <Text style={styles.bio}>{profile.bio || 'No bio provided.'}</Text>

            <View style={styles.actions}>
                <Button title="Edit Profile" onPress={() => Alert.alert('WIP')} />
                <View style={{ height: 16 }} />
                <Button title="View Reviews" onPress={() => Alert.alert('WIP')} />
                <View style={{ height: 16 }} />
                <Button title="Logout" color="red" onPress={handleLogout} />
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 24,
        alignItems: 'center',
        flexGrow: 1,
        backgroundColor: '#fff',
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        marginTop: 16,
        marginBottom: 8,
    },
    stats: {
        fontSize: 16,
        color: '#666',
        marginTop: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        alignSelf: 'flex-start',
        marginBottom: 8,
    },
    bio: {
        alignSelf: 'flex-start',
        fontSize: 16,
        color: '#333',
        marginBottom: 32,
    },
    actions: {
        width: '100%',
    }
});
