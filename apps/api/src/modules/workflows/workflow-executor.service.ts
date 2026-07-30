import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { WhatsappGateway } from '../whatsapp/whatsapp.gateway';
import { AiService } from '../ai/ai.service';
import { WppConnectMessagingProvider } from '../../common/messaging/wppconnect-messaging.provider';
import axios from 'axios';

export interface WorkflowContext {
  organizationId: string;
  workflowId: string;
  runId: string;
  sessionId?: string;
  phone?: string;
  incomingMessage?: string;
  variables: Record<string, any>;
}

@Injectable()
export class WorkflowExecutorService {
  private readonly logger = new Logger(WorkflowExecutorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: WhatsappGateway,
    private readonly aiService: AiService,
    private readonly messagingProvider: WppConnectMessagingProvider,
  ) {}

  async executeWorkflow(workflowId: string, triggerContext: Partial<WorkflowContext>) {
    const workflow = await this.prisma.workflow.findUnique({
      where: { id: workflowId },
    });

    if (!workflow || !workflow.isActive) {
      return { status: 'SKIPPED', reason: 'Workflow not active' };
    }

    const run = await this.prisma.workflowRun.create({
      data: {
        workflowId,
        status: 'RUNNING',
        startedAt: new Date(),
        logs: [],
      },
    });

    const context: WorkflowContext = {
      organizationId: workflow.organizationId,
      workflowId,
      runId: run.id,
      sessionId: triggerContext.sessionId,
      phone: triggerContext.phone,
      incomingMessage: triggerContext.incomingMessage,
      variables: triggerContext.variables || {},
    };

    const nodes: any[] = Array.isArray(workflow.nodes) ? workflow.nodes : [];
    const edges: any[] = Array.isArray(workflow.edges) ? workflow.edges : [];

    // Find trigger node
    const triggerNode = nodes.find(
      (n) => n.type === 'RECEIVE_MESSAGE' || n.data?.type === 'RECEIVE_MESSAGE',
    ) || nodes[0];

    if (!triggerNode) {
      await this.prisma.workflowRun.update({
        where: { id: run.id },
        data: { status: 'FAILED', error: 'No trigger node found' },
      });
      return { status: 'FAILED' };
    }

    const executionLogs: Array<{ nodeId: string; type: string; timestamp: string; output?: any; error?: string }> = [];

    let currentNodeId: string | null = triggerNode.id;

    try {
      while (currentNodeId) {
        const currentNode = nodes.find((n) => n.id === currentNodeId);
        if (!currentNode) break;

        const nodeType = currentNode.type || currentNode.data?.type;

        // Broadcast node start
        this.gateway.broadcastWorkflowNodeEvent(context.organizationId, 'workflow:node_start', {
          runId: run.id,
          nodeId: currentNode.id,
        });

        const output = await this.executeNode(currentNode, context);

        executionLogs.push({
          nodeId: currentNode.id,
          type: nodeType,
          timestamp: new Date().toISOString(),
          output,
        });

        // Broadcast node complete
        this.gateway.broadcastWorkflowNodeEvent(context.organizationId, 'workflow:node_complete', {
          runId: run.id,
          nodeId: currentNode.id,
          output,
        });

        if (nodeType === 'END') break;

        // Find next outgoing edge
        const outgoingEdge = edges.find((e) => e.source === currentNode.id);
        currentNodeId = outgoingEdge ? outgoingEdge.target : null;
      }

      await this.prisma.workflowRun.update({
        where: { id: run.id },
        data: {
          status: 'COMPLETED',
          finishedAt: new Date(),
          logs: executionLogs as any,
        },
      });

      return { status: 'COMPLETED', runId: run.id };
    } catch (error: any) {
      this.logger.error(`Workflow execution error in run ${run.id}:`, error.message);

      this.gateway.broadcastWorkflowNodeEvent(context.organizationId, 'workflow:node_error', {
        runId: run.id,
        nodeId: currentNodeId,
        error: error.message,
      });

      await this.prisma.workflowRun.update({
        where: { id: run.id },
        data: {
          status: 'FAILED',
          finishedAt: new Date(),
          error: error.message,
          logs: executionLogs as any,
        },
      });

      return { status: 'FAILED', error: error.message };
    }
  }

  private async executeNode(node: any, context: WorkflowContext): Promise<any> {
    const nodeType = node.type || node.data?.type;
    const config = node.data?.config || node.config || {};

    switch (nodeType) {
      case 'RECEIVE_MESSAGE':
        return { message: context.incomingMessage };

      case 'AI_RESPONSE': {
        const systemPrompt = config.systemPrompt || 'You are a helpful customer support assistant.';
        const responseText = await this.aiService.generateResponse(
          context.organizationId,
          systemPrompt,
          context.incomingMessage || 'Hello',
        );
        context.variables['aiResponse'] = responseText;
        return { aiResponse: responseText };
      }

      case 'SEND_MESSAGE': {
        const text = config.messageText || context.variables['aiResponse'] || 'Thank you for reaching out!';
        if (context.sessionId && context.phone) {
          await this.messagingProvider.sendMessage(context.sessionId, context.phone, text);
        }
        return { sentText: text };
      }

      case 'CONDITION': {
        const variable = config.variable || 'incomingMessage';
        const expected = config.expectedValue || '';
        const isMatch = String(context.variables[variable] || context.incomingMessage).includes(expected);
        return { result: isMatch };
      }

      case 'SWITCH': {
        return { case: config.defaultCase || 'case_1' };
      }

      case 'KNOWLEDGE_SEARCH': {
        return { results: ['Knowledge Base entry match for prompt'] };
      }

      case 'DELAY': {
        const ms = (config.delaySeconds || 2) * 1000;
        await new Promise((resolve) => setTimeout(resolve, ms));
        return { delayedMs: ms };
      }

      case 'HTTP_REQUEST':
      case 'WEBHOOK': {
        if (config.url) {
          const resp = await axios.post(config.url, { context });
          return { status: resp.status, data: resp.data };
        }
        return { status: 200, mock: true };
      }

      case 'HUMAN_TAKEOVER': {
        if (context.phone) {
          await this.prisma.conversation.updateMany({
            where: {
              organizationId: context.organizationId,
              contact: { phone: context.phone },
            },
            data: { aiEnabled: false },
          });
        }
        return { humanHandOff: true };
      }

      case 'ASSIGN_TICKET':
      case 'DATABASE_QUERY':
      case 'END':
      default:
        return { executed: true, nodeType };
    }
  }
}
