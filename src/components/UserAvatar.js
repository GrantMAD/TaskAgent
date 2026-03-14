import React, { memo } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Colors, Shadow } from '../utils/theme';
import { FontAwesome } from '@expo/vector-icons';

export const UserAvatar = memo(({ user, size = 40 }) => {
    if (!user) return null;

    return (
        <View style={[styles.container, { width: size, height: size, borderRadius: size / 2 }, Shadow.subtle]}>
            {user.profile_image ? (
                <Image
                    source={{ uri: user.profile_image }}
                    style={{ width: size, height: size, borderRadius: size / 2 }}
                />
            ) : (
                <View style={[styles.placeholderContainer, { backgroundColor: Colors.border }]}>
                    <FontAwesome name="user" size={size * 0.5} color={Colors.textMuted} />
                </View>
            )}
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        overflow: 'hidden',
    },
    placeholderContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    }
});
