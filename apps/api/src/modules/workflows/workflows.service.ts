import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { WorkflowExecutorService } from './workflow-executor.service';

@Injectable()
export class WorkflowsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly executor: WorkflowExecutorService,
  ) {}

  async listWorkflows(organizationId: string) {
    return this.prisma.workflow.findMany({
      where: { organizationId },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { runs: true } },
      },
    });
  }

  async getWorkflow(organizationId: string, id: string) {
    const workflow = await this.prisma.workflow.findFirst({
      where: { id, organizationId },
      include: { runs: { take: 10, orderBy: { startedAt: 'desc' } } },
    });
    if (!workflow) throw new NotFoundException('Workflow not found');
    return workflow;
  }

  async createWorkflow(
    organizationId: string,
    data: { name: string; nodes?: any[]; edges?: any[]; isActive?: boolean },
  ) {
    const nodes = data.nodes || [];
    if (nodes.length > 20) {
      throw new BadRequestException('Workflow cannot exceed 20 nodes');
    }

    return this.prisma.workflow.create({
      data: {
        organizationId,
        name: data.name,
        nodes: nodes as any,
        edges: (data.edges || []) as any,
        isActive: data.isActive ?? false,
      },
    });
  }

  async updateWorkflow(
    organizationId: string,
    id: string,
    data: Partial<{ name: string; nodes: any[]; edges: any[]; isActive: boolean }>,
  ) {
    const existing = await this.getWorkflow(organizationId, id);
    const nodes = data.nodes || existing.nodes;
    if (Array.isArray(nodes) && nodes.length > 20) {
      throw new BadRequestException('Workflow cannot exceed 20 nodes');
    }

    return this.prisma.workflow.update({
      where: { id: existing.id },
      data: {
        ...data,
        nodes: (data.nodes || existing.nodes) as any,
        edges: (data.edges || existing.edges) as any,
      },
    });
  }

  async deleteWorkflow(organizationId: string, id: string) {
    const existing = await this.getWorkflow(organizationId, id);
    return this.prisma.workflow.delete({
      where: { id: existing.id },
    });
  }

  async runWorkflow(organizationId: string, id: string, payload?: any) {
    await this.getWorkflow(organizationId, id);
    return this.executor.executeWorkflow(id, {
      sessionId: payload?.sessionId,
      phone: payload?.phone,
      incomingMessage: payload?.incomingMessage || 'Simulated test run trigger',
      variables: payload?.variables || {},
    });
  }

  async getRuns(organizationId: string, workflowId: string) {
    await this.getWorkflow(organizationId, workflowId);
    return this.prisma.workflowRun.findMany({
      where: { workflowId },
      orderBy: { startedAt: 'desc' },
      take: 50,
    });
  }
}
