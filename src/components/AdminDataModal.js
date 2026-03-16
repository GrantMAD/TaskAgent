import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, FlatList, ActivityIndicator, Image, TextInput, ScrollView } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useTheme } from './ThemeContext';
import { EmptyState } from './EmptyState';
import { Spacing, Rounding, Shadow } from '../utils/theme';
import { useAuth } from './AuthContext';
import { useNavigation } from '@react-navigation/native';
import { messageService } from '../services/messageService';
import { adminService } from '../services/adminService';
import { UserAvatar } from './UserAvatar';
import { CURRENCY_SYMBOL } from '../utils/constants';

export const AdminDataModal = ({ visible, onClose, type, onAction }) => {
    const { theme, shadows } = useTheme();
    const { userProfile } = useAuth();
    const navigation = useNavigation();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('all'); // 'all', 'user', 'admin'
    const [selectedTask, setSelectedTask] = useState(null);
    const [resolvingReport, setResolvingReport] = useState(null); // { id, resolutionText }
    const [selectedUser, setSelectedUser] = useState(null);
    const [userStats, setUserStats] = useState(null);
    const [suspendingUser, setSuspendingUser] = useState(null); // { id, reason }

    useEffect(() => {
        if (visible && type) {
            setSearchQuery('');
            setRoleFilter('all');
            setSelectedTask(null);
            setResolvingReport(null);
            setSelectedUser(null);
            setUserStats(null);
            fetchData();
        }
    }, [visible, type]);

    const fetchData = async () => {
        try {
            setLoading(true);
            let result = [];
            if (type === 'users') {
                result = await adminService.getAllUsers();
            } else if (type === 'tasks') {
                result = await adminService.getAllTasks();
            } else if (type === 'reports') {
                result = await adminService.getReports(false); // Fetch all reports
            }
            setData(result);
        } catch (error) {
            console.error(`Error fetching ${type}:`, error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUserStats = async (userId) => {
        try {
            const stats = await adminService.getUserStats(userId);
            setUserStats(stats);
        } catch (error) {
            console.error('Error fetching user stats:', error);
            setUserStats(null);
        }
    };

    const handleUserPress = (user) => {
        setSelectedUser(user);
        fetchUserStats(user.id);
    };

    const handleSuspendUser = async (userId, suspend, reason = '') => {
        const success = await onAction(userId, suspend ? 'suspend' : 'reactivate', reason);
        if (success) {
            setSuspendingUser(null);
            setSelectedUser(null); // Close user detail after action
            fetchData(); // Refresh user list
        }
    };

    const handleMessageUser = async () => {
        if (!selectedUser || !userProfile) return;
        
        try {
            // Check for or create a conversation between admin and this user
            const convo = await messageService.getOrCreateConversation(null, userProfile.id, selectedUser.id);
            
            if (convo) {
                onClose();
                // Deep navigation to reach Chat screen through the MessagesTab
                navigation.navigate('MainDrawer', {
                    screen: 'Main',
                    params: {
                        screen: 'MessagesTab',
                        params: {
                            screen: 'Chat',
                            params: { conversationId: convo.id }
                        }
                    }
                });
            }
        } catch (error) {
            console.error('Error initiating chat from admin:', error);
        }
    };

    const renderItem = ({ item }) => {
        if (type === 'users') {
            return (
                <TouchableOpacity 
                    style={[styles.userCard, { backgroundColor: theme.card, borderColor: theme.border }, item.is_suspended && { borderLeftColor: theme.error, borderLeftWidth: 4 }]}
                    onPress={() => handleUserPress(item)}
                >
                    <UserAvatar user={item} size={40} />
                    <View style={styles.userInfo}>
                        <View style={styles.userHeader}>
                            <Text style={[styles.userName, { color: theme.text }]}>{item.name}</Text>
                            {item.is_suspended && (
                                <View style={[styles.suspendedBadge, { backgroundColor: theme.error + '20' }]}>
                                    <Text style={[styles.suspendedBadgeText, { color: theme.error }]}>SUSPENDED</Text>
                                </View>
                            )}
                        </View>
                        <Text style={[styles.userEmail, { color: theme.textMuted }]}>{item.email}</Text>
                        <View style={styles.userRoleTag}>
                            <Text style={[styles.roleText, { color: item.role === 'admin' ? theme.accent : theme.primary }]}>
                                {item.role?.toUpperCase() || 'USER'}
                            </Text>
                        </View>
                    </View>
                    <FontAwesome name="chevron-right" size={14} color={theme.textMuted} />
                </TouchableOpacity>
            );
        }

        if (type === 'tasks') {
            return (
                <TouchableOpacity 
                    style={[styles.itemCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                    onPress={() => setSelectedTask(item)}
                    activeOpacity={0.7}
                >
                    <View style={[styles.statusIcon, { backgroundColor: theme.primary + '20' }]}>
                        <FontAwesome name="tasks" size={18} color={theme.primary} />
                    </View>
                    <View style={styles.itemInfo}>
                        <Text style={[styles.itemName, { color: theme.text }]} numberOfLines={1}>{item.title}</Text>
                        <Text style={[styles.itemSub, { color: theme.textMuted }]}>By: {item.poster?.name}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: theme.accent + '20' }]}>
                            <Text style={[styles.statusText, { color: theme.accent }]}>{item.status?.toUpperCase()}</Text>
                        </View>
                    </View>
                    <FontAwesome name="chevron-right" size={14} color={theme.border} />
                </TouchableOpacity>
            );
        }

        if (type === 'reports') {
            const isPending = item.status === 'PENDING';
            return (
                <View style={[
                    styles.reportCard, 
                    { backgroundColor: theme.card, borderColor: theme.border, ...shadows.subtle },
                    isPending && { borderLeftColor: theme.error, borderLeftWidth: 4 }
                ]}>
                    <View style={styles.reportHeader}>
                        <View style={[styles.statusBadge, { backgroundColor: isPending ? theme.error + '15' : theme.success + '15', marginTop: 0 }]}>
                            <FontAwesome 
                                name={isPending ? "exclamation-circle" : "check-circle"} 
                                size={12} 
                                color={isPending ? theme.error : theme.success} 
                                style={{ marginRight: 5 }} 
                            />
                            <Text style={[styles.statusText, { color: isPending ? theme.error : theme.success }]}>
                                {item.status}
                            </Text>
                        </View>
                        <Text style={[styles.itemSub, { color: theme.textMuted }]}>
                            {new Date(item.created_at).toLocaleDateString()}
                        </Text>
                    </View>

                    <View style={styles.reportSubjectSection}>
                        <Text style={[styles.reasonTitle, { color: theme.text }]}>
                            {item.reason?.toUpperCase()}
                        </Text>
                    </View>

                    <View style={styles.involvedSection}>
                        <View style={styles.involvedItem}>
                            <FontAwesome name="user" size={12} color={theme.textMuted} style={{ marginRight: 6 }} />
                            <Text style={[styles.involvedLabel, { color: theme.textMuted }]}>Reporter: </Text>
                            <Text style={[styles.involvedValue, { color: theme.text }]}>{item.reporter?.name}</Text>
                        </View>
                        {item.reported_user && (
                            <View style={styles.involvedItem}>
                                <FontAwesome name="bullseye" size={12} color={theme.textMuted} style={{ marginRight: 6 }} />
                                <Text style={[styles.involvedLabel, { color: theme.textMuted }]}>Subject: </Text>
                                <Text style={[styles.involvedValue, { color: theme.text }]}>{item.reported_user.name}</Text>
                            </View>
                        )}
                    </View>
                    
                    {item.details && (
                        <View style={[styles.reportDetailsContainer, { backgroundColor: theme.background }]}>
                            <Text style={[styles.reportDetailsText, { color: theme.text }]}>
                                {item.details}
                            </Text>
                        </View>
                    )}
                    
                    {isPending && (
                        <>
                            {resolvingReport?.id === item.id ? (
                                <View style={styles.resolutionInputContainer}>
                                    <View style={[styles.inputBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
                                        <TextInput
                                            style={[styles.resolutionInput, { color: theme.text }]}
                                            placeholder="Enter resolution notes for the neighbor..."
                                            placeholderTextColor={theme.textMuted}
                                            multiline
                                            value={resolvingReport.resolutionText}
                                            onChangeText={(text) => setResolvingReport(prev => ({ ...prev, resolutionText: text }))}
                                        />
                                    </View>
                                    <View style={styles.resolutionActions}>
                                        <TouchableOpacity 
                                            style={[styles.cancelButton, { borderColor: theme.border }]}
                                            onPress={() => setResolvingReport(null)}
                                        >
                                            <Text style={[styles.cancelButtonText, { color: theme.textMuted }]}>Cancel</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity 
                                            style={[styles.submitButton, { backgroundColor: theme.success }]}
                                            onPress={async () => {
                                                const success = await onAction(item.id, 'resolve', resolvingReport.resolutionText);
                                                if (success) {
                                                    setResolvingReport(null);
                                                    fetchData();
                                                }
                                            }}
                                        >
                                            <Text style={styles.submitButtonText}>Submit & Resolve</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ) : (
                                <TouchableOpacity 
                                    style={[styles.resolveButton, { backgroundColor: theme.primary }]}
                                    onPress={() => setResolvingReport({ id: item.id, resolutionText: '' })}
                                    activeOpacity={0.8}
                                >
                                    <FontAwesome name="check" size={12} color="#fff" style={{ marginRight: 8 }} />
                                    <Text style={styles.resolveButtonText}>Mark as Resolved</Text>
                                </TouchableOpacity>
                            )}
                        </>
                    )}
                </View>
            );
        }
        return null;
    };

    const filteredData = data.filter(item => {
        // Search Filter
        const matchesSearch = !searchQuery || (
            item.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
            item.email?.toLowerCase().includes(searchQuery.toLowerCase())
        );

        // Role Filter
        const matchesRole = roleFilter === 'all' || 
            (roleFilter === 'admin' ? item.role === 'admin' : item.role !== 'admin');

        if (type === 'users') {
            return matchesSearch && matchesRole;
        }
        return true;
    });

    const getTitle = () => {
        if (selectedTask) return 'Job Details';
        if (selectedUser) return 'User Profile';
        if (type === 'users') return 'All Users';
        if (type === 'tasks') return 'Active Tasks';
        if (type === 'reports') return 'All Reports';
        return 'Details';
    };

    const getDescription = () => {
        if (selectedTask) return 'Examine task specifics, poster details, and location for administrative oversight.';
        if (selectedUser) return 'View detailed information and manage account status for this user.';
        if (type === 'users') return 'Manage user accounts. You can search by name/email and filter by account role.';
        if (type === 'tasks') return 'Monitor all active neighborhood postings. Tap a task to view full details.';
        if (type === 'reports') return 'Review and resolve flags submitted by users regarding tasks or user behavior.';
        return '';
    };

    const renderTaskDetail = () => {
        if (!selectedTask) return null;
        return (
            <FlatList 
                data={[selectedTask]}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                renderItem={() => (
                    <View style={styles.detailCard}>
                        <View style={styles.detailRow}>
                            <Text style={[styles.label, { color: theme.textMuted }]}>BUDGET</Text>
                            <Text style={[styles.detailValue, { color: theme.accent }]}>{CURRENCY_SYMBOL}{selectedTask.payment_amount}</Text>
                        </View>

                        <View style={styles.detailRow}>
                            <View style={styles.detailRow}>
                                <Text style={[styles.label, { color: theme.textMuted }]}>BUDGET</Text>
                                <Text style={[styles.detailValue, { color: theme.accent }]}>{CURRENCY_SYMBOL}{selectedTask.payment_amount}</Text>
                            </View>
                            <View style={styles.detailHalf}>
                                <Text style={[styles.label, { color: theme.textMuted }]}>STATUS</Text>
                                <View style={[styles.statusBadge, { backgroundColor: theme.primary + '20', marginTop: 4 }]}>
                                    <Text style={[styles.statusText, { color: theme.primary }]}>{selectedTask.status}</Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.detailSection}>
                            <Text style={[styles.label, { color: theme.textMuted }]}>POSTED BY</Text>
                            <View style={styles.posterInfoDetail}>
                                <UserAvatar user={selectedTask.poster} size={30} />
                                <Text style={[styles.detailValue, { color: theme.text, marginLeft: 10 }]}>{selectedTask.poster?.name}</Text>
                            </View>
                        </View>

                        <View style={styles.detailSection}>
                            <Text style={[styles.label, { color: theme.textMuted }]}>DESCRIPTION</Text>
                            <Text style={[styles.detailTextLarge, { color: theme.text }]}>{selectedTask.description}</Text>
                        </View>

                        <View style={styles.detailSection}>
                            <Text style={[styles.label, { color: theme.textMuted }]}>LOCATION</Text>
                            <View style={styles.locationInfo}>
                                <FontAwesome name="map-marker" size={16} color={theme.accent} style={{ marginRight: 8 }} />
                                <Text style={[styles.detailValueSmall, { color: theme.text }]}>
                                    {selectedTask.address || `${selectedTask.location_lat}, ${selectedTask.location_lng}`}
                                </Text>
                            </View>
                        </View>
                        
                        <View style={styles.detailSection}>
                            <Text style={[styles.label, { color: theme.textMuted }]}>POSTED ON</Text>
                            <Text style={[styles.detailValueSmall, { color: theme.text }]}>
                                {new Date(selectedTask.created_at).toLocaleString()}
                            </Text>
                        </View>
                    </View>
                )}
            />
        );
    };

    const renderUserDetail = () => {
        if (!selectedUser) return null;

        return (
            <View style={[styles.detailContainer, { backgroundColor: theme.background }]}>
                <View style={[styles.detailHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
                    <TouchableOpacity onPress={() => setSelectedUser(null)} style={styles.backButton}>
                        <FontAwesome name="chevron-left" size={20} color={theme.text} />
                    </TouchableOpacity>
                    <Text style={[styles.detailTitle, { color: theme.text }]}>User Profile</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView contentContainerStyle={styles.detailScroll}>
                    <View style={[styles.profileSection, { backgroundColor: theme.card, borderColor: theme.border }]}>
                        <UserAvatar user={selectedUser} size={80} />
                        <Text style={[styles.profileName, { color: theme.text }]}>{selectedUser.name}</Text>
                        <Text style={[styles.profileEmail, { color: theme.textMuted }]}>{selectedUser.email}</Text>
                        
                        <View style={styles.statsGrid}>
                            <View style={[styles.statBox, { borderRightColor: theme.border }]}>
                                <Text style={[styles.statValue, { color: theme.primary }]}>{userStats?.createdTasks ?? '...'}</Text>
                                <Text style={[styles.statLabel, { color: theme.textMuted }]}>Tasks Created</Text>
                            </View>
                            <View style={styles.statBox}>
                                <Text style={[styles.statValue, { color: theme.success }]}>{userStats?.completedTasks ?? '...'}</Text>
                                <Text style={[styles.statLabel, { color: theme.textMuted }]}>Tasks Completed</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.actionSection}>
                        <Text style={[styles.sectionHeading, { color: theme.textMuted }]}>Administrative Actions</Text>
                        
                        <TouchableOpacity 
                            style={[styles.actionButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
                            onPress={handleMessageUser}
                        >
                            <View style={[styles.actionIcon, { backgroundColor: theme.primary + '20' }]}>
                                <FontAwesome name="envelope" size={18} color={theme.primary} />
                            </View>
                            <Text style={[styles.actionText, { color: theme.text }]}>Message user</Text>
                        </TouchableOpacity>

                        {selectedUser.is_suspended ? (
                            <TouchableOpacity 
                                style={[styles.actionButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
                                onPress={() => handleSuspendUser(selectedUser.id, false)}
                            >
                                <View style={[styles.actionIcon, { backgroundColor: theme.success + '20' }]}>
                                    <FontAwesome name="unlock" size={18} color={theme.success} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.actionText, { color: theme.text }]}>Reactivate account</Text>
                                    <Text style={[styles.actionDesc, { color: theme.error }]}>Suspended for: {selectedUser.suspension_reason}</Text>
                                </View>
                            </TouchableOpacity>
                        ) : (
                            <>
                                {suspendingUser?.id === selectedUser.id ? (
                                    <View style={[styles.suspensionBox, { backgroundColor: theme.card, borderColor: theme.error }]}>
                                        <Text style={[styles.suspensionLabel, { color: theme.error }]}>Reason for suspension:</Text>
                                        <TextInput
                                            style={[styles.resolutionInput, { color: theme.text, backgroundColor: theme.background, minHeight: 60, padding: 10, borderRadius: 8, marginTop: 10 }]}
                                            placeholder="Why are you suspending this user?"
                                            placeholderTextColor={theme.textMuted}
                                            multiline
                                            value={suspendingUser.reason}
                                            onChangeText={(text) => setSuspendingUser(prev => ({ ...prev, reason: text }))}
                                        />
                                        <View style={styles.resolutionActions}>
                                            <TouchableOpacity 
                                                style={[styles.cancelButton, { borderColor: theme.border }]}
                                                onPress={() => setSuspendingUser(null)}
                                            >
                                                <Text style={[styles.cancelButtonText, { color: theme.textMuted }]}>Cancel</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity 
                                                style={[styles.submitButton, { backgroundColor: theme.error }]}
                                                onPress={() => handleSuspendUser(selectedUser.id, true, suspendingUser.reason)}
                                            >
                                                <Text style={styles.submitButtonText}>Confirm Suspension</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ) : (
                                    <TouchableOpacity 
                                        style={[styles.actionButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
                                        onPress={() => setSuspendingUser({ id: selectedUser.id, reason: '' })}
                                    >
                                        <View style={[styles.actionIcon, { backgroundColor: theme.error + '20' }]}>
                                            <FontAwesome name="ban" size={18} color={theme.error} />
                                        </View>
                                        <Text style={[styles.actionText, { color: theme.text }]}>Suspend user</Text>
                                    </TouchableOpacity>
                                )}
                            </>
                        )}
                    </View>
                </ScrollView>
            </View>
        );
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
                    <View style={[styles.header, { borderBottomColor: theme.border }]}>
                        <View style={styles.headerContent}>
                            {selectedTask && (
                                <TouchableOpacity onPress={() => setSelectedTask(null)} style={styles.backButton}>
                                    <FontAwesome name="chevron-left" size={18} color={theme.primary} />
                                </TouchableOpacity>
                            )}
                            {selectedUser && !selectedTask && ( // Only show back button for user detail if not also showing task detail
                                <TouchableOpacity onPress={() => setSelectedUser(null)} style={styles.backButton}>
                                    <FontAwesome name="chevron-left" size={18} color={theme.primary} />
                                </TouchableOpacity>
                            )}
                            <View style={styles.titleContainer}>
                                <Text style={[styles.title, { color: theme.primary }]} numberOfLines={1}>{getTitle()}</Text>
                                <Text style={[styles.description, { color: theme.textMuted }]} numberOfLines={2}>{getDescription()}</Text>
                            </View>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <FontAwesome name="times" size={20} color={theme.textMuted} />
                        </TouchableOpacity>
                    </View>

                    {selectedTask ? renderTaskDetail() : selectedUser ? renderUserDetail() : (
                        <>
                            {type === 'users' && (
                                <View style={[styles.searchContainer, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
                                    <View style={[styles.searchBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
                                        <FontAwesome name="search" size={16} color={theme.textMuted} style={{ marginRight: 10 }} />
                                        <TextInput
                                            style={[styles.searchInput, { color: theme.text }]}
                                            placeholder="Search users by name or email..."
                                            placeholderTextColor={theme.textMuted}
                                            value={searchQuery}
                                            onChangeText={setSearchQuery}
                                        />
                                        {searchQuery !== '' && (
                                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                                <FontAwesome name="times-circle" size={16} color={theme.textMuted} />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                    
                                    <View style={styles.filterRow}>
                                        {['all', 'user', 'admin'].map((role) => (
                                            <TouchableOpacity 
                                                key={role}
                                                style={[
                                                    styles.filterChip, 
                                                    { backgroundColor: roleFilter === role ? theme.primary : theme.card, borderColor: theme.border }
                                                ]}
                                                onPress={() => setRoleFilter(role)}
                                            >
                                                <Text style={[
                                                    styles.filterChipText, 
                                                    { color: roleFilter === role ? '#fff' : theme.textMuted }
                                                ]}>
                                                    {role === 'all' ? 'All' : role === 'admin' ? 'Admins' : 'Users'}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {loading ? (
                                <View style={styles.loadingContainer}>
                                    <ActivityIndicator size="large" color={theme.primary} />
                                </View>
                            ) : (
                                <FlatList
                                    data={filteredData}
                                    renderItem={renderItem}
                                    keyExtractor={item => item.id}
                                    contentContainerStyle={styles.listContent}
                                    ListEmptyComponent={
                                        <EmptyState 
                                            icon="database" 
                                            title="No data found" 
                                            subtitle={searchQuery ? "Try adjusting your search query." : "There are no records to display."} 
                                        />
                                    }
                                />
                            )}
                        </>
                    )}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        height: '80%',
        borderTopLeftRadius: Rounding.soft,
        borderTopRightRadius: Rounding.soft,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.lg,
        borderBottomWidth: 1,
    },
    title: {
        fontSize: 18,
        fontWeight: '800',
    },
    closeButton: {
        padding: 5,
        marginLeft: Spacing.sm,
    },
    headerContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    titleContainer: {
        flex: 1,
    },
    backButton: {
        marginRight: 15,
        padding: 5,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: Spacing.md,
    },
    itemCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.md,
        borderRadius: Rounding.standard,
        borderWidth: 1,
        marginBottom: Spacing.sm,
    },
    itemInfo: {
        flex: 1,
        marginLeft: Spacing.md,
    },
    itemName: {
        fontSize: 15,
        fontWeight: '700',
    },
    itemSub: {
        fontSize: 12,
        marginTop: 2,
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.md,
        borderRadius: Rounding.standard,
        borderWidth: 1,
        marginBottom: Spacing.sm,
    },
    userInfo: {
        flex: 1,
        marginLeft: Spacing.md,
    },
    userName: {
        fontSize: 16,
        fontWeight: '700',
    },
    userEmail: {
        fontSize: 13,
        marginTop: 2,
    },
    userRoleTag: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        backgroundColor: 'rgba(0,0,0,0.05)',
        marginTop: 6,
    },
    roleBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginTop: 4,
    },
    roleText: {
        fontSize: 9,
        fontWeight: '800',
    },
    statusBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginTop: 4,
    },
    statusText: {
        fontSize: 9,
        fontWeight: '800',
    },
    statusIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    reportHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        alignItems: 'center',
    },
    tag: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    tagText: {
        fontSize: 9,
        fontWeight: '800',
    },
    reportDetails: {
        fontSize: 13,
        fontStyle: 'italic',
        marginTop: 8,
    },
    actionButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '800',
    },
    reportCard: {
        padding: Spacing.md,
        borderRadius: Rounding.standard,
        borderWidth: 1,
        marginBottom: Spacing.md,
    },
    reportSubjectSection: {
        marginVertical: 10,
    },
    reasonTitle: {
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    involvedSection: {
        marginBottom: 10,
    },
    involvedItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    involvedLabel: {
        fontSize: 12,
        fontWeight: '600',
    },
    involvedValue: {
        fontSize: 12,
        fontWeight: '700',
    },
    reportDetailsContainer: {
        padding: Spacing.sm,
        borderRadius: Rounding.soft,
        marginTop: 5,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    reportDetailsText: {
        fontSize: 13,
        lineHeight: 18,
        fontStyle: 'italic',
    },
    resolveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 15,
        paddingVertical: 10,
        borderRadius: Rounding.soft,
    },
    resolveButtonText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '800',
    },
    searchContainer: {
        padding: Spacing.md,
        borderBottomWidth: 1,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: Rounding.pill,
        borderWidth: 1,
        marginBottom: Spacing.sm,
    },
    filterRow: {
        flexDirection: 'row',
        marginTop: 4,
    },
    filterChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: Rounding.pill,
        borderWidth: 1,
        marginRight: 8,
    },
    filterChipText: {
        fontSize: 12,
        fontWeight: '700',
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        paddingVertical: 5,
    },
    description: {
        fontSize: 11,
        marginTop: 2,
        fontWeight: '600',
    },
    detailCard: {
        borderRadius: Rounding.soft,
        padding: Spacing.md,
    },
    detailSection: {
        marginBottom: Spacing.lg,
    },
    label: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1,
        marginBottom: 4,
    },
    detailValue: {
        fontSize: 18,
        fontWeight: '800',
    },
    detailValueSmall: {
        fontSize: 14,
        fontWeight: '600',
    },
    detailTextLarge: {
        fontSize: 14,
        lineHeight: 20,
    },
    detailRow: {
        flexDirection: 'row',
        marginBottom: Spacing.lg,
    },
    detailHalf: {
        flex: 1,
    },
    posterInfoDetail: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    locationInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    resolutionInputContainer: {
        marginTop: 15,
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    inputBox: {
        borderRadius: Rounding.standard,
        borderWidth: 1,
        padding: Spacing.sm,
        minHeight: 80,
    },
    resolutionInput: {
        fontSize: 13,
        textAlignVertical: 'top',
        flex: 1,
    },
    resolutionActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 10,
    },
    cancelButton: {
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: Rounding.pill,
        borderWidth: 1,
        marginRight: 10,
    },
    cancelButtonText: {
        fontSize: 12,
        fontWeight: '700',
    },
    submitButton: {
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: Rounding.pill,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '800',
    },
    detailContainer: {
        flex: 1,
    },
    detailHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.md,
        justifyContent: 'space-between',
        borderBottomWidth: 1,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    detailTitle: {
        fontSize: 18,
        fontWeight: '800',
    },
    detailScroll: {
        padding: Spacing.md,
    },
    profileSection: {
        alignItems: 'center',
        padding: Spacing.xl,
        borderRadius: Rounding.soft,
        borderWidth: 1,
        marginBottom: Spacing.lg,
    },
    profileName: {
        fontSize: 22,
        fontWeight: '800',
        marginTop: Spacing.md,
    },
    profileEmail: {
        fontSize: 14,
        marginTop: 4,
    },
    statsGrid: {
        flexDirection: 'row',
        marginTop: Spacing.xl,
        width: '100%',
        paddingTop: Spacing.lg,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    statBox: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        borderRightWidth: 0,
    },
    statValue: {
        fontSize: 24,
        fontWeight: '900',
    },
    statLabel: {
        fontSize: 11,
        fontWeight: '600',
        marginTop: 4,
        textTransform: 'uppercase',
    },
    actionSection: {
        marginTop: Spacing.md,
    },
    sectionHeading: {
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: Spacing.md,
        marginLeft: 4,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.md,
        borderRadius: Rounding.standard,
        borderWidth: 1,
        marginBottom: Spacing.md,
    },
    actionIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.md,
    },
    actionText: {
        fontSize: 16,
        fontWeight: '700',
    },
    actionDesc: {
        fontSize: 12,
        marginTop: 2,
        fontWeight: '500',
    },
    suspensionBox: {
        padding: Spacing.lg,
        borderRadius: Rounding.standard,
        borderWidth: 1.5,
        marginBottom: Spacing.md,
    },
    suspensionLabel: {
        fontSize: 14,
        fontWeight: '800',
    },
    suspendedBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 8,
    },
    suspendedBadgeText: {
        fontSize: 10,
        fontWeight: '800',
    },
    userHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    }
});
