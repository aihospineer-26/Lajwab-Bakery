import { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { supabase } from '../services/supabase';

type AuthContextValue = {
  session: Session | null;
  isLoading: boolean;
  linkError: string | null;
  clearLinkError: () => void;
  sendMagicLink: (email: string, fullName?: string) => Promise<string | null>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [linkError, setLinkError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  /* Magic-link return leg. On web supabase-js reads the URL itself, but on
     native nothing consumes the deep link unless we do it here — without this
     the app opens from the email and stays signed out. */
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const consumeUrl = async (url: string | null) => {
      if (!url) return;

      const { queryParams } = Linking.parse(url);
      const fragment = url.includes('#') ? url.split('#')[1] : '';
      const fragmentParams = new URLSearchParams(fragment);

      const errorDescription =
        (queryParams?.error_description as string | undefined) ??
        fragmentParams.get('error_description');
      if (errorDescription) {
        setLinkError(errorDescription.replace(/\+/g, ' '));
        return;
      }

      // PKCE flow returns a code to exchange
      const code = queryParams?.code;
      if (typeof code === 'string') {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) setLinkError(error.message);
        return;
      }

      // Implicit flow returns the tokens directly in the fragment
      const accessToken = fragmentParams.get('access_token');
      const refreshToken = fragmentParams.get('refresh_token');
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) setLinkError(error.message);
      }
    };

    // Covers the app being launched cold by the link
    Linking.getInitialURL().then(consumeUrl);
    // ...and being resumed while already running
    const subscription = Linking.addEventListener('url', ({ url }) => consumeUrl(url));
    return () => subscription.remove();
  }, []);

  const sendMagicLink = async (email: string, fullName?: string) => {
    setLinkError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: Linking.createURL('/'),
        data: fullName ? { full_name: fullName } : undefined,
      },
    });
    return error?.message ?? null;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const clearLinkError = useCallback(() => setLinkError(null), []);

  return (
    <AuthContext.Provider
      value={{ session, isLoading, linkError, clearLinkError, sendMagicLink, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
