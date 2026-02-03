import { Sale } from '@/types';
import { apiRequest } from './config';

// Helper to map backend Sale (with ID, CreatedAt) to frontend Sale (with id, createdAt)
export function mapBackendSaleToFrontend(sale: any): Sale {
  const { ID, id, CreatedAt, createdAt, Branch, branch, BuyerName, buyerName, BuyerContact, buyerContact, BuyerLocation, buyerLocation, ...rest } = sale;
  
  // Extract branch name - handle both string and object formats
  let branchName: string | undefined = undefined;
  if (typeof branch === 'string') {
    branchName = branch;
  } else if (branch && typeof branch === 'object') {
    branchName = branch.name || branch.Name;
  } else if (Branch) {
    branchName = Branch.name || Branch.Name;
  } else if (rest.branch) {
    if (typeof rest.branch === 'string') {
      branchName = rest.branch;
    } else if (typeof rest.branch === 'object') {
      branchName = rest.branch.name || rest.branch.Name;
    }
  }
  
  return {
    ...rest,
    id: id || ID?.toString() || String(ID || ''),
    createdAt: createdAt || CreatedAt || new Date().toISOString(),
    productId: rest.productId?.toString() || String(rest.productId || ''),
    sellerId: rest.sellerId?.toString() || String(rest.sellerId || ''),
    branch: branchName,
    buyerName: buyerName || BuyerName || rest.buyerName || undefined,
    buyerContact: buyerContact || BuyerContact || rest.buyerContact || undefined,
    buyerLocation: buyerLocation || BuyerLocation || rest.buyerLocation || undefined,
  };
}

export interface CreateSaleRequest {
  productId: number; // Backend expects uint (number)
  productName: string;
  productAttributes?: Record<string, any>;
  quantity: number;
  unitPrice: number;
  extraCosts?: number; // Optional additional costs like delivery charges
  totalPrice: number;
  currency: string;
  sellerId?: number; // Optional - backend will extract from token
  paymentStatus: 'credit' | 'promised';
  // Buyer information (optional)
  buyerName?: string;
  buyerContact?: string;
  buyerLocation?: string;
}

export interface UpdateSaleRequest {
  productId?: string;
  productName?: string;
  productAttributes?: Record<string, any>;
  quantity?: number;
  unitPrice?: number;
  extraCosts?: number; // Optional additional costs like delivery charges
  totalPrice?: number;
  currency?: string;
  sellerId?: string;
  paymentStatus?: 'credit' | 'promised';
  // Buyer information (optional)
  buyerName?: string;
  buyerContact?: string;
  buyerLocation?: string;
}

export const saleApi = {
  // Get all sales
  async getAllSales(): Promise<Sale[]> {
    const response = await apiRequest<{ sales: any[] }>('/sales');
    return (response.sales || []).map(mapBackendSaleToFrontend);
  },

  // Get sale by ID
  async getSaleById(id: string): Promise<Sale> {
    const sale = await apiRequest<any>(`/sales/${id}`);
    return mapBackendSaleToFrontend(sale);
  },

  // Get sales by user
  async getSalesByUser(userId: string): Promise<Sale[]> {
    const response = await apiRequest<{ sales: any[] }>(`/sales/user/${userId}`);
    return (response.sales || []).map(mapBackendSaleToFrontend);
  },

  // Get sales by branch
  async getSalesByBranch(branch: string): Promise<Sale[]> {
    const response = await apiRequest<{ sales: any[] }>(`/sales/branch/${encodeURIComponent(branch)}`);
    return (response.sales || []).map(mapBackendSaleToFrontend);
  },

  // Get sales by date range
  async getSalesByDateRange(startDate: string, endDate: string): Promise<Sale[]> {
    const response = await apiRequest<{ sales: any[] }>(
      `/sales/date-range?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`
    );
    return (response.sales || []).map(mapBackendSaleToFrontend);
  },

  // Create sale
  async createSale(saleData: CreateSaleRequest): Promise<Sale> {
    const sale = await apiRequest<any>('/sales', {
      method: 'POST',
      body: JSON.stringify(saleData),
    });
    return mapBackendSaleToFrontend(sale);
  },

  // Update sale
  async updateSale(id: string, updates: UpdateSaleRequest): Promise<Sale> {
    const sale = await apiRequest<any>(`/sales/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return mapBackendSaleToFrontend(sale);
  },

  // Delete sale
  async deleteSale(id: string): Promise<void> {
    await apiRequest(`/sales/${id}`, {
      method: 'DELETE',
    });
  },
};
