import { SetMetadata } from '@nestjs/common';

// صيغة resource.action (errata C-10)
export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...perms: string[]) => SetMetadata(PERMISSIONS_KEY, perms);
