/* Launch preflight -- checks the LIVE server, not the source.
 *
 * verify.mjs reads the code. This reads what is actually deployed, because the
 * two drifted badly once: the app called place_order(items, details) while the
 * database still only had the one-argument version, and demo mode hid it by
 * writing orders to the phone instead. Both faults were invisible in the app.
 *
 * Run after every launch step. Exit code is non-zero while blockers remain.
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const groups = [];
let blockers = 0;

function group(title) {
  const g = { title, rows: [] };
  groups.push(g);
  return {
    ok: (text) => g.rows.push({ state: 'ok', text }),
    warn: (text, fix) => g.rows.push({ state: 'warn', text, fix }),
    fail: (text, fix) => {
      blockers++;
      g.rows.push({ state: 'fail', text, fix });
    },
  };
}

function readEnv() {
  const file = path.join(ROOT, '.env.local');
  if (!fs.existsSync(file)) return null;
  const env = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

/* ---------------------------------------------------------------- config */

const env = readEnv();
const cfg = group('App configuration');

if (!env) {
  cfg.fail('.env.local is missing', 'copy .env.example to .env.local and fill it in');
} else {
  if (env.EXPO_PUBLIC_SUPABASE_URL && env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
    cfg.ok('Supabase URL and key are set');
  } else {
    cfg.fail('Supabase URL or key is missing', 'add both to .env.local');
  }

  if (env.EXPO_PUBLIC_OTP_MODE === 'demo') {
    cfg.fail(
      'EXPO_PUBLIC_OTP_MODE=demo -- orders save to the phone and never reach the bakery',
      'delete that line from .env.local, then restart with: npx expo start -c',
    );
  } else {
    cfg.ok('demo mode is off -- orders go to the server');
  }
}

const channel = env?.EXPO_PUBLIC_OTP_CHANNEL || 'whatsapp';

/* ----------------------------------------------------------- store details */

const store = group('Bakery details');
const storeSrc = fs.readFileSync(path.join(ROOT, 'src/data/store.ts'), 'utf8');

const STORE_FIELDS = [
  ['phone', 'customers cannot call the bakery', true],
  ['fssai', 'required by law on an Indian food app', true],
  ['whatsapp', 'the WhatsApp support button stays hidden', false],
];

for (const [field, why, required] of STORE_FIELDS) {
  const m = storeSrc.match(new RegExp('^\\s*' + field + ":\\s*'([^']*)'", 'm'));
  const value = m ? m[1].trim() : '';
  if (value) {
    store.ok(field + ' is set');
  } else if (required) {
    store.fail('STORE.' + field + ' is empty -- ' + why, 'fill it in src/data/store.ts');
  } else {
    store.warn('STORE.' + field + ' is empty -- ' + why, 'optional: fill it in src/data/store.ts');
  }
}

/* --------------------------------------------------------------- database */

