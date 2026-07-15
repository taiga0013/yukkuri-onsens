import { Alert, Platform } from 'react-native';

// react-native-webのAlert.alert()は空実装（何も表示されない）のため、
// Web版ではブラウザのwindow.alertにフォールバックする。
export function showAlert(title: string, message?: string) {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}
