
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { onValue, ref } from 'firebase/database';
import { db } from '@/lib/firebase';
import type { LuckyEvent } from '@/types';
import { Button } from '@/components/ui/button';
import { Box, Loader2 } from 'lucide-react';
import { registerForEvent } from '@/app/actions';
import { TerminalAnimation } from '@/components/lucky-draw/TerminalAnimation';

export default function RegisterPage() {
  const params = useParams();
  const eventId = params.id as string;
  const router = useRouter();

  const [username, setUsername] = useState<string | null>(null);
  const [event, setEvent] = useState<LuckyEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationResult, setRegistrationResult] = useState<{ success: boolean; message: string } | null>(null);

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
      router.push(`/event/${eventId}`);
  }

  if (loading || !event) {
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

  return (
    <main className="flex items-center justify-center min-h-screen bg-black text-white">
      <div className="text-center space-y-8">
        <h1 className="text-4xl font-bold">Register for {event.name}</h1>
        <Button onClick={handleRegister} size="lg" className="text-xl p-8 bg-accent hover:bg-accent/90" disabled={isRegistering}>
            {isRegistering ? <Loader2 className="mr-4 h-8 w-8 animate-spin" /> : <Box className="mr-4 h-8 w-8" />}
            {isRegistering ? 'Registering...' : 'Register Now'}
        </Button>
      </div>
    </main>
  );
}

    