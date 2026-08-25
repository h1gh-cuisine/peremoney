import { routeForRole, sessionFromLogin, visibleSectionsFromCabinet } from './session';

describe('frontend session: roles and cabinet visibility', () => {
  it('направляет MASTER в master dashboard, остальных в client dashboard', () => {
    expect(routeForRole('MASTER')).toBe('/master/dashboard');
    expect(routeForRole('FULL')).toBe('/dashboard');
    expect(routeForRole('LIMITED')).toBe('/dashboard');
  });

  it('сохраняет только token и безопасный user из login response', () => {
    expect(sessionFromLogin({ accessToken: 'jwt', user: { id: 'u', login: 'x', role: 'FULL', cabinetId: 'cab' } }))
      .toEqual({ token: 'jwt', user: { id: 'u', login: 'x', role: 'FULL', cabinetId: 'cab' } });
  });

  it('преобразует backend visibleSections в пять флагов UI', () => {
    expect(visibleSectionsFromCabinet(['dashboard', 'leads', 'payer', 'sources', 'finance'])).toEqual({
      contacts: false, sources: true, script: false, finance: true, settings: false,
    });
  });
});
