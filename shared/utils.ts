import { format } from "date-fns";

/**
 * Generates a unique FIR ID in the format FIR-YYYYMMDD-XXX
 * where XXX is a random 3-digit number
 */
export function generateFirId(): string {
  const dateStr = format(new Date(), "yyyyMMdd");
  const randomNum = Math.floor(Math.random() * 900) + 100; // Random 3-digit number
  return `FIR-${dateStr}-${randomNum}`;
}

/**
 * Format date for display
 * @param dateString ISO date string
 * @returns Formatted date string
 */
export function formatDate(dateString: string | Date): string {
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return format(date, 'yyyy-MM-dd, HH:mm');
  } catch (error) {
    return 'Invalid date';
  }
}

/**
 * Truncates text to specified length
 * @param text Text to truncate
 * @param maxLength Maximum length
 * @returns Truncated text
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}
