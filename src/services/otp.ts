import { isSupabaseConfigured } from './supabase';

/* How the code reaches the customer. The screens are identical either way --
   only delivery differs -- so moving to SMS once DLT clears is a config change.
 *
 *   none      no OTP at all. Customers get an anonymous Supabase session and
 *             the phone they give at checkout is what coupons count against.
 *             Weaker, but free -- see migration 003.
 *   demo      generated and shown on screen; no backend needed
 *   whatsapp  Supabase mints the code, the Send SMS Hook delivers it
 *   firebase  Firebase owns send and verify, then we swap its token for a
 *             Supabase session (see supabase/functions/firebase-otp-bridge)
 *   msg91     MSG91's widget owns send and verify (real SMS, no DLT needed on
 *             their default template), then we swap its access-token for a
 *             Supabase session (see supabase/functions/msg91-otp-bridge)
 */
export type OtpChannel = 'none' | 'demo' | 'whatsapp' | 'firebase' | 'msg91';

function resolveChannel(): OtpChannel {
  if (process.env.EXPO_PUBLIC_OTP_MODE === 'demo') return 'demo';
  if (!isSupabaseConfigured) return 'demo';
  const channel = process.env.EXPO_PUBLIC_OTP_CHANNEL;
  if (
    channel === 'none' ||
    channel === 'firebase' ||
    channel === 'msg91' ||
    channel === 'whatsapp' ||
    channel === 'demo'
  ) {
    return channel;
  }
  return 'whatsapp';
}

export const OTP_CHANNEL: OtpChannel = resolveChannel();
export const OTP_DEMO_MODE = OTP_CHANNEL === 'demo';

/* Set by whoever sends the code, not by us -- MSG91's widget defaults to 4
   digits while Supabase's own SMS is 6. Hardcoding either one silently breaks
   sign-in on the other: the boxes never fill, so auto-submit never fires and
   the Verify button stays disabled forever. Change the widget's OTP length in
   the MSG91 dashboard and this must change with it. */
function resolveOtpLength(): number {
  const raw = Number(process.env.EXPO_PUBLIC_OTP_LENGTH);
  if (Number.isInteger(raw) && raw >= 4 && raw <= 8) return raw;
  return OTP_CHANNEL === 'msg91' ? 4 : 6;
}

export const OTP_LENGTH = resolveOtpLength();
export const RESEND_SECONDS = 30;

const COUNTRY_CODE = '+91';

export function digitsOnly(input: string): string {
  return input.replace(/\D/g, '');
}

/* TRAI allocates Indian mobile numbers in the 6–9 series. */
export function isValidMobile(local: string): boolean {
  return /^[6-9]\d{9}$/.test(digitsOnly(local));
}

export function toE164(local: string): string {
  return COUNTRY_CODE + digitsOnly(local).slice(-10);
}

/** 98765 43210 — grouped for readability while typing. */
export function formatMobile(local: string): string {
  const d = digitsOnly(local).slice(0, 10);
  return d.length > 5 ? d.slice(0, 5) + ' ' + d.slice(5) : d;
}

let issuedCode: string | null = null;

export function issueDemoCode(): string {
  issuedCode = String(Math.floor(100000 + Math.random() * 900000));
  return issuedCode;
}

export function matchesDemoCode(token: string): boolean {
  return issuedCode !== null && token === issuedCode;
}

export function clearDemoCode(): void {
  issuedCode = null;
}

/** How the customer is told the code will arrive. */
export const CHANNEL_LABEL: Record<OtpChannel, string> = {
  none: 'not sent',
  demo: 'on screen',
  whatsapp: 'on WhatsApp',
  firebase: 'by SMS',
  msg91: 'by SMS',
};
