import { describe, it, expect } from 'vitest';
import { formatCurrency, formatPhone } from '../services/formatters';

describe('formatCurrency', () => {
  it('should return "0.0" for null or undefined input', () => {
    expect(formatCurrency(null)).toBe('0.0');
    expect(formatCurrency(undefined)).toBe('0.0');
  });

  it('should format positive integer correctly', () => {
    expect(formatCurrency(1000)).toBe('1,000.0');
    expect(formatCurrency(10)).toBe('10.0');
  });

  it('should format decimal numbers correctly, rounding to 1 decimal place', () => {
    expect(formatCurrency(1000.55)).toBe('1,000.6');
    expect(formatCurrency(1000.54)).toBe('1,000.5');
    expect(formatCurrency(0.12)).toBe('0.1');
  });

  it('should format zero correctly', () => {
    expect(formatCurrency(0)).toBe('0.0');
  });

  it('should format negative numbers correctly', () => {
    expect(formatCurrency(-1000)).toBe('-1,000.0');
    expect(formatCurrency(-1000.55)).toBe('-1,000.6');
  });
});

describe('formatPhone', () => {
  it('should return "+233" for empty or falsy input', () => {
    expect(formatPhone('')).toBe('+233');
    expect(formatPhone(null)).toBe('+233');
    expect(formatPhone(undefined)).toBe('+233');
  });

  it('should replace leading "0" with "+233"', () => {
    expect(formatPhone('0241234567')).toBe('+233241234567');
  });

  it('should prepend "+233" if it does not start with "+"', () => {
    expect(formatPhone('241234567')).toBe('+233241234567');
  });

  it('should return the original string if it already starts with "+"', () => {
    expect(formatPhone('+233241234567')).toBe('+233241234567');
    expect(formatPhone('+1234567890')).toBe('+1234567890');
  });
});
