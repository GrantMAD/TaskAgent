import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, Text, Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { supabase } from '../services/supabaseClient';

// Screens
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { TaskFeedScreen } from '../screens/TaskFeedScreen';
import { TaskDetailScreen } from '../screens/TaskDetailScreen';
import { CreateTaskScreen } from '../screens/CreateTaskScreen';
import { MessagesScreen } from '../screens/MessagesScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { ProfileScreen } from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const LogoutButton = () => {
    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) Alert.alert('Error', error.message);
    };

    return (
        <TouchableOpacity onPress={handleLogout} style={{ marginRight: 15 }}>
            <Text style={{ color: '#FF3B30', fontWeight: '600' }}>Sign Out</Text>
        </TouchableOpacity>
    );
};

// Home Stack to include Details
const HomeStack = () => (
    <Stack.Navigator screenOptions={{ headerRight: () => <LogoutButton /> }}>
        <Stack.Screen name="HomeMain" component={HomeScreen} options={{ title: 'Home' }} />
        <Stack.Screen name="TaskDetail" component={TaskDetailScreen} options={{ title: 'Task Details' }} />
    </Stack.Navigator>
);

// Feed Stack
const FeedStack = () => (
    <Stack.Navigator screenOptions={{ headerRight: () => <LogoutButton /> }}>
        <Stack.Screen name="TaskFeed" component={TaskFeedScreen} options={{ title: 'Tasks' }} />
        <Stack.Screen name="TaskDetail" component={TaskDetailScreen} options={{ title: 'Task Details' }} />
    </Stack.Navigator>
);

// Messages Stack
const MessagesStack = () => (
    <Stack.Navigator screenOptions={{ headerRight: () => <LogoutButton /> }}>
        <Stack.Screen name="MessagesMain" component={MessagesScreen} options={{ title: 'Messages' }} />
        <Stack.Screen name="Chat" component={ChatScreen} options={({ route }) => ({ title: 'Chat' })} />
    </Stack.Navigator>
);

// Main Tab Navigator
const MainTabs = () => (
    <Tab.Navigator screenOptions={{ headerRight: () => <LogoutButton /> }}>
        <Tab.Screen name="HomeTab" component={HomeStack} options={{ title: 'Home', headerShown: false }} />
        <Tab.Screen name="TasksTab" component={FeedStack} options={{ title: 'Tasks', headerShown: false }} />
        <Tab.Screen name="CreateTab" component={CreateTaskScreen} options={{ title: 'Post Task' }} />
        <Tab.Screen name="MessagesTab" component={MessagesStack} options={{ title: 'Messages', headerShown: false }} />
        <Tab.Screen name="ProfileTab" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
);

// Auth Stack
const AuthStack = () => (
    <Stack.Navigator>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
);

export const AppNavigator = () => {
    const [session, setSession] = useState(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });

        supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });
    }, []);

    return (
        <NavigationContainer>
            {session && session.user ? <MainTabs /> : <AuthStack />}
        </NavigationContainer>
    );
};
