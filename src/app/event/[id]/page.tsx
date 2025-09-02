'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { onValue, ref, set, update } from 'firebase/database';
import { db } from '@/lib/firebase';
import type { LuckyEvent } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TerminalAnimation } from '@/components/lucky-draw/TerminalAnimation';
import { Countdown } from '@/components/lucky-draw/Countdown';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { CheckCircle, Clock, Loader2, XCircle } from 'lucide-react';
import Link from 'next/link';

type EventStatus = 'loading' | 'upcoming' | 'live' | 'ended' | 'results' | 'not_found';
type RegistrationStatus = 'unregistered' | 'registering' | 'registered';

export default function EventPage() {
  const params = useParams();
  const eventId = params.id as string;
  const router = useRouter();
  const { toast } = useToast();

  const [username, setUsername] = useState<string | null>(null);
  const [event, setEvent] = useState<LuckyEvent | null>(null);
  const [eventStatus, setEventStatus] = useState<EventStatus>('loading');
  const [registrationStatus, setRegistrationStatus] = useState<RegistrationStatus>('unregistered');

  useEffect(() => {
    const storedUsername = localStorage.getItem('username');
    if (!storedUsername) router.push('/');
    else setUsername(storedUsername);
  }, [router]);

  const updateStatus = useCallback((eventData: LuckyEvent) => {
    const now = Date.now();
    if (now < eventData.startTime) setEventStatus('upcoming');
    else if (now >= eventData.startTime && now <= eventData.endTime) setEventStatus('live');
    else if (now > eventData.endTime && now < eventData.resultTime) setEventStatus('ended');
    else setEventStatus('results');
  }, []);

  useEffect(() => {
    if (!eventId) return;
    const eventRef = ref(db, `events/${eventId}`);
    const unsubscribe = onValue(eventRef, (snapshot) => {
      if (snapshot.exists()) {
        const eventData = { id: eventId, ...snapshot.val() };
        setEvent(eventData);
        
        updateStatus(eventData);
        
        if (username && eventData.registeredUsers?.[username]) {
            setRegistrationStatus('registered');
        }

      } else {
        setEventStatus('not_found');
      }
    });
    return () => unsubscribe();
  }, [eventId, username, updateStatus]);
  
  const handleRegister = async () => {
    if (!username || !event) return;
    setRegistrationStatus('registering');

    try {
        const userRef = ref(db, `events/${event.id}/registeredUsers/${username}`);
        await set(userRef, username);
        // Using `update` can be safer for nested data, but `set` is fine here.
    } catch (error) {
        console.error(error);
        toast({ title: 'Error', description: 'Registration failed. Please try again.', variant: 'destructive' });
        setRegistrationStatus('unregistered');
    }
  };

  const onAnimationComplete = () => {
    toast({ title: 'Success!', description: 'You have been successfully registered for the event.' });
    setRegistrationStatus('registered');
  };
  
  const renderContent = () => {
    if (eventStatus === 'loading' || !event) {
      return <div className="flex items-center gap-2"><Loader2 className="animate-spin h-5 w-5" />Loading Event...</div>;
    }
    
    if (eventStatus === 'not_found') {
        return <div className="flex items-center gap-2"><XCircle className="h-5 w-5 text-destructive" />Event not found.</div>
    }

    if(registrationStatus === 'registering'){
        return <TerminalAnimation onComplete={onAnimationComplete} />;
    }

    if(registrationStatus === 'registered'){
        return (
            <div className="text-center space-y-4">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
                <h3 className="text-2xl font-bold">Successfully Registered!</h3>
                <p className="text-muted-foreground">The results will be revealed in:</p>
                <Countdown to={event.resultTime} onEnd={() => updateStatus(event)} />
            </div>
        )
    }

    if (eventStatus === 'upcoming') {
        return <p>This event starts on {format(new Date(event.startTime), 'Pp')}.</p>;
    }

    if (eventStatus === 'live') {
        return <Button onClick={handleRegister} size="lg" className="w-full">Register Now</Button>;
    }
    
    if (eventStatus === 'ended') {
        return (
             <div className="text-center space-y-4">
                <Clock className="h-16 w-16 text-primary mx-auto" />
                <h3 className="text-2xl font-bold">Registration Closed</h3>
                <p className="text-muted-foreground">The event is over. Results will be announced soon.</p>
                <Countdown to={event.resultTime} onEnd={() => updateStatus(event)} />
            </div>
        );
    }

    if (eventStatus === 'results') {
        return (
            <div className="text-center space-y-4">
                <h3 className="text-2xl font-bold">Results are out!</h3>
                <p className="text-muted-foreground">Click below to see if you've won.</p>
                <Button asChild size="lg"><Link href={`/result/${eventId}`}>View Results</Link></Button>
            </div>
        );
    }
  }

  return (
    <main className="flex items-center justify-center min-h-screen bg-muted/40 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">{event?.name || 'Lucky Draw'}</CardTitle>
          <CardDescription>
            {event && eventStatus === 'live' && `Registration ends: ${format(new Date(event.endTime), 'Pp')}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="min-h-[20rem] flex items-center justify-center">
            {renderContent()}
        </CardContent>
      </Card>
    </main>
  );
}
