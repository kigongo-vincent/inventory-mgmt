import { User } from '@/types';
import { apiRequest } from './config';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export interface CreateUserRequest {
  name: string;
  username: string;
  password: string;
  role: 'super_admin' | 'user';
  branch?: string; // Branch name (for backward compatibility)
  branchId?: number; // Branch ID (preferred) - number to match backend
  companyId?: number; // Company ID (for super_admin) - number to match backend
  email?: string;
  phone?: string;
  profilePictureUri?: string;
}

export interface UpdateUserRequest {
  name?: string;
  username?: string;
  password?: string;
  role?: 'super_admin' | 'user';
  branch?: string; // Branch name (for backward compatibility)
  branchId?: number; // Branch ID - number to match backend
  email?: string;
  phone?: string;
  profilePictureUri?: string;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

export interface NotificationPreferences {
  id?: string;
  userId: string;
  salesNotifications: boolean;
  inventoryAlerts: boolean;
  userActivity: boolean;
  systemUpdates: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateNotificationPreferencesRequest {
  salesNotifications?: boolean;
  inventoryAlerts?: boolean;
  userActivity?: boolean;
  systemUpdates?: boolean;
  emailNotifications?: boolean;
  pushNotifications?: boolean;
}

// Helper to normalize user object from backend (ID -> id)
function normalizeUser(user: any): User {
  const { ID, id, CreatedAt, createdAt, ...rest } = user;
  return {
    ...rest,
    id: id || ID?.toString() || String(ID || ''),
    createdAt: createdAt || CreatedAt || new Date().toISOString(),
  } as User;
}

export const userApi = {
  // Login
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    if (__DEV__) {
      console.log('🔐 Login Request:', JSON.stringify(credentials, null, 2));
    }
    const response = await apiRequest<LoginResponse>('/users/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    if (__DEV__) {
      console.log('🔐 Login Response:', JSON.stringify(response, null, 2));
    }
    // Normalize user ID from backend response
    if (!response.user) {
      throw new Error('Invalid login response: user field missing');
    }
    if (!response.token) {
      throw new Error('Invalid login response: token field missing');
    }
    return {
      ...response,
      user: normalizeUser(response.user),
    };
  },

  // Get all users
  async getAllUsers(): Promise<User[]> {
    const response = await apiRequest<{ users: User[] }>('/users');
    return (response.users || []).map(normalizeUser);
  },

  // Get user by ID
  async getUserById(id: string): Promise<User> {
    const user = await apiRequest<User>(`/users/${id}`);
    return normalizeUser(user);
  },

  // Get users by branch ID
  async getUsersByBranch(branchId: string): Promise<User[]> {
    const response = await apiRequest<{ users: User[] }>(`/users/branch/${encodeURIComponent(branchId)}`);
    return (response.users || []).map(normalizeUser);
  },

  // Create user
  async createUser(userData: CreateUserRequest): Promise<User> {
    console.log('📡 API Request: POST /users');
    console.log('📦 Request Payload:', JSON.stringify(userData, null, 2));
    const response = await apiRequest<User>('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    console.log('✅ API Response:', JSON.stringify(response, null, 2));
    return normalizeUser(response);
  },

  // Update user
  async updateUser(id: string, updates: UpdateUserRequest): Promise<User> {
    const user = await apiRequest<User>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return normalizeUser(user);
  },

  // Change password
  async changePassword(id: string, passwordData: ChangePasswordRequest): Promise<void> {
    await apiRequest<{ message: string }>(`/users/${id}/change-password`, {
      method: 'POST',
      body: JSON.stringify(passwordData),
    });
  },

  // Delete user
  async deleteUser(id: string): Promise<void> {
    await apiRequest(`/users/${id}`, {
      method: 'DELETE',
    });
  },

  // Get notification preferences
  async getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
    const prefs = await apiRequest<NotificationPreferences>(`/users/${userId}/notification-preferences`);
    // Normalize ID if needed
    if (prefs.id === undefined && (prefs as any).ID) {
      prefs.id = String((prefs as any).ID);
    }
    if (prefs.userId === undefined && (prefs as any).UserID) {
      prefs.userId = String((prefs as any).UserID);
    }
    return prefs;
  },

  // Update notification preferences
  async updateNotificationPreferences(
    userId: string,
    updates: UpdateNotificationPreferencesRequest
  ): Promise<NotificationPreferences> {
    const prefs = await apiRequest<NotificationPreferences>(`/users/${userId}/notification-preferences`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    // Normalize ID if needed
    if (prefs.id === undefined && (prefs as any).ID) {
      prefs.id = String((prefs as any).ID);
    }
    if (prefs.userId === undefined && (prefs as any).UserID) {
      prefs.userId = String((prefs as any).UserID);
    }
    return prefs;
  },
};
