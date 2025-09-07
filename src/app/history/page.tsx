
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { onValue, ref } from 'firebase/database';
import { db } from '@/lib/firebase';
import type { LuckyEvent, UserData } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Eye, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function HistoryPage() {
  const [username, setUsername] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [pastEvents, setPastEvents] = useState<LuckyEvent[]>([]);
  const [userEventStatus, setUserEventStatus] = useState<Record<string, 'won' | 'lost' | 'missed' | 'registered'>>({});
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedUsername = localStorage.getItem('username');
    if (!storedUsername) {
      router.push('/');
    } else {
      setUsername(storedUsername);
    }
  }, [router]);

  useEffect(() => {
    if (!username) return;

    const usersRef = ref(db, 'users');
    const unsubscribeUser = onValue(usersRef, (snapshot) => {
        if(snapshot.exists()) {
            const users = snapshot.val();
            const userEntry = Object.entries(users).find(([id, user]: [string, any]) => user.username === username);
            if (userEntry) {
                setUserData({ user_id: userEntry[0], ...userEntry[1] });
            }
        }
    });

    return () => unsubscribeUser();
  }, [username]);

  useEffect(() => {
    if(!userData) return;
    const eventsRef = ref(db, 'events');
    const unsubscribeEvents = onValue(eventsRef, (snapshot) => {
      const data = snapshot.val();
      const now = Date.now();
      if (data) {
        const allEvents: LuckyEvent[] = Object.entries(data).map(([id, event]) => ({
          id,
          ...(event as Omit<LuckyEvent, 'id'>),
        }));
        
        const past = allEvents
            .filter(e => e.endTime <= now)
            .sort((a, b) => b.resultTime - a.resultTime);
        setPastEvents(past);

        const status: Record<string, 'won' | 'lost' | 'missed' | 'registered'> = {};
        past.forEach(event => {
            const userPushId = Object.keys(event.registeredUsers || {}).find(key => event.registeredUsers?.[key] === username);
            const isRegistered = !!userPushId;

            if (event.winners !== undefined) {
                const isWinner = !!(userPushId && event.winners?.includes(userPushId));
                if (isRegistered) {
                    status[event.id] = isWinner ? 'won' : 'lost';
                } else {
                    status[event.id] = 'missed';
                }
            }
        });
        setUserEventStatus(status);

      }
      setLoading(false);
    });

    return () => unsubscribeEvents();
  }, [username, userData]);

  const getEventStatusBadge = (eventId: string) => {
    const status = userEventStatus[eventId];
    switch (status) {
        case 'won': return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Won</Badge>;
        case 'lost': return <Badge variant="destructive">Lost</Badge>;
        case 'missed': return <Badge variant="destructive" className="bg-red-500 text-white hover:bg-red-600">Missed</Badge>;
        default: return <Badge variant="outline">Ended</Badge>;
    }
  }

  return (
    <div className="min-h-screen bg-muted/40 p-4 sm:p-6 md:p-8">
       <header className="flex items-center justify-between mb-6 max-w-5xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            Event History
          </h1>
          <Button variant="outline" asChild>
              <Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4"/> Dashboard</Link>
          </Button>
        </header>

        <main className="max-w-5xl mx-auto">
             {loading ? (
                <p className="text-center">Loading history...</p>
             ): pastEvents.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {pastEvents.map(event => (
                  <Card key={event.id} className="bg-card">
                    <CardHeader className="p-4">
                      <CardTitle className="flex justify-between items-center">
                        <span className="text-base">{event.name}</span>
                         <div className="flex items-center gap-2">
                            {event.requiredXp && event.requiredXp > 0 && (
                                <Badge variant="outline" className="text-yellow-500 border-yellow-500/50 bg-background flex items-center gap-1.5">
                                    <Zap className="h-3 w-3"/>{event.requiredXp}
                                </Badge>
                            )}
                            {getEventStatusBadge(event.id)}
                        </div>
                      </CardTitle>
                      <CardDescription className="pt-1">
                        Ended on: {format(new Date(event.endTime), 'Pp')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                       <Link href={`/result/${event.id}`}>
                          <Button className="w-full" variant="outline">
                            <Eye className="mr-2 h-4 w-4"/>
                            View Result
                          </Button>
                        </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
             ) : (
                <Card className="text-center p-8">
                    <CardTitle>No Past Events</CardTitle>
                    <CardDescription>Your event history will appear here.</CardDescription>
                </Card>
             )}
        </main>

    </div>
  );
}
