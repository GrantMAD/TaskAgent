import React, { useEffect, useState, useMemo, useRef } from 'react';
import { View, TouchableOpacity, Text, Alert, Platform, Image, StyleSheet, Modal, TouchableWithoutFeedback, ScrollView, ActivityIndicator } from 'react-native';
import { NavigationContainer, useNavigation, getFocusedRouteNameFromRoute, createNavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList, DrawerItem } from '@react-navigation/drawer';
import { FontAwesome } from '@expo/vector-icons';
import { supabase } from '../services/supabaseClient';
import { Spacing, Rounding } from '../utils/theme';
import { notificationService } from '../services/notificationService';
import { useToast } from '../components/ToastContext';
import { useTheme } from '../components/ThemeContext';
import { NotificationProvider, useNotifications } from '../components/NotificationContext';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { userService } from '../services/userService';

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
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { EditProfileScreen } from '../screens/EditProfileScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { PublicProfileScreen } from '../screens/PublicProfileScreen';
import { RecurringTasksScreen } from '../screens/RecurringTasksScreen';

export const navigationRef = createNavigationContainerRef();

export function navigate(name, params) {
    if (navigationRef.isReady()) {
        navigationRef.navigate(name, params);
    }
}

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();
const RootStack = createNativeStackNavigator();

const commonStackOptions = {
    headerShown: false,
};

// Helper to format time
const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
};

