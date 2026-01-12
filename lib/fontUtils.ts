/**
 * Utility functions for Poppins font family management
 * Converts fontWeight values to Poppins fontFamily to prevent system font fallback
 */

/**
 * Converts fontWeight to Poppins fontFamily
 * @param fontWeight - Font weight as string ('300', '400', '500', '600', '700', 'light', 'normal', 'medium', 'semibold', 'bold') or number
 * @returns Poppins font family name
 */
export function getPoppinsFontFamily(fontWeight?: string | number): string {
  if (!fontWeight) return 'Poppins-Regular';
  
  const weight = typeof fontWeight === 'string' ? fontWeight.toLowerCase() : String(fontWeight);
  
  // Map fontWeight values to Poppins font families
  if (weight === '300' || weight === 'light') return 'Poppins-Light';
  if (weight === '400' || weight === 'normal' || weight === 'regular') return 'Poppins-Regular';
  if (weight === '500' || weight === 'medium') return 'Poppins-Medium';
  if (weight === '600' || weight === 'semibold' || weight === 'semi-bold') return 'Poppins-SemiBold';
  if (weight === '700' || weight === 'bold') return 'Poppins-Bold';
  
  // Default fallback
  return 'Poppins-Regular';
}

/**
 * Converts a style object with fontWeight to use fontFamily instead
 * This prevents React Native from falling back to system fonts
 * @param style - Style object that may contain fontWeight
 * @returns Style object with fontWeight converted to fontFamily
 */
export function convertFontWeightToFontFamily(style: any): any {
  if (!style || typeof style !== 'object') return style;
  
  // Handle array of styles
  if (Array.isArray(style)) {
    return style.map(convertFontWeightToFontFamily);
  }
  
  const { fontWeight, ...restStyle } = style;
  
  if (fontWeight) {
    return {
      ...restStyle,
      fontFamily: getPoppinsFontFamily(fontWeight),
    };
  }
  
  return style;
}
