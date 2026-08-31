import { supabase } from './supabase';

export type MyProfile = {
  name: string;
  email: string;
};

const EMPTY: MyProfile = { name: '', email: '' };

/* Loose on purpose. A stricter pattern rejects addresses that genuinely exist
   (new TLDs, plus-addressing, unicode domains) and the field is optional
   anyway -- refusing a real address to protect an optional field is a worse
   trade than accepting a typo the customer can correct. Mirrors
   profiles_email_check, which is the half that actually holds. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidEmail(raw: string): boolean {
  const email = normalizeEmail(raw);
  return EMAIL_RE.test(email) && email.length <= 254;
}

/** The signed-in customer's own row, or null when there is no session. */
export async function fetchMyProfile(): Promise<MyProfile | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('name, email')
    .eq('user_id', userId)
    .maybeSingle();

  /* An unreachable database must not be mistaken for an empty profile -- the
     caller uses "no name yet" to decide whether to ask for one, and a dropped
     request would otherwise send a returning customer back through sign-up. */
  if (error) throw error;
  if (!data) return EMPTY;

  return {
    name: (data.name ?? '').trim(),
    email: (data.email ?? '').trim(),
  };
}

/* Upsert rather than update: handle_new_user creates the row, but an account
   made before that trigger existed has none, and a customer with no row would
   silently fail to save their own name. */
export async function saveMyProfile(patch: Partial<MyProfile>): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) return;

  const row: Record<string, unknown> = { user_id: userId };
  if (patch.name !== undefined) row.name = patch.name.trim() || null;
  if (patch.email !== undefined) {
    const email = normalizeEmail(patch.email);
    /* Blank stores as null so "never given" and "given as empty" cannot
       diverge -- the check constraint refuses '' outright. */
    row.email = email === '' ? null : email;
  }

  const { error } = await supabase.from('profiles').upsert(row, { onConflict: 'user_id' });
  if (error) throw error;
}

/* Was this account created by the code that was just verified?
 *
 * The bridge creates the auth user on first sign-in and reuses the row every
 * time after, so an account that already existed carries an old created_at --
 * there is no case where one reads as seconds old. That makes this safe in the
 * direction that matters: it can never mistake a returning customer for a new
 * one, which is the whole point of asking only at sign-up.
 *
 * Unknown or unparseable counts as NOT new. Getting it wrong the other way
 * costs a name the customer can add from their account in a moment; getting it
 * wrong this way puts a form in front of someone who has ordered for months.
 */
const NEW_ACCOUNT_WINDOW_MS = 5 * 60 * 1000;

export function isFreshSignup(createdAt: string | undefined | null): boolean {
  const created = Date.parse(createdAt ?? '');
  if (!Number.isFinite(created)) return false;
  const age = Date.now() - created;
  return age >= 0 && age < NEW_ACCOUNT_WINDOW_MS;
}
