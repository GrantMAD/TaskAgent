import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { Spacing, Rounding } from '../utils/theme';
import { useTheme } from './ThemeContext';
import { FontAwesome } from '@expo/vector-icons';
import { TASK_CATEGORIES, CURRENCY_SYMBOL } from '../utils/constants';

export const FilterModal = ({ visible, onClose, filters, onApply, onClear }) => {
    const { theme, shadows } = useTheme();
    const styles = useMemo(() => createStyles(theme, shadows), [theme, shadows]);

    const [localFilters, setLocalFilters] = useState(filters);

    const sortOptions = [
        { label: 'Relevance (Smart)', value: 'relevance', icon: 'magic' },
        { label: 'Newest', value: 'newest', icon: 'clock-o' },
        { label: 'Highest Price', value: 'price', icon: 'money' },
        { label: 'Closest', value: 'distance', icon: 'map-marker' },
    ];

    const toggleCategory = (cat) => {
        setLocalFilters(prev => {
            const isSelected = prev.categories.includes(cat);
            if (isSelected) {
                return { ...prev, categories: prev.categories.filter(c => c !== cat) };
            } else {
                return { ...prev, categories: [...prev.categories, cat] };
            }
        });
    };

    const handlePriceChange = (field, value) => {
        setLocalFilters(prev => ({
            ...prev,
            [field]: value.replace(/[^0-9]/g, '')
        }));
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.headerButton}>
                        <FontAwesome name="times" size={20} color={theme.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Filter Tasks</Text>
                    <TouchableOpacity onPress={() => {
                        const cleared = { categories: [], minPrice: '', maxPrice: '', sortBy: 'newest' };
                        setLocalFilters(cleared);
                        onClear();
                    }} style={styles.headerButton}>
                        <Text style={styles.resetText}>Clear</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Sort By */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Sort By</Text>
                        <View style={styles.categoryGrid}>
                            {sortOptions.map((opt) => {
                                const isSelected = localFilters.sortBy === opt.value;
                                return (
                                    <TouchableOpacity
                                        key={opt.value}
                                        style={[
                                            styles.categoryChip,
                                            isSelected && { backgroundColor: theme.accent, borderColor: theme.accent }
                                        ]}
                                        onPress={() => setLocalFilters(prev => ({ ...prev, sortBy: opt.value }))}
                                    >
                                        <FontAwesome 
                                            name={opt.icon} 
                                            size={14} 
                                            color={isSelected ? theme.white : theme.accent} 
                                        />
                                        <Text style={[
                                            styles.categoryText,
                                            isSelected && { color: theme.white }
                                        ]}>
                                            {opt.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    {/* Categories */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Categories</Text>
                        <View style={styles.categoryGrid}>
                            {TASK_CATEGORIES.map((cat) => {
                                const isSelected = localFilters.categories.includes(cat.value);
                                return (
                                    <TouchableOpacity
                                        key={cat.value}
                                        style={[
                                            styles.categoryChip,
                                            isSelected && { backgroundColor: theme.primary, borderColor: theme.primary }
                                        ]}
                                        onPress={() => toggleCategory(cat.value)}
                                    >
                                        <FontAwesome 
                                            name={cat.icon} 
                                            size={14} 
                                            color={isSelected ? theme.white : theme.primary} 
                                        />
                                        <Text style={[
                                            styles.categoryText,
                                            isSelected && { color: theme.white }
                                        ]}>
                                            {cat.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    {/* Price Range */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Budget Range ({CURRENCY_SYMBOL})</Text>
                        <View style={styles.priceRow}>
                            <View style={styles.priceInputContainer}>
                                <Text style={styles.priceLabel}>Min</Text>
                                <TextInput
                                    style={styles.priceInput}
                                    placeholder="0"
                                    keyboardType="numeric"
                                    value={localFilters.minPrice}
                                    onChangeText={(val) => handlePriceChange('minPrice', val)}
                                    placeholderTextColor={theme.textMuted}
                                />
                            </View>
                            <View style={styles.priceDivider} />
                            <View style={styles.priceInputContainer}>
                                <Text style={styles.priceLabel}>Max</Text>
                                <TextInput
                                    style={styles.priceInput}
                                    placeholder="Any"
                                    keyboardType="numeric"
                                    value={localFilters.maxPrice}
                                    onChangeText={(val) => handlePriceChange('maxPrice', val)}
                                    placeholderTextColor={theme.textMuted}
                                />
                            </View>
                        </View>
                    </View>

                    {/* Distance Placeholder (Note: searchRadius is managed globally in LocationContext usually, 
                        but we can add a local override or just label it) */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Search Radius</Text>
                        <View style={styles.distanceInfo}>
                            <FontAwesome name="info-circle" size={14} color={theme.textMuted} />
                            <Text style={styles.distanceText}>Radius is managed in your location settings.</Text>
                        </View>
                    </View>
                </ScrollView>

                <View style={styles.footer}>
                    <TouchableOpacity 
                        style={styles.applyButton}
                        onPress={() => onApply(localFilters)}
                    >
                        <Text style={styles.applyButtonText}>Apply Filters</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const createStyles = (theme, shadows) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
        backgroundColor: theme.surface,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: theme.text,
    },
    headerButton: {
        padding: 5,
        minWidth: 50,
    },
    resetText: {
        color: theme.error,
        fontWeight: '700',
        fontSize: 14,
    },
    content: {
        padding: Spacing.lg,
    },
    section: {
        marginBottom: Spacing.xl,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.primary,
        marginBottom: Spacing.md,
    },
    categoryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -Spacing.xs,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: theme.border,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: Rounding.pill,
        margin: Spacing.xs,
        backgroundColor: theme.surface,
    },
    sortChip: {
        borderColor: theme.accent,
    },
    categoryText: {
        marginLeft: 8,
        fontSize: 13,
        fontWeight: '600',
        color: theme.text,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    priceInputContainer: {
        flex: 1,
    },
    priceLabel: {
        fontSize: 12,
        color: theme.textMuted,
        marginBottom: 4,
        fontWeight: '600',
    },
    priceInput: {
        backgroundColor: theme.input,
        borderWidth: 1.5,
        borderColor: theme.border,
        borderRadius: Rounding.standard,
        padding: Spacing.sm,
        fontSize: 16,
        color: theme.text,
    },
    priceDivider: {
        width: 20,
        height: 1.5,
        backgroundColor: theme.border,
        marginHorizontal: Spacing.md,
        marginTop: 20,
    },
    distanceInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.isDarkMode ? 'rgba(255,255,255,0.05)' : '#F0F4F8',
        padding: Spacing.md,
        borderRadius: Rounding.standard,
    },
    distanceText: {
        marginLeft: 10,
        fontSize: 13,
        color: theme.textMuted,
    },
    footer: {
        padding: Spacing.lg,
        borderTopWidth: 1,
        borderTopColor: theme.border,
        backgroundColor: theme.surface,
    },
    applyButton: {
        backgroundColor: theme.accent,
        padding: Spacing.md,
        borderRadius: Rounding.pill,
        alignItems: 'center',
        ...shadows.accent,
    },
    applyButtonText: {
        color: theme.white,
        fontSize: 16,
        fontWeight: '800',
    }
});
