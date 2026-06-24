import { Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller('admin/audit')
export class AuditController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @RequirePermissions('audit.read')
  async list(@Query('limit') limit = '100') {
    const rows = await this.prisma.auditLog.findMany({
      take: Math.min(Number(limit) || 100, 300),
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true, email: true } } },
    });
    return rows;
  }
}
