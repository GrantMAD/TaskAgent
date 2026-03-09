import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ScrollView } from 'react-native';
import { supabase } from '../services/supabaseClient';

export const RegisterScreen = ({ navigation }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRegister = async () => {
        if (loading) return;
        setLoading(true);
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    name,
                    phone,
                }
            }
        });

        if (error) {
            setLoading(false);
            Alert.alert('Error', error.message);
            return;
        }

        if (data.user) {
            setLoading(false);
            // Check if user is already "active" (e.g. if email confirmation is off)
            // or if they need to check their email.
            if (data.session) {
                Alert.alert('Success', 'Registered and logged in!');
            } else {
                Alert.alert('Success', 'Registration successful! Please check your email for a confirmation link.');
                navigation.navigate('Login');
            }
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Register</Text>
            <TextInput
                style={styles.input}
                placeholder="Full Name"
                value={name}
                onChangeText={setName}
            />
            <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
            />
            <TextInput
                style={styles.input}
                placeholder="Phone"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
            />
            <TextInput
                style={styles.input}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
            />
            <Button title={loading ? 'Loading...' : 'Register'} onPress={handleRegister} disabled={loading} />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 24,
        justifyContent: 'center',
        flexGrow: 1,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 24,
        textAlign: 'center',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 12,
        marginBottom: 16,
        borderRadius: 8,
    }
});
