import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class WhatsappGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(WhatsappGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join:organization')
  handleJoinOrg(client: Socket, organizationId: string) {
    client.join(`org:${organizationId}`);
    this.logger.log(`Client ${client.id} joined room org:${organizationId}`);
  }

  @SubscribeMessage('leave:organization')
  handleLeaveOrg(client: Socket, organizationId: string) {
    client.leave(`org:${organizationId}`);
  }

  @SubscribeMessage('join:conversation')
  handleJoinConv(client: Socket, conversationId: string) {
    client.join(`conv:${conversationId}`);
  }

  @SubscribeMessage('leave:conversation')
  handleLeaveConv(client: Socket, conversationId: string) {
    client.leave(`conv:${conversationId}`);
  }

  broadcastMessageCreated(organizationId: string, conversationId: string, message: any) {
    this.server.to(`org:${organizationId}`).emit('message:created', message);
    this.server.to(`conv:${conversationId}`).emit('message:created', message);
  }

  broadcastConversationUpdated(organizationId: string, conversation: any) {
    this.server.to(`org:${organizationId}`).emit('conversation:updated', conversation);
  }

  broadcastSessionStatus(organizationId: string, sessionId: string, status: string, qrCodeBase64?: string) {
    this.server.to(`org:${organizationId}`).emit('session:status', { sessionId, status, qrCodeBase64 });
  }

  broadcastWorkflowNodeEvent(organizationId: string, event: string, data: any) {
    this.server.to(`org:${organizationId}`).emit(event, data);
  }
}