// Notification Dropdown Component
const NotificationDropdown = ({ visible, onClose, navigation }) => {
    const { theme, shadows } = useTheme();
    const { notifications, markAsRead, markAllAsRead, loading } = useNotifications();
    const styles = useMemo(() => createStyles(theme, shadows), [theme, shadows]);

    const handleNotificationPress = (item) => {
        onClose();
        if (!item.is_read) {
            markAsRead(item.id);
        }

        // Navigation logic for dropdown
        switch (item.type) {
            case 'APPLICATION':
            case 'HIRED':
            case 'COMPLETED':
                if (item.related_id) {
                    navigation.navigate('MainDrawer', { 
                        screen: 'Main', 
                        params: {
                            screen: 'HomeTab', 
                            params: { 
                                screen: 'TaskDetail', 
                                params: { taskId: item.related_id } 
                            }
                        }
                    });
                }
                break;
            case 'MESSAGE':
                if (item.related_id) {
                    navigation.navigate('MainDrawer', { 
                        screen: 'Main', 
                        params: {
                            screen: 'MessagesTab', 
                            params: { 
                                screen: 'Chat', 
                                params: { conversationId: item.related_id } 
                            }
                        }
                    });
                }
                break;
            case 'RECURRING_APPROVAL':
            case 'RECURRING_INVITATION':
                navigation.navigate('Notifications', { notificationId: item.id });
                break;
            default:
                break;
        }
    };

    return (
        <Modal
            transparent={true}
            visible={visible}
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.modalOverlay}>
                    <TouchableWithoutFeedback>
                        <View style={styles.dropdownContainer}>
                            <View style={styles.dropdownHeader}>
                                <Text style={styles.dropdownTitle}>Notifications</Text>
                                <TouchableOpacity onPress={markAllAsRead}>
                                    <Text style={styles.clearAll}>Mark all read</Text>
                                </TouchableOpacity>
                            </View>
                            {loading ? (
                                <ActivityIndicator style={{ margin: 20 }} color={theme.primary} />
                            ) : (
                                <>
                                    <ScrollView style={styles.notificationList} showsVerticalScrollIndicator={false}>
                                        {notifications.length > 0 ? (
                                            notifications.slice(0, 5).map((item) => (
                                                <TouchableOpacity 
                                                    key={item.id} 
                                                    style={styles.notificationItem}
                                                    onPress={() => handleNotificationPress(item)}
                                                >
                                                    {!item.is_read && <View style={styles.notificationDot} />}
                                                    <View style={styles.notificationContent}>
                                                        <Text style={styles.notificationItemTitle}>{item.title}</Text>
                                                        <Text style={styles.notificationMessage} numberOfLines={2}>{item.message}</Text>
                                                        <Text style={styles.notificationTime}>{formatTime(item.created_at)}</Text>
                                                    </View>
                                                </TouchableOpacity>
                                            ))
                                        ) : (
                                            <View style={styles.emptyNotifs}>
                                                <Text style={styles.emptyNotifText}>No notifications yet</Text>
                                            </View>
                                        )}
                                    </ScrollView>
                                    <TouchableOpacity 
                                        style={styles.viewAllButton}
                                        onPress={() => {
                                            onClose();
                                            navigation.navigate('Notifications');
                                        }}
                                    >
                                        <Text style={styles.viewAllText}>View All Notifications</Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

// Custom Drawer Content
const CustomDrawerContent = (props) => {
    const { showToast } = useToast();
    const { theme, shadows } = useTheme();
    const styles = useMemo(() => createStyles(theme, shadows), [theme, shadows]);

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            showToast(error.message, 'error');
        } else {
            showToast('You have been logged out', 'info');
        }
    };

    return (
        <DrawerContentScrollView {...props} contentContainerStyle={{ flex: 1, backgroundColor: theme.surface }}>
            <View style={styles.drawerHeader}>
                <Image 
                    source={require('../../assets/images/TaskLogo.png')} 
                    style={styles.drawerLogo}
                    resizeMode="contain"
                />
                <Text style={styles.drawerTitle}>Task Agent</Text>
            </View>
            <View style={{ flex: 1 }}>
                <DrawerItemList {...props} />
            </View>
            <View style={styles.drawerFooter}>
                <DrawerItem
                    label="Logout"
                    icon={({ color, size }) => <FontAwesome name="sign-out" size={size} color={color} />}
                    onPress={handleLogout}
                    labelStyle={styles.logoutLabel}
                    activeTintColor={theme.error}
                    inactiveTintColor={theme.error}
                />
                <Text style={styles.versionText}>Task Agent v1.0.0</Text>
            </View>
        </DrawerContentScrollView>
    );
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
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen name="TaskHistory" component={TaskHistoryScreen} />
        <Stack.Screen name="TaskDetail" component={TaskDetailScreen} />
        <Stack.Screen name="RecurringTasks" component={RecurringTasksScreen} />
    </Stack.Navigator>
);

// Settings Stack (to allow navigating to EditProfile from Settings)
const SettingsStack = () => (
    <Stack.Navigator screenOptions={commonStackOptions}>
        <Stack.Screen name="SettingsMain" component={SettingsScreen} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen name="RecurringTasks" component={RecurringTasksScreen} />
    </Stack.Navigator>
);

// Main Tab Navigator
const MainTabs = () => {
    const { theme, shadows } = useTheme();
    const { unreadMessagesCount } = useNotifications();

    return (
        <Tab.Navigator 
            screenOptions={({ route }) => ({ 
                headerShown: false,
                tabBarActiveTintColor: theme.accent,
                tabBarInactiveTintColor: theme.textMuted,
                tabBarStyle: ((route) => {
                    const routeName = getFocusedRouteNameFromRoute(route) ?? route.name;
                    const isCreateFormOpen = route.name === 'CreateTab' && route.params?.isFormOpen;
                    
                    if (routeName === 'Chat' || isCreateFormOpen) {
                        return { display: 'none' };
                    }
                    return { 
                        backgroundColor: theme.surface,
                        borderTopWidth: 1,
                        borderTopColor: theme.border,
                        height: 85,
                        paddingBottom: Platform.OS === 'ios' ? 25 : 20,
                        paddingTop: 10,
                        ...shadows.subtle,
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                    };
                })(route),
                tabBarLabelStyle: { fontWeight: '700', fontSize: 12 },
                tabBarIcon: ({ color, size }) => {
                    let iconName;

                    if (route.name === 'HomeTab') iconName = 'home';
                    else if (route.name === 'TasksTab') iconName = 'search';
                    else if (route.name === 'CreateTab') iconName = 'plus-square';
                    else if (route.name === 'MessagesTab') iconName = 'envelope';

                    return <FontAwesome name={iconName} size={size} color={color} />;
                },
            })}
        >
            <Tab.Screen name="HomeTab" component={HomeStack} options={{ title: 'Home' }} />
            <Tab.Screen name="TasksTab" component={FeedStack} options={{ title: 'Jobs' }} />
            <Tab.Screen name="CreateTab" component={CreateTaskScreen} options={{ title: 'Post' }} />
            <Tab.Screen 
                name="MessagesTab" 
                component={MessagesStack} 
                options={{ 
                    title: 'Inbox',
                    unmountOnBlur: true,
                    tabBarBadge: unreadMessagesCount > 0 ? unreadMessagesCount : null,
                    tabBarBadgeStyle: {
                        backgroundColor: theme.accent,
                        color: theme.white,
                        fontSize: 10,
                        fontWeight: '800',
                    }
                }} 
                listeners={({ navigation }) => ({
                    tabPress: (e) => {
                        // Prevent default behavior to ensure we can force the stack reset
                        e.preventDefault();
                        // Navigate to the tab and explicitly to the list screen
                        navigation.navigate('MessagesTab', { screen: 'MessagesMain' });
                    },
                })}
            />
        </Tab.Navigator>
    );
};

// Main Drawer Navigator
const MainDrawer = () => {
    const navigation = useNavigation();
    const { theme, shadows } = useTheme();
    const [notifVisible, setNotifVisible] = useState(false);
    const { unreadCount } = useNotifications();
    
    const styles = useMemo(() => createStyles(theme, shadows), [theme, shadows]);

    return (
        <>
            <Drawer.Navigator
                drawerContent={(props) => <CustomDrawerContent {...props} />}
                screenOptions={({ route }) => {
                    const routeName = getFocusedRouteNameFromRoute(route);
                    return {
                        headerShown: true,
                        drawerType: 'front',
                        swipeEnabled: true,
                        swipeEdgeWidth: 100,
                        headerStyle: {
                            backgroundColor: theme.primary,
                            ...shadows.medium,
                            height: Platform.OS === 'ios' ? 100 : 80,
                        },
                        headerTintColor: theme.white,
                        headerTitleStyle: {
                            fontWeight: '800',
                            fontSize: 20,
                        },
                        headerTitle: () => (
                            <View style={styles.headerTitleContainer}>
                                <Image 
                                    source={require('../../assets/images/TaskLogo.png')} 
                                    style={styles.headerLogo}
                                    resizeMode="contain"
                                />
                            </View>
                        ),
                        headerRight: () => (
                            <TouchableOpacity 
                                style={styles.notifIcon} 
                                onPress={() => setNotifVisible(true)}
                            >
                                <FontAwesome name="bell" size={22} color={theme.white} />
                                {unreadCount > 0 && (
                                    <View style={styles.notifBadge}>
                                        <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        ),
                        drawerActiveTintColor: theme.accent,
                        drawerInactiveTintColor: theme.text,
                        drawerStyle: {
                            backgroundColor: theme.surface,
                        },
                        drawerLabelStyle: {
                            fontWeight: '700',
                            fontSize: 16,
                        },
                    };
                }}
            >
                <Drawer.Screen 
                    name="Main" 
                    component={MainTabs} 
                    options={{ 
                        title: 'Dashboard',
                        drawerIcon: ({ color, size }) => <FontAwesome name="dashboard" size={size} color={color} />
                    }} 
                />
                <Drawer.Screen 
                    name="Profile" 
                    component={ProfileStack} 
                    options={{ 
                        title: 'My Profile',
                        drawerIcon: ({ color, size }) => <FontAwesome name="user" size={size} color={color} />
                    }} 
                />
                <Drawer.Screen 
                    name="Settings" 
                    component={SettingsStack} 
                    options={{ 
                        title: 'Settings',
                        drawerIcon: ({ color, size }) => <FontAwesome name="cog" size={size} color={color} />
                    }} 
                />
                <Drawer.Screen 
                    name="History" 
                    component={TaskHistoryScreen} 
                    options={{ 
                        title: 'Task History',
                        drawerIcon: ({ color, size }) => <FontAwesome name="history" size={size} color={color} />
                    }} 
                />
            </Drawer.Navigator>
            <NotificationDropdown 
                visible={notifVisible} 
                onClose={() => setNotifVisible(false)} 
                navigation={navigation}
            />
        </>
    );
};

// Auth Stack
const AuthStack = () => (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
);

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

async function registerForPushNotificationsAsync() {
    let token;
    if (Platform.OS === 'web') return null;

    if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        if (finalStatus !== 'granted') {
            alert('Failed to get push token for push notification!');
            return;
        }
        
        // Use projectId from expo-constants
        const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
        token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    } else {
        // alert('Must use physical device for Push Notifications');
    }

    if (Platform.OS === 'android') {
        Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
        });
    }

    return token;
}

