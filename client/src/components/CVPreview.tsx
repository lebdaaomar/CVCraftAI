import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { CVData } from "@shared/schema";
import { useEffect } from "react";

interface CVPreviewProps {
  cvData: CVData;
  pdfUrl: string | null;
  isGenerating: boolean;
  onGeneratePdf: () => void;
}

export default function CVPreview({ 
  cvData, 
  pdfUrl, 
  isGenerating, 
  onGeneratePdf 
}: CVPreviewProps) {
  const { personalInfo, sections } = cvData;

  // Automatically generate PDF if not generated yet
  useEffect(() => {
    if (!pdfUrl && !isGenerating) {
      onGeneratePdf();
    }
  }, [pdfUrl, isGenerating, onGeneratePdf]);

  const handleDownload = () => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    } else {
      onGeneratePdf();
    }
  };

  return (
    <Card className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
      <CardContent className="p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
          <h2 className="text-lg font-semibold">CV Preview</h2>
          <Button 
            onClick={handleDownload}
            disabled={isGenerating && !pdfUrl}
            className="w-full sm:w-auto px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium transition-all flex items-center justify-center shadow-md"
            variant="default"
            size="lg"
          >
            <Download className="mr-2 h-5 w-5" />
            {isGenerating && !pdfUrl ? "Generating PDF..." : "Download PDF"}
          </Button>
        </div>
        
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
          <div className="max-w-3xl mx-auto">
            {/* Personal Information */}
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold">{personalInfo.fullName}</h1>
              {personalInfo.title && (
                <p className="text-gray-600 dark:text-gray-400">{personalInfo.title}</p>
              )}
              <div className="flex flex-wrap justify-center gap-4 mt-2 text-sm">
                {personalInfo.email && (
                  <span>
                    <i className="fas fa-envelope mr-1"></i> {personalInfo.email}
                  </span>
                )}
                {personalInfo.phone && (
                  <span>
                    <i className="fas fa-phone mr-1"></i> {personalInfo.phone}
                  </span>
                )}
                {personalInfo.location && (
                  <span>
                    <i className="fas fa-map-marker-alt mr-1"></i> {personalInfo.location}
                  </span>
                )}
              </div>
            </div>
            
            {/* CV Sections */}
            {sections.map((section, index) => (
              <div key={index} className="mb-4">
                <h2 className="text-lg font-bold border-b border-gray-300 dark:border-gray-600 pb-1 mb-2">
                  {section.title}
                </h2>
                
                {typeof section.content === 'string' && (
                  <p className="text-sm whitespace-pre-wrap">{section.content}</p>
                )}
                
                {Array.isArray(section.content) && section.content.map((item: any, itemIndex: number) => (
                  <div key={itemIndex} className="mb-3">
                    {item.title && item.period && (
                      <div className="flex justify-between text-sm">
                        <strong>{item.title}{item.organization ? `, ${item.organization}` : ''}</strong>
                        <span>{item.period}</span>
                      </div>
                    )}
                    
                    {item.description && (
                      <p className="text-sm mt-1">{item.description}</p>
                    )}
                    
                    {item.items && (
                      <ul className="list-disc list-inside text-sm pl-2 mt-1">
                        {item.items.map((listItem: string, listItemIndex: number) => (
                          <li key={listItemIndex}>{listItem}</li>
                        ))}
                      </ul>
                    )}
                    
                    {item.skills && (
                      <div className="flex flex-wrap gap-2 text-sm">
                        {item.skills.map((skill: string, skillIndex: number) => (
                          <span key={skillIndex} className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
