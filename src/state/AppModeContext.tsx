import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { useUserProfile } from './UserProfileContext';

export type AppMode = 'customer' | 'delivery';

type AppModeContextValue = {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  canAccessDelivery: boolean;
};

const AppModeContext = createContext<AppModeContextValue | null>(null);

export function AppModeProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useUserProfile();
  const { session } = useAuth();
  const [mode, setModeState] = useState<AppMode>('customer');

  /* Role rides on the session, so preview mode has none — open the staff views
     on the dev server only. A real session is always role-gated. */
  const isDevPreview = __DEV__ && !session;
  const canAccessDelivery =
    isDevPreview || profile.role === 'delivery' || profile.role === 'admin';

  /* Riders land straight in the rider view instead of having to find the header
     toggle. Keyed by user id so it routes once per sign-in and does not fight
     someone who deliberately switched modes. */
  const routedForUser = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const userId = session?.user?.id ?? null;
    if (routedForUser.current === userId) return;
    routedForUser.current = userId;
    setModeState(profile.role === 'delivery' ? 'delivery' : 'customer');
  }, [session, profile.role]);

  /* Losing access while parked in the rider view would otherwise strand the
     user on a screen their role can no longer read. */
  useEffect(() => {
    if (mode === 'delivery' && !canAccessDelivery) setModeState('customer');
  }, [mode, canAccessDelivery]);

  const setMode = (next: AppMode) => {
    if (next === 'delivery' && !canAccessDelivery) return;
    setModeState(next);
  };

  return (
    <AppModeContext.Provider value={{ mode, setMode, canAccessDelivery }}>
      {children}
    </AppModeContext.Provider>
  );
}

export function useAppMode() {
  const ctx = useContext(AppModeContext);
  if (!ctx) throw new Error('useAppMode must be used within AppModeProvider');
  return ctx;
}
