'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ref, push, set } from 'firebase/database';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { LuckyEvent } from '@/types';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, PlusCircle, Sparkles, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function CreateEventPage() {
  const [eventName, setEventName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [resultTime, setResultTime] = useState('');
  const [codes, setCodes] = useState<string[]>(['']);
  const [selectionMode, setSelectionMode] = useState<'custom' | 'random'>();
  const [winnerSlots, setWinnerSlots] = useState<number>(1);
  const [isHighlighted, setIsHighlighted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();
  const { toast } = useToast();

  const handleCodeChange = (index: number, value: string) => {
    const newCodes = [...codes];
    newCodes[index] = value;
    setCodes(newCodes);
  };

  const addCodeField = () => {
    setCodes([...codes, '']);
  };

  const removeCodeField = (index: number) => {
    const newCodes = codes.filter((_, i) => i !== index);
    setCodes(newCodes);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectionMode) {
      toast({ title: 'Error', description: 'Please select a selection mode.', variant: 'destructive' });
      return;
    }
    const finalCodes = codes.map(c => c.trim()).filter(Boolean);
    if (finalCodes.length === 0) {
        toast({ title: 'Error', description: 'Please add at least one redeem code.', variant: 'destructive' });
        return;
    }
    
    setIsSubmitting(true);
    
    const newEvent: Omit<LuckyEvent, 'id'> = {
      name: eventName,
      startTime: new Date(startTime).getTime(),
      endTime: new Date(endTime).getTime(),
      resultTime: new Date(resultTime).getTime(),
      codes: finalCodes,
      selectionMode: selectionMode,
      ...(selectionMode === 'custom' && { winnerSlots: winnerSlots }),
      isHighlighted: isHighlighted,
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
    <Card className="max-w-2xl mx-auto mb-8">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle>Create New Event</CardTitle>
            <CardDescription>Fill out the details below to launch a new lucky draw event.</CardDescription>
        </div>
         <Button variant="outline" asChild>
          <Link href="/admin"><ArrowLeft /> Back</Link>
        </Button>
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
          
          <div className="space-y-4">
            <Label>Redeem Codes</Label>
            <div className="space-y-2">
              {codes.map((code, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={code}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    placeholder={`Code ${index + 1}`}
                    required
                  />
                  {codes.length > 1 && (
                    <Button type="button" variant="outline" size="icon" onClick={() => removeCodeField(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addCodeField}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Code
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
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
          
          <div className="flex items-center space-x-2">
            <Switch id="highlighter-mode" checked={isHighlighted} onCheckedChange={setIsHighlighted} />
            <Label htmlFor="highlighter-mode" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent" /> Highlight Event on Dashboard
            </Label>
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Event'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
