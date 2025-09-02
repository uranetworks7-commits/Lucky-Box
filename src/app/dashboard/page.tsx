
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { onValue, ref } from 'firebase/database';
import { db } from '@/lib/firebase';
import type { LuckyEvent } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Crown, Gift, LogOut, Ticket, History, Eye, User, Box, ArrowRight, Calendar, Clock } from 'lucide-react';
import { AdminAccessDialog } from '@/components/lucky-draw/AdminAccessDialog';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const [username, setUsername] = useState<string | null>(null);
  const [events, setEvents] = useState<LuckyEvent[]>([]);
  const [userEventStatus, setUserEventStatus] = useState<Record<string, 'won' | 'lost' | 'missed' | 'registered' | 'pending'>>({});
  const [isAdminDialogOpen, setIsAdminDialogOpen] = useState(false);
  const [adminClickCount, setAdminClickCount] = useState(0);
  const [lastClickTime, setLastClickTime] = useState(0);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const storedUsername = localStorage.getItem('username');
    if (!storedUsername) {
      router.push('/');
    } else {
      setUsername(storedUsername);
    }
  }, [router]);
  
  const updateEvents = useCallback((data: any) => {
    if (data) {
      const now = Date.now();
      const allEvents: LuckyEvent[] = Object.entries(data).map(([id, event]) => ({
        id,
        ...(event as Omit<LuckyEvent, 'id'>),
      })).sort((a, b) => a.startTime - b.startTime);
      setEvents(allEvents);
      
      if(username){
          const status: Record<string, 'won' | 'lost' | 'missed' | 'registered' | 'pending'> = {};
          allEvents.forEach(event => {
              const userEntry = Object.entries(event.registeredUsers || {}).find(([_, name]) => name === username);
              const userId = userEntry ? userEntry[0] : null;
              const isRegistered = !!userId;

              if (event.winners) { // Winners have been determined
                  const isWinner = !!(userId && event.winners?.includes(userId));
                  if (isRegistered) {
                      status[event.id] = isWinner ? 'won' : 'lost';
                  } else {
                      status[event.id] = 'missed';
                  }
              } else if (now > event.resultTime) { // Result time passed, but winners not set (e.g. no participants)
                  if (isRegistered) {
                      status[event.id] = 'lost';
                  } else {
                      status[event.id] = 'missed';
                  }
              } else if (now > event.endTime) { // Event ended, waiting for results
                  status[event.id] = 'pending';
              } else if (isRegistered) { // Event is live or upcoming
                  status[event.id] = 'registered';
              }
          });
          setUserEventStatus(status);
      }
    }
  }, [username]);

  useEffect(() => {
    if (!username) return;

    const eventsRef = ref(db, 'events');
    const unsubscribe = onValue(eventsRef, (snapshot) => {
      updateEvents(snapshot.val());
    });
    
    // Set up an interval to refresh the event state to check for live events
    const interval = setInterval(() => {
      onValue(eventsRef, (snapshot) => {
         updateEvents(snapshot.val());
      }, { onlyOnce: true });
    }, 1000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    }
  }, [username, updateEvents]);
  
  const handleAdminAccessClick = () => {
    const now = Date.now();
    // If clicks are more than 1 second apart, reset the counter.
    if (now - lastClickTime > 1000) {
      setAdminClickCount(1);
    } else {
      const newClickCount = adminClickCount + 1;
      setAdminClickCount(newClickCount);
      if (newClickCount >= 3) {
        setIsAdminDialogOpen(true);
        setAdminClickCount(0); // Reset after opening
      }
    }
    setLastClickTime(now);
  };

  const handleLogout = () => {
    localStorage.removeItem('username');
    sessionStorage.removeItem('isAdmin');
    router.push('/');
  };

  const getEventStatusBadge = (eventId: string) => {
    const status = userEventStatus[eventId];
    switch (status) {
        case 'won': return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Won</Badge>;
        case 'lost': return <Badge variant="destructive">Lost</Badge>;
        case 'missed': return <Badge variant="destructive" className="bg-red-500 text-white hover:bg-red-600">Missed</Badge>;
        case 'pending': return <Badge variant="outline">Pending</Badge>
        default: return null;
    }
  }

  const now = Date.now();
  const upcomingEvents = events.filter(e => e.endTime > now);
  const pastEvents = events.filter(e => e.endTime <= now).sort((a, b) => b.resultTime - a.resultTime);

  return (
    <div className="min-h-screen bg-cover bg-center bg-fixed" style={{ backgroundImage: "url('https://i.postimg.cc/7Yf8zfPQ/fhdnature3648.jpg')" }}>
      <div className="min-h-screen bg-black/60 p-4 sm:p-6 md:p-8">
        <header className="flex justify-between items-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
              <Box className="h-8 w-8 text-accent" /> URA BOX Pro
          </h1>
          <div className="flex items-center gap-4">
              <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                <User /> {username}
              </h2>
              <Button variant="ghost" size="icon" onClick={handleLogout} className="text-white hover:bg-white/10 hover:text-white">
                <LogOut className="h-5 w-5" />
              </Button>
          </div>
        </header>

        <main className="max-w-4xl mx-auto">
          <section className="text-center mb-12">
             {upcomingEvents.length > 0 ? (
                <>
                    <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4 flex items-center justify-center gap-3">
                        <Box className="h-10 w-10 text-accent" /> Lucky Box
                    </h2>
                    <div className="grid gap-6 md:grid-cols-2">
                    {upcomingEvents.map(event => (
                      <Link href={`/event/${event.id}`} key={event.id} className="group">
                        <Card className={cn(
                            "w-full bg-black/40 border-white/20 text-white transition-all duration-300 h-full flex flex-col justify-between",
                            "hover:bg-black/60 hover:border-accent hover:shadow-2xl hover:shadow-accent/20",
                            event.isHighlighted && "border-accent shadow-accent/20 shadow-lg"
                        )}>
                          <CardHeader className="p-4">
                            <CardTitle className={cn("flex items-center justify-center gap-2 text-2xl", event.isHighlighted && 'animate-golden-glow text-accent')}>
                              {event.name}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3 p-4 pt-0 text-center">
                            {now < event.startTime ? (
                              <div className="space-y-2">
                                <Badge variant="outline" className="border-accent text-accent text-lg py-1 px-4">Upcoming</Badge>
                                <div className="flex justify-center items-center gap-4 text-lg text-white/80">
                                    <div className="flex items-center gap-2"><Calendar className="h-5 w-5"/> {format(new Date(event.startTime), 'MMM d, yyyy')}</div>
                                    <div className="flex items-center gap-2"><Clock className="h-5 w-5"/> {format(new Date(event.startTime), 'p')}</div>
                                </div>
                              </div>
                            ) : (
                               <Badge className="bg-red-500 hover:bg-red-600 animate-pulse text-base py-1 px-4">Live Now!</Badge>
                            )}
                          </CardContent>
                          <div className="p-4 pt-0">
                                {now >= event.startTime && now <= event.endTime && (
                                    <Button size="lg" className="w-full font-semibold text-lg bg-accent hover:bg-accent/90">
                                        <Box className="mr-2 h-5 w-5" />
                                        Join Now <ArrowRight className="ml-2 h-5 w-5" />
                                    </Button>
                                )}
                          </div>
                        </Card>
                      </Link>
                    ))}
                    </div>
                </>
              ) : (
                <Card className="w-full md:col-span-2 mx-auto bg-white/10 border-white/20 text-white">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-center gap-2 text-xl">
                      <Ticket className="h-8 w-8 text-accent" />
                      No Active Events
                    </CardTitle>
                    <CardDescription className="text-white/70">Check back later for new events!</CardDescription>
                  </CardHeader>
                </Card>
              )}
          </section>

          <section>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4 flex items-center gap-2">
              <History className="h-7 w-7"/> Past Events
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              {pastEvents.length > 0 ? (
                pastEvents.map(event => (
                  <Card key={event.id} className="bg-black/30 border-white/10 text-white backdrop-blur-sm">
                    <CardHeader className="p-4">
                      <CardTitle className="flex justify-between items-center">
                        {event.name}
                        {getEventStatusBadge(event.id)}
                      </CardTitle>
                      <CardDescription className="text-white/60 pt-1">
                        Ended on: {format(new Date(event.endTime), 'Pp')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                       <Link href={`/result/${event.id}`}>
                          <Button className="w-full bg-white/10 hover:bg-white/20 border border-white/20 shadow-lg shadow-blue-500/30 hover:shadow-blue-400/50 transition-shadow duration-300">
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
        
        <div className="fixed bottom-4 right-4">
            <Button variant="ghost" size="icon" onClick={handleAdminAccessClick} className="text-white bg-black/50 hover:bg-white/20 rounded-full h-12 w-12">
                <Crown className="h-6 w-6" />
            </Button>
        </div>
        
        <AdminAccessDialog open={isAdminDialogOpen} onOpenChange={setIsAdminDialogOpen} />
      </div>
    </div>
  );
}
