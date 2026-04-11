import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
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
import { interactionService } from '../services/interactionService';
import { useTaskFilters } from '../hooks/useTaskFilters';

export const TaskFeedScreen = ({ navigation }) => {
    const { theme, shadows } = useTheme();
    const { userLocation, calculateDistance, searchRadius, updateSearchRadius } = useLocation();
    const { session, savedTaskIds } = useAuth();
    const [allTasks, setAllTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    
    // Pagination State
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const offsetRef = useRef(0);
    const LIMIT = 10;
    
    // Search & Filter State from Custom Hook
    const {
        filters,
        setFilters,
        searchQuery,
        setSearchQuery,
        showSavedOnly,
        setShowSavedOnly,
        isFilterModalVisible,
        setIsFilterModalVisible,
        activeFilterCount,
        handleApplyFilters,
        clearFilters,
        removeCategory,
        clearPriceRange,
        resetAll
    } = useTaskFilters();

    const [searchInput, setSearchInput] = useState(searchQuery);
    const [isSearchFocused, setIsSearchFocused] = useState(false);

    const styles = useMemo(() => createStyles(theme, shadows), [theme, shadows]);

    // Sync searchInput when searchQuery changes from outside (e.g. clear filters)
    useEffect(() => {
        setSearchInput(searchQuery);
    }, [searchQuery]);

    // Debounce searchInput -> searchQuery
    useEffect(() => {
        const handler = setTimeout(() => {
            if (searchInput !== searchQuery) {
                setSearchQuery(searchInput);
            }
        }, 500);
        return () => clearTimeout(handler);
    }, [searchInput, setSearchQuery, searchQuery]);

    const filteredTasks = useMemo(() => {
        const result = allTasks.filter(task => {
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

        // Apply Sorting
        return result.sort((a, b) => {
            if (filters.sortBy === 'price') {
                return b.payment_amount - a.payment_amount;
            } else if (filters.sortBy === 'distance' && userLocation) {
                const distA = calculateDistance(userLocation.latitude, userLocation.longitude, a.location_lat, a.location_lng);
                const distB = calculateDistance(userLocation.latitude, userLocation.longitude, b.location_lat, b.location_lng);
                return distA - distB;
            } else {
                // Default: Newest
                const dateA = new Date(a.created_at?.includes('T') && !a.created_at.endsWith('Z') && !a.created_at.includes('+') ? `${a.created_at}Z` : a.created_at);
                const dateB = new Date(b.created_at?.includes('T') && !b.created_at.endsWith('Z') && !b.created_at.includes('+') ? `${b.created_at}Z` : b.created_at);
                return dateB - dateA;
            }
        });
    }, [allTasks, userLocation, searchRadius, calculateDistance, searchQuery, filters, showSavedOnly, savedTaskIds]);

    const fetchTasks = useCallback(async (isLoadMore = false) => {
        try {
            if (isLoadMore) {
                setLoadingMore(true);
            } else {
                offsetRef.current = 0;
            }

            let data;
            if (session?.user && filters.sortBy === 'relevance') {
                data = await taskService.getPersonalizedTasks(
                    session.user.id, 
                    userLocation?.latitude, 
                    userLocation?.longitude,
                    LIMIT,
                    offsetRef.current
                );
            } else {
                data = await taskService.getNearbyTasks(
                    session?.user?.id,
                    userLocation?.latitude,
                    userLocation?.longitude,
                    LIMIT,
                    offsetRef.current
                );
            }

            if (isLoadMore) {
                setAllTasks(prev => {
                    const newTasks = (data || []).filter(d => !prev.some(p => p.id === d.id));
                    return [...prev, ...newTasks];
                });
            } else {
                setAllTasks(data || []);
            }
            
            setHasMore((data || []).length === LIMIT);
            if ((data || []).length > 0) {
                offsetRef.current += LIMIT;
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
            setLoadingMore(false);
        }
    }, [session?.user, filters.sortBy, userLocation]);

    useEffect(() => {
        fetchTasks();

        // Subscribe to real-time task updates
        const subscription = taskService.subscribeToTasks('feed_tasks_channel', (payload) => {
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
    }, [userLocation, searchRadius, fetchTasks]);

    // Log search interactions (debounced)
    useEffect(() => {
        if (!searchQuery && filters.categories.length === 0) return;
        
        const timer = setTimeout(() => {
            let logCategory = filters.categories.length > 0 ? filters.categories[0] : 'All';
            
            // Basic keyword heuristic mapping for better market insights
            if (logCategory === 'All' && searchQuery) {
                const sq = searchQuery.toLowerCase();
                if (sq.includes('clean')) logCategory = 'Cleaning';
                else if (sq.includes('deliver') || sq.includes('courier')) logCategory = 'Delivery';
                else if (sq.includes('move')) logCategory = 'Moving';
                else if (sq.includes('tech') || sq.includes('computer') || sq.includes('it')) logCategory = 'Tech';
                else if (sq.includes('garden') || sq.includes('yard') || sq.includes('lawn')) logCategory = 'Gardening';
                else if (sq.includes('handy') || sq.includes('plumb') || sq.includes('build')) logCategory = 'Handyman';
                else if (sq.includes('pet') || sq.includes('dog') || sq.includes('cat')) logCategory = 'Pets';
            }

            interactionService.logSearch(session?.user?.id, logCategory, searchQuery, filteredTasks.length);
        }, 1500); // 1.5s debounce

        return () => clearTimeout(timer);
    }, [searchQuery, filters.categories, filteredTasks.length, session?.user?.id]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchTasks(false);
    };

    const loadMoreTasks = () => {
        if (!hasMore || loadingMore || loading) return;
        fetchTasks(true);
    };

    const renderEmptyState = () => {
        const hasActiveFilters = activeFilterCount > 0 || searchQuery || showSavedOnly;
        const isRadiusTight = searchRadius < 100;

        if (hasActiveFilters) {
            return (
                <EmptyState 
                    icon="search" 
                    title="No matching tasks" 
                    subtitle="Try adjusting your filters or search keywords to see more results." 
                    buttonText="Clear All Filters"
                    onPress={() => {
                        clearFilters();
                        setSearchQuery('');
                        setShowSavedOnly(false);
                    }}
                />
            );
        }

        if (isRadiusTight) {
            return (
                <EmptyState 
                    icon="map-marker" 
                    title="Quiet neighbourhood?" 
                    subtitle={`We couldn't find any tasks within ${searchRadius}km of you.`}
                    buttonText="Widen Radius to 100km"
                    onPress={() => updateSearchRadius(100)}
                    secondaryButtonText="Refresh"
                    onSecondaryPress={onRefresh}
                />
            );
        }

        return (
            <EmptyState 
                icon="calendar-check-o" 
                title="All caught up!" 
                subtitle="There are no open tasks in your area right now. Why not post one yourself?"
                buttonText="Post a Task"
                onPress={() => navigation.navigate('CreateTask')}
                secondaryButtonText="Refresh Feed"
                onSecondaryPress={onRefresh}
            />
        );
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
                    <View style={[
                        styles.searchContainer, 
                        shadows.subtle,
                        isSearchFocused && styles.searchContainerFocused
                    ]}>
                        <FontAwesome name="search" size={16} color={isSearchFocused ? theme.accent : theme.textMuted} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search tasks..."
                            placeholderTextColor={theme.textMuted}
                            value={searchInput}
                            onChangeText={setSearchInput}
                            onFocus={() => setIsSearchFocused(true)}
                            onBlur={() => setIsSearchFocused(false)}
                        />
                        {searchInput.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchInput('')}>
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
                                <TouchableOpacity onPress={() => removeCategory(cat)}>
                                    <FontAwesome name="times" size={10} color={theme.primary} style={{ marginLeft: 6 }} />
                                </TouchableOpacity>
                            </View>
                        ))}
                        {(filters.minPrice || filters.maxPrice) && (
                            <View style={styles.chip}>
                                <Text style={styles.chipText}>
                                    Price: {filters.minPrice ? `$${filters.minPrice}` : '$0'} - {filters.maxPrice ? `$${filters.maxPrice}` : 'Any'}
                                </Text>
                                <TouchableOpacity onPress={clearPriceRange}>
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
                    ListEmptyComponent={renderEmptyState}
                    onEndReached={loadMoreTasks}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={() => 
                        loadingMore ? (
                            <View style={{ paddingVertical: 20 }}>
                                <ActivityIndicator size="small" color={theme.accent} />
                            </View>
                        ) : null
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
        borderWidth: 2,
        borderColor: 'transparent',
    },
    searchContainerFocused: {
        borderColor: theme.accent,
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 15,
        color: '#333',
        outlineStyle: 'none',
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
