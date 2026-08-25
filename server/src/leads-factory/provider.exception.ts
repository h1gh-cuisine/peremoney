import { HttpException } from '@nestjs/common';

export class ProviderException extends HttpException {
  constructor(public readonly providerStatus: number, message: string, public readonly providerBody?: unknown) {
    super({
      message,
      providerStatus,
      ...(providerStatus === 422 && providerBody && typeof providerBody === 'object'
        ? { providerDetails: providerBody }
        : {}),
    }, providerStatus >= 400 && providerStatus < 500 ? providerStatus : 502);
  }
}
