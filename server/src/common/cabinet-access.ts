import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthUser } from './auth-user';
import { PrismaService } from '../prisma/prisma.service';

export function assertCabinetAccess(user: AuthUser, cabinetId: string, write = false) {
  if (user.role === UserRole.MASTER) return;
  if (user.cabinetId !== cabinetId || (write && user.role === UserRole.LIMITED)) {
    throw new ForbiddenException();
  }
}

export type HideableSection = 'contacts' | 'sources' | 'finance';

export async function assertVisibleSection(
  prisma: PrismaService, user: AuthUser, cabinetId: string, section: HideableSection,
) {
  if (user.role !== UserRole.LIMITED) return;
  const cabinet = await prisma.cabinet.findUnique({ where: { id: cabinetId }, select: {
    contactsVisible: true, sourcesVisible: true, financeVisible: true,
  } });
  if (!cabinet || !cabinet[`${section}Visible`]) throw new ForbiddenException();
}
