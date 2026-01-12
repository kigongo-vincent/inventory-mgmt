import React, { useEffect, useRef, ReactNode, useCallback, useState } from 'react';
import {
  Modal as RNModal,
  View,
  Animated,
  TouchableWithoutFeedback,
  Dimensions,
  Easing,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/nativewindui/Text';
import { useColorScheme } from '@/lib/useColorScheme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  maxHeight?: number;
}

export function Modal({
  visible,
  onClose,
  title,
  subtitle,
  children,
  maxHeight = 600,
}: ModalProps) {
  const { colors } = useColorScheme();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const panY = useRef(new Animated.Value(0)).current;
  const hasAnimatedIn = useRef(false);

  useEffect(() => {
    if (visible) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // Always reset values when opening to ensure animation is visible
      slideAnim.setValue(SCREEN_HEIGHT);
      backdropOpacity.setValue(0);
      scaleAnim.setValue(0.95);
      panY.setValue(0);
      
      // Use requestAnimationFrame to ensure the animation starts after render
      requestAnimationFrame(() => {
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
        ]).start(() => {
          hasAnimatedIn.current = true;
        });
      });
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
      ]).start(() => {
        hasAnimatedIn.current = false;
      });
    }
  }, [visible, slideAnim, backdropOpacity, scaleAnim]);

  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  }, [onClose]);

  // Pan responder for drag to close - handle area only
  const handlePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only respond to downward gestures
        return Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && gestureState.dy > 3;
      },
      onPanResponderGrant: () => {
        panY.setOffset(panY._value);
      },
      onPanResponderMove: (evt, gestureState) => {
        // Only allow dragging down
        if (gestureState.dy > 0) {
          panY.setValue(gestureState.dy);
          // Update backdrop opacity as we drag
          const opacity = Math.max(0, 1 - gestureState.dy / 300);
          backdropOpacity.setValue(opacity);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        panY.flattenOffset();
        const dragThreshold = 70;
        
        if (gestureState.dy > dragThreshold || gestureState.vy > 0.3) {
          // Close modal if dragged down enough
          handleClose();
        } else {
          // Snap back to original position
          Animated.parallel([
            Animated.spring(panY, {
              toValue: 0,
              useNativeDriver: true,
              tension: 65,
              friction: 11,
            }),
            Animated.timing(backdropOpacity, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
    })
  ).current;

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            <Animated.View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                opacity: backdropOpacity,
              }}
            />
            
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <Animated.View
                style={{
                  backgroundColor: colors.card,
                  borderTopLeftRadius: 20,
                  borderTopRightRadius: 20,
                  maxHeight: Math.min(maxHeight, SCREEN_HEIGHT * 0.9),
                  transform: [
                    { translateY: Animated.add(slideAnim, panY) },
                    { scale: scaleAnim },
                  ],
                }}>
                {/* Handle - draggable area */}
                <View 
                  className="items-center pt-3 pb-2"
                  {...handlePanResponder.panHandlers}
                  style={{ paddingVertical: 12, minHeight: 50 }}>
                  <View
                    style={{
                      width: 36,
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: colors.border,
                    }}
                  />
                </View>

                {/* Content */}
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled
                  bounces={false}
                  keyboardDismissMode="on-drag"
                  contentContainerStyle={{
                    paddingHorizontal: 20,
                    paddingTop: (title || subtitle) ? 0 : 0,
                    paddingBottom: insets.bottom + 20,
                  }}>
                  {/* Title Section */}
                  {(title || subtitle) && (
                    <View className="pb-4">
                      {title && (
                        <Text
                          style={{
                            fontSize: 13.5,
                            fontWeight: '500',
                            color: colors.foreground,
                            marginBottom: subtitle ? 4 : 0,
                          }}>
                          {title}
                        </Text>
                      )}
                      {subtitle && (
                        <Text
                          variant="footnote"
                          color="tertiary"
                          style={{ fontSize: 13.5 }}>
                          {subtitle}
                        </Text>
                      )}
                    </View>
                  )}
                  {children}
                </ScrollView>
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </RNModal>
  );
}
