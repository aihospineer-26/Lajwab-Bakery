import { Alert, Platform } from 'react-native';

/* react-native-web does not implement Alert — it silently no-ops, so any
   confirmation built on it is dead in the browser. Falls back to window.confirm
   there and uses the native dialog everywhere else. */
export function confirm(
  title: string,
  message: string,
  confirmLabel: string,
  cancelLabel = 'Cancel',
): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }

  return new Promise(resolve => {
    Alert.alert(title, message, [
      { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}
