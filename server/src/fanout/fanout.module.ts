import { Module } from '@nestjs/common';
import { RolesGuard } from '../common/roles.guard';
import { FinanceModule } from '../finance/finance.module';
import { FanoutMasterController, FanoutPublicController } from './fanout.controller';
import { FanoutService } from './fanout.service';

@Module({
  imports: [FinanceModule],
  controllers: [FanoutPublicController, FanoutMasterController],
  providers: [FanoutService, RolesGuard],
})
export class FanoutModule {}
