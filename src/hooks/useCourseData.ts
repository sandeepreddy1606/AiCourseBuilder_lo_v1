import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Course, Lesson } from '@/types/course';
import { useToast } from '@/hooks/use-toast';

export const useCourseData = (userId: string | undefined) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [currentCourse, setCurrentCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Fetch all courses for the user
  const fetchCourses = async () => {
    if (!userId) {
      // Check local storage if userId not passed implicitly? 
      // But assuming the caller passes it from AuthContext or similar.
      // Actually, with the new backend, api.get('/courses') uses the token.
      // So we don't strictly *need* userId param to fetch courses, 
      // but we need to know if user is logged in.
      // We'll proceed if we have a token.
      const token = localStorage.getItem('token');
      if (!token) return;
    }

    try {
      // Replaced Supabase select with API call
      const data = await api.get('/courses');
      // Backend returns array of courses
      setCourses(data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast({
        title: "Error loading courses",
        description: "Please try again later.",
        variant: "destructive",
      });
    }
  };

  // Fetch lessons for a specific course
  const fetchLessons = async (courseId: string) => {
    try {
      setLoading(true);
      // Replaced Supabase select with API call
      // The backend route is GET /courses/:id/lessons? No, I defined GET /courses/:id/lessons
      const data = await api.get(`/courses/${courseId}/lessons`);

      // Transform the data to match our Lesson type if needed
      // Backend returns fields as in DB.
      // DB has 'quiz_data' JSONB. 
      // Frontend expects 'quiz_data'.
      // DB has 'videos' JSONB.
      // Frontend expects 'videos'.

      const transformedLessons: Lesson[] = (data || []).map((lesson: any) => ({
        ...lesson,
        videos: lesson.videos || [],
        quiz_data: lesson.quiz_data || null,
      }));

      setLessons(transformedLessons);
    } catch (error) {
      console.error('Error fetching lessons:', error);
      toast({
        title: "Error loading lessons",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Create a new course
  const createCourse = async (topic: string): Promise<string | null> => {
    try {
      const data = await api.post('/courses', {
        title: topic, // Assuming title is the topic for now, or we can change backend to accept topic separate
        topic: topic,
        description: `Course about ${topic}`
      });

      if (data) {
        setCourses(prev => [data, ...prev]);
        setCurrentCourse(data);
        return data.id;
      }
      return null;
    } catch (error) {
      console.error('Error creating course:', error);
      toast({
        title: "Error creating course",
        description: "Please try again later.",
        variant: "destructive",
      });
      return null;
    }
  };

  // Update lesson completion and quiz score
  const updateLessonProgress = async (
    lessonId: string,
    isCompleted: boolean,
    quizScore?: number
  ) => {
    try {
      const updates: any = { is_completed: isCompleted };
      if (quizScore !== undefined) {
        updates.quiz_score = quizScore;
      }

      const updatedLesson = await api.put(`/lessons/${lessonId}`, updates);

      // Update local state
      setLessons(prev =>
        prev.map(lesson =>
          lesson.id === lessonId ? { ...lesson, ...updates } : lesson
        )
      );

      // Recalculate course completion
      if (currentCourse) {
        await updateCourseCompletion(currentCourse.id);
      }
    } catch (error) {
      console.error('Error updating lesson:', error);
      toast({
        title: "Error updating progress",
        description: "Please try again later.",
        variant: "destructive",
      });
    }
  };

  // Update course completion percentage
  const updateCourseCompletion = async (courseId: string) => {
    try {
      // Calculate completion locally or ask backend?
      // Backend doesn't have an endpoint to just calc completion yet.
      // We can fetch lessons again or just calc locally.
      // Or we can assume backend does it? 
      // Let's implement local calc + update course endpoint (PUT /courses/:id is not fully impl in controller update, only create/get/delete)
      // Wait, 'courses' table has 'completion_percentage'.
      // We'll skip updating the backend course percentage for now unless we add an endpoint for it.
      // Or we can rely on frontend state.
      // Let's at least update local state.

      const completed = lessons.filter(l => l.is_completed).length;
      const total = lessons.length;
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

      // Update local state is tricky if we don't have the full course list or currentCourse referential stability.
      if (currentCourse && currentCourse.id === courseId) {
        setCurrentCourse({ ...currentCourse, completion_percentage: percentage });
      }

    } catch (error) {
      console.error('Error updating course completion:', error);
    }
  };

  // Save generated lessons to database
  const saveLessons = async (courseId: string, lessonsData: any[]) => {
    try {
      // API expects { courseId } in params, and body as array
      await api.post(`/courses/${courseId}/lessons`, lessonsData);
      await fetchLessons(courseId);
    } catch (error) {
      console.error('Error saving lessons:', error);
      throw error;
    }
  };

  // Delete a course and its lessons
  const deleteCourse = async (courseId: string) => {
    try {
      await api.delete(`/courses/${courseId}`);

      setCourses(prev => prev.filter(course => course.id !== courseId));
      if (currentCourse?.id === courseId) {
        setCurrentCourse(null);
      }

      toast({
        title: "Course deleted",
        description: "The course has been successfully deleted.",
      });
    } catch (error) {
      console.error('Error deleting course:', error);
      toast({
        title: "Error deleting course",
        description: "Please try again later.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    // Check if token exists instead of userId strictly
    // Or stick to userId logic if App.tsx passes it only when logged in
    if (localStorage.getItem('token')) {
      fetchCourses();
    }
  }, [userId]);

  return {
    courses,
    currentCourse,
    setCurrentCourse,
    lessons,
    loading,
    fetchCourses,
    fetchLessons,
    createCourse,
    updateLessonProgress,
    saveLessons,
    deleteCourse,
  };
};
