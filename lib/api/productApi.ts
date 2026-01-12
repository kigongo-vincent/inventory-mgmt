import { Product } from '@/types';
import { apiRequest } from './config';

export interface CreateProductRequest {
  name: string;
  price: number;
  currency: string;
  companyId: string; // Backend expects companyId (from middleware)
  quantity: number;
  imageUri?: string;
  attributes?: Record<string, any>;
}

export interface UpdateProductRequest {
  name?: string;
  price?: number;
  currency?: string;
  companyId?: string; // Backend expects companyId (from middleware, cannot be changed)
  quantity?: number;
  imageUri?: string;
  attributes?: Record<string, any>;
}

// Helper to map frontend Product (with company) to backend request (with companyId)
// Note: companyId is automatically set by backend middleware, but we include it for clarity
export function mapProductToRequest(product: { companyId?: string; company?: string; [key: string]: any }): CreateProductRequest {
  const { companyId, company, ...rest } = product;
  
  // Validate that companyId is provided
  if (!companyId) {
    throw new Error('Company ID is required');
  }
  
  // Ensure all required fields are present
  const request: CreateProductRequest = {
    name: rest.name,
    price: rest.price,
    currency: rest.currency || 'UGX',
    companyId: companyId, // Company ID (will be overridden by middleware for security)
    quantity: rest.quantity,
    imageUri: rest.imageUri,
    attributes: rest.attributes || {},
  };
  
  // Validate required fields
  if (!request.name || !request.companyId || request.quantity === undefined || request.price === undefined) {
    throw new Error(`Missing required fields: name=${!!request.name}, companyId=${!!request.companyId}, quantity=${request.quantity !== undefined}, price=${request.price !== undefined}`);
  }
  
  return request;
}

// Helper to map backend Product (with companyId) to frontend Product (with company)
export function mapBackendProductToFrontend(product: any): any {
  const { companyId, ID, id, ...rest } = product;
  return {
    ...rest,
    id: id || ID?.toString() || String(ID || ''),
    companyId: companyId || product.companyId,
    company: product.company?.name || product.company || '', // Map company response to company name
  };
}

export const productApi = {
  // Get all products
  async getAllProducts(): Promise<Product[]> {
    const response = await apiRequest<{ products: any[] }>('/products');
    return (response.products || []).map(mapBackendProductToFrontend);
  },

  // Get product by ID
  async getProductById(id: string): Promise<Product> {
    const product = await apiRequest<any>(`/products/${id}`);
    return mapBackendProductToFrontend(product);
  },

  // Get all products (filtered by company via middleware)
  // Note: Backend automatically filters by user's company

  // Create product
  async createProduct(productData: { companyId: string; [key: string]: any }): Promise<Product> {
    const requestData = mapProductToRequest(productData);
    // Debug: Log the request to see what we're sending
    console.log('Creating product with data:', JSON.stringify(requestData, null, 2));
    const product = await apiRequest<any>('/products', {
      method: 'POST',
      body: JSON.stringify(requestData),
    });
    return mapBackendProductToFrontend(product);
  },

  // Update product
  async updateProduct(id: string, updates: { companyId?: string; company?: string; [key: string]: any }): Promise<Product> {
    // Remove company/companyId from updates (cannot be changed, set by middleware)
    const requestData: UpdateProductRequest = { ...updates };
    delete (requestData as any).companyId;
    delete (requestData as any).company;
    const product = await apiRequest<any>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(requestData),
    });
    return mapBackendProductToFrontend(product);
  },

  // Delete product
  async deleteProduct(id: string): Promise<void> {
    await apiRequest(`/products/${id}`, {
      method: 'DELETE',
    });
  },

  // Reduce product quantity
  async reduceProductQuantity(id: string, quantity: number): Promise<Product> {
    const product = await apiRequest<any>(`/products/${id}/reduce?quantity=${quantity}`, {
      method: 'POST',
    });
    return mapBackendProductToFrontend(product);
  },
};
