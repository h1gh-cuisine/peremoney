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
import { AnswerSyncService } from './answer-sync.service';
import { CrmService } from './crm.service';
import { ListContactsDto } from './dto/list-contacts.dto';
import { ListLeadsDto } from './dto/list-leads.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';

@ApiTags('crm')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cabinets/:cabinetId')
export class CrmController {
  constructor(private readonly crm: CrmService, private readonly sync: AnswerSyncService, private readonly prisma: PrismaService) {}

  @Post('sync/answers')
  @Roles(UserRole.MASTER, UserRole.FULL)
  syncAnswers(@CurrentUser() user: AuthUser, @Param('cabinetId') cabinetId: string) {
    assertCabinetAccess(user, cabinetId, true);
    return this.sync.sync(cabinetId);
  }

  @Get('contacts')
  async contacts(@CurrentUser() user: AuthUser, @Param('cabinetId') cabinetId: string, @Query() query: ListContactsDto) {
    assertCabinetAccess(user, cabinetId);
    await assertVisibleSection(this.prisma, user, cabinetId, 'contacts');
    return this.crm.listContacts(cabinetId, query);
  }

  @Get('leads')
  leads(@CurrentUser() user: AuthUser, @Param('cabinetId') cabinetId: string, @Query() query: ListLeadsDto) {
    assertCabinetAccess(user, cabinetId);
    return this.crm.listLeads(cabinetId, query);
  }

  @Patch('leads/:leadId')
  updateLead(@CurrentUser() user: AuthUser, @Param('cabinetId') cabinetId: string, @Param('leadId') leadId: string, @Body() dto: UpdateLeadDto) {
    assertCabinetAccess(user, cabinetId, true);
    return this.crm.updateLead(cabinetId, leadId, dto);
  }

  @Get('leads/:leadId/calls')
  calls(@CurrentUser() user: AuthUser, @Param('cabinetId') cabinetId: string, @Param('leadId') leadId: string) {
    assertCabinetAccess(user, cabinetId);
    return this.crm.calls(cabinetId, leadId);
  }
}
