import { Module } from '@nestjs/common';
import { CrmModule } from '../crm/crm.module';
import { SourcesModule } from '../sources/sources.module';
import { SchedulerService } from './scheduler.service';
import { SchedulerController } from './scheduler.controller';
import { RolesGuard } from '../common/roles.guard';

@Module({
  imports: [CrmModule, SourcesModule],
  controllers: [SchedulerController],
  providers: [SchedulerService, RolesGuard],
})
export class SchedulerModule {}
