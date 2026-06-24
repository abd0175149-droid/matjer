import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ContentService {
  constructor(private prisma: PrismaService) {}

  // ─── الصفحات الثابتة ───
  listPublicPages() {
    return this.prisma.page.findMany({ where: { isPublished: true }, select: { slug: true, title: true }, orderBy: { id: 'asc' } });
  }
  async getPage(slug: string) {
    const p = await this.prisma.page.findFirst({ where: { slug, isPublished: true } });
    if (!p) throw new NotFoundException('الصفحة غير موجودة');
    return p;
  }
  adminPages() {
    return this.prisma.page.findMany({ orderBy: { id: 'asc' } });
  }
  createPage(data: { slug: string; title: string; content: string }) {
    return this.prisma.page.create({ data });
  }
  updatePage(id: number, data: any) {
    return this.prisma.page.update({ where: { id }, data });
  }
  async deletePage(id: number) {
    await this.prisma.page.delete({ where: { id } });
    return { id, deleted: true };
  }

  // ─── البانرات ───
  activeBanners() {
    return this.prisma.banner.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
  }
  adminBanners() {
    return this.prisma.banner.findMany({ orderBy: { sortOrder: 'asc' } });
  }
  createBanner(data: { title?: string; imageUrl: string; link?: string; sortOrder?: number }) {
    return this.prisma.banner.create({ data });
  }
  updateBanner(id: number, data: any) {
    return this.prisma.banner.update({ where: { id }, data });
  }
  async deleteBanner(id: number) {
    await this.prisma.banner.delete({ where: { id } });
    return { id, deleted: true };
  }
}
