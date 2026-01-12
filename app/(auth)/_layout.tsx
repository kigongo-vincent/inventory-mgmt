import { Stack } from 'expo-router';
import { useColorScheme } from '@/lib/useColorScheme';

export default function AuthLayout() {
  const { colors } = useColorScheme();
  
  return (
    <Stack 
      screenOptions={{ 
        headerShown: false,
        contentStyle: {
          backgroundColor: colors.background,
        },
        animation: 'default',
        animationDuration: 200,
      }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}



