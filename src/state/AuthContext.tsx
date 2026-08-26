import { Session } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  clearFirebaseOtp,
  sendFirebaseOtp,
  verifyFirebaseOtp,
} from '../services/firebaseOtp';
import {
  OTP_CHANNEL,
  OTP_DEMO_MODE,
  clearDemoCode,
  issueDemoCode,
  matchesDemoCode,
  toE164,
} from '../services/otp';
import { supabase } from '../services/supabase';

type AuthContextValue = {
  session: Session | null;
  isLoading: boolean;
  /* Only set in demo mode, where the code is shown on screen instead of sent. */
  demoCode: string | null;
  sendOtp: (mobile: string, fullName?: string) => Promise<string | null>;
  verifyOtp: (mobile: string, token: string) => Promise<string | null>;
  /* Staff only. Customers never see a password — the inventory app uses this so
     the owner is not gated behind WhatsApp OTP delivery. */
  signInWithPassword: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/* Satisfies the UI only. Services read supabase.auth.getSession() directly, so
   they still see no session and keep writing to the preview overlay — the same
   path the app already takes when signed out. */
function demoSession(phone: string): Session {
  const user = {
    id: 'demo-' + phone,
    phone: phone.replace('+', ''),
    aud: 'authenticated',
    role: 'authenticated',
    app_metadata: {},
    user_metadata: {},
    created_at: new Date().toISOString(),
  };
  return {
    access_token: 'demo',
    refresh_token: 'demo',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user,
  } as unknown as Session;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [demoCode, setDemoCode] = useState<string | null>(null);

  useEffect(() => {
    if (OTP_DEMO_MODE) {
      setIsLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const sendOtp = async (mobile: string, fullName?: string) => {
    if (OTP_DEMO_MODE) {
      setDemoCode(issueDemoCode());
      return null;
    }

    /* Firebase owns its own send and verify; Supabase never mints a code in
       this mode. See services/firebaseOtp.ts for why. */
    if (OTP_CHANNEL === 'firebase') {
      return sendFirebaseOtp(mobile);
    }

    /* Sent as the 'sms' channel because that is what the Send SMS Hook
       intercepts — the hook then delivers it over WhatsApp. */
    const { error } = await supabase.auth.signInWithOtp({
      phone: toE164(mobile),
      options: { data: fullName ? { full_name: fullName } : undefined },
    });
    return error?.message ?? null;
  };

  const verifyOtp = async (mobile: string, token: string) => {
    if (OTP_DEMO_MODE) {
      if (!matchesDemoCode(token)) return 'That code is not right. Please check and try again.';
      clearDemoCode();
      setDemoCode(null);
      setSession(demoSession(toE164(mobile)));
      return null;
    }

    /* Verified by Firebase, then exchanged for a Supabase session -- the
       onAuthStateChange listener picks it up like any other sign-in. */
    if (OTP_CHANNEL === 'firebase') {
      return verifyFirebaseOtp(token);
    }

    const { error } = await supabase.auth.verifyOtp({
      phone: toE164(mobile),
      token,
      type: 'sms',
    });
    return error?.message ?? null;
  };

  const signInWithPassword = async (email: string, password: string) => {
    if (OTP_DEMO_MODE) {
      return 'Staff sign-in needs a Supabase project. Set EXPO_PUBLIC_SUPABASE_URL and remove EXPO_PUBLIC_OTP_MODE=demo.';
    }
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return error?.message ?? null;
  };

  const signOut = async () => {
    clearDemoCode();
    clearFirebaseOtp();
    setDemoCode(null);
    if (OTP_DEMO_MODE) {
      setSession(null);
      return;
    }
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{ session, isLoading, demoCode, sendOtp, verifyOtp, signInWithPassword, signOut }}
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
