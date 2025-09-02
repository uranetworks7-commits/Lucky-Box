'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Copy, PartyPopper, Frown, AlertTriangle } from 'lucide-react';
import type { LuckyEvent } from '@/types';
import { determineWinners } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { VideoPlayer } from '@/components/lucky-draw/VideoPlayer';

export default function ResultPage() {
  const params = useParams();
  const eventId = params.id as string;
  const router = useRouter();
  const { toast } = useToast();

  const [username, setUsername] = useState<string | null>(null);
  const [event, setEvent] = useState<LuckyEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    const storedUsername = localStorage.getItem('username');
    if (!storedUsername) {
      router.push('/');
    } else {
      setUsername(storedUsername);
    }
  }, [router]);

  useEffect(() => {
    if (!eventId || !username) return;

    const sessionKey = `playedVideo_${eventId}`;
    const hasPlayed = sessionStorage.getItem(sessionKey) === 'true';
    if (!hasPlayed) {
        setShowVideo(true);
    }

    determineWinners(eventId)
      .then((eventData) => {
        setEvent(eventData);
      })
      .catch((err) => {
        console.error(err);
        toast({ title: 'Error', description: 'Could not fetch event results.', variant: 'destructive' });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [eventId, username, toast]);

  const onVideoEnd = () => {
    sessionStorage.setItem(`playedVideo_${eventId}`, 'true');
    setShowVideo(false);
  }

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: 'Copied!', description: 'Your code has been copied to the clipboard.' });
  };
  
  if (showVideo) {
    return <VideoPlayer onVideoEnd={onVideoEnd} />;
  }
  
  const renderResult = () => {
    if (loading || !event || !username) {
      return (
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Calculating results...</p>
        </div>
      );
    }
    
    const winnerObject = Object.entries(event.registeredUsers || {}).find(([id, name]) => name === username);
    const isRegistered = !!winnerObject;
    const userId = winnerObject ? winnerObject[0] : null;
    const isWinner = !!(userId && event.winners?.includes(userId));

    if (!isRegistered) {
      return (
        <div className="text-center space-y-4">
          <AlertTriangle className="h-16 w-16 text-yellow-500 mx-auto" />
          <h3 className="text-2xl font-bold">You Missed It!</h3>
          <p className="text-muted-foreground">You didn't register for this event. Better luck next time!</p>
        </div>
      );
    }

    if (isWinner && userId) {
      const code = event.assignedCodes?.[userId];
      return (
        <div className="text-center space-y-4">
          <PartyPopper className="h-16 w-16 text-green-500 mx-auto" />
          <h3 className="text-3xl font-bold">Congratulations! You Won! 🎉</h3>
          <p className="text-muted-foreground">Here is your exclusive redeem code:</p>
          <div className="flex items-center justify-center gap-2 p-3 bg-muted rounded-lg">
            <p className="text-xl font-mono font-bold text-primary">{code || 'CODE-ERROR'}</p>
            {code && (
              <Button size="icon" variant="ghost" onClick={() => handleCopy(code)}>
                <Copy className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="text-center space-y-4">
        <Frown className="h-16 w-16 text-destructive mx-auto" />
        <h3 className="text-2xl font-bold">Not This Time... 😔</h3>
        <p className="text-muted-foreground">Unfortunately, you didn't win this time. Keep trying!</p>
      </div>
    );
  };

  return (
    <main className="flex items-center justify-center min-h-screen bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Event Results</CardTitle>
          <CardDescription>{event?.name}</CardDescription>
        </CardHeader>
        <CardContent className="min-h-[16rem] flex flex-col items-center justify-center">
          {renderResult()}
        </CardContent>
        <CardContent className="text-center">
           <Button variant="outline" asChild><Link href="/dashboard">Back to Dashboard</Link></Button>
        </CardContent>
      </Card>
    </main>
  );
}
