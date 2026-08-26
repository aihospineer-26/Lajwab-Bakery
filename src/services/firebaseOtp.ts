/* Firebase Phone Auth, used purely to prove the customer holds the number.
 *
 * Firebase generates, sends and verifies its own code, so it cannot be plugged
 * in as a delivery channel the way the WhatsApp hook is. Once it confirms the
 * number we hand its token to the firebase-otp-bridge Edge Function, which
 * returns a real Supabase session. Supabase stays the identity system: user ids
 * are still uuids and RLS still keys on auth.uid().
 *
 * Why this exists at all: it sends real SMS without TRAI DLT registration,
 * because Google is the sender. It is meant to be replaced by a direct SMS
 * provider once DLT clears -- at which point this file is deleted and the
 * channel switches back to the hook.
 */

import { Platform } from 'react-native';
import { supabase } from './supabase';
import { toE164 } from './otp';

type Confirmation = {
  confirm: (code: string) => Promise<{ user: { getIdToken: () => Promise<string> } } | null>;
};

let pending: Confirmation | null = null;

/* Required so the bundler never pulls the native module into the web build,
   where it does not exist. */
function firebaseAuth() {
  if (Platform.OS === 'web') {
    throw new Error('Phone sign-in is only available in the app.');
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('@react-native-firebase/auth');
  return (mod.default ?? mod)();
}

/** Sends the code. Returns an error message, or null on success. */
export async function sendFirebaseOtp(mobile: string): Promise<string | null> {
  try {
    pending = await firebaseAuth().signInWithPhoneNumber(toE164(mobile));
    return null;
  } catch (err) {
    return friendly(err);
  }
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
     of the app can use. */
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

  pending = null;
  return null;
}

export function clearFirebaseOtp(): void {
  pending = null;
}

/* Firebase error codes are not customer-readable. */
function friendly(err: unknown): string {
  const code = (err as { code?: string })?.code ?? '';
  if (code.includes('invalid-phone-number')) return 'That mobile number does not look right.';
  if (code.includes('too-many-requests')) return 'Too many attempts. Please try again later.';
  if (code.includes('invalid-verification-code')) return 'That code is not right. Please check and try again.';
  if (code.includes('session-expired')) return 'That code has expired. Please ask for a new one.';
  if (code.includes('network')) return 'No connection. Check your internet and try again.';
  return 'Could not send the code. Please try again.';
}
