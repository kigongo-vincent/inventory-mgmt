import { VariantProps, cva } from 'class-variance-authority';
import { cssInterop } from 'nativewind';
import * as React from 'react';
import { UITextView } from 'react-native-uitextview';

import { cn } from '@/lib/cn';
import { t } from '@/lib/i18n';
import { useColorScheme } from '@/lib/useColorScheme';
import { getPoppinsFontFamily } from '@/lib/fontUtils';

cssInterop(UITextView, { className: 'style' });

// Typography system based on Poppins
// Base sizes: small = 12px, normal = 14px, large = 18px
const textVariants = cva('text-foreground font-poppins-regular', {
  variants: {
    variant: {
      largeTitle: 'text-4xl font-poppins-bold', // ~36px
      title1: 'text-2xl font-poppins-bold', // ~24px
      title2: 'text-[22px] leading-7 font-poppins-semibold', // 22px
      title3: 'text-xl font-poppins-semibold', // ~20px
      heading: 'text-[17px] leading-6 font-poppins-semibold', // 17px
      body: 'text-normal font-poppins-regular', // 14px (normal base)
      callout: 'text-normal font-poppins-medium', // 14px
      subhead: 'text-[15px] leading-6 font-poppins-regular', // 15px
      footnote: 'text-[13px] leading-5 font-poppins-regular', // 13px
      caption1: 'text-small font-poppins-regular', // 12px (small base)
      caption2: 'text-[11px] leading-4 font-poppins-regular', // 11px
    },
    color: {
      primary: '',
      secondary: 'text-secondary-foreground/90',
      tertiary: 'text-muted-foreground/90',
      quarternary: 'text-muted-foreground/50',
    },
  },
  defaultVariants: {
    variant: 'body',
    color: 'primary',
  },
});

const TextClassContext = React.createContext<string | undefined>(undefined);

function Text({
  className,
  variant,
  color,
  style,
  children,
  i18nKey,
  i18nOptions,
  ...props
}: React.ComponentProps<typeof UITextView> & VariantProps<typeof textVariants> & {
  i18nKey?: string;
  i18nOptions?: object;
}) {
  const textClassName = React.useContext(TextClassContext);
  const { colors } = useColorScheme();
  
  // If i18nKey is provided, use translation, otherwise use children as-is
  const displayText = React.useMemo(() => {
    if (i18nKey) {
      return t(i18nKey, i18nOptions);
    }
    return children;
  }, [i18nKey, i18nOptions, children]);
  
  // Check if textClassName contains 'text-white' (from button context)
  const isWhiteText = textClassName?.includes('text-white');
  
  // Detect Tailwind font weight classes in className
  const combinedClassName = cn(textClassName, className);
  const hasFontBold = combinedClassName?.includes('font-bold');
  const hasFontSemibold = combinedClassName?.includes('font-semibold');
  const hasFontMedium = combinedClassName?.includes('font-medium');
  const hasFontLight = combinedClassName?.includes('font-light');
  
  // Apply theme color directly for primary color to ensure theme switching works
  const textStyle = React.useMemo(() => {
    const baseStyle: any = {
      fontFamily: 'Poppins-Regular', // Default Poppins font
    };
    
    // Apply font weight based on variant
    if (variant === 'largeTitle' || variant === 'title1') {
      baseStyle.fontFamily = 'Poppins-Bold';
    } else if (variant === 'title2' || variant === 'title3' || variant === 'heading') {
      baseStyle.fontFamily = 'Poppins-SemiBold';
    } else if (variant === 'callout') {
      baseStyle.fontFamily = 'Poppins-Medium';
    }
    
    // Override with Tailwind font weight classes if present (highest priority)
    if (hasFontBold) {
      baseStyle.fontFamily = 'Poppins-Bold';
    } else if (hasFontSemibold) {
      baseStyle.fontFamily = 'Poppins-SemiBold';
    } else if (hasFontMedium) {
      baseStyle.fontFamily = 'Poppins-Medium';
    } else if (hasFontLight) {
      baseStyle.fontFamily = 'Poppins-Light';
    }
    
    // Extract style properties from style prop
    let styleObj = style && typeof style === 'object' && !Array.isArray(style) 
      ? (style as any)
      : undefined;
    
    const styleColor = styleObj?.color;
    const styleFontWeight = styleObj?.fontWeight;
    
    // Convert fontWeight to fontFamily if provided in style prop
    // This ensures we always use Poppins fonts instead of system fonts
    // Note: Tailwind classes take precedence over style prop fontWeight
    if (styleFontWeight && !hasFontBold && !hasFontSemibold && !hasFontMedium && !hasFontLight) {
      baseStyle.fontFamily = getPoppinsFontFamily(styleFontWeight);
      // Remove fontWeight from style to prevent system font fallback
      if (styleObj) {
        const { fontWeight, ...restStyle } = styleObj;
        styleObj = restStyle;
      }
    }
    
    // Only apply theme color if no explicit color is set in style prop
    // This allows explicit colors to override theme colors when needed
    if (!styleColor) {
      // If text is inside a button with white text, use white
      if (isWhiteText) {
        baseStyle.color = '#FFFFFF';
      } else if (!color || color === 'primary') {
        baseStyle.color = colors.foreground;
      } else if (color === 'secondary') {
        baseStyle.color = colors.secondaryForeground || colors.foreground;
      } else if (color === 'tertiary') {
        baseStyle.color = colors.mutedForeground || colors.foreground;
      } else if (color === 'quarternary') {
        baseStyle.color = colors.mutedForeground || colors.foreground;
        baseStyle.opacity = 0.5;
      }
    }
    
    // Return style array: baseStyle first (lowest priority), then user's style (highest priority)
    // Use styleObj if we modified it (removed fontWeight), otherwise use original style
    return [baseStyle, styleObj !== undefined ? styleObj : style];
  }, [color, colors, style, isWhiteText, variant, hasFontBold, hasFontSemibold, hasFontMedium, hasFontLight, className, textClassName]);
  
  // Remove font weight classes from className to prevent NativeWind from applying fontWeight
  // We handle font weight via fontFamily in the style instead
  const cleanedClassName = combinedClassName
    ?.replace(/\bfont-bold\b/g, '')
    ?.replace(/\bfont-semibold\b/g, '')
    ?.replace(/\bfont-medium\b/g, '')
    ?.replace(/\bfont-light\b/g, '')
    ?.trim();
  
  return (
    <UITextView
      className={cn(textVariants({ variant, color }), cleanedClassName)}
      style={textStyle}
      {...props}>
      {displayText}
    </UITextView>
  );
}

export { Text, TextClassContext, textVariants };
