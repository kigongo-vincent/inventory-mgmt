import { create } from 'zustand';

import { expenseApi } from '@/lib/api/expenseApi';
import { Expense } from '@/types';

interface ExpenseState {
  expenses: Expense[];
  isLoading: boolean;
  isFetching: boolean;
  error: string | null;
  addExpense: (data: { amount: number; description: string; category?: string; currency: string }) => Promise<void>;
  getExpensesByUser: (userId: string) => Expense[];
  getAllExpenses: () => Expense[];
  fetchExpenses: () => Promise<void>;
  fetchExpensesByUser: (userId: string) => Promise<void>;
}

export const useExpenseStore = create<ExpenseState>()((set, get) => ({
  expenses: [],
  isLoading: false,
  isFetching: false,
  error: null,
  addExpense: async (data) => {
    try {
      set({ isLoading: true, error: null });
      const expense = await expenseApi.createExpense(data);
      set((state) => ({ expenses: [expense, ...state.expenses] }));
    } catch (error: any) {
      console.error('Error adding expense:', error);
      set({ error: error.message || 'Failed to add expense' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  getExpensesByUser: (userId) => {
    return get().expenses.filter((e) => String(e.userId) === String(userId));
  },
  getAllExpenses: () => {
    return get().expenses;
  },
  fetchExpenses: async () => {
    try {
      set({ isFetching: true, error: null });
      const expenses = await expenseApi.getAllExpenses();
      set({ expenses });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch expenses' });
      // Don't clear expenses on error - keep existing data
    } finally {
      set({ isFetching: false });
    }
  },
  fetchExpensesByUser: async (userId: string) => {
    try {
      set({ isFetching: true, error: null });
      const expenses = await expenseApi.getExpensesByUser(userId);
      set((state) => {
        const existingIds = new Set(expenses.map((e) => e.id));
        const otherExpenses = state.expenses.filter((e) => String(e.userId) !== String(userId));
        return { expenses: [...expenses, ...otherExpenses] };
      });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch expenses' });
    } finally {
      set({ isFetching: false });
    }
  },
}));
