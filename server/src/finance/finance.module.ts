import { Module } from '@nestjs/common';
import { RolesGuard } from '../common/roles.guard';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';
import { MasterFinanceController } from './master-finance.controller';
import { TochkaService } from '../tochka/tochka.service';
import { TelegramService } from '../tochka/telegram.service';
import { TochkaWebhookController } from '../tochka/tochka-webhook.controller';
import { TochkaWebhookService } from '../tochka/tochka-webhook.service';

@Module({
  controllers: [FinanceController, MasterFinanceController, TochkaWebhookController],
  providers: [FinanceService, RolesGuard, TochkaService, TochkaWebhookService, TelegramService],
  exports: [FinanceService],
})
export class FinanceModule {}
