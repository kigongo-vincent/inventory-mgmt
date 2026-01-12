import React, { useEffect, useRef } from 'react';
import { Animated, View, ViewStyle } from 'react-native';
import { useColorScheme } from '@/lib/useColorScheme';
import { withOpacity } from '@/theme/with-opacity';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
  variant?: 'default' | 'circular' | 'rounded';
}

export function Skeleton({
  width = '100%',
  height = 20,
  borderRadius = 8,
  style,
  variant = 'default',
}: SkeletonProps) {
  const { colors } = useColorScheme();
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const getBorderRadius = () => {
    if (variant === 'circular') {
      return typeof height === 'number' ? height / 2 : 50;
    }
    if (variant === 'rounded') {
      return borderRadius;
    }
    return borderRadius;
  };

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: getBorderRadius(),
          backgroundColor: withOpacity(colors.mutedForeground, 0.2),
          opacity,
        },
        style,
      ]}
    />
  );
}

// Pre-built skeleton components for common patterns
export function SkeletonCard({ style }: { style?: ViewStyle }) {
  const { colors } = useColorScheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: 16,
          padding: 20,
          gap: 12,
        },
        style,
      ]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Skeleton width={56} height={56} variant="circular" />
        <View style={{ flex: 1, gap: 8 }}>
          <Skeleton width="70%" height={16} />
          <Skeleton width="50%" height={14} />
        </View>
      </View>
      <Skeleton width="100%" height={12} />
      <Skeleton width="80%" height={12} />
    </View>
  );
}

export function SkeletonListItem({ style }: { style?: ViewStyle }) {
  const { colors } = useColorScheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: 16,
          padding: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        },
        style,
      ]}>
      <Skeleton width={48} height={48} variant="circular" />
      <View style={{ flex: 1, gap: 8 }}>
        <Skeleton width="60%" height={16} />
        <Skeleton width="40%" height={14} />
      </View>
      <Skeleton width={60} height={16} />
    </View>
  );
}

export function SkeletonSaleCard({ style }: { style?: ViewStyle }) {
  const { colors } = useColorScheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: 16,
          padding: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 16,
        },
        style,
      ]}>
      <Skeleton width={56} height={56} borderRadius={12} />
      <View style={{ flex: 1, gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Skeleton width="65%" height={16} />
          <Skeleton width={60} height={20} borderRadius={10} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Skeleton width={80} height={12} />
          <Skeleton width={100} height={12} />
        </View>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Skeleton width={70} height={16} />
        <Skeleton width={20} height={14} />
      </View>
    </View>
  );
}

export function SkeletonProductCard({ style }: { style?: ViewStyle }) {
  const { colors } = useColorScheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: 16,
          padding: 16,
          gap: 12,
        },
        style,
      ]}>
      <Skeleton width="100%" height={120} borderRadius={12} />
      <Skeleton width="80%" height={18} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Skeleton width={60} height={16} />
        <Skeleton width={80} height={16} />
      </View>
      <Skeleton width="100%" height={12} />
    </View>
  );
}

export function SkeletonStatCard({ style }: { style?: ViewStyle }) {
  const { colors } = useColorScheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: 16,
          padding: 20,
          gap: 12,
        },
        style,
      ]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Skeleton width={100} height={14} />
        <Skeleton width={40} height={40} borderRadius={10} />
      </View>
      <Skeleton width={120} height={24} />
      <Skeleton width="80%" height={12} />
    </View>
  );
}

export function SkeletonDetailHeader({ style }: { style?: ViewStyle }) {
  return (
    <View style={[{ gap: 16 }, style]}>
      <Skeleton width={44} height={44} variant="circular" />
      <View style={{ gap: 8 }}>
        <Skeleton width="70%" height={24} />
        <Skeleton width="50%" height={16} />
      </View>
    </View>
  );
}

export function SkeletonDetailSection({ style }: { style?: ViewStyle }) {
  return (
    <View style={[{ gap: 12 }, style]}>
      <Skeleton width={100} height={16} />
      <View style={{ gap: 8 }}>
        <Skeleton width="100%" height={14} />
        <Skeleton width="90%" height={14} />
        <Skeleton width="95%" height={14} />
      </View>
    </View>
  );
}

export function SkeletonList({ count = 3, renderItem }: { count?: number; renderItem?: () => React.ReactNode }) {
  const items = Array.from({ length: count }, (_, i) => i);
  const Item = renderItem || (() => <SkeletonListItem />);
  
  return (
    <View style={{ gap: 12 }}>
      {items.map((item) => (
        <Item key={item} />
      ))}
    </View>
  );
}
