import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, EyeOff, ExternalLink } from "lucide-react";

interface ApiKeyInputProps {
  onSubmit: (apiKey: string) => void;
  isPending: boolean;
}

export default function ApiKeyInput({ onSubmit, isPending }: ApiKeyInputProps) {
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValidApiKey(apiKey)) {
      onSubmit(apiKey);
    }
  };
  
  const isValidApiKey = (key: string): boolean => {
    return key.trim().startsWith("sk-");
  };
  
  const toggleApiKeyVisibility = () => {
    setShowApiKey(!showApiKey);
  };
  
  return (
    <Card className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
      <CardContent className="p-4 md:p-6">
        <h2 className="text-lg font-semibold mb-3">Enter Your OpenAI API Key</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Your API key is required to use the CV builder assistant. It will be used client-side only and never stored on our servers.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-grow">
              <Input
                type={showApiKey ? "text" : "password"}
                id="apiKey"
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 h-5 w-5"
                onClick={toggleApiKeyVisibility}
              >
                {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </Button>
            </div>
            <Button 
              type="submit" 
              className="px-4 py-2 bg-primary hover:bg-blue-600 text-white rounded-md font-medium transition-all"
              disabled={!isValidApiKey(apiKey) || isPending}
            >
              {isPending ? "Starting..." : "Start Conversation"}
            </Button>
          </div>
        </form>
        <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          <a 
            href="https://platform.openai.com/api-keys" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-primary hover:underline flex items-center"
          >
            <ExternalLink size={12} className="mr-1" />
            Get your API key from OpenAI
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
