import { Global, Module } from '@nestjs/common';
import { LeadsFactoryService } from './leads-factory.service';
import { AcquisitionSyncService } from './acquisition-sync.service';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Global()
@Module({
  imports: [AuditLogModule],
  providers: [LeadsFactoryService, AcquisitionSyncService],
  exports: [LeadsFactoryService, AcquisitionSyncService],
})
export class LeadsFactoryModule {}
