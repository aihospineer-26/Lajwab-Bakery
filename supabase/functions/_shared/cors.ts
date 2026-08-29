/* Browsers preflight any POST carrying an Authorization or Content-Type header,
 * and a preflight that comes back without these headers makes the browser drop
 * the real request before it is ever sent. Both OTP bridges are called from the
 * web app, so both need this; whatsapp-otp does not, as Supabase Auth calls it
 * server-to-server.
 *
 * The origin is open because these endpoints are already deployed with
 * --no-verify-jwt: anyone can reach them with curl regardless, so a stricter
 * value would suggest a protection that is not there. What actually guards them
 * is the provider token in the body, which cannot be obtained without passing a
 * real OTP. No cookies are involved, so credentials stay off.
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

/** Answer the preflight, or null when this is the real request. */
export function preflight(req: Request): Response | null {
  if (req.method !== 'OPTIONS') return null;
  return new Response(null, { status: 204, headers: corsHeaders });
}
