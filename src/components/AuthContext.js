import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../services/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [session, setSession] = useState(null);
    const [user, setUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState(null);

    const fetchProfile = async (userId) => {
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
            }
        } catch (error) {
            console.error('Error fetching user profile in AuthContext:', error);
        } finally {
            setLoading(false);
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
                // Only stop loading if we are signed out or have no session
                setLoading(false);
            }
        });

        return () => {
            subscription?.unsubscribe();
        };
    }, []);

    const value = {
        session,
        user,
        userProfile,
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
