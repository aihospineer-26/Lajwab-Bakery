/* Supabase "Send SMS Hook".
 *
 * Supabase generates, stores and verifies the OTP itself; this function only
 * delivers it. That keeps expiry, rate limiting and brute-force protection on
 * Supabase's side rather than something we reimplement.
 *
 * Hook payload:  { user: { phone }, sms: { otp } }
 * Deploy:        supabase functions deploy whatsapp-otp --no-verify-jwt
 *
 * --no-verify-jwt is required: the hook authenticates with a Standard Webhooks
 * signature, not a Supabase JWT. The signature check below is what secures it,
 * so do not deploy without SEND_SMS_HOOK_SECRET set.
 */

const GRAPH_VERSION = Deno.env.get('WHATSAPP_API_VERSION') ?? 'v21.0';
const PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') ?? '';
const ACCESS_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN') ?? '';
const TEMPLATE_NAME = Deno.env.get('WHATSAPP_TEMPLATE_NAME') ?? 'otp_login';
const TEMPLATE_LANG = Deno.env.get('WHATSAPP_TEMPLATE_LANG') ?? 'en';
/* Meta's authentication templates carry a copy-code button, and its parameter
   is mandatory when present. Set to "false" only for a plain body template. */
const HAS_BUTTON = (Deno.env.get('WHATSAPP_TEMPLATE_HAS_BUTTON') ?? 'true') !== 'false';
const HOOK_SECRET = Deno.env.get('SEND_SMS_HOOK_SECRET') ?? '';

function fail(message: string, httpCode = 500) {
  return new Response(JSON.stringify({ error: { http_code: httpCode, message } }), {
    status: httpCode,
    headers: { 'Content-Type': 'application/json' },
  });
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToBase64(bytes: ArrayBuffer): string {
  const view = new Uint8Array(bytes);
  let binary = '';
  for (let i = 0; i < view.length; i++) binary += String.fromCharCode(view[i]);
  return btoa(binary);
}

/** Constant-time compare so a wrong signature leaks nothing through timing. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/* Standard Webhooks: HMAC-SHA256 over "<id>.<timestamp>.<body>". */
async function verifySignature(req: Request, body: string): Promise<boolean> {
  const id = req.headers.get('webhook-id');
  const timestamp = req.headers.get('webhook-timestamp');
  const signatureHeader = req.headers.get('webhook-signature');
  if (!id || !timestamp || !signatureHeader) return false;

  /* Reject replays of an old, previously valid delivery. */
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) return false;

  const secret = HOOK_SECRET.replace(/^v1,\s*/, '').replace(/^whsec_/, '');
  const key = await crypto.subtle.importKey(
    'raw',
    base64ToBytes(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signed = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(id + '.' + timestamp + '.' + body),
  );
  const expected = bytesToBase64(signed);

  /* The header may carry several space-separated versioned signatures. */
  return signatureHeader
    .split(' ')
    .map((part) => part.split(',')[1] ?? '')
    .some((candidate) => safeEqual(candidate, expected));
}

async function sendWhatsApp(toE164: string, otp: string): Promise<string | null> {
  const components: unknown[] = [
    { type: 'body', parameters: [{ type: 'text', text: otp }] },
  ];
  if (HAS_BUTTON) {
    components.push({
      type: 'button',
      sub_type: 'url',
      index: '0',
      parameters: [{ type: 'text', text: otp }],
    });
  }

  const response = await fetch(
    'https://graph.facebook.com/' + GRAPH_VERSION + '/' + PHONE_NUMBER_ID + '/messages',
    {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + ACCESS_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        // Graph wants the E.164 number without the leading '+'
        to: toE164.replace(/^\+/, ''),
        type: 'template',
        template: {
          name: TEMPLATE_NAME,
          language: { code: TEMPLATE_LANG },
          components,
        },
      }),
    },
  );

  if (response.ok) return null;
  const detail = await response.text();
  return 'WhatsApp API ' + response.status + ': ' + detail;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return fail('Method not allowed', 405);

  if (!HOOK_SECRET) return fail('SEND_SMS_HOOK_SECRET is not set', 500);
  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    return fail('WhatsApp credentials are not set', 500);
  }

  const body = await req.text();
  if (!(await verifySignature(req, body))) return fail('Invalid webhook signature', 401);

  let payload: { user?: { phone?: string }; sms?: { otp?: string } };
  try {
    payload = JSON.parse(body);
  } catch {
    return fail('Malformed payload', 400);
  }

  const phone = payload.user?.phone;
  const otp = payload.sms?.otp;
  if (!phone || !otp) return fail('Payload missing phone or otp', 400);

  /* Never log `otp` — these logs are readable in the Supabase dashboard. */
  const sendError = await sendWhatsApp(phone, otp);
  if (sendError) {
    console.error('whatsapp-otp delivery failed', sendError);
    return fail('Could not send the code. Please try again.', 502);
  }

  return new Response('{}', {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
