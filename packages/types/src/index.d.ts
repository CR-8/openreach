export declare enum UserRole {
    ADMIN = "ADMIN",
    AGENT = "AGENT"
}
export interface UserDto {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    organizationId: string;
    createdAt: string;
}
export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    user: UserDto;
}
export type SessionStatus = 'DISCONNECTED' | 'STARTING' | 'SCAN_QR_CODE' | 'CONNECTED' | 'PAUSED';
export interface QrCodeResult {
    sessionId: string;
    qrCodeUrl?: string;
    qrCodeBase64?: string;
    status: SessionStatus;
}
export interface MessageResult {
    messageId: string;
    status: 'SENT' | 'FAILED' | 'PENDING';
    error?: string;
}
export interface MediaPayload {
    url: string;
    mimetype: string;
    filename?: string;
    caption?: string;
}
export interface ContactDto {
    id: string;
    organizationId: string;
    sessionId: string;
    phone: string;
    name?: string;
    tags: string[];
    createdAt: string;
}
export interface MessagingProvider {
    sendMessage(sessionId: string, to: string, text: string): Promise<MessageResult>;
    sendMedia(sessionId: string, to: string, media: MediaPayload): Promise<MessageResult>;
    getSession(sessionId: string): Promise<SessionStatus>;
    createSession(sessionId: string): Promise<QrCodeResult>;
    reconnect(sessionId: string): Promise<void>;
    disconnect(sessionId: string): Promise<void>;
    getContacts(sessionId: string): Promise<ContactDto[]>;
}
export interface ServerToClientEvents {
    'message:created': (message: any) => void;
    'conversation:updated': (conversation: any) => void;
    'session:status': (data: {
        sessionId: string;
        status: SessionStatus;
        qrCodeBase64?: string;
    }) => void;
    'workflow:node_start': (data: {
        runId: string;
        nodeId: string;
    }) => void;
    'workflow:node_complete': (data: {
        runId: string;
        nodeId: string;
        output?: any;
    }) => void;
    'workflow:node_error': (data: {
        runId: string;
        nodeId: string;
        error: string;
    }) => void;
}
export interface ClientToServerEvents {
    'join:organization': (organizationId: string) => void;
    'leave:organization': (organizationId: string) => void;
    'join:conversation': (conversationId: string) => void;
    'leave:conversation': (conversationId: string) => void;
}
export type WorkflowNodeType = 'RECEIVE_MESSAGE' | 'CONDITION' | 'SWITCH' | 'AI_RESPONSE' | 'KNOWLEDGE_SEARCH' | 'SEND_MESSAGE' | 'DELAY' | 'HTTP_REQUEST' | 'WEBHOOK' | 'DATABASE_QUERY' | 'ASSIGN_TICKET' | 'HUMAN_TAKEOVER' | 'END';
export interface WorkflowNodeData {
    label: string;
    type: WorkflowNodeType;
    config?: Record<string, any>;
}
