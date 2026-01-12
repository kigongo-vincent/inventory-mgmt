import { Pressable, View } from 'react-native';
import Animated, { LayoutAnimationConfig, ZoomInRotate } from 'react-native-reanimated';

import { Icon } from '@/components/nativewindui/Icon';
import { cn } from '@/lib/cn';
import { useColorScheme } from '@/lib/useColorScheme';
import { COLORS } from '@/theme/colors';

export function ThemeToggle() {
  const { colorScheme } = useColorScheme();
  return (
    <LayoutAnimationConfig skipEntering>
      <Animated.View
        className="items-center justify-center"
        key={`toggle-${colorScheme}`}
        entering={ZoomInRotate}>
        <View className="opacity-50">
          <View className="px-0.5">
            <Icon name="moon.stars" color={COLORS.white} />
          </View>
        </View>
      </Animated.View>
    </LayoutAnimationConfig>
  );
}
