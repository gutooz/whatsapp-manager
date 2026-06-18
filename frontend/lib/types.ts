export type Role = 'ADMIN' | 'MEMBER';
export type ConversationStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'WAITING';
export type MessageType = 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT' | 'STICKER' | 'REACTION';
export type MessageStatus = 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
export type Direction = 'INBOUND' | 'OUTBOUND';
export type AssignmentMode = 'ROUND_ROBIN' | 'LEAST_BUSY' | 'MANUAL';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  color: string;
  isActive: boolean;
  createdAt?: string;
  activeConversations?: number;
  _count?: { conversations: number };
}

export interface Contact {
  id: string;
  phone: string;
  name?: string;
  profilePic?: string;
  lastSeen?: string;
  createdAt: string;
}

export interface ConversationAssignment {
  id: string;
  userId: string;
  user: Pick<User, 'id' | 'name' | 'color'>;
  assignedAt: string;
}

export interface Conversation {
  id: string;
  contactId: string;
  contact: Contact;
  status: ConversationStatus;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  assignment?: ConversationAssignment;
}

export interface Message {
  id: string;
  conversationId: string;
  evolutionId?: string;
  content: string;
  type: MessageType;
  direction: Direction;
  sentById?: string;
  sentBy?: Pick<User, 'id' | 'name' | 'color'>;
  mediaUrl?: string;
  status: MessageStatus;
  timestamp: string;
  createdAt: string;
}

export interface ConversationNote {
  id: string;
  conversationId: string;
  userId: string;
  user: Pick<User, 'id' | 'name' | 'color'>;
  content: string;
  createdAt: string;
}

export interface AssignmentHistory {
  id: string;
  conversationId: string;
  userId: string;
  userName: string;
  assignedBy: string;
  assignedByName: string;
  assignedAt: string;
  unassignedAt?: string;
}

export interface DailyMetric {
  id: string;
  userId: string;
  date: string;
  conversationsHandled: number;
  messagesSent: number;
  avgResponseTimeMs: number;
  resolvedCount: number;
}

export interface AgentMetric {
  id: string;
  name: string;
  color: string;
  role: Role;
  online: boolean;
  activeConversations: number;
  conversationsHandled: number;
  messagesSent: number;
  avgResponseTimeMs: number;
  resolvedCount: number;
}

export interface OverviewMetrics {
  openConversations: number;
  messagesToday: number;
  resolvedRate: number;
  avgFirstResponseMs: number;
}

export interface Settings {
  id: string;
  evolutionApiUrl: string;
  evolutionApiKey: string;
  evolutionInstance: string;
  assignmentMode: AssignmentMode;
  autoAssign: boolean;
  slaWarningMinutes: number;
  slaCriticalMinutes: number;
  allowMembersOverride: boolean;
}
