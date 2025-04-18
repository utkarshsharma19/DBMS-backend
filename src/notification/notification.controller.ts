import { Controller, Post, Body } from '@nestjs/common';
import { NotificationService } from './notification.service';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post()
  createNotification(
    @Body('time') time: Date,
    @Body('title') title: string,
    @Body('message') message: string,
    @Body('token') token: string,
  ): void {
    this.notificationService.createNotification(time, title, message, token);
  }
}
