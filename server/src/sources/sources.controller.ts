import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { assertCabinetAccess, assertVisibleSection } from '../common/cabinet-access';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/auth-user';
import { CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { AddSourcesDto } from './dto/add-sources.dto';
import { ListSourcesDto } from './dto/list-sources.dto';
import { ToggleSourceDto } from './dto/toggle-source.dto';
import { UpdateAutomationDto } from './dto/update-automation.dto';
import { SourcesService } from './sources.service';

@ApiTags('sources')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cabinets/:cabinetId/sources')
export class SourcesController {
  constructor(private readonly sources: SourcesService, private readonly prisma: PrismaService) {}

  @Get()
  async list(@CurrentUser() user: AuthUser, @Param('cabinetId') cabinetId: string, @Query() query: ListSourcesDto) {
    assertCabinetAccess(user, cabinetId); await assertVisibleSection(this.prisma, user, cabinetId, 'sources'); return this.sources.list(cabinetId, query);
  }

  @Post('sync') @Roles(UserRole.MASTER, UserRole.FULL)
  sync(@CurrentUser() user: AuthUser, @Param('cabinetId') cabinetId: string, @Query() query: ListSourcesDto) {
    assertCabinetAccess(user, cabinetId, true); return this.sources.sync(cabinetId, query);
  }

  @Post() @Roles(UserRole.MASTER, UserRole.FULL)
  add(@CurrentUser() user: AuthUser, @Param('cabinetId') cabinetId: string, @Body() dto: AddSourcesDto) {
    assertCabinetAccess(user, cabinetId, true); return this.sources.add(cabinetId, dto);
  }

  @Patch(':tagId') @Roles(UserRole.MASTER, UserRole.FULL)
  toggle(@CurrentUser() user: AuthUser, @Param('cabinetId') cabinetId: string, @Param('tagId') tagId: string, @Body() dto: ToggleSourceDto) {
    assertCabinetAccess(user, cabinetId, true); return this.sources.toggle(cabinetId, tagId, dto.enabled);
  }

  @Get('automation/settings') @Roles(UserRole.MASTER, UserRole.FULL)
  getAutomationSettings(@CurrentUser() user: AuthUser, @Param('cabinetId') cabinetId: string) {
    assertCabinetAccess(user, cabinetId, true); return this.sources.getAutomation(cabinetId);
  }

  @Patch('automation/settings') @Roles(UserRole.MASTER, UserRole.FULL)
  automationSettings(@CurrentUser() user: AuthUser, @Param('cabinetId') cabinetId: string, @Body() dto: UpdateAutomationDto) {
    assertCabinetAccess(user, cabinetId, true); return this.sources.updateAutomation(cabinetId, dto);
  }

  @Post('automation/run') @Roles(UserRole.MASTER, UserRole.FULL)
  automate(@CurrentUser() user: AuthUser, @Param('cabinetId') cabinetId: string) {
    assertCabinetAccess(user, cabinetId, true); return this.sources.automate(cabinetId);
  }

  @Get('/meta/tag-types')
  async tagTypes(@CurrentUser() user: AuthUser, @Param('cabinetId') cabinetId: string) {
    assertCabinetAccess(user, cabinetId); await assertVisibleSection(this.prisma, user, cabinetId, 'sources'); return this.sources.availableTypes();
  }
}
