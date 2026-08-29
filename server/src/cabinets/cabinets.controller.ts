import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
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
import { ListCabinetsDto } from './dto/list-cabinets.dto';
import { UpdateDirectIntegrationDto } from './dto/update-direct-integration.dto';
import { LinkProviderProjectDto } from './dto/link-provider-project.dto';
import { UpdateMasterBalanceDto } from './dto/update-master-balance.dto';

@ApiTags('cabinets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cabinets')
export class CabinetsController {
  constructor(private readonly cabinets: CabinetsService) {}

  @Get() @Roles(UserRole.MASTER)
  list(@Query() query: ListCabinetsDto) { return this.cabinets.list(query); }

  @Post() @Roles(UserRole.MASTER)
  create(@Body() dto: CreateCabinetDto) { return this.cabinets.create(dto); }

  @Post('link-provider') @Roles(UserRole.MASTER)
  linkProvider(@Body() dto: LinkProviderProjectDto) { return this.cabinets.linkProviderProject(dto); }

  @Get('provider/project-types') @Roles(UserRole.MASTER)
  providerProjectTypes() { return this.cabinets.providerProjectTypes(); }

  @Get('provider/regions') @Roles(UserRole.MASTER)
  providerRegions() { return this.cabinets.providerRegions(); }

  @Get(':id/provider/integrations/:name') @Roles(UserRole.MASTER, UserRole.FULL)
  providerIntegration(@CurrentUser() user: AuthUser, @Param('id') id: string, @Param('name') name: string) {
    if (user.role === UserRole.FULL && user.cabinetId !== id) throw new ForbiddenException();
    return this.cabinets.providerIntegration(id, name);
  }

  @Get(':id/integrations/:channel') @Roles(UserRole.MASTER, UserRole.FULL)
  directIntegration(@CurrentUser() user: AuthUser, @Param('id') id: string, @Param('channel') channel: string) {
    if (user.role === UserRole.FULL && user.cabinetId !== id) throw new ForbiddenException();
    return this.cabinets.directIntegration(id, channel);
  }

  @Patch(':id/integrations/:channel') @Roles(UserRole.MASTER, UserRole.FULL)
  updateDirectIntegration(@CurrentUser() user: AuthUser, @Param('id') id: string, @Param('channel') channel: string,
    @Body() dto: UpdateDirectIntegrationDto) {
    if (user.role === UserRole.FULL && user.cabinetId !== id) throw new ForbiddenException();
    return this.cabinets.updateDirectIntegration(id, channel, dto);
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

  @Patch(':id/master-balance') @Roles(UserRole.MASTER)
  updateMasterBalance(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateMasterBalanceDto) {
    return this.cabinets.updateMasterBalance(id, dto.moneyBalance, user.id);
  }

  @Delete(':id') @Roles(UserRole.MASTER)
  remove(@Param('id') id: string) { return this.cabinets.remove(id); }

  @Post(':id/clone') @Roles(UserRole.MASTER)
  clone(@Param('id') id: string, @Body() dto: CloneCabinetDto) { return this.cabinets.clone(id, dto); }
}
