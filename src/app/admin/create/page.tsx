'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ref, push, set } from 'firebase/database';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { LuckyEvent } from '@/types';

export default function CreateEventPage() {
  const [eventName, setEventName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [resultTime, setResultTime] = useState('');
  const [codes, setCodes] = useState('');
  const [selectionMode, setSelectionMode] = useState<'custom' | 'random'>();
  const [winnerSlots, setWinnerSlots] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectionMode) {
      toast({ title: 'Error', description: 'Please select a selection mode.', variant: 'destructive' });
      return;
    }
    
    setIsSubmitting(true);
    
    const newEvent: Omit<LuckyEvent, 'id'> = {
      name: eventName,
      startTime: new Date(startTime).getTime(),
      endTime: new Date(endTime).getTime(),
      resultTime: new Date(resultTime).getTime(),
      codes: codes.split('\n').map(c => c.trim()).filter(Boolean),
      selectionMode: selectionMode,
      ...(selectionMode === 'custom' && { winnerSlots: winnerSlots }),
    };

    try {
      const newEventRef = push(ref(db, 'events'));
      await set(newEventRef, newEvent);
      toast({ title: 'Success', description: 'Event created successfully!' });
      router.push('/admin');
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'Failed to create event.', variant: 'destructive' });
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Create New Event</CardTitle>
        <CardDescription>Fill out the details below to launch a new lucky draw event.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="event-name">Event Name</Label>
            <Input id="event-name" value={eventName} onChange={(e) => setEventName(e.target.value)} required />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-time">Start Time</Label>
              <Input id="start-time" type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-time">End Time</Label>
              <Input id="end-time" type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="result-time">Result Time</Label>
              <Input id="result-time" type="datetime-local" value={resultTime} onChange={(e) => setResultTime(e.target.value)} required />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="codes">Redeem Codes (one per line)</Label>
            <Textarea id="codes" value={codes} onChange={(e) => setCodes(e.target.value)} required placeholder="CODE123&#10;CODE456&#10;CODE789" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="selection-mode">Selection Mode</Label>
              <Select onValueChange={(value: 'custom' | 'random') => setSelectionMode(value)} required>
                <SelectTrigger id="selection-mode">
                  <SelectValue placeholder="Select a mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom Selection</SelectItem>
                  <SelectItem value="random">Random Selection</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {selectionMode === 'custom' && (
              <div className="space-y-2">
                <Label htmlFor="winner-slots">Winner Slots</Label>
                <Input id="winner-slots" type="number" min="1" value={winnerSlots} onChange={(e) => setWinnerSlots(Number(e.target.value))} required />
              </div>
            )}
          </div>
          
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Event'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
