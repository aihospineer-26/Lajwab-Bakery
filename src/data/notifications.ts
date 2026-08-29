export type AppNotification = {
  id: string;
  type: 'order' | 'offer' | 'system';
  title: string;
  body: string;
  time: string;
  read: boolean;
};

export const MOCK_NOTIFICATIONS: AppNotification[] = [
  { id: 'n1', type: 'order', title: 'Order Delivered! 🎉', body: 'Your order #ORD-1042 has been delivered. Enjoy everything, fresh from our oven!', time: '2 min ago', read: false },
  { id: 'n2', type: 'offer', title: 'Fresh from the oven 🥐', body: "Today the khari puff and butter cookies are fresh out of the oven. Order before they go.", time: '18 min ago', read: false },
  { id: 'n3', type: 'order', title: 'Out for delivery 🛵', body: 'Your order #ORD-1042 has left the bakery and is on its way to you.', time: '25 min ago', read: false },
  { id: 'n4', type: 'offer', title: 'Weekend Special 🎁', body: 'Fresh batches all weekend — order early, they go quickly.', time: '2 hrs ago', read: true },
  { id: 'n5', type: 'system', title: 'New Address Added 📍', body: 'Home (Janakpuri, New Delhi) has been saved as your default delivery address.', time: '1 day ago', read: true },
  { id: 'n6', type: 'order', title: 'Order Confirmed ✅', body: 'We have received your order #ORD-1031. The bakery is packing it now.', time: '2 days ago', read: true },
  { id: 'n7', type: 'offer', title: 'You saved ₹347 this week 📊', body: 'Great savings! Your Lajwab savings report is ready. Tap to see your full savings breakdown.', time: '3 days ago', read: true },
];
