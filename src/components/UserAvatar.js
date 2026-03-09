import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';

export const UserAvatar = ({ user, size = 40 }) => {
    if (!user) return null;

    return (
        <View style={[styles.container, { width: size, height: size, borderRadius: size / 2 }]}>
            {user.profile_image ? (
                <Image
                    source={{ uri: user.profile_image }}
                    style={{ width: size, height: size, borderRadius: size / 2 }}
                />
            ) : (
                <View style={styles.initialsContainer}>
                    <Text style={[styles.initials, { fontSize: size * 0.4 }]}>
                        {user.name ? user.name.charAt(0).toUpperCase() : '?'}
                    </Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        overflow: 'hidden',
        backgroundColor: '#ccc',
    },
    initialsContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    initials: {
        color: '#fff',
        fontWeight: 'bold',
    }
});
