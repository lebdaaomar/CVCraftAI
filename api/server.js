const path = require('path');
const express = require('express');
const { createServer } = require('http');
const fs = require('fs');

// Create Express app
const app = express();
app.use(express.json());

// Directory for uploads - adapt for Vercel environment
let uploadsDir;
if (process.env.VERCEL) {
  // In Vercel, use the /tmp directory which is writable
  uploadsDir = '/tmp';
} else {
  // Local development
  uploadsDir = path.join(__dirname, '../uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
}

// In-memory storage
class MemStorage {
  constructor() {
    this.sessions = new Map();
    this.messages = new Map();
    this.currentId = 1;
  }

  async createSession(data = {}) {
    const sessionId = data.sessionId || `session_${Date.now()}`;
    const session = {
      id: this.currentId++,
      sessionId,
      assistantId: data.assistantId || null,
      threadId: data.threadId || null,
      profession: data.profession || null,
      sections: data.sections || null,
      cvData: data.cvData || null,
      status: data.status || "started",
      completed: data.completed || false
    };
    this.sessions.set(sessionId, session);
    this.messages.set(sessionId, []);
    return sessionId;
  }

  async getSession(sessionId) {
    return this.sessions.get(sessionId);
  }

  async updateSession(sessionId, data) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }
    const updatedSession = {
      ...session,
      ...data
    };
    this.sessions.set(sessionId, updatedSession);
    return true;
  }

  async saveMessage(sessionId, message) {
    const sessionMessages = this.messages.get(sessionId) || [];
    sessionMessages.push(message);
    this.messages.set(sessionId, sessionMessages);
    return true;
  }

  async getSessionMessages(sessionId) {
    return this.messages.get(sessionId) || [];
  }
}

const storage = new MemStorage();

// OpenAI functions
async function createOpenAIClient(apiKey) {
  const { default: OpenAI } = await import('openai');
  return new OpenAI({ apiKey });
}

async function createAssistant(apiKey) {
  try {
    const openai = await createOpenAIClient(apiKey);
    const assistant = await openai.beta.assistants.create({
      name: "CV Builder Assistant",
      instructions: `You are a professional CV building assistant. Your goal is to help users create a high-quality, professional CV.

Follow this conversation flow:
1. First, ask for the user's profession.
2. Based on their profession, suggest relevant CV sections. Ask if they want to keep all sections or add/remove any.
3. Once sections are confirmed, collect information for each section one by one.
4. IMPORTANT: Only ask ONE question at a time. Wait for the user's response to each question before asking the next one. For example:
   - First ask only for their full name, then wait for a response
   - Then ask only for their email address, then wait for a response
   - Then ask only for their phone number, then wait for a response
   - And so on for each piece of information
5. When you've collected all necessary information, organize it into a structured CV format.
6. Call the 'generate_cv' function to create the final CV.

Be conversational, professional, and helpful throughout the process. Remember to format your responses clearly without showing markdown symbols like ** in the output.`,
      model: "gpt-4o",
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      tools: [
        {
          type: "function",
          function: {
            name: "generate_cv",
            description: "Generate a CV based on the collected information",
            parameters: {
              type: "object",
              properties: {
                personalInfo: {
                  type: "object",
                  properties: {
                    fullName: { type: "string", description: "User's full name" },
                    email: { type: "string", description: "User's email address" },
                    phone: { type: "string", description: "User's phone number" },
                    location: { type: "string", description: "User's location" },
                    title: { type: "string", description: "User's professional title" }
                  },
                  required: ["fullName"]
                },
                sections: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string", description: "Section title" },
                      content: {
                        type: "array",
                        description: "Section content - can be strings, objects, or arrays",
                        items: {}
                      }
                    },
                    required: ["title", "content"]
                  }
                }
              },
              required: ["personalInfo", "sections"]
            }
          }
        }
      ]
    });
    return assistant.id;
  } catch (error) {
    console.error("Error creating assistant:", error);
    throw error;
  }
}

async function createThread(apiKey) {
  try {
    const openai = await createOpenAIClient(apiKey);
    const thread = await openai.beta.threads.create({});
    return thread.id;
  } catch (error) {
    console.error("Error creating thread:", error);
    throw error;
  }
}

