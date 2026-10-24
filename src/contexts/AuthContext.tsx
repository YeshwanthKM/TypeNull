import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { UserProfile, UserRole } from '../types';

import { getRoleRedirectPath } from '../utils/roleUtils';
export { getRoleRedirectPath };

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  role: UserRole | null;
  isLoading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | Error | null; role?: UserRole | null }>;
  signUp: (
    email: string,
    password: string,
    fullName?: string
  ) => Promise<{ error: AuthError | Error | null; user: User | null; session: Session | null }>;
  signOut: () => Promise<{ error: Error | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | Error | null }>;
  updateProfile: (fullName: string) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
  fetchProfile: (userId: string) => Promise<UserProfile | null>;
  startDemoSession?: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    if (!supabase || !isSupabaseConfigured) return null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!error && data) {
        const userProfile: UserProfile = {
          id: data.id,
          full_name: data.full_name,
          role: (data.role as UserRole) || 'applicant',
          created_at: data.created_at,
          updated_at: data.updated_at,
        };
        setProfile(userProfile);
        return userProfile;
      } else {
        // Fallback default applicant profile if record was not found
        const fallbackProfile: UserProfile = {
          id: userId,
          full_name: '',
          role: 'applicant',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setProfile(fallbackProfile);
        return fallbackProfile;
      }
    } catch (err) {
      console.error('[TypeNull] Error fetching profile:', err);
      return null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    if (!isSupabaseConfigured || !supabase) {
      if (typeof window !== 'undefined') {
        const storedDemoRole = sessionStorage.getItem('typenull_demo_role') as UserRole | null;
        if (storedDemoRole) {
          const demoUser = {
            id: `demo-${storedDemoRole}-user`,
            email: `${storedDemoRole}.demo@typenull.local`,
            app_metadata: {},
            user_metadata: { full_name: `Demo ${storedDemoRole.charAt(0).toUpperCase() + storedDemoRole.slice(1)}` },
            aud: 'authenticated',
            created_at: new Date().toISOString(),
          } as unknown as User;
          setUser(demoUser);
          setProfile({
            id: `demo-${storedDemoRole}-user`,
            full_name: `Demo ${storedDemoRole.charAt(0).toUpperCase() + storedDemoRole.slice(1)}`,
            role: storedDemoRole,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
      }
      setIsLoading(false);
      return;
    }

    // 1. Check existing session on boot & await verified profile role
    supabase.auth
      .getSession()
      .then(async ({ data: { session: existingSession } }) => {
        if (!mounted) return;
        setSession(existingSession);
        setUser(existingSession?.user ?? null);
        if (existingSession?.user) {
          await fetchProfile(existingSession.user.id);
        }
      })
      .catch((err) => {
        console.error('[TypeNull] Error checking initial session:', err);
      })
      .finally(() => {
        if (mounted) {
          setIsLoading(false);
        }
      });

    // 2. Listen for auth lifecycle changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        await fetchProfile(newSession.user.id);
      } else {
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = async (email: string, password: string) => {
    if (!supabase || !isSupabaseConfigured) {
      return {
        error: new Error(
          'Supabase is not configured. Please supply VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.'
        ),
        role: null,
      };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        return { error, role: null };
      }

      let userRole: UserRole = 'applicant';
      if (data.user) {
        const fetched = await fetchProfile(data.user.id);
        if (fetched?.role) {
          userRole = fetched.role;
        }
      }

      return { error: null, role: userRole };
    } catch (err) {
      return { error: err as Error, role: null };
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    if (!supabase || !isSupabaseConfigured) {
      return {
        error: new Error(
          'Supabase is not configured. Please supply VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.'
        ),
        user: null,
        session: null,
      };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName?.trim() || '',
          },
        },
      });

      return {
        error,
        user: data.user,
        session: data.session,
      };
    } catch (err) {
      return {
        error: err as Error,
        user: null,
        session: null,
      };
    }
  };

  const signOut = async () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('typenull_demo_role');
    }
    if (!supabase || !isSupabaseConfigured) {
      setUser(null);
      setSession(null);
      setProfile(null);
      return { error: null };
    }

    try {
      const { error } = await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setProfile(null);
      return { error };
    } catch (err) {
      setUser(null);
      setSession(null);
      setProfile(null);
      return { error: err as Error };
    }
  };

  const resetPassword = async (email: string) => {
    if (!supabase || !isSupabaseConfigured) {
      return {
        error: new Error(
          'Supabase is not configured. Please supply VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.'
        ),
      };
    }

    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });
      return { error };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const updatePassword = async (newPassword: string) => {
    if (!supabase || !isSupabaseConfigured) {
      return {
        error: new Error('Supabase is not configured.'),
      };
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      return { error };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const updateProfile = async (fullName: string) => {
    if (!supabase || !isSupabaseConfigured || !user) {
      return { error: new Error('Unauthenticated or Supabase unconfigured.') };
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (!error) {
        await fetchProfile(user.id);
      }
      return { error };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const startDemoSession = useCallback((demoRole: UserRole) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('typenull_demo_role', demoRole);
    }
    const demoUser = {
      id: `demo-${demoRole}-user`,
      email: `${demoRole}.demo@typenull.local`,
      app_metadata: {},
      user_metadata: { full_name: `Demo ${demoRole.charAt(0).toUpperCase() + demoRole.slice(1)}` },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    } as unknown as User;
    setUser(demoUser);
    setProfile({
      id: `demo-${demoRole}-user`,
      full_name: `Demo ${demoRole.charAt(0).toUpperCase() + demoRole.slice(1)}`,
      role: demoRole,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role: profile?.role ?? null,
        isLoading,
        isConfigured: isSupabaseConfigured,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updatePassword,
        updateProfile,
        refreshProfile,
        fetchProfile,
        startDemoSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
