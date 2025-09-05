
'use client';

import { useState, useEffect } from 'react';
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
import { ArrowLeft, PlusCircle, Sparkles, Trash2, Bell, Zap } from 'lucide-react';
import Link from 'next/link';

export default function CreateEventPage() {
  const [eventName, setEventName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [resultTime, setResultTime] = useState('');
  const [codes, setCodes] = useState<string[]>(['']);
  const [customSlots, setCustomSlots] = useState<Record<number, number>>({});
  const [selectionMode, setSelectionMode] = useState<'custom' | 'random'>();
  const [isHighlighted, setIsHighlighted] = useState(false);
  const [sendNotification, setSendNotification] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requiredXp, setRequiredXp] = useState<number | undefined>();

  const router = useRouter();
  const { toast } = useToast();

  const handleCodeChange = (index: number, value: string) => {
    const newCodes = [...codes];
    newCodes[index] = value;
    setCodes(newCodes);
  };
  
  const handleSlotChange = (index: number, value: string) => {
    const slot = parseInt(value, 10);
    setCustomSlots(prev => ({ ...prev, [index]: slot }));
  };

  const addCodeField = () => {
    setCodes([...codes, '']);
  };

  const removeCodeField = (index: number) => {
    const newCodes = codes.filter((_, i) => i !== index);
    setCodes(newCodes);
    const newSlots = {...customSlots};
    delete newSlots[index];
    // Re-index slots
    for (let i = index; i < codes.length -1; i++) {
        if(newSlots[i+1]) {
            newSlots[i] = newSlots[i+1];
            delete newSlots[i+1];
        }
    }
    setCustomSlots(newSlots);
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
    
    let customWinnerSlots: Record<string, number> | undefined;
    if (selectionMode === 'custom') {
        customWinnerSlots = {};
        let isValid = true;
        const usedSlots = new Set<number>();

        finalCodes.forEach((code, index) => {
            const slot = customSlots[index];
            if (!slot || slot <= 0) {
                isValid = false;
                return;
            }
            if(usedSlots.has(slot)){
                toast({ title: 'Error', description: `Winner slot ${slot} is used more than once.`, variant: 'destructive' });
                isValid = false;
                return;
            }
            usedSlots.add(slot);
            customWinnerSlots![code] = slot;
        });

        if (!isValid) {
            toast({ title: 'Error', description: 'Please enter a valid, positive winner slot for each code.', variant: 'destructive' });
            return;
        }
    }
    
    setIsSubmitting(true);
    
    const newEvent: Omit<LuckyEvent, 'id'> = {
      name: eventName,
      startTime: new Date(startTime).getTime(),
      endTime: new Date(endTime).getTime(),
      resultTime: new Date(resultTime).getTime(),
      codes: finalCodes,
      selectionMode: selectionMode,
      ...(selectionMode === 'custom' && { customWinnerSlots: customWinnerSlots }),
      isHighlighted: isHighlighted,
      sendNotification: sendNotification,
      ...(requiredXp && { requiredXp }),
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
        <CardTitle>Create New Event</CardTitle>
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
          
           <div className="space-y-2">
                <Label htmlFor="required-xp">Required XP (Optional)</Label>
                <div className="relative">
                    <Zap className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
                    <Input 
                        id="required-xp" 
                        type="number" 
                        min="0"
                        placeholder="e.g. 100" 
                        value={requiredXp || ''}
                        onChange={(e) => setRequiredXp(e.target.value ? Number(e.target.value) : undefined)}
                        className="pl-8"
                    />
                </div>
            </div>

          <div className="space-y-2">
            <Label>Selection Mode</Label>
            <Select onValueChange={(value: 'custom' | 'random') => setSelectionMode(value)} >
              <SelectTrigger>
                <SelectValue placeholder="Select a mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">Custom Selection</SelectItem>
                <SelectItem value="random">Random Selection</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-4">
            <Label>Redeem Codes</Label>
            <CardDescription>
                {selectionMode === 'custom' 
                    ? 'For each code, specify the winner slot (e.g., 1 for the 1st person to register).' 
                    : 'Codes will be assigned randomly to winners.'}
            </CardDescription>
            <div className="space-y-2">
              {codes.map((code, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={code}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    placeholder={`Code ${index + 1}`}
                  />
                  {selectionMode === 'custom' && (
                     <Input
                        type="number"
                        min="1"
                        placeholder="Win Slot"
                        className="w-32"
                        value={customSlots[index] || ''}
                        onChange={(e) => handleSlotChange(index, e.target.value)}
                      />
                  )}
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
          
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch id="highlighter-mode" checked={isHighlighted} onCheckedChange={setIsHighlighted} />
              <Label htmlFor="highlighter-mode" className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-accent" /> Highlight Event on Dashboard
              </Label>
            </div>
             <div className="flex items-center space-x-2">
                <Switch id="notification-mode" checked={sendNotification} onCheckedChange={setSendNotification} />
                <Label htmlFor="notification-mode" className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-blue-500" /> Send Notification to All Users
                </Label>
            </div>
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Event'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
