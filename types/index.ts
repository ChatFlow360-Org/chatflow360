export type ConversationStatus = "open" | "pending" | "resolved" | "closed";
export type ResponderMode = "ai" | "human";
export type MessageSender = "visitor" | "ai" | "agent";
export type MemberRole = "owner" | "admin" | "agent";
export type ChannelType = "website" | "whatsapp" | "facebook";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: string;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  preferredLanguage: "en" | "es";
}

export interface Channel {
  id: string;
  organizationId: string;
  name: string;
  type: ChannelType;
  isActive: boolean;
}

export interface Conversation {
  id: string;
  channelId: string;
  visitorName: string;
  visitorEmail?: string;
  status: ConversationStatus;
  responderMode: ResponderMode;
  lastMessage: string;
  lastMessageAt: string;
  messageCount: number;
  createdAt: string;
  channelName?: string;
  pageUrl?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  content: string;
  senderType: MessageSender;
  senderName: string;
  createdAt: string;
}

export interface AiSettings {
  id: string;
  organizationId: string;
  provider: string;
  model: string;
  systemPrompt: string | null;
  temperature: number;
  maxTokens: number;
  handoffKeywords: string[];
}

export interface KnowledgeItem {
  id: string;
  channelId: string;
  title: string;
  content: string;
  createdAt: string;
}

export interface DashboardStats {
  totalConversations: number;
  activeNow: number;
  avgSessionTime: string;
  aiHandled: number;
  newVisitors: number;
}

export interface NavItem {
  label: string;
  href: string;
  icon: string;
}
