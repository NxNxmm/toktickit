import { describe, it, expect } from 'vitest';
import { validatePassword } from '../../../src/utils/passwordPolicy.js';

describe('UNIT-01: Password Policy Validator (BR-03, AC-3.4)', () => {
  it('accepts a valid password satisfying all criteria', () => {
    const result = validatePassword('Password123!');
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.rules).toEqual({
      minLength: true,
      hasUppercase: true,
      hasLowercase: true,
      hasDigit: true,
      hasSpecial: true,
    });
  });

  it('rejects passwords shorter than 8 characters', () => {
    const result = validatePassword('Pass1!');
    expect(result.isValid).toBe(false);
    expect(result.rules.minLength).toBe(false);
    expect(result.errors).toContain('Password must be at least 8 characters long');
  });

  it('rejects passwords without an uppercase letter', () => {
    const result = validatePassword('password123!');
    expect(result.isValid).toBe(false);
    expect(result.rules.hasUppercase).toBe(false);
    expect(result.errors).toContain('Password must contain at least one uppercase letter');
  });

  it('rejects passwords without a lowercase letter', () => {
    const result = validatePassword('PASSWORD123!');
    expect(result.isValid).toBe(false);
    expect(result.rules.hasLowercase).toBe(false);
    expect(result.errors).toContain('Password must contain at least one lowercase letter');
  });

  it('rejects passwords without a numeric digit', () => {
    const result = validatePassword('Password!@#');
    expect(result.isValid).toBe(false);
    expect(result.rules.hasDigit).toBe(false);
    expect(result.errors).toContain('Password must contain at least one numeric digit');
  });

  it('rejects passwords without a special character', () => {
    const result = validatePassword('Password123');
    expect(result.isValid).toBe(false);
    expect(result.rules.hasSpecial).toBe(false);
    expect(result.errors).toContain('Password must contain at least one special character');
  });

  it('rejects empty or non-string inputs', () => {
    const result = validatePassword('');
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(1);
  });
});
