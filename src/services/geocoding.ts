import * as Location from 'expo-location';

export type GeocodedAddress = {
  line1: string;
  city: string;
  pincode: string;
};

export async function getCurrentCoords(): Promise<{ lat: number; lng: number }> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Location permission was denied');
  }
  const position = await Location.getCurrentPositionAsync({});
  return { lat: position.coords.latitude, lng: position.coords.longitude };
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