async function processMessage(apiKey, threadId, assistantId, message) {
  try {
    const openai = await createOpenAIClient(apiKey);
    await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: message
    });
    
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: assistantId
    });
    
    let runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
    
    while (runStatus.status !== "completed" && runStatus.status !== "failed") {
      if (runStatus.status === "requires_action") {
        const toolCalls = runStatus.required_action?.submit_tool_outputs.tool_calls;
        if (toolCalls && toolCalls.length > 0) {
          const toolOutputs = [];
          
          for (const toolCall of toolCalls) {
            if (toolCall.function.name === "generate_cv") {
              const args = JSON.parse(toolCall.function.arguments);
              toolOutputs.push({
                tool_call_id: toolCall.id,
                output: JSON.stringify({ success: true })
              });
              
              return {
                assistantMessage: "I've collected all the information and generated your CV. You can now download it as a PDF.",
                status: "completed",
                cvData: args,
                completed: true
              };
            }
          }
          
          if (toolOutputs.length > 0) {
            await openai.beta.threads.runs.submitToolOutputs(threadId, run.id, {
              tool_outputs: toolOutputs
            });
          }
        }
      }
      
      await new Promise((resolve) => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
    }
    
    if (runStatus.status === "failed") {
      throw new Error("Assistant run failed: " + runStatus.last_error?.message);
    }
    
    const messages = await openai.beta.threads.messages.list(threadId, {
      order: "asc",
      limit: 100
    });
    
    const assistantMessages = messages.data
      .filter((msg) => msg.role === "assistant")
      .map((msg) => 
        msg.content.map((content) => {
          if (content.type === "text") {
            return content.text.value;
          }
          return "";
        }).join("\n")
      )
      .filter((content) => content.trim() !== "");
    
    const assistantMessage = assistantMessages[assistantMessages.length - 1];
    
    let status = null;
    let profession = null;
    let sections = null;
    
    if (/what is your profession|what do you do for a living|what's your profession/i.test(assistantMessage)) {
      status = "collecting_profession";
    }
    
    if (/based on your profession as|for your profession as|as a|profession in/i.test(assistantMessage)) {
      const professionMatch = assistantMessage.match(/profession as a[n]? ([^,.]+)|as a[n]? ([^,.]+)|profession in ([^,.]+)/i);
      if (professionMatch) {
        profession = (professionMatch[1] || professionMatch[2] || professionMatch[3]).trim();
      }
      
      if (/suggest|recommend|include these sections|following sections/i.test(assistantMessage)) {
        status = "selecting_sections";
        const sectionsList = assistantMessage.split(/\n/).filter((line) => /^\s*[-•*]\s+/.test(line));
        if (sectionsList.length > 0) {
          sections = sectionsList.map((section) => section.replace(/^\s*[-•*]\s+/, "").trim());
        }
      }
    }
    
    if (/full name|contact information|work experience|provide details|tell me about|could you share/i.test(assistantMessage)) {
      status = "collecting_details";
    }
    
    if (/review|looks good|summary of|here's what i've|here is what i've|final cv|anything you'd like to change/i.test(assistantMessage)) {
      status = "review";
    }
    
    return {
      assistantMessage,
      status,
      profession,
      sections
    };
  } catch (error) {
    console.error("Error processing message:", error);
    throw error;
  }
}

