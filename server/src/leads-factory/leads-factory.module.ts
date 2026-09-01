import { Global, Module } from '@nestjs/common';
import { LeadsFactoryService } from './leads-factory.service';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Global()
@Module({ imports: [AuditLogModule], providers: [LeadsFactoryService], exports: [LeadsFactoryService] })
export class LeadsFactoryModule {}
