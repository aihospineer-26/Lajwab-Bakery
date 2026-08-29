/* MSG91's OTP Widget, used purely to prove the customer holds the number.
 *
 * Two paths, one flow -- the same split as services/firebaseOtp.ts:
 *
 *   native  @msg91comm/react-native-sendotp, which is a hidden WebView running
 *           MSG91's browser script, because React Native has no DOM.
 *   web     MSG91's script loaded straight into the page. react-native-webview
 *           has no web build at all, so the native package cannot be used here
 *           -- but the browser is exactly the environment that script was
 *           written for, so it needs no wrapper.
 *
 * Both end up calling the same window.sendOtp/window.verifyOtp that MSG91's
 * script exposes when initialised with exposeMethods: true, and both produce
 * the same access-token. msg91-otp-bridge therefore needs no branch of its own.
 *
 * On a verified OTP the widget's success response carries that access-token in
 * its `message` field. It proves nothing to us directly -- it is MSG91's word
 * for it. The bridge re-checks it server-side against MSG91's own
 * verifyAccessToken endpoint before minting a Supabase session.
 */

import { createRef } from 'react';
import { Platform } from 'react-native';
/* The package exports one identifier, ExposeOTPVerification, that resolves to
   both the component (value space) and its ref shape (type space) -- there is
   no separately-exported ExposeOTPVerificationRefProps to import. */
import { ExposeOTPVerification } from '@msg91comm/react-native-sendotp';
import { supabase } from './supabase';
import { toE164 } from './otp';

export const MSG91_WIDGET_ID = process.env.EXPO_PUBLIC_MSG91_WIDGET_ID ?? '';
export const MSG91_AUTH_TOKEN = process.env.EXPO_PUBLIC_MSG91_AUTH_TOKEN ?? '';

export const isMsg91Configured = MSG91_WIDGET_ID !== '' && MSG91_AUTH_TOKEN !== '';

/* MSG91's identifier format: country code with no leading '+'. */
function toMsg91Identifier(mobile: string): string {
  return toE164(mobile).replace('+', '');
}

type WidgetResponse = { message: string; type: 'success' | 'error'; code?: string };

/* ------------------------------------------------------------------ web */

/* MSG91 serves the same script from two hosts and the dashboard snippet tries
   them in order, so a blocked or down primary is survivable. */
const WEB_SCRIPT_URLS = [
  'https://verify.msg91.com/otp-provider.js',
  'https://verify.phone91.com/otp-provider.js',
];

type Msg91Window = Window & {
  initSendOTP?: (config: unknown) => void;
  sendOtp?: (id: string, ok: (d: WidgetResponse) => void, fail: (e: WidgetResponse) => void) => void;
  verifyOtp?: (otp: number, ok: (d: WidgetResponse) => void, fail: (e: WidgetResponse) => void) => void;
  retryOtp?: (
    channel: number | null,
    ok: (d: WidgetResponse) => void,
    fail: (e: WidgetResponse) => void,
  ) => void;
};

let webReady: Promise<void> | null = null;

function loadScript(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const el = document.createElement('script');
    el.src = url;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error('Could not load ' + url));
    document.head.appendChild(el);
  });
}

/* Initialised once and reused. initSendOTP has to run after the script loads
   and before any of the window.* methods exist. */
