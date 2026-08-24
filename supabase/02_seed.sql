-- ##########################################################################
-- ## SUPERSEDED — DO NOT RUN.
-- ## Written for Grocwell. Conflicts with the other files here (uuid vs text
-- ## product ids, two incompatible order_items shapes, duplicate RLS policy
-- ## names that silently re-open orders to direct inserts).
-- ##
-- ## Use 00_init_lajwab.sql + 02_seed_lajwab.sql instead. See SUPABASE_SETUP.md.
-- ##########################################################################

-- Seed: categories
insert into categories (id, name, image) values
  ('fruits', 'Fruits', 'https://commons.wikimedia.org/wiki/Special:FilePath/Red%20Apple.jpg?width=200'),
  ('vegetables', 'Vegetables', 'https://commons.wikimedia.org/wiki/Special:FilePath/Carrots%20of%20many%20colors.jpg?width=200'),
  ('dairy', 'Dairy', 'https://commons.wikimedia.org/wiki/Special:FilePath/Dg%20milk%20containers.jpg?width=200'),
  ('bakery', 'Bakery', 'https://commons.wikimedia.org/wiki/Special:FilePath/Vegan%20Nine%20Grain%20Whole%20Wheat%20Bread.jpg?width=200'),
  ('snacks', 'Snacks', 'https://commons.wikimedia.org/wiki/Special:FilePath/Potato-Chips.jpg?width=200'),
  ('beverages', 'Beverages', 'https://commons.wikimedia.org/wiki/Special:FilePath/Orange%20juice%201%20edit1.jpg?width=200'),
  ('grains', 'Grains', 'https://commons.wikimedia.org/wiki/Special:FilePath/Basmati%20Rice.jpg?width=200'),
  ('spices', 'Spices', 'https://commons.wikimedia.org/wiki/Special:FilePath/Anchochilipowder.JPG?width=200');

