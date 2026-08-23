import { Address } from '../data/addresses';
import { supabase } from './supabase';

type AddressRow = {
  id: string;
  label: string;
  line1: string;
  line2: string | null;
  city: string;
  pincode: string;
  lat: number | null;
  lng: number | null;
  is_default: boolean;
};

function mapAddress(row: AddressRow): Address {
  return {
    id: row.id,
    label: row.label,
    line1: row.line1,
    line2: row.line2 ?? undefined,
    city: row.city,
    pincode: row.pincode,
    lat: row.lat ?? undefined,
    lng: row.lng ?? undefined,
    isDefault: row.is_default,
  };
}

export async function fetchAddresses(): Promise<Address[]> {
  const { data, error } = await supabase
    .from('addresses')
    .select('id, label, line1, line2, city, pincode, lat, lng, is_default')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as AddressRow[]).map(mapAddress);
}

export async function saveAddress(address: Omit<Address, 'id'>): Promise<Address> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error('You must be signed in to save an address');

  const { data, error } = await supabase
    .from('addresses')
    .insert({
      user_id: userId,
      label: address.label,
      line1: address.line1,
      line2: address.line2 ?? null,
      city: address.city,
      pincode: address.pincode,
      lat: address.lat ?? null,
      lng: address.lng ?? null,
      is_default: address.isDefault,
    })
    .select('id, label, line1, line2, city, pincode, lat, lng, is_default')
    .single();
  if (error) throw error;
  return mapAddress(data as AddressRow);
}

export async function deleteAddress(id: string): Promise<void> {
  const { error } = await supabase.from('addresses').delete().eq('id', id);
  if (error) throw error;
}

export async function setDefaultAddress(id: string): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error('You must be signed in');

  const { error: clearError } = await supabase
    .from('addresses')
    .update({ is_default: false })
    .eq('user_id', userId);
  if (clearError) throw clearError;

  const { error: setError } = await supabase
    .from('addresses')
    .update({ is_default: true })
    .eq('id', id);
  if (setError) throw setError;
}
