import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { Button } from '@/components/nativewindui/Button';
import { Icon } from '@/components/nativewindui/Icon';
import { Input } from '@/components/nativewindui/Input';
import { Text } from '@/components/nativewindui/Text';
import { useColorScheme } from '@/lib/useColorScheme';
import { useAuthStore } from '@/store/authStore';
import { useExpenseStore } from '@/store/expenseStore';
import { useSettingsStore } from '@/store/settingsStore';
import { withOpacity } from '@/theme/with-opacity';

/** Parse amount from "30k" or "11000" format */
function parseAmount(input: string): number {
  const trimmed = input.trim().toLowerCase().replace(/\s/g, '');
  if (trimmed.endsWith('k')) {
    const num = parseFloat(trimmed.slice(0, -1));
    return isNaN(num) ? 0 : num * 1000;
  }
  const num = parseFloat(trimmed);
  return isNaN(num) ? 0 : num;
}

interface ExpenseItem {
  id: string;
  description: string;
  amountInput: string;
}

export default function RecordExpenseScreen() {
  const { colors, colorScheme } = useColorScheme();
  const insets = useSafeAreaInsets();
  const currentUser = useAuthStore((state) => state.currentUser);
  const addExpense = useExpenseStore((state) => state.addExpense);
  const isLoading = useExpenseStore((state) => state.isLoading);
  const settings = useSettingsStore((state) => state.settings);
  const defaultCurrency = settings.defaultCurrency || 'UGX';

  const [items, setItems] = useState<ExpenseItem[]>([
    { id: '1', description: '', amountInput: '' },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { id: String(Date.now()), description: '', amountInput: '' },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateItem = (id: string, field: 'description' | 'amountInput', value: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, [field]: value } : i))
    );
  };

  const handleSubmit = async () => {
    if (!currentUser) {
      Alert.alert('Error', 'Please log in to record expenses');
      return;
    }

    const validItems = items.filter(
      (i) => i.description.trim() && parseAmount(i.amountInput) > 0
    );

    if (validItems.length === 0) {
      Alert.alert('Error', 'Add at least one expense with description and amount (e.g. 30k or 11000)');
      return;
    }

    setIsSubmitting(true);
    const errors: string[] = [];

    try {
      for (const item of validItems) {
        try {
          await addExpense({
            amount: parseAmount(item.amountInput),
            description: item.description.trim(),
            category: 'General',
            currency: defaultCurrency,
          });
        } catch (e: any) {
          errors.push(`${item.description}: ${e?.message || 'Failed'}`);
        }
      }

      if (errors.length === 0) {
        Alert.alert('Success', `${validItems.length} expense(s) recorded`, [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else if (errors.length < validItems.length) {
        Alert.alert(
          'Partial Success',
          `Recorded ${validItems.length - errors.length} expense(s). Failed: ${errors.join('; ')}`,
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        Alert.alert('Error', errors.join('\n'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <View style={{ backgroundColor: colors.card }}>
        <SafeAreaView edges={['top']}>
          <View className="px-5 pt-5 pb-6">
            <View className="flex-row items-center gap-3">
              <Pressable
                onPress={() => router.back()}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: colors.input || colors.background,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: colors.border || colors.mutedForeground,
                  }}>
                  <Icon name="chevron.left" size={20} color={colors.foreground} />
                </View>
              </Pressable>
              <View className="flex-1">
                <Text
                  variant="heading"
                  style={{
                    color: colors.foreground,
                    fontWeight: '500',
                    fontSize: 20,
                    letterSpacing: -0.3,
                  }}>
                  Record Expense
                </Text>
                <Text variant="footnote" style={{ color: colors.mutedForeground, marginTop: 2 }}>
                  Add expense items (e.g. deposited for u 30k)
                </Text>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 80 : 0}>
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: Math.max(40, insets.bottom + 20),
          }}>
          <View className="gap-4">
            {items.map((item, index) => (
              <View
                key={item.id}
                className="rounded-2xl px-5 py-4"
                style={{
                  backgroundColor: colors.card,
                  borderWidth: 0.5,
                  borderColor: withOpacity(colors.border, 0.2),
                }}>
                <View className="flex-row items-center justify-between mb-3">
                  <Text variant="footnote" color="tertiary" style={{ fontSize: 12 }}>
                    Item {index + 1}
                  </Text>
                  {items.length > 1 && (
                    <Pressable
                      onPress={() => removeItem(item.id)}
                      hitSlop={8}
                      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
                      <Icon name="trash" size={18} color={colors.destructive} />
                    </Pressable>
                  )}
                </View>
                <View className="gap-3">
                  <Input
                    value={item.description}
                    onChangeText={(v) => updateItem(item.id, 'description', v)}
                    placeholder="e.g. deposited for u, paid boda guy"
                    placeholderTextColor={colors.mutedForeground}
                  />
                  <Input
                    value={item.amountInput}
                    onChangeText={(v) => updateItem(item.id, 'amountInput', v)}
                    placeholder="Amount (e.g. 30k or 11000)"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="default"
                  />
                </View>
              </View>
            ))}

            <Button onPress={addItem} variant="secondary" className="w-full">
              <Icon name="plus" size={20} color={colors.primary} />
              <Text style={{ color: colors.primary, marginLeft: 8 }}>Add another item</Text>
            </Button>

            <Button
              onPress={handleSubmit}
              variant="primary"
              className="w-full mt-4"
              loading={isLoading || isSubmitting}
              disabled={isLoading || isSubmitting}>
              <Icon name="checkmark.circle.fill" size={20} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', marginLeft: 8 }}>Record Expense(s)</Text>
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
