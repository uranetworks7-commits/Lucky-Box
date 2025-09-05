
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { onValue, ref } from 'firebase/database';
import { db } from '@/lib/firebase';
import type { LuckyEvent, QuizOrPoll } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Eye, Pencil, Trash2, MoreHorizontal, HelpCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { DeleteEventDialog } from '@/components/lucky-draw/DeleteEventDialog';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { determineWinners } from '../actions';

export default function AdminDashboard() {
  const [events, setEvents] = useState<LuckyEvent[]>([]);
  const [quizzes, setQuizzes] = useState<QuizOrPoll[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<LuckyEvent | null>(null);

  useEffect(() => {
    const eventsRef = ref(db, 'events');
    const unsubscribeEvents = onValue(eventsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const eventsList: LuckyEvent[] = Object.entries(data).map(([id, event]) => ({
          id,
          ...(event as Omit<LuckyEvent, 'id'>),
        })).sort((a, b) => b.startTime - a.startTime);
        setEvents(eventsList);
        
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

    const quizzesRef = ref(db, 'quizzes');
    const unsubscribeQuizzes = onValue(quizzesRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            const quizList: QuizOrPoll[] = Object.entries(data).map(([id, quiz]) => ({
                id,
                ...(quiz as Omit<QuizOrPoll, 'id'>),
            })).sort((a,b) => b.startTime - a.startTime);
            setQuizzes(quizList);
        } else {
            setQuizzes([]);
        }
    });

    return () => {
      unsubscribeEvents();
      unsubscribeQuizzes();
    }
  }, []);
  
  const handleDeleteClick = (event: LuckyEvent) => {
    setSelectedEvent(event);
    setIsDeleteDialogOpen(true);
  }
  
  const getActivityStatus = (item: {startTime: number, endTime: number}) => {
      const now = Date.now();
      if (now > item.endTime) {
          return <Badge variant="destructive">Ended</Badge>;
      }
      if (now < item.startTime) {
          return <Badge variant="outline">Upcoming</Badge>;
      }
      return <Badge className="bg-green-500 hover:bg-green-600">Live</Badge>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Manage Activities</h2>
        <div className="flex items-center gap-2">
            <Button asChild size="sm">
              <Link href="/admin/create">
                <PlusCircle className="mr-2 h-4 w-4" /> Create Event
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/create-quiz">
                <HelpCircle className="mr-2 h-4 w-4" /> Create Quiz/Poll
              </Link>
            </Button>
        </div>
      </div>
      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-base">Lucky Box Events</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
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
                    <TableCell>{getActivityStatus(event)}</TableCell>
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
      
       <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-base">Quizzes & Polls</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                 <TableHead>XP</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">Loading quizzes...</TableCell>
                </TableRow>
              ) : quizzes.length > 0 ? (
                quizzes.map((quiz) => (
                  <TableRow key={quiz.id}>
                    <TableCell className="font-medium">{quiz.title}</TableCell>
                    <TableCell><Badge variant="secondary" className="capitalize">{quiz.questionType}</Badge></TableCell>
                    <TableCell>{quiz.xp}</TableCell>
                    <TableCell>{getActivityStatus(quiz)}</TableCell>
                    <TableCell className="text-right">
                       <Button variant="outline" size="sm" disabled>
                            <Pencil className="mr-2 h-4 w-4" /> Edit
                       </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">No quizzes or polls found. Create one to get started!</TableCell>
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
