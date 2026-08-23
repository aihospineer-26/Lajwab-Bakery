export type Address = {
  id: string;
  label: string;
  line1: string;
  line2?: string;
  city: string;
  pincode: string;
  lat?: number;
  lng?: number;
  isDefault: boolean;
};

/* Seeded into LocationContext while signed out so the app is testable without
   auth. Signed-in users get their real addresses from Supabase instead. */
export const MOCK_ADDRESSES: Address[] = [
  {
    id: 'mock-home',
    label: 'Home',
    line1: 'B-42, Green Park Extension',
    line2: 'Near Uphaar Cinema',
    city: 'New Delhi',
    pincode: '110016',
    lat: 28.5583,
    lng: 77.2065,
    isDefault: true,
  },
  {
    id: 'mock-work',
    label: 'Work',
    line1: '7th Floor, Statesman House, Barakhamba Road',
    line2: 'Connaught Place',
    city: 'New Delhi',
    pincode: '110001',
    lat: 28.6315,
    lng: 77.2167,
    isDefault: false,
  },
  {
    id: 'mock-parents',
    label: "Parents' Place",
    line1: 'J-18, Saket',
    line2: 'Opposite Select Citywalk',
    city: 'New Delhi',
    pincode: '110017',
    lat: 28.5245,
    lng: 77.2066,
    isDefault: false,
  },
];
