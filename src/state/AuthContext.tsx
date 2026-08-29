import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import {
  clearFirebaseOtp,
  sendFirebaseOtp,
  verifyFirebaseOtp,
} from '../services/firebaseOtp';
import {
  MSG91_AUTH_TOKEN,
  MSG91_WIDGET_ID,
  Msg91OtpBridge,
  msg91OtpRef,
  sendMsg91Otp,
  verifyMsg91Otp,
} from '../services/msg91Otp';
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

/* Everything below is keyed to a person, not to the device, and none of it was
   being cleared on sign-out -- so the next person to sign in on the same phone
   inherited the previous one's name, saved payment methods, order history and
   searches. Deliberately a list rather than AsyncStorage.clear(): the device's
   own settings (theme, onboarding, the sign-in prompt) belong to the handset
   and should survive somebody signing out.
   Anything new that stores per-customer data belongs here too. */
const DEVICE_USER_KEYS = [
  'user_profile',
  'payment_methods',
  'my_reviews',
  'notifications_read',
  'recent_searches',
  'lajwab.checkout.contact',
  'local_orders',
  'local_order_items',
];

async function clearDeviceUserData(): Promise<void> {
  try {
    await AsyncStorage.multiRemove(DEVICE_USER_KEYS);
  } catch (err) {
    /* Never block the sign-out itself -- being unable to tidy up is far less
       bad than leaving someone stuck signed in. */
    console.warn('[auth] could not clear local user data:', err);
  }
}

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

    /* Every customer gets a session, they just never see a login screen.
       Anonymous sign-in mints a real auth.uid(), so place_order and every RLS
       policy keep working untouched -- the alternative was opening the orders
       table to unauthenticated writes, which would have made every order
       readable by anyone.

       It is deliberately not an identity. The phone number collected at
       checkout is what coupons are counted against. When OTP arrives this same
       account is upgraded in place, so nothing here is thrown away. */
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        setSession(data.session);
        setIsLoading(false);
        return;
      }

      const { data: anon, error } = await supabase.auth.signInAnonymously();
      /* Not fatal: browsing works without a session, and checkout asks the
         customer to sign in anyway. Anonymous sign-ins are currently disabled
         on the project, so this is the expected path rather than a fault --
         logged quietly, and only in development, so it does not look like a
         failure in a production console. */
      if (error && __DEV__) {
        console.warn(
          '[auth] anonymous sign-in unavailable (' + error.message + ') — ' +
            'browsing continues without a session.',
        );
      }
      setSession(anon?.session ?? null);
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

    /* Same shape as Firebase: MSG91's widget owns send and verify itself. */
    if (OTP_CHANNEL === 'msg91') {
      return sendMsg91Otp(mobile);
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

    if (OTP_CHANNEL === 'msg91') {
      return verifyMsg91Otp(mobile, token);
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
    await clearDeviceUserData();
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
      {/* A 1x1 hidden WebView, not a screen -- MSG91's widget owns send/verify
          itself and this is how the app calls into it. Mounted once here so
          sendMsg91Otp/verifyMsg91Otp can reach it via msg91OtpRef from
          anywhere, the same way every other OTP channel exposes plain
          functions. Only rendered when that channel is actually in use, since
          it opens a real connection to MSG91's script otherwise.

          react-native-webview has no web implementation at all -- mounting
          this on web does not fail quietly, it renders visible red error text
          ("React Native WebView does not support this platform") right on
          screen. sendMsg91Otp/verifyMsg91Otp fall back to a clear message on
          web instead; see services/msg91Otp.ts. */}
      {OTP_CHANNEL === 'msg91' && Platform.OS !== 'web' && (
        <Msg91OtpBridge
          ref={msg91OtpRef}
          widgetId={MSG91_WIDGET_ID}
          authToken={MSG91_AUTH_TOKEN}
          /* Printed once, on load, straight from the widget itself -- the
             quickest way to see its real config (OTP length, retry rules,
             channel) without opening the MSG91 dashboard at all. */
          getWidgetData={(data) => {
            if (__DEV__) console.log('[msg91] widget config:', JSON.stringify(data));
          }}
        />
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
