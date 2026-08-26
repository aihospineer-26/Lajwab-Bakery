# Firebase Phone Auth — SMS OTP without DLT

Firebase sends the SMS; **Google is the sender**, so TRAI DLT registration does
not apply to you. This is the only route to real SMS OTP in India without
waiting on DLT approval.

**Firebase is used for OTP delivery only.** Supabase remains the identity
system — user ids stay `uuid`, RLS keeps keying on `auth.uid()`, and no table
changes. Once DLT clears, delete the Firebase pieces and set
`EXPO_PUBLIC_OTP_CHANNEL=whatsapp` (or an SMS provider through the existing
hook). No data migration either way.

---

## How it fits together

```
App  →  Firebase sends the SMS and verifies the code
     →  returns a Firebase ID token
     →  firebase-otp-bridge verifies that token against Google's public keys
     →  finds or creates the Supabase user for that number
     →  returns a one-time token
App  →  exchanges it for a real Supabase session
```

Firebase cannot be used as a delivery channel for Supabase's own code the way
the WhatsApp hook is — it insists on generating and verifying its own. So the
bridge converts *"this person holds this number"* into a Supabase session.

The session comes from `generateLink` + `verifyOtp` rather than a hand-signed
JWT. A hand-signed token has no matching refresh token, so customers would be
logged out the moment it expired.

---

## 1 · Firebase project

console.firebase.google.com → **Add project**

| Step | Where |
|---|---|
| Enable phone sign-in | Authentication → Sign-in method → **Phone** |
| Register the Android app | Project settings → Your apps → Android |
| Package name | `app.lajwabbakery.android` |

### SHA-1 — the step people miss

Phone auth **fails silently** without it.

```bash
eas credentials
```

Pick Android → your profile → read the **SHA-1 fingerprint**, and paste it into
Firebase → Project settings → Your apps → Add fingerprint.

Add SHA-1 for **every** build profile you use. A development build and a
production build have different signing keys, so a production APK will fail even
though your dev build worked.

### google-services.json

Download it, put it in the project root, and reference it from `app.json`:

```json
"android": {
  "googleServicesFile": "./google-services.json"
}
```

⚠️ This file identifies your Firebase project. It is not a secret in the way a
server key is — it ships inside the app either way — but keep it out of public
repositories regardless.

---

## 2 · Deploy the bridge

```bash
npx supabase functions deploy firebase-otp-bridge --no-verify-jwt

npx supabase secrets set FIREBASE_PROJECT_ID=your-firebase-project-id
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically —
do not set them by hand.

> The service role key bypasses RLS entirely. It exists only inside this
> function, which is why account creation happens server-side and never in the
> app.

---

## 3 · Build a dev client

`@react-native-firebase/auth` is a native module, so **Expo Go stops working.**

```bash
npx eas build --profile development --platform android
```

Install that build on your phone, then:

```bash
npx expo start --dev-client
```

First build takes 15–20 minutes.

---

## 4 · Switch the channel

`.env.local`:

```
EXPO_PUBLIC_OTP_CHANNEL=firebase
```

Then `npx expo start -c` — without `-c` the old value stays cached.

| Value | Behaviour |
|---|---|
| `demo` | Code shown on screen, no backend. Also the automatic fallback when Supabase is unconfigured |
| `whatsapp` | Supabase mints the code, the Send SMS Hook delivers it. **Default** |
| `firebase` | Firebase sends real SMS, bridge returns a Supabase session |

`EXPO_PUBLIC_OTP_MODE=demo` still forces demo mode and overrides everything.

---

## 5 · Verify

```bash
npx supabase functions logs firebase-otp-bridge --tail
```

Sign in with a real number. Then confirm the account landed correctly:

```sql
select id, phone, email, created_at
from auth.users order by created_at desc limit 3;
```

`phone` must hold the real number. `email` will read
`919876543210@phone.lajwabbakery.local` — that is deliberate: `generateLink`
requires an address, but these accounts never receive mail and the phone stays
the real identifier.

Then check the profile row the trigger created:

```sql
select user_id, phone from public.profiles order by user_id desc limit 3;
```

---

## Free tier and cost

Firebase Phone Auth has a monthly free allowance of verifications, then charges
per verification. For a single bakery this is usually inside the free tier, but
**confirm current pricing yourself** — it has changed before and my figures may
be stale.

---

## Troubleshooting

| Symptom | Cause |
|---|---|
| No SMS, no error | SHA-1 missing, or added for the wrong build profile |
| `auth/invalid-app-credential` | SHA-1 mismatch — most common failure |
| `Token is for a different project` | `FIREBASE_PROJECT_ID` secret does not match the app |
| `Could not verify that sign-in` | Check the function logs; the detail is there, not in the app |
| `Not a phone sign-in` | Token came from a different provider |
| Works in dev, fails in production | Production signing key's SHA-1 was never added |
| `Phone sign-in is only available in the app` | Running on web — Firebase native has no web build here. Use `whatsapp` for the web deploy |

---

## Going back to WhatsApp, or on to SMS

Set `EXPO_PUBLIC_OTP_CHANNEL=whatsapp` and rebuild. Nothing else changes — same
screens, same sessions, same users, because Supabase held the identity the whole
time.

When DLT clears and you want a direct SMS provider, it becomes a branch in
`supabase/functions/whatsapp-otp/index.ts`. Firebase and its native modules can
then be removed entirely.
