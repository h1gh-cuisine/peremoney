import { Global, Module } from '@nestjs/common';
import { LeadsFactoryService } from './leads-factory.service';

@Global()
@Module({ providers: [LeadsFactoryService], exports: [LeadsFactoryService] })
export class LeadsFactoryModule {}
