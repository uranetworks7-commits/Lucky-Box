'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { onValue, ref } from 'firebase/database';
import { db } from '@/lib/firebase';
import type { LuckyEvent } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Pencil, Users, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { EditCodesDialog } from '@/components/lucky-draw/EditCodesDialog';
import Link from 'next/link';

export default function EventDetailsPage() {
  const params = useParams();
  const eventId = params.id as string;
  const [event, setEvent] = useState<LuckyEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

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

  if (loading) {
    return <div className="text-center p-8">Loading event details...</div>;
  }

  if (!event) {
    return <div className="text-center p-8">Event not found.</div>;
  }
  
  const registeredUsers = event.registeredUsers ? Object.values(event.registeredUsers) : [];
  const winners = event.winners ? event.winners.map(userId => ({userId, username: event.registeredUsers?.[userId] || userId})) : [];

  return (
    <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users /> Registered Users ({registeredUsers.length})</CardTitle>
          </CardHeader>
          <CardContent>
             <Table>
                <TableHeader>
                    <TableRow><TableHead>Username</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                    {registeredUsers.length > 0 ? registeredUsers.map((name, i) => (
                        <TableRow key={i}><TableCell>{name}</TableCell></TableRow>
                    )) : <TableRow><TableCell>No users have registered yet.</TableCell></TableRow>}
                </TableBody>
             </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Trophy /> Winners ({winners.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
                <TableHeader>
                    <TableRow><TableHead>Username</TableHead><TableHead>Code</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                    {winners.length > 0 ? winners.map((winner) => (
                        <TableRow key={winner.userId}>
                            <TableCell>{winner.username}</TableCell>
                            <TableCell>{event.assignedCodes?.[winner.userId] || 'N/A'}</TableCell>
                        </TableRow>
                    )) : <TableRow><TableCell colSpan={2}>Winners not determined yet.</TableCell></TableRow>}
                </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>{event.name}</CardTitle>
                <CardDescription>Event Details</CardDescription>
            </div>
            <Button variant="outline" asChild size="sm">
                <Link href="/admin"><ArrowLeft/> Back</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div><strong>Start:</strong> {format(new Date(event.startTime), 'Pp')}</div>
            <div><strong>End:</strong> {format(new Date(event.endTime), 'Pp')}</div>
            <div><strong>Results:</strong> {format(new Date(event.resultTime), 'Pp')}</div>
            <div className="flex items-center gap-2"><strong>Mode:</strong> <Badge variant="outline">{event.selectionMode}</Badge></div>
            {event.selectionMode === 'custom' && <div><strong>Slots:</strong> {event.winnerSlots}</div>}
          </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>Codes ({event.codes.length})</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-sm text-muted-foreground mb-4">
                    {event.codes.slice(0, 5).map((code, i) => <span key={i} className="block truncate">{code}</span>)}
                    {event.codes.length > 5 && <span className="block">...and {event.codes.length - 5} more</span>}
                </div>
                <Button className="w-full" variant="outline" onClick={() => setIsEditDialogOpen(true)}>
                    <Pencil className="mr-2 h-4 w-4" /> Edit Codes
                </Button>
            </CardContent>
        </Card>
      </div>
      <EditCodesDialog 
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        eventId={event.id}
        currentCodes={event.codes}
      />
    </div>
  );
}
