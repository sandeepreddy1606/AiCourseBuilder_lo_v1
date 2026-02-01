import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Coins, History } from 'lucide-react';
import { format } from 'date-fns';

interface UsageStat {
    tokens: number;
    model: string;
    created_at: string;
    course_title: string;
}

interface TokenTrackerProps {
    refreshTrigger?: number; // Increment to force refresh
}

export const TokenTracker = ({ refreshTrigger }: TokenTrackerProps) => {
    const [totalTokens, setTotalTokens] = useState<number>(0);
    const [history, setHistory] = useState<UsageStat[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchUsage = async () => {
        try {
            setLoading(true);
            const data = await api.get('/usage');
            if (data) {
                setTotalTokens(data.totalTokens);
                setHistory(data.history || []);
            }
        } catch (error) {
            console.error("Failed to fetch usage:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsage();
    }, [refreshTrigger]);

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 bg-background/50 backdrop-blur-sm border-primary/20 hover:border-primary/50">
                    <Coins className="w-4 h-4 text-yellow-500" />
                    <span className="font-mono">{totalTokens.toLocaleString()} Tokens</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <History className="w-5 h-5 text-primary" />
                        Token Usage History
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="bg-muted p-4 rounded-lg text-center">
                        <div className="text-sm text-muted-foreground">Lifetime Usage</div>
                        <div className="text-3xl font-bold font-mono text-primary">{totalTokens.toLocaleString()}</div>
                    </div>

                    <div className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground">Recent Generations</h4>
                        <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
                            {history.length === 0 ? (
                                <p className="text-xs text-center p-4">No history yet.</p>
                            ) : (
                                history.map((entry, i) => (
                                    <div key={i} className="flex justify-between items-center p-2 rounded bg-muted/50 text-sm">
                                        <div>
                                            <div className="font-medium truncate max-w-[180px]">
                                                {entry.course_title || 'Unknown Course'}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {format(new Date(entry.created_at), 'MMM d, h:mm a')} • {entry.model}
                                            </div>
                                        </div>
                                        <div className="font-mono font-bold text-yellow-600 dark:text-yellow-400">
                                            +{entry.tokens}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
