/* Firebase Phone Auth, used purely to prove the customer holds the number.
 *
 * Firebase generates, sends and verifies its own code, so it cannot be plugged
 * in as a delivery channel the way the WhatsApp hook is. Once it confirms the
 * number we hand its token to the firebase-otp-bridge Edge Function, which
 * returns a real Supabase session. Supabase stays the identity system: user ids
 * are still uuids and RLS still keys on auth.uid().
 *
 * Two SDKs, one flow. Native uses @react-native-firebase/auth; web uses the
 * Firebase JS SDK, which needs a reCAPTCHA container that native has no concept
 * of. Both mint a token with the same claims, so the bridge cannot tell them
 * apart and needs no branch of its own.
 *
 * Why this exists at all: it sends real SMS without TRAI DLT registration,
 * because Google is the sender. It is meant to be replaced by a direct SMS
 * provider once DLT clears -- at which point this file is deleted and the
 * channel switches back to the hook.
 */

import { Platform } from 'react-native';
import { supabase } from './supabase';
import { toE164 } from './otp';

/* Both SDKs return an object shaped like this from signInWithPhoneNumber. */
type Confirmation = {
  confirm: (code: string) => Promise<{ user: { getIdToken: () => Promise<string> } } | null>;
};

let pending: Confirmation | null = null;

/* ------------------------------------------------------------------ web */

/* Public identifiers, not secrets -- they ship inside every client anyway.
   Written out longhand because Expo only inlines direct static reads of
   process.env.EXPO_PUBLIC_*. */
const WEB_CONFIG = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseWebConfigured = Object.values(WEB_CONFIG).every(
  (v) => typeof v === 'string' && v.length > 0,
);

const RECAPTCHA_CONTAINER = 'firebase-recaptcha';

let webAuth: any = null;
let verifier: any = null;

/* Dynamic requires on both sides so neither bundle pulls in the other's SDK --
   the native module has no web build, and the JS SDK has no business being in
   the APK. */
function loadWebAuth() {
  if (webAuth) return webAuth;

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { initializeApp, getApps, getApp } = require('firebase/app');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { getAuth } = require('firebase/auth');

  const app = getApps().length ? getApp() : initializeApp(WEB_CONFIG);
  webAuth = getAuth(app);
  return webAuth;
}

/* reCAPTCHA needs a real element in the DOM before it will render. Invisible
   mode still requires the container -- it just does not draw into it unless
   Google decides to challenge. */
function loadVerifier(auth: any) {
  if (verifier) return verifier;

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { RecaptchaVerifier } = require('firebase/auth');

  let container = document.getElementById(RECAPTCHA_CONTAINER);
  if (!container) {
    container = document.createElement('div');
    container.id = RECAPTCHA_CONTAINER;
    document.body.appendChild(container);
  }

  verifier = new RecaptchaVerifier(auth, container, { size: 'invisible' });
  return verifier;
}

/* A spent verifier cannot be reused -- Google ties each token to one attempt,
   so a second send with the same instance fails with a stale-token error. */
function resetVerifier() {
  try {
    verifier?.clear();
  } catch {
    /* already torn down */
  }
  verifier = null;
}

async function sendWeb(mobile: string): Promise<string | null> {
  if (!isFirebaseWebConfigured) {
    return 'Phone sign-in is not configured for the website yet.';
  }

  try {
    const auth = loadWebAuth();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { signInWithPhoneNumber } = require('firebase/auth');
    pending = await signInWithPhoneNumber(auth, toE164(mobile), loadVerifier(auth));
    return null;
  } catch (err) {
    resetVerifier();
    return friendly(err);
  }
}

/* --------------------------------------------------------------- native */

function nativeAuth() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('@react-native-firebase/auth');
  return (mod.default ?? mod)();
}

async function sendNative(mobile: string): Promise<string | null> {
  try {
    pending = await nativeAuth().signInWithPhoneNumber(toE164(mobile));
    return null;
  } catch (err) {
    return friendly(err);
  }
}

/* ---------------------------------------------------------------- shared */

/** Sends the code. Returns an error message, or null on success. */
export async function sendFirebaseOtp(mobile: string): Promise<string | null> {
  return Platform.OS === 'web' ? sendWeb(mobile) : sendNative(mobile);
}

/** Verifies the code and exchanges it for a Supabase session. */
export async function verifyFirebaseOtp(code: string): Promise<string | null> {
  if (!pending) return 'That code has expired. Please ask for a new one.';

  let idToken: string;
  try {
    const credential = await pending.confirm(code);
    if (!credential?.user) return 'That code is not right. Please check and try again.';
    idToken = await credential.user.getIdToken();
  } catch (err) {
    return friendly(err);
  }

  /* The bridge is what turns "this number is verified" into a session the rest
     of the app can use. It validates the token against Google's public keys, so
     it does not matter which SDK minted it. */
  const { data, error } = await supabase.functions.invoke('firebase-otp-bridge', {
    body: { idToken },
  });
  if (error) return 'Could not complete sign-in. Please try again.';

  const tokenHash = (data as { tokenHash?: string })?.tokenHash;
  if (!tokenHash) return 'Could not complete sign-in. Please try again.';

  const { error: sessionError } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: 'magiclink',
  });
  if (sessionError) return 'Could not complete sign-in. Please try again.';

  clearFirebaseOtp();
  return null;
}

export function clearFirebaseOtp(): void {
  pending = null;
  if (Platform.OS === 'web') resetVerifier();
}

/* Firebase error codes are not customer-readable. */
function friendly(err: unknown): string {
  const code = (err as { code?: string })?.code ?? '';
  if (code.includes('invalid-phone-number')) return 'That mobile number does not look right.';
  if (code.includes('too-many-requests')) return 'Too many attempts. Please try again later.';
  if (code.includes('invalid-verification-code')) return 'That code is not right. Please check and try again.';
  if (code.includes('code-expired') || code.includes('session-expired')) {
    return 'That code has expired. Please ask for a new one.';
  }
  if (code.includes('captcha')) return 'Could not verify you are human. Please reload and try again.';
  /* Firebase rejects any web origin not listed under Authorized domains, and
     the raw message is opaque about why. */
  if (code.includes('unauthorized-domain')) {
    return 'This website is not authorised for sign-in yet.';
  }
  if (code.includes('network')) return 'No connection. Check your internet and try again.';
  return 'Could not send the code. Please try again.';
}
