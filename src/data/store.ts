/* Single source of truth for the bakery's own details.
 *
 * Anything the customer can tap to contact the store lives here. Empty strings
 * are treated as "not configured" and the matching UI hides itself, so an
 * unfilled value can never ship as a dead button or a wrong number.
 *
 * !! FILL THESE IN BEFORE LAUNCH — see the checklist at the bottom.
 */

export const STORE = {
  name: 'Lajwab Bakery',
  area: 'Janakpuri',
  city: 'New Delhi',
  pincode: '110058',

  /* Tapped from the support screen. Include the country code: '+919876543210' */
  phone: '',
  whatsapp: '',
  email: '',

  /* Shown on the support screen and in the order confirmation. */
  hours: 'Mon–Sun, 9:00 am – 9:00 pm',

  /* Legally required to be displayed by a food business in India. The support
     screen hides the line entirely while this is empty. */
  fssai: '',

  /* Leave empty until the bakery is GST-registered. */
  gstin: '',

  /* One promise, used everywhere the app quotes a delivery time. The bakery
     delivers its own orders across Janakpuri, so this is a realistic window
     rather than a quick-commerce one. Cakes and the thaali are made to order
     and quote their own lead time on the product page. */
  deliveryEta: '45 – 60 minutes',
} as const;

export const hasPhone = STORE.phone.trim() !== '';
export const hasWhatsapp = STORE.whatsapp.trim() !== '';
export const hasEmail = STORE.email.trim() !== '';
export const hasFssai = STORE.fssai.trim() !== '';

export const STORE_ADDRESS_LINE = `${STORE.area}, ${STORE.city} ${STORE.pincode}`;

/* ------------------------------------------------------------------
   BEFORE LAUNCH
   ------------------------------------------------------------------
   [ ] phone     — the number customers should call
   [ ] whatsapp  — usually the same number
   [ ] email     — leave empty if the bakery has none; the option hides
   [ ] fssai     — licence number, mandatory to display
   [ ] gstin     — only if registered
   ------------------------------------------------------------------ */
