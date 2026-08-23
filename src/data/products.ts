export type Product = {
  id: string;
  name: string;
  unit: string;
  price: number;
  mrp?: number;
  image: string;
  categoryId: string;
  description: string;
};

/* Placeholder prices — realistic Delhi bakery rates, to be replaced with
   Lajwab's actual price list. Everything here is 100% eggless and pure veg. */
export const products: Product[] = [
  {
    id: 'lb-thaali-56',
    name: '56 Bhog Thaali',
    unit: 'Serves 4–6',
    price: 1551,
    mrp: 1851,
    image: '🪔',
    categoryId: 'janmashtami',
    description:
      'Our Janmashtami Chhappan Bhog — 56 traditional offerings arranged on a festive thaali. Freshly prepared, 100% eggless. Comes with a complimentary bansuri. Please order a day in advance.',
  },

  { id: 'lb-cake-pineapple', name: 'Pineapple Cake', unit: '500g', price: 450, image: '🎂', categoryId: 'cakes', description: 'Light vanilla sponge layered with pineapple crush and fresh cream. Eggless.' },
  { id: 'lb-cake-blackforest', name: 'Black Forest Cake', unit: '500g', price: 550, mrp: 600, image: '🍫', categoryId: 'cakes', description: 'Chocolate sponge, whipped cream and cherries — the everyday celebration classic. Eggless.' },
  { id: 'lb-cake-truffle', name: 'Choco Truffle Cake', unit: '500g', price: 650, image: '🎂', categoryId: 'cakes', description: 'Rich dark chocolate truffle with a dense ganache finish. Eggless.' },
  { id: 'lb-cake-chocolate', name: 'Chocolate Cake', unit: '500g', price: 500, image: '🍫', categoryId: 'cakes', description: 'Classic moist chocolate cake with chocolate cream frosting. Eggless.' },
  { id: 'lb-cake-oreo', name: 'Oreo Cake', unit: '500g', price: 600, image: '🎂', categoryId: 'cakes', description: 'Cookies-and-cream layers finished with crushed Oreo. A favourite with kids. Eggless.' },
  { id: 'lb-cake-butterscotch', name: 'Butter Scotch Cake', unit: '500g', price: 550, image: '🎂', categoryId: 'cakes', description: 'Caramel butterscotch cream with praline crunch through every layer. Eggless.' },

  { id: 'lb-pastry-butterscotch', name: 'Butter Scotch Pastry', unit: '1 pc', price: 60, image: '🍰', categoryId: 'pastries', description: 'The one our regulars come back for — caramel cream and praline crunch. Eggless.' },
  { id: 'lb-pastry-pineapple', name: 'Pineapple Pastry', unit: '1 pc', price: 50, image: '🍰', categoryId: 'pastries', description: 'Soft vanilla sponge with pineapple and fresh cream. Eggless.' },
  { id: 'lb-pastry-chocolate', name: 'Chocolate Pastry', unit: '1 pc', price: 55, image: '🍰', categoryId: 'pastries', description: 'Chocolate sponge with smooth chocolate cream. Eggless.' },
  { id: 'lb-pastry-truffle', name: 'Truffle Pastry', unit: '1 pc', price: 65, image: '🍰', categoryId: 'pastries', description: 'Dense dark chocolate truffle in single-serve form. Eggless.' },
  { id: 'lb-pastry-blackforest', name: 'Black Forest Pastry', unit: '1 pc', price: 60, image: '🍰', categoryId: 'pastries', description: 'Cherry, cream and chocolate sponge. Eggless.' },

  { id: 'lb-bread-wheat', name: 'Whole Wheat Bread', unit: '400g', price: 50, image: '🍞', categoryId: 'breads', description: 'Baked fresh every morning with 100% whole wheat atta.' },
  { id: 'lb-bread-multigrain', name: 'Multi Grain Bread', unit: '400g', price: 60, image: '🍞', categoryId: 'breads', description: 'Five grains and seeds in a soft, everyday loaf.' },
  { id: 'lb-bread-brown', name: 'Brown Bread', unit: '400g', price: 45, image: '🍞', categoryId: 'breads', description: 'Everyday brown bread, soft crumb, baked daily.' },
  { id: 'lb-bread-milk', name: 'Milk Bread', unit: '400g', price: 40, image: '🍞', categoryId: 'breads', description: 'Soft, slightly sweet milk loaf — best for toast and sandwiches.' },
  { id: 'lb-bread-garlic', name: 'Garlic Bread', unit: '1 pc', price: 70, image: '🥖', categoryId: 'breads', description: 'Buttery garlic loaf, ready to warm and serve.' },
  { id: 'lb-bun-pav', name: 'Pav Buns', unit: '6 pcs', price: 35, image: '🍔', categoryId: 'breads', description: 'Soft ladi pav, baked fresh daily.' },
  { id: 'lb-bun-burger', name: 'Burger Buns', unit: '4 pcs', price: 40, image: '🍔', categoryId: 'breads', description: 'Sesame-topped 4-inch burger buns.' },

  { id: 'lb-cookie-kajupista', name: 'Kaju Pista Cookies', unit: '250g', price: 220, image: '🍪', categoryId: 'cookies', description: 'Rich dry-fruit cookies loaded with cashew and pistachio.' },
  { id: 'lb-cookie-butterkaju', name: 'Butter Kaju Cookies', unit: '250g', price: 200, image: '🍪', categoryId: 'cookies', description: 'Melt-in-the-mouth butter cookies topped with cashew.' },
  { id: 'lb-cookie-cocobadam', name: 'Coco Badam Cookies', unit: '250g', price: 180, image: '🍪', categoryId: 'cookies', description: 'Cocoa and almond cookies — crisp, not too sweet.' },
  { id: 'lb-cookie-chocochip', name: 'Chocolate Chip Cookies', unit: '250g', price: 160, image: '🍪', categoryId: 'cookies', description: 'Buttery cookies studded with chocolate chips.' },
  { id: 'lb-cookie-khajur', name: 'Khajur Cookies', unit: '250g', price: 140, image: '🍪', categoryId: 'cookies', description: 'Date cookies, naturally sweetened and lightly spiced.' },
  { id: 'lb-cookie-attapatti', name: 'Atta Patti', unit: '250g', price: 120, image: '🍪', categoryId: 'cookies', description: 'Traditional whole-wheat patti biscuits, a tea-time staple.' },

  { id: 'lb-patty-aloo', name: 'Aloo Patty', unit: '1 pc', price: 30, image: '🥟', categoryId: 'savouries', description: 'Flaky puff pastry with spiced potato filling. Served warm.' },
  { id: 'lb-patty-paneer', name: 'Paneer Patty', unit: '1 pc', price: 40, image: '🥟', categoryId: 'savouries', description: 'Puff pastry filled with masala paneer.' },
  { id: 'lb-patty-mushroom', name: 'Mushroom Patty', unit: '1 pc', price: 40, image: '🥟', categoryId: 'savouries', description: 'Creamy mushroom filling in crisp puff pastry.' },
  { id: 'lb-khari-puff', name: 'Khari Puff', unit: '250g', price: 100, image: '🥐', categoryId: 'savouries', description: 'Light, flaky salted khari — the classic chai companion.' },
  { id: 'lb-soup-sticks', name: 'Soup Sticks', unit: '200g', price: 90, image: '🥖', categoryId: 'savouries', description: 'Crunchy baked sticks, lightly salted.' },

  { id: 'lb-namkeen-bhujia', name: 'Bikaneri Bhujia', unit: '250g', price: 90, image: '🥨', categoryId: 'namkeen', description: 'Classic Bikaneri besan bhujia, fine and crisp.' },
  { id: 'lb-namkeen-moongdal', name: 'Moong Dal', unit: '250g', price: 95, image: '🥜', categoryId: 'namkeen', description: 'Lightly salted fried moong dal.' },
  { id: 'lb-namkeen-punjabi', name: 'Punjabi Mixture', unit: '250g', price: 85, image: '🥜', categoryId: 'namkeen', description: 'Hearty mixture with sev, peanuts, dal and curry leaf.' },
  { id: 'lb-namkeen-dalmoth', name: 'Dal Moth', unit: '250g', price: 85, image: '🥜', categoryId: 'namkeen', description: 'Spiced dal moth with a mild tang.' },
  { id: 'lb-namkeen-papri', name: 'Besan Papri', unit: '250g', price: 80, image: '🥨', categoryId: 'namkeen', description: 'Crisp besan papri, freshly fried.' },
  { id: 'lb-namkeen-peanut', name: 'Peanut Masala', unit: '250g', price: 80, image: '🥜', categoryId: 'namkeen', description: 'Masala-coated peanuts with a chatpata kick.' },
];