const url = env?.EXPO_PUBLIC_SUPABASE_URL;
const key = env?.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (url && key) {
  const headers = { apikey: key, Authorization: 'Bearer ' + key };
  const db = group('Database');

  const get = (pathname, extra) =>
    fetch(url + pathname, { headers: { ...headers, ...extra } });

  let reachable = true;
  try {
    const r = await get('/rest/v1/products?select=id&limit=1', {
      Prefer: 'count=exact',
      Range: '0-0',
    });
    if (r.ok) {
      const total = (r.headers.get('content-range') || '').split('/')[1];
      db.ok('catalog is live (' + total + ' products)');
    } else {
      db.fail('cannot read the products table', 'check migration 001 ran and RLS allows public reads');
    }
  } catch (err) {
    reachable = false;
    db.warn('cannot reach Supabase (' + err.message + ')', 'check your internet, then run this again');
  }

  if (reachable) {
    const cols = await get(
      '/rest/v1/orders?select=delivery_address,payment_method,coupon_code,discount,delivery_fee&limit=1',
    );
    if (cols.ok) {
      db.ok('migration 002 columns are present');
    } else {
      db.fail(
        'migration 002 is NOT applied -- orders have no delivery address',
        'open the Supabase SQL editor, paste all of supabase/migrations/002_order_details.sql, press Run',
      );
    }

    const coupons = await get('/rest/v1/coupons?select=code&limit=1');
    if (coupons.ok) {
      db.ok('coupons table exists');
    } else {
      db.fail(
        'coupons table is missing -- FIRST50 cannot be checked server-side',
        'part of migration 002',
      );
    }

    const rpc = await fetch(url + '/rest/v1/rpc/place_order', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [], details: {} }),
    });
    /* 404 means PostgREST found no function with this signature. Any other
       status means it exists and merely rejected the empty test payload. */
    if (rpc.status === 404) {
      db.fail(
        'place_order(items, details) does not exist -- every checkout returns 404',
        'part of migration 002',
      );
    } else {
      db.ok('place_order accepts order details');
    }

    /* ---------------------------------------------------------- OTP delivery */

    const otp = group('OTP delivery (channel: ' + channel + ')');
    const needed =
      channel === 'firebase' ? 'firebase-otp-bridge' : channel === 'demo' ? null : 'whatsapp-otp';

    if (channel === 'firebase') {
      /* Native reads google-services.json; the website reads these four. Both
         are needed to cover the APK and the web deploy at once. */
      const WEB_KEYS = [
        'EXPO_PUBLIC_FIREBASE_API_KEY',
        'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
        'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
        'EXPO_PUBLIC_FIREBASE_APP_ID',
      ];
      /* Tagged by surface, because the two halves fail independently and you
         will usually be working on one of them at a time. Neither substitutes
         for the other: the website ignores google-services.json, and the APK
         ignores the four values below. */
      const missing = WEB_KEYS.filter((k) => !env?.[k]);
      if (missing.length === 0) {
        otp.ok('[web] Firebase config is set -- the website can sign people in');
      } else {
        otp.fail(
          '[web] Firebase config missing (' + missing.length + ' of 4) -- website login will not work',
          'Firebase console -> Project settings -> Your apps -> Web app, then fill these in .env.local: ' +
            missing.join(', '),
        );
      }

      /* Firebase ships new projects with an SMS region policy that blocks
         India, and nothing in the console flags it -- phone sign-in reads as
         enabled while every send fails. The dummy reCAPTCHA token is rejected
         before any SMS is sent, so this probe costs nothing and never texts
         anyone; we only care which error comes back. */
      if (env?.EXPO_PUBLIC_FIREBASE_API_KEY) {
        try {
          const res = await fetch(
            'https://identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key=' +
              env.EXPO_PUBLIC_FIREBASE_API_KEY,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ phoneNumber: '+919999999999', recaptchaToken: 'preflight' }),
            },
          );
          const msg = (await res.json())?.error?.message ?? '';
          /* Only a reCAPTCHA complaint proves the provider is live: it means
             Google got all the way to validating our deliberately fake token
             and had no earlier objection. Anything else is treated as unknown
             rather than fine -- an earlier version passed BILLING_NOT_ENABLED
             as healthy, which is exactly the false all-clear this tool exists
             to prevent. */
          if (/captcha/i.test(msg)) {
            otp.ok('[web] Firebase will send SMS to India');
          } else if (/BILLING_NOT_ENABLED/.test(msg)) {
            otp.fail(
              '[web] Firebase needs a billing plan before it will send any SMS',
              'Firebase console -> the gear -> Usage and billing -> Modify plan -> Blaze. ' +
                'Or switch channel: EXPO_PUBLIC_OTP_CHANNEL=whatsapp',
            );
          } else if (/region/i.test(msg)) {
            otp.fail(
              '[web] Firebase is blocking SMS to India -- no customer can receive a code',
              'Firebase console -> Authentication -> Settings -> SMS region policy -> Allow -> add India',
            );
          } else if (/OPERATION_NOT_ALLOWED/.test(msg)) {
            otp.fail(
              '[web] Firebase phone sign-in is switched off',
              'Firebase console -> Authentication -> Sign-in method -> Phone -> Enable',
            );
          } else if (/QUOTA|EXCEEDED/i.test(msg)) {
            otp.fail('[web] Firebase SMS quota is exhausted', 'check Usage and billing in the Firebase console');
          } else {
            otp.warn(
              '[web] Firebase returned an unrecognised error: ' + (msg || '(empty)'),
              'send me this line -- it is not a known failure',
            );
          }
        } catch {
          otp.warn('could not reach Google to check the SMS region policy', 'check again when online');
        }
      }

      if (fs.existsSync(path.join(ROOT, 'google-services.json'))) {
        otp.ok('[apk] google-services.json present -- the APK can sign people in');
      } else {
        otp.fail(
          '[apk] google-services.json missing -- phone login fails silently in the APK',
          'only blocks the APK, not the website. Download it from the Firebase console into ' +
            'the project root, and add your SHA-1 there first',
        );
      }
    }

    if (!needed) {
      otp.warn(
        'channel is demo -- no real codes are sent',
        'set EXPO_PUBLIC_OTP_CHANNEL=firebase or whatsapp for launch',
      );
    } else {
      const fn = await fetch(url + '/functions/v1/' + needed, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: '{}',
      });
      if (fn.status === 404) {
        otp.fail(
          needed + ' is not deployed -- nobody can sign in',
          'npx supabase functions deploy ' + needed,
        );
      } else {
        otp.ok(needed + ' is deployed');
      }
    }
  }
}

/* ----------------------------------------------------------------- report */

const MARK = { ok: ' ok ', warn: ' !  ', fail: ' XX ' };

console.log('\nLAUNCH PREFLIGHT\n');
for (const g of groups) {
  console.log('  ' + g.title);
  for (const row of g.rows) {
    console.log('  ' + MARK[row.state] + ' ' + row.text);
    if (row.fix) console.log('         -> ' + row.fix);
  }
  console.log('');
}

if (blockers === 0) {
  console.log('  READY. No blockers.\n');
} else {
  console.log('  ' + blockers + ' blocker' + (blockers === 1 ? '' : 's') + ' left before launch.\n');
  process.exitCode = 1;
}
