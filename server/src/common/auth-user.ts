import { UserRole } from '@prisma/client';

export interface AuthUser {
  id: string;
  login: string;
  role: UserRole;
  cabinetId: string | null;
}
