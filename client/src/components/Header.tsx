import DarkModeToggle from "./DarkModeToggle";
import { FileText } from "lucide-react";

export default function Header() {
  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm py-3">
      <div className="container mx-auto px-4 md:px-6 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <FileText className="text-primary text-xl" />
          <h1 className="text-xl font-bold">CV Builder Assistant</h1>
        </div>
        
        <DarkModeToggle />
      </div>
    </header>
  );
}
