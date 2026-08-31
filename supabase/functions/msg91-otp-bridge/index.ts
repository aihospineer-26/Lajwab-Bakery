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
 * SECURITY -- this function decides who someone is, so it fails closed.
 *
 * The phone number is taken only from MSG91's own verifyAccessToken response.
 * The number the client sends is treated as a claim to be checked, never as a
 * source of truth. An earlier version fell back to trusting that claim when
 * MSG91 returned no identifier, which was an account-takeover vector: verify
 * your own number, then post the token with somebody else's number attached and
 * receive a session for their account. It also had no check on the HTTP status,
 * so an MSG91 outage returning a non-JSON body parsed to {}, matched no error
 * branch, and fell through to that same fallback -- turning a third-party
 * outage into an authentication bypass.
 *
 * Both are closed. If MSG91 does not name the verified number, sign-in is
 * refused and the raw response is logged. Should that ever fire, the fix is to
 * add MSG91's actual field name to PHONE_FIELDS below -- never to trust the
 * client again.
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

type Msg91VerifyResponse = Record<string, unknown>;

/* Fields MSG91 has been observed or documented to carry the verified number in,
   checked first. All of them come from MSG91; none is client input.

   `message` is on the list because that is where MSG91 actually puts it. The
   whole response is only ever {message, type, code} -- verified against the
   live endpoint -- so on success the number has nowhere else to be. Leaving it
   out is what refused a genuine sign-in: verifyAccessToken returned success,
   nothing here matched, and the bridge failed closed on a real customer. */
const PHONE_FIELDS = ['identifier', 'mobile', 'phone', 'number', 'msisdn', 'contact', 'message'];

/* A phone number, not merely a string with ten digits in it.
 *
 * The old test was "strip non-digits, is it 10 long?", which a JWT passes
 * easily -- and MSG91's message field can hold a token rather than a number.
 * That would have minted a session for ten digits scraped out of base64.
 * Require the whole value to be a dialable number: optional +, then digits with
 * separators only, 10 to 15 digits in total (E.164's own ceiling). Letters
 * anywhere -- a JWT, a sentence, an error -- fail. */
function asPhone(value: unknown): string | null {
  const raw = typeof value === 'number' ? String(value) : typeof value === 'string' ? value.trim() : '';
  if (!raw) return null;
  if (!/^\+?[0-9][0-9\s\-().]*$/.test(raw)) return null;
  const digits = raw.replace(/[^0-9]/g, '');
  return digits.length >= 10 && digits.length <= 15 ? raw : null;
}

function extractPhone(body: Msg91VerifyResponse): string | null {
  const containers: Record<string, unknown>[] = [body];
  for (const nest of ['data', 'result', 'payload']) {
    const inner = body[nest];
    if (inner && typeof inner === 'object') containers.push(inner as Record<string, unknown>);
  }
  for (const container of containers) {
    for (const field of PHONE_FIELDS) {
      const hit = asPhone(container[field]);
      if (hit) return hit;
    }
  }
  /* Last resort: any value in the response that is unambiguously a phone
     number. MSG91 renaming the field must not lock the bakery's customers out
     again -- and asPhone is strict enough that nothing else can qualify. */
  for (const container of containers) {
    for (const value of Object.values(container)) {
      const hit = asPhone(value);
      if (hit) return hit;
    }
  }
  return null;
}

/** The verified number, straight from MSG91. Throws rather than guessing. */
async function verifyMsg91Token(accessToken: string): Promise<string> {
  let res: Response;
  try {
    res = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ authkey: MSG91_AUTH_TOKEN, 'access-token': accessToken }),
    });
  } catch (err) {
    throw new Error('Could not reach MSG91: ' + (err as Error).message);
  }

  const raw = await res.text();
  let body: Msg91VerifyResponse = {};
  try {
    body = JSON.parse(raw) as Msg91VerifyResponse;
  } catch {
    /* A non-JSON body means MSG91 is unwell. It must never read as success. */
    throw new Error('MSG91 returned a non-JSON response (HTTP ' + res.status + ')');
  }

  /* Checked before the payload is read at all: an HTTP failure is a failure
     however the body happens to be shaped. */
  if (!res.ok) {
    throw new Error('MSG91 returned HTTP ' + res.status + ': ' + String(body.message ?? raw.slice(0, 120)));
  }

  if (body.type === 'error' || body.success === false) {
    throw new Error(String(body.message ?? 'MSG91 rejected the access token'));
  }

  const confirmedPhone = extractPhone(body);
  if (!confirmedPhone) {
    /* Fail closed. Trusting the client's claim here would let anyone who can
       verify one number mint a session for any other. */
    console.error(
      '[msg91-otp-bridge] verifyAccessToken succeeded but names no verified number. ' +
        'Refusing the sign-in rather than trusting the client. Add the correct field to ' +
        'PHONE_FIELDS and redeploy. Raw response:',
      raw.slice(0, 500),
    );
    /* The field names travel back with the error -- names only, never values.
       Diagnosing this the first time meant reading the log by hand while the
       customer sat on a burnt OTP; the next time it should be in the failure
       itself. */
    throw new Error(
      'MSG91 did not report which number was verified (fields seen: ' +
        Object.keys(body).join(', ') + ')',
    );
  }
  return confirmedPhone;
}

const lastTen = (value: string) => value.replace(/[^0-9]/g, '').slice(-10);

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

  let confirmedPhone: string;
  try {
    confirmedPhone = await verifyMsg91Token(accessToken);
  } catch (err) {
    console.error('Token rejected:', (err as Error).message);
    return json({ error: 'Could not verify that sign-in' }, 401);
  }

  const phone = lastTen(confirmedPhone);
  if (phone.length < 10) {
    console.error('MSG91 reported an unusable number:', confirmedPhone);
    return json({ error: 'Could not determine the verified phone number' }, 400);
  }

  /* The client's number is a claim, and the only thing it is used for is
     catching a mismatch. A token verified for one number arriving alongside a
     different one is somebody trying the takeover this function is built to
     refuse, so it is logged as such rather than quietly ignored. */
  if (claimedPhone && lastTen(claimedPhone) !== phone) {
    console.error(
      '[msg91-otp-bridge] REFUSED: token verified for a different number than the one claimed. ' +
        'claimed ...' + lastTen(claimedPhone).slice(-4) + ', verified ...' + phone.slice(-4),
    );
    return json({ error: 'Could not verify that sign-in' }, 401);
  }

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
