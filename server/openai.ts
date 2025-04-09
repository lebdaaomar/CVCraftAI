import OpenAI from "openai";

// Helper function to create an OpenAI client
function createOpenAIClient(apiKey: string) {
  return new OpenAI({ apiKey });
}

// Create a new assistant
export async function createAssistant(apiKey: string) {
  try {
    const openai = createOpenAIClient(apiKey);
    
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
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
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
    
    return assistant;
  } catch (error) {
    console.error("Error creating assistant:", error);
    throw error;
  }
}

// Create a new thread
export async function createThread(apiKey: string) {
  try {
    const openai = createOpenAIClient(apiKey);
    
    const thread = await openai.beta.threads.create({});
    
    return thread;
  } catch (error) {
    console.error("Error creating thread:", error);
    throw error;
  }
}

// Process a message
export async function processMessage(
  apiKey: string, 
  assistantId: string, 
  threadId: string, 
  message: string
) {
  try {
    const openai = createOpenAIClient(apiKey);
    
    // Add the message to the thread
    await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: message
    });
    
    // Run the assistant
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: assistantId
    });
    
    // Wait for the run to complete
    let runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
    
    while (runStatus.status !== "completed" && runStatus.status !== "failed") {
      // Check if the run requires action (function calling)
      if (runStatus.status === "requires_action") {
        const toolCalls = runStatus.required_action?.submit_tool_outputs.tool_calls;
        
        if (toolCalls && toolCalls.length > 0) {
          const toolOutputs = [];
          
          for (const toolCall of toolCalls) {
            if (toolCall.function.name === "generate_cv") {
              // Parse the function arguments
              const args = JSON.parse(toolCall.function.arguments);
              
              // Return the CV data as the function output
              toolOutputs.push({
                tool_call_id: toolCall.id,
                output: JSON.stringify({ success: true })
              });
              
              // Return the CV data to update the session
              return {
                assistantMessage: "I've collected all the information and generated your CV. You can now download it as a PDF.",
                status: "completed",
                cvData: args
              };
            }
          }
          
          // Submit the tool outputs
          if (toolOutputs.length > 0) {
            await openai.beta.threads.runs.submitToolOutputs(threadId, run.id, {
              tool_outputs: toolOutputs
            });
          }
        }
      }
      
      // Wait a bit before checking the status again
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update the run status
      runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
    }
    
    if (runStatus.status === "failed") {
      throw new Error("Assistant run failed: " + runStatus.last_error?.message);
    }
    
    // Get the latest messages
    const messages = await openai.beta.threads.messages.list(threadId, {
      order: "asc",
      limit: 100
    });
    
    // Get the assistant's last message
    const assistantMessages = messages.data
      .filter(msg => msg.role === "assistant")
      .map(msg => msg.content.map(content => {
        if (content.type === "text") {
          return content.text.value;
        }
        return "";
      }).join("\n"))
      .filter(content => content.trim() !== "");
    
    const assistantMessage = assistantMessages[assistantMessages.length - 1];
    
    // Determine the conversation stage based on the assistant's message
    let status = null;
    let profession = null;
    let sections = null;
    
    // Check if asking about profession
    if (/what is your profession|what do you do for a living|what's your profession/i.test(assistantMessage)) {
      status = "collecting_profession";
    }
    
    // Check if the user has provided their profession
    if (/based on your profession as|for your profession as|as a|profession in/i.test(assistantMessage)) {
      // Extract the profession
      const professionMatch = assistantMessage.match(/profession as a[n]? ([^,.]+)|as a[n]? ([^,.]+)|profession in ([^,.]+)/i);
      if (professionMatch) {
        profession = (professionMatch[1] || professionMatch[2] || professionMatch[3]).trim();
      }
      
      // Check if suggesting sections
      if (/suggest|recommend|include these sections|following sections/i.test(assistantMessage)) {
        status = "selecting_sections";
        
        // Try to extract suggested sections
        const sectionsList = assistantMessage.split(/\n/).filter(line => /^\s*[-•*]\s+/.test(line));
        if (sectionsList.length > 0) {
          sections = sectionsList.map(section => section.replace(/^\s*[-•*]\s+/, '').trim());
        }
      }
    }
    
    // Check if collecting detailed information
    if (/full name|contact information|work experience|provide details|tell me about|could you share/i.test(assistantMessage)) {
      status = "collecting_details";
    }
    
    // Check if in review stage
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
