import { Module } from '@nestjs/common';
import { RolesGuard } from '../common/roles.guard';
import { CabinetsController } from './cabinets.controller';
import { CabinetsService } from './cabinets.service';
import { LeadsFactoryModule } from '../leads-factory/leads-factory.module';
import { DirectMessengerModule } from '../integrations/direct-messenger.module';
import { CrmModule } from '../crm/crm.module';
import { SourcesModule } from '../sources/sources.module';
import { MasterManagersController } from './master-managers.controller';

@Module({ imports: [LeadsFactoryModule, DirectMessengerModule, CrmModule, SourcesModule], controllers: [CabinetsController, MasterManagersController], providers: [CabinetsService, RolesGuard] })
export class CabinetsModule {}
