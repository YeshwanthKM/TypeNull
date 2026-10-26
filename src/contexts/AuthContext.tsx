import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { UserProfile, UserRole, InstitutionVerificationStatus } from '../types';

import { getRoleRedirectPath } from '../utils/roleUtils';
export { getRoleRedirectPath };

export interface InstitutionSignUpMetadata {
  institution_name?: string;
  aicte_permanent_id?: string;
  institution_type?: string;
  address?: string;
  state?: string;
  contact_person_designation?: string;
  contact_phone?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  role: UserRole | null;
  isAdmin: boolean;
  isLoading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | Error | null; role?: UserRole | null }>;
  signUp: (
    email: string,
    password: string,
    fullName?: string,
    institutionalData?: InstitutionSignUpMetadata
  ) => Promise<{ error: AuthError | Error | null; user: User | null; session: Session | null }>;
  signOut: () => Promise<{ error: Error | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | Error | null }>;
  updateProfile: (fullName: string, metadata?: Partial<InstitutionSignUpMetadata>) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
  fetchProfile: (userId: string) => Promise<UserProfile | null>;
  startDemoSession?: (
    role: UserRole,
    options?: { isAdmin?: boolean; verificationStatus?: InstitutionVerificationStatus }
  ) => void;
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
          role: (data.role as UserRole) || 'institution',
          institution_name: data.institution_name,
          aicte_permanent_id: data.aicte_permanent_id,
          institution_type: data.institution_type,
          address: data.address,
          state: data.state,
          contact_person_designation: data.contact_person_designation,
          contact_phone: data.contact_phone,
          is_admin: Boolean(data.is_admin),
          verification_status: data.verification_status || 'pending_verification',
          verification_reason: data.verification_reason,
          verified_at: data.verified_at,
          verified_by: data.verified_by,
          created_at: data.created_at,
          updated_at: data.updated_at,
        };
        setProfile(userProfile);
        return userProfile;
      } else {
        // Fallback default institution profile if record was not found
        const fallbackProfile: UserProfile = {
          id: userId,
          full_name: '',
          role: 'institution',
          verification_status: 'pending_verification',
          is_admin: false,
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
        const storedDemoIsAdmin = sessionStorage.getItem('typenull_demo_is_admin') === 'true';
        const storedDemoVerifStatus = (sessionStorage.getItem('typenull_demo_verif_status') as InstitutionVerificationStatus) ||
          (storedDemoRole === 'institution' ? 'pending_verification' : undefined);

        if (storedDemoRole) {
          const roleTitle = storedDemoRole === 'institution'
            ? 'Delhi Institute of Engineering & Technology'
            : storedDemoRole === 'officer'
            ? (storedDemoIsAdmin ? 'AICTE Reviewing Officer (Verification Lead)' : 'AICTE Scrutiny Officer')
            : `Demo ${storedDemoRole.charAt(0).toUpperCase() + storedDemoRole.slice(1)}`;

          const demoUser = {
            id: `demo-${storedDemoRole}-user`,
            email: `${storedDemoRole}.demo@typenull.local`,
            app_metadata: {},
            user_metadata: { full_name: roleTitle },
            aud: 'authenticated',
            created_at: new Date().toISOString(),
          } as unknown as User;
          setUser(demoUser);
          setProfile({
            id: `demo-${storedDemoRole}-user`,
            full_name: roleTitle,
            role: storedDemoRole,
            institution_name: storedDemoRole === 'institution' ? 'Delhi Institute of Engineering & Technology' : undefined,
            aicte_permanent_id: storedDemoRole === 'institution' ? '1-43289012' : undefined,
            institution_type: storedDemoRole === 'institution' ? 'Engineering & Technology' : undefined,
            state: storedDemoRole === 'institution' ? 'Delhi' : undefined,
            address: storedDemoRole === 'institution' ? 'Institutional Area, Sector 14, New Delhi' : undefined,
            contact_person_designation: storedDemoRole === 'institution' ? 'Registrar' : undefined,
            contact_phone: storedDemoRole === 'institution' ? '+91 11 2659 1000' : undefined,
            is_admin: storedDemoIsAdmin,
            verification_status: storedDemoVerifStatus,
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

      let userRole: UserRole = 'institution';
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

  const signUp = async (
    email: string,
    password: string,
    fullName?: string,
    institutionalData?: InstitutionSignUpMetadata
  ) => {
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
            institution_name: institutionalData?.institution_name?.trim() || '',
            aicte_permanent_id: institutionalData?.aicte_permanent_id?.trim() || '',
            institution_type: institutionalData?.institution_type || 'Engineering & Technology',
            address: institutionalData?.address?.trim() || '',
            state: institutionalData?.state?.trim() || '',
            contact_person_designation: institutionalData?.contact_person_designation?.trim() || '',
            contact_phone: institutionalData?.contact_phone?.trim() || '',
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
      sessionStorage.removeItem('typenull_demo_is_admin');
      sessionStorage.removeItem('typenull_demo_verif_status');
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

  const updateProfile = async (
    fullName: string,
    metadata?: Partial<InstitutionSignUpMetadata>
  ) => {
    if (!supabase || !isSupabaseConfigured || !user) {
      if (!isSupabaseConfigured && profile) {
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                full_name: fullName.trim(),
                ...(metadata?.institution_name !== undefined ? { institution_name: metadata.institution_name.trim() } : {}),
                ...(metadata?.aicte_permanent_id !== undefined ? { aicte_permanent_id: metadata.aicte_permanent_id.trim() } : {}),
                ...(metadata?.institution_type !== undefined ? { institution_type: metadata.institution_type } : {}),
                ...(metadata?.address !== undefined ? { address: metadata.address.trim() } : {}),
                ...(metadata?.state !== undefined ? { state: metadata.state.trim() } : {}),
                ...(metadata?.contact_person_designation !== undefined ? { contact_person_designation: metadata.contact_person_designation.trim() } : {}),
                ...(metadata?.contact_phone !== undefined ? { contact_phone: metadata.contact_phone.trim() } : {}),
                updated_at: new Date().toISOString(),
              }
            : null
        );
        return { error: null };
      }
      return { error: new Error('Unauthenticated or Supabase unconfigured.') };
    }

    try {
      const updateData: Record<string, any> = {
        full_name: fullName.trim(),
        updated_at: new Date().toISOString(),
      };
      if (metadata?.institution_name !== undefined) updateData.institution_name = metadata.institution_name.trim();
      if (metadata?.aicte_permanent_id !== undefined) updateData.aicte_permanent_id = metadata.aicte_permanent_id.trim();
      if (metadata?.institution_type !== undefined) updateData.institution_type = metadata.institution_type;
      if (metadata?.address !== undefined) updateData.address = metadata.address.trim();
      if (metadata?.state !== undefined) updateData.state = metadata.state.trim();
      if (metadata?.contact_person_designation !== undefined) updateData.contact_person_designation = metadata.contact_person_designation.trim();
      if (metadata?.contact_phone !== undefined) updateData.contact_phone = metadata.contact_phone.trim();

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
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

  const startDemoSession = useCallback(
    (
      demoRole: UserRole,
      options?: { isAdmin?: boolean; verificationStatus?: InstitutionVerificationStatus }
    ) => {
      const isAdminFlag = Boolean(options?.isAdmin);
      const verifStatus = options?.verificationStatus || (demoRole === 'institution' ? 'pending_verification' : undefined);

      if (typeof window !== 'undefined') {
        sessionStorage.setItem('typenull_demo_role', demoRole);
        if (isAdminFlag) {
          sessionStorage.setItem('typenull_demo_is_admin', 'true');
        } else {
          sessionStorage.removeItem('typenull_demo_is_admin');
        }
        if (verifStatus) {
          sessionStorage.setItem('typenull_demo_verif_status', verifStatus);
        } else {
          sessionStorage.removeItem('typenull_demo_verif_status');
        }
      }

      const roleTitle = demoRole === 'institution'
        ? 'Delhi Institute of Engineering & Technology'
        : demoRole === 'officer'
        ? (isAdminFlag ? 'AICTE Reviewing Officer (Verification Lead)' : 'AICTE Scrutiny Officer')
        : `Demo ${demoRole.charAt(0).toUpperCase() + demoRole.slice(1)}`;

      const demoUser = {
        id: `demo-${demoRole}-user`,
        email: `${demoRole}.demo@typenull.local`,
        app_metadata: {},
        user_metadata: { full_name: roleTitle },
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      } as unknown as User;

      setUser(demoUser);
      setProfile({
        id: `demo-${demoRole}-user`,
        full_name: roleTitle,
        role: demoRole,
        institution_name: demoRole === 'institution' ? 'Delhi Institute of Engineering & Technology' : undefined,
        aicte_permanent_id: demoRole === 'institution' ? '1-43289012' : undefined,
        institution_type: demoRole === 'institution' ? 'Engineering & Technology' : undefined,
        state: demoRole === 'institution' ? 'Delhi' : undefined,
        address: demoRole === 'institution' ? 'Institutional Area, Sector 14, New Delhi' : undefined,
        contact_person_designation: demoRole === 'institution' ? 'Registrar' : undefined,
        contact_phone: demoRole === 'institution' ? '+91 11 2659 1000' : undefined,
        is_admin: isAdminFlag,
        verification_status: verifStatus,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    },
    []
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role: profile?.role ?? null,
        isAdmin: Boolean(profile?.is_admin),
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