export const AppNavigator = () => {
    const [session, setSession] = useState(null);
    const notificationListener = useRef();
    const responseListener = useRef();

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session?.user) handlePushRegistration(session.user.id);
        });

        const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session?.user) handlePushRegistration(session.user.id);
        });

        // Set up notification listeners
        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
            console.log('Notification received:', notification);
        });

        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
            const { type, related_id } = response.notification.request.content.data;
            
            // Navigation Logic based on notification data
            if (type && related_id) {
                // Use the navigate helper to reach deep screens
                switch (type) {
                    case 'APPLICATION':
                    case 'HIRED':
                    case 'COMPLETED':
                        navigate('MainDrawer', {
                            screen: 'Main',
                            params: {
                                screen: 'HomeTab',
                                params: {
                                    screen: 'TaskDetail',
                                    params: { taskId: related_id }
                                }
                            }
                        });
                        break;
                    case 'MESSAGE':
                        navigate('MainDrawer', {
                            screen: 'Main',
                            params: {
                                screen: 'MessagesTab',
                                params: {
                                    screen: 'Chat',
                                    params: { conversationId: related_id }
                                }
                            }
                        });
                        break;
                    default:
                        break;
                }
            }
        });

        return () => {
            authListener?.subscription?.unsubscribe();
            notificationListener.current?.remove();
            responseListener.current?.remove();
        };
    }, []);

    const handlePushRegistration = async (userId) => {
        try {
            const token = await registerForPushNotificationsAsync();
            if (token) {
                await userService.updatePushToken(userId, token);
            }
        } catch (error) {
            console.error('Error registering for push:', error);
        }
    };

    return (
        <NotificationProvider>
            <NavigationContainer ref={navigationRef}>
                {session && session.user ? (
                    <RootStack.Navigator screenOptions={{ headerShown: false }}>
                        <RootStack.Screen name="MainDrawer" component={MainDrawer} />
                        <RootStack.Screen 
                            name="PublicProfile" 
                            component={PublicProfileScreen} 
                            options={{ presentation: 'fullScreenModal' }}
                        />
                        <RootStack.Screen name="Notifications" component={NotificationsScreen} />
                    </RootStack.Navigator>
                ) : (
                    <AuthStack />
                )}
            </NavigationContainer>
        </NotificationProvider>
    );
};

