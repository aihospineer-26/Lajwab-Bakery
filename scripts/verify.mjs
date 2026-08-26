/* Checks on the logic that costs money or breaks orders if it drifts.
 *
 * Runs against the real source -- Node strips the TypeScript itself, so there
 * is no test runner, no config and nothing added to package.json. Installing a
 * framework can wait; this cannot, because these are the rules a customer is
 * charged by.
 *
 *   node scripts/verify.mjs
 */

import { COUPONS, calculateDiscount, findCoupon } from '../src/data/offers.ts';
import { dayLabel, leadTimeForCart, leadTimeForProduct } from '../src/data/preOrder.ts';
import { SERVICE_AREA_LABEL, validatePincode } from '../src/data/serviceability.ts';
import { STORE, hasFssai, hasPhone } from '../src/data/store.ts';
import { readFileSync } from 'node:fs';

let passed = 0;
const failures = [];

function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) passed++;
  else failures.push(`${name}\n     expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

function truthy(name, value) {
  if (value) passed++;
  else failures.push(name);
}

/* ---------- coupons ---------- */

check('FIRST50 halves a 1551 thaali', calculateDiscount(findCoupon('FIRST50'), 1551), 776);
check('FIRST50 capped at 1000', calculateDiscount(findCoupon('FIRST50'), 5000), 1000);
check('LAJWAB100 is flat 100', calculateDiscount(findCoupon('LAJWAB100'), 650), 100);
check('flat discount never exceeds subtotal', calculateDiscount(findCoupon('LAJWAB100'), 60), 60);
check('FREESHIP discounts nothing', calculateDiscount(findCoupon('FREESHIP'), 500), 0);
check('coupon lookup is case-insensitive', findCoupon('first50')?.code, 'FIRST50');
check('unknown coupon is undefined', findCoupon('NOPE'), undefined);

/* Every coupon the app offers must exist in migration 002, or the server
   rejects a code the customer was shown. */
const SERVER_CODES = ['FIRST50', 'JANMASHTAMI', 'LAJWAB100', 'FREESHIP'];
check('app coupons match the server table', COUPONS.map((c) => c.code).sort(), [...SERVER_CODES].sort());

/* ---------- delivery fee ----------
   place_order decides the fee, so the two constants must agree. If they drift,
   the customer is shown one total and charged another. Read from both sources
   rather than hardcoded here, so this fails when either side moves. */

const cartSrc = readFileSync(new URL('../src/state/CartContext.tsx', import.meta.url), 'utf8');
const sqlSrc = readFileSync(new URL('../supabase/migrations/002_order_details.sql', import.meta.url), 'utf8');

const clientFee = Number(/DELIVERY_FEE\s*=\s*(\d+)/.exec(cartSrc)?.[1]);
const clientFree = Number(/FREE_DELIVERY_THRESHOLD\s*=\s*(\d+)/.exec(cartSrc)?.[1]);
const sqlMatch = /v_subtotal >= (\d+) then 0 else (\d+) end/.exec(sqlSrc);
const sqlFree = Number(sqlMatch?.[1]);
const sqlFee = Number(sqlMatch?.[2]);

/* NaN on either side means a regex stopped matching, which would otherwise
   compare equal and pass silently. */
truthy('delivery fee constants were found in both files',
  Number.isFinite(clientFee) && Number.isFinite(clientFree) &&
  Number.isFinite(sqlFee) && Number.isFinite(sqlFree));
check('delivery fee matches place_order', clientFee, sqlFee);
check('free-delivery threshold matches place_order', clientFree, sqlFree);

/* ---------- serviceability ---------- */

check('110058 is serviceable', validatePincode('110058'), null);
truthy('a neighbouring pincode is refused', validatePincode('110059') !== null);
truthy('a short pincode is refused', validatePincode('1100') !== null);
truthy('service area is named', SERVICE_AREA_LABEL.length > 0);

/* ---------- pre-order lead time ---------- */

check('thaali needs a day', leadTimeForProduct('lb-thaali-56'), 1);
check('a pastry needs no notice', leadTimeForProduct('lb-pastry-truffle'), 0);
check('cart takes the longest lead time', leadTimeForCart(['lb-pastry-truffle', 'lb-thaali-56']), 1);
check('an everyday cart is same-day', leadTimeForCart(['lb-bread-wheat']), 0);
check('empty cart is same-day', leadTimeForCart([]), 0);
check('same-day reads as Today', dayLabel(0), 'Today');
check('one day ahead reads as Tomorrow', dayLabel(1), 'Tomorrow');

/* ---------- launch readiness ---------- */

const warnings = [];
if (!hasPhone) warnings.push('STORE.phone is empty - customers cannot contact the bakery');
if (!hasFssai) warnings.push('STORE.fssai is empty - required for a food business in India');
if (STORE.pincode !== '110058') warnings.push('STORE.pincode is not 110058');

/* ---------- report ---------- */

console.log('');
if (failures.length === 0) {
  console.log(`PASS  ${passed} checks`);
} else {
  console.log(`FAIL  ${failures.length} of ${passed + failures.length} checks\n`);
  failures.forEach((f) => console.log('  ' + f));
}

if (warnings.length) {
  console.log('\nNot yet filled in:');
  warnings.forEach((w) => console.log('  ! ' + w));
}
console.log('');

/* exitCode rather than exit(): a hard exit trips a libuv assertion on Windows
   while the TypeScript loader still has handles open. */
process.exitCode = failures.length === 0 ? 0 : 1;