-- Seed: products
insert into products (id, name, unit, price, mrp, image, category_id, description, stock) values
  ('p1', 'Fresh Tomatoes', '500g', 35, 45, 'https://commons.wikimedia.org/wiki/Special:FilePath/Tomato%20je.jpg?width=300', 'vegetables', 'Juicy, vine-ripened tomatoes, handpicked for freshness. Great for salads, curries, and sauces.', 50),
  ('p2', 'Bananas', '6 pcs', 40, null, 'https://commons.wikimedia.org/wiki/Special:FilePath/Bananas%20on%20black%20background%2002.jpg?width=300', 'fruits', 'Naturally ripened bananas, rich in potassium and a quick energy boost any time of day.', 50),
  ('p3', 'Red Apples', '1kg', 120, 140, 'https://commons.wikimedia.org/wiki/Special:FilePath/Red%20Apple.jpg?width=300', 'fruits', 'Crisp, sweet red apples sourced from the hills. A healthy snack or salad addition.', 50),
  ('p4', 'Broccoli', '250g', 55, null, 'https://commons.wikimedia.org/wiki/Special:FilePath/Broccoli%20and%20cross%20section%20edit.jpg?width=300', 'vegetables', 'Fresh green broccoli florets, packed with fiber and vitamins. Best steamed or stir-fried.', 50),
  ('p5', 'Toned Milk', '1L', 58, null, 'https://commons.wikimedia.org/wiki/Special:FilePath/Dg%20milk%20containers.jpg?width=300', 'dairy', 'Pasteurized toned milk, a daily essential for tea, coffee, and cooking.', 50),
  ('p6', 'Brown Bread', '400g', 45, 50, 'https://commons.wikimedia.org/wiki/Special:FilePath/Vegan%20Nine%20Grain%20Whole%20Wheat%20Bread.jpg?width=300', 'bakery', 'Soft multigrain brown bread, baked fresh daily with whole wheat goodness.', 50),
  ('p7', 'Potato Chips', '90g', 20, null, 'https://commons.wikimedia.org/wiki/Special:FilePath/Potato-Chips.jpg?width=300', 'snacks', 'Crunchy, lightly salted potato chips — the perfect anytime snack.', 50),
  ('p8', 'Orange Juice', '1L', 110, null, 'https://commons.wikimedia.org/wiki/Special:FilePath/Orange%20juice%201%20edit1.jpg?width=300', 'beverages', 'Freshly squeezed orange juice with no added preservatives. Rich in Vitamin C.', 50),
  ('p9', 'Basmati Rice', '1kg', 95, null, 'https://commons.wikimedia.org/wiki/Special:FilePath/Basmati%20Rice.jpg?width=300', 'grains', 'Long-grain aromatic basmati rice, perfect for biryanis and everyday meals.', 50),
  ('p10', 'Red Chilli Powder', '200g', 60, 70, 'https://commons.wikimedia.org/wiki/Special:FilePath/Anchochilipowder.JPG?width=300', 'spices', 'Vibrant, finely ground red chilli powder for that authentic spicy kick.', 50),
  ('p11', 'Carrots', '500g', 30, null, 'https://commons.wikimedia.org/wiki/Special:FilePath/Carrots%20of%20many%20colors.jpg?width=300', 'vegetables', 'Crunchy, farm-fresh carrots — great raw, juiced, or cooked into your favorite dishes.', 50),
  ('p12', 'Oranges', '1kg', 90, null, 'https://commons.wikimedia.org/wiki/Special:FilePath/Oranges%20-%20whole-halved-segment.jpg?width=300', 'fruits', 'Sweet and tangy oranges, bursting with juice and Vitamin C.', 50),
  ('p13', 'Fresh Curd', '400g', 35, null, 'https://commons.wikimedia.org/wiki/Special:FilePath/Curd%20in%20steel%20bowl.jpg?width=300', 'dairy', 'Thick, creamy curd set fresh daily. A staple for meals and raitas.', 50),
  ('p14', 'Paneer', '200g', 80, 90, 'https://commons.wikimedia.org/wiki/Special:FilePath/Homemade%20Paneer%20cottage%20cheese%20cut%20into%20cubes.JPG?width=300', 'dairy', 'Soft, fresh paneer cubes — ideal for curries, grilling, or snacking.', 50),
  ('p15', 'Soft Dinner Rolls', '6 pcs', 38, null, 'https://commons.wikimedia.org/wiki/Special:FilePath/Hawaiian%20sweet%20bread%20rolls.jpg?width=300', 'bakery', 'Fluffy, lightly sweet dinner rolls, perfect for breakfast or sliders.', 50),
  ('p16', 'Chocolate Chip Cookies', '200g', 65, 75, 'https://commons.wikimedia.org/wiki/Special:FilePath/Chocolate%20chip%20cookies%20on%20cutting%20board.jpg?width=300', 'bakery', 'Freshly baked cookies loaded with real chocolate chips.', 50),
  ('p17', 'Salted Popcorn', '80g', 30, null, 'https://commons.wikimedia.org/wiki/Special:FilePath/Popcorn%20in%20a%20bowl.jpg?width=300', 'snacks', 'Light, airy popcorn with just the right amount of salt.', 50),
  ('p18', 'Samosa (Frozen Pack)', '4 pcs', 50, null, 'https://commons.wikimedia.org/wiki/Special:FilePath/Samosa-Indian-popular-snack.jpg?width=300', 'snacks', 'Crispy, spiced potato-filled samosas — ready to fry or air-fry at home.', 50),
  ('p19', 'Cola Soft Drink', '2L', 85, null, 'https://commons.wikimedia.org/wiki/Special:FilePath/Big-Cola-3L.jpg?width=300', 'beverages', 'Chilled, fizzy cola — great for parties and get-togethers.', 50),
  ('p20', 'Black Tea', '250g', 95, 110, 'https://commons.wikimedia.org/wiki/Special:FilePath/Cup%20of%20black%20tea.JPG?width=300', 'beverages', 'Strong, aromatic black tea leaves for the perfect daily brew.', 50),
  ('p21', 'Wheat Flour (Atta)', '5kg', 220, null, 'https://commons.wikimedia.org/wiki/Special:FilePath/Atta%20flour.jpg?width=300', 'grains', 'Stone-ground whole wheat flour for soft rotis and chapatis every day.', 50),
  ('p22', 'Rolled Oats', '500g', 110, 130, 'https://commons.wikimedia.org/wiki/Special:FilePath/Rolled%20oats%20in%20bowl%202.jpg?width=300', 'grains', 'Wholesome rolled oats, a fibre-rich way to start your morning.', 50),
  ('p23', 'Turmeric Powder', '200g', 45, null, 'https://commons.wikimedia.org/wiki/Special:FilePath/Kunyit%20Bubuk.jpg?width=300', 'spices', 'Pure, vibrant turmeric powder with earthy flavor and color for everyday cooking.', 50),
  ('p24', 'Garam Masala', '100g', 55, 65, 'https://commons.wikimedia.org/wiki/Special:FilePath/Garam%20masala%20mix.jpg?width=300', 'spices', 'A warm, aromatic blend of ground spices to elevate any curry.', 50);
