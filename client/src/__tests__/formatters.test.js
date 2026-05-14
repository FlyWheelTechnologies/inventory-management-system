import { describe, it, expect } from 'vitest';
import { formatPhone } from '../services/formatters';

describe('formatPhone', () => {
  it('should return +233 for falsy values (null, undefined, empty string)', () => {
    expect(formatPhone(null)).toBe('+233');
    expect(formatPhone(undefined)).toBe('+233');
    expect(formatPhone('')).toBe('+233');
  });

  it('should replace leading 0 with +233', () => {
    expect(formatPhone('0241234567')).toBe('+233241234567');
    expect(formatPhone('0501234567')).toBe('+233501234567');
  });

  it('should add +233 to the start if number does not start with + or 0', () => {
    expect(formatPhone('241234567')).toBe('+233241234567');
    expect(formatPhone('501234567')).toBe('+233501234567');
  });

  it('should return the number as is if it already starts with +', () => {
    expect(formatPhone('+233241234567')).toBe('+233241234567');
    expect(formatPhone('+14155552671')).toBe('+14155552671');
  });
});
