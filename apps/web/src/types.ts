export type ParticipantRole = 'OWNER' | 'RECIPIENT';
export type ParticipantStatus = 'PENDING' | 'DELIVERED' | 'OPENED' | 'DOWNLOADED';
export type MessageType = 'TEXT' | 'SYSTEM';

export interface UserSummary {
  id: string;
  email: string;
  displayName: string;
}

export interface Participant {
  id: string;
  conversationId: string;
  userId: string;
  user: UserSummary;
  role: ParticipantRole;
  status: ParticipantStatus;
  deliveredAt: string | null;
  openedAt: string | null;
  downloadedAt: string | null;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  type: MessageType;
  createdAt: string;
}

export interface FileMeta {
  id: string;
  hash: string;
  size: number;
  mimeType: string;
  originalName: string;
  uploaderId: string;
  createdAt: string;
}

export interface Invite {
  id: string;
  email: string;
  conversationId: string;
  invitedById: string;
  claimedById: string | null;
  claimedAt: string | null;
  createdAt: string;
}

export interface Conversation {
  id: string;
  fileId: string;
  file: FileMeta;
  participants: Participant[];
  invites: Invite[];
  messages: Message[];
  createdAt: string;
}
