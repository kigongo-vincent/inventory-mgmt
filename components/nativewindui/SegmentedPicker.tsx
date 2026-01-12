import React from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/nativewindui/Text';
import { useColorScheme } from '@/lib/useColorScheme';
import { withOpacity } from '@/theme/with-opacity';

export interface SegmentedPickerOption {
  label: string;
  value: string;
}

export interface SegmentedPickerProps {
  options: SegmentedPickerOption[];
  selectedValue: string;
  onValueChange: (value: string) => void;
}

export function SegmentedPicker({
  options,
  selectedValue,
  onValueChange,
}: SegmentedPickerProps) {
  const { colors } = useColorScheme();

  return (
    <View
      className="rounded-2xl overflow-hidden"
      style={{
        backgroundColor: colors.background,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 0.5,
        borderColor: withOpacity(colors.border, 0.2),
      }}>
      {options.map((option, index) => {
        const isSelected = selectedValue === option.value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onValueChange(option.value)}
            style={({ pressed }) => ({
              opacity: pressed ? 0.7 : 1,
            })}>
            <View
              className="px-4 py-3.5"
              style={{
                backgroundColor: isSelected ? colors.primary : 'transparent',
                position: 'relative',
              }}>
              {index < options.length - 1 && (
                <View
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 0.5,
                    backgroundColor: colors.border,
                    opacity: 0.2,
                  }}
                />
              )}
              <Text
                style={{
                  fontSize: 13.5,
                  color: isSelected ? colors.primaryForeground : colors.foreground,
                  fontWeight: isSelected ? '600' : '400',
                }}>
                {option.label}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
