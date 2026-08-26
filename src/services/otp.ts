import { isSupabaseConfigured } from './supabase';

/* How the code reaches the customer. The screens are identical either way --
   only delivery differs -- so moving to SMS once DLT clears is a config change.
 *
 *   demo      generated and shown on screen; no backend needed
 *   whatsapp  Supabase mints the code, the Send SMS Hook delivers it
 *   firebase  Firebase owns send and verify, then we swap its token for a
 *             Supabase session (see supabase/functions/firebase-otp-bridge)
 */
export type OtpChannel = 'demo' | 'whatsapp' | 'firebase';

function resolveChannel(): OtpChannel {
  if (process.env.EXPO_PUBLIC_OTP_MODE === 'demo') return 'demo';
  if (!isSupabaseConfigured) return 'demo';
  const channel = process.env.EXPO_PUBLIC_OTP_CHANNEL;
  if (channel === 'firebase' || channel === 'whatsapp' || channel === 'demo') return channel;
  return 'whatsapp';
}

export const OTP_CHANNEL: OtpChannel = resolveChannel();
export const OTP_DEMO_MODE = OTP_CHANNEL === 'demo';

export const OTP_LENGTH = 6;
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
  demo: 'on screen',
  whatsapp: 'on WhatsApp',
  firebase: 'by SMS',
};