function readyOnWeb(): Promise<void> {
  if (webReady) return webReady;

  webReady = (async () => {
    let lastError: unknown = null;
    for (const url of WEB_SCRIPT_URLS) {
      try {
        await loadScript(url);
        lastError = null;
        break;
      } catch (err) {
        lastError = err;
      }
    }
    if (lastError) throw lastError;

    const w = window as Msg91Window;
    if (typeof w.initSendOTP !== 'function') {
      throw new Error('MSG91 script loaded but initSendOTP is missing');
    }

    w.initSendOTP({
      widgetId: MSG91_WIDGET_ID,
      tokenAuth: MSG91_AUTH_TOKEN,
      exposeMethods: true,
      success: () => {},
      failure: () => {},
    });

    /* initSendOTP attaches window.sendOtp and friends asynchronously; the
       package's own WebView build waits too rather than calling straight
       after. Poll briefly instead of guessing a fixed delay. */
    for (let i = 0; i < 40; i++) {
      if (typeof (window as Msg91Window).sendOtp === 'function') return;
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error('MSG91 widget did not finish starting up');
  })().catch((err) => {
    /* A failed load must not be cached as done, or every later attempt in this
       session resolves instantly against a widget that was never there. */
    webReady = null;
    throw err;
  });

  return webReady;
}

/* The exposed methods are callback-based; the native package's are promises.
   Wrapping here keeps both paths the same shape for the rest of this file. */
function callWeb(
  method: 'sendOtp' | 'verifyOtp',
  arg: string | number,
): Promise<WidgetResponse> {
  return new Promise((resolve) => {
    const w = window as Msg91Window;
    const fn = w[method];
    if (typeof fn !== 'function') {
      resolve({ message: 'widget not ready', type: 'error' });
      return;
    }
    (fn as (a: unknown, ok: (d: WidgetResponse) => void, no: (e: WidgetResponse) => void) => void)(
      arg,
      (data) => resolve(data),
      (error) => resolve(error),
    );
  });
}

/* --------------------------------------------------------------- native */

export const msg91Ref = createRef<ExposeOTPVerification>();

/** Mount once near the root, native only. Invisible -- a 1x1 WebView. */
export { ExposeOTPVerification as Msg91OtpBridge };
export { msg91Ref as msg91OtpRef };

/* ---------------------------------------------------------------- shared */

/** Sends the code. Returns an error message, or null on success. */
export async function sendMsg91Otp(mobile: string): Promise<string | null> {
  if (!isMsg91Configured) return 'Phone sign-in is not configured yet.';

  const identifier = toMsg91Identifier(mobile);

  if (Platform.OS === 'web') {
    try {
      await readyOnWeb();
    } catch (err) {
      if (__DEV__) console.warn('[msg91] web startup failed:', err);
      return 'Could not start sign-in. Please reload the page and try again.';
    }
    const response = await callWeb('sendOtp', identifier);
    return response.type === 'success' ? null : friendly(response, 'send');
  }

  if (!msg91Ref.current) return 'Sign-in is starting up. Please try again in a moment.';
  const response = await msg91Ref.current.sendOtp(identifier);
  return response.type === 'success' ? null : friendly(response, 'send');
}

/** Verifies the code and exchanges it for a Supabase session. */
export async function verifyMsg91Otp(mobile: string, code: string): Promise<string | null> {
  const digits = code.replace(/[^0-9]/g, '');
  if (digits.length === 0) return 'That code is not right. Please check and try again.';

  /* MSG91's widget takes the code as a number -- its own SDK interpolates it
     as one -- which cannot carry a leading zero: Number('0472') is 472, and
     the widget would then be asked to check the wrong code and answer
     "invalid otp" for a code the customer typed correctly. Number('0000') is
     worse still: falsy, so the widget reports the OTP as missing entirely.
     Both were reproduced against the live widget.
     MSG91 appears not to issue codes starting with zero -- its own SDK would
     be broken the same way if it did -- so this warns rather than works around
     it. If this ever fires, the code path here is what needs revisiting. */
  if (__DEV__ && digits.startsWith('0')) {
    console.warn(
      '[msg91] received an OTP starting with 0 ("' + digits + '"). The widget takes a number, ' +
        'so the leading zero is lost and verification will fail. See verifyMsg91Otp.',
    );
  }

  const otp = Number(digits);
  if (!Number.isFinite(otp)) return 'That code is not right. Please check and try again.';

  let response: WidgetResponse;
  if (Platform.OS === 'web') {
    /* Guards the case where this screen is reached without a send in the same
       page -- a reload, or a deep link straight to the code screen. The widget
       would otherwise be missing entirely and report "widget not ready", which
       says nothing useful to anyone. Re-initialising does not recover the
       request id, so the customer is told to ask for a new code. */
    try {
      await readyOnWeb();
    } catch (err) {
      if (__DEV__) console.warn('[msg91] web startup failed during verify:', err);
      return 'Could not start sign-in. Please reload the page and try again.';
    }
    response = await callWeb('verifyOtp', otp);
  } else {
    if (!msg91Ref.current) return 'Sign-in is starting up. Please try again in a moment.';
    response = await msg91Ref.current.verifyOtp(otp);
  }

  if (response.type !== 'success') return friendly(response, 'verify');

  /* The widget calls this field `message` even on success -- it holds the
     access-token, not a human sentence. */
  const accessToken = response.message;
  if (!accessToken) return 'Could not complete sign-in. Please try again.';

  /* phone is a fallback only. The bridge prefers whatever MSG91's own
     verifyAccessToken call reports and only reaches for this when that
     response carries no identifier -- see the security note in
     supabase/functions/msg91-otp-bridge/index.ts. */
  const { data, error } = await supabase.functions.invoke('msg91-otp-bridge', {
    body: { accessToken, phone: toE164(mobile) },
  });
  /* Three different failures below all read the same to the customer, so each
     one says which it was in the log. Otherwise "could not complete sign-in"
     covers a rejected token, a misconfigured function and an expired hash
     alike, and there is no way to tell them apart from the outside. */
  if (error) {
    if (__DEV__) console.warn('[msg91] bridge call failed —', error);
    return 'Could not complete sign-in. Please try again.';
  }

  const tokenHash = (data as { tokenHash?: string })?.tokenHash;
  if (!tokenHash) {
    if (__DEV__) console.warn('[msg91] bridge returned no tokenHash — raw:', JSON.stringify(data));
    return 'Could not complete sign-in. Please try again.';
  }

  const { error: sessionError } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: 'magiclink',
  });
  if (sessionError) {
    if (__DEV__) console.warn('[msg91] session exchange failed —', sessionError.message);
    return 'Could not complete sign-in. Please try again.';
  }
  return null;
}

