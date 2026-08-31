export type AppNotification = {
  id: string;
  type: 'order' | 'offer' | 'system';
  title: string;
  body: string;
  time: string;
  read: boolean;
};
