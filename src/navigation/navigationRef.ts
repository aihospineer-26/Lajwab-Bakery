import { createNavigationContainerRef } from '@react-navigation/native';
import { RootStackParamList } from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export type NoParamScreen = 'Profile' | 'Settings' | 'CustomerSupport' | 'Faq';

export function navigate(screen: NoParamScreen) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(screen);
  }
}
