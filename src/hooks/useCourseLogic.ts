import { useState } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export const useCourseLogic = () => {
  const [generatingCourse, setGeneratingCourse] = useState(false);
  const [generationLogs, setGenerationLogs] = useState<string[]>([]);
  const [generationProgress, setGenerationProgress] = useState(0);
  const { toast } = useToast();

  const generateCourse = async (topic: string, courseId: string) => {
    setGeneratingCourse(true);
    setGenerationLogs([]);
    setGenerationProgress(0);

    return new Promise((resolve, reject) => {
      api.postStream('/courses/generate', { topic, courseId }, (event, data) => {
        if (event === 'progress') {
          setGenerationProgress(data.percent);
          setGenerationLogs(prev => [...prev, data.message]);
        } else if (event === 'complete') {
          // Delay briefly to show 100%
          setTimeout(() => {
            setGeneratingCourse(false);
            toast({
              title: "Course generated!",
              description: "Your course is ready to explore.",
            });
            resolve(data);
          }, 500);
        } else if (event === 'error') {
          setGeneratingCourse(false);
          toast({
            title: "Error generating course",
            description: data.message || "Please try again later.",
            variant: "destructive",
          });
          reject(new Error(data.message));
        }
      }).catch(err => {
        setGeneratingCourse(false);
        console.error('Stream error:', err);
        toast({
          title: "Connection Error",
          description: "Failed to connect to generation service.",
          variant: "destructive",
        });
        reject(err);
      });
    });
  };

  return {
    generatingCourse,
    generateCourse,
    generationLogs,
    generationProgress
  };
};
