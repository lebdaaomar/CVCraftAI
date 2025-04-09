import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function DarkModeToggle() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const { toast } = useToast();
  
  useEffect(() => {
    // Check system preference or localStorage
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    
    if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
    }
  }, []);
  
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    
    if (isDarkMode) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      toast({
        description: "Light mode enabled",
      });
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      toast({
        description: "Dark mode enabled",
      });
    }
  };
  
  return (
    <Button 
      onClick={toggleDarkMode}
      variant="ghost" 
      size="icon" 
      className="p-2 rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
    >
      {isDarkMode ? (
        <Moon className="h-5 w-5" />
      ) : (
        <Sun className="h-5 w-5" />
      )}
    </Button>
  );
}
