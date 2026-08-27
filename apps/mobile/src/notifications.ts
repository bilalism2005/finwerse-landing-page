import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import apiClient from './api/client';

// Configure how notifications behave when the app is in foreground. Must run at module
// load (not inside a component), so this file is imported once from app/_layout.tsx.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotificationsAsync() {
  let token;
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      console.log('Missing EAS projectId in app config -- cannot register for push notifications');
      return;
    }
    token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

// Requests OS push permission (if not already granted/denied) and syncs the resulting
// token with the backend. Called from Alerts' first-alert-creation flow rather than at
// login, so the OS permission dialog only appears once the user has done something that
// makes clear why Finwerse would need to notify them (spec/ui.md's contextual-permission
// rule -- a blind request at login gave a brand-new user an opaque dialog with no context).
export async function registerAndSyncPushToken() {
  const token = await registerForPushNotificationsAsync();
  if (token) {
    try {
      await apiClient.post('/users/push-token', { expo_push_token: token });
    } catch (err) {
      console.log('Failed to sync push token', err);
    }
  }
}
