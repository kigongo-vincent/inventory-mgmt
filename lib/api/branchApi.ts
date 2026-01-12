import { Branch } from '@/types';
import { apiRequest } from './config';

export interface CreateBranchRequest {
  companyId: string;
  name: string;
  address?: string;
  phone?: string;
}

export interface UpdateBranchRequest {
  companyId?: string;
  name?: string;
  address?: string;
  phone?: string;
}

export const branchApi = {
  // Get all branches
  async getAllBranches(): Promise<Branch[]> {
    const response = await apiRequest<{ branches: Branch[] }>('/branches');
    return response.branches || [];
  },

  // Get branch by ID
  async getBranchById(id: string): Promise<Branch> {
    return apiRequest<Branch>(`/branches/${id}`);
  },

  // Get branches by company
  async getBranchesByCompany(companyId: string): Promise<Branch[]> {
    const response = await apiRequest<{ branches: Branch[] }>(`/branches/company/${companyId}`);
    return response.branches || [];
  },

  // Create branch
  async createBranch(branchData: CreateBranchRequest): Promise<Branch> {
    return apiRequest<Branch>('/branches', {
      method: 'POST',
      body: JSON.stringify(branchData),
    });
  },

  // Update branch
  async updateBranch(id: string, updates: UpdateBranchRequest): Promise<Branch> {
    return apiRequest<Branch>(`/branches/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  // Delete branch
  async deleteBranch(id: string): Promise<void> {
    await apiRequest(`/branches/${id}`, {
      method: 'DELETE',
    });
  },
};
