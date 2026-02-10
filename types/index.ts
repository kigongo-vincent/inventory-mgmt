export type UserRole = 'super_admin' | 'user';

export interface User {
  id: string;
  name: string;
  username: string;
  password: string; // In production, this should be hashed
  role: UserRole;
  branch: string; // Branch name (computed)
  branchId?: string; // Branch ID (FK) - required for all users
  company?: string; // Company name (computed from branch)
  companyId?: string; // Company ID (computed from branch) - available after login
  email?: string;
  phone?: string;
  profilePictureUri?: string; // URI for profile picture
  syncStatus?: SyncStatus;
  createdAt: string;
}

export type SyncStatus = 'online' | 'offline' | 'synced';

// Product now uses fully dynamic attributes
export interface Product {
  id: string;
  name: string;
  price: number;
  currency: string;
  company: string; // Company name (computed)
  companyId?: string; // Company ID (FK)
  quantity: number;
  imageUri?: string; // URI for product image
  syncStatus?: SyncStatus;
  attributes: Record<string, any>; // Dynamic attributes based on configured ProductProperties
  createdAt: string;
}

// Legacy types for backward compatibility during migration
export type ProductType = string;
export type GasSize = string;

export type PaymentStatus = 'credit' | 'promised';

export interface Sale {
  id: string;
  productId: string;
  productName: string;
  productAttributes: Record<string, any>; // Dynamic attributes from product
  quantity: number;
  unitPrice: number;
  extraCosts?: number; // Additional costs like delivery charges
  totalPrice: number;
  currency: string;
  sellerId: string;
  seller?: { id: string; name: string }; // Populated from FK
  branch?: string; // Computed from seller's branch
  paymentStatus: PaymentStatus;
  // Buyer information (optional)
  buyerName?: string;
  buyerContact?: string;
  buyerLocation?: string;
  syncStatus?: SyncStatus;
  createdAt: string;
}

export interface InventoryItem {
  productId: string;
  productName: string;
  productAttributes: Record<string, any>; // Dynamic attributes
  quantity: number;
  price: number;
  branch: string;
}

export type NotificationType = 'sale' | 'inventory' | 'user' | 'system';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  relatedId?: string; // ID of related sale, product, user, etc.
}

export interface Branch {
  id: string;
  companyId: string;
  name: string;
  address?: string;
  phone?: string;
  createdAt: string;
  syncStatus?: SyncStatus;
}

export interface Expense {
  id: string;
  amount: number;
  description: string;
  category: string;
  currency: string;
  userId: string;
  branchId: string;
  branch?: string;
  user?: { id: string; name: string };
  createdAt: string;
}




