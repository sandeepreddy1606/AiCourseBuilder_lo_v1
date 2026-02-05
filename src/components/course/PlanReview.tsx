import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, BookOpen, Target } from "lucide-react";

interface LessonPlan {
    title: string;
    objectives: string;
    cognitive_level: string;
}

interface CoursePlan {
    type: string;
    goal: string;
    prerequisites: string[];
    lessons: LessonPlan[];
}

interface PlanReviewProps {
    plan: CoursePlan;
    onApprove: () => void;
    onCancel: () => void;
    isApproving: boolean;
}

export const PlanReview: React.FC<PlanReviewProps> = ({ plan, onApprove, onCancel, isApproving }) => {
    return (
        <div className="max-w-4xl mx-auto p-4 space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Curriculum Plan</h2>
                <p className="text-muted-foreground">Review the AI-generated structure before we build the content.</p>
            </div>

            <Card className="border-primary/20 bg-card/50 backdrop-blur">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <Target className="w-5 h-5 text-primary" />
                                Course Goal
                            </CardTitle>
                            <CardDescription className="mt-2 text-base text-foreground">
                                {plan.goal}
                            </CardDescription>
                        </div>
                        <Badge variant="secondary" className="capitalize">
                            {plan.type} Course
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <h3 className="font-semibold text-sm uppercase text-muted-foreground tracking-wider">Prerequisites</h3>
                        <div className="flex flex-wrap gap-2">
                            {plan.prerequisites?.map((req, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                    {req}
                                </Badge>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <ScrollArea className="h-[400px] rounded-md border p-4 bg-background/50">
                <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2 sticky top-0 bg-background/95 p-2 z-10">
                        <BookOpen className="w-4 h-4" />
                        Curriculum Structure ({plan.lessons.length} Lessons)
                    </h3>
                    {plan.lessons.map((lesson, index) => (
                        <Card key={index} className="overflow-hidden">
                            <div className="flex items-stretch">
                                <div className="bg-muted w-12 flex items-center justify-center border-r font-mono text-lg font-bold text-muted-foreground">
                                    {index + 1}
                                </div>
                                <div className="p-4 flex-1">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-semibold">{lesson.title}</h4>
                                        <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-0 text-xs capitalize">
                                            {lesson.cognitive_level}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        <span className="font-medium text-foreground/80">Objective:</span> {lesson.objectives}
                                    </p>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </ScrollArea>

            <div className="flex justify-end gap-3 pt-4">
                <Button variant="ghost" onClick={onCancel} disabled={isApproving}>
                    Cancel
                </Button>
                <Button
                    onClick={onApprove}
                    disabled={isApproving}
                    className="bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-900/20"
                >
                    {isApproving ? (
                        <>Initializing Agents...</>
                    ) : (
                        <>
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Approve & Generate Content
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
};
