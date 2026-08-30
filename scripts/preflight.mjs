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

/* fssai is deliberately not here any more: it lives in store_settings so the
   bakery can enter it from the dashboard without a rebuild, and is checked
   against the database further down. */
const STORE_FIELDS = [
  ['phone', 'customers cannot call the bakery', true],
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

    /* ---------------------------------------------------------- migration 004
       This block exists because 003 sat in the repo unapplied for days while
       every check above stayed green: the app collected a name and a verified
       phone, sent both, and the older place_order dropped them, so orders
       reached the bakery with nobody to ring. Checking columns is not enough --
       a schema can carry the columns while an older function ignores them --
       so each item below tests the behaviour that actually has to hold. */

    const contact = await get('/rest/v1/orders?select=customer_name,customer_phone&limit=1');
    if (contact.ok) {
      db.ok('orders carry the customer name and phone');
    } else {
      db.fail(
        'migration 004 is NOT applied -- orders reach the bakery with no name and no phone',
        'open the Supabase SQL editor, paste all of supabase/migrations/004_remediation.sql, press Run',
      );
    }

    const reqId = await get('/rest/v1/orders?select=request_id&limit=1');
    if (reqId.ok) {
      db.ok('checkout idempotency key is present');
    } else {
      db.fail(
        'orders.request_id is missing -- a double-tapped checkout places two orders',
        'part of migration 004',
      );
    }

    const pins = await get('/rest/v1/serviceable_pincodes?select=pincode&active=is.true');
    if (pins.ok) {
      const rows = await pins.json().catch(() => []);
      if (Array.isArray(rows) && rows.length > 0) {
        db.ok('delivery area is set server-side (' + rows.map((p) => p.pincode).join(', ') + ')');
      } else {
        db.fail(
          'serviceable_pincodes is empty -- every order will be refused as out of area',
          'insert the pincodes the bakery delivers to',
        );
      }
    } else {
      db.fail(
        'serviceable_pincodes is missing -- the delivery area is enforced only in the app',
        'part of migration 004',
      );
    }

    /* The columns can exist while an older place_order ignores them, so prove a
       function 004 introduced is actually installed and behaves. This runs with
       the anon key and no session, which is as deep as a launch checklist can
       reach -- place_order itself refuses an unauthenticated caller before any
       validation, so it cannot be probed from here. The behaviour of the order
       path proper is covered by the end-to-end suite, which signs in. */
    const legal = await get('/rest/v1/store_settings?select=fssai,gstin');
    if (legal.ok) {
      const rows = await legal.json().catch(() => []);
      const licence = (rows?.[0]?.fssai ?? '').trim();
      if (licence) {
        db.ok('FSSAI licence is set (' + licence + ')');
      } else {
        db.fail(
          'FSSAI licence number is not set -- required by law on an Indian food app',
          'the bakery enters it in the dashboard: Account tab -> Licence & registration',
        );
      }
    } else {
      db.fail(
        'store_settings is missing -- the bakery cannot enter their FSSAI licence',
        'part of migration 005',
      );
    }

    const norm = await fetch(url + '/rest/v1/rpc/normalise_mobile', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw: '+91 98765 43210' }),
    });
    const normBody = (await norm.text()).replace(/"/g, '').trim();
    if (norm.ok && normBody === '9876543210') {
      db.ok('phone normalisation is live (place_order is the 004 version)');
    } else if (norm.status === 404) {
      db.fail(
        'normalise_mobile is missing -- place_order is an older version that drops the customer phone',
        'open the Supabase SQL editor, paste all of supabase/migrations/004_remediation.sql, press Run',
      );
    } else {
      db.fail(
        'normalise_mobile returned ' + JSON.stringify(normBody) + ', expected "9876543210"',
        're-run supabase/migrations/004_remediation.sql',
      );
    }

    /* ------------------------------------------------------ customer sign-in */

    if (channel === 'none') {
      /* No OTP: every customer gets an anonymous session instead. Without the
         provider enabled they get no session at all, place_order refuses them,
         and checkout fails on the last tap. */
      const anon = group('Customer sign-in (anonymous, no OTP)');
      const r = await fetch(url + '/auth/v1/signup', {
        method: 'POST',
        headers: { apikey: key, 'Content-Type': 'application/json' },
        body: '{}',
      });
      if (r.ok) {
        anon.ok('anonymous sign-in works -- customers can check out without an account');
      } else {
        const body = await r.text();
        if (/anonymous_provider_disabled/.test(body)) {
          anon.fail(
            'anonymous sign-in is disabled -- nobody can place an order',
            'Supabase -> Authentication -> Providers -> Anonymous -> Enable',
          );
        } else {
          anon.fail('anonymous sign-in failed: ' + body.slice(0, 120), 'send me this line');
        }
      }

      const contact = await get('/rest/v1/orders?select=customer_name,customer_phone&limit=1');
      if (contact.ok) {
        anon.ok('orders carry the customer name and phone');
      } else {
        anon.fail(
          'migration 003 is not applied -- orders have no contact number',
          'run supabase/migrations/003_customer_contact.sql in the SQL editor',
        );
      }
    } else {

    /* ---------------------------------------------------------- OTP delivery */

    const otp = group('OTP delivery (channel: ' + channel + ')');
    const needed =
      channel === 'firebase' ? 'firebase-otp-bridge' :
      channel === 'msg91' ? 'msg91-otp-bridge' :
      channel === 'demo' ? null : 'whatsapp-otp';

    if (channel === 'msg91') {
      const MSG91_KEYS = ['EXPO_PUBLIC_MSG91_WIDGET_ID', 'EXPO_PUBLIC_MSG91_AUTH_TOKEN'];
      const missing = MSG91_KEYS.filter((k) => !env?.[k]);
      if (missing.length === 0) {
        otp.ok('MSG91 widget config is set');
      } else {
        otp.fail(
          'MSG91 widget config missing (' + missing.length + ' of 2)',
          'MSG91 dashboard -> OTP -> Widgets, then fill these in .env.local: ' + missing.join(', '),
        );
      }
      /* Confirmed on 29 Aug 2026 against a real number on the web build: code
         sent, verified, bridge exchanged it for a Supabase session, order
         placed. The Android path is a different one -- MSG91 runs inside a
         hidden WebView there -- and has never been exercised, so this stays a
         warning until an APK is tested on a real handset. */
      otp.warn(
        'MSG91 confirmed on web; the Android WebView path is still untested',
        'test sign-in on a real handset before shipping an APK -- this tool cannot trigger the widget itself',
      );
    }

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

    } /* end: OTP channels */
  }
}

