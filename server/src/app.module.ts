import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { text } from 'express';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { CabinetsModule } from './cabinets/cabinets.module';
import { CrmModule } from './crm/crm.module';
import { HealthController } from './health.controller';
import { LeadsFactoryModule } from './leads-factory/leads-factory.module';
import { PrismaModule } from './prisma/prisma.module';
import { SourcesModule } from './sources/sources.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { FinanceModule } from './finance/finance.module';
import { FanoutModule } from './fanout/fanout.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    LeadsFactoryModule,
    AuthModule,
    CabinetsModule,
    CrmModule,
    SourcesModule,
    SchedulerModule,
    FinanceModule,
    FanoutModule,
  ],
  controllers: [HealthController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(text({ type: 'text/plain', limit: '32kb' }))
      .forRoutes({ path: 'webhooks/tochka', method: RequestMethod.POST });
  }
}
