export type Banner = {
  id: string;
  title: string;
  subtitle: string;
  background: string;
  gradient: readonly [string, string];
  emoji: string;
};

export const banners: Banner[] = [
  {
    id: 'b1',
    title: '56 Bhog Thaali',
    subtitle: 'Free bansuri this Janmashtami',
    background: '#A9542F',
    gradient: ['#A9542F', '#D98F63'],
    emoji: '🪔',
  },
  {
    id: 'b2',
    title: '50% Off First Order',
    subtitle: 'New here? Half price, any item',
    background: '#7A3A1E',
    gradient: ['#7A3A1E', '#B87249'],
    emoji: '🎉',
  },
  {
    id: 'b3',
    title: 'Fresh From The Oven',
    subtitle: 'Breads & pastries baked daily',
    background: '#C98B6B',
    gradient: ['#C98B6B', '#DDAA88'],
    emoji: '🥐',
  },
];
