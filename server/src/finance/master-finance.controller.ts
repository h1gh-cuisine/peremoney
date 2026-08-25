import { Controller, Delete, Get, Param, Patch, Query, UseGuards, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { FinanceService } from './finance.service';
import { CurrentUser } from '../common/current-user.decorator';
import { AuthUser } from '../common/auth-user';

@ApiTags('master-finance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MASTER)
@Controller('master')
export class MasterFinanceController {
  constructor(private readonly finance: FinanceService) {}

  @Get('payments') payments() { return this.finance.listPayments(); }
  @Patch('payments/:id') update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdatePaymentDto) {
    return this.finance.setPaymentStatus(id, dto.status, user.id);
  }
  @Delete('payments/:id') delete(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.finance.deletePayment(id, user.id); }
  @Get('dashboard') dashboard(@Query() query: AnalyticsQueryDto) { return this.finance.masterDashboard(query); }
}
