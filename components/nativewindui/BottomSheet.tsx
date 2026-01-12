import React, { useEffect, useRef } from 'react';
import {
  Modal,
  Pressable,
  View,
  Animated,
  TouchableWithoutFeedback,
  Dimensions,
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/nativewindui/Text';
import { Icon } from '@/components/nativewindui/Icon';
import { useColorScheme } from '@/lib/useColorScheme';

export interface BottomSheetOption {
  label: string;
  value: string;
  icon?: string;
  destructive?: boolean;
}

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  options: BottomSheetOption[];
  selectedValue?: string;
  onSelect: (value: string) => void;
  cancelLabel?: string;
  showIcons?: boolean;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export function BottomSheet({
  visible,
  onClose,
  title,
  options,
  selectedValue,
  onSelect,
  cancelLabel = 'Cancel',
  showIcons = false,
}: BottomSheetProps) {
  const { colors } = useColorScheme();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    if (visible) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      // Reset values
      slideAnim.setValue(SCREEN_HEIGHT);
      backdropOpacity.setValue(0);
      scaleAnim.setValue(0.95);
      
      // Animate in with spring-like easing
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Animate out
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 250,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, backdropOpacity, scaleAnim]);

  const handleSelect = (value: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelect(value);
    onClose();
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  // Calculate content height
  const optionHeight = 56;
  const titleHeight = title ? 60 : 0;
  const cancelHeight = 70; // Increased for larger button
  const padding = 20;
  const handleHeight = 20;
  const safeAreaBottom = 20; // Extra space for safe area
  const contentHeight = Math.min(
    titleHeight + (options.length * optionHeight) + cancelHeight + padding + handleHeight + safeAreaBottom,
    500
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent>
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Animated.View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              opacity: backdropOpacity,
            }}
          />
          
          <TouchableWithoutFeedback>
            <Animated.View
              style={{
                backgroundColor: colors.card,
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                maxHeight: contentHeight,
                transform: [
                  { translateY: slideAnim },
                  { scale: scaleAnim },
                ],
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -2 },
                shadowOpacity: 0.25,
                shadowRadius: 10,
                elevation: 10,
              }}>
              {/* Handle */}
              <View className="items-center pt-3 pb-2">
                <View
                  style={{
                    width: 36,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: colors.border,
                  }}
                />
              </View>

              {/* Title */}
              {title && (
                <View className="px-5 pb-4">
                  <Text
                    style={{
                      fontSize: 13.5,
                      fontWeight: '500',
                      color: colors.foreground,
                    }}>
                    {title}
                  </Text>
                </View>
              )}

              {/* Options */}
              <View>
                {options.map((option, index) => {
                  const isSelected = selectedValue === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => handleSelect(option.value)}
                      style={({ pressed }) => ({
                        opacity: pressed ? 0.6 : 1,
                        backgroundColor: pressed ? colors.background : 'transparent',
                      })}>
                      <View
                        className="px-5 py-4 flex-row items-center"
                        style={{ position: 'relative' }}>
                        {index < options.length - 1 && (
                          <View
                            style={{
                              position: 'absolute',
                              bottom: 0,
                              left: 20,
                              right: 20,
                              height: 0.5,
                              backgroundColor: colors.border,
                              opacity: 0.2,
                            }}
                          />
                        )}
                        {showIcons && option.icon && (
                          <Icon
                            name={option.icon}
                            size={20}
                            color={option.destructive ? colors.destructive : colors.primary}
                            style={{ marginRight: 12 }}
                          />
                        )}
                        <Text
                          style={{
                            fontSize: 13.5,
                            color: option.destructive 
                              ? colors.destructive 
                              : isSelected 
                                ? colors.primary 
                                : colors.foreground,
                            fontWeight: isSelected ? '600' : '400',
                            flex: 1,
                          }}>
                          {option.label}
                        </Text>
                        {!showIcons && isSelected && (
                          <Icon
                            name="checkmark"
                            size={18}
                            color={colors.primary}
                          />
                        )}
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              {/* Cancel Button */}
              <View
                className="mt-2"
                style={{
                  position: 'relative',
                  paddingBottom: insets.bottom,
                  backgroundColor: colors.card,
                }}>
                <View
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 0.5,
                    backgroundColor: colors.border,
                    opacity: 0.2,
                  }}
                />
                <Pressable
                  onPress={handleClose}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.7 : 1,
                    backgroundColor: pressed ? colors.background : 'transparent',
                  })}>
                  <View className="px-5 py-5">
                    <Text
                      style={{
                        fontSize: 13.5,
                        color: colors.foreground,
                        fontWeight: '500',
                        textAlign: 'center',
                      }}>
                      {cancelLabel}
                    </Text>
                  </View>
                </Pressable>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
