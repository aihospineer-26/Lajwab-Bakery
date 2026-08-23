import { useWindowDimensions } from 'react-native';

/* Editorial layout: two columns on phones so product photography is large
   enough to sell, rather than the dense quick-commerce grid. */
export function useGridColumns() {
  const { width } = useWindowDimensions();
  if (width >= 1100) return 4;
  if (width >= 700) return 3;
  return 2;
}
