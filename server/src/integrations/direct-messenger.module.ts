import { Module } from '@nestjs/common';
import { DirectMessengerService } from './direct-messenger.service';

@Module({ providers: [DirectMessengerService], exports: [DirectMessengerService] })
export class DirectMessengerModule {}
