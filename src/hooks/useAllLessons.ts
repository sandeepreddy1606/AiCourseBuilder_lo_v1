import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Lesson } from '@/types/course';

export const useAllLessons = (courseIds: string[]) => {
  const [lessonsMap, setLessonsMap] = useState<Map<string, Lesson[]>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllLessons = async () => {
      if (courseIds.length === 0) {
        setLessonsMap(new Map());
        setLoading(false);
        return;
      }

      try {
        const promises = courseIds.map(id => api.get(`/courses/${id}/lessons`));
        const results = await Promise.all(promises);

        const map = new Map<string, Lesson[]>();

        results.forEach((data, index) => {
          const courseId = courseIds[index];
          const courseLessons = (data || []).map((lesson: any) => ({
            ...lesson,
            videos: lesson.videos || [],
            quiz_data: lesson.quiz_data || null,
          }));
          map.set(courseId, courseLessons);
        });

        setLessonsMap(map);
      } catch (error) {
        console.error('Error fetching lessons:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllLessons();
  }, [JSON.stringify(courseIds)]);

  return { lessonsMap, loading };
};
