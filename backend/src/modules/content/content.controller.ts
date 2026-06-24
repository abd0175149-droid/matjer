import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ContentService } from './content.service';
import { Public } from '../../common/decorators/public.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller()
export class ContentController {
  constructor(private content: ContentService) {}

  // ─── عام ───
  @Public() @Get('pages')
  pages() { return this.content.listPublicPages(); }

  @Public() @Get('pages/:slug')
  page(@Param('slug') slug: string) { return this.content.getPage(slug); }

  @Public() @Get('banners')
  banners() { return this.content.activeBanners(); }

  // ─── إدارة ───
  @Get('admin/pages') @RequirePermissions('settings.manage')
  adminPages() { return this.content.adminPages(); }

  @Post('admin/pages') @RequirePermissions('settings.manage')
  createPage(@Body() b: any) { return this.content.createPage(b); }

  @Patch('admin/pages/:id') @RequirePermissions('settings.manage')
  updatePage(@Param('id', ParseIntPipe) id: number, @Body() b: any) { return this.content.updatePage(id, b); }

  @Delete('admin/pages/:id') @RequirePermissions('settings.manage')
  deletePage(@Param('id', ParseIntPipe) id: number) { return this.content.deletePage(id); }

  @Get('admin/banners') @RequirePermissions('settings.manage')
  adminBanners() { return this.content.adminBanners(); }

  @Post('admin/banners') @RequirePermissions('settings.manage')
  createBanner(@Body() b: any) { return this.content.createBanner(b); }

  @Patch('admin/banners/:id') @RequirePermissions('settings.manage')
  updateBanner(@Param('id', ParseIntPipe) id: number, @Body() b: any) { return this.content.updateBanner(id, b); }

  @Delete('admin/banners/:id') @RequirePermissions('settings.manage')
  deleteBanner(@Param('id', ParseIntPipe) id: number) { return this.content.deleteBanner(id); }
}
