import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Switch, ActivityIndicator, Alert, Modal, TouchableWithoutFeedback } from 'react-native';
import { taskService } from '../services/taskService';
import { Spacing, Rounding } from '../utils/theme';
import { useTheme } from '../components/ThemeContext';
import { useAuth } from '../components/AuthContext';
import { FontAwesome } from '@expo/vector-icons';
import { useToast } from '../components/ToastContext';
import { EmptyState } from '../components/EmptyState';
import { CURRENCY_SYMBOL } from '../utils/constants';

export const RecurringTasksScreen = ({ navigation }) => {
    const { theme, shadows } = useTheme();
    const { session } = useAuth();
    const { showToast } = useToast();
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);
    const [isFreqModalVisible, setIsFreqModalVisible] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState(null);

    const styles = useMemo(() => createStyles(theme, shadows), [theme, shadows]);

    const fetchTemplates = useCallback(async () => {
        try {
            if (session) {
                const data = await taskService.getMyRecurringTemplates(session.user.id);
                setTemplates(data);
            }
        } catch (_error) {
            console.error(_error);
            showToast('Failed to load recurring tasks', 'error');
        } finally {
            setLoading(false);
        }
    }, [session, showToast]);

    useEffect(() => {
        fetchTemplates();
    }, [fetchTemplates]);

    const toggleTemplate = async (id, currentStatus) => {
        setProcessingId(id);
        try {
            await taskService.updateTaskTemplate(id, { is_active: !currentStatus });
            setTemplates(templates.map(t => t.id === id ? { ...t, is_active: !currentStatus } : t));
            showToast(`Series ${!currentStatus ? 'resumed' : 'paused'}`, 'success');
        } catch (_error) {
            showToast('Failed to update status', 'error');
        } finally {
            setProcessingId(null);
        }
    };

    const updateFrequency = async (newFreq) => {
        if (!selectedTemplate) return;
        setProcessingId(selectedTemplate.id);
        setIsFreqModalVisible(false);
        try {
            // Calculate new next occurrence based on the NEW frequency from the LAST generated date
            const lastDate = selectedTemplate.last_generated_at ? new Date(selectedTemplate.last_generated_at) : new Date();
            const nextDate = taskService.calculateNextOccurrence(newFreq, lastDate);

            await taskService.updateTaskTemplate(selectedTemplate.id, { 
                frequency: newFreq,
                next_occurrence_at: nextDate.toISOString()
            });

            setTemplates(templates.map(t => t.id === selectedTemplate.id ? { 
                ...t, 
                frequency: newFreq,
                next_occurrence_at: nextDate.toISOString()
            } : t));
            showToast(`Frequency updated to ${newFreq}`, 'success');
        } catch (_error) {
            showToast('Failed to update frequency', 'error');
        } finally {
            setProcessingId(null);
            setSelectedTemplate(null);
        }
    };

    const deleteTemplate = (id) => {
        Alert.alert(
            "Cancel Series?",
            "This will stop all future tasks from being posted. Existing tasks will not be affected.",
            [
                { text: "No", style: "cancel" },
                { 
                    text: "Yes, Stop Series", 
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await taskService.deleteTaskTemplate(id);
                            setTemplates(templates.filter(t => t.id !== id));
                            showToast('Series cancelled permanently', 'success');
                        } catch (_error) {
                            showToast('Failed to delete series', 'error');
                        }
                    }
                }
            ]
        );
    };

    const renderItem = ({ item }) => (
        <View style={styles.templateCard}>
            <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{item.title}</Text>
                    <Text style={styles.category}>{item.category} â€¢ {CURRENCY_SYMBOL}{item.payment_amount}</Text>
                </View>
                <Switch
                    value={item.is_active}
                    onValueChange={() => toggleTemplate(item.id, item.is_active)}
                    disabled={processingId === item.id}
                    trackColor={{ false: theme.border, true: theme.accent }}
                />
            </View>

            <View style={styles.cardFooter}>
                <TouchableOpacity 
                    style={styles.infoRow}
                    onPress={() => {
                        setSelectedTemplate(item);
                        setIsFreqModalVisible(true);
                    }}
                >
                    <FontAwesome name="calendar" size={14} color={theme.accent} />
                    <Text style={[styles.infoText, { color: theme.accent, fontWeight: '700' }]}>Posts {item.frequency}</Text>
                    <FontAwesome name="pencil" size={10} color={theme.accent} style={{ marginLeft: 4 }} />
                </TouchableOpacity>
                <View style={styles.infoRow}>
                    <FontAwesome name="clock-o" size={14} color={theme.textMuted} />
                    <Text style={styles.infoText}>
                        Next: {item.next_occurrence_at ? new Date(item.next_occurrence_at).toLocaleDateString() : 'Pending'}
                    </Text>
                </View>
                <TouchableOpacity onPress={() => deleteTemplate(item.id)} style={styles.deleteButton}>
                    <FontAwesome name="trash" size={18} color={theme.error} />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <FontAwesome name="chevron-left" size={20} color={theme.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Recurring Series</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.descriptionContainer}>
                <Text style={styles.descriptionText}>
                    Manage your active task series here. Pause a series to stop automatic posts, or tap the frequency to change how often tasks are created.
                </Text>
            </View>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={theme.accent} />
                </View>
            ) : templates.length > 0 ? (
                <FlatList
                    data={templates}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.list}
                />
            ) : (
                <EmptyState 
                    icon="refresh" 
                    title="No recurring series yet." 
                    subtitle="Save time by turning regular tasks into a series." 
                    buttonText="Start a Series" 
                    onPress={() => navigation.navigate('CreateTab')} 
                />
            )}

            {/* Frequency Modal */}
            <Modal
                visible={isFreqModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsFreqModalVisible(false)}
            >
                <TouchableWithoutFeedback onPress={() => setIsFreqModalVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback>
                            <View style={styles.modalContent}>
                                <Text style={styles.modalTitle}>Change Frequency</Text>
                                <Text style={styles.modalSubTitle}>How often should this task be posted?</Text>
                                
                                {['daily', 'weekly', 'bi-weekly', 'monthly'].map((freq) => (
                                    <TouchableOpacity 
                                        key={freq}
                                        style={styles.freqOption}
                                        onPress={() => updateFrequency(freq)}
                                    >
                                        <Text style={[
                                            styles.freqOptionText,
                                            selectedTemplate?.frequency === freq && { color: theme.accent, fontWeight: '700' }
                                        ]}>
                                            {freq.charAt(0).toUpperCase() + freq.slice(1)}
                                        </Text>
                                        {selectedTemplate?.frequency === freq && (
                                            <FontAwesome name="check" size={14} color={theme.accent} />
                                        )}
                                    </TouchableOpacity>
                                ))}
                                
                                <TouchableOpacity 
                                    style={styles.cancelButton}
                                    onPress={() => setIsFreqModalVisible(false)}
                                >
                                    <Text style={styles.cancelButtonText}>Cancel</Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </View>
    );
};

