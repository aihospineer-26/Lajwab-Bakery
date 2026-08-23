/* Single-shop delivery: Lajwab Bakery, Chhoti Subzi Mandi, Janakpuri — 110058.
   Widening to nearby Janakpuri blocks later means adding pincodes here, not
   touching call sites. */
const SERVICEABLE_PINCODES = ['110058'];

export const SERVICE_AREA_LABEL = 'Janakpuri';

export function isServiceablePincode(pincode: string): boolean {
  return SERVICEABLE_PINCODES.includes(pincode.trim());
}

export function validatePincode(pincode: string): string | null {
  const digits = pincode.trim();
  if (!/^\d{6}$/.test(digits)) return 'Enter a valid 6-digit pincode';
  if (!isServiceablePincode(digits)) {
    return `We don't deliver to ${digits} yet — we're currently ${SERVICE_AREA_LABEL} (110058) only`;
  }
  return null;
}
