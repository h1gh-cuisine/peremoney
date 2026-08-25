import { Module } from '@nestjs/common';
import { RolesGuard } from '../common/roles.guard';
import { AnswerSyncService } from './answer-sync.service';
import { CrmController } from './crm.controller';
import { CrmService } from './crm.service';
import { FinanceModule } from '../finance/finance.module';

@Module({
  imports: [FinanceModule],
  controllers: [CrmController],
  providers: [AnswerSyncService, CrmService, RolesGuard],
  exports: [AnswerSyncService],
})
export class CrmModule {}
