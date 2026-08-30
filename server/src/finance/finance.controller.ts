import { Body, Controller, Get, Param, Post, Put, Query, StreamableFile, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthUser } from '../common/auth-user';
import { assertCabinetAccess, assertVisibleSection } from '../common/cabinet-access';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../common/current-user.decorator';
import { RolesGuard } from '../common/roles.guard';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import { ClosingActDto } from './dto/closing-act.dto';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdatePayerDto } from './dto/update-payer.dto';
import { FinanceService } from './finance.service';

@ApiTags('finance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cabinets/:cabinetId')
export class FinanceController {
  constructor(private readonly finance: FinanceService, private readonly prisma: PrismaService) {}

  @Get('payer') getPayer(@CurrentUser() user: AuthUser, @Param('cabinetId') id: string) {
    assertCabinetAccess(user, id); return this.finance.getPayer(id);
  }
  @Put('payer') savePayer(@CurrentUser() user: AuthUser, @Param('cabinetId') id: string, @Body() dto: UpdatePayerDto) {
    assertCabinetAccess(user, id); return this.finance.savePayer(id, dto.data);
  }
  @Get('finance/payments') async payments(@CurrentUser() user: AuthUser, @Param('cabinetId') id: string) {
    assertCabinetAccess(user, id); await assertVisibleSection(this.prisma, user, id, 'finance'); return this.finance.listPayments(id);
  }
  @Get('finance/summary') async summary(@CurrentUser() user: AuthUser, @Param('cabinetId') id: string) {
    assertCabinetAccess(user, id); await assertVisibleSection(this.prisma, user, id, 'finance'); return this.finance.summary(id);
  }
  @Post('finance/invoices') invoice(@CurrentUser() user: AuthUser, @Param('cabinetId') id: string, @Body() dto: CreateInvoiceDto) {
    assertCabinetAccess(user, id); return this.finance.createInvoice(id, dto.quantity, dto.idempotencyKey);
  }
  @Get('finance/invoices/:paymentId/pdf') async invoicePdf(@CurrentUser() user: AuthUser, @Param('cabinetId') id: string, @Param('paymentId') paymentId: string) {
    assertCabinetAccess(user, id);
    return new StreamableFile(await this.finance.invoicePdf(id, paymentId), {
      type: 'application/pdf', disposition: `attachment; filename="invoice-${paymentId}.pdf"`,
    });
  }
  @Post('finance/closing-acts') async act(@CurrentUser() user: AuthUser, @Param('cabinetId') id: string, @Body() dto: ClosingActDto) {
    assertCabinetAccess(user, id);
    const document = await this.finance.closingActPdf(id, dto.paymentIds);
    return new StreamableFile(document.pdf, {
      type: 'application/pdf', disposition: `attachment; filename="closing-act-${document.documentNo}.pdf"`,
    });
  }
  @Get('dashboard') dashboard(@CurrentUser() user: AuthUser, @Param('cabinetId') id: string, @Query() query: AnalyticsQueryDto) {
    assertCabinetAccess(user, id); return this.finance.clientDashboard(id, query);
  }
}
