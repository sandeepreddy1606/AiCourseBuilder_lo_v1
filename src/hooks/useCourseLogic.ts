import { useState } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export const useCourseLogic = () => {
  const [generatingCourse, setGeneratingCourse] = useState(false);
  const { toast } = useToast();

  const generateCourse = async (topic: string, courseId: string) => {
    setGeneratingCourse(true);
    try {
      const data = await api.post('/courses/generate', {
        topic,
        courseId
      });

      toast({
        title: "Course generated!",
        description: "Your course is ready to explore.",
      });

      return data;
    } catch (error: any) {
      console.error('Error generating course:', error);
      toast({
        title: "Error generating course",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setGeneratingCourse(false);
    }
  };

  return {
    generatingCourse,
    generateCourse,
  };
};
