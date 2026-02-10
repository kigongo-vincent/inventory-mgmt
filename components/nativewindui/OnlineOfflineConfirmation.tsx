import React from 'react';
import { View, Pressable, Alert } from 'react-native';

import { Button } from '@/components/nativewindui/Button';
import { Icon } from '@/components/nativewindui/Icon';
import { Modal } from '@/components/nativewindui/Modal';
import { Text } from '@/components/nativewindui/Text';
import { useColorScheme } from '@/lib/useColorScheme';
import { SyncStatus } from '@/types';

interface OnlineOfflineConfirmationProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (syncStatus: SyncStatus) => void;
  title?: string;
  message?: string;
}

export function OnlineOfflineConfirmation({
  visible,
  onClose,
  onConfirm,
  title = 'Save Location',
  message = 'Where would you like to save this product?',
}: OnlineOfflineConfirmationProps) {
  const { colors } = useColorScheme();

  const handleSelect = (syncStatus: SyncStatus) => {
    onConfirm(syncStatus);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={title}
      subtitle={message}
      maxHeight={400}>
      <View className="gap-4">
        <Pressable
          onPress={() => handleSelect('online')}
          style={({ pressed }) => ({
            opacity: pressed ? 0.7 : 1,
          })}>
          <View
            className="rounded-xl px-5 py-4 flex-row items-center gap-4"
            style={{
              backgroundColor: colors.background,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.04,
              shadowRadius: 4,
              elevation: 1,
            }}>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Icon name="cloud.fill" size={24} color="#FFFFFF" />
            </View>
            <View className="flex-1">
              <Text variant="subhead" style={{ fontWeight: '500', fontSize: 16 }}>
                Save Online
              </Text>
              <Text variant="footnote" color="tertiary" style={{ fontSize: 13, marginTop: 2 }}>
                Sync immediately to server
              </Text>
            </View>
            <Icon name="chevron.right" size={20} color={colors.mutedForeground} />
          </View>
        </Pressable>

        <Pressable
          onPress={() => handleSelect('offline')}
          style={({ pressed }) => ({
            opacity: pressed ? 0.7 : 1,
          })}>
          <View
            className="rounded-xl px-5 py-4 flex-row items-center gap-4"
            style={{
              backgroundColor: colors.background,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.04,
              shadowRadius: 4,
              elevation: 1,
            }}>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: colors.background,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                borderColor: colors.primary,
              }}>
              <Icon name="externaldrive.fill" size={24} color={colors.primary} />
            </View>
            <View className="flex-1">
              <Text variant="subhead" style={{ fontWeight: '500', fontSize: 16 }}>
                Save Offline
              </Text>
              <Text variant="footnote" color="tertiary" style={{ fontSize: 13, marginTop: 2 }}>
                Store locally, sync later
              </Text>
            </View>
            <Icon name="chevron.right" size={20} color={colors.mutedForeground} />
          </View>
        </Pressable>
      </View>
    </Modal>
  );
}
