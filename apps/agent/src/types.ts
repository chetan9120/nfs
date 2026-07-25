export interface ApiFile {
  id: string;
  hash: string;
  size: number;
  mimeType: string;
  originalName: string;
}

export interface ApiMessage {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  type: 'TEXT' | 'SYSTEM';
  clientId?: string | null;
  createdAt: string;
}

export interface ApiConversation {
  id: string;
  fileId: string;
  file: ApiFile;
  messages: ApiMessage[];
  createdAt: string;
}
