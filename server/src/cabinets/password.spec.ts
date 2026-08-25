import { generatePassword } from './password';

describe('generatePassword', () => {
  it('creates unique passwords satisfying the minimum policy', () => {
    const passwords = new Set(Array.from({ length: 100 }, generatePassword));
    expect(passwords.size).toBe(100);
    for (const password of passwords) {
      expect(password.length).toBeGreaterThanOrEqual(20);
      expect(password).toMatch(/[A-Z]/);
      expect(password).toMatch(/[a-z]/);
      expect(password).toMatch(/[0-9]/);
      expect(password).toContain('!');
    }
  });
});
