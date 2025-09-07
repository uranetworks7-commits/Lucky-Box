
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { onValue, ref } from 'firebase/database';
import { db } from '@/lib/firebase';
import type { LuckyEvent } from '@/types';
import { Button } from '@/components/ui/button';
import { Box, Calendar, Clock, Loader2, Gift } from 'lucide-react';
import { registerForEvent } from '@/app/actions';
import { TerminalAnimation } from '@/components/lucky-draw/TerminalAnimation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';

export default function RegisterPage() {
  const params = useParams();
  const eventId = params.id as string;
  const router = useRouter();

  const [username, setUsername] = useState<string | null>(null);
  const [event, setEvent] = useState<LuckyEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationResult, setRegistrationResult] = useState<{ success: boolean; message: string, eventId?: string } | null>(null);

  useEffect(() => {
    const storedUsername = localStorage.getItem('username');
    if (!storedUsername) {
      router.push('/');
    } else {
      setUsername(storedUsername);
    }
  }, [router]);

  useEffect(() => {
    if (!eventId) return;
    const eventRef = ref(db, `events/${eventId}`);
    const unsubscribe = onValue(eventRef, (snapshot) => {
      if (snapshot.exists()) {
        setEvent({ id: eventId, ...snapshot.val() });
      } else {
        setEvent(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [eventId]);

  const handleRegister = async () => {
    if (!username || !event) return;
    setIsRegistering(true);
    const result = await registerForEvent(event.id, username);
    setRegistrationResult(result);
  };
  
  const handleAnimationComplete = () => {
      if (registrationResult?.success && registrationResult.eventId) {
        router.push(`/event/${registrationResult.eventId}`);
      } else {
        router.push('/dashboard');
      }
  }

  if (loading) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-black">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </main>
    );
  }
  
  if (isRegistering && registrationResult) {
      return (
          <main className="flex items-center justify-center min-h-screen bg-black p-4">
              <div className="w-full max-w-4xl">
                <TerminalAnimation
                    success={registrationResult.success}
                    message={registrationResult.message}
                    onComplete={handleAnimationComplete}
                />
              </div>
          </main>
      )
  }

  if (!event) {
    return (
       <main className="flex items-center justify-center min-h-screen bg-cover bg-center" style={{ backgroundImage: "url('https://i.postimg.cc/7Yf8zfPQ/fhdnature3648.jpg')"}}>
         <div className="absolute inset-0 bg-black/50"></div>
         <Card className="w-full max-w-sm z-10 text-center">
            <CardHeader>
                <CardTitle>Event Not Found</CardTitle>
                <CardDescription>This event does not exist or has been removed.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button onClick={() => router.push('/dashboard')}>Go to Dashboard</Button>
            </CardContent>
         </Card>
      </main>
    );
  }

  return (
    <main className="flex items-center justify-center min-h-screen bg-cover bg-center bg-fixed" style={{ backgroundImage: "url('https://i.postimg.cc/7Yf8zfPQ/fhdnature3648.jpg')"}}>
        <div className="absolute inset-0 bg-black/60"></div>
        <Card className="w-full max-w-md z-10 bg-black/40 border-white/20 text-white text-center p-4">
            <CardContent className="space-y-6 flex flex-col items-center">
                <div className="p-4 bg-green-500/20 rounded-full">
                    <Gift className="h-24 w-24 text-green-400" />
                </div>
                 <div>
                    <CardTitle className="text-3xl font-bold">{event.name}</CardTitle>
                    <CardDescription className="text-white/70 mt-2">You are about to enter the event. Good luck!</CardDescription>
                </div>
                <div className="flex justify-center items-center gap-6 text-lg text-white/80">
                    <div className="flex items-center gap-2"><Calendar className="h-5 w-5"/> {format(new Date(event.startTime), 'MMM d, p')}</div>
                    <div className="flex items-center gap-2"><Clock className="h-5 w-5"/> {format(new Date(event.endTime), 'p')}</div>
                </div>
                <Button onClick={handleRegister} size="lg" className="w-full text-xl p-8 bg-accent hover:bg-accent/90 shadow-lg shadow-accent/20" disabled={isRegistering}>
                    {isRegistering ? <Loader2 className="mr-4 h-8 w-8 animate-spin" /> : <Box className="mr-4 h-8 w-8" />}
                    {isRegistering ? 'Registering...' : 'Register Now'}
                </Button>
            </CardContent>
        </Card>
    </main>
  );
}
    
