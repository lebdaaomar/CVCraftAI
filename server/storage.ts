import { cvSessions, type InsertCVSession, type CVSession, type UpdateCVSession } from "@shared/schema";

// Interface for a chat message
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

// Interface for storage
export interface IStorage {
  createSession(data: Partial<UpdateCVSession>): Promise<string>;
  getSession(sessionId: string): Promise<CVSession | undefined>;
  updateSession(sessionId: string, data: Partial<UpdateCVSession>): Promise<boolean>;
  saveMessage(sessionId: string, message: ChatMessage): Promise<boolean>;
  getSessionMessages(sessionId: string): Promise<ChatMessage[]>;
}

// In-memory storage
export class MemStorage implements IStorage {
  private sessions: Map<string, CVSession>;
  private messages: Map<string, ChatMessage[]>;
  private currentId: number;

  constructor() {
    this.sessions = new Map();
    this.messages = new Map();
    this.currentId = 1;
  }

  async createSession(data: Partial<UpdateCVSession>): Promise<string> {
    const id = this.currentId++;
    const sessionId = data.sessionId || `session_${id}`;

    const session: CVSession = {
      id,
      sessionId,
      assistantId: data.assistantId || null,
      threadId: data.threadId || null,
      profession: data.profession || null,
      sections: data.sections || null,
      cvData: data.cvData || null,
      status: data.status || "started",
      completed: data.completed || false,
    };

    this.sessions.set(sessionId, session);
    this.messages.set(sessionId, []);

    return sessionId;
  }

  async getSession(sessionId: string): Promise<CVSession | undefined> {
    return this.sessions.get(sessionId);
  }

  async updateSession(sessionId: string, data: Partial<UpdateCVSession>): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return false;
    }

    const updatedSession: CVSession = {
      ...session,
      ...data,
    };

    this.sessions.set(sessionId, updatedSession);
    return true;
  }

  async saveMessage(sessionId: string, message: ChatMessage): Promise<boolean> {
    const sessionMessages = this.messages.get(sessionId) || [];
    sessionMessages.push(message);
    this.messages.set(sessionId, sessionMessages);
    return true;
  }

  async getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
    return this.messages.get(sessionId) || [];
  }
}

export const storage = new MemStorage();
