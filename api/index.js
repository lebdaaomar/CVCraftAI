const path = require('path');
const express = require('express');
const { createServer } = require('http');
const fs = require('fs');
const { storage } = require('../server/storage');

// Create the Express app
const app = express();
const server = createServer(app);

// Middleware
app.use(express.json());

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve static files from the 'dist' directory
app.use(express.static(path.join(__dirname, '../dist')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes
app.post('/api/session', async (req, res) => {
  try {
    const sessionId = await storage.createSession({});
    res.json({ sessionId });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

app.post('/api/conversation/start', async (req, res) => {
  try {
    const { sessionId, apiKey } = req.body;
    if (!sessionId || !apiKey) {
      return res.status(400).json({ error: 'Session ID and API key are required' });
    }
    
    // Import at runtime to avoid top-level await
    const { createAssistant, createThread } = require('../server/openai');
    
    const assistantId = await createAssistant(apiKey);
    const threadId = await createThread(apiKey);
    
    await storage.updateSession(sessionId, { 
      assistantId, 
      threadId,
      status: 'started'
    });
    
    res.json({ success: true, assistantId, threadId });
  } catch (error) {
    console.error('Error starting conversation:', error);
    res.status(500).json({ error: 'Failed to start conversation' });
  }
});

app.post('/api/conversation/message', async (req, res) => {
  try {
    const { sessionId, apiKey, message } = req.body;
    if (!sessionId || !apiKey || !message) {
      return res.status(400).json({ error: 'Session ID, API key, and message are required' });
    }
    
    const session = await storage.getSession(sessionId);
    if (!session || !session.threadId || !session.assistantId) {
      return res.status(404).json({ error: 'Session not found or not initialized' });
    }
    
    // Save user message
    await storage.saveMessage(sessionId, {
      role: 'user',
      content: message,
      timestamp: new Date()
    });
    
    // Import at runtime to avoid top-level await
    const { processMessage } = require('../server/openai');
    
    const response = await processMessage(apiKey, session.threadId, session.assistantId, message);
    
    // Check for CV data in the response
    if (response.cvData) {
      await storage.updateSession(sessionId, { 
        cvData: response.cvData,
        status: 'collecting',
        completed: response.completed || false
      });
    }
    
    // Save assistant message
    if (response.assistantMessage) {
      await storage.saveMessage(sessionId, {
        role: 'assistant',
        content: response.assistantMessage,
        timestamp: new Date()
      });
    }
    
    // Get all messages
    const messages = await storage.getSessionMessages(sessionId);
    const formattedMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp.toISOString()
    }));
    
    res.json({ 
      messages: formattedMessages,
      status: session.status,
      cvData: response.cvData,
      completed: response.completed || false
    });
  } catch (error) {
    console.error('Error processing message:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

app.get('/api/session/:sessionId/messages', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const messages = await storage.getSessionMessages(sessionId);
    
    const formattedMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp.toISOString()
    }));
    
    res.json({ messages: formattedMessages });
  } catch (error) {
    console.error('Error retrieving messages:', error);
    res.status(500).json({ error: 'Failed to retrieve messages' });
  }
});

app.post('/api/generate-pdf', async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }
    
    const session = await storage.getSession(sessionId);
    if (!session || !session.cvData) {
      return res.status(404).json({ error: 'Session not found or CV data not available' });
    }
    
    // Generate a unique filename for the PDF
    const filename = `cv_${sessionId}_${Date.now()}.pdf`;
    const outputPath = path.join(uploadsDir, filename);
    
    // Import at runtime to avoid top-level await
    const { generateCVPdf } = require('../server/pdf');
    
    await generateCVPdf(session.cvData, outputPath);
    
    const pdfUrl = `/uploads/${filename}`;
    res.json({ success: true, pdfUrl });
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// For all other routes, serve the index.html file
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Handle errors
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start the server when not running on Vercel
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export for Vercel serverless deployment
module.exports = app;