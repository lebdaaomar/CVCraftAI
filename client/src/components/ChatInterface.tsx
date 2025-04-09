import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Bot, User, Send } from "lucide-react";
import { CVData } from "@shared/schema";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatInterfaceProps {
  sessionId: string;
  apiKey: string;
  onProgressUpdate: (progress: number) => void;
  onCVDataUpdate: (data: CVData) => void;
}

export default function ChatInterface({ 
  sessionId, 
  apiKey,
  onProgressUpdate,
  onCVDataUpdate
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  // Get initial messages
  const { data: initialMessages, isLoading: isLoadingMessages } = useQuery({
    queryKey: ["/api/conversation/messages", sessionId],
    enabled: !!sessionId,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest("POST", "/api/conversation/message", {
        sessionId,
        apiKey,
        message
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.messages) {
        setMessages((prev) => [
          ...prev, 
          ...data.messages.map((msg: any) => ({
            role: msg.role,
            content: msg.content,
            timestamp: new Date()
          }))
        ]);
      }
      
      if (data.status) {
        if (data.status === "selecting_sections") {
          onProgressUpdate(30);
        } else if (data.status === "collecting_details") {
          onProgressUpdate(60);
        } else if (data.status === "review") {
          onProgressUpdate(85);
          if (data.cvData) {
            onCVDataUpdate(data.cvData);
          }
        } else if (data.status === "completed") {
          onProgressUpdate(100);
          if (data.cvData) {
            onCVDataUpdate(data.cvData);
          }
        }
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Initialize messages when component mounts
  useEffect(() => {
    if (initialMessages && initialMessages.messages) {
      setMessages(initialMessages.messages.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.timestamp || Date.now())
      })));
    } else if (!isLoadingMessages && !initialMessages?.messages?.length) {
      // Add default welcome message if no messages exist
      setMessages([{
        role: "assistant",
        content: "Hello! I'm your CV builder assistant. Let's create a professional CV together. What is your profession?",
        timestamp: new Date()
      }]);
    }
  }, [initialMessages, isLoadingMessages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) return;
    
    // Add user message immediately to the UI
    const userMessage: ChatMessage = {
      role: "user",
      content: messageInput,
      timestamp: new Date()
    };
    
    setMessages((prev) => [...prev, userMessage]);
    sendMessageMutation.mutate(messageInput);
    setMessageInput("");
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Card className="flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow-sm h-[calc(100vh-280px)] min-h-[400px]">
      {/* Chat Messages Container */}
      <div 
        ref={chatContainerRef}
        className="flex-grow p-4 overflow-y-auto chat-scrollbar"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#ccc #f1f1f1'
        }}
      >
        {messages.map((message, index) => (
          <div 
            key={index} 
            className={`flex mb-4 ${message.role === 'user' ? 'justify-end' : ''}`}
          >
            {message.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-primary flex-shrink-0 flex items-center justify-center text-white">
                <Bot size={16} />
              </div>
            )}
            
            <div className={`${message.role === 'user' ? 'mr-3' : 'ml-3'} max-w-[80%]`}>
              <div className={`${
                message.role === 'user' 
                  ? 'bg-primary text-white' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
              } p-3 rounded-lg`}>
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
              <span className={`text-xs text-gray-500 mt-1 ${message.role === 'user' ? 'block text-right' : ''}`}>
                {formatTime(message.timestamp)}
              </span>
            </div>
            
            {message.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex-shrink-0 flex items-center justify-center">
                <User size={16} className="text-gray-600 dark:text-gray-300" />
              </div>
            )}
          </div>
        ))}
        
        {/* Loading Indicator */}
        {sendMessageMutation.isPending && (
          <div className="flex mb-4">
            <div className="w-8 h-8 rounded-full bg-primary flex-shrink-0 flex items-center justify-center text-white">
              <Bot size={16} />
            </div>
            <div className="ml-3 max-w-[80%]">
              <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg flex items-center">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Message Input */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-3">
        <form onSubmit={handleSubmit} className="flex items-center">
          <Input
            type="text"
            id="userMessage"
            placeholder="Type your message..."
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            disabled={sendMessageMutation.isPending}
            className="flex-grow px-3 py-2 mr-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700"
          />
          <Button 
            type="submit" 
            disabled={sendMessageMutation.isPending || !messageInput.trim()}
            className="p-2 bg-primary hover:bg-blue-600 text-white rounded-md transition-all"
          >
            <Send size={16} />
          </Button>
        </form>
      </div>
    </Card>
  );
}
