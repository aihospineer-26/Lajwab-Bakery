import * as Location from 'expo-location';
import { Platform } from 'react-native';

export type GeocodedAddress = {
  line1: string;
  city: string;
  pincode: string;
};

/* Filling the address in is a convenience, never a requirement -- every field
   it sets can be typed by hand. So each failure says how to undo it AND that
   typing still works, because "Location permission was denied" on its own is a
   dead end: it names what broke and leaves the customer stuck on a screen they
   could have completed themselves. */
const DENIED = Platform.OS === 'web'
  ? 'Location is blocked for this site. Allow it from the icon on the left of the address bar, then try again — or just type your address below.'
  : 'Location is turned off for Lajwab Bakery. Turn it on in your phone settings, or type your address below.';

const UNAVAILABLE = 'Could not get a fix on your location. Check that location is on, or type your address below.';

export async function getCurrentCoords(): Promise<{ lat: number; lng: number }> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error(DENIED);
  }

  /* A denied OS-level switch, or a device that simply cannot get a fix, fails
     here rather than above -- the browser reports the site as permitted and
     then never resolves a position. Without a deadline the button spins for as
     long as the platform feels like trying. */
  try {
    const position = await Promise.race([
      Location.getCurrentPositionAsync({}),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error(UNAVAILABLE)), 15000)),
    ]);
    return { lat: position.coords.latitude, lng: position.coords.longitude };
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (/denied|permission/i.test(message)) throw new Error(DENIED);
    throw new Error(UNAVAILABLE);
  }
}

export async function reverseGeocode(lat: number, lng: number): Promise<GeocodedAddress> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error('Could not look up that location');
  const data = await response.json();
  const addr = data.address ?? {};

  const line1 = [addr.house_number, addr.road].filter(Boolean).join(' ') || data.display_name || '';
  const city = addr.city || addr.town || addr.village || addr.suburb || '';
  const pincode = addr.postcode || '';

  return { line1, city, pincode };
}
