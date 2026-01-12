import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getAuthToken } from '@/lib/api/config';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface NotificationPermissions {
  status: Notifications.PermissionStatus;
  canAskAgain: boolean;
}

/**
 * Request notification permissions
 */
export async function requestNotificationPermissions(): Promise<NotificationPermissions> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  return {
    status: finalStatus,
    canAskAgain: finalStatus === 'denied' ? false : true,
  };
}

/**
 * Get notification permissions status
 */
export async function getNotificationPermissions(): Promise<NotificationPermissions> {
  const { status } = await Notifications.getPermissionsAsync();
  return {
    status,
    canAskAgain: status !== 'denied',
  };
}

/**
 * Schedule a local notification
 */
export async function scheduleNotification(
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<string> {
  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data || {},
      sound: true,
    },
    trigger: null, // Show immediately
  });

  return identifier;
}

/**
 * Cancel a notification
 */
export async function cancelNotification(identifier: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(identifier);
}

/**
 * Cancel all notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Get notification token (for push notifications - if needed in future)
 */
export async function getNotificationToken(): Promise<string | null> {
  try {
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
    });
    return token.data;
  } catch (error) {
    console.error('Error getting notification token:', error);
    return null;
  }
}