// PDF generation function
async function generateCVPdf(cvData, outputPath) {
  const { default: PDFDocument } = await import('pdfkit');
  
  return new Promise((resolve, reject) => {
    try {
      const { personalInfo, sections } = cvData;
      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(outputPath);
      
      doc.pipe(stream);
      
      // Header with personal info
      doc.fontSize(24).font("Helvetica-Bold").text(personalInfo.fullName, { align: "center" });
      
      if (personalInfo.title) {
        doc.fontSize(14).font("Helvetica").text(personalInfo.title, { align: "center" });
      }
      
      const contactInfo = [];
      if (personalInfo.email) contactInfo.push(`Email: ${personalInfo.email}`);
      if (personalInfo.phone) contactInfo.push(`Phone: ${personalInfo.phone}`);
      if (personalInfo.location) contactInfo.push(`Location: ${personalInfo.location}`);
      
      if (contactInfo.length > 0) {
        doc.moveDown(0.5);
        doc.fontSize(10).text(contactInfo.join(" | "), { align: "center" });
      }
      
      doc.moveDown(1);
      
      // Sections
      for (const section of sections) {
        doc.fontSize(14).font("Helvetica-Bold").text(section.title);
        doc.moveDown(0.5);
        doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
        doc.moveDown(0.5);
        
        if (typeof section.content === "string") {
          doc.fontSize(10).font("Helvetica").text(section.content);
        } else if (Array.isArray(section.content)) {
          for (const item of section.content) {
            if (typeof item === "string") {
              doc.fontSize(10).font("Helvetica").text(item);
              doc.moveDown(0.5);
            } else if (typeof item === "object") {
              if (item.title) {
                doc.fontSize(12).font("Helvetica-Bold").text(item.title);
              }
              
              if (item.organization && item.period) {
                doc.fontSize(10).font("Helvetica-Oblique").text(`${item.organization} | ${item.period}`);
              } else if (item.organization) {
                doc.fontSize(10).font("Helvetica-Oblique").text(item.organization);
              } else if (item.period) {
                doc.fontSize(10).font("Helvetica-Oblique").text(item.period);
              }
              
              if (item.description) {
                doc.moveDown(0.2);
                doc.fontSize(10).font("Helvetica").text(item.description);
              }
              
              if (item.items && Array.isArray(item.items)) {
                doc.moveDown(0.3);
                for (const bulletItem of item.items) {
                  doc.fontSize(10).font("Helvetica").text(`• ${bulletItem}`, { indent: 10 });
                }
              }
              
              if (item.skills && Array.isArray(item.skills)) {
                doc.moveDown(0.3);
                doc.fontSize(10).font("Helvetica").text(item.skills.join(", "));
              }
              
              doc.moveDown(0.5);
            }
          }
        }
        
        doc.moveDown(1);
      }
      
      doc.end();
      
      stream.on("finish", () => {
        resolve();
      });
      
      stream.on("error", (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
}

// API Routes
// Add a root API route for health check
app.get('/api', (req, res) => {
  res.json({
    status: 'ok',
    message: 'CV Generator API is running',
    version: '1.0.0',
    endpoints: [
      '/api/session',
      '/api/conversation/start',
      '/api/conversation/message',
      '/api/session/:sessionId/messages',
      '/api/generate-pdf'
    ]
  });
});

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
    
    await generateCVPdf(session.cvData, outputPath);
    
    // For Vercel deployments, we need to send the file directly
    if (process.env.VERCEL) {
      // Instead of returning a URL, return the file directly
      const data = fs.readFileSync(outputPath);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(data);
      
      // Clean up the file after sending (for Vercel's ephemeral filesystem)
      fs.unlinkSync(outputPath);
    } else {
      // Local development - return URL as before
      const pdfUrl = `/uploads/${filename}`;
      res.json({ success: true, pdfUrl });
    }
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// Serve static files from dist for the frontend (or from public for Vercel)
try {
  const staticPath = process.env.VERCEL 
    ? path.join(__dirname, '../public') 
    : path.join(__dirname, '../dist');
  
  // Check if the path exists before trying to serve from it
  if (fs.existsSync(staticPath)) {
    app.use(express.static(staticPath));
    console.log(`Serving static files from: ${staticPath}`);
  } else {
    console.warn(`Static path not found: ${staticPath}`);
  }
} catch (err) {
  console.error('Error setting up static file serving:', err);
}

// Serve uploads - adapt for Vercel environment
if (!process.env.VERCEL) {
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
}

// For any other routes, serve the index.html file or fallback to API message
app.get('*', (req, res) => {
  try {
    // In Vercel environment, respond with a simple homepage if static files aren't available
    if (process.env.VERCEL) {
      // Check if this is a request for the root path
      if (req.path === '/') {
        const indexPath = path.join(__dirname, '../public/index.html');
        // Try to send the index.html file
        if (fs.existsSync(indexPath)) {
          return res.sendFile(indexPath);
        } else {
          // Fallback to a simple HTML response
          return res.send(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>CV Generator</title>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                  body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
                  h1 { color: #333; }
                  .container { margin-top: 30px; }
                  .api-key { margin: 20px 0; }
                  input { padding: 10px; width: 100%; max-width: 400px; }
                  button { margin-top: 10px; padding: 10px 20px; background: #4a90e2; color: white; border: none; cursor: pointer; }
                </style>
              </head>
              <body>
                <h1>CV Generator</h1>
                <p>Welcome to the CV Generator application. This app uses OpenAI's API to help you create a professional CV.</p>
                <div class="container">
                  <div class="api-key">
                    <h2>Enter your OpenAI API Key</h2>
                    <p>This application requires your OpenAI API key to function.</p>
                    <input type="text" id="apiKey" placeholder="sk-..." />
                    <button onclick="startApp()">Start CV Generator</button>
                  </div>
                  <div id="status"></div>
                </div>
                <script>
                  async function startApp() {
                    const apiKey = document.getElementById('apiKey').value.trim();
                    if (!apiKey) {
                      document.getElementById('status').innerHTML = '<p style="color: red;">Please enter a valid API key.</p>';
                      return;
                    }
                    
                    document.getElementById('status').innerHTML = '<p>Starting session...</p>';
                    
                    try {
                      // Create a new session
                      const sessionRes = await fetch('/api/session', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' }
                      });
                      
                      if (!sessionRes.ok) throw new Error('Failed to create session');
                      
                      const { sessionId } = await sessionRes.json();
                      
                      // Start the conversation
                      const startRes = await fetch('/api/conversation/start', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ sessionId, apiKey })
                      });
                      
                      if (!startRes.ok) throw new Error('Failed to start conversation');
                      
                      document.getElementById('status').innerHTML = '<p style="color: green;">Session started! The chat interface will appear momentarily...</p>';
                      
                      // Start a simple chat interface
                      document.querySelector('.container').innerHTML = '<div id="chat"><h2>CV Generator Chat</h2><div id="messages"></div><div class="input-area"><input type="text" id="userMessage" placeholder="Type your message..." /><button onclick="sendMessage()">Send</button></div></div>';
                      
                      // Get initial message
                      getMessages(sessionId);
                      
                      // Store session ID and API key for later use
                      window.sessionId = sessionId;
                      window.apiKey = apiKey;
                    } catch (error) {
                      document.getElementById('status').innerHTML = '<p style="color: red;">Error: ' + error.message + '</p>';
                    }
                  }
                  
                  async function sendMessage() {
                    const message = document.getElementById('userMessage').value.trim();
                    if (!message) return;
                    
                    document.getElementById('userMessage').value = '';
                    
                    const messagesDiv = document.getElementById('messages');
                    messagesDiv.innerHTML += '<div style="text-align: right; margin: 10px 0;"><div style="background: #e1f5fe; padding: 10px; border-radius: 10px; display: inline-block; max-width: 80%;">' + message + '</div></div>';
                    
                    try {
                      const res = await fetch('/api/conversation/message', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                          sessionId: window.sessionId, 
                          apiKey: window.apiKey, 
                          message 
                        })
                      });
                      
                      if (!res.ok) throw new Error('Failed to send message');
                      
                      const data = await res.json();
                      getMessages(window.sessionId);
                    } catch (error) {
                      messagesDiv.innerHTML += '<div style="margin: 10px 0;"><div style="background: #ffebee; padding: 10px; border-radius: 10px; display: inline-block; max-width: 80%;">Error: ' + error.message + '</div></div>';
                    }
                  }
                  
                  async function getMessages(sessionId) {
                    try {
                      const res = await fetch('/api/session/' + sessionId + '/messages');
                      if (!res.ok) throw new Error('Failed to get messages');
                      
                      const data = await res.json();
                      const messagesDiv = document.getElementById('messages');
                      messagesDiv.innerHTML = '';
                      
                      data.messages.forEach(msg => {
                        if (msg.role === 'user') {
                          messagesDiv.innerHTML += '<div style="text-align: right; margin: 10px 0;"><div style="background: #e1f5fe; padding: 10px; border-radius: 10px; display: inline-block; max-width: 80%;">' + msg.content + '</div></div>';
                        } else {
                          messagesDiv.innerHTML += '<div style="margin: 10px 0;"><div style="background: #f1f1f1; padding: 10px; border-radius: 10px; display: inline-block; max-width: 80%;">' + msg.content + '</div></div>';
                        }
                      });
                      
                      messagesDiv.scrollTop = messagesDiv.scrollHeight;
                    } catch (error) {
                      console.error('Error getting messages:', error);
                    }
                  }
                </script>
              </body>
            </html>
          `);
        }
      }
    }
    
    // Standard behavior for other environments or paths
    const indexPath = process.env.VERCEL 
      ? path.join(__dirname, '../public/index.html')
      : path.join(__dirname, '../dist/index.html');
    
    res.sendFile(indexPath);
  } catch (err) {
    console.error('Error serving static content:', err);
    res.status(500).json({ error: 'Failed to serve content', details: err.message });
  }
});

// Handle errors
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  
  // Check if this is an API route
  if (req.path.startsWith('/api/')) {
    return res.status(500).json({ 
      error: 'Something went wrong!', 
      details: process.env.NODE_ENV === 'production' ? 'See server logs for details' : err.message,
      path: req.path
    });
  }
  
  // For non-API routes in a Vercel environment, serve the fallback interface
  if (process.env.VERCEL) {
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>CV Generator - Error Recovery</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            h1 { color: #e53e3e; }
            .container { margin-top: 30px; }
            .error-box { background: #fff5f5; border: 1px solid #fed7d7; padding: 15px; border-radius: 5px; }
            .api-key { margin: 20px 0; }
            input { padding: 10px; width: 100%; max-width: 400px; }
            button { margin-top: 10px; padding: 10px 20px; background: #4a90e2; color: white; border: none; cursor: pointer; }
          </style>
        </head>
        <body>
          <h1>CV Generator - Error Recovery Mode</h1>
          <div class="error-box">
            <p>We encountered an error loading the application. This fallback interface will allow you to use the CV Generator.</p>
          </div>
          <div class="container">
            <div class="api-key">
              <h2>Enter your OpenAI API Key</h2>
              <p>This application requires your OpenAI API key to function.</p>
              <input type="text" id="apiKey" placeholder="sk-..." />
              <button onclick="startApp()">Start CV Generator</button>
            </div>
            <div id="status"></div>
          </div>
          <script>
            async function startApp() {
              const apiKey = document.getElementById('apiKey').value.trim();
              if (!apiKey) {
                document.getElementById('status').innerHTML = '<p style="color: red;">Please enter a valid API key.</p>';
                return;
              }
              
              document.getElementById('status').innerHTML = '<p>Starting session...</p>';
              
              try {
                // Create a new session
                const sessionRes = await fetch('/api/session', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' }
                });
                
                if (!sessionRes.ok) throw new Error('Failed to create session');
                
                const { sessionId } = await sessionRes.json();
                
                // Start the conversation
                const startRes = await fetch('/api/conversation/start', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ sessionId, apiKey })
                });
                
                if (!startRes.ok) throw new Error('Failed to start conversation');
                
                document.getElementById('status').innerHTML = '<p style="color: green;">Session started! The chat interface will appear momentarily...</p>';
                
                // Start a simple chat interface
                document.querySelector('.container').innerHTML = '<div id="chat"><h2>CV Generator Chat</h2><div id="messages"></div><div class="input-area"><input type="text" id="userMessage" placeholder="Type your message..." /><button onclick="sendMessage()">Send</button></div></div>';
                
                // Get initial message
                getMessages(sessionId);
                
                // Store session ID and API key for later use
                window.sessionId = sessionId;
                window.apiKey = apiKey;
              } catch (error) {
                document.getElementById('status').innerHTML = '<p style="color: red;">Error: ' + error.message + '</p>';
              }
            }
            
            async function sendMessage() {
              const message = document.getElementById('userMessage').value.trim();
              if (!message) return;
              
              document.getElementById('userMessage').value = '';
              
              const messagesDiv = document.getElementById('messages');
              messagesDiv.innerHTML += '<div style="text-align: right; margin: 10px 0;"><div style="background: #e1f5fe; padding: 10px; border-radius: 10px; display: inline-block; max-width: 80%;">' + message + '</div></div>';
              
              try {
                const res = await fetch('/api/conversation/message', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                    sessionId: window.sessionId, 
                    apiKey: window.apiKey, 
                    message 
                  })
                });
                
                if (!res.ok) throw new Error('Failed to send message');
                
                const data = await res.json();
                getMessages(window.sessionId);
              } catch (error) {
                messagesDiv.innerHTML += '<div style="margin: 10px 0;"><div style="background: #ffebee; padding: 10px; border-radius: 10px; display: inline-block; max-width: 80%;">Error: ' + error.message + '</div></div>';
              }
            }
            
            async function getMessages(sessionId) {
              try {
                const res = await fetch('/api/session/' + sessionId + '/messages');
                if (!res.ok) throw new Error('Failed to get messages');
                
                const data = await res.json();
                const messagesDiv = document.getElementById('messages');
                messagesDiv.innerHTML = '';
                
                data.messages.forEach(msg => {
                  if (msg.role === 'user') {
                    messagesDiv.innerHTML += '<div style="text-align: right; margin: 10px 0;"><div style="background: #e1f5fe; padding: 10px; border-radius: 10px; display: inline-block; max-width: 80%;">' + msg.content + '</div></div>';
                  } else {
                    messagesDiv.innerHTML += '<div style="margin: 10px 0;"><div style="background: #f1f1f1; padding: 10px; border-radius: 10px; display: inline-block; max-width: 80%;">' + msg.content + '</div></div>';
                  }
                });
                
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
              } catch (error) {
                console.error('Error getting messages:', error);
              }
            }
          </script>
        </body>
      </html>
    `);
  }
  
  // Standard error handling for other environments
  res.status(500).send('Server Error. Please try again later.');
});

// Start the server when not running on Vercel
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export the Express app for Vercel serverless deployment
module.exports = app;