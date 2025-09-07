
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { onValue, ref } from 'firebase/database';
import { db } from '@/lib/firebase';
import type { LuckyEvent, UserData } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Crown, Gift, LogOut, Ticket, History, Eye, User, Box, ArrowRight, Calendar, Clock, Settings, Zap, Loader2, Lock, CheckCircle } from 'lucide-react';
import { AdminAccessDialog } from '@/components/lucky-draw/AdminAccessDialog';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { determineWinners, registerForEvent } from '../actions';
import { ExitConfirmationDialog } from '@/components/lucky-draw/ExitConfirmationDialog';
import { useToast } from '@/hooks/use-toast';
import { RegistrationDialog } from '@/components/lucky-draw/RegistrationDialog';


export default function DashboardPage() {
  const [username, setUsername] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [events, setEvents] = useState<LuckyEvent[]>([]);
  const [userEventStatus, setUserEventStatus] = useState<Record<string, 'won' | 'lost' | 'missed' | 'registered' | 'unlocked' | 'pending'>>({});
  const [isAdminDialogOpen, setIsAdminDialogOpen] = useState(false);
  const [adminClickCount, setAdminClickCount] = useState(0);
  const [lastClickTime, setLastClickTime] = useState(0);
  const [isExitConfirmationDialogOpen, setIsExitConfirmationDialogOpen] = useState(false);
  
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const storedUsername = localStorage.getItem('username');
    if (!storedUsername) {
      router.push('/');
    } else {
      setUsername(storedUsername);
    }
  }, [router]);

  const handleBackButton = useCallback((event: PopStateEvent) => {
    event.preventDefault();
    setIsExitConfirmationDialogOpen(true);
  }, []);

  useEffect(() => {
    history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handleBackButton);

    return () => {
      window.removeEventListener('popstate', handleBackButton);
    };
  }, [handleBackButton]);
  
  const updateEvents = useCallback((data: any, currentUserData: UserData | null) => {
    if (data && currentUserData?.username) {
      const currentUsername = currentUserData.username;
      const now = Date.now();
      const allEvents: LuckyEvent[] = Object.entries(data).map(([id, event]) => ({
        id,
        ...(event as Omit<LuckyEvent, 'id'>),
      })).sort((a, b) => a.startTime - b.startTime);

      // Automatically determine winners for any events that have ended
      allEvents.forEach(event => {
        if(now > event.endTime && !event.winners) {
            determineWinners(event.id).then(updatedEvent => {
                 setEvents(prevEvents => prevEvents.map(e => e.id === updatedEvent.id ? updatedEvent : e));
            });
        }
      });
      
      setEvents(allEvents);
      
      const status: Record<string, 'won' | 'lost' | 'missed' | 'registered' | 'unlocked' | 'pending'> = {};
      allEvents.forEach(event => {
          const userPushId = Object.keys(event.registeredUsers || {}).find(key => event.registeredUsers?.[key] === currentUsername);
          const isRegistered = !!userPushId;
          const isUnlocked = !!(event.id && currentUserData.unlockedEvents?.[event.id]);

          if (now > event.resultTime && event.winners !== undefined) { // Result time has passed and winners are determined
              const isWinner = !!(userPushId && event.winners?.includes(userPushId));
              if (isRegistered) {
                  status[event.id] = isWinner ? 'won' : 'lost';
              } else {
                  status[event.id] = 'missed';
              }
          } else if (now > event.endTime) { // Event ended, waiting for results
              status[event.id] = 'pending';
          } else if (isRegistered) { // Event is live or upcoming and user is fully registered
              status[event.id] = 'registered';
          } else if (isUnlocked) {
              status[event.id] = 'unlocked';
          }
      });
      setUserEventStatus(status);
    }
  }, []);

  useEffect(() => {
    if (!username) return;

    const usersRef = ref(db, 'users');
    const unsubscribeUser = onValue(usersRef, (snapshot) => {
      if (snapshot.exists()) {
        const users = snapshot.val();
        const userEntry = Object.entries(users).find(([id, user]: [string, any]) => user.username === username);
        if (userEntry) {
          const userData = { user_id: userEntry[0], ...userEntry[1] };
          setUserData(userData);
          // When user data changes, re-evaluate event statuses
          onValue(ref(db, 'events'), (eventSnapshot) => {
             updateEvents(eventSnapshot.val(), userData);
          }, { onlyOnce: true });
        }
      }
    });

    const eventsRef = ref(db, 'events');
    const unsubscribeEvents = onValue(eventsRef, (snapshot) => {
      // We need userData to be available to correctly calculate event statuses
      onValue(usersRef, (userSnapshot) => {
          if (userSnapshot.exists()) {
              const users = userSnapshot.val();
              const userEntry = Object.entries(users).find(([id, user]: [string, any]) => user.username === username);
              if (userEntry) {
                 updateEvents(snapshot.val(), { user_id: userEntry[0], ...userEntry[1] });
              }
          }
      }, { onlyOnce: true });
    });
    
    const interval = setInterval(() => {
      onValue(eventsRef, (snapshot) => {
         onValue(usersRef, (userSnapshot) => {
            if (userSnapshot.exists()) {
                const users = userSnapshot.val();
                const userEntry = Object.entries(users).find(([id, user]: [string, any]) => user.username === username);
                if (userEntry) {
                   updateEvents(snapshot.val(), { user_id: userEntry[0], ...userEntry[1] });
                }
            }
         }, { onlyOnce: true });
      }, { onlyOnce: true });
    }, 5000);

    return () => {
      unsubscribeUser();
      unsubscribeEvents();
      clearInterval(interval);
    }
  }, [username, updateEvents]);
  
  const handleAdminAccessClick = () => {
    const now = Date.now();
    if (now - lastClickTime > 1000) {
      setAdminClickCount(1);
    } else {
      const newClickCount = adminClickCount + 1;
      setAdminClickCount(newClickCount);
      if (newClickCount >= 3) {
        setIsAdminDialogOpen(true);
        setAdminClickCount(0);
      }
    }
    setLastClickTime(now);
  };

  const handleUnlockEvent = async (event: LuckyEvent) => {
    if (!username || !userData) return;
    const result = await registerForEvent(event.id, username);
    toast({
        title: result.success ? 'Success' : 'Error',
        description: result.message,
        variant: result.success ? 'default' : 'destructive'
    });
  }

  const handleLogout = () => {
    localStorage.removeItem('username');
    localStorage.removeItem('isAdmin');
    router.push('/');
  };

  const handleExitConfirm = () => {
    router.replace('/');
  };

  const handleExitCancel = () => {
    history.pushState(null, '', window.location.href);
    setIsExitConfirmationDialogOpen(false);
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

  const renderEventButton = (event: LuckyEvent) => {
    const status = userEventStatus[event.id];
    const now = Date.now();
    const isLive = now >= event.startTime && now <= event.endTime;

    if (status === 'registered') {
        return <Button asChild size="lg" className="w-full font-semibold text-lg bg-blue-600 hover:bg-blue-700"><Link href={`/event/${event.id}`}>View Event <Eye className="ml-2 h-5 w-5" /></Link></Button>;
    }
    
    if (status === 'unlocked') {
        if (isLive) {
            // Unlocked and Live -> Join Button (links to register page)
            return <Button asChild size="lg" className="w-full font-semibold text-lg bg-accent hover:bg-accent/90 animate-pulse"><Link href={`/register/${event.id}`}>Join Event <ArrowRight className="ml-2 h-5 w-5" /></Link></Button>;
        }
        // Unlocked and Upcoming -> View Button
        return <Button asChild size="lg" className="w-full font-semibold text-lg bg-blue-600 hover:bg-blue-700"><Link href={`/event/${event.id}`}>View Event <Eye className="ml-2 h-5 w-5" /></Link></Button>;
    }
    
    // Default case: not unlocked, not registered
    if (event.requiredXp && event.requiredXp > 0) {
        return <Button onClick={() => handleUnlockEvent(event)} size="lg" className="w-full font-semibold text-lg bg-gray-600 hover:bg-gray-700"><Lock className="mr-2 h-5 w-5"/>Unlock Event</Button>;
    }

    if (isLive) {
       return <Button asChild size="lg" className="w-full font-semibold text-lg bg-accent hover:bg-accent/90"><Link href={`/register/${event.id}`}>Join Event <ArrowRight className="ml-2 h-5 w-5" /></Link></Button>;
    }

    return <Button asChild size="lg" className="w-full font-semibold text-lg" disabled><Link href={`/event/${event.id}`}>View Event</Link></Button>;
}


  const now = Date.now();
  const upcomingEvents = events.filter(e => e.endTime > now);
  const pastEvents = events.filter(e => e.endTime <= now).sort((a, b) => b.resultTime - a.resultTime);

  return (
    <div className="min-h-screen bg-cover bg-center bg-fixed" style={{ backgroundImage: "url('https://i.postimg.cc/7Yf8zfPQ/fhdnature3648.jpg')" }}>
      <div className="min-h-screen bg-black/60 p-4 sm:p-6 md:p-8">
        <header className="flex justify-between items-center mb-6">
          <h1 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <Box className="h-6 w-6 text-accent" /> URA Box Pro
          </h1>
          <div className="flex items-center gap-1 sm:gap-2">
              <div className="flex items-center gap-2 text-white bg-black/30 backdrop-blur-sm px-2.5 py-1.5 rounded-full">
                  <Zap className="h-4 w-4 text-blue-400"/>
                  {userData?.xp === null ? (
                     <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <span className="font-bold text-base">{userData?.xp ?? 0}</span>
                  )}
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-1.5">
                <User className="h-4 w-4" /> {username}
                 <Button variant="ghost" size="icon" onClick={handleLogout} className="text-white hover:bg-white/10 hover:text-white h-8 w-8">
                    <LogOut className="h-4 w-4" />
                 </Button>
              </h2>
               <Button variant="ghost" size="icon" onClick={() => router.push('/settings')} className="text-white hover:bg-white/10 hover:text-white h-8 w-8">
                  <Settings className="h-4 w-4" />
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
                      <div key={event.id} className="group relative">
                        {event.requiredXp && event.requiredXp > 0 && userEventStatus[event.id] !== 'registered' && userEventStatus[event.id] !== 'unlocked' && (
                             <Badge variant="outline" className="absolute top-2 left-2 text-yellow-300 border-yellow-300/50 bg-black/50 flex items-center gap-1.5">
                                <Zap className="h-3 w-3"/>{event.requiredXp} XP
                            </Badge>
                        )}
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
                              </div>
                            ) : (
                               <Badge className="bg-red-500 hover:bg-red-600 animate-pulse text-base py-1 px-4">Live Now!</Badge>
                            )}
                             <div className="flex justify-center items-center gap-4 text-lg text-white/80">
                                <div className="flex items-center gap-2 text-sm"><Calendar className="h-4 w-4"/> {format(new Date(event.startTime), 'MMM d, p')}</div>
                                <div className="flex items-center gap-2 text-sm"><Clock className="h-4 w-4"/> {format(new Date(event.endTime), 'p')}</div>
                            </div>
                          </CardContent>
                          <div className="p-4 pt-0">
                            {renderEventButton(event)}
                          </div>
                        </Card>
                      </div>
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
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
                    <History className="h-7 w-7"/> Past Events
                </h2>
                <Button asChild className="bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-bold shadow-lg hover:shadow-xl transition-shadow">
                    <Link href="/activities">
                        <Zap className="mr-2 h-5 w-5"/>
                        Get XP
                    </Link>
                </Button>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              {pastEvents.length > 0 ? (
                pastEvents.map(event => (
                  <Card key={event.id} className="bg-black/30 border-white/10 text-white backdrop-blur-sm relative">
                    <CardHeader className="p-4">
                      <CardTitle className="flex justify-between items-center">
                        <span>{event.name}</span>
                         <div className="flex items-center gap-2">
                           {event.requiredXp && event.requiredXp > 0 && (
                                <Badge variant="outline" className="text-yellow-300 border-yellow-300/50 bg-black/50 flex items-center gap-1.5">
                                    <Zap className="h-3 w-3"/>{event.requiredXp}
                                </Badge>
                            )}
                            {getEventStatusBadge(event.id)}
                        </div>
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
        <ExitConfirmationDialog 
            open={isExitConfirmationDialogOpen} 
            onOpenChange={setIsExitConfirmationDialogOpen}
            onConfirm={handleExitConfirm}
            onCancel={handleExitCancel}
        />
      </div>
    </div>
  );
}

    