export type Review = {
  id: string;
  productId: string;
  author: string;
  rating: number;
  comment: string;
  date: string;
};

/* Seeded reviews for a subset of products — enough to show both a populated
   and an empty state without hand-writing all of them. Product ids must match
   src/data/products.ts or nothing renders. */
export const MOCK_REVIEWS: Review[] = [
  { id: 'r1', productId: 'lb-pastry-butterscotch', author: 'Priya S.', rating: 5, comment: 'Best butterscotch pastry in Janakpuri. We order every Sunday.', date: '18 Aug 2026' },
  { id: 'r2', productId: 'lb-pastry-butterscotch', author: 'Rohit K.', rating: 5, comment: 'The praline crunch is what makes it. Never disappoints.', date: '11 Aug 2026' },
  { id: 'r3', productId: 'lb-cake-blackforest', author: 'Ananya M.', rating: 5, comment: 'Ordered for my son’s birthday. Eggless and nobody could tell.', date: '15 Aug 2026' },
  { id: 'r4', productId: 'lb-cake-truffle', author: 'Vikram J.', rating: 4, comment: 'Very rich, very good. A little heavy for kids though.', date: '09 Aug 2026' },
  { id: 'r5', productId: 'lb-bread-wheat', author: 'Neha T.', rating: 5, comment: 'Actually fresh, not like the packet bread from the market.', date: '20 Aug 2026' },
  { id: 'r6', productId: 'lb-bread-wheat', author: 'Suresh P.', rating: 4, comment: 'Good bread. Wish they delivered before 9am.', date: '12 Aug 2026' },
  { id: 'r7', productId: 'lb-patty-aloo', author: 'Kavya R.', rating: 5, comment: 'Crisp, hot and spicy. Perfect with chai.', date: '19 Aug 2026' },
  { id: 'r8', productId: 'lb-namkeen-bhujia', author: 'Arjun D.', rating: 5, comment: 'Fresh bhujia, not the stale stuff you get in packets.', date: '16 Aug 2026' },
  { id: 'r9', productId: 'lb-namkeen-bhujia', author: 'Meera S.', rating: 3, comment: 'Tasty but a bit oilier than I expected.', date: '07 Aug 2026' },
  { id: 'r10', productId: 'lb-cookie-kajupista', author: 'Rahul V.', rating: 5, comment: 'Loaded with kaju and pista. Worth the price.', date: '21 Aug 2026' },
];
