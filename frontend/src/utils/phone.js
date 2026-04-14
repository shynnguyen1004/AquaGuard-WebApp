/**
 * Normalize Vietnamese phone numbers to +84 format.
 *
 * Handles:
 *  - "0901234567"        → "+84901234567"
 *  - "09 0123 4567"      → "+84901234567"
 *  - "+84 901 234 567"   → "+84901234567"
 *  - "+84901234567"      → "+84901234567"  (already correct)
 *  - "84901234567"       → "+84901234567"
 *
 * @param {string} phone - Raw phone input
 * @returns {string} Normalized phone number in +84xxxxxxxxx format
 */
export function normalizePhone(phone) {
  if (!phone) return "";

  // Remove all whitespace, dashes, dots, parentheses
  let cleaned = phone.replace(/[\s\-\.\(\)]/g, "");

  // If starts with "0" and has 10 digits → Vietnamese local format
  if (/^0\d{9}$/.test(cleaned)) {
    return "+84" + cleaned.slice(1);
  }

  // If starts with "84" (without +) and has 11 digits
  if (/^84\d{9}$/.test(cleaned)) {
    return "+" + cleaned;
  }

  // If starts with "+84" and has 12 chars → already correct format
  if (/^\+84\d{9}$/.test(cleaned)) {
    return cleaned;
  }

  // Return cleaned version (for international or unknown formats)
  return cleaned;
}

/**
 * Validate if a phone number is a valid Vietnamese number.
 * Accepts both raw input and already-normalized format.
 *
 * @param {string} phone - Phone number to validate
 * @returns {boolean}
 */
export function isValidVNPhone(phone) {
  const normalized = normalizePhone(phone);
  return /^\+84\d{9}$/.test(normalized);
}

/**
 * Format a +84 phone number for display: +84 xxx xxx xxx
 *
 * @param {string} phone - Normalized phone number
 * @returns {string} Formatted for display
 */
export function formatPhoneDisplay(phone) {
  const normalized = normalizePhone(phone);
  if (!/^\+84\d{9}$/.test(normalized)) return phone; // can't format, return as-is

  const digits = normalized.slice(3); // 9 digits after +84
  return `+84 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}
