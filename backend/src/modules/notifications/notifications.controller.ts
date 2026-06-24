import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { IsString } from 'class-validator';
import { NotificationsService } from './notifications.service';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

class RegisterDto {
  @IsString() token: string;
}

@Controller('notifications')
export class NotificationsController {
  constructor(private notifications: NotificationsService) {}

  @Post('register')
  register(@CurrentUser() user: AuthUser, @Body() dto: RegisterDto, @Req() req: any) {
    return this.notifications.registerToken(dto.token, user.id, req.headers['user-agent']);
  }

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.notifications.listForUser(user.id);
  }

  @Get('unread-count')
  unread(@CurrentUser() user: AuthUser) {
    return this.notifications.unreadCount(user.id);
  }

  @Post('read')
  read(@CurrentUser() user: AuthUser, @Body() body: { id?: number }) {
    return this.notifications.markRead(user.id, body?.id);
  }
}
