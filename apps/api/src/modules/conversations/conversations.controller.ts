import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ConversationsService } from './conversations.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';

@ApiTags('conversations')
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @ApiOperation({ summary: 'List all conversations for organization' })
  @Get()
  async list(@CurrentTenant() organizationId: string, @Query('status') status?: string) {
    return this.conversationsService.listConversations(organizationId, status);
  }

  @ApiOperation({ summary: 'Get conversation details' })
  @Get(':id')
  async get(@CurrentTenant() organizationId: string, @Param('id') id: string) {
    return this.conversationsService.getConversation(organizationId, id);
  }

  @ApiOperation({ summary: 'Get messages for conversation' })
  @Get(':id/messages')
  async getMessages(@CurrentTenant() organizationId: string, @Param('id') id: string) {
    return this.conversationsService.getMessages(organizationId, id);
  }

  @ApiOperation({ summary: 'Send message to contact in conversation' })
  @Post(':id/messages')
  async sendMessage(
    @CurrentTenant() organizationId: string,
    @Param('id') id: string,
    @Body() body: { content: string; mediaUrl?: string },
  ) {
    return this.conversationsService.sendMessage(organizationId, id, body.content, body.mediaUrl);
  }

  @ApiOperation({ summary: 'Toggle AI auto-reply on conversation' })
  @Patch(':id/ai-toggle')
  async toggleAi(
    @CurrentTenant() organizationId: string,
    @Param('id') id: string,
    @Body() body: { aiEnabled: boolean },
  ) {
    return this.conversationsService.toggleAi(organizationId, id, body.aiEnabled);
  }

  @ApiOperation({ summary: 'Assign conversation to agent' })
  @Patch(':id/assign')
  async assignAgent(
    @CurrentTenant() organizationId: string,
    @Param('id') id: string,
    @Body() body: { userId: string | null },
  ) {
    return this.conversationsService.assignAgent(organizationId, id, body.userId);
  }
}
