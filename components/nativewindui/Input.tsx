import { cssInterop } from 'nativewind';
import * as React from 'react';
import { TextInput, TextInputProps } from 'react-native';

import { cn } from '@/lib/cn';
import { useColorScheme } from '@/lib/useColorScheme';

cssInterop(TextInput, { className: 'style' });

interface InputProps extends TextInputProps {
  className?: string;
}

export const Input = React.forwardRef<TextInput, InputProps>(
  ({ className, style, ...props }, ref) => {
    const { colors } = useColorScheme();

    return (
      <TextInput
        ref={ref}
        className={cn(
          'rounded-xl px-4 py-3.5 text-base font-poppins-regular',
          className
        )}
        style={[
          {
            backgroundColor: colors.input || colors.card,
            color: colors.foreground,
            fontFamily: 'Poppins-Regular',
          },
          style,
        ]}
        placeholderTextColor={colors.mutedForeground}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';



