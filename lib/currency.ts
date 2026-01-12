/**
 * Currency formatting utility
 */

const CURRENCY_SYMBOLS: Record<string, string> = {
  UGX: 'UGX',
  NGN: '₦',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

/**
 * Formats a number as currency with the appropriate symbol
 * Supports K (thousands) and M (millions) abbreviations for large numbers
 * @param amount - The amount to format
 * @param currency - The currency code (e.g., 'UGX', 'NGN', 'USD')
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency: string = 'UGX'): string {
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  
  // Handle millions
  if (Math.abs(amount) >= 1000000) {
    const millions = amount / 1000000;
    // Show 1 decimal place if needed, otherwise show as whole number
    const formatted = millions % 1 === 0 
      ? millions.toFixed(0) 
      : millions.toFixed(1);
    return `${symbol} ${formatted}M`;
  }
  
  // Handle thousands
  if (Math.abs(amount) >= 1000) {
    const thousands = amount / 1000;
    // Show 1 decimal place if needed, otherwise show as whole number
    const formatted = thousands % 1 === 0 
      ? thousands.toFixed(0) 
      : thousands.toFixed(1);
    return `${symbol} ${formatted}K`;
  }
  
  // For amounts less than 1000, show full number with locale formatting
  return `${symbol} ${amount.toLocaleString()}`;
}

/**
 * Gets the currency symbol for a given currency code
 * @param currency - The currency code
 * @returns The currency symbol
 */
export function getCurrencySymbol(currency: string = 'UGX'): string {
  return CURRENCY_SYMBOLS[currency] || currency;
}

