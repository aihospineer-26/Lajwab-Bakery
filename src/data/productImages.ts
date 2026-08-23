import { ImageSourcePropType } from 'react-native';

/* Professional CC0 product photography (StockSnap / rawpixel via Openverse),
   bundled so the app renders with no network. Keys are product ids from
   products.ts, plus the category keys in categories.ts.

   TO ADD A PHOTO: drop <product-id>.jpg into assets/products/ and re-run the
   generator. Anything not listed here falls back to the emoji in products.ts,
   so a partial set is fine. */
export const PRODUCT_IMAGES: Record<string, ImageSourcePropType> = {
  'lb-bread-brown': require('../../assets/products/lb-bread-brown.jpg'),
  'lb-bread-garlic': require('../../assets/products/lb-bread-garlic.jpg'),
  'lb-bread-multigrain': require('../../assets/products/lb-bread-multigrain.jpg'),
  'lb-bread-wheat': require('../../assets/products/lb-bread-wheat.jpg'),
  'lb-bun-pav': require('../../assets/products/lb-bun-pav.jpg'),
  'lb-cake-blackforest': require('../../assets/products/lb-cake-blackforest.jpg'),
  'lb-cake-butterscotch': require('../../assets/products/lb-cake-butterscotch.jpg'),
  'lb-cake-chocolate': require('../../assets/products/lb-cake-chocolate.jpg'),
  'lb-cake-truffle': require('../../assets/products/lb-cake-truffle.jpg'),
  'lb-cookie-chocochip': require('../../assets/products/lb-cookie-chocochip.jpg'),
  'lb-cookie-cocobadam': require('../../assets/products/lb-cookie-cocobadam.jpg'),
  'lb-cookie-kajupista': require('../../assets/products/lb-cookie-kajupista.jpg'),
  'lb-cookie-khajur': require('../../assets/products/lb-cookie-khajur.jpg'),
  'lb-khari-puff': require('../../assets/products/lb-khari-puff.jpg'),
  'lb-namkeen-papri': require('../../assets/products/lb-namkeen-papri.jpg'),
  'lb-namkeen-peanut': require('../../assets/products/lb-namkeen-peanut.jpg'),
  'lb-pastry-truffle': require('../../assets/products/lb-pastry-truffle.jpg'),
  'lb-soup-sticks': require('../../assets/products/lb-soup-sticks.jpg'),
};

/** Bundled photo first, then a remote URL, else null so the caller draws the emoji. */
export function resolveImage(key: string, fallback: string): ImageSourcePropType | null {
  if (PRODUCT_IMAGES[key]) return PRODUCT_IMAGES[key];
  if (fallback.startsWith('http')) return { uri: fallback };
  return null;
}
