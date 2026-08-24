-- ==========================================================================
-- Lajwab Bakery — catalog seed
-- ==========================================================================
--
--  Generated from src/data/categories.ts and src/data/products.ts.
--  Run AFTER 00_init_lajwab.sql.
--
--  Re-runnable: existing rows are updated, not duplicated.
--
--  !! PRICES ARE PLACEHOLDERS. They are realistic Delhi rates but were never
--  !! confirmed with the bakery. Correct them before taking a real order.
--
--  Stock is seeded flat at 25 for every item. Bakery stock is really
--  "what we baked today", so the owner should set these each morning from the
--  inventory app.
--
-- ==========================================================================

-- Writes are admin-only under RLS. The SQL Editor runs as a superuser and
-- bypasses that, so no role grant is needed here.

insert into public.categories (id, name, image) values
  ('janmashtami', 'Janmashtami', 'lb-thaali-56'),
  ('cakes', 'Cakes', 'lb-cake-chocolate'),
  ('pastries', 'Pastries', 'lb-pastry-truffle'),
  ('breads', 'Breads & Buns', 'lb-bread-wheat'),
  ('cookies', 'Cookies', 'lb-cookie-chocochip'),
  ('savouries', 'Savouries', 'lb-khari-puff'),
  ('namkeen', 'Namkeen', 'lb-namkeen-peanut')
on conflict (id) do update set
  name  = excluded.name,
  image = excluded.image;


