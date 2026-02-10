import { useLocalSearchParams, router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';

import { FAB } from '@/components/nativewindui/FAB';
import { Icon } from '@/components/nativewindui/Icon';
import { Skeleton, SkeletonList, SkeletonStatCard } from '@/components/nativewindui/Skeleton';
import { Text } from '@/components/nativewindui/Text';
import { formatCurrency } from '@/lib/currency';
import { useColorScheme } from '@/lib/useColorScheme';
import { useAuthStore } from '@/store/authStore';
import { useExpenseStore } from '@/store/expenseStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useUserStore } from '@/store/userStore';

function formatDateDDMMYYYY(date: Date): string {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

export default function UserExpensesScreen() {
  const { colors } = useColorScheme();
  const params = useLocalSearchParams<{ userId?: string; userName?: string }>();
  const [refreshing, setRefreshing] = useState(false);
  const currentUser = useAuthStore((state) => state.currentUser);
  const getExpensesByUser = useExpenseStore((state) => state.getExpensesByUser);
  const fetchExpensesByUser = useExpenseStore((state) => state.fetchExpensesByUser);
  const isLoading = useExpenseStore((state) => state.isLoading);
  const getUserById = useUserStore((state) => state.getUserById);
  const settings = useSettingsStore((state) => state.settings);

  const targetUserId = params.userId || currentUser?.id;
  const targetUser = targetUserId ? getUserById(targetUserId) : null;
  const userName = params.userName || targetUser?.name || currentUser?.name || 'User';

  const expenses = targetUserId ? getExpensesByUser(targetUserId) : [];
  const sortedExpenses = [...expenses].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
  const defaultCurrency = expenses.length > 0 ? expenses[0].currency : settings.defaultCurrency;

  // Group by date (DD/MM/YYYY)
  const groupedByDate = React.useMemo(() => {
    const map = new Map<string, typeof expenses>();
    sortedExpenses.forEach((e) => {
      const d = new Date(e.createdAt);
      const key = formatDateDDMMYYYY(d);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    });
    return Array.from(map.entries()).map(([date, items]) => ({ date, items }));
  }, [sortedExpenses]);

  useEffect(() => {
    if (targetUserId) {
      fetchExpensesByUser(targetUserId);
    }
  }, [targetUserId, fetchExpensesByUser]);

  if (isLoading && !refreshing) {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.background }}>
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}>
          <View className="px-5 pt-6">
            <View className="mb-6">
              <Skeleton width={150} height={24} style={{ marginBottom: 8 }} />
              <Skeleton width={200} height={14} />
            </View>
            <View className="mb-6">
              <SkeletonStatCard />
            </View>
            <SkeletonList count={5} renderItem={() => <SkeletonStatCard />} />
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              try {
                if (targetUserId) {
                  await fetchExpensesByUser(targetUserId);
                }
              } catch (error) {
                console.error('Error refreshing expenses:', error);
              } finally {
                setRefreshing(false);
              }
            }}
            tintColor={colors.primary}
            progressBackgroundColor={colors.background}
            colors={[colors.primary]}
          />
        }>
        <View className="px-5 pt-6">
          <View className="mb-6" style={{ paddingTop: 2 }}>
            <Text
              variant="heading"
              style={{
                fontWeight: '500',
                fontSize: 20,
                letterSpacing: -0.3,
                marginBottom: 4,
                includeFontPadding: false,
                textAlignVertical: 'top',
                lineHeight: 26,
              }}>
              {userName}'s Expenses
            </Text>
            <Text variant="footnote" color="tertiary" style={{ fontSize: 14 }}>
              View all expenses by this user
            </Text>
          </View>

          <View
            className="mb-6 rounded-2xl px-5 py-5"
            style={{
              backgroundColor: colors.card,
            }}>
            <View className="flex-row items-start justify-between mb-3">
              <View className="flex-1">
                <Text variant="footnote" color="tertiary" style={{ fontSize: 13, fontWeight: '500', marginBottom: 4 }}>
                  Total Expenses
                </Text>
                <Text
                  variant="subhead"
                  style={{ color: colors.primary, fontWeight: '500', fontSize: 20, letterSpacing: -0.3 }}>
                  {formatCurrency(totalAmount, defaultCurrency)}
                </Text>
              </View>
              <View
                className="h-12 w-12 items-center justify-center rounded-xl"
                style={{ backgroundColor: colors.background }}>
                <Icon name="dollarsign.circle.fill" size={24} color={colors.primary} />
              </View>
            </View>
            <Text variant="body" style={{ fontSize: 15, fontWeight: '500' }}>
              {expenses.length} item{expenses.length !== 1 ? 's' : ''}
            </Text>
          </View>

          {groupedByDate.length === 0 ? (
            <View
              className="rounded-2xl px-5 py-12 items-center justify-center"
              style={{
                backgroundColor: colors.card,
              }}>
              <Icon name="dollarsign.circle" size={40} color={colors.primary} style={{ opacity: 0.3, marginBottom: 12 }} />
              <Text variant="subhead" color="tertiary" style={{ fontSize: 16, fontWeight: '500', marginBottom: 4 }}>
                No expenses recorded
              </Text>
              <Text variant="footnote" color="tertiary" style={{ fontSize: 13 }}>
                This user hasn't recorded any expenses yet
              </Text>
            </View>
          ) : (
            <View className="gap-4">
              {groupedByDate.map(({ date, items }) => (
                <View
                  key={date}
                  className="rounded-2xl px-5 py-4"
                  style={{
                    backgroundColor: colors.card,
                  }}>
                  <Text variant="subhead" style={{ fontSize: 14, fontWeight: '600', marginBottom: 12 }}>
                    {date}
                  </Text>
                  <View className="gap-2">
                    {items.map((expense, idx) => (
                      <View
                        key={expense.id}
                        className="flex-row items-center justify-between py-2"
                        style={{
                          borderBottomWidth: idx < items.length - 1 ? 1 : 0,
                          borderBottomColor: colors.border,
                          opacity: 0.9,
                        }}>
                        <Text variant="body" style={{ fontSize: 14, flex: 1 }} numberOfLines={2}>
                          • {expense.description}
                        </Text>
                        <Text
                          variant="body"
                          style={{ fontSize: 14, fontWeight: '500', color: colors.primary, marginLeft: 8 }}
                          numberOfLines={1}>
                          {formatCurrency(expense.amount, expense.currency)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <FAB
        options={[
          {
            label: 'Record Expense',
            icon: 'dollarsign.circle.fill',
            onPress: () => router.push('/record-expense'),
          },
        ]}
      />
    </View>
  );
}
