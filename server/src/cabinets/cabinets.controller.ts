import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthUser } from '../common/auth-user';
import { CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { CabinetsService } from './cabinets.service';
import { CreateCabinetDto } from './dto/create-cabinet.dto';
import { UpdateVisibilityDto } from './dto/update-visibility.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { UpdateBillingDto } from './dto/update-billing.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { UpdateMasterProjectDto } from './dto/update-master-project.dto';
import { CloneCabinetDto } from './dto/clone-cabinet.dto';

@ApiTags('cabinets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cabinets')
export class CabinetsController {
  constructor(private readonly cabinets: CabinetsService) {}

  @Get() @Roles(UserRole.MASTER)
  list() { return this.cabinets.list(); }

  @Post() @Roles(UserRole.MASTER)
  create(@Body() dto: CreateCabinetDto) { return this.cabinets.create(dto); }

  @Get('provider/project-types') @Roles(UserRole.MASTER)
  providerProjectTypes() { return this.cabinets.providerProjectTypes(); }

  @Get(':id/provider/integrations/:name') @Roles(UserRole.MASTER, UserRole.FULL)
  providerIntegration(@CurrentUser() user: AuthUser, @Param('id') id: string, @Param('name') name: string) {
    if (user.role === UserRole.FULL && user.cabinetId !== id) throw new ForbiddenException();
    return this.cabinets.providerIntegration(id, name);
  }

  @Get('me')
  mine(@CurrentUser() user: AuthUser) { return this.cabinets.getForUser(user); }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.cabinets.getForUser(user, id); }

  @Patch(':id/visibility') @Roles(UserRole.MASTER, UserRole.FULL)
  updateVisibility(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateVisibilityDto) {
    if (user.role === UserRole.FULL && user.cabinetId !== id) throw new ForbiddenException();
    return this.cabinets.updateVisibility(id, dto);
  }

  @Patch(':id/schedule') @Roles(UserRole.MASTER, UserRole.FULL)
  updateSchedule(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateScheduleDto) {
    if (user.role === UserRole.FULL && user.cabinetId !== id) throw new ForbiddenException();
    return this.cabinets.updateSchedule(id, dto.schedulePreset);
  }

  @Patch(':id/settings') @Roles(UserRole.MASTER, UserRole.FULL)
  updateSettings(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateSettingsDto) {
    if (user.role === UserRole.FULL && user.cabinetId !== id) throw new ForbiddenException();
    return this.cabinets.updateSettings(id, dto);
  }

  @Patch(':id/billing') @Roles(UserRole.MASTER)
  updateBilling(@Param('id') id: string, @Body() dto: UpdateBillingDto) {
    return this.cabinets.updateBilling(id, dto);
  }

  @Patch(':id/master-project') @Roles(UserRole.MASTER)
  updateMasterProject(@Param('id') id: string, @Body() dto: UpdateMasterProjectDto) {
    return this.cabinets.updateMasterProject(id, dto);
  }

  @Post(':id/clone') @Roles(UserRole.MASTER)
  clone(@Param('id') id: string, @Body() dto: CloneCabinetDto) { return this.cabinets.clone(id, dto); }
}
