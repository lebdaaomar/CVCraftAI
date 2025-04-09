import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";

interface ProgressIndicatorProps {
  progress: number;
}

export default function ProgressIndicator({ progress }: ProgressIndicatorProps) {
  const steps = [
    { name: "Profession", threshold: 15 },
    { name: "Sections", threshold: 30 },
    { name: "Details", threshold: 60 },
    { name: "Review", threshold: 85 },
    { name: "Complete", threshold: 100 }
  ];

  return (
    <Card className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
      <CardContent className="p-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">CV Creation Progress</h3>
        <Progress value={progress} className="w-full bg-gray-200 dark:bg-gray-700 h-2.5 rounded-full" />
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
          {steps.map((step, index) => (
            <span 
              key={index}
              className={progress >= step.threshold ? "text-primary font-medium" : ""}
            >
              {step.name}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
