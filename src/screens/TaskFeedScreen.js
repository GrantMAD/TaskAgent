import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { taskService } from '../services/taskService';
import { supabase } from '../services/supabaseClient';
import { TaskCard } from '../components/TaskCard';
import { TaskCardSkeleton } from '../components/skeletons/SkeletonPlaceholders';
import { Spacing, Rounding } from '../utils/theme';
import { useTheme } from '../components/ThemeContext';
import { EmptyState } from '../components/EmptyState';
import { useLocation } from '../components/LocationContext';
import { useAuth } from '../components/AuthContext';
import { FontAwesome } from '@expo/vector-icons';
import { FilterModal } from '../components/FilterModal';
import { TASK_CATEGORIES } from '../utils/constants';

export const TaskFeedScreen = ({ navigation }) => {
    const { theme, shadows } = useTheme();
    const { userLocation, calculateDistance, searchRadius } = useLocation();
    const { savedTaskIds } = useAuth();
    const [allTasks, setAllTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    
    // Search & Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [showSavedOnly, setShowSavedOnly] = useState(false);
    const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
    const [filters, setFilters] = useState({
        categories: [],
        minPrice: '',
        maxPrice: '',
    });

    const styles = useMemo(() => createStyles(theme, shadows), [theme, shadows]);

    const filteredTasks = useMemo(() => {
        return allTasks.filter(task => {
            // 0. Show Saved Only Filter
            if (showSavedOnly && !savedTaskIds.includes(task.id)) return false;

            // 1. Distance Filter
            if (userLocation && task.location_lat && task.location_lng) {
                const distance = calculateDistance(
                    userLocation.latitude,
                    userLocation.longitude,
                    task.location_lat,
                    task.location_lng
                );
                if (distance > searchRadius) return false;
            }

            // 2. Keyword Search
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const inTitle = task.title.toLowerCase().includes(query);
                const inDesc = task.description?.toLowerCase().includes(query);
                const inCat = task.category?.toLowerCase().includes(query);
                if (!inTitle && !inDesc && !inCat) return false;
            }

            // 3. Category Filter
            if (filters.categories.length > 0) {
                if (!filters.categories.includes(task.category)) return false;
            }

            // 4. Price Filter
            if (filters.minPrice && task.payment_amount < parseFloat(filters.minPrice)) return false;
            if (filters.maxPrice && task.payment_amount > parseFloat(filters.maxPrice)) return false;

            return true;
        });
    }, [allTasks, userLocation, searchRadius, calculateDistance, searchQuery, filters, showSavedOnly, savedTaskIds]);

    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (filters.categories.length > 0) count += 1;
        if (filters.minPrice || filters.maxPrice) count += 1;
        return count;
    }, [filters]);

    useEffect(() => {
        fetchTasks();

        // Subscribe to real-time task updates
        const subscription = taskService.subscribeToTasks((payload) => {
            // Check if it's a new task or a status change that might affect the feed
            // (e.g., a task becomes OPEN or is no longer OPEN)
            if (
                payload.eventType === 'INSERT' || 
                payload.eventType === 'UPDATE' || 
                payload.eventType === 'DELETE'
            ) {
                fetchTasks();
            }
        });

        return () => {
            supabase.removeChannel(subscription);
        };
    }, []);

    const fetchTasks = async () => {
        try {
            const data = await taskService.getNearbyTasks();
            setAllTasks(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchTasks();
    };

    const handleApplyFilters = (newFilters) => {
        setFilters(newFilters);
        setIsFilterModalVisible(false);
    };

    const clearFilters = () => {
        setFilters({ categories: [], minPrice: '', maxPrice: '' });
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[theme.primary, theme.secondary || '#1E40AF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <View style={styles.headerTop}>
                    <View style={styles.headerInfo}>
                        <FontAwesome name="map-marker" size={24} color={theme.white} style={styles.headerIcon} />
                        <View>
                            <Text style={styles.headerTitle}>Local Jobs</Text>
                            <Text style={styles.headerSubtitle}>Find opportunities in your area</Text>
                        </View>
                    </View>
                    <View style={styles.radiusBadge}>
                        <Text style={styles.radiusBadgeText}>{searchRadius > 1000 ? 'All' : `${searchRadius}km`}</Text>
                    </View>
                </View>
                
                {/* Search & Filter Bar */}
                <View style={styles.searchRow}>
                    <View style={[styles.searchContainer, shadows.subtle]}>
                        <FontAwesome name="search" size={16} color={theme.textMuted} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search tasks..."
                            placeholderTextColor={theme.textMuted}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <FontAwesome name="times-circle" size={16} color={theme.textMuted} />
                            </TouchableOpacity>
                        )}
                    </View>
                    <TouchableOpacity 
                        style={[styles.filterButton, activeFilterCount > 0 && styles.filterButtonActive]}
                        onPress={() => setIsFilterModalVisible(true)}
                    >
                        <FontAwesome name="sliders" size={18} color={activeFilterCount > 0 ? theme.white : theme.primary} />
                        {activeFilterCount > 0 && (
                            <View style={styles.filterBadge}>
                                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.filterButton, showSavedOnly && { backgroundColor: theme.isDarkMode ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2' }]}
                        onPress={() => setShowSavedOnly(!showSavedOnly)}
                    >
                        <FontAwesome 
                            name={showSavedOnly ? "heart" : "heart-o"} 
                            size={18} 
                            color={showSavedOnly ? theme.error : theme.primary} 
                        />
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            {/* Active Filter Chips */}
            {activeFilterCount > 0 && (
                <View style={styles.chipsContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
                        {filters.categories.map(cat => (
                            <View key={cat} style={styles.chip}>
                                <Text style={styles.chipText}>{cat}</Text>
                                <TouchableOpacity onPress={() => setFilters(f => ({ ...f, categories: f.categories.filter(c => c !== cat) }))}>
                                    <FontAwesome name="times" size={10} color={theme.primary} style={{ marginLeft: 6 }} />
                                </TouchableOpacity>
                            </View>
                        ))}
                        {(filters.minPrice || filters.maxPrice) && (
                            <View style={styles.chip}>
                                <Text style={styles.chipText}>
                                    Price: {filters.minPrice ? `$${filters.minPrice}` : '$0'} - {filters.maxPrice ? `$${filters.maxPrice}` : 'Any'}
                                </Text>
                                <TouchableOpacity onPress={() => setFilters(f => ({ ...f, minPrice: '', maxPrice: '' }))}>
                                    <FontAwesome name="times" size={10} color={theme.primary} style={{ marginLeft: 6 }} />
                                </TouchableOpacity>
                            </View>
                        )}
                        <TouchableOpacity onPress={clearFilters} style={styles.clearAllChip}>
                            <Text style={styles.clearAllText}>Clear All</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            )}

            {loading ? (
                <View style={styles.listContent}>
                    {[1, 2, 3, 4, 5].map((i) => (
                        <TaskCardSkeleton key={i} />
                    ))}
                </View>
            ) : (
                <FlatList
                    data={filteredTasks}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    initialNumToRender={10}
                    maxToRenderPerBatch={10}
                    windowSize={5}
                    removeClippedSubviews={true}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />
                    }
                    renderItem={({ item }) => (
                        <TaskCard
                            task={item}
                            onPress={() => navigation.navigate('TaskDetail', { taskId: item.id })}
                        />
                    )}
                    ListEmptyComponent={
                        <EmptyState 
                            icon="search" 
                            title="No tasks found" 
                            subtitle={
                                (activeFilterCount > 0 || searchQuery) 
                                    ? "Try adjusting your search or filters to see more results." 
                                    : "There are no tasks available in your area right now."
                            }
                            buttonText={(activeFilterCount > 0 || searchQuery) ? "Clear Filters" : "Refresh"}
                            onPress={() => {
                                if (activeFilterCount > 0 || searchQuery) {
                                    clearFilters();
                                    setSearchQuery('');
                                } else {
                                    onRefresh();
                                }
                            }}
                        />
                    }
                />
            )}

            <FilterModal
                visible={isFilterModalVisible}
                onClose={() => setIsFilterModalVisible(false)}
                filters={filters}
                onApply={handleApplyFilters}
                onClear={clearFilters}
            />
        </View>
    );
};

const createStyles = (theme, shadows) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.background,
    },
    header: {
        paddingTop: Spacing.lg,
        paddingBottom: Spacing.md,
        paddingHorizontal: Spacing.lg,
        borderBottomLeftRadius: Rounding.soft,
        borderBottomRightRadius: Rounding.soft,
        ...shadows.medium,
        zIndex: 10,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: theme.white,
    },
    headerSubtitle: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.7)',
        fontWeight: '600',
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    headerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerIcon: {
        marginRight: 12,
    },
    radiusBadge: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: Rounding.pill,
    },
    radiusBadgeText: {
        color: theme.white,
        fontSize: 12,
        fontWeight: '800',
    },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.white,
        borderRadius: Rounding.standard,
        paddingHorizontal: 12,
        height: 45,
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 15,
        color: '#333',
    },
    filterButton: {
        width: 45,
        height: 45,
        backgroundColor: theme.white,
        borderRadius: Rounding.standard,
        marginLeft: 10,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    filterButtonActive: {
        backgroundColor: theme.accent,
    },
    filterBadge: {
        position: 'absolute',
        top: -5,
        right: -5,
        backgroundColor: theme.error,
        width: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: theme.white,
    },
    filterBadgeText: {
        color: theme.white,
        fontSize: 10,
        fontWeight: '900',
    },
    chipsContainer: {
        paddingVertical: Spacing.sm,
        backgroundColor: theme.background,
    },
    chipsScroll: {
        paddingHorizontal: Spacing.md,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.isDarkMode ? 'rgba(255,255,255,0.1)' : '#E8EFF4',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: Rounding.pill,
        marginRight: 8,
        borderWidth: 1,
        borderColor: theme.border,
    },
    chipText: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.primary,
    },
    clearAllChip: {
        paddingVertical: 6,
        paddingHorizontal: 8,
        justifyContent: 'center',
    },
    clearAllText: {
        fontSize: 12,
        color: theme.accent,
        fontWeight: '700',
    },
    listContent: {
        paddingVertical: Spacing.sm,
        paddingBottom: 100,
    }
});
