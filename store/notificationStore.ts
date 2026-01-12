import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { Notification, NotificationType } from '@/types';
import { notificationApi } from '@/lib/api/notificationApi';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number; // Cached unread count from polling
  isLoading: boolean;
  error: string | null;
  fetchNotifications: () => Promise<void>;
  pollUnreadCount: () => Promise<void>; // Poll only the count, not full list
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  getUnreadCount: () => number;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,
      isLoading: false,
      error: null,
      fetchNotifications: async () => {
        try {
          set({ isLoading: true, error: null });
          const notifications = await notificationApi.getNotifications();
          const unreadCount = notifications.filter((n) => !n.read).length;
          set({ notifications, unreadCount, isLoading: false });
        } catch (error: any) {
          console.error('Error fetching notifications:', error);
          set({ error: error.message || 'Failed to fetch notifications', isLoading: false });
          // Keep existing notifications on error
        }
      },
      pollUnreadCount: async () => {
        try {
          // Only fetch the count, not the full list
          const count = await notificationApi.getUnreadCount();
          set({ unreadCount: count });
          // Update local notifications' read status if count changed
          const currentUnread = get().notifications.filter((n) => !n.read).length;
          if (count !== currentUnread) {
            // Count changed, but we don't know which ones, so we'll keep local state
            // The full fetch will happen when user opens notifications page
          }
        } catch (error: any) {
          console.error('Error polling unread count:', error);
          // Don't update state on error, keep existing count
        }
      },
      addNotification: (notificationData) => {
        const newNotification: Notification = {
          ...notificationData,
          id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          read: false,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          notifications: [newNotification, ...state.notifications],
          unreadCount: state.unreadCount + 1,
        }));
      },
      markAsRead: async (id) => {
        try {
          await notificationApi.markAsRead(id);
          set((state) => {
            const updatedNotifications = state.notifications.map((notif) =>
              notif.id === id ? { ...notif, read: true } : notif
            );
            const newUnreadCount = Math.max(0, state.unreadCount - 1);
            return {
              notifications: updatedNotifications,
              unreadCount: newUnreadCount,
            };
          });
        } catch (error: any) {
          console.error('Error marking notification as read:', error);
          // Update locally even if API call fails
          set((state) => {
            const updatedNotifications = state.notifications.map((notif) =>
              notif.id === id ? { ...notif, read: true } : notif
            );
            const newUnreadCount = Math.max(0, state.unreadCount - 1);
            return {
              notifications: updatedNotifications,
              unreadCount: newUnreadCount,
            };
          });
        }
      },
      markAllAsRead: async () => {
        try {
          await notificationApi.markAllAsRead();
          set((state) => ({
            notifications: state.notifications.map((notif) => ({ ...notif, read: true })),
            unreadCount: 0,
          }));
        } catch (error: any) {
          console.error('Error marking all notifications as read:', error);
          // Update locally even if API call fails
          set((state) => ({
            notifications: state.notifications.map((notif) => ({ ...notif, read: true })),
            unreadCount: 0,
          }));
        }
      },
      deleteNotification: async (id) => {
        try {
          await notificationApi.deleteNotification(id);
          set((state) => {
            const notificationToDelete = state.notifications.find((n) => n.id === id);
            const updatedNotifications = state.notifications.filter((notif) => notif.id !== id);
            const newUnreadCount = notificationToDelete && !notificationToDelete.read
              ? Math.max(0, state.unreadCount - 1)
              : state.unreadCount;
            return {
              notifications: updatedNotifications,
              unreadCount: newUnreadCount,
            };
          });
        } catch (error: any) {
          console.error('Error deleting notification:', error);
          // Delete locally even if API call fails
          set((state) => {
            const notificationToDelete = state.notifications.find((n) => n.id === id);
            const updatedNotifications = state.notifications.filter((notif) => notif.id !== id);
            const newUnreadCount = notificationToDelete && !notificationToDelete.read
              ? Math.max(0, state.unreadCount - 1)
              : state.unreadCount;
            return {
              notifications: updatedNotifications,
              unreadCount: newUnreadCount,
            };
          });
        }
      },
      clearAllNotifications: async () => {
        try {
          await notificationApi.deleteAllNotifications();
          set({ notifications: [], unreadCount: 0 });
        } catch (error: any) {
          console.error('Error clearing all notifications:', error);
          // Clear locally even if API call fails
          set({ notifications: [], unreadCount: 0 });
        }
      },
      getUnreadCount: () => {
        // Use cached unreadCount from polling if available, otherwise calculate from notifications
        const { unreadCount, notifications } = get();
        if (unreadCount >= 0) {
          return unreadCount;
        }
        return notifications.filter((notif) => !notif.read).length;
      },
    }),
    {
      name: 'notification-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
