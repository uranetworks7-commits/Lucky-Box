'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { onValue, ref } from 'firebase/database';
import { db } from '@/lib/firebase';
import type { LuckyEvent } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Users, Trophy, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export default function AdminDashboard() {
  const [events, setEvents] = useState<LuckyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [highlighterMode, setHighlighterMode] = useState(false);
  const [highlightedEvent, setHighlightedEvent] = useState<string | null>(null);

  useEffect(() => {
    const eventsRef = ref(db, 'events');
    const unsubscribe = onValue(eventsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const eventsList: LuckyEvent[] = Object.entries(data).map(([id, event]) => ({
          id,
          ...(event as Omit<LuckyEvent, 'id'>),
        })).sort((a, b) => b.startTime - a.startTime);
        setEvents(eventsList);
      } else {
        setEvents([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getStatus = (event: LuckyEvent) => {
    const now = Date.now();
    if (now < event.startTime) return <Badge variant="outline">Upcoming</Badge>;
    if (now >= event.startTime && now <= event.endTime) return <Badge variant="default" className="bg-red-500">Live</Badge>;
    if (now > event.endTime && now < event.resultTime) return <Badge variant="secondary">Ending</Badge>;
    return <Badge variant="secondary" className="bg-gray-500">Ended</Badge>;
  };
  
  const handleEventClick = (eventId: string) => {
    if (highlighterMode) {
        setHighlightedEvent(eventId);
        setTimeout(() => setHighlightedEvent(null), 2000); // Glow for 2 seconds
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold">Manage Events</h2>
        <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
                <Switch 
                    id="highlighter-mode" 
                    checked={highlighterMode} 
                    onCheckedChange={setHighlighterMode}
                />
                <Label htmlFor="highlighter-mode" className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-accent" /> Highlighter Mode
                </Label>
            </div>
            <Button asChild>
              <Link href="/admin/create">
                <PlusCircle className="mr-2 h-4 w-4" /> Create Event
              </Link>
            </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All Events</CardTitle>
          <CardDescription>View, manage, and track all your events here.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Start Time</TableHead>
                <TableHead className="text-center">Registered</TableHead>
                <TableHead className="text-center">Winners</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">Loading events...</TableCell>
                </TableRow>
              ) : events.length > 0 ? (
                events.map((event) => (
                  <TableRow key={event.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-medium">
                      <Link 
                        href={`/admin/event/${event.id}`} 
                        className={cn("hover:underline", highlightedEvent === event.id && 'animate-golden-glow')}
                        onClick={() => handleEventClick(event.id)}
                      >
                        {event.name}
                      </Link>
                    </TableCell>
                    <TableCell>{getStatus(event)}</TableCell>
                    <TableCell>{format(new Date(event.startTime), 'MMM d, yyyy h:mm a')}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        {Object.keys(event.registeredUsers || {}).length}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                         <Trophy className="h-4 w-4 text-muted-foreground" />
                         {event.winners ? event.winners.length : 'N/A'}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">No events found. Create one to get started!</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
