import { apiRequest } from "./queryClient";

export async function sendMessage(sessionId: string, apiKey: string, message: string) {
  try {
    const response = await apiRequest("POST", "/api/conversation/message", {
      sessionId,
      apiKey,
      message
    });
    
    return await response.json();
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
}

export async function startConversation(sessionId: string, apiKey: string) {
  try {
    const response = await apiRequest("POST", "/api/conversation/start", {
      sessionId,
      apiKey
    });
    
    return await response.json();
  } catch (error) {
    console.error("Error starting conversation:", error);
    throw error;
  }
}

export async function getConversationMessages(sessionId: string) {
  try {
    const response = await apiRequest("GET", `/api/conversation/messages?sessionId=${sessionId}`, undefined);
    
    return await response.json();
  } catch (error) {
    console.error("Error fetching messages:", error);
    throw error;
  }
}

export async function generatePdf(sessionId: string) {
  try {
    const response = await apiRequest("POST", "/api/cv/generate-pdf", {
      sessionId
    });
    
    return await response.json();
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw error;
  }
}