const createStyles = (theme, shadows) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.lg,
        paddingBottom: Spacing.md,
        backgroundColor: theme.surface,
        ...shadows.subtle,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: theme.primary,
    },
    descriptionContainer: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        backgroundColor: theme.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
    },
    descriptionText: {
        fontSize: 14,
        color: theme.textMuted,
        lineHeight: 20,
    },
    list: {
        padding: Spacing.md,
        paddingBottom: 100,
    },
    templateCard: {
        backgroundColor: theme.surface,
        borderRadius: Rounding.soft,
        padding: Spacing.md,
        marginBottom: Spacing.md,
        ...shadows.subtle,
        borderWidth: 1,
        borderColor: theme.border,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
        paddingBottom: Spacing.sm,
        marginBottom: Spacing.sm,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.primary,
    },
    category: {
        fontSize: 12,
        color: theme.textMuted,
        fontWeight: '600',
        marginTop: 2,
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    infoText: {
        fontSize: 12,
        color: theme.textMuted,
        marginLeft: 6,
        fontWeight: '500',
    },
    deleteButton: {
        padding: 8,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '80%',
        backgroundColor: theme.surface,
        borderRadius: Rounding.soft,
        padding: Spacing.xl,
        ...shadows.medium,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: theme.primary,
        marginBottom: 8,
    },
    modalSubTitle: {
        fontSize: 14,
        color: theme.textMuted,
        marginBottom: Spacing.xl,
    },
    freqOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
    },
    freqOptionText: {
        fontSize: 16,
        color: theme.text,
        fontWeight: '600',
    },
    cancelButton: {
        marginTop: Spacing.xl,
        alignItems: 'center',
        padding: Spacing.md,
    },
    cancelButtonText: {
        color: theme.error,
        fontWeight: '700',
        fontSize: 16,
    }
});
