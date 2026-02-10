import { router } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { RefreshControl, ScrollView, View, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { Button } from '@/components/nativewindui/Button';
import { Icon } from '@/components/nativewindui/Icon';
import { Text } from '@/components/nativewindui/Text';
import { parseDate } from '@/lib/dateUtils';
import { useColorScheme } from '@/lib/useColorScheme';
import { useNotificationStore } from '@/store/notificationStore';
import { Notification, NotificationType } from '@/types';
import { withOpacity } from '@/theme/with-opacity';

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'sale':
      return 'chart.bar.fill';
    case 'inventory':
      return 'exclamationmark.triangle.fill';
    case 'user':
      return 'person.2.fill';
    case 'system':
      return 'gear.circle.fill';
    default:
      return 'bell.fill';
  }
};

const getNotificationColor = (type: NotificationType, colors: any) => {
  switch (type) {
    case 'sale':
      return colors.primary;
    case 'inventory':
      return '#FF9500';
    case 'user':
      return '#34C759';
    case 'system':
      return '#007AFF';
    default:
      return colors.primary;
  }
};

const formatTimeAgo = (dateString: string) => {
  if (!dateString) return '';
  const date = parseDate(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 0) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }
  if (diffInSeconds < 60) {
    return 'Just now';
  }
  if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}m ago`;
  }
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}h ago`;
  }
  if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}d ago`;
  }
  return date.getFullYear() !== now.getFullYear()
    ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export default function NotificationsScreen() {
  const { colors, colorScheme } = useColorScheme();
  const [refreshing, setRefreshing] = useState(false);
  const notifications = useNotificationStore((state) => state.notifications);
  const fetchNotifications = useNotificationStore((state) => state.fetchNotifications);
  const markAsRead = useNotificationStore((state) => state.markAsRead);
  const markAllAsRead = useNotificationStore((state) => state.markAllAsRead);
  const deleteNotification = useNotificationStore((state) => state.deleteNotification);
  const clearAllNotifications = useNotificationStore((state) => state.clearAllNotifications);
  const getUnreadCount = useNotificationStore((state) => state.getUnreadCount);

  // Fetch notifications on mount
  useEffect(() => {
    fetchNotifications();
  }, []);

  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter((n) => !n.read)
    : notifications;

  const unreadCount = getUnreadCount();

  const handleNotificationPress = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    
    // Navigate to related item if available
    if (notification.relatedId) {
      if (notification.type === 'sale') {
        router.push(`/sale-details/${notification.relatedId}`);
      } else if (notification.type === 'inventory') {
        router.push('/(tabs)/inventory');
      } else if (notification.type === 'user') {
        router.push('/(tabs)/users');
      }
    }
  };

  const handleDeleteNotification = (id: string, e: any) => {
    e.stopPropagation();
    deleteNotification(id);
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to clear all notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: clearAllNotifications,
        },
      ]
    );
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
                  Notifications
                </Text>
                {unreadCount > 0 && (
                  <Text variant="footnote" style={{ color: colors.mutedForeground, marginTop: 2 }}>
                    {unreadCount} unread
                  </Text>
                )}
              </View>
              {notifications.length > 0 && (
                <Pressable
                  onPress={() => router.push('/notification-preferences')}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: 'rgba(255, 255, 255, 0.25)',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                    }}>
                    <Icon name="gearshape.fill" size={20} color="#FFFFFF" />
                  </View>
                </Pressable>
              )}
            </View>
          </View>
        </SafeAreaView>
      </View>

      {/* Filter Tabs */}
      {notifications.length > 0 && (
        <View className="px-5 pt-4 pb-3">
          <View className="flex-row items-center justify-between gap-2">
            <View className="flex-row gap-2">
              <Pressable
                onPress={() => setFilter('all')}
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
                <View
                  className="px-4 py-2 rounded-full"
                  style={{
                    backgroundColor: filter === 'all' ? colors.primary : colors.card,
                    borderWidth: 1,
                    borderColor: filter === 'all' ? colors.primary : colors.border,
                  }}>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: filter === 'all' ? '600' : '400',
                      color: filter === 'all' ? colors.primaryForeground : colors.foreground,
                    }}>
                    All
                  </Text>
                </View>
              </Pressable>
              <Pressable
                onPress={() => setFilter('unread')}
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
                <View
                  className="px-4 py-2 rounded-full flex-row items-center gap-2"
                  style={{
                    backgroundColor: filter === 'unread' ? colors.primary : colors.card,
                    borderWidth: 1,
                    borderColor: filter === 'unread' ? colors.primary : colors.border,
                  }}>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: filter === 'unread' ? '600' : '400',
                      color: filter === 'unread' ? colors.primaryForeground : colors.foreground,
                    }}>
                    Unread
                  </Text>
                  {unreadCount > 0 && (
                    <View
                      className="h-5 w-5 items-center justify-center rounded-full"
                      style={{
                        backgroundColor: filter === 'unread' 
                          ? 'rgba(255, 255, 255, 0.3)' 
                          : colors.primary,
                        minWidth: 20,
                        paddingHorizontal: unreadCount > 9 ? 4 : 0,
                      }}>
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: '500',
                          color: filter === 'unread' ? '#FFFFFF' : colors.primaryForeground,
                          includeFontPadding: false,
                          textAlign: 'center',
                          textAlignVertical: 'center',
                        }}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </Text>
                    </View>
                  )}
                </View>
              </Pressable>
            </View>
            {unreadCount > 0 && filter === 'all' && (
              <Button
                onPress={markAllAsRead}
                variant="secondary"
                size="sm">
                <Text style={{ color: colors.primary, fontSize: 13 }}>Mark All as Read</Text>
              </Button>
            )}
          </View>
        </View>
      )}

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24, paddingTop: 8 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await fetchNotifications();
              setRefreshing(false);
            }}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.background}
          />
        }>
        <View className="px-5 pt-2">
          {filteredNotifications.length === 0 ? (
            <View
              className="rounded-2xl px-5 py-12 items-center justify-center"
              style={{
                backgroundColor: colors.card,
              }}>
              <Icon name="bell.slash" size={40} color={colors.primary} style={{ opacity: 0.3, marginBottom: 12 }} />
              <Text variant="subhead" color="tertiary" style={{ fontSize: 16, fontWeight: '500', marginBottom: 4 }}>
                {filter === 'unread' ? 'No unread notifications' : 'No notifications'}
              </Text>
              <Text variant="footnote" color="tertiary" style={{ fontSize: 13 }}>
                {filter === 'unread' ? 'All caught up!' : 'You\'ll see notifications here'}
              </Text>
            </View>
          ) : (
            <>
              <View className="gap-3">
                {filteredNotifications.map((notification, index) => {
                  const iconName = getNotificationIcon(notification.type);
                  const iconColor = getNotificationColor(notification.type, colors);
                  
                  return (
                    <Pressable
                      key={`${notification.id}-${index}`}
                      onPress={() => handleNotificationPress(notification)}
                      style={({ pressed }) => ({
                        opacity: pressed ? 0.7 : 1,
                      })}>
                      <View
                        className="rounded-2xl px-5 py-4 flex-row gap-4"
                        style={{
                          backgroundColor: notification.read ? colors.card : withOpacity(colors.primary, 0.05),
                          borderWidth: notification.read ? 0.5 : 1,
                          borderColor: notification.read 
                            ? withOpacity(colors.border, 0.2) 
                            : withOpacity(colors.primary, 0.2),
                        }}>
                        <View
                          className="h-12 w-12 items-center justify-center rounded-xl"
                          style={{ backgroundColor: withOpacity(iconColor, 0.1) }}>
                          <Icon name={iconName as any} size={22} color={iconColor} />
                        </View>
                        <View className="flex-1 min-w-0">
                          <View className="flex-row items-start justify-between mb-1">
                            <Text
                              variant="subhead"
                              style={{
                                fontWeight: notification.read ? '500' : '600',
                                fontSize: 15,
                                flex: 1,
                              }}
                              numberOfLines={1}>
                              {notification.title}
                            </Text>
                            {!notification.read && (
                              <View
                                className="h-2 w-2 rounded-full ml-2"
                                style={{ backgroundColor: colors.primary, marginTop: 6 }}
                              />
                            )}
                          </View>
                          <Text
                            variant="body"
                            color="tertiary"
                            style={{ fontSize: 13, marginBottom: 4 }}
                            numberOfLines={2}>
                            {notification.message}
                          </Text>
                          <Text variant="footnote" color="tertiary" style={{ fontSize: 11 }}>
                            {formatTimeAgo(notification.createdAt)}
                          </Text>
                        </View>
                        <Pressable
                          onPress={(e) => handleDeleteNotification(notification.id, e)}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                          <Icon name="xmark.circle.fill" size={20} color={colors.mutedForeground} style={{ opacity: 0.5 }} />
                        </Pressable>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
              {notifications.length > 0 && (
                <View className="mt-4">
                  <Button
                    onPress={handleClearAll}
                    variant="plain"
                    size="sm">
                    <Text style={{ color: colors.destructive, fontSize: 13 }}>Clear All Notifications</Text>
                  </Button>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
