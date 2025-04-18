import { useState, useEffect } from "react";
import ApiKeyInput from "@/components/ApiKeyInput";
import ChatInterface from "@/components/ChatInterface";
import ProgressIndicator from "@/components/ProgressIndicator";
import CVPreview from "@/components/CVPreview";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Notification from "@/components/Notification";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { generatePdf } from "@/lib/openai";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CVData } from "@shared/schema";

type NotificationType = 'info' | 'error' | 'success';

interface NotificationState {
  message: string;
  type: NotificationType;
  visible: boolean;
}

export default function Home() {
  const [apiKey, setApiKey] = useState<string>("");
  const [sessionId, setSessionId] = useState<string>("");
  const [conversationStarted, setConversationStarted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [cvData, setCvData] = useState<CVData | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const { toast } = useToast();

  // Initialize session when component mounts
  useEffect(() => {
    const initSession = async () => {
      try {
        const response = await apiRequest("POST", "/api/session", {});
        const data = await response.json();
        setSessionId(data.sessionId);
      } catch (error) {
        console.error("Failed to initialize session:", error);
        toast({
          title: "Error",
          description: "Failed to initialize session. Please try again.",
          variant: "destructive",
        });
      }
    };

    initSession();
  }, []);

  // Get session data
  const { data: sessionData, refetch: refetchSession } = useQuery<{
    status?: string;
    cvData?: CVData;
    completed?: boolean;
  }>({
    queryKey: ["/api/session", sessionId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/session?sessionId=${sessionId}`, undefined);
      return response.json();
    },
    enabled: !!sessionId && conversationStarted,
  });

  // Start conversation mutation
  const startConversationMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/session/${sessionId}/start`, {
        apiKey
      });
      return response.json();
    },
    onSuccess: (data) => {
      setConversationStarted(true);
      setProgress(15);
      toast({
        title: "Success",
        description: "Conversation started successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start conversation. Please check your API key.",
        variant: "destructive",
      });
    },
  });

  // Generate PDF mutation
  const generatePdfMutation = useMutation({
    mutationFn: async () => {
      // Use the updated openai helper function that handles both local and Vercel deployments
      return await generatePdf(sessionId);
    },
    onSuccess: (data) => {
      setPdfUrl(data.pdfUrl);
      toast({
        title: "Success",
        description: "CV PDF generated successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update progress based on session status
  useEffect(() => {
    if (sessionData?.status) {
      if (sessionData.status === "collecting_profession") {
        setProgress(15);
      } else if (sessionData.status === "selecting_sections") {
        setProgress(30);
      } else if (sessionData.status === "collecting_details") {
        setProgress(60);
      } else if (sessionData.status === "review") {
        setProgress(85);
        if (sessionData.cvData && typeof sessionData.cvData === 'object') {
          setCvData(sessionData.cvData as CVData);
        }
      } else if (sessionData.status === "completed") {
        setProgress(100);
        if (sessionData.cvData && typeof sessionData.cvData === 'object') {
          setCvData(sessionData.cvData as CVData);
        }
        if (!pdfUrl) {
          generatePdfMutation.mutate();
        }
      }
    }
  }, [sessionData, pdfUrl, generatePdfMutation]);

  const handleApiKeySubmit = (key: string) => {
    setApiKey(key);
    startConversationMutation.mutate();
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 md:px-6 py-6">
        {!conversationStarted ? (
          <ApiKeyInput onSubmit={handleApiKeySubmit} isPending={startConversationMutation.isPending} />
        ) : (
          <>
            <ProgressIndicator progress={progress} />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <ChatInterface 
                  sessionId={sessionId} 
                  apiKey={apiKey} 
                  onProgressUpdate={(newProgress) => {
                    if (newProgress > progress) {
                      setProgress(newProgress);
                    }
                  }}
                  onCVDataUpdate={(data) => {
                    setCvData(data);
                    refetchSession();
                  }}
                />
              </div>
              
              {cvData && (
                <div className="lg:col-span-1">
                  <CVPreview 
                    cvData={cvData} 
                    pdfUrl={pdfUrl} 
                    isGenerating={generatePdfMutation.isPending}
                    onGeneratePdf={() => generatePdfMutation.mutate()}
                  />
                </div>
              )}
            </div>
          </>
        )}
      </main>
      
      <Footer />
    </div>
  );
}
