import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  user: any | null;
  profile: UserProfile | null;
  role: UserRole | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isLoading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithEmail: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      if (isSupabaseConfigured) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user && mounted) {
            setUser(session.user);
            const { data: profileData, error: profErr } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .maybeSingle();

            if (profileData && mounted) {
              setProfile(profileData as UserProfile);
            } else if (!profErr && mounted) {
              // Fallback role check if profile row is pending creation
              const role: UserRole = session.user.email === 'elevennation.support@gmail.com' ? 'super_admin' : 'customer';
              setProfile({
                id: session.user.id,
                email: session.user.email || '',
                full_name: session.user.user_metadata?.full_name || 'Store User',
                role
              });
            }
          } else if (mounted) {
            setUser(null);
            setProfile(null);
          }
        } catch (e) {
          console.warn('Supabase auth session check failed:', e);
          if (mounted) {
            setUser(null);
            setProfile(null);
          }
        }
      }

      if (mounted) setIsLoading(false);
    }

    initAuth();

    // Listen to Supabase auth state changes if configured
    if (isSupabaseConfigured) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!mounted) return;
        if (event === 'SIGNED_OUT' || !session?.user) {
          setUser(null);
          setProfile(null);
          setIsLoading(false);
          return;
        }

        setUser(session.user);
        try {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();
          if (profileData && mounted) {
            setProfile(profileData as UserProfile);
          } else if (mounted) {
            const isSuper = session.user.email?.toLowerCase() === 'elevennation.support@gmail.com';
            setProfile({
              id: session.user.id,
              email: session.user.email || '',
              full_name: session.user.user_metadata?.full_name || 'Store User',
              role: isSuper ? 'super_admin' : 'customer'
            });
          }
        } catch (e) {
          console.error('Error loading profile in onAuthStateChange:', e);
        } finally {
          if (mounted) setIsLoading(false);
        }
      });

      return () => {
        mounted = false;
        subscription.unsubscribe();
      };
    }

    return () => {
      mounted = false;
    };
  }, []);

  const signInWithEmail = async (email: string, password: string): Promise<{ error: string | null }> => {
    setIsLoading(true);
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      setIsLoading(false);
      if (error) return { error: error.message };
      if (data.user) {
        setUser(data.user);
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle();
        if (profileData) {
          setProfile(profileData as UserProfile);
        }
        return { error: null };
      }
    }

    // Local/offline development mode only when Supabase is not configured
    setIsLoading(false);
    const isSuper = email.toLowerCase().includes('support') || email.toLowerCase().includes('super');
    const newProf: UserProfile = {
      id: `usr-${Date.now()}`,
      email,
      full_name: email.split('@')[0].toUpperCase(),
      role: isSuper ? 'super_admin' : 'admin'
    };
    setProfile(newProf);
    setUser({ id: newProf.id, email });
    return { error: null };
  };

  const signUpWithEmail = async (email: string, password: string, fullName: string): Promise<{ error: string | null }> => {
    setIsLoading(true);
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } }
      });
      setIsLoading(false);
      if (error) return { error: error.message };
      return { error: null };
    }

    setIsLoading(false);
    const newProf: UserProfile = {
      id: `usr-${Date.now()}`,
      email,
      full_name: fullName,
      role: 'customer'
    };
    setProfile(newProf);
    setUser({ id: newProf.id, email });
    return { error: null };
  };

  const signOut = async (): Promise<{ error: string | null }> => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.auth.signOut();
        if (error) {
          console.error('Supabase sign out error:', error);
          return { error: error.message };
        }
      }
      setUser(null);
      setProfile(null);
      return { error: null };
    } catch (err: any) {
      console.error('Unexpected error signing out:', err);
      return { error: err?.message || 'Failed to sign out' };
    } finally {
      setIsLoading(false);
    }
  };

  const role: UserRole | null = user ? (profile?.role || 'customer') : null;
  const isAdmin = user ? (role === 'admin' || role === 'super_admin') : false;
  const isSuperAdmin = user ? (role === 'super_admin') : false;

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        isAdmin,
        isSuperAdmin,
        isLoading,
        signInWithEmail,
        signUpWithEmail,
        signOut
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
