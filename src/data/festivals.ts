export type Festival = {
  id: string;
  name: string;
  emoji: string;
  date: string;
  offerText: string;
  background: string;
  accent: string;
};

/* Order matters: PromoBanner uses `find`, so the first entry inside the
   21-day window is the one that shows. Janmashtami leads the campaign. */
export const festivals: Festival[] = [
  {
    id: 'janmashtami-2026',
    name: 'Janmashtami',
    emoji: '🪈',
    date: '2026-09-03',
    offerText: '56 Bhog Thaali — free bansuri with every thaali',
    background: '#FDF0DC',
    accent: '#A9542F',
  },
  {
    id: 'raksha-bandhan-2026',
    name: 'Raksha Bandhan',
    emoji: '🧵',
    date: '2026-08-27',
    offerText: 'Cakes & sweet hampers for your rakhi thali',
    background: '#F5E4D7',
    accent: '#7A3A1E',
  },
  {
    id: 'ganesh-chaturthi-2026',
    name: 'Ganesh Chaturthi',
    emoji: '🐘',
    date: '2026-09-14',
    offerText: 'Modak, laddoo boxes & festive dry cakes',
    background: '#FBE9E7',
    accent: '#C4452F',
  },
  {
    id: 'dussehra-2026',
    name: 'Dussehra',
    emoji: '🏹',
    date: '2026-10-20',
    offerText: 'Navratri fasting-friendly bakes & namkeen',
    background: '#FCE4EC',
    accent: '#AD1457',
  },
  {
    id: 'diwali-2026',
    name: 'Diwali',
    emoji: '🪔',
    date: '2026-11-08',
    offerText: 'Gift hampers, cookies & mithai boxes',
    background: '#FDF0DC',
    accent: '#B71C1C',
  },
];
