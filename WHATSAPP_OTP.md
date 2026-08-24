# WhatsApp OTP login — setup

The app signs in with a phone number and a 6-digit code delivered over WhatsApp.
Supabase generates, stores and verifies the code; the Edge Function in
`supabase/functions/whatsapp-otp/` only delivers it.

Until you complete this, the app runs in **demo mode** — no message is sent and
the code is shown on the OTP screen. Demo mode turns on automatically whenever
`EXPO_PUBLIC_SUPABASE_URL` is unset, so the flow is fully demonstrable today.

---

## 1 · Meta: create the authentication template

WhatsApp Manager → **Message templates** → Create.

| Field | Value |
|---|---|
| Category | **Authentication** (not Utility or Marketing) |
| Name | `otp_login` |
| Language | English (`en`) — must match `WHATSAPP_TEMPLATE_LANG` |
| Body | The stock authentication body — Meta fills the code in |
| Button | **Copy code** |

Authentication templates are usually approved within minutes.

Note the **Phone number ID** from WhatsApp Manager → API Setup — it is not the
phone number itself. Generate a **permanent** System User access token there
too; the default one expires in 24 hours and will silently break login.

## 2 · Supabase: enable phone auth

Authentication → Providers → **Phone** → enable.

Leave the built-in SMS provider fields blank. Do **not** enable "Confirm phone"
with an SMS provider — the hook below replaces it.

## 3 · Deploy the Edge Function

```bash
supabase functions deploy whatsapp-otp --no-verify-jwt
```

`--no-verify-jwt` is required. The hook authenticates with a Standard Webhooks
signature rather than a Supabase JWT, and the function verifies that signature
itself.

## 4 · Set the function secrets

```bash
supabase secrets set \
  WHATSAPP_PHONE_NUMBER_ID=... \
  WHATSAPP_ACCESS_TOKEN=... \
  WHATSAPP_TEMPLATE_NAME=otp_login \
  WHATSAPP_TEMPLATE_LANG=en
```

## 5 · Register the hook

Authentication → **Hooks** → Send SMS hook → enable → point it at the deployed
function URL. Supabase shows a signing secret (`v1,whsec_…`). Set it:

```bash
supabase secrets set SEND_SMS_HOOK_SECRET='v1,whsec_...'
```

The function returns 401 on every request until this matches.

## 6 · Point the app at the project

`.env.local`:

```
EXPO_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```

Setting these turns demo mode off. To force it back on while testing, add
`EXPO_PUBLIC_OTP_MODE=demo`.

---

## Environment variables

| Variable | Where | Default | Notes |
|---|---|---|---|
| `WHATSAPP_PHONE_NUMBER_ID` | function secret | — | From WhatsApp Manager → API Setup |
| `WHATSAPP_ACCESS_TOKEN` | function secret | — | Use a permanent System User token |
| `WHATSAPP_TEMPLATE_NAME` | function secret | `otp_login` | |
| `WHATSAPP_TEMPLATE_LANG` | function secret | `en` | Must match the approved template |
| `WHATSAPP_TEMPLATE_HAS_BUTTON` | function secret | `true` | Set `false` only for a body-only template |
| `WHATSAPP_API_VERSION` | function secret | `v21.0` | |
| `SEND_SMS_HOOK_SECRET` | function secret | — | From the Supabase Hooks screen |
| `EXPO_PUBLIC_OTP_MODE` | `.env.local` | unset | `demo` forces on-device codes |

---

## Notes

- **The WABA is currently yours, not the bakery's.** Codes will arrive from your
  business number. For production the bakery needs its own WABA, or you stay the
  sender. Only `WHATSAPP_PHONE_NUMBER_ID` and `WHATSAPP_ACCESS_TOKEN` change.
- **No DLT registration is needed.** WhatsApp is not SMS, so TRAI's sender-ID and
  template regime does not apply. If you ever add SMS fallback, it will.
- **Numbers are assumed Indian.** `src/services/otp.ts` hardcodes `+91` and
  validates the 6–9 series. Change `COUNTRY_CODE` there to widen it.
- **The OTP is never logged.** Edge Function logs are readable from the Supabase
  dashboard, so keep it that way.
- Cost is roughly ₹0.12–0.35 per authentication conversation, billed by Meta.

## Verifying it works

1. `supabase functions logs whatsapp-otp --tail`
2. Sign in from the app with a real WhatsApp number.
3. A 200 with no error line means Meta accepted the send.

Common failures:

| Symptom | Cause |
|---|---|
| 401 in the logs | `SEND_SMS_HOOK_SECRET` doesn't match the Hooks screen |
| `WhatsApp API 400 … template name does not exist` | Name or language mismatch |
| `WhatsApp API 401` | Access token expired — generate a permanent one |
| Nothing arrives, no error | Number never opted in, or the 24-hour session rule — authentication templates are exempt, so check the recipient is a valid WhatsApp account |
