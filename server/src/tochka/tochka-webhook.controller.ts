import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import { TochkaWebhookService } from './tochka-webhook.service';

@ApiTags('tochka-webhook')
@Controller('webhooks/tochka')
export class TochkaWebhookController {
  constructor(private readonly webhooks: TochkaWebhookService) {}
  @Get() health() { return { ok: true }; }
  @Post() @ApiConsumes('text/plain') receive(@Body() token: string) { return this.webhooks.processJwt(token); }
}
