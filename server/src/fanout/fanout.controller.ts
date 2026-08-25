import { Body, Controller, Get, Headers, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { CreateFanoutSourceDto } from './dto/create-fanout-source.dto';
import { IncomingLeadDto } from './dto/incoming-lead.dto';
import { SetDestinationsDto } from './dto/set-destinations.dto';
import { FanoutService } from './fanout.service';

@ApiTags('fanout-public')
@Controller('fanout/:publicId/leads')
export class FanoutPublicController {
  constructor(private readonly fanout: FanoutService) {}

  @Post() @ApiHeader({ name: 'X-Fanout-Token', required: true })
  ingest(@Param('publicId') publicId: string, @Headers('x-fanout-token') token: string | undefined, @Body() dto: IncomingLeadDto) {
    return this.fanout.ingest(publicId, token, dto);
  }
}

@ApiTags('fanout-master')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MASTER)
@Controller('master/fanout/sources')
export class FanoutMasterController {
  constructor(private readonly fanout: FanoutService) {}

  @Get() list() { return this.fanout.listSources(); }
  @Post() create(@Body() dto: CreateFanoutSourceDto) { return this.fanout.createSource(dto.name); }
  @Patch(':id/destinations') destinations(@Param('id') id: string, @Body() dto: SetDestinationsDto) {
    return this.fanout.setDestinations(id, dto.cabinetIds);
  }
  @Get(':id/deliveries') deliveries(@Param('id') id: string) { return this.fanout.listDeliveries(id); }
}
