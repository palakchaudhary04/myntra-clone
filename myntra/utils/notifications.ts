import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import api from '../constants/apiConfig'; // Import the central instance

export async function registerForPushNotificationsAsync(userId: string) {
  if (!Device.isDevice) return; // Push doesn't work on standard web browsers

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return;

  const token = (await Notifications.getExpoPushTokenAsync({
    projectId: Constants.expoConfig?.extra?.eas?.projectId, 
  })).data;

  // Send to your backend
  await api.post('/user/update-token', { userId, token });

  return token;
}