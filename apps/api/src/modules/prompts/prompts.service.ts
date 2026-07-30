import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AiService } from '../ai/ai.service';

@Injectable()
export class PromptsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  async listPrompts(organizationId: string) {
    return this.prisma.prompt.findMany({
      where: { organizationId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getPrompt(organizationId: string, id: string) {
    const prompt = await this.prisma.prompt.findFirst({
      where: { id, organizationId },
    });
    if (!prompt) throw new NotFoundException('Prompt not found');
    return prompt;
  }

  async createPrompt(
    organizationId: string,
    data: { name: string; systemPrompt: string; variables?: string[]; temperature?: number; aiProviderId?: string },
  ) {
    return this.prisma.prompt.create({
      data: {
        organizationId,
        name: data.name,
        systemPrompt: data.systemPrompt,
        variables: data.variables || [],
        temperature: data.temperature || 0.7,
        aiProviderId: data.aiProviderId || null,
      },
    });
  }

  async updatePrompt(
    organizationId: string,
    id: string,
    data: Partial<{ name: string; systemPrompt: string; variables: string[]; temperature: number; aiProviderId: string }>,
  ) {
    const existing = await this.getPrompt(organizationId, id);
    return this.prisma.prompt.update({
      where: { id: existing.id },
      data: {
        ...data,
        version: { increment: 1 },
      },
    });
  }

  async deletePrompt(organizationId: string, id: string) {
    const existing = await this.getPrompt(organizationId, id);
    return this.prisma.prompt.delete({
      where: { id: existing.id },
    });
  }

  async testPlayground(
    organizationId: string,
    systemPrompt: string,
    userMessage: string,
    temperature?: number,
  ) {
    return this.aiService.generateResponse(
      organizationId,
      systemPrompt,
      userMessage,
      'gpt-4o',
      temperature || 0.7,
    );
  }
}