/* ------------------------------------------------------- android release */
/* EAS Build uploads the project honouring .gitignore, and .env.local is
   ignored -- so an APK built without a committed .env ships with no Supabase
   URL and no MSG91 widget. It installs, opens to an empty catalogue and does
   nothing on sign-in, which reads as a code fault and is not one. Reproduced
   by building with both env files hidden: the bundle fell back to
   placeholder.supabase.co. */

const rel = group('Android release build');

const envFile = path.join(ROOT, '.env');
if (!fs.existsSync(envFile)) {
  rel.fail(
    '.env is missing -- an EAS build would ship with no backend configuration',
    'copy the EXPO_PUBLIC_* values from .env.local into a committed .env',
  );
} else {
  const committed = {};
  const NEWLINE = String.fromCharCode(10);
  for (const rawLine of fs.readFileSync(envFile, 'utf8').split(NEWLINE)) {
    const line = rawLine.trim();
    const eq = line.indexOf('=');
    if (line.startsWith('#') || eq < 1) continue;
    committed[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
  const needed = ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY'];
  if (channel === 'msg91') {
    needed.push('EXPO_PUBLIC_MSG91_WIDGET_ID', 'EXPO_PUBLIC_MSG91_AUTH_TOKEN');
  }
  const absent = needed.filter((k) => !committed[k]);
  if (absent.length === 0) {
    rel.ok('.env carries the build-time config an APK needs');
  } else {
    rel.fail(
      '.env is missing ' + absent.join(', ') + ' -- the APK would have no backend',
      'add them to .env; they are EXPO_PUBLIC_* and already public in any build',
    );
  }

  if (env) {
    const drift = needed.filter((k) => env[k] && committed[k] && env[k] !== committed[k]);
    if (drift.length) {
      rel.fail(
        '.env and .env.local disagree on ' + drift.join(', '),
        'the APK would be built from different settings than you test locally',
      );
    }
  }
}

const appJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8')).expo ?? {};
if (appJson.android && appJson.android.package) {
  rel.ok('android package id is set (' + appJson.android.package + ')');
} else {
  rel.fail('android.package is not set -- the build has no application id', 'set it in app.json');
}
if (appJson.version && appJson.android && appJson.android.versionCode) {
  rel.ok('version ' + appJson.version + ' (versionCode ' + appJson.android.versionCode + ')');
} else {
  rel.warn('version or versionCode is unset', 'set both in app.json before the first upload');
}
if (appJson.android && (appJson.android.permissions || []).includes('INTERNET')) {
  rel.ok('INTERNET permission is declared');
} else {
  rel.fail('INTERNET permission is missing -- the app cannot reach Supabase', 'add it to app.json');
}
if (appJson.scheme) {
  rel.ok('deep-link scheme is set (' + appJson.scheme + '://)');
} else {
  rel.warn('no scheme set', 'needed if auth ever redirects back into the app');
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