/* MSG91's own error messages are meant for developers, not customers.
   `stage` only changes the wording of the last-resort line: telling someone
   their code could not be *sent* while they are staring at the code they just
   received is worse than saying nothing. */
function friendly(response: { message?: string; code?: string }, stage: 'send' | 'verify'): string {
  const msg = (response.message ?? '').toLowerCase();

  /* Logged in full, and loudly, because every unmapped failure otherwise
     reaches the customer as the same vague sentence -- which is exactly how a
     4-digit/6-digit mismatch and a dead widget looked identical. */
  if (__DEV__) {
    console.warn(
      '[msg91] ' + stage + ' failed —',
      'code:', response.code ?? '(none)',
      'message:', response.message ?? '(none)',
      'raw:', JSON.stringify(response),
    );
  }

  if (msg.includes('invalid otp') || msg.includes('incorrect')) {
    return 'That code is not right. Please check and try again.';
  }
  if (msg.includes('expired')) return 'That code has expired. Please ask for a new one.';
  if (msg.includes('max') && msg.includes('attempt')) {
    return 'Too many attempts. Please try again later.';
  }
  if (msg.includes('invalid mobile') || msg.includes('invalid number')) {
    return 'That mobile number does not look right.';
  }
  /* MSG91 rate-limits by IP, not by number, and returns this to everyone
     behind that address. Seen for real during testing: several sends in quick
     succession from one connection blocked the next customer's genuine
     attempt, and it reached them as the generic "could not send" line. */
  if (msg.includes('ipblocked') || msg.includes('ip blocked')) {
    return 'Too many sign-in attempts from this network. Please wait a few minutes and try again.';
  }
  /* Returned when the widget has no request in memory to check against --
     usually a page reload between asking for the code and typing it. */
  if (msg.includes('otp not provided') || msg.includes('reqid')) {
    return 'That code is no longer valid. Please ask for a new one.';
  }
  if (msg.includes('captcha')) {
    return 'Could not verify you are human. Please reload the page and try again.';
  }
  /* MSG91 returns this when the code is checked against a request it no longer
     recognises -- usually a reload between asking for the code and typing it,
     which wipes the widget's in-memory request id. */
  if (msg.includes('request') || msg.includes('reqid') || msg.includes('not found')) {
    return 'That code is no longer valid. Please ask for a new one.';
  }
  return stage === 'verify'
    ? 'Could not check that code. Please ask for a new one.'
    : 'Could not send the code. Please try again.';
}
