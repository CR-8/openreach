import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { WhatsappService } from './whatsapp.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';

@ApiTags('whatsapp-sessions')
@Controller('whatsapp-sessions')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @ApiOperation({ summary: 'List all WhatsApp sessions for organization' })
  @UseGuards(JwtAuthGuard, TenantGuard)
  @Get()
  async listSessions(@CurrentTenant() organizationId: string) {
    return this.whatsappService.listSessions(organizationId);
  }

  @ApiOperation({ summary: 'Start session / Generate QR code' })
  @UseGuards(JwtAuthGuard, TenantGuard)
  @Post(':sessionId/connect')
  async connectSession(
    @CurrentTenant() organizationId: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.whatsappService.createOrStartSession(organizationId, sessionId);
  }

  @ApiOperation({ summary: 'Get live session status' })
  @UseGuards(JwtAuthGuard, TenantGuard)
  @Get(':sessionId/status')
  async getStatus(
    @CurrentTenant() organizationId: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.whatsappService.getSessionStatus(organizationId, sessionId);
  }

  @ApiOperation({ summary: 'Disconnect WhatsApp session' })
  @UseGuards(JwtAuthGuard, TenantGuard)
  @Post(':sessionId/disconnect')
  async disconnect(
    @CurrentTenant() organizationId: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.whatsappService.disconnectSession(organizationId, sessionId);
  }

  @ApiOperation({ summary: 'WPPConnect inbound webhook receiver' })
  @Post('webhook')
  async webhook(@Body() payload: any) {
    return this.whatsappService.handleWebhook(payload);
  }
}
