
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { onValue, ref } from 'firebase/database';
import { db } from '@/lib/firebase';
import type { LuckyEvent, QuizOrPoll, UserData } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Eye, Pencil, Trash2, MoreHorizontal, HelpCircle, BarChart2, Users, Zap } from 'lucide-react';
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
  const [users, setUsers] = useState<UserData[]>([]);
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

    const usersRef = ref(db, 'users');
    const unsubscribeUsers = onValue(usersRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            const userList: UserData[] = Object.values(data);
            setUsers(userList.sort((a,b) => b.xp - a.xp));
        } else {
            setUsers([]);
        }
    });

    return () => {
      unsubscribeEvents();
      unsubscribeQuizzes();
      unsubscribeUsers();
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
          return <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Ended</Badge>;
      }
      if (now < item.startTime) {
          return <Badge variant="outline" className="text-[10px] px-1.5 py-0">Upcoming</Badge>;
      }
      return <Badge className="bg-green-500 hover:bg-green-600 text-[10px] px-1.5 py-0">Live</Badge>
  }

  return (
    <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-2">
        <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold">Manage Activities</h2>
            <div className="flex items-center gap-1">
                <Button asChild size="sm" className="h-6 px-1.5 text-[10px]">
                  <Link href="/admin/create">
                    <PlusCircle className="mr-1 h-3 w-3" /> Create Event
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="h-6 px-1.5 text-[10px]">
                  <Link href="/admin/create-quiz">
                    <HelpCircle className="mr-1 h-3 w-3" /> Create Activity
                  </Link>
                </Button>
            </div>
        </div>
        <Card>
            <CardHeader className="p-1.5">
            <CardTitle className="text-xs font-semibold">Lucky Box Events</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead className="h-6 px-1.5 text-[10px]">Event Name</TableHead>
                    <TableHead className="h-6 px-1.5 text-[10px]">Date</TableHead>
                    <TableHead className="h-6 px-1.5 text-[10px]">Status</TableHead>
                    <TableHead className="text-right h-6 px-1.5 text-[10px]">Actions</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {loading ? (
                    <TableRow>
                    <TableCell colSpan={4} className="text-center px-1.5 py-0.5 text-[10px]">Loading events...</TableCell>
                    </TableRow>
                ) : events.length > 0 ? (
                    events.map((event) => (
                    <TableRow key={event.id} className="h-8">
                        <TableCell className="font-medium px-1.5 py-0.5 text-[10px]">
                        <span className={cn(event.isHighlighted && 'animate-golden-glow text-accent')}>
                            {event.name}
                        </span>
                        </TableCell>
                        <TableCell className="px-1.5 py-0.5 text-[10px]">{format(new Date(event.startTime), 'MMM d, yy')}</TableCell>
                        <TableCell className="px-1.5 py-0.5 text-[10px]">{getActivityStatus(event)}</TableCell>
                        <TableCell className="text-right px-1.5 py-0.5 text-[10px]">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-5 w-5">
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
                                <Link href={`/admin/edit-event/${event.id}`} className="flex items-center text-xs">
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
                    <TableCell colSpan={4} className="text-center px-1.5 py-0.5 text-[10px]">No events found. Create one to get started!</TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>
            </CardContent>
        </Card>
      
        <Card>
            <CardHeader className="p-1.5">
            <CardTitle className="text-xs font-semibold">Quizzes & Polls</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead className="h-6 px-1.5 text-[10px]">Title</TableHead>
                    <TableHead className="h-6 px-1.5 text-[10px]"># Qs</TableHead>
                    <TableHead className="h-6 px-1.5 text-[10px]">XP</TableHead>
                    <TableHead className="h-6 px-1.5 text-[10px]">Status</TableHead>
                    <TableHead className="text-right h-6 px-1.5 text-[10px]">Actions</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {loading ? (
                    <TableRow>
                    <TableCell colSpan={5} className="text-center px-1.5 py-0.5 text-[10px]">Loading activities...</TableCell>
                    </TableRow>
                ) : quizzes.length > 0 ? (
                    quizzes.map((quiz) => (
                    <TableRow key={quiz.id} className="h-8">
                        <TableCell className="font-medium px-1.5 py-0.5 text-[10px]">{quiz.title}</TableCell>
                        <TableCell className="px-1.5 py-0.5 text-[10px]">{quiz.questions?.length || 0}</TableCell>
                        <TableCell className="px-1.5 py-0.5 text-[10px]">{quiz.xp}</TableCell>
                        <TableCell className="px-1.5 py-0.5 text-[10px]">{getActivityStatus(quiz)}</TableCell>
                        <TableCell className="text-right px-1.5 py-0.5 text-[10px]">
                            <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-5 w-5">
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
                    <TableCell colSpan={5} className="text-center px-1.5 py-0.5 text-[10px]">No activities found. Create one to get started!</TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>
            </CardContent>
        </Card>
      </div>

      <div className="space-y-2">
        <h2 className="text-xs font-semibold">User Management</h2>
        <Card>
          <CardHeader className="p-1.5">
            <CardTitle className="text-xs font-semibold flex items-center gap-2"><Users className="h-3 w-3"/> All Users</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="h-6 px-1.5 text-[10px]">Username</TableHead>
                        <TableHead className="h-6 px-1.5 text-[10px] text-right">XP Balance</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                         <TableRow><TableCell colSpan={2} className="text-center px-1.5 py-0.5 text-[10px]">Loading users...</TableCell></TableRow>
                    ) : users.length > 0 ? (
                        users.map((user) => (
                            <TableRow key={user.user_id} className="h-8">
                                <TableCell className="font-medium px-1.5 py-0.5 text-[10px]">{user.username}</TableCell>
                                <TableCell className="px-1.5 py-0.5 text-[10px] text-right">
                                    <div className="flex items-center justify-end gap-1 font-bold text-blue-400">
                                        <Zap className="h-3 w-3"/>
                                        <span>{user.xp}</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                         <TableRow><TableCell colSpan={2} className="text-center px-1.5 py-0.5 text-[10px]">No users found.</TableCell></TableRow>
                    )}
                </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

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

    