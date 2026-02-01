import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Loader2, CheckCircle2 } from 'lucide-react';

interface GenerationOverlayProps {
    isVisible: boolean;
    logs: string[];
    progress: number; // 0 to 100
}

export const GenerationOverlay = ({ isVisible, logs, progress }: GenerationOverlayProps) => {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        let interval: any;
        if (isVisible && progress < 100) {
            const start = Date.now();
            interval = setInterval(() => {
                setElapsed(Date.now() - start);
            }, 50); // Update every 50ms for smooth millisecond display
        }
        return () => clearInterval(interval);
    }, [isVisible, progress]);

    if (!isVisible) return null;

    const seconds = (elapsed / 1000).toFixed(2);

    return (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl bg-card border-primary/20 shadow-2xl overflow-hidden flex flex-col h-[600px]">
                {/* Header */}
                <div className="p-6 border-b border-border bg-muted/20">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                            Generating Your Course
                        </h2>
                        <div className="text-primary font-mono text-xl">{seconds}s</div>
                    </div>

                    {/* Progress Bar */}
                    <div className="relative h-4 bg-muted rounded-full overflow-hidden">
                        <div
                            className="absolute top-0 left-0 h-full bg-primary transition-all duration-300 ease-out flex items-center justify-end pr-2"
                            style={{ width: `${Math.max(5, progress)}%` }}
                        >
                            <div className="h-full w-full absolute top-0 left-0 bg-white/20 animate-pulse"></div>
                        </div>
                    </div>
                    <div className="text-right text-sm text-muted-foreground mt-2">{progress}% Complete</div>
                </div>

                {/* Logs Console */}
                <div className="flex-1 overflow-y-auto p-6 font-mono text-sm space-y-3 bg-black/40">
                    {logs.map((log, i) => (
                        <div key={i} className="flex items-start gap-3 animate-in fade-in slide-in-from-left-2">
                            {i === logs.length - 1 && progress < 100 ? (
                                <Loader2 className="w-4 h-4 text-primary animate-spin mt-0.5 shrink-0" />
                            ) : (
                                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                            )}
                            <span className={i === logs.length - 1 ? "text-foreground font-medium" : "text-muted-foreground"}>
                                {log}
                            </span>
                        </div>
                    ))}
                    {logs.length === 0 && (
                        <div className="text-muted-foreground italic">Initializing AI agents...</div>
                    )}
                </div>
            </Card>
        </div>
    );
};
