import { Expense } from '@/types';
import { apiRequest } from './config';

function mapBackendExpenseToFrontend(expense: any): Expense {
  const { ID, id, CreatedAt, createdAt, Branch, branch, User, user, ...rest } = expense;

  let branchName: string | undefined;
  if (typeof branch === 'string') {
    branchName = branch;
  } else if (branch && typeof branch === 'object') {
    branchName = branch.name || branch.Name;
  } else if (Branch) {
    branchName = Branch.name || Branch.Name;
  } else {
    branchName = undefined;
  }

  return {
    ...rest,
    id: id?.toString() || ID?.toString() || String(rest.id || ''),
    createdAt: createdAt || CreatedAt || new Date().toISOString(),
    userId: rest.userId?.toString() || String(rest.userId || ''),
    branchId: rest.branchId?.toString() || String(rest.branchId || ''),
    branch: branchName,
    user: user || User,
  };
}

export interface CreateExpenseRequest {
  amount: number;
  description: string;
  category?: string;
  currency: string;
}

export interface UpdateExpenseRequest {
  amount?: number;
  description?: string;
  category?: string;
  currency?: string;
}

export const expenseApi = {
  async getAllExpenses(): Promise<Expense[]> {
    const response = await apiRequest<{ expenses: any[] }>('/expenses');
    return (response.expenses || []).map(mapBackendExpenseToFrontend);
  },

  async getExpenseById(id: string): Promise<Expense> {
    const expense = await apiRequest<any>(`/expenses/${id}`);
    return mapBackendExpenseToFrontend(expense);
  },

  async getExpensesByUser(userId: string): Promise<Expense[]> {
    const response = await apiRequest<{ expenses: any[] }>(`/expenses/user/${userId}`);
    return (response.expenses || []).map(mapBackendExpenseToFrontend);
  },

  async getExpensesByBranch(branchId: string): Promise<Expense[]> {
    const response = await apiRequest<{ expenses: any[] }>(`/expenses/branch/${branchId}`);
    return (response.expenses || []).map(mapBackendExpenseToFrontend);
  },

  async getExpensesByDateRange(startDate: string, endDate: string): Promise<Expense[]> {
    const response = await apiRequest<{ expenses: any[] }>(
      `/expenses/date-range?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`
    );
    return (response.expenses || []).map(mapBackendExpenseToFrontend);
  },

  async createExpense(data: CreateExpenseRequest): Promise<Expense> {
    const expense = await apiRequest<any>('/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return mapBackendExpenseToFrontend(expense);
  },

  async updateExpense(id: string, updates: UpdateExpenseRequest): Promise<Expense> {
    const expense = await apiRequest<any>(`/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return mapBackendExpenseToFrontend(expense);
  },

  async deleteExpense(id: string): Promise<void> {
    await apiRequest(`/expenses/${id}`, {
      method: 'DELETE',
    });
  },
};
