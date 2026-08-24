export type Category = {
  id: string;
  name: string;
  image: string;
};

/* `image` is a key into PRODUCT_IMAGES (src/data/productImages.ts) — each
   category borrows a representative product photo. */
export const categories: Category[] = [
  { id: 'janmashtami', name: 'Janmashtami', image: 'lb-thaali-56' },
  { id: 'cakes', name: 'Cakes', image: 'lb-cake-chocolate' },
  { id: 'pastries', name: 'Pastries', image: 'lb-pastry-truffle' },
  { id: 'breads', name: 'Breads & Buns', image: 'lb-bread-wheat' },
  { id: 'cookies', name: 'Cookies', image: 'lb-cookie-chocochip' },
  { id: 'savouries', name: 'Savouries', image: 'lb-khari-puff' },
  { id: 'namkeen', name: 'Namkeen', image: 'lb-namkeen-peanut' },
];
