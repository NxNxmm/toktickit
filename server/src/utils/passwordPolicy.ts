export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  rules: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasDigit: boolean;
    hasSpecial: boolean;
  };
}

/**
 * Validates a password according to BR-03:
 * - At least 8 characters
 * - Includes both uppercase and lowercase letters
 * - Contains at least one numeric digit
 * - Contains at least one special character
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  const minLength = typeof password === 'string' && password.length >= 8;
  const hasUppercase = typeof password === 'string' && /[A-Z]/.test(password);
  const hasLowercase = typeof password === 'string' && /[a-z]/.test(password);
  const hasDigit = typeof password === 'string' && /[0-9]/.test(password);
  const hasSpecial = typeof password === 'string' && /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password);

  if (!minLength) {
    errors.push('Password must be at least 8 characters long');
  }
  if (!hasUppercase) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!hasLowercase) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!hasDigit) {
    errors.push('Password must contain at least one numeric digit');
  }
  if (!hasSpecial) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors,
    rules: {
      minLength,
      hasUppercase,
      hasLowercase,
      hasDigit,
      hasSpecial,
    },
  };
}
