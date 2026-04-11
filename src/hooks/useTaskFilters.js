import { useState, useMemo, useCallback } from 'react';

export const useTaskFilters = (initialFilters = {}) => {
    const defaultFilters = {
        categories: [],
        minPrice: '',
        maxPrice: '',
        sortBy: 'newest',
        ...initialFilters
    };

    const [filters, setFilters] = useState(defaultFilters);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSavedOnly, setShowSavedOnly] = useState(false);
    const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);

    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (filters.categories.length > 0) count += 1;
        if (filters.minPrice || filters.maxPrice) count += 1;
        return count;
    }, [filters]);

    const handleApplyFilters = useCallback((newFilters) => {
        setFilters(newFilters);
        setIsFilterModalVisible(false);
    }, []);

    const clearFilters = useCallback(() => {
        setFilters({ categories: [], minPrice: '', maxPrice: '', sortBy: 'newest' });
    }, []);

    const removeCategory = useCallback((cat) => {
        setFilters(f => ({ 
            ...f, 
            categories: f.categories.filter(c => c !== cat) 
        }));
    }, []);

    const clearPriceRange = useCallback(() => {
        setFilters(f => ({ ...f, minPrice: '', maxPrice: '' }));
    }, []);

    const toggleFilterModal = useCallback(() => {
        setIsFilterModalVisible(prev => !prev);
    }, []);

    const resetAll = useCallback(() => {
        clearFilters();
        setSearchQuery('');
        setShowSavedOnly(false);
    }, [clearFilters]);

    return {
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
        toggleFilterModal,
        resetAll
    };
};
