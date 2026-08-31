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

/* Rider mode is off until a rider backend exists.
 *
 * The three delivery screens read src/data/deliveries.ts -- invented jobs and
 * invented earnings. Nothing assigns a real job, nothing pays a real rider, and
 * a delivery-role account reaching those screens would be shown operational
 * data that is not true. The screens and their code are kept intact so they can
 * be reconnected; this flag is the single intentional gate that turns them back
 * on, and it must stay off until the data behind them is real.
 *
 * Set EXPO_PUBLIC_ENABLE_RIDER=1 in a .env file to develop against them. */
export const RIDER_MODE_ENABLED = process.env.EXPO_PUBLIC_ENABLE_RIDER === '1';

export function AppModeProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useUserProfile();
  const { session } = useAuth();
  const [mode, setModeState] = useState<AppMode>('customer');

  /* Role alone is not enough. Without the feature flag nobody reaches the rider
     view -- not a delivery account, not an admin, not the signed-out dev
     preview -- because there is nothing truthful there to reach. */
  const isDevPreview = __DEV__ && !session;
  const canAccessDelivery =
    RIDER_MODE_ENABLED &&
    (isDevPreview || profile.role === 'delivery' || profile.role === 'admin');

  /* Riders land straight in the rider view instead of having to find the header
     toggle. Keyed by user id so it routes once per sign-in and does not fight
     someone who deliberately switched modes. */
  const routedForUser = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const userId = session?.user?.id ?? null;
    if (routedForUser.current === userId) return;
    routedForUser.current = userId;
    const isRider = RIDER_MODE_ENABLED && profile.role === 'delivery';
    setModeState(isRider ? 'delivery' : 'customer');
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
