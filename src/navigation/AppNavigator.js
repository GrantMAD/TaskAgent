import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, Text, Alert, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { FontAwesome } from '@expo/vector-icons';
import { supabase } from '../services/supabaseClient';
import { Colors, Shadow } from '../utils/theme';

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
import { TaskHistoryScreen } from '../screens/TaskHistoryScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const commonStackOptions = {
    headerShown: false,
};

// Home Stack
const HomeStack = () => (
    <Stack.Navigator screenOptions={commonStackOptions}>
        <Stack.Screen name="HomeMain" component={HomeScreen} />
        <Stack.Screen name="TaskDetail" component={TaskDetailScreen} />
    </Stack.Navigator>
);

// Feed Stack
const FeedStack = () => (
    <Stack.Navigator screenOptions={commonStackOptions}>
        <Stack.Screen name="TaskFeed" component={TaskFeedScreen} />
        <Stack.Screen name="TaskDetail" component={TaskDetailScreen} />
    </Stack.Navigator>
);

// Messages Stack
const MessagesStack = () => (
    <Stack.Navigator screenOptions={commonStackOptions}>
        <Stack.Screen name="MessagesMain" component={MessagesScreen} />
        <Stack.Screen name="Chat" component={ChatScreen} />
    </Stack.Navigator>
);

// Profile Stack
const ProfileStack = () => (
    <Stack.Navigator screenOptions={commonStackOptions}>
        <Stack.Screen name="ProfileMain" component={ProfileScreen} />
        <Stack.Screen name="TaskHistory" component={TaskHistoryScreen} />
        <Stack.Screen name="TaskDetail" component={TaskDetailScreen} />
    </Stack.Navigator>
);

// Main Tab Navigator
const MainTabs = () => (
    <Tab.Navigator 
        screenOptions={({ route }) => ({ 
            headerShown: false,
            tabBarActiveTintColor: Colors.accent,
            tabBarInactiveTintColor: Colors.textMuted,
            tabBarStyle: { 
                backgroundColor: Colors.white,
                borderTopWidth: 1,
                borderTopColor: Colors.border,
                height: 85,
                paddingBottom: Platform.OS === 'ios' ? 25 : 20,
                paddingTop: 10,
                ...Shadow.subtle,
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
            },
            tabBarLabelStyle: { fontWeight: '700', fontSize: 12 },
            tabBarIcon: ({ color, size }) => {
                let iconName;

                if (route.name === 'HomeTab') iconName = 'home';
                else if (route.name === 'TasksTab') iconName = 'search';
                else if (route.name === 'CreateTab') iconName = 'plus-square';
                else if (route.name === 'MessagesTab') iconName = 'envelope';
                else if (route.name === 'ProfileTab') iconName = 'user';

                return <FontAwesome name={iconName} size={size} color={color} />;
            },
        })}
    >
        <Tab.Screen name="HomeTab" component={HomeStack} options={{ title: 'Home' }} />
        <Tab.Screen name="TasksTab" component={FeedStack} options={{ title: 'Help' }} />
        <Tab.Screen name="CreateTab" component={CreateTaskScreen} options={{ title: 'Post' }} />
        <Tab.Screen name="MessagesTab" component={MessagesStack} options={{ title: 'Inbox' }} />
        <Tab.Screen name="ProfileTab" component={ProfileStack} options={{ title: 'Profile' }} />
    </Tab.Navigator>
);

// Auth Stack
const AuthStack = () => (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
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
