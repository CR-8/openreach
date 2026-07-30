import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { WorkflowsService } from './workflows.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';

@ApiTags('workflows')
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('workflows')
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @ApiOperation({ summary: 'List workflows' })
  @Get()
  async list(@CurrentTenant() organizationId: string) {
    return this.workflowsService.listWorkflows(organizationId);
  }

  @ApiOperation({ summary: 'Get workflow details' })
  @Get(':id')
  async get(@CurrentTenant() organizationId: string, @Param('id') id: string) {
    return this.workflowsService.getWorkflow(organizationId, id);
  }

  @ApiOperation({ summary: 'Create workflow' })
  @Post()
  async create(
    @CurrentTenant() organizationId: string,
    @Body() body: { name: string; nodes?: any[]; edges?: any[]; isActive?: boolean },
  ) {
    return this.workflowsService.createWorkflow(organizationId, body);
  }

  @ApiOperation({ summary: 'Update workflow canvas nodes & edges' })
  @Put(':id')
  async update(
    @CurrentTenant() organizationId: string,
    @Param('id') id: string,
    @Body() body: Partial<{ name: string; nodes: any[]; edges: any[]; isActive: boolean }>,
  ) {
    return this.workflowsService.updateWorkflow(organizationId, id, body);
  }

  @ApiOperation({ summary: 'Delete workflow' })
  @Delete(':id')
  async delete(@CurrentTenant() organizationId: string, @Param('id') id: string) {
    return this.workflowsService.deleteWorkflow(organizationId, id);
  }

  @ApiOperation({ summary: 'Trigger manual workflow run' })
  @Post(':id/run')
  async run(
    @CurrentTenant() organizationId: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.workflowsService.runWorkflow(organizationId, id, body);
  }

  @ApiOperation({ summary: 'Get execution history runs for workflow' })
  @Get(':id/runs')
  async getRuns(@CurrentTenant() organizationId: string, @Param('id') id: string) {
    return this.workflowsService.getRuns(organizationId, id);
  }
}
