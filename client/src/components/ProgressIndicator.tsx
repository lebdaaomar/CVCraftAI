import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { CheckCircle, Circle } from "lucide-react";

interface ProgressIndicatorProps {
  progress: number;
}

export default function ProgressIndicator({ progress }: ProgressIndicatorProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  
  const steps = [
    { name: "Profession", threshold: 15, icon: CheckCircle },
    { name: "Sections", threshold: 30, icon: CheckCircle },
    { name: "Details", threshold: 60, icon: CheckCircle },
    { name: "Review", threshold: 85, icon: CheckCircle },
    { name: "Complete", threshold: 100, icon: CheckCircle }
  ];

  // Animated progress effect
  useEffect(() => {
    const animationDuration = 600; // milliseconds
    const step = progress / (animationDuration / 15); // 15ms per frame
    let currentProgress = animatedProgress;

    const timer = setInterval(() => {
      if (currentProgress < progress) {
        currentProgress = Math.min(currentProgress + step, progress);
        setAnimatedProgress(currentProgress);
      } else if (currentProgress > progress) {
        currentProgress = Math.max(currentProgress - step, progress);
        setAnimatedProgress(currentProgress);
      } else {
        clearInterval(timer);
      }
    }, 15);

    return () => clearInterval(timer);
  }, [progress]);

  return (
    <Card className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border-0">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm md:text-base font-semibold text-gray-800 dark:text-gray-200">CV Creation Progress</h3>
          <span className="text-sm font-medium text-primary">{Math.round(animatedProgress)}%</span>
        </div>
        
        <div className="relative w-full h-2.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden transition-all duration-300">
          <div 
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-300 ease-out"
            style={{ width: `${animatedProgress}%` }}
          />
        </div>
        
        <div className="grid grid-cols-5 gap-2 mt-4">
          {steps.map((step, index) => {
            const isActive = progress >= step.threshold;
            const isCurrentStep = index > 0 
              ? progress >= steps[index-1].threshold && progress < step.threshold
              : progress < step.threshold;
              
            return (
              <div 
                key={index} 
                className="flex flex-col items-center"
              >
                <div className={`
                  flex items-center justify-center w-8 h-8 rounded-full mb-1
                  ${isActive 
                    ? 'bg-primary/10 text-primary' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'}
                  transition-all duration-300 ease-in-out
                `}>
                  {isActive ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <Circle className="w-5 h-5" />
                  )}
                </div>
                <span 
                  className={`
                    text-xs text-center
                    ${isActive 
                      ? 'text-primary font-medium' 
                      : 'text-gray-500 dark:text-gray-400'}
                    ${isCurrentStep ? 'animate-pulse' : ''}
                    transition-all duration-300
                  `}
                >
                  {step.name}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
