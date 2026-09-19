export function isValidEmail(email: string): boolean {
  const trimmed = email.trim();
  if (!trimmed) return false;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(trimmed);
}

export interface PasswordCheckResult {
  hasMinLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
  isValid: boolean;
}

export function checkPasswordRequirements(password: string): PasswordCheckResult {
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password);

  const isValid = hasMinLength && hasUpper && hasLower && hasNumber && hasSpecial;

  return {
    hasMinLength,
    hasUpper,
    hasLower,
    hasNumber,
    hasSpecial,
    isValid,
  };
}

export function normalizePhoneNumber(phone: string): string {
  if (!phone || typeof phone !== 'string') return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return phone.startsWith('+') ? `+${digits}` : phone;
}

export function isValidPhoneNumber(phone: string): boolean {
  if (!phone) return false;
  return /^\+1[2-9]\d{2}[2-9]\d{6}$/.test(normalizePhoneNumber(phone));
}

export function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length === 0) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

/**
 * Detects whether a string mentions alcohol items or contains alcohol emojis.
 */
export function detectAlcoholInText(text: string): boolean {
  if (!text || typeof text !== 'string') return false;

  // Alcohol-related emojis: 🍺 🍻 🍷 🍸 🍹 🍾 🍶 🥃 🥂
  const emojiRegex = /[\u{1F37A}\u{1F37B}\u{1F377}\u{1F378}\u{1F379}\u{1F37E}\u{1F376}\u{1F943}\u{1F942}]/u;
  if (emojiRegex.test(text)) return true;

  // Alcohol-related keywords and popular drinks/brands
  const keywordRegex = /\b(alcohol|alcoholic|liquor|liquors|spirits?|liqueurs?|whisky|whiskeys?|scotch|bourbon|rye|beer|beers|ipa|lager|lagers|pilsner|stout|porter|ales?|wine|wines|merlot|cabernet|chardonnay|pinot|prosecco|champagne|vodka|rum|tequila|gin|brandy|cognac|mezcal|absinthe|sake|soju|ciders?|hard cider|hard seltzers?|white claw|truly|twisted tea|cocktails?|margaritas?|martinis?|mojitos?|daiquiris?|sangria|hennessy|patron|bacardi|smirnoff|absolut|jack daniels|corona|heineken|budweiser|bud light|coors|michelob|stella artois|modelo|guinness)\b/i;

  return keywordRegex.test(text);
}

