export type UserRole = 'MASTER' | 'FULL' | 'LIMITED';

export interface SessionUser {
  id: string;
  login: string;
  role: UserRole;
  cabinetId: string | null;
}

export interface LoginResponse {
  accessToken: string;
  user: SessionUser;
}

export interface SessionData {
  token: string;
  user: SessionUser;
}

export function routeForRole(role: UserRole) {
  return role === 'MASTER' ? '/master/dashboard' : '/dashboard';
}

export function sessionFromLogin(response: LoginResponse): SessionData {
  return { token: response.accessToken, user: response.user };
}

export function visibleSectionsFromCabinet(sections: string[]) {
  const visible = new Set(sections);
  return {
    contacts: visible.has('contacts'), sources: visible.has('sources'), script: visible.has('script'),
    finance: visible.has('finance'), settings: visible.has('settings'),
  };
}
