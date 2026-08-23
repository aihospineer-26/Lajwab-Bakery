export type DeliveryStatus = 'assigned' | 'picked_up' | 'delivered';

export type DeliveryJob = {
  id: string;
  customerName: string;
  customerPhone: string;
  pickupStore: string;
  dropLine1: string;
  dropArea: string;
  items: number;
  payout: number;
  distanceKm: number;
  etaMins: number;
  placedAt: string;
  isPrepaid: boolean;
  codAmount?: number;
  status: DeliveryStatus;
};

/* Delhi-only, matching the serviceable pincode range in serviceability.ts */
export const ACTIVE_JOBS: DeliveryJob[] = [
  {
    id: 'ORD-1234',
    customerName: 'Ramesh Kumar',
    customerPhone: '+91 98110 42317',
    pickupStore: 'Lajwab Bakery · Janakpuri',
    dropLine1: 'B-42, Green Park Extension',
    dropArea: 'Green Park · 110016',
    items: 4,
    payout: 52,
    distanceKm: 2.1,
    etaMins: 9,
    placedAt: '2 min ago',
    isPrepaid: true,
    status: 'assigned',
  },
  {
    id: 'ORD-1235',
    customerName: 'Priya Singh',
    customerPhone: '+91 99715 88024',
    pickupStore: 'Lajwab Bakery · Janakpuri',
    dropLine1: '18B, SDA Market',
    dropArea: 'Hauz Khas · 110016',
    items: 6,
    payout: 68,
    distanceKm: 1.4,
    etaMins: 6,
    placedAt: '14 min ago',
    isPrepaid: false,
    codAmount: 640,
    status: 'picked_up',
  },
  {
    id: 'ORD-1236',
    customerName: 'Aditya Menon',
    customerPhone: '+91 88005 71193',
    pickupStore: 'Lajwab Bakery · Janakpuri',
    dropLine1: 'J-18, Saket',
    dropArea: 'Saket · 110017',
    items: 2,
    payout: 35,
    distanceKm: 0.8,
    etaMins: 4,
    placedAt: '26 min ago',
    isPrepaid: true,
    status: 'delivered',
  },
];

export const TODAY_STATS = {
  earned: 155,
  orders: 3,
  km: 4.3,
  onlineHours: 5.5,
  acceptanceRate: 96,
};

export const COMPLETED_TODAY = [
  { id: 'ORD-1229', customerName: 'Sunita Verma', area: 'Malviya Nagar', payout: 45, tip: 10, time: '9:42 AM' },
  { id: 'ORD-1228', customerName: 'Karan Mehta', area: 'Green Park', payout: 58, tip: 0, time: '11:15 AM' },
  { id: 'ORD-1227', customerName: 'Deepa Nair', area: 'Hauz Khas', payout: 52, tip: 15, time: '1:30 PM' },
];

export const WEEK_EARNINGS = [
  { day: 'Mon', amount: 420 },
  { day: 'Tue', amount: 385 },
  { day: 'Wed', amount: 510 },
  { day: 'Thu', amount: 295 },
  { day: 'Fri', amount: 640 },
  { day: 'Sat', amount: 720 },
  { day: 'Sun', amount: 155 },
];