const createStyles = (theme, shadows) => StyleSheet.create({
    headerTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerLogo: {
        width: 30,
        height: 30,
    },
    notifIcon: {
        marginRight: Spacing.lg,
        padding: 5,
        position: 'relative',
    },
    notifBadge: {
        position: 'absolute',
        top: 2,
        right: 2,
        backgroundColor: theme.accent,
        borderRadius: 10,
        minWidth: 16,
        height: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: theme.primary,
        paddingHorizontal: 2,
    },
    badgeText: {
        color: theme.white,
        fontSize: 9,
        fontWeight: '900',
    },
    drawerNotifDot: {
        position: 'absolute',
        top: -2,
        right: -2,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: theme.accent,
        borderWidth: 1,
        borderColor: theme.surface,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'flex-start',
        alignItems: 'flex-end',
        paddingTop: Platform.OS === 'ios' ? 100 : 80,
        paddingRight: Spacing.md,
    },
    dropdownContainer: {
        width: 300,
        maxHeight: 450,
        backgroundColor: theme.surface,
        borderRadius: Rounding.standard,
        ...shadows.medium,
        borderWidth: 1,
        borderColor: theme.border,
        overflow: 'hidden',
    },
    dropdownHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
        backgroundColor: theme.background,
    },
    dropdownTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: theme.primary,
    },
    clearAll: {
        fontSize: 12,
        color: theme.accent,
        fontWeight: '700',
    },
    notificationList: {
        maxHeight: 340,
    },
    notificationItem: {
        flexDirection: 'row',
        padding: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
        alignItems: 'center',
    },
    notificationDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: theme.accent,
        marginRight: Spacing.sm,
    },
    notificationContent: {
        flex: 1,
    },
    notificationItemTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.text,
    },
    notificationMessage: {
        fontSize: 12,
        color: theme.textMuted,
        marginTop: 2,
    },
    notificationTime: {
        fontSize: 10,
        color: theme.textMuted,
        marginTop: 4,
        fontWeight: '600',
    },
    viewAllButton: {
        padding: Spacing.md,
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: theme.border,
        backgroundColor: theme.background,
    },
    viewAllText: {
        color: theme.primary,
        fontWeight: '700',
        fontSize: 14,
    },
    emptyNotifs: {
        padding: 40,
        alignItems: 'center',
    },
    emptyNotifText: {
        color: theme.textMuted,
        fontSize: 14,
    },
    drawerHeader: {
        padding: Spacing.xl,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    drawerLogo: {
        width: 80,
        height: 80,
        marginBottom: Spacing.sm,
    },
    drawerTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: theme.primary,
    },
    drawerFooter: {
        borderTopWidth: 1,
        borderTopColor: theme.border,
        paddingTop: Spacing.sm,
        paddingBottom: Spacing.xl,
    },
    logoutLabel: {
        fontWeight: '700',
        fontSize: 16,
    },
    versionText: {
        textAlign: 'center',
        color: theme.textMuted,
        fontSize: 12,
        marginTop: Spacing.sm,
    }
});
const styles = StyleSheet.create({}); // Placeholder for legacy styles if needed
