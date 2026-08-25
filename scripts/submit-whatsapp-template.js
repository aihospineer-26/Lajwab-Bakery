/* Submits the OTP login template to Meta for approval.
 *
 * Faster and less error-prone than clicking through WhatsApp Manager: the
 * category, button type and language are the three things people get wrong,
 * and they are fixed here.
 *
 * Reads credentials from the environment so nothing sensitive is ever written
 * to a file or pasted into a chat.
 *
 *   WABA_ID   WhatsApp Manager -> Settings -> WhatsApp Business Account ID
 *   WA_TOKEN  A System User token with whatsapp_business_management
 *
 * Run:
 *   WABA_ID=xxx WA_TOKEN=yyy node scripts/submit-whatsapp-template.js
 *
 * PowerShell:
 *   $env:WABA_ID="xxx"; $env:WA_TOKEN="yyy"; node scripts/submit-whatsapp-template.js
 */

const fs = require('fs');
const path = require('path');

/* Loads .env.whatsapp if present, so credentials can sit in a gitignored file
   instead of being typed into a shell (where they land in history) or pasted
   into a chat (where they land in a transcript). The file is read here and
   never printed. */
function loadEnvFile() {
  const file = path.join(__dirname, '..', '.env.whatsapp');
  if (!fs.existsSync(file)) return false;
  const text = fs.readFileSync(file, 'utf8').split(String.fromCharCode(13)).join('');
  for (const line of text.split(String.fromCharCode(10))) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
  return true;
}

const usedFile = loadEnvFile();

const WABA_ID = process.env.WABA_ID;
const WA_TOKEN = process.env.WA_TOKEN;
const API_VERSION = process.env.WA_API_VERSION || 'v21.0';
const NAME = process.env.WA_TEMPLATE_NAME || 'otp_login';
const LANG = process.env.WA_TEMPLATE_LANG || 'en';

if (!WABA_ID || !WA_TOKEN) {
  console.error('\nMissing credentials.\n');
  console.error('  WABA_ID   WhatsApp Manager -> Settings -> WhatsApp Business Account ID');
  console.error('  WA_TOKEN  System User token with whatsapp_business_management\n');
  console.error('PowerShell:');
  console.error('  $env:WABA_ID="..."; $env:WA_TOKEN="..."; node scripts/submit-whatsapp-template.js\n');
  console.error('Bash:');
  console.error('  WABA_ID=... WA_TOKEN=... node scripts/submit-whatsapp-template.js\n');
  process.exit(1);
}

/* Authentication templates have a fixed shape: Meta owns the body copy, we only
   declare that the code is a parameter and that the button copies it. Sending
   custom body text here is the most common rejection reason. */
const template = {
  name: NAME,
  language: LANG,
  category: 'AUTHENTICATION',
  components: [
    {
      type: 'BODY',
      add_security_recommendation: true,
    },
    {
      type: 'FOOTER',
      code_expiration_minutes: 10,
    },
    {
      type: 'BUTTONS',
      buttons: [{ type: 'OTP', otp_type: 'COPY_CODE' }],
    },
  ],
};

async function main() {
  const url = `https://graph.facebook.com/${API_VERSION}/${WABA_ID}/message_templates`;

  console.log(`\nSubmitting "${NAME}" (${LANG}) to WABA ${WABA_ID}…\n`);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${WA_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(template),
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = body.error || {};
    console.error(`FAILED  HTTP ${res.status}`);
    console.error(`  ${err.message || JSON.stringify(body)}`);
    if (err.error_user_msg) console.error(`  ${err.error_user_msg}`);
    console.error('');

    if (res.status === 401 || err.code === 190) {
      console.error('  -> Token is invalid or expired. Use a System User token');
      console.error('     with expiry set to Never, not the 24-hour one.\n');
    } else if (err.code === 100 && /already exists/i.test(err.message || '')) {
      console.error(`  -> A template named "${NAME}" already exists.`);
      console.error('     Check its status in WhatsApp Manager; you may be done.\n');
    } else if (err.code === 200) {
      console.error('  -> Token lacks whatsapp_business_management permission.\n');
    }
    process.exit(1);
  }

  console.log('SUBMITTED');
  console.log(`  id:       ${body.id}`);
  console.log(`  status:   ${body.status || 'PENDING'}`);
  console.log(`  category: ${body.category || 'AUTHENTICATION'}\n`);
  console.log('Authentication templates are usually approved within minutes.');
  console.log('Check progress: WhatsApp Manager -> Message Templates\n');
  console.log('Once APPROVED, set the matching function secrets:');
  console.log(`  npx supabase secrets set WHATSAPP_TEMPLATE_NAME=${NAME} WHATSAPP_TEMPLATE_LANG=${LANG}\n`);
}

main().catch((e) => {
  console.error('\nRequest failed: ' + e.message + '\n');
  process.exit(1);
});
