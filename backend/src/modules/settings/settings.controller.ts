import { Body, Controller, Get, Patch } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { Public } from '../../common/decorators/public.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller()
export class SettingsController {
  constructor(private settings: SettingsService) {}

  @Public()
  @Get('settings')
  publicSettings() {
    return this.settings.getPublic();
  }

  @Get('admin/settings')
  @RequirePermissions('settings.manage')
  all() {
    return this.settings.getAll();
  }

  @Patch('admin/settings')
  @RequirePermissions('settings.manage')
  update(@Body() body: Record<string, string>) {
    return this.settings.update(body);
  }
}
