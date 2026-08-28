import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { CabinetsService } from './cabinets.service';
import { CreateMasterManagerDto } from './dto/create-master-manager.dto';

@ApiTags('master-managers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MASTER)
@Controller('master/managers')
export class MasterManagersController {
  constructor(private readonly cabinets: CabinetsService) {}

  @Get()
  list() { return this.cabinets.listManagers(); }

  @Post()
  create(@Body() dto: CreateMasterManagerDto) { return this.cabinets.createManager(dto.name); }

  @Delete(':name')
  remove(@Param('name') name: string) { return this.cabinets.removeManager(name); }
}
