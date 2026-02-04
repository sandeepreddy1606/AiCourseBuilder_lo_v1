import { useState } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export type CourseStatus = 'idle' | 'planning' | 'reviewing' | 'executing' | 'complete' | 'error';

export const useCourseLogic = () => {
  const [status, setStatus] = useState<CourseStatus>('idle');
  const [coursePlan, setCoursePlan] = useState<any | null>(null);
  const [generationLogs, setGenerationLogs] = useState<string[]>([]);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [tokenUsage, setTokenUsage] = useState<{ totalTokens: number; model: string } | null>(null);
  const { toast } = useToast();

  const planCourse = async (topic: string, courseId: string) => {
    setStatus('planning');
    setCoursePlan(null);

    try {
      const response = await api.post('/courses/plan', { topic, courseId });
      setCoursePlan(response.plan);
      setStatus('reviewing');
      return response.plan;
    } catch (error: any) {
      setStatus('error');
      toast({
        title: "Planning Failed",
        description: error.message || "Could not generate curriculum plan.",
        variant: "destructive"
      });
      throw error;
    }
  };

  const executeCourse = async (courseId: string, topic: string) => {
    if (!coursePlan) return;

    setStatus('executing');
    setGenerationLogs([]);
    setGenerationProgress(0);
    setTokenUsage(null);

    return new Promise((resolve, reject) => {
      api.postStream(`/courses/${courseId}/execute`, { plan: coursePlan, topic, courseId }, (event, data) => {
        if (event === 'progress') {
          setGenerationProgress(data.percent);
          if (data.message) setGenerationLogs(prev => [...prev, data.message]);
        } else if (event === 'usage') {
          setTokenUsage(data);
        } else if (event === 'complete') {
          setTimeout(() => {
            setStatus('complete');
            toast({
              title: "Course generated!",
              description: "Your course is ready to explore.",
            });
            resolve(data);
          }, 500);
        } else if (event === 'error') {
          setStatus('error');
          toast({
            title: "Error generating course",
            description: data.message || "Please try again later.",
            variant: "destructive",
          });
          reject(new Error(data.message));
        }
      }).catch(err => {
        setStatus('error');
        console.error('Stream error:', err);
        reject(err);
      });
    });
  };

  const resetStatus = () => {
    setStatus('idle');
    setCoursePlan(null);
    setGenerationLogs([]);
    setGenerationProgress(0);
  };

  return {
    status,
    coursePlan,
    planCourse,
    executeCourse,
    resetStatus,
    generationLogs,
    generationProgress,
    tokenUsage
  };
};
