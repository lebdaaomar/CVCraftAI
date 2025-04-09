import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { nanoid } from "nanoid";
import { processMessage, createAssistant, createThread } from "./openai";
import { generateCVPdf } from "./pdf";
import * as fs from "fs";
import * as path from "path";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Create uploads directory if it doesn't exist
  const uploadsDir = path.join(process.cwd(), "dist/public/uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  
  // Ensure the uploads directory is accessible
  console.log(`Uploads directory: ${uploadsDir}`);
  console.log(`Uploads directory exists: ${fs.existsSync(uploadsDir)}`);
  
  // Create a test file to verify write permissions
  try {
    const testFilePath = path.join(uploadsDir, 'test-file.txt');
    fs.writeFileSync(testFilePath, 'Test file content');
    console.log(`Successfully created test file: ${testFilePath}`);
  } catch (error) {
    console.error(`Error creating test file: ${error.message}`);
  }

  // Create a new session
  app.post("/api/session/create", async (req, res) => {
    try {
      const sessionId = nanoid();
      await storage.createSession({
        sessionId,
        status: "started",
      });
      
      return res.json({ success: true, sessionId });
    } catch (error) {
      console.error("Error creating session:", error);
      return res.status(500).json({ error: "Failed to create session" });
    }
  });

  // Get session data
  app.get("/api/session", async (req, res) => {
    try {
      const sessionId = req.query.sessionId as string;
      
      if (!sessionId) {
        return res.status(400).json({ error: "Session ID is required" });
      }
      
      const session = await storage.getSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      return res.json(session);
    } catch (error) {
      console.error("Error fetching session:", error);
      return res.status(500).json({ error: "Failed to fetch session" });
    }
  });

  // Start conversation with OpenAI Assistant
  app.post("/api/conversation/start", async (req, res) => {
    try {
      const { sessionId, apiKey } = req.body;
      
      if (!sessionId || !apiKey) {
        return res.status(400).json({ error: "Session ID and API Key are required" });
      }
      
      const session = await storage.getSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      if (session.assistantId && session.threadId) {
        return res.json({ 
          success: true, 
          assistantId: session.assistantId, 
          threadId: session.threadId 
        });
      }
      
      // Create a new assistant
      const assistant = await createAssistant(apiKey);
      
      // Create a new thread
      const thread = await createThread(apiKey);
      
      // Update session with assistant and thread IDs
      await storage.updateSession(sessionId, {
        assistantId: assistant.id,
        threadId: thread.id,
        status: "collecting_profession"
      });
      
      return res.json({ 
        success: true, 
        assistantId: assistant.id, 
        threadId: thread.id 
      });
    } catch (error: any) {
      console.error("Error starting conversation:", error);
      return res.status(500).json({ error: error.message || "Failed to start conversation" });
    }
  });

  // Get conversation messages
  app.get("/api/conversation/messages", async (req, res) => {
    try {
      const sessionId = req.query.sessionId as string;
      
      if (!sessionId) {
        return res.status(400).json({ error: "Session ID is required" });
      }
      
      const messages = await storage.getSessionMessages(sessionId);
      
      return res.json({ messages });
    } catch (error) {
      console.error("Error fetching messages:", error);
      return res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // Send message to the assistant
  app.post("/api/conversation/message", async (req, res) => {
    try {
      const { sessionId, apiKey, message } = req.body;
      
      if (!sessionId || !apiKey || !message) {
        return res.status(400).json({ error: "Session ID, API Key, and message are required" });
      }
      
      const session = await storage.getSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      if (!session.assistantId || !session.threadId) {
        return res.status(400).json({ error: "Assistant not initialized" });
      }
      
      // Save user message
      await storage.saveMessage(sessionId, {
        role: "user",
        content: message,
        timestamp: new Date()
      });
      
      // Process the message with OpenAI
      const result = await processMessage(
        apiKey, 
        session.assistantId, 
        session.threadId, 
        message
      );
      
      // Save assistant response
      if (result.assistantMessage) {
        await storage.saveMessage(sessionId, {
          role: "assistant",
          content: result.assistantMessage,
          timestamp: new Date()
        });
      }
      
      // Update session status if needed
      if (result.status) {
        await storage.updateSession(sessionId, {
          status: result.status,
          profession: result.profession || session.profession,
          sections: result.sections || session.sections,
          cvData: result.cvData || session.cvData,
          completed: result.status === "completed" || session.completed
        });
      }
      
      // Get updated messages
      const messages = await storage.getSessionMessages(sessionId);
      
      return res.json({ 
        messages, 
        status: result.status,
        cvData: result.cvData
      });
    } catch (error: any) {
      console.error("Error processing message:", error);
      return res.status(500).json({ error: error.message || "Failed to process message" });
    }
  });

  // Generate CV PDF
  app.post("/api/cv/generate-pdf", async (req, res) => {
    try {
      const { sessionId } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({ error: "Session ID is required" });
      }
      
      const session = await storage.getSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      if (!session.cvData) {
        return res.status(400).json({ error: "CV data not found" });
      }
      
      // Generate PDF
      const pdfFileName = `cv_${sessionId}_${Date.now()}.pdf`;
      const pdfPath = path.join(uploadsDir, pdfFileName);
      
      await generateCVPdf(session.cvData, pdfPath);
      
      // Verify the PDF was created
      if (!fs.existsSync(pdfPath)) {
        throw new Error(`PDF file was not created at ${pdfPath}`);
      }

      console.log(`PDF created successfully at: ${pdfPath}`);
      console.log(`File size: ${fs.statSync(pdfPath).size} bytes`);
      
      // Return the PDF URL for direct download
      const pdfUrl = `/api/cv/download/${pdfFileName}`;
      
      return res.json({ 
        success: true, 
        pdfUrl 
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      return res.status(500).json({ error: "Failed to generate PDF" });
    }
  });
  
  // Download PDF route
  app.get("/api/cv/download/:filename", (req, res) => {
    try {
      const { filename } = req.params;
      
      // Security check to prevent directory traversal
      if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return res.status(400).json({ error: "Invalid filename" });
      }
      
      const filePath = path.join(uploadsDir, filename);
      
      if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        return res.status(404).json({ error: "File not found" });
      }
      
      console.log(`Serving PDF file: ${filePath}`);
      
      // Set the correct content type and force download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      // Stream the file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
      
      // Handle errors
      fileStream.on('error', (error) => {
        console.error(`Error streaming file: ${error.message}`);
        if (!res.headersSent) {
          res.status(500).json({ error: "Error streaming file" });
        }
      });
    } catch (error) {
      console.error("Error serving PDF:", error);
      return res.status(500).json({ error: "Failed to serve PDF" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
