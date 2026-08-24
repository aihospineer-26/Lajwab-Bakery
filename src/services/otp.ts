import { isSupabaseConfigured } from './supabase';

/* Demo mode runs the whole OTP flow on the device: nothing is sent over
   WhatsApp and the code is shown on screen. It switches on by itself until a
   Supabase project is configured, so the flow can be demonstrated before the
   Send SMS Hook is live. */
export const OTP_DEMO_MODE =
  process.env.EXPO_PUBLIC_OTP_MODE === 'demo' || !isSupabaseConfigured;

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
