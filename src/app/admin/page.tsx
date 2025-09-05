
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { onValue, ref } from 'firebase/database';
import { db } from '@/lib/firebase';
import type { LuckyEvent, QuizOrPoll } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Eye, Pencil, Trash2, MoreHorizontal, HelpCircle, BarChart2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { DeleteEventDialog } from '@/components/lucky-draw/DeleteEventDialog';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { determineWinners } from '../actions';
import { DeleteQuizDialog } from '@/components/lucky-draw/DeleteQuizDialog';

export default function AdminDashboard() {
  const [events, setEvents] = useState<LuckyEvent[]>([]);
  const [quizzes, setQuizzes] = useState<QuizOrPoll[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEventDeleteDialogOpen, setIsEventDeleteDialogOpen] = useState(false);
  const [isQuizDeleteDialogOpen, setIsQuizDeleteDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<LuckyEvent | null>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<QuizOrPoll | null>(null);

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
  
  const handleEventDeleteClick = (event: LuckyEvent) => {
    setSelectedEvent(event);
    setIsEventDeleteDialogOpen(true);
  }

  const handleQuizDeleteClick = (quiz: QuizOrPoll) => {
    setSelectedQuiz(quiz);
    setIsQuizDeleteDialogOpen(true);
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
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Manage Activities</h2>
        <div className="flex items-center gap-1">
            <Button asChild size="sm" className="h-7 px-2 text-xs">
              <Link href="/admin/create">
                <PlusCircle className="mr-1 h-3 w-3" /> Create Event
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="h-7 px-2 text-xs">
              <Link href="/admin/create-quiz">
                <HelpCircle className="mr-1 h-3 w-3" /> Create Quiz/Poll
              </Link>
            </Button>
        </div>
      </div>
      <Card>
        <CardHeader className="p-2">
          <CardTitle className="text-sm font-semibold">Lucky Box Events</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="h-8 px-2 text-xs">Event Name</TableHead>
                <TableHead className="h-8 px-2 text-xs">Date</TableHead>
                <TableHead className="h-8 px-2 text-xs">Status</TableHead>
                <TableHead className="text-right h-8 px-2 text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center px-2 py-1 text-xs">Loading events...</TableCell>
                </TableRow>
              ) : events.length > 0 ? (
                events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium px-2 py-1 text-xs">
                      <span className={cn(event.isHighlighted && 'animate-golden-glow text-accent')}>
                        {event.name}
                      </span>
                    </TableCell>
                    <TableCell className="px-2 py-1 text-xs">{format(new Date(event.startTime), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="px-2 py-1 text-xs">{getActivityStatus(event)}</TableCell>
                    <TableCell className="text-right px-2 py-1 text-xs">
                       <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <MoreHorizontal className="h-3 w-3" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/event/${event.id}`} className="flex items-center text-xs">
                                <Eye className="mr-2 h-3 w-3" /> View
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/event/${event.id}`} className="flex items-center text-xs">
                                <Pencil className="mr-2 h-3 w-3" /> Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEventDeleteClick(event)} className="text-destructive flex items-center text-xs">
                               <Trash2 className="mr-2 h-3 w-3" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center px-2 py-1 text-xs">No events found. Create one to get started!</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
       <Card>
        <CardHeader className="p-2">
          <CardTitle className="text-sm font-semibold">Quizzes & Polls</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="h-8 px-2 text-xs">Title</TableHead>
                <TableHead className="h-8 px-2 text-xs">Type</TableHead>
                 <TableHead className="h-8 px-2 text-xs">XP</TableHead>
                <TableHead className="h-8 px-2 text-xs">Status</TableHead>
                <TableHead className="text-right h-8 px-2 text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center px-2 py-1 text-xs">Loading quizzes...</TableCell>
                </TableRow>
              ) : quizzes.length > 0 ? (
                quizzes.map((quiz) => (
                  <TableRow key={quiz.id}>
                    <TableCell className="font-medium px-2 py-1 text-xs">{quiz.title}</TableCell>
                    <TableCell className="px-2 py-1 text-xs"><Badge variant="secondary" className="capitalize text-xs">{quiz.questionType}</Badge></TableCell>
                    <TableCell className="px-2 py-1 text-xs">{quiz.xp}</TableCell>
                    <TableCell className="px-2 py-1 text-xs">{getActivityStatus(quiz)}</TableCell>
                    <TableCell className="text-right px-2 py-1 text-xs">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <MoreHorizontal className="h-3 w-3" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                             <DropdownMenuItem asChild>
                              <Link href={`/admin/quiz-results/${quiz.id}`} className="flex items-center text-xs">
                                <BarChart2 className="mr-2 h-3 w-3" /> View Results
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/edit-quiz/${quiz.id}`} className="flex items-center text-xs">
                                <Pencil className="mr-2 h-3 w-3" /> Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleQuizDeleteClick(quiz)} className="text-destructive flex items-center text-xs">
                               <Trash2 className="mr-2 h-3 w-3" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center px-2 py-1 text-xs">No quizzes or polls found. Create one to get started!</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

       {selectedEvent && (
        <DeleteEventDialog
          open={isEventDeleteDialogOpen}
          onOpenChange={setIsEventDeleteDialogOpen}
          event={selectedEvent}
        />
      )}
       {selectedQuiz && (
        <DeleteQuizDialog
          open={isQuizDeleteDialogOpen}
          onOpenChange={setIsQuizDeleteDialogOpen}
          quiz={selectedQuiz}
        />
      )}
    </div>
  );
}

    