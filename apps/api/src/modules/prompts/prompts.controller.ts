import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PromptsService } from './prompts.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';

@ApiTags('prompts')
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('prompts')
export class PromptsController {
  constructor(private readonly promptsService: PromptsService) {}

  @ApiOperation({ summary: 'List system prompts' })
  @Get()
  async list(@CurrentTenant() organizationId: string) {
    return this.promptsService.listPrompts(organizationId);
  }

  @ApiOperation({ summary: 'Get single prompt' })
  @Get(':id')
  async get(@CurrentTenant() organizationId: string, @Param('id') id: string) {
    return this.promptsService.getPrompt(organizationId, id);
  }

  @ApiOperation({ summary: 'Create prompt' })
  @Post()
  async create(
    @CurrentTenant() organizationId: string,
    @Body() body: { name: string; systemPrompt: string; variables?: string[]; temperature?: number; aiProviderId?: string },
  ) {
    return this.promptsService.createPrompt(organizationId, body);
  }

  @ApiOperation({ summary: 'Update prompt' })
  @Put(':id')
  async update(
    @CurrentTenant() organizationId: string,
    @Param('id') id: string,
    @Body() body: Partial<{ name: string; systemPrompt: string; variables: string[]; temperature: number; aiProviderId: string }>,
  ) {
    return this.promptsService.updatePrompt(organizationId, id, body);
  }

  @ApiOperation({ summary: 'Delete prompt' })
  @Delete(':id')
  async delete(@CurrentTenant() organizationId: string, @Param('id') id: string) {
    return this.promptsService.deletePrompt(organizationId, id);
  }

  @ApiOperation({ summary: 'Test prompt in playground' })
  @Post('test')
  async testPlayground(
    @CurrentTenant() organizationId: string,
    @Body() body: { systemPrompt: string; userMessage: string; temperature?: number },
  ) {
    const response = await this.promptsService.testPlayground(
      organizationId,
      body.systemPrompt,
      body.userMessage,
      body.temperature,
    );
    return { output: response };
  }
}
