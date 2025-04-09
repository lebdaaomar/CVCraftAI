import { useState, useEffect } from "react";
import { X, Info, AlertCircle, CheckCircle } from "lucide-react";

interface NotificationProps {
  message: string;
  type?: "info" | "error" | "success";
  duration?: number;
  onClose?: () => void;
  visible: boolean;
}

export default function Notification({ 
  message, 
  type = "info", 
  duration = 3000, 
  onClose,
  visible 
}: NotificationProps) {
  const [isVisible, setIsVisible] = useState(visible);
  
  useEffect(() => {
    setIsVisible(visible);
    
    if (visible) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        if (onClose) onClose();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [visible, duration, onClose]);
  
  if (!isVisible && !visible) return null;
  
  const getBackgroundColor = () => {
    switch (type) {
      case "error": return "bg-red-500";
      case "success": return "bg-green-500";
      default: return "bg-gray-800";
    }
  };
  
  const getIcon = () => {
    switch (type) {
      case "error": return <AlertCircle className="mr-2 h-4 w-4" />;
      case "success": return <CheckCircle className="mr-2 h-4 w-4" />;
      default: return <Info className="mr-2 h-4 w-4" />;
    }
  };
  
  return (
    <div 
      className={`fixed bottom-4 right-4 ${getBackgroundColor()} text-white px-4 py-3 rounded-md shadow-lg flex items-center transform transition-all duration-300 ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
      }`}
    >
      {getIcon()}
      <span>{message}</span>
      <button 
        onClick={() => {
          setIsVisible(false);
          if (onClose) onClose();
        }}
        className="ml-3 text-gray-300 hover:text-white"
      >
        <X size={16} />
      </button>
    </div>
  );
}
