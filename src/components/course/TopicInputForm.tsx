import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Sparkles } from 'lucide-react';

interface TopicInputFormProps {
  onSubmit: (topic: string, difficulty: string) => void;
  loading: boolean;
}

export const TopicInputForm = ({ onSubmit, loading }: TopicInputFormProps) => {
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('Beginner');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (topic.trim()) {
      onSubmit(topic.trim(), difficulty);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-4 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 backdrop-blur-sm">
              <Sparkles className="w-12 h-12 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-pulse">
            AI Course Builder
          </h1>
          <p className="text-xl text-muted-foreground max-w-lg mx-auto">
            Enter any topic and watch as AI instantly creates a complete structured mini-course with videos, notes, and quizzes
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative space-y-4">
            <Input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Machine Learning Basics, Python for Beginners, Web Development..."
              className="h-14 text-lg pr-4 bg-card/50 backdrop-blur-sm border-primary/20 focus:border-primary transition-all"
              disabled={loading}
            />

            <div className="flex gap-4">
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                disabled={loading}
                className="h-14 px-4 rounded-md border border-primary/20 bg-card/50 backdrop-blur-sm focus:border-primary transition-all min-w-[150px]"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={!topic.trim() || loading}
            className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-all shadow-lg hover:shadow-primary/50"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Generating Your Course...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-5 w-5" />
                Generate Course
              </>
            )}
          </Button>
        </form>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-8">
          <div className="p-4 rounded-lg bg-card/30 backdrop-blur-sm border border-border">
            <h3 className="font-semibold text-primary mb-2">🎯 Smart Decomposition</h3>
            <p className="text-sm text-muted-foreground">AI breaks down topics into digestible lessons</p>
          </div>
          <div className="p-4 rounded-lg bg-card/30 backdrop-blur-sm border border-border">
            <h3 className="font-semibold text-primary mb-2">📹 Curated Videos</h3>
            <p className="text-sm text-muted-foreground">Top-quality YouTube content for each lesson</p>
          </div>
          <div className="p-4 rounded-lg bg-card/30 backdrop-blur-sm border border-border">
            <h3 className="font-semibold text-primary mb-2">✅ Interactive Quizzes</h3>
            <p className="text-sm text-muted-foreground">Test your knowledge after each lesson</p>
          </div>
        </div>
      </div>
    </div>
  );
};
