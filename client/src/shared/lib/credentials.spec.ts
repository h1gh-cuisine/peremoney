import { generateProjectLogins } from './credentials';

describe('generateProjectLogins', () => {
  it('строит понятные логины из названия проекта', () => {
    expect(generateProjectLogins('Усадьбы.РФ', '7d3920e4-32ca-4c92-a8d4-218fe4ecbc35')).toEqual({
      clientLogin: 'Усадьбы.РФ',
      employeeLogin: 'усадьбы-рф-staff-ecbc35',
    });
  });

  it('сохраняет одинаковый логин для безопасного повтора', () => {
    const first = generateProjectLogins('  Project  One  ', 'stable-key-123456');
    expect(generateProjectLogins('  Project  One  ', 'stable-key-123456')).toEqual(first);
    expect(first.clientLogin).toBe('Project One');
  });
});
