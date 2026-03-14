import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Image, KeyboardAvoidingView, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../services/supabaseClient';
import { userService } from '../services/userService';
import { Spacing, Rounding } from '../utils/theme';
import { FontAwesome } from '@expo/vector-icons';
import { useToast } from '../components/ToastContext';
import { useTheme } from '../components/ThemeContext';
import { useAuth } from '../components/AuthContext';

export const EditProfileScreen = ({ navigation }) => {
    const { theme, shadows } = useTheme();
    const { session } = useAuth();
    const styles = useMemo(() => createStyles(theme, shadows), [theme, shadows]);
    const { showToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [profile, setProfile] = useState({
        name: '',
        phone: '',
        bio: '',
        skills: [],
        profile_image: null
    });
    const [skillInput, setSkillInput] = useState('');

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            if (!session) return;
            const data = await userService.getUserProfile(session.user.id);
            if (data) {
                setProfile({
                    name: data.name || '',
                    phone: data.phone || '',
                    bio: data.bio || '',
                    skills: data.skills || [],
                    profile_image: data.profile_image || null
                });
            }
        } catch (error) {
            console.error(error);
            showToast('Failed to load profile', 'error');
        } finally {
            setLoading(false);
        }
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            uploadImage(result.assets[0].uri);
        }
    };

    const uploadImage = async (uri) => {
        setSaving(true);
        try {
            if (!session) return;
            const imageUrl = await userService.uploadAvatar(session.user.id, uri);
            setProfile(prev => ({ ...prev, profile_image: imageUrl }));
            showToast('Profile image updated!', 'success');
        } catch (error) {
            showToast('Failed to upload image', 'error');
        } finally {
            setSaving(false);
        }
    };

    const addSkill = () => {
        if (skillInput.trim() && !profile.skills.includes(skillInput.trim())) {
            setProfile(prev => ({
                ...prev,
                skills: [...prev.skills, skillInput.trim()]
            }));
            setSkillInput('');
        }
    };

    const removeSkill = (skillToRemove) => {
        setProfile(prev => ({
            ...prev,
            skills: prev.skills.filter(s => s !== skillToRemove)
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            if (!session) return;
            await userService.updateUserProfile(session.user.id, profile);
            showToast('Profile updated successfully!', 'success');
            navigation.goBack();
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setSaving(false);
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
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <FontAwesome name="chevron-left" size={20} color={theme.white} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Edit Profile</Text>
                <TouchableOpacity onPress={handleSave} disabled={saving}>
                    {saving ? (
                        <ActivityIndicator size="small" color={theme.white} />
                    ) : (
                        <Text style={styles.saveText}>Save</Text>
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.imageSection}>
                    <TouchableOpacity onPress={pickImage} style={styles.imageContainer}>
                        {profile.profile_image ? (
                            <Image source={{ uri: profile.profile_image }} style={styles.profileImage} />
                        ) : (
                            <View style={styles.placeholderImage}>
                                <FontAwesome name="user" size={50} color={theme.border} />
                            </View>
                        )}
                        <View style={styles.editIconBadge}>
                            <FontAwesome name="camera" size={14} color={theme.white} />
                        </View>
                    </TouchableOpacity>
                    <Text style={styles.changePhotoText}>Change Profile Photo</Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.label}>FULL NAME</Text>
                    <TextInput
                        style={styles.input}
                        value={profile.name}
                        onChangeText={(text) => setProfile(prev => ({ ...prev, name: text }))}
                        placeholder="Your full name"
                        placeholderTextColor={theme.textMuted}
                    />
                </View>

                <View style={styles.section}>
                    <Text style={styles.label}>PHONE NUMBER</Text>
                    <TextInput
                        style={styles.input}
                        value={profile.phone}
                        onChangeText={(text) => setProfile(prev => ({ ...prev, phone: text }))}
                        placeholder="0400 000 000"
                        placeholderTextColor={theme.textMuted}
                        keyboardType="phone-pad"
                    />
                </View>

                <View style={styles.section}>
                    <Text style={styles.label}>BIO</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        value={profile.bio}
                        onChangeText={(text) => setProfile(prev => ({ ...prev, bio: text }))}
                        placeholder="Tell your neighbors about yourself..."
                        placeholderTextColor={theme.textMuted}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                    />
                </View>

                <View style={styles.section}>
                    <Text style={styles.label}>SKILLS</Text>
                    <View style={styles.skillInputContainer}>
                        <TextInput
                            style={styles.skillInput}
                            value={skillInput}
                            onChangeText={setSkillInput}
                            placeholder="Add a skill (e.g. Plumbing)"
                            placeholderTextColor={theme.textMuted}
                            onSubmitEditing={addSkill}
                        />
                        <TouchableOpacity style={styles.addSkillButton} onPress={addSkill}>
                            <FontAwesome name="plus" size={16} color={theme.white} />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.skillsList}>
                        {profile.skills.map((skill, index) => (
                            <View key={index} style={styles.skillBadge}>
                                <Text style={styles.skillBadgeText}>{skill}</Text>
                                <TouchableOpacity onPress={() => removeSkill(skill)}>
                                    <FontAwesome name="times-circle" size={16} color={theme.accent} style={{ marginLeft: 8 }} />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                </View>
            </ScrollView>
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
    },
    header: {
        backgroundColor: theme.primary,
        paddingTop: Spacing.lg,
        paddingBottom: Spacing.md,
        paddingHorizontal: Spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        ...shadows.medium,
    },
    backButton: {
        width: 40,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: theme.white,
    },
    saveText: {
        color: theme.accent,
        fontSize: 16,
        fontWeight: '700',
    },
    scrollContent: {
        padding: Spacing.lg,
        paddingBottom: 50,
    },
    imageSection: {
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    imageContainer: {
        position: 'relative',
    },
    profileImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 3,
        borderColor: theme.surface,
    },
    placeholderImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: theme.surface,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: theme.surface,
        ...shadows.subtle,
    },
    editIconBadge: {
        position: 'absolute',
        bottom: 5,
        right: 5,
        backgroundColor: theme.accent,
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: theme.surface,
    },
    changePhotoText: {
        marginTop: Spacing.sm,
        color: theme.text,
        fontWeight: '700',
        fontSize: 14,
    },
    section: {
        marginBottom: Spacing.lg,
    },
    label: {
        fontSize: 11,
        fontWeight: '800',
        color: theme.primary,
        marginBottom: Spacing.xs,
        marginLeft: 4,
        letterSpacing: 0.5,
    },
    input: {
        borderWidth: 1.5,
        borderColor: theme.border,
        padding: Spacing.md,
        borderRadius: Rounding.standard,
        fontSize: 16,
        color: theme.text,
        backgroundColor: theme.surface,
    },
    textArea: {
        minHeight: 100,
    },
    skillInputContainer: {
        flexDirection: 'row',
        marginBottom: Spacing.sm,
    },
    skillInput: {
        flex: 1,
        borderWidth: 1.5,
        borderColor: theme.border,
        padding: Spacing.md,
        borderRadius: Rounding.standard,
        fontSize: 16,
        color: theme.text,
        backgroundColor: theme.surface,
        borderTopRightRadius: 0,
        borderBottomRightRadius: 0,
    },
    addSkillButton: {
        backgroundColor: theme.primary,
        width: 50,
        justifyContent: 'center',
        alignItems: 'center',
        borderTopRightRadius: Rounding.standard,
        borderBottomRightRadius: Rounding.standard,
    },
    skillsList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    skillBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.isDarkMode ? theme.surface : '#E8EFF4',
        paddingHorizontal: Spacing.md,
        paddingVertical: 8,
        borderRadius: Rounding.pill,
        marginRight: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: theme.border,
    },
    skillBadgeText: {
        color: theme.text,
        fontWeight: '700',
        fontSize: 13,
    }
});
