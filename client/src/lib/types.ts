export interface ChatMessageRequest {
  sessionId: string;
  apiKey: string;
  message: string;
}

export interface ChatMessageResponse {
  messages: Array<{
    role: "user" | "assistant";
    content: string;
    timestamp: string;
  }>;
  status?: string;
  cvData?: any;
}

export interface StartConversationRequest {
  sessionId: string;
  apiKey: string;
}

export interface StartConversationResponse {
  success: boolean;
  threadId: string;
  assistantId: string;
}

export interface Session {
  id: string;
  assistantId?: string;
  threadId?: string;
  profession?: string;
  sections?: string[];
  status: string;
  cvData?: any;
  completed: boolean;
}

export interface GeneratePdfRequest {
  sessionId: string;
}

export interface GeneratePdfResponse {
  success: boolean;
  pdfUrl: string;
}
