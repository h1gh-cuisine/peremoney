import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthUser } from '../common/auth-user';
import { assertCabinetAccess } from '../common/cabinet-access';
import { CurrentUser } from '../common/current-user.decorator';
import { RolesGuard } from '../common/roles.guard';
import { SchedulerService } from './scheduler.service';

@ApiTags('scheduler')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cabinets/:cabinetId/scheduled-runs')
export class SchedulerController {
  constructor(private readonly scheduler: SchedulerService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Param('cabinetId') cabinetId: string) {
    assertCabinetAccess(user, cabinetId);
    return this.scheduler.listRuns(cabinetId);
  }
}
