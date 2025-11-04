/**
 * Format phone number to E.164 format (digits only, no '+')
 */
export function formatE164(phoneNumber: string): string {
  // Remove all non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '');

  // Validate length (10-15 digits for E.164)
  if (cleaned.length < 10 || cleaned.length > 15) {
    throw new Error(
      `Invalid phone number length: ${cleaned.length}. Must be 10-15 digits.`
    );
  }

  return cleaned;
}

/**
 * Validate if a phone number is in correct E.164 format
 */
export function validatePhoneNumber(phoneNumber: string): boolean {
  const cleaned = phoneNumber.replace(/\D/g, '');
  return /^\d{10,15}$/.test(cleaned);
}

/**
 * Format phone number for display (add + prefix)
 */
export function formatForDisplay(phoneNumber: string): string {
  const cleaned = formatE164(phoneNumber);
  return `+${cleaned}`;
}
