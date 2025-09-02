'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { onValue, ref, push, set } from 'firebase/database';
import { db } from '@/lib/firebase';
import type { LuckyEvent } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TerminalAnimation } from '@/components/lucky-draw/TerminalAnimation';
import { Countdown } from '@/components/lucky-draw/Countdown';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { CheckCircle, Clock, Loader2, Trophy, XCircle, ArrowLeft, Gift, Box, Sparkles } from 'lucide-react';
import Link from 'next/link';

type EventStatus = 'loading' | 'upcoming' | 'live' | 'ended' | 'results' | 'not_found';
type RegistrationStatus = 'unregistered' | 'registering' | 'registered' | 'animating';

export default function EventPage() {
  const params = useParams();
  const eventId = params.id as string;
  const router = useRouter();
  const { toast } = useToast();

  const [username, setUsername] = useState<string | null>(null);
  const [event, setEvent] = useState<LuckyEvent | null>(null);
  const [eventStatus, setEventStatus] = useState<EventStatus>('loading');
  const [registrationStatus, setRegistrationStatus] = useState<RegistrationStatus>('unregistered');
  const [showResultsLink, setShowResultsLink] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(true);

  useEffect(() => {
    const storedUsername = localStorage.getItem('username');
    if (!storedUsername) router.push('/');
    else setUsername(storedUsername);
  }, [router]);

  const updateStatus = useCallback((eventData: LuckyEvent | null) => {
    if (!eventData) {
      setEventStatus('not_found');
      return;
    }
    const now = Date.now();
    if (now < eventData.startTime) setEventStatus('upcoming');
    else if (now >= eventData.startTime && now <= eventData.endTime) setEventStatus('live');
    else if (now > eventData.endTime && now < eventData.resultTime) setEventStatus('ended');
    else {
      setEventStatus('results');
      setShowResultsLink(true);
    }
  }, []);

  useEffect(() => {
    if (!eventId) return;
    const eventRef = ref(db, `events/${eventId}`);
    const unsubscribe = onValue(eventRef, (snapshot) => {
      if (snapshot.exists()) {
        const eventData = { id: eventId, ...snapshot.val() };
        setEvent(eventData);
        updateStatus(eventData);
        
        if (username) {
            const isRegistered = Object.values(eventData.registeredUsers || {}).includes(username);
            if (isRegistered) {
                if(registrationStatus !== 'animating') {
                    setRegistrationStatus('registered');
                }
            } else {
                 if(registrationStatus !== 'animating') {
                    setRegistrationStatus('unregistered');
                 }
            }
        }
      } else {
        setEventStatus('not_found');
      }
    });
    return () => unsubscribe();
  }, [eventId, username, updateStatus, registrationStatus]);
  
  const handleRegister = async () => {
    if (!username || !event || registrationStatus !== 'unregistered') return;
    const now = Date.now();
    if (now > event.endTime) {
        setRegistrationSuccess(false);
    } else {
        setRegistrationSuccess(true);
    }
    setRegistrationStatus('animating'); // Start animation immediately
  };

  const handleAnimationComplete = async () => {
      if (!username || !event) return;
      
      if (!registrationSuccess) {
          toast({ title: 'Registration Failed', description: 'The registration period for this event has ended.', variant: 'destructive' });
          setRegistrationStatus('unregistered');
          return;
      }

      try {
          const usersRef = ref(db, `events/${event.id}/registeredUsers`);
          const newUserRef = push(usersRef);
          await set(newUserRef, username);
          toast({ title: 'Success!', description: 'You have been successfully registered for the event.' });
          setRegistrationStatus('registered');
      } catch (error) {
          console.error(error);
          toast({ title: 'Error', description: 'Registration failed. Please try again.', variant: 'destructive' });
          setRegistrationStatus('unregistered');
      }
  }

  const onCountdownEnd = () => {
    updateStatus(event);
  };
  
  const renderContent = () => {
    if (eventStatus === 'loading' || !event) {
      return <div className="flex items-center gap-2"><Loader2 className="animate-spin h-5 w-5" />Loading Event...</div>;
    }
    
    if (eventStatus === 'not_found') {
        return <div className="flex items-center gap-2"><XCircle className="h-5 w-5 text-destructive" />Event not found.</div>
    }

    if(registrationStatus === 'animating'){
        return <TerminalAnimation onComplete={handleAnimationComplete} success={registrationSuccess} />;
    }
    
    const resultsContent = (
      <div className="text-center space-y-4 p-6 bg-card-foreground/5 rounded-lg border border-border">
        <Trophy className="h-16 w-16 text-accent mx-auto" />
        <h3 className="text-3xl font-bold text-accent">Results Are Out!</h3>
        <p className="text-muted-foreground">The moment of truth has arrived. Click below to see if you've won a prize!</p>
        <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg shadow-accent/20">
          <Link href={`/result/${eventId}`}>View My Result</Link>
        </Button>
      </div>
    );

    if (showResultsLink || eventStatus === 'results') {
        return resultsContent;
    }

    if (eventStatus === 'live') {
      if (registrationStatus === 'registered') {
          return (
              <div className="text-center space-y-4">
                  <Gift className="h-16 w-16 text-green-500 mx-auto" />
                  <h3 className="text-2xl font-bold">Successfully Registered!</h3>
                  <p className="text-muted-foreground">The results will be revealed in:</p>
                  <Countdown to={event.resultTime} onEnd={onCountdownEnd} />
              </div>
          )
      }
      return (
        <div className="text-center space-y-4 p-6 bg-red-500/10 rounded-lg border border-red-500/30">
          <Sparkles className="h-16 w-16 text-red-400 mx-auto animate-pulse" />
          <h3 className="text-3xl font-bold text-white">The Event is LIVE!</h3>
          <p className="text-red-200/90">Your chance to win is now. Don't miss out!</p>
          <Button onClick={handleRegister} size="lg" className="w-full bg-red-600 hover:bg-red-700 text-lg font-bold animate-pulse">
              <Box className="mr-2 h-6 w-6"/>
              Spin
          </Button>
        </div>
      );
    }
    
    if (eventStatus === 'upcoming') {
        return <p>This event starts on {format(new Date(event.startTime), 'Pp')}.</p>;
    }


    if (eventStatus === 'ended' ) {
      const mainContent = registrationStatus === 'unregistered' ? (
        <>
            <Clock className="h-16 w-16 text-primary mx-auto" />
            <h3 className="text-2xl font-bold">Registration Closed</h3>
            <p className="text-muted-foreground">The event is over. Results will be announced soon.</p>
        </>
      ) : (
        <>
          <Gift className="h-16 w-16 text-green-500 mx-auto" />
          <h3 className="text-2xl font-bold">Successfully Registered!</h3>
          <p className="text-muted-foreground">The results will be revealed in:</p>
        </>
      );
      
      return (
        <div className="text-center space-y-4">
            {mainContent}
            <Countdown to={event.resultTime} onEnd={onCountdownEnd} />
        </div>
      );
    }
    
    return null; // Fallback
  }

  return (
    <main className="flex items-center justify-center min-h-screen bg-muted/40 p-4">
      <Card className="w-full max-w-lg relative">
        <Button asChild variant="ghost" className="absolute top-4 left-4">
            <Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" />Back</Link>
        </Button>
        <CardHeader className="text-center pt-12">
          <CardTitle className="text-3xl font-bold">{event?.name || 'Lucky Draw'}</CardTitle>
          <CardDescription>
            {event && (eventStatus === 'live' || eventStatus === 'upcoming') && `Registration ends: ${format(new Date(event.endTime), 'Pp')}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="min-h-[20rem] flex items-center justify-center">
            {renderContent()}
        </CardContent>
      </Card>
    </main>
  );
}
