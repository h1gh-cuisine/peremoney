import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LeadsFactoryService } from './leads-factory.service';
import { ProviderAcquisitionFlags } from './leads-factory.types';

const ACQUISITION_FLAGS_OFF: ProviderAcquisitionFlags = {
  check_domains_in_v_kazakh: false, parse_domains: false, parse_phones: false, parse_ishod: false,
  parse_ceo: false, parse_google: false, parse_manual: false, parse_maps: false,
};

// "Выгрузки" в Настройках проекта переключает блок закупки/парсинга Leads Factory
// (parse_domains/parse_phones/... — не work_client_status, см. leads-factory.service.ts).
// Идемпотентно: безопасно вызывать повторно (в т.ч. из ретрая APPLY_SETTINGS) — если
// желаемое состояние уже применено, лишних PATCH не будет.
@Injectable()
export class AcquisitionSyncService {
  constructor(private readonly prisma: PrismaService, private readonly provider: LeadsFactoryService) {}

  async reconcile(cabinetId: string, providerProjectId: number, uploadsEnabled: boolean) {
    const cabinet = await this.prisma.cabinet.findUniqueOrThrow({
      where: { id: cabinetId }, select: { uploadsAcquisitionSnapshot: true },
    });
    const snapshot = cabinet.uploadsAcquisitionSnapshot as ProviderAcquisitionFlags | null;
    if (uploadsEnabled) {
      if (!snapshot) return;
      await this.provider.updateAcquisitionFlags(providerProjectId, snapshot);
      await this.prisma.cabinet.update({ where: { id: cabinetId }, data: { uploadsAcquisitionSnapshot: Prisma.JsonNull } });
    } else {
      if (!snapshot) {
        const current = await this.provider.getAcquisitionFlags(providerProjectId);
        await this.prisma.cabinet.update({
          where: { id: cabinetId }, data: { uploadsAcquisitionSnapshot: current as unknown as Prisma.InputJsonValue },
        });
      }
      await this.provider.updateAcquisitionFlags(providerProjectId, ACQUISITION_FLAGS_OFF);
    }
  }
}
