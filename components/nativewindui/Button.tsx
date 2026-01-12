import * as Slot from '@rn-primitives/slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Platform, Pressable, PressableProps, View, ViewStyle } from 'react-native';
import { useMemo } from 'react';

import { ActivityIndicator } from '@/components/nativewindui/ActivityIndicator';
import { TextClassContext } from '@/components/nativewindui/Text';
import { cn } from '@/lib/cn';
import { useColorScheme } from '@/lib/useColorScheme';
import { COLORS } from '@/theme/colors';
import { withOpacity } from '@/theme/with-opacity';

const buttonVariants = cva('flex-row items-center justify-center gap-2 self-center', {
  variants: {
    variant: {
      primary: 'ios:active:opacity-80 bg-primary',
      secondary: 'ios:border-primary ios:active:bg-primary/5 border border-foreground/40',
      tonal:
        'ios:bg-primary/10 dark:ios:bg-primary/10 ios:active:bg-primary/15 bg-primary/15 dark:bg-primary/30',
      plain: 'ios:active:opacity-70',
    },
    size: {
      none: '',
      sm: 'py-1 px-2.5 rounded-lg',
      md: 'rounded-lg py-3 px-5',
      lg: 'py-2.5 px-5 rounded-xl gap-2',
      icon: 'rounded-lg h-10 w-10',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});

const androidRootVariants = cva('overflow-hidden', {
  variants: {
    size: {
      none: '',
      icon: 'rounded-lg',
      sm: 'rounded-lg',
      md: 'rounded-lg',
      lg: 'rounded-xl',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

const buttonTextVariants = cva('font-poppins-medium', {
  variants: {
    variant: {
      primary: 'text-white',
      secondary: 'ios:text-primary text-foreground',
      tonal: 'ios:text-primary text-foreground',
      plain: 'text-foreground',
    },
    size: {
      none: '',
      icon: '',
      sm: 'text-base',
      md: 'text-base',
      lg: 'text-base',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});

const ANDROID_RIPPLE = {
  dark: {
    primary: { color: withOpacity(COLORS.dark.grey3, 0.4), borderless: false },
    secondary: { color: withOpacity(COLORS.dark.grey5, 0.8), borderless: false },
    plain: { color: withOpacity(COLORS.dark.grey5, 0.8), borderless: false },
    tonal: { color: withOpacity(COLORS.dark.grey5, 0.8), borderless: false },
  },
  light: {
    primary: { color: withOpacity(COLORS.light.grey4, 0.4), borderless: false },
    secondary: { color: withOpacity(COLORS.light.grey5, 0.4), borderless: false },
    plain: { color: withOpacity(COLORS.light.grey5, 0.4), borderless: false },
    tonal: { color: withOpacity(COLORS.light.grey6, 0.4), borderless: false },
  },
};

// Add as class when possible: https://github.com/marklawlor/nativewind/issues/522
const BORDER_CURVE: ViewStyle = {
  borderCurve: 'continuous',
};

type ButtonVariantProps = Omit<VariantProps<typeof buttonVariants>, 'variant'> & {
  variant?: Exclude<VariantProps<typeof buttonVariants>['variant'], null>;
};

type AndroidOnlyButtonProps = {
  /**
   * ANDROID ONLY: The class name of root responsible for hidding the ripple overflow.
   */
  androidRootClassName?: string;
};

type ButtonProps = PressableProps & ButtonVariantProps & AndroidOnlyButtonProps & {
  loading?: boolean;
};

const Root = Platform.OS === 'android' ? View : Slot.Pressable;

function Button({
  className,
  variant = 'primary',
  size,
  style = BORDER_CURVE,
  androidRootClassName,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const { colorScheme, colors } = useColorScheme();

  // Override primary color with dynamic color from settings
  // Inline styles take precedence over Tailwind classes
  const dynamicStyle = useMemo(() => {
    const baseStyle: ViewStyle = {};
    if (variant === 'primary') {
      baseStyle.backgroundColor = colors.primary;
    } else if (variant === 'secondary') {
      // Override border color for secondary variant
      baseStyle.borderColor = colors.primary;
    }
    return baseStyle;
  }, [variant, colors.primary]);

  const isDisabled = disabled || loading;
  const indicatorColor = variant === 'primary' ? '#FFFFFF' : colors.primary;

  return (
    <TextClassContext.Provider value={buttonTextVariants({ variant, size })}>
      <Root
        className={Platform.select({
          ios: undefined,
          default: androidRootVariants({
            size,
            className: androidRootClassName,
          }),
        })}>
        <Pressable
          className={cn(
            isDisabled && 'opacity-50',
            buttonVariants({ variant, size, className })
          )}
          style={[dynamicStyle, style]}
          android_ripple={ANDROID_RIPPLE[colorScheme][variant]}
          disabled={isDisabled}
          {...props}>
          {loading ? (
            <>
              <ActivityIndicator size="small" color={indicatorColor} />
              {children}
            </>
          ) : (
            children
          )}
        </Pressable>
      </Root>
    </TextClassContext.Provider>
  );
}

export { Button, buttonTextVariants, buttonVariants };
export type { ButtonProps };
