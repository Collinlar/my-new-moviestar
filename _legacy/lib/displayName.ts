/**
 * Masks an email address for privacy display
 * e.g., "callmejd.01@gmail.com" becomes "cal***@gmail.com"
 */
export const maskEmail = (email: string): string => {
  const [localPart, domain] = email.split('@');
  if (!domain) return email;
  
  const visibleChars = Math.min(3, localPart.length);
  const maskedLocal = localPart.slice(0, visibleChars) + '***';
  
  return `${maskedLocal}@${domain}`;
};

/**
 * Checks if a string looks like an email address
 */
export const looksLikeEmail = (str: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
};

/**
 * Returns a safe display name, masking emails for privacy
 * Falls back to "Anonymous" if no valid name is provided
 */
export const getSafeDisplayName = (
  displayName?: string | null,
  username?: string | null,
  fallback: string = 'Anonymous'
): string => {
  // Try display_name first
  if (displayName && displayName.trim()) {
    if (looksLikeEmail(displayName)) {
      return maskEmail(displayName);
    }
    return displayName;
  }
  
  // Try username, but skip auto-generated ones
  if (username && username.trim() && !username.startsWith('user_')) {
    if (looksLikeEmail(username)) {
      return maskEmail(username);
    }
    return username;
  }
  
  return fallback;
};
