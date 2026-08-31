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

  /* Tapped from the support screen. Include the country code: '+919876543210'
   *
   * CONFIRM WITH THE BAKERY. Taken from their own public listings, not from
   * them directly: District (Zomato's dining site) and Justdial both give this
   * number against Shop 9/9, Chhoti Subzi Mandi. magicpin lists 8800474740
   * instead, which is more likely that aggregator's own routing line than the
   * shop's. If a customer taps Call and reaches a stranger, this is why. */
  phone: '+919958989879',
  whatsapp: '',
  email: '',

  /* Shown on the support screen and in the order confirmation.
     Also from the listings above, which agree on 8:30 am – 10:30 pm. The
     previous value here (9 to 9) was a guess and closed the shop 90 minutes
     early -- worth confirming, because it decides when the app stops taking
     orders. */
  hours: 'Mon–Sun, 8:30 am – 10:30 pm',

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
   [ ] phone       — the number customers should call
   [ ] whatsapp    — usually the same number
   [ ] email       — leave empty if the bakery has none; the option hides
   [ ] fssai       — licence number, mandatory to display
   [ ] gstin       — only if registered
   [ ] deliveryEta — the window quoted on every express order. Nobody has
                     confirmed 45–60 minutes with the bakery; it is the app
                     making a delivery promise on their behalf.

   The UPI ID is deliberately NOT here. It lives in store_settings and is set
   from the dashboard Account tab, so the owner can change where the money
   goes without a release -- and so a stale VPA can never be baked into an
   APK. Blank means prepaid checkout does not appear at all.
   ------------------------------------------------------------------ */
