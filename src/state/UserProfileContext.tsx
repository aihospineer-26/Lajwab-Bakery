import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { usePersistedState } from '../hooks/usePersistedState';
import { PROFILE_STORAGE_KEY } from '../services/appTarget';
import { formatMobile } from '../services/otp';
import { fetchMyProfile, MyProfile, saveMyProfile } from '../services/profile';
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
  /* What to print when the customer has not given a name yet. Never blank, so
     no screen has to invent its own fallback and drift from the others. */
  displayName: string;
  initials: string;
  updateProfile: (updates: Partial<Omit<UserProfile, 'role'>>) => void;
};

/* msg91-otp-bridge derives a synthetic address from the phone number because
   auth.users needs one for the magic-link exchange. It is plumbing, not
   something the customer ever typed, and showing them
   "7838744780@phone.lajwabbakery.local" as their email reads like a bug. */
const SYNTHETIC_EMAIL_DOMAIN = '@phone.lajwabbakery.local';

function nonEmpty(value: string | undefined | null): string | undefined {
  const trimmed = (value ?? '').trim();
  return trimmed === '' ? undefined : trimmed;
}

function realEmail(email: string | undefined | null): string {
  if (!email || email.endsWith(SYNTHETIC_EMAIL_DOMAIN)) return '';
  return email;
}

/* Supabase stores the bare 10 digits (see the bridge); the country code is
   presentation, so it is added back here rather than kept in the database. */
function displayPhone(phone: string | undefined | null): string {
  const digits = (phone ?? '').replace(/[^0-9]/g, '').slice(-10);
  return digits.length === 10 ? '+91 ' + formatMobile(digits) : '';
}

const UserProfileContext = createContext<UserProfileContextValue | null>(null);

export function UserProfileProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  /* Keyed per app — the shop and the dashboard must not share one name field.
     See PROFILE_STORAGE_KEY in services/appTarget.ts. */
  const [overrides, setOverrides] = usePersistedState<Partial<UserProfile>>(PROFILE_STORAGE_KEY, {});

  /* The server copy, so a name survives a reinstall or a second device.
     It used to live only in this device's localStorage, which meant the name
     a customer typed at checkout was gone the moment they cleared the app. */
  const [server, setServer] = useState<MyProfile | null>(null);

  useEffect(() => {
    if (!session) {
      setServer(null);
      return;
    }
    let alive = true;
    fetchMyProfile()
      .then((p) => { if (alive) setServer(p); })
      .catch(() => { /* keeps whatever is stored locally */ });
    return () => { alive = false; };
  }, [session]);

  /* Derived rather than synced: the user's saved edits win over session values,
     but role always comes from server-set app_metadata and can never be forged.
     There is deliberately no seed profile -- a placeholder name here is shown to
     every customer as if it were their own, which is exactly how one appeared
     across all accounts before. Empty is honest; the screens fall back to
     displayName. */
  const profile = useMemo<UserProfile>(() => {
    const user = session?.user;
    return {
      /* Local edits win while they are still being written back, then the
         two agree. user_metadata is the last resort -- it is only ever set
         for the Supabase-native OTP path. */
      name: overrides.name ?? nonEmpty(server?.name) ?? (user?.user_metadata?.full_name as string | undefined) ?? '',
      email: overrides.email ?? nonEmpty(server?.email) ?? realEmail(user?.email),
      phone: overrides.phone ?? displayPhone(user?.phone),
      role: (user?.app_metadata?.role as UserRole) ?? 'customer',
    };
  }, [session, overrides, server]);

  /* Anything real the customer has given us beats "Guest": a phone for someone
     who signed in by OTP, an email for staff signing in with a password, who
     have no phone on the account and would otherwise be greeted as Guest. */
  const displayName = profile.name.trim() || profile.phone || profile.email || 'Guest';

  const initials = useMemo(() => {
    const fromName = profile.name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    if (fromName) return fromName;
    /* Staff accounts are identified by email, so its first letter is a better
       mark than a generic glyph. A phone number has no initial worth printing. */
    const fromEmail = profile.email.trim().charAt(0).toUpperCase();
    return fromEmail || '👤';
  }, [profile.name, profile.email]);

  const updateProfile = useCallback(
    (updates: Partial<Omit<UserProfile, 'role'>>) => {
      setOverrides(prev => ({ ...prev, ...updates }));
      /* Written through rather than awaited: the screen that called this has
         already shown the new value, and a failed sync must not block it. The
         next fetch reconciles. */
      if (updates.name !== undefined || updates.email !== undefined) {
        saveMyProfile({
          ...(updates.name !== undefined ? { name: updates.name } : {}),
          ...(updates.email !== undefined ? { email: updates.email } : {}),
        })
          .then(() => setServer(prev => ({
            name: updates.name ?? prev?.name ?? '',
            email: updates.email ?? prev?.email ?? '',
          })))
          .catch(() => { /* stays local; reconciled on the next load */ });
      }
    },
    [setOverrides],
  );

  return (
    <UserProfileContext.Provider value={{ profile, displayName, initials, updateProfile }}>
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile() {
  const ctx = useContext(UserProfileContext);
  if (!ctx) throw new Error('useUserProfile must be used within UserProfileProvider');
  return ctx;
}
