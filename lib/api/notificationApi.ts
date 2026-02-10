import { Notification, NotificationType } from '@/types';
import { apiRequest } from './config';
import { parseDate } from '@/lib/dateUtils';

function normalizeNotificationCreatedAt(n: any): string {
  const raw = n.CreatedAt ?? n.createdAt;
  if (raw == null || raw === '') return new Date().toISOString();
  try {
    return parseDate(typeof raw === 'string' ? raw : new Date(raw).toISOString()).toISOString();
  } catch {
    return new Date().toISOString();
  }
}

export interface CreateNotificationRequest {
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  relatedId?: number;
}

export const notificationApi = {
  // Get all notifications for the current user
  getNotifications: async (): Promise<Notification[]> => {
    const response = await apiRequest<{ notifications: any[] }>('/notifications', {
      method: 'GET',
    });
    
    // Transform backend format to frontend format
    return response.notifications.map((n: any, index: number) => ({
      id: n.id?.toString() || n.ID?.toString() || `notif_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
      type: n.type as NotificationType,
      title: n.title,
      message: n.message,
      read: n.read || false,
      createdAt: normalizeNotificationCreatedAt(n),
      relatedId: n.relatedId?.toString(),
    }));
  },

  // Get unread notifications for the current user
  getUnreadNotifications: async (): Promise<Notification[]> => {
    const response = await apiRequest<{ notifications: any[] }>('/notifications/unread', {
      method: 'GET',
    });
    
    // Transform backend format to frontend format
    return response.notifications.map((n: any, index: number) => ({
      id: n.id?.toString() || n.ID?.toString() || `notif_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
      type: n.type as NotificationType,
      title: n.title,
      message: n.message,
      read: n.read || false,
      createdAt: normalizeNotificationCreatedAt(n),
      relatedId: n.relatedId?.toString(),
    }));
  },

  // Get unread count
  getUnreadCount: async (): Promise<number> => {
    const response = await apiRequest<{ count: number }>('/notifications/unread/count', {
      method: 'GET',
    });
    return response.count || 0;
  },

  // Mark notification as read
  markAsRead: async (id: string): Promise<void> => {
    await apiRequest(`/notifications/${id}/read`, {
      method: 'PUT',
    });
  },

  // Mark all notifications as read
  markAllAsRead: async (): Promise<void> => {
    await apiRequest('/notifications/read-all', {
      method: 'PUT',
    });
  },

  // Delete notification
  deleteNotification: async (id: string): Promise<void> => {
    await apiRequest(`/notifications/${id}`, {
      method: 'DELETE',
    });
  },

  // Delete all notifications
  deleteAllNotifications: async (): Promise<void> => {
    await apiRequest('/notifications', {
      method: 'DELETE',
    });
  },

  // Create notification (for system notifications like cloud sync)
  createNotification: async (req: CreateNotificationRequest): Promise<Notification> => {
    const response = await apiRequest<any>('/notifications', {
      method: 'POST',
      body: JSON.stringify(req),
    });
    
    return {
      id: response.id?.toString() || response.ID?.toString() || `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: response.type as NotificationType,
      title: response.title,
      message: response.message,
      read: response.read || false,
      createdAt: normalizeNotificationCreatedAt(response),
      relatedId: response.relatedId?.toString(),
    };
  },
};
