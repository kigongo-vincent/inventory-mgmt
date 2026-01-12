import { router } from 'expo-router';
import React from 'react';
import { ScrollView, View, Pressable, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { Icon } from '@/components/nativewindui/Icon';
import { Text } from '@/components/nativewindui/Text';
import { useColorScheme } from '@/lib/useColorScheme';

const FAQ_ITEMS = [
  {
    question: 'How do I add a new product?',
    answer: 'Navigate to the Inventory tab, tap the floating action button (FAB), and select "Add Product". Fill in the product details and save.',
  },
  {
    question: 'How do I record a sale?',
    answer: 'You can record a sale by tapping the FAB and selecting "Record Sale", or by navigating to the Sales tab and using the record sale option.',
  },
  {
    question: 'Can I work offline?',
    answer: 'Yes! The app works fully offline. All data is stored locally and can be synced when you have an internet connection. Check the Offline tab for more details.',
  },
  {
    question: 'How do I change my password?',
    answer: 'Go to Settings > Account > Change Password. Enter your current password and your new password, then confirm.',
  },
  {
    question: 'What should I do if I forget my password?',
    answer: 'Contact your administrator or use the "Forgot Password" option on the login screen if available.',
  },
  {
    question: 'How do I view sales by branch or user?',
    answer: 'Navigate to the Users tab, select a branch or user, and tap "View Sales" from the action menu.',
  },
];

const SUPPORT_CONTACTS = [
  {
    type: 'Email',
    value: 'kigongovincent625@gmail.com',
    icon: 'envelope.fill' as const,
    action: () => {
      Linking.openURL('mailto:kigongovincent625@gmail.com?subject=Support Request');
    },
  },
  {
    type: 'Website',
    value: 'kigongo.netlify.app',
    icon: 'globe' as const,
    action: () => {
      Linking.openURL('https://kigongo.netlify.app');
    },
  },
];

export default function HelpSupportScreen() {
  const { colors, colorScheme } = useColorScheme();
  const [expandedFAQ, setExpandedFAQ] = React.useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setExpandedFAQ(expandedFAQ === index ? null : index);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      {/* Header Section */}
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
                  Help & Support
                </Text>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24, paddingTop: 8 }}>
        <View className="px-5 pt-6">
          {/* Contact Support */}
          <View
            className="mb-6 rounded-2xl px-5 py-5"
            style={{
              backgroundColor: colors.card,
            }}>
            <Text variant="heading" className="mb-4" style={{ fontWeight: '500', fontSize: 17 }}>
              Contact Support
            </Text>

            {SUPPORT_CONTACTS.map((contact, index) => (
              <View key={contact.type}>
                <Pressable
                  onPress={contact.action}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.7 : 1,
                  })}>
                  <View className="flex-row items-center justify-between py-3">
                    <View className="flex-row items-center gap-3 flex-1">
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          backgroundColor: colors.background,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                        <Icon name={contact.icon} size={20} color={colors.primary} />
                      </View>
                      <View className="flex-1">
                        <Text variant="subhead" style={{ fontWeight: '500' }}>
                          {contact.type}
                        </Text>
                        <Text variant="footnote" color="tertiary" className="mt-0.5">
                          {contact.value}
                        </Text>
                      </View>
                    </View>
                    <Icon name="chevron.right" size={20} color={colors.mutedForeground} />
                  </View>
                </Pressable>
                {index < SUPPORT_CONTACTS.length - 1 && (
                  <View className="h-px my-2" style={{ backgroundColor: colors.border, opacity: 0.2 }} />
                )}
              </View>
            ))}
          </View>

          {/* FAQ Section */}
          <View
            className="mb-6 rounded-2xl px-5 py-5"
            style={{
              backgroundColor: colors.card,
            }}>
            <Text variant="heading" className="mb-4" style={{ fontWeight: '500', fontSize: 17 }}>
              Frequently Asked Questions
            </Text>

            {FAQ_ITEMS.map((item, index) => {
              const isExpanded = expandedFAQ === index;
              return (
                <View key={index}>
                  <Pressable
                    onPress={() => toggleFAQ(index)}
                    style={({ pressed }) => ({
                      opacity: pressed ? 0.7 : 1,
                    })}>
                    <View className="flex-row items-center justify-between py-3">
                      <View className="flex-1 pr-4">
                        <Text variant="subhead" style={{ fontWeight: '500' }}>
                          {item.question}
                        </Text>
                        {isExpanded && (
                          <Text variant="footnote" color="tertiary" className="mt-2" style={{ lineHeight: 20 }}>
                            {item.answer}
                          </Text>
                        )}
                      </View>
                      <Icon
                        name={isExpanded ? 'chevron.up' : 'chevron.down'}
                        size={20}
                        color={colors.mutedForeground}
                      />
                    </View>
                  </Pressable>
                  {index < FAQ_ITEMS.length - 1 && (
                    <View className="h-px my-2" style={{ backgroundColor: colors.border, opacity: 0.2 }} />
                  )}
                </View>
              );
            })}
          </View>

          {/* App Info */}
          <View
            className="rounded-2xl px-5 py-4"
            style={{
              backgroundColor: colors.card,
            }}>
            <View className="flex-row items-center gap-3 mb-3">
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: colors.background,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Icon name="info.circle.fill" size={20} color={colors.primary} />
              </View>
              <Text variant="subhead" style={{ fontWeight: '500' }}>
                App Version
              </Text>
            </View>
            <Text variant="footnote" color="tertiary" style={{ lineHeight: 20 }}>
              Inventory Management App v1.0.0
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
