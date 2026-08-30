import { useEffect, useState } from 'react';
import { STORE } from '../data/store';
import { supabase } from './supabase';

/* Details the bakery must be able to change without a developer.
 *
 * The FSSAI licence number is legally required on an Indian food business's
 * app, and it lived in a TypeScript constant -- which meant launch waited on
 * someone being available to edit a source file and rebuild. It lives in the
 * database now, editable from the dashboard's Account tab by an admin.
 *
 * src/data/store.ts stays the fallback, so nothing breaks if the row is
 * unreachable and the value can still be baked in for a build that needs it. */

export type StoreSettings = {
  fssai: string;
  gstin: string;
};

const FALLBACK: StoreSettings = { fssai: STORE.fssai, gstin: STORE.gstin };

let cache: StoreSettings | null = null;
let inFlight: Promise<StoreSettings> | null = null;

export async function fetchStoreSettings(force = false): Promise<StoreSettings> {
  if (!force && cache) return cache;
  if (!force && inFlight) return inFlight;

  inFlight = (async () => {
    const { data, error } = await supabase
      .from('store_settings')
      .select('fssai, gstin')
      .maybeSingle();

    /* A missing row or an unreachable database must never blank out a licence
       number that is already displayed -- fall back rather than show nothing. */
    if (error || !data) {
      cache = FALLBACK;
      return cache;
    }
    cache = {
      fssai: (data.fssai ?? '').trim() || FALLBACK.fssai,
      gstin: (data.gstin ?? '').trim() || FALLBACK.gstin,
    };
    return cache;
  })().finally(() => {
    inFlight = null;
  });

  return inFlight;
}

/** Admin-only; RLS rejects anyone else. */
export async function saveStoreSettings(patch: Partial<StoreSettings>): Promise<void> {
  const row: Record<string, string> = {};
  if (patch.fssai !== undefined) row.fssai = patch.fssai.trim();
  if (patch.gstin !== undefined) row.gstin = patch.gstin.trim();
  if (Object.keys(row).length === 0) return;

  const { error } = await supabase.from('store_settings').update(row).eq('id', true);
  if (error) throw error;
  cache = null;
}

export function useStoreSettings(): StoreSettings {
  const [settings, setSettings] = useState<StoreSettings>(cache ?? FALLBACK);
  useEffect(() => {
    let alive = true;
    fetchStoreSettings()
      .then((s) => {
        if (alive) setSettings(s);
      })
      .catch(() => {
        /* keeps the bundled fallback -- nothing to surface to a customer */
      });
    return () => {
      alive = false;
    };
  }, []);
  return settings;
}
