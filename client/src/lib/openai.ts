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
    const response = await apiRequest("GET", `/api/session/${sessionId}/messages`, undefined);
    
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
    
    // Check if the response is JSON (local development) or PDF (Vercel)
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/pdf')) {
      // Vercel response - direct PDF file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      return { success: true, pdfUrl: url };
    } else {
      // Local development response - JSON with URL
      return await response.json();
    }
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw error;
  }
}
