import React, { createContext, useCallback, useContext, useMemo } from 'react';
import { usePersistedState } from '../hooks/usePersistedState';
import { useAuth } from './AuthContext';

export type UserRole = 'customer' | 'delivery' | 'admin';

export type UserProfile = {
  name: string;
  email: string;
  phone: string;
  role: UserRole;
};

type UserProfileContextValue = {
  profile: UserProfile;
  updateProfile: (updates: Partial<Omit<UserProfile, 'role'>>) => void;
};

const DEMO_PROFILE: UserProfile = {
  name: 'Arjun Sharma',
  email: 'demo@lajwabbakery.app',
  phone: '+91 98765 43210',
  role: 'customer',
};

const UserProfileContext = createContext<UserProfileContextValue | null>(null);

export function UserProfileProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [overrides, setOverrides] = usePersistedState<Partial<UserProfile>>('user_profile', {});

  /* Derived rather than synced: the user's saved edits win over session defaults,
     but role always comes from server-set app_metadata and can never be forged. */
  const profile = useMemo<UserProfile>(() => {
    const user = session?.user;
    return {
      ...DEMO_PROFILE,
      ...(user
        ? {
            email: user.email ?? DEMO_PROFILE.email,
            name: user.user_metadata?.full_name ?? DEMO_PROFILE.name,
          }
        : {}),
      ...overrides,
      role: (user?.app_metadata?.role as UserRole) ?? 'customer',
    };
  }, [session, overrides]);

  const updateProfile = useCallback(
    (updates: Partial<Omit<UserProfile, 'role'>>) => {
      setOverrides(prev => ({ ...prev, ...updates }));
    },
    [setOverrides],
  );

  return (
    <UserProfileContext.Provider value={{ profile, updateProfile }}>
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile() {
  const ctx = useContext(UserProfileContext);
  if (!ctx) throw new Error('useUserProfile must be used within UserProfileProvider');
  return ctx;
}
