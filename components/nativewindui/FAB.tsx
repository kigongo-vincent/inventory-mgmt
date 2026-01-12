import React, { useState, useMemo } from 'react';
import { Pressable, View, Animated, Easing, TouchableWithoutFeedback, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { Icon } from '@/components/nativewindui/Icon';
import { Text } from '@/components/nativewindui/Text';
import { useColorScheme } from '@/lib/useColorScheme';
import { withOpacity } from '@/theme/with-opacity';

export interface FABOption {
  label: string;
  icon: string;
  onPress: () => void;
}

export interface FABProps {
  options: FABOption[];
}

export function FAB({ options = [] }: FABProps) {
  const { colors } = useColorScheme();
  const insets = useSafeAreaInsets();
  const [isOpen, setIsOpen] = useState(false);
  const rotation = React.useRef(new Animated.Value(0)).current;
  const scale = React.useRef(new Animated.Value(0)).current;
  const opacity = React.useRef(new Animated.Value(0)).current;

  // Don't render if no options
  if (!options || options.length === 0) {
    return null;
  }

  // Calculate max content width for all options
  const maxContentWidth = React.useMemo(() => {
    // Handle empty options array
    if (!options || options.length === 0) {
      return 180;
    }
    // Approximate width calculation: icon (32) + margin (12) + text width + padding (32)
    // For more accurate sizing, we'll use a reasonable min width
    const maxLabelLength = Math.max(...options.map(opt => opt.label?.length || 0));
    // Approximate: ~8px per character + icon space + padding
    return Math.max(180, maxLabelLength * 8 + 60);
  }, [options]);

  const toggleMenu = () => {
    const toValue = isOpen ? 0 : 1;
    setIsOpen(!isOpen);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Animated.parallel([
      Animated.spring(rotation, {
        toValue: toValue,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }),
      Animated.spring(scale, {
        toValue: toValue,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }),
      Animated.timing(opacity, {
        toValue: toValue,
        duration: 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeMenu = () => {
    if (isOpen) {
      setIsOpen(false);
      Animated.parallel([
        Animated.spring(rotation, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.spring(scale, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 150,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  const handleOptionPress = (onPress: () => void) => {
    setIsOpen(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    Animated.parallel([
      Animated.spring(rotation, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }),
      Animated.spring(scale, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 150,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(() => {
      onPress();
    });
  };

  const rotateInterpolate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  return (
    <>
      {/* Backdrop when FAB is open */}
      {isOpen && (
        <TouchableWithoutFeedback onPress={closeMenu}>
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 9998,
            }}
          />
        </TouchableWithoutFeedback>
      )}

      <View
        style={{
          position: 'absolute',
          bottom: insets.bottom + 20,
          right: 20,
          zIndex: 9999,
          elevation: Platform.OS === 'android' ? 8 : 0,
        }}
        pointerEvents="box-none">
        {/* Options */}
        {options.filter(Boolean).map((option, index) => {
          const translateY = scale.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -(72 * (index + 1) + 12)],
          });

          return (
            <Animated.View
              key={`${option.label}-${option.icon}-${index}`}
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                transform: [{ translateY }, { scale }],
                opacity,
                zIndex: options.length - index + 10000, // Higher z-index for items further from main button
                elevation: Platform.OS === 'android' ? 6 : 0,
              }}
              pointerEvents={isOpen ? 'auto' : 'none'}>
              <Pressable
                onPress={() => handleOptionPress(option.onPress)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.7 : 1,
                })}>
                <View

                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: colors.card,
                    paddingHorizontal: 20,
                    paddingVertical: 10,
                    borderRadius: 100, // rounded-lg
                    marginBottom: 12,
                    minWidth: maxContentWidth,
                    borderWidth: 0.5,
                    borderColor: withOpacity(colors.border, 0.2),
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.05,
                    shadowRadius: 4,
                    elevation: Platform.OS === 'android' ? 10 : 0,
                  }}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: colors.background,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 14,
                    }}>
                    <Icon name={option.icon} size={20} color={colors.primary} />
                  </View>
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: '500',
                      color: colors.foreground,
                    }}>
                    {option.label}
                  </Text>
                </View>
              </Pressable>
            </Animated.View>
          );
        })}

        {/* Main FAB Button */}
        <Pressable
          onPress={toggleMenu}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={({ pressed }) => ({
            opacity: pressed ? 0.8 : 1,
          })}>
          <Animated.View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
              transform: [{ rotate: rotateInterpolate }],

            }}>
            <Icon name={isOpen ? 'xmark' : 'plus'} size={24} color="#FFFFFF" />
          </Animated.View>
        </Pressable>
      </View>
    </>
  );
}
