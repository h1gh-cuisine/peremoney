import { Module } from '@nestjs/common';
import { RolesGuard } from '../common/roles.guard';
import { SourcesController } from './sources.controller';
import { SourcesService } from './sources.service';
import { DomainSourceJobsService } from './domain-source-jobs.service';

@Module({
  controllers: [SourcesController],
  providers: [SourcesService, DomainSourceJobsService, RolesGuard],
  exports: [SourcesService],
})
export class SourcesModule {}
