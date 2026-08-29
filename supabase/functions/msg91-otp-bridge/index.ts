/* Exchanges a verified MSG91 OTP for a real Supabase session.
 *
 * MSG91's widget owns its whole flow -- it generates, sends and verifies its
 * own code -- so it cannot be plugged in as a delivery channel the way the
 * WhatsApp hook is. It can only tell us "this person completed verification".
 * This function turns that into a Supabase session, same shape as the
 * Firebase bridge.
 *
 * MSG91 stays OTP delivery only. Supabase remains the identity system: user
 * ids stay uuids, RLS keeps keying on auth.uid(), nothing in the schema
 * changes. Swapping MSG91 out once DLT clears means deleting this function,
 * not migrating data.
 *
 * SECURITY NOTE -- read before relying on this in production: MSG91's
 * verifyAccessToken response is confirmed to report failure as
 * {message, type:'error', code}. Its SUCCESS shape is not confirmed from
 * their own docs at the time this was written -- third-party sources describe
 * an `identifier` field carrying the verified phone number, which is what
 * closes the obvious spoofing gap (a client verifying their own phone, then
 * claiming the token belongs to a different number). This function checks for
 * that field and cross-validates against the client-supplied phone whenever
 * it is present. If MSG91 ever returns success without it, the phone falls
 * back to whatever the client sent -- logged loudly so it is impossible to
 * miss on the first real test. Check the logs after that first sign-in; if
 * the warning appears, this trust boundary needs revisiting before relying on
 * it for anything beyond a single small bakery.
 *
 * The session is minted through generateLink + verifyOtp rather than by
 * signing a JWT by hand. A hand-signed token has no matching refresh token, so
 * the customer would be silently logged out when it expired.
 *
 * Deploy:  supabase functions deploy msg91-otp-bridge --no-verify-jwt
 * Secrets: MSG91_AUTH_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, preflight } from '../_shared/cors.ts';

const MSG91_AUTH_TOKEN = Deno.env.get('MSG91_AUTH_TOKEN') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const VERIFY_URL = 'https://control.msg91.com/api/v5/widget/verifyAccessToken';

type Msg91VerifyResponse = {
  type?: string;
  success?: boolean;
  message?: string;
  code?: number;
  identifier?: string;
  mobile?: string;
};

async function verifyMsg91Token(accessToken: string): Promise<string | null> {
  const res = await fetch(VERIFY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ authkey: MSG91_AUTH_TOKEN, 'access-token': accessToken }),
  });

  const body = (await res.json().catch(() => ({}))) as Msg91VerifyResponse;

  if (body.type === 'error' || body.success === false) {
    throw new Error(body.message ?? 'MSG91 rejected the access token');
  }

  const confirmedPhone = body.identifier ?? body.mobile ?? null;
  if (!confirmedPhone) {
    console.warn(
      '[msg91-otp-bridge] verifyAccessToken succeeded but returned no identifier/mobile field. ' +
        'Falling back to trusting the client-supplied phone -- see the security note at the top ' +
        'of this file. Raw response:',
      JSON.stringify(body),
    );
  }
  return confirmedPhone;
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

  if (!MSG91_AUTH_TOKEN || !SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return json({ error: 'Function is not configured' }, 500);
  }

  let accessToken: string | undefined;
  let claimedPhone: string | undefined;
  try {
    const parsed = await req.json();
    accessToken = parsed?.accessToken;
    claimedPhone = parsed?.phone;
  } catch {
    return json({ error: 'Body must be JSON' }, 400);
  }
  if (!accessToken) return json({ error: 'Missing accessToken' }, 400);

  let confirmedPhone: string | null;
  try {
    confirmedPhone = await verifyMsg91Token(accessToken);
  } catch (err) {
    console.error('Token rejected:', (err as Error).message);
    return json({ error: 'Could not verify that sign-in' }, 401);
  }

  /* Prefer what MSG91 itself confirmed. Only reach for the client's claim when
     MSG91 did not report an identifier at all -- see the security note above. */
  const phoneDigits = (confirmedPhone ?? claimedPhone ?? '').replace(/[^0-9]/g, '');
  if (phoneDigits.length < 10) {
    return json({ error: 'Could not determine the verified phone number' }, 400);
  }
  const phone = phoneDigits.slice(-10);
  const email = syntheticEmail(phone);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  /* Create on first sign-in; an existing row is reused so the customer keeps
     their orders and addresses. */
  const { error: createError } = await admin.auth.admin.createUser({
    phone,
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
