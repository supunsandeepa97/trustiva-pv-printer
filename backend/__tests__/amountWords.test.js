const { convertToWords } = require('../src/services/amountWords');

describe('convertToWords', () => {
  test('converts zero', () => {
    expect(convertToWords(0)).toBe('Rupees Zero Only');
  });

  test('converts a single rupee', () => {
    expect(convertToWords(1)).toBe('Rupees One Only');
  });

  test('converts a round hundred', () => {
    expect(convertToWords(100)).toBe('Rupees One Hundred Only');
  });

  test('converts a million', () => {
    expect(convertToWords(1000000)).toBe('Rupees One Million Only');
  });

  test('converts an amount with cents', () => {
    expect(convertToWords(1234.56)).toBe(
      'Rupees One Thousand Two Hundred Thirty Four and Fifty Six Cents Only'
    );
  });

  test('rounds cents to two decimal places', () => {
    expect(convertToWords(0.5)).toBe('Rupees Zero and Fifty Cents Only');
  });

  test('returns Invalid Amount for negative values', () => {
    expect(convertToWords(-5)).toBe('Invalid Amount');
  });

  test('returns Invalid Amount for non-numeric input', () => {
    expect(convertToWords('abc')).toBe('Invalid Amount');
  });
});
