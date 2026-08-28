import { isValidInn } from './inn';

describe('isValidInn', () => {
  it('accepts a 10-digit organization INN with a correct checksum', () => {
    expect(isValidInn('6450000001')).toBe(true);
  });

  it('rejects a 10-digit INN with a wrong checksum digit', () => {
    expect(isValidInn('6450000000')).toBe(false);
  });

  it('accepts a 12-digit individual/IP INN with correct checksums', () => {
    expect(isValidInn('500000000029')).toBe(true);
  });

  it('rejects a 12-digit INN with a wrong checksum digit', () => {
    expect(isValidInn('500000000020')).toBe(false);
  });

  it('rejects values with the wrong length or non-digit characters', () => {
    expect(isValidInn('123')).toBe(false);
    expect(isValidInn('64500000ab')).toBe(false);
  });
});
