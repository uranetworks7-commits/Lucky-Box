
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { onValue, ref } from 'firebase/database';
import { db } from '@/lib/firebase';
import type { LuckyEvent } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Eye, Pencil, Trash2, MoreHorizontal } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { DeleteEventDialog } from '@/components/lucky-draw/DeleteEventDialog';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { determineWinners } from '../actions';

export default function AdminDashboard() {
  const [events, setEvents] = useState<LuckyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<LuckyEvent | null>(null);

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
        
        // Check for events that need winners determined
        const now = Date.now();
        eventsList.forEach(event => {
          if (now > event.endTime && !event.winners) {
            determineWinners(event.id);
          }
        });
        
      } else {
        setEvents([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);
  
  const handleDeleteClick = (event: LuckyEvent) => {
    setSelectedEvent(event);
    setIsDeleteDialogOpen(true);
  }
  
  const getEventStatus = (event: LuckyEvent) => {
      const now = Date.now();
      if (now > event.resultTime && event.winners) {
          return <Badge variant="destructive">Ended</Badge>;
      }
       if (now > event.endTime) {
          return <Badge variant="secondary">Registration Closed</Badge>;
      }
      if (now < event.startTime) {
          return <Badge variant="outline">Upcoming</Badge>;
      }
      return <Badge className="bg-green-500 hover:bg-green-600">Live</Badge>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold">Manage Events</h2>
        <div className="flex items-center gap-4">
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
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event Name</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">Loading events...</TableCell>
                </TableRow>
              ) : events.length > 0 ? (
                events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium">
                      <span className={cn(event.isHighlighted && 'animate-golden-glow text-accent')}>
                        {event.name}
                      </span>
                    </TableCell>
                    <TableCell>{format(new Date(event.startTime), 'MMM d, yyyy')}</TableCell>
                    <TableCell>{getEventStatus(event)}</TableCell>
                    <TableCell className="text-right">
                       <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/event/${event.id}`} className="flex items-center">
                                <Eye className="mr-2 h-4 w-4" /> View
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/event/${event.id}`} className="flex items-center">
                                <Pencil className="mr-2 h-4 w-4" /> Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteClick(event)} className="text-destructive flex items-center">
                               <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">No events found. Create one to get started!</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
       {selectedEvent && (
        <DeleteEventDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          event={selectedEvent}
        />
      )}
    </div>
  );
}
