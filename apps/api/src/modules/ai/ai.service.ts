import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import OpenAI from 'openai';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private readonly prisma: PrismaService) {}

  private getOpenAIClient(provider?: { baseUrl?: string; apiKeyEncrypted?: string }) {
    const baseURL = provider?.baseUrl || process.env.LITELLM_URL || 'http://localhost:4000/v1';
    const apiKey = provider?.apiKeyEncrypted || process.env.LITELLM_MASTER_KEY || 'sk-litellm-master-key';

    return new OpenAI({
      baseURL,
      apiKey,
    });
  }

  async listProviders(organizationId: string) {
    return this.prisma.aiProvider.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createProvider(organizationId: string, data: { name: string; baseUrl: string; apiKeyEncrypted: string; defaultModel: string }) {
    return this.prisma.aiProvider.create({
      data: {
        organizationId,
        ...data,
      },
    });
  }

  async updateProvider(organizationId: string, id: string, data: Partial<{ name: string; baseUrl: string; apiKeyEncrypted: string; defaultModel: string }>) {
    return this.prisma.aiProvider.updateMany({
      where: { id, organizationId },
      data,
    });
  }

  async deleteProvider(organizationId: string, id: string) {
    return this.prisma.aiProvider.deleteMany({
      where: { id, organizationId },
    });
  }

  async generateResponse(
    organizationId: string,
    promptSystem: string,
    userMessage: string,
    model: string = 'gpt-4o',
    temperature: number = 0.7,
  ): Promise<string> {
    try {
      const defaultProvider = await this.prisma.aiProvider.findFirst({
        where: { organizationId },
      });

      const openai = this.getOpenAIClient(defaultProvider || undefined);
      const completion = await openai.chat.completions.create({
        model: defaultProvider?.defaultModel || model,
        temperature,
        messages: [
          { role: 'system', content: promptSystem },
          { role: 'user', content: userMessage },
        ],
      });

      return completion.choices[0]?.message?.content || 'I could not process your request at this time.';
    } catch (error: any) {
      this.logger.error('Error generating AI response:', error.message);
      return 'AI assistant is currently unavailable.';
    }
  }
}
