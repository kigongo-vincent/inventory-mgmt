/**
 * Safely parses a date string that may come from PostgreSQL or other formats
 * Handles formats like:
 * - "2026-01-11 14:26:58.069336+00" (PostgreSQL timestamp)
 * - "2026-01-11T14:26:58.069Z" (ISO format)
 * - Standard date strings
 */
export function parseDate(dateString: string | null | undefined): Date {
  if (!dateString) {
    return new Date();
  }

  try {
    // Handle PostgreSQL timestamp format: "2026-01-11 14:26:58.069336+00"
    // Replace space with 'T' to convert to ISO format
    let isoString = dateString;
    if (dateString.includes(' ') && !dateString.includes('T')) {
      isoString = dateString.replace(' ', 'T');
      // Ensure timezone is properly formatted
      if (!isoString.includes('Z') && !isoString.match(/[+-]\d{2}:\d{2}$/)) {
        // If no timezone, assume UTC
        if (isoString.match(/[+-]\d{2}$/)) {
          // Handle +00 format
          isoString = isoString.replace(/([+-]\d{2})$/, '$1:00');
        } else {
          isoString += 'Z';
        }
      }
    }

    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
      console.warn('Invalid date string:', dateString);
      return new Date();
    }
    return date;
  } catch (error) {
    console.error('Error parsing date:', error, dateString);
    return new Date();
  }
}

/**
 * Formats a date string to a readable time string
 */
export function formatTime(dateString: string | null | undefined): string {
  if (!dateString) return 'Invalid date';
  try {
    const date = parseDate(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch (error) {
    console.error('Error formatting time:', error);
    return 'Invalid date';
  }
}

/**
 * Formats a date string to a readable date string
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'Invalid date';
  try {
    const date = parseDate(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
}
