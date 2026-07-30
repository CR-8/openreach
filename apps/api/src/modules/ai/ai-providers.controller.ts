import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';

@ApiTags('ai-providers')
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('ai-providers')
export class AiProvidersController {
  constructor(private readonly aiService: AiService) {}

  @ApiOperation({ summary: 'List configured AI providers' })
  @Get()
  async list(@CurrentTenant() organizationId: string) {
    return this.aiService.listProviders(organizationId);
  }

  @ApiOperation({ summary: 'Create new AI provider credentials' })
  @Post()
  async create(
    @CurrentTenant() organizationId: string,
    @Body() body: { name: string; baseUrl: string; apiKeyEncrypted: string; defaultModel: string },
  ) {
    return this.aiService.createProvider(organizationId, body);
  }

  @ApiOperation({ summary: 'Update AI provider' })
  @Put(':id')
  async update(
    @CurrentTenant() organizationId: string,
    @Param('id') id: string,
    @Body() body: Partial<{ name: string; baseUrl: string; apiKeyEncrypted: string; defaultModel: string }>,
  ) {
    return this.aiService.updateProvider(organizationId, id, body);
  }

  @ApiOperation({ summary: 'Delete AI provider' })
  @Delete(':id')
  async delete(@CurrentTenant() organizationId: string, @Param('id') id: string) {
    return this.aiService.deleteProvider(organizationId, id);
  }
}
