/* Exchanges a verified Firebase phone token for a real Supabase session.
 *
 * Firebase Phone Auth owns its whole flow -- it generates, sends and verifies
 * its own code -- so it cannot be plugged in as a delivery channel the way the
 * WhatsApp hook is. It can only tell us "this person holds this number". This
 * function turns that statement into a Supabase session, which is what the rest
 * of the app is built on.
 *
 * Firebase is therefore used for OTP delivery only. Supabase stays the identity
 * system: user ids remain uuids, RLS keeps keying on auth.uid(), and nothing in
 * the schema changes. Swapping Firebase out for SMS once DLT clears means
 * deleting this function, not migrating data.
 *
 * The session is minted through generateLink + verifyOtp rather than by signing
 * a JWT by hand. A hand-signed token has no matching refresh token, so the
 * customer would be silently logged out when it expired.
 *
 * Deploy:  supabase functions deploy firebase-otp-bridge --no-verify-jwt
 * Secrets: FIREBASE_PROJECT_ID, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, preflight } from '../_shared/cors.ts';

const FIREBASE_PROJECT_ID = Deno.env.get('FIREBASE_PROJECT_ID') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

/* Google's public signing certificates. Rotated regularly, so they are fetched
   rather than pinned, and cached until the Cache-Control max-age Google sends. */
const CERT_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

let certCache: { keys: Record<string, string>; expiresAt: number } | null = null;

async function googleCerts(): Promise<Record<string, string>> {
  if (certCache && certCache.expiresAt > Date.now()) return certCache.keys;

  const res = await fetch(CERT_URL);
  if (!res.ok) throw new Error('Could not fetch Google signing certificates');

  const keys = (await res.json()) as Record<string, string>;
  const cacheControl = res.headers.get('cache-control') ?? '';
  const maxAge = Number(/max-age=(\d+)/.exec(cacheControl)?.[1] ?? '3600');
  certCache = { keys, expiresAt: Date.now() + maxAge * 1000 };
  return keys;
}

function base64UrlToBytes(input: string): Uint8Array {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

function pemToDer(pem: string): Uint8Array {
  const body = pem
    .replace(/-----BEGIN CERTIFICATE-----/, '')
    .replace(/-----END CERTIFICATE-----/, '')
    .replace(/\s/g, '');
  return Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
}

/* Pulls the RSA public key out of an X.509 certificate. Deno's WebCrypto
   imports SPKI, not full certificates, so the SubjectPublicKeyInfo has to be
   located inside the DER by hand. */
function spkiFromCertificate(der: Uint8Array): Uint8Array {
  // The SPKI block always begins with the RSA algorithm identifier.
  const marker = [0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01];
  for (let i = 0; i < der.length - marker.length; i++) {
    let hit = true;
    for (let j = 0; j < marker.length; j++) {
      if (der[i + j] !== marker[j]) { hit = false; break; }
    }
    if (!hit) continue;

    // Step back to the enclosing SEQUENCE header that opens the SPKI.
    const start = i - 4;
    const lengthByte = der[start + 1];
    let length: number;
    let headerLength: number;
    if (lengthByte < 0x80) {
      length = lengthByte;
      headerLength = 2;
    } else {
      const count = lengthByte & 0x7f;
      length = 0;
      for (let k = 0; k < count; k++) length = (length << 8) | der[start + 2 + k];
      headerLength = 2 + count;
    }
    return der.slice(start, start + headerLength + length);
  }
  throw new Error('Could not locate a public key in the certificate');
}

type FirebaseClaims = {
  aud: string;
  iss: string;
  sub: string;
  exp: number;
  phone_number?: string;
  firebase?: { sign_in_provider?: string };
};

async function verifyFirebaseToken(idToken: string): Promise<FirebaseClaims> {
  const parts = idToken.split('.');
  if (parts.length !== 3) throw new Error('Malformed token');

  const header = JSON.parse(new TextDecoder().decode(base64UrlToBytes(parts[0])));
  const claims = JSON.parse(
    new TextDecoder().decode(base64UrlToBytes(parts[1])),
  ) as FirebaseClaims;

  const certs = await googleCerts();
  const pem = certs[header.kid];
  if (!pem) throw new Error('Unknown signing key');

  const key = await crypto.subtle.importKey(
    'spki',
    spkiFromCertificate(pemToDer(pem)),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  );

  const signed = new TextEncoder().encode(parts[0] + '.' + parts[1]);
  const valid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    base64UrlToBytes(parts[2]),
    signed,
  );
  if (!valid) throw new Error('Signature does not verify');

  /* Every one of these matters. Without the audience check a token minted for
     any other Firebase project in the world would be accepted here. */
  if (claims.aud !== FIREBASE_PROJECT_ID) throw new Error('Token is for a different project');
  if (claims.iss !== 'https://securetoken.google.com/' + FIREBASE_PROJECT_ID) {
    throw new Error('Unexpected issuer');
  }
  if (claims.exp * 1000 < Date.now()) throw new Error('Token has expired');
  if (!claims.sub) throw new Error('Token has no subject');
  if (claims.firebase?.sign_in_provider !== 'phone') throw new Error('Not a phone sign-in');
  if (!claims.phone_number) throw new Error('Token carries no phone number');

  return claims;
}

/* auth.users requires an email for the magic-link exchange, but these accounts
   never receive mail -- the phone is the real identifier. The address is
   derived from the number so the same person always lands on the same row. */
function syntheticEmail(phone: string): string {
  return phone.replace(/[^0-9]/g, '') + '@phone.lajwabbakery.local';
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  const options = preflight(req);
  if (options) return options;

  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405);

  if (!FIREBASE_PROJECT_ID || !SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return json({ error: 'Function is not configured' }, 500);
  }

  let idToken: string | undefined;
  try {
    idToken = (await req.json())?.idToken;
  } catch {
    return json({ error: 'Body must be JSON' }, 400);
  }
  if (!idToken) return json({ error: 'Missing idToken' }, 400);

  let claims: FirebaseClaims;
  try {
    claims = await verifyFirebaseToken(idToken);
  } catch (err) {
    /* Deliberately vague to the caller; the detail goes to the logs. */
    console.error('Token rejected:', (err as Error).message);
    return json({ error: 'Could not verify that sign-in' }, 401);
  }

  const phone = claims.phone_number!;
  const email = syntheticEmail(phone);
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  /* Create on first sign-in; an existing row is reused so the customer keeps
     their orders and addresses. */
  const { error: createError } = await admin.auth.admin.createUser({
    phone: phone.replace('+', ''),
    email,
    phone_confirm: true,
    email_confirm: true,
  });
  if (createError && !/already/i.test(createError.message)) {
    console.error('createUser failed:', createError.message);
    return json({ error: 'Could not prepare the account' }, 500);
  }

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });
  if (linkError || !link?.properties?.hashed_token) {
    console.error('generateLink failed:', linkError?.message);
    return json({ error: 'Could not start the session' }, 500);
  }

  /* The client exchanges this for a real session, refresh token included. */
  return json({ tokenHash: link.properties.hashed_token });
});
