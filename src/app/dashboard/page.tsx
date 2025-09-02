'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { onValue, ref } from 'firebase/database';
import { db } from '@/lib/firebase';
import type { LuckyEvent } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Crown, Box, LogOut, Ticket, History, Eye, User } from 'lucide-react';
import { AdminAccessDialog } from '@/components/lucky-draw/AdminAccessDialog';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function DashboardPage() {
  const [username, setUsername] = useState<string | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<LuckyEvent[]>([]);
  const [pastEvents, setPastEvents] = useState<LuckyEvent[]>([]);
  const [userEventStatus, setUserEventStatus] = useState<Record<string, 'won' | 'lost' | 'missed' | 'registered'>>({});
  const [isAdminDialogOpen, setIsAdminDialogOpen] = useState(false);
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

    const eventsRef = ref(db, 'events');
    const unsubscribe = onValue(eventsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const now = Date.now();
        const allEvents: LuckyEvent[] = Object.entries(data).map(([id, event]) => ({
          id,
          ...(event as Omit<LuckyEvent, 'id'>),
        })).sort((a, b) => a.startTime - b.startTime);

        const upcomingAndLive = allEvents.filter(e => e.resultTime > now);
        setUpcomingEvents(upcomingAndLive);

        const endedEvents = allEvents.filter(e => e.resultTime <= now).sort((a, b) => b.resultTime - a.resultTime);
        setPastEvents(endedEvents);
        
        const status: Record<string, 'won' | 'lost' | 'missed' | 'registered'> = {};
        allEvents.forEach(event => {
            const isRegistered = Object.values(event.registeredUsers || {}).includes(username);
            const isWinner = !!event.winners?.some(winnerId => (event.registeredUsers || {})[winnerId] === username);

            if (now > event.resultTime) {
                if (isRegistered) {
                    status[event.id] = isWinner ? 'won' : 'lost';
                } else {
                    status[event.id] = 'missed';
                }
            } else if (isRegistered) {
                status[event.id] = 'registered';
            }
        });
        setUserEventStatus(status);
      }
    });

    return () => unsubscribe();
  }, [username]);

  const handleLogout = () => {
    localStorage.removeItem('username');
    sessionStorage.removeItem('isAdmin');
    router.push('/');
  };

  if (!username) {
    return <div className="flex h-screen items-center justify-center bg-background"><p>Loading...</p></div>;
  }

  const getEventStatusBadge = (eventId: string) => {
    const status = userEventStatus[eventId];
    switch (status) {
        case 'won': return <Badge variant="default" className="bg-green-500">Won</Badge>;
        case 'lost': return <Badge variant="destructive">Lost</Badge>;
        case 'missed': return <Badge variant="destructive" className="bg-red-500 text-white">Missed</Badge>;
        default: return null;
    }
  }

  return (
    <div className="min-h-screen bg-cover bg-center bg-fixed" style={{ backgroundImage: "url('https://i.postimg.cc/c4jzTRB3/fhdabstract101.jpg')" }}>
      <div className="min-h-screen bg-black/60 backdrop-blur-sm p-4 sm:p-6 md:p-8">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <User /> {username}
          </h1>
          <Button variant="ghost" size="icon" onClick={handleLogout} className="text-white hover:bg-white/10 hover:text-white">
            <LogOut className="h-5 w-5" />
          </Button>
        </header>

        <main className="max-w-4xl mx-auto">
          <section className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-2">Upcoming Events</h2>
            
            <div className="grid gap-4 md:grid-cols-2">
              {upcomingEvents.length > 0 ? (
                upcomingEvents.map(event => (
                  <Link href={`/event/${event.id}`} key={event.id}>
                    <Card className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20 transition-all cursor-pointer">
                      <CardHeader>
                        <CardTitle className="flex items-center justify-center gap-2 text-2xl">
                          <Box className="h-8 w-8 text-accent"/>
                          Lucky Box
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {Date.now() < event.startTime ? (
                          <p>Starts: {format(new Date(event.startTime), 'Pp')}</p>
                        ) : Date.now() <= event.endTime ? (
                          <Badge>Live Now!</Badge>
                        ) : (
                          <Badge variant="secondary">Registration Closed</Badge>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))
              ) : (
                <Card className="w-full md:col-span-2 mx-auto bg-white/10 border-white/20 text-white">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-center gap-2 text-2xl">
                      <Ticket className="h-8 w-8 text-accent" />
                      No Active Events
                    </CardTitle>
                    <CardDescription className="text-white/70">Check back later for new events!</CardDescription>
                  </CardHeader>
                </Card>
              )}
            </div>
          </section>

          <section>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4 flex items-center gap-2">
              <History className="h-7 w-7"/> Past Events
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {pastEvents.length > 0 ? (
                pastEvents.map(event => (
                  <Card key={event.id} className="bg-white/5 border-white/10 text-white">
                    <CardHeader>
                      <CardTitle className="flex justify-between items-center">
                        {event.name}
                        {getEventStatusBadge(event.id)}
                      </CardTitle>
                      <CardDescription className="text-white/70">
                        Ended on: {format(new Date(event.resultTime), 'Pp')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                       <Link href={`/result/${event.id}`}>
                          <Button className="w-full" variant="secondary">
                            <Eye className="mr-2 h-4 w-4"/>
                            View Result
                          </Button>
                        </Link>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card className="md:col-span-2 bg-white/5 border-white/10 text-white/70 flex items-center justify-center p-8">
                  <p>No past events to show.</p>
                </Card>
              )}
            </div>
          </section>
        </main>
        
        <footer className="fixed bottom-4 right-4 z-20">
            <Button size="icon" className="rounded-full h-14 w-14 bg-accent text-accent-foreground hover:bg-yellow-400 shadow-lg" onClick={() => setIsAdminDialogOpen(true)}>
                <Crown className="h-7 w-7" />
            </Button>
        </footer>
        <AdminAccessDialog open={isAdminDialogOpen} onOpenChange={setIsAdminDialogOpen} />
      </div>
    </div>
  );
}
