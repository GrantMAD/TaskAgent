import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [session, setSession] = useState(null);
    const [user, setUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [savedTaskIds, setSavedTaskIds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState(null);

    const fetchSavedTaskIds = useCallback(async (userId) => {
        try {
            const { data, error } = await supabase
                .from('saved_tasks')
                .select('task_id')
                .eq('user_id', userId);
            
            if (error) throw error;
            setSavedTaskIds(data.map(item => item.task_id));
        } catch (error) {
            console.error('Error fetching saved task IDs:', error);
        }
    }, []);

    const fetchProfile = useCallback(async (userId) => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .maybeSingle();
            
            if (error) throw error;

            if (data?.is_suspended) {
                setAuthError(`Account Suspended\nReason: ${data.suspension_reason || 'Please contact support.'}`);
                await supabase.auth.signOut();
                setUserProfile(null);
                setUser(null);
                setSession(null);
            } else {
                setUserProfile(data);
                setAuthError(null);
                // Also fetch saved tasks
                fetchSavedTaskIds(userId);
            }
        } catch (error) {
            console.error('Error fetching user profile in AuthContext:', error);
        } finally {
            setLoading(false);
        }
    }, [fetchSavedTaskIds]);

    const toggleSavedTask = async (taskId) => {
        if (!user) return;

        const isSaved = savedTaskIds.includes(taskId);
        
        // Optimistic update
        if (isSaved) {
            setSavedTaskIds(prev => prev.filter(id => id !== taskId));
        } else {
            setSavedTaskIds(prev => [...prev, taskId]);
        }

        try {
            if (isSaved) {
                const { error } = await supabase
                    .from('saved_tasks')
                    .delete()
                    .eq('user_id', user.id)
                    .eq('task_id', taskId);
                
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('saved_tasks')
                    .insert([{ user_id: user.id, task_id: taskId }]);
                if (error) throw error;
            }
        } catch (error) {
            console.error('Error toggling saved task:', error);
            // Revert on error
            if (isSaved) {
                setSavedTaskIds(prev => [...prev, taskId]);
            } else {
                setSavedTaskIds(prev => prev.filter(id => id !== taskId));
            }
        }
    };

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user || null);
            if (session?.user) {
                fetchProfile(session.user.id);
            } else {
                setLoading(false);
                setSavedTaskIds([]);
            }
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            setSession(session);
            setUser(session?.user || null);
            
            if (session?.user) {
                // When logging in or session changes, keep/set loading to true until profile is fetched
                setLoading(true);
                fetchProfile(session.user.id);
            } else {
                setUserProfile(null);
                setSavedTaskIds([]);
                // Only stop loading if we are signed out or have no session
                setLoading(false);
            }
        });

        return () => {
            subscription?.unsubscribe();
        };
    }, [fetchProfile]);

    const value = {
        session,
        user,
        userProfile,
        savedTaskIds,
        toggleSavedTask,
        loading,
        authError,
        setAuthError,
        refreshProfile: () => user && fetchProfile(user.id)
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
