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
  { id: 'n2', type: 'offer', title: 'Flash Sale is LIVE ⚡', body: 'Up to 40% off on fresh vegetables for the next 15 minutes. Grab them now!', time: '18 min ago', read: false },
  { id: 'n3', type: 'order', title: 'Rider Assigned 🛵', body: 'Rajan Kumar is on the way with your order #ORD-1042. ETA: 8 minutes.', time: '25 min ago', read: false },
  { id: 'n4', type: 'offer', title: 'Weekend Special 🎁', body: 'Use code SAVE100 and get ₹100 off on orders above ₹599. Valid this weekend only.', time: '2 hrs ago', read: true },
  { id: 'n5', type: 'system', title: 'New Address Added 📍', body: 'Home (42 Green Park, Delhi) has been saved as your default delivery address.', time: '1 day ago', read: true },
  { id: 'n6', type: 'order', title: 'Order Confirmed ✅', body: 'We have received your order #ORD-1031. Our team is picking your items now.', time: '2 days ago', read: true },
  { id: 'n7', type: 'offer', title: 'You saved ₹347 this week 📊', body: 'Great savings! Your Lajwab savings report is ready. Tap to see your full savings breakdown.', time: '3 days ago', read: true },
];
