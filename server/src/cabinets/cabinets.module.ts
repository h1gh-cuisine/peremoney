import { Module } from '@nestjs/common';
import { RolesGuard } from '../common/roles.guard';
import { CabinetsController } from './cabinets.controller';
import { CabinetsService } from './cabinets.service';
import { LeadsFactoryModule } from '../leads-factory/leads-factory.module';

@Module({ imports: [LeadsFactoryModule], controllers: [CabinetsController], providers: [CabinetsService, RolesGuard] })
export class CabinetsModule {}