insert into public.products (id, name, unit, price, mrp, image, category_id, description, stock) values
  ('lb-thaali-56', '56 Bhog Thaali', 'Serves 4–6', 1551, 1851, '🪔', 'janmashtami', 'Our Janmashtami Chhappan Bhog — 56 traditional offerings arranged on a festive thaali. Freshly prepared, 100% eggless. Comes with a complimentary bansuri. Please order a day in advance.', 25),
  ('lb-cake-pineapple', 'Pineapple Cake', '500g', 450, null, '🎂', 'cakes', 'Light vanilla sponge layered with pineapple crush and fresh cream. Eggless.', 25),
  ('lb-cake-blackforest', 'Black Forest Cake', '500g', 550, 600, '🍫', 'cakes', 'Chocolate sponge, whipped cream and cherries — the everyday celebration classic. Eggless.', 25),
  ('lb-cake-truffle', 'Choco Truffle Cake', '500g', 650, null, '🎂', 'cakes', 'Rich dark chocolate truffle with a dense ganache finish. Eggless.', 25),
  ('lb-cake-chocolate', 'Chocolate Cake', '500g', 500, null, '🍫', 'cakes', 'Classic moist chocolate cake with chocolate cream frosting. Eggless.', 25),
  ('lb-cake-oreo', 'Oreo Cake', '500g', 600, null, '🎂', 'cakes', 'Cookies-and-cream layers finished with crushed Oreo. A favourite with kids. Eggless.', 25),
  ('lb-cake-butterscotch', 'Butter Scotch Cake', '500g', 550, null, '🎂', 'cakes', 'Caramel butterscotch cream with praline crunch through every layer. Eggless.', 25),
  ('lb-pastry-butterscotch', 'Butter Scotch Pastry', '1 pc', 60, null, '🍰', 'pastries', 'The one our regulars come back for — caramel cream and praline crunch. Eggless.', 25),
  ('lb-pastry-pineapple', 'Pineapple Pastry', '1 pc', 50, null, '🍰', 'pastries', 'Soft vanilla sponge with pineapple and fresh cream. Eggless.', 25),
  ('lb-pastry-chocolate', 'Chocolate Pastry', '1 pc', 55, null, '🍰', 'pastries', 'Chocolate sponge with smooth chocolate cream. Eggless.', 25),
  ('lb-pastry-truffle', 'Truffle Pastry', '1 pc', 65, null, '🍰', 'pastries', 'Dense dark chocolate truffle in single-serve form. Eggless.', 25),
  ('lb-pastry-blackforest', 'Black Forest Pastry', '1 pc', 60, null, '🍰', 'pastries', 'Cherry, cream and chocolate sponge. Eggless.', 25),
  ('lb-bread-wheat', 'Whole Wheat Bread', '400g', 50, null, '🍞', 'breads', 'Baked fresh every morning with 100% whole wheat atta.', 25),
  ('lb-bread-multigrain', 'Multi Grain Bread', '400g', 60, null, '🍞', 'breads', 'Five grains and seeds in a soft, everyday loaf.', 25),
  ('lb-bread-brown', 'Brown Bread', '400g', 45, null, '🍞', 'breads', 'Everyday brown bread, soft crumb, baked daily.', 25),
  ('lb-bread-milk', 'Milk Bread', '400g', 40, null, '🍞', 'breads', 'Soft, slightly sweet milk loaf — best for toast and sandwiches.', 25),
  ('lb-bread-garlic', 'Garlic Bread', '1 pc', 70, null, '🥖', 'breads', 'Buttery garlic loaf, ready to warm and serve.', 25),
  ('lb-bun-pav', 'Pav Buns', '6 pcs', 35, null, '🍔', 'breads', 'Soft ladi pav, baked fresh daily.', 25),
  ('lb-bun-burger', 'Burger Buns', '4 pcs', 40, null, '🍔', 'breads', 'Sesame-topped 4-inch burger buns.', 25),
  ('lb-cookie-kajupista', 'Kaju Pista Cookies', '250g', 220, null, '🍪', 'cookies', 'Rich dry-fruit cookies loaded with cashew and pistachio.', 25),
  ('lb-cookie-butterkaju', 'Butter Kaju Cookies', '250g', 200, null, '🍪', 'cookies', 'Melt-in-the-mouth butter cookies topped with cashew.', 25),
  ('lb-cookie-cocobadam', 'Coco Badam Cookies', '250g', 180, null, '🍪', 'cookies', 'Cocoa and almond cookies — crisp, not too sweet.', 25),
  ('lb-cookie-chocochip', 'Chocolate Chip Cookies', '250g', 160, null, '🍪', 'cookies', 'Buttery cookies studded with chocolate chips.', 25),
  ('lb-cookie-khajur', 'Khajur Cookies', '250g', 140, null, '🍪', 'cookies', 'Date cookies, naturally sweetened and lightly spiced.', 25),
  ('lb-cookie-attapatti', 'Atta Patti', '250g', 120, null, '🍪', 'cookies', 'Traditional whole-wheat patti biscuits, a tea-time staple.', 25),
  ('lb-patty-aloo', 'Aloo Patty', '1 pc', 30, null, '🥟', 'savouries', 'Flaky puff pastry with spiced potato filling. Served warm.', 25),
  ('lb-patty-paneer', 'Paneer Patty', '1 pc', 40, null, '🥟', 'savouries', 'Puff pastry filled with masala paneer.', 25),
  ('lb-patty-mushroom', 'Mushroom Patty', '1 pc', 40, null, '🥟', 'savouries', 'Creamy mushroom filling in crisp puff pastry.', 25),
  ('lb-khari-puff', 'Khari Puff', '250g', 100, null, '🥐', 'savouries', 'Light, flaky salted khari — the classic chai companion.', 25),
  ('lb-soup-sticks', 'Soup Sticks', '200g', 90, null, '🥖', 'savouries', 'Crunchy baked sticks, lightly salted.', 25),
  ('lb-namkeen-bhujia', 'Bikaneri Bhujia', '250g', 90, null, '🥨', 'namkeen', 'Classic Bikaneri besan bhujia, fine and crisp.', 25),
  ('lb-namkeen-moongdal', 'Moong Dal', '250g', 95, null, '🥜', 'namkeen', 'Lightly salted fried moong dal.', 25),
  ('lb-namkeen-punjabi', 'Punjabi Mixture', '250g', 85, null, '🥜', 'namkeen', 'Hearty mixture with sev, peanuts, dal and curry leaf.', 25),
  ('lb-namkeen-dalmoth', 'Dal Moth', '250g', 85, null, '🥜', 'namkeen', 'Spiced dal moth with a mild tang.', 25),
  ('lb-namkeen-papri', 'Besan Papri', '250g', 80, null, '🥨', 'namkeen', 'Crisp besan papri, freshly fried.', 25),
  ('lb-namkeen-peanut', 'Peanut Masala', '250g', 80, null, '🥜', 'namkeen', 'Masala-coated peanuts with a chatpata kick.', 25)
on conflict (id) do update set
  name        = excluded.name,
  unit        = excluded.unit,
  price       = excluded.price,
  mrp         = excluded.mrp,
  image       = excluded.image,
  category_id = excluded.category_id,
  description = excluded.description;
-- stock is deliberately NOT overwritten on re-run — it is live counter data.


-- ==========================================================================
-- Verify
-- ==========================================================================
--   select count(*) from public.categories;  -- expect 7
--   select count(*) from public.products;    -- expect 36
--
--   select c.name, count(p.id)
--   from public.categories c left join public.products p on p.category_id = c.id
--   group by c.name order by c.name;
-- ==========================================================================
