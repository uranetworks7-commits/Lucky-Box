'use client';

import { useState, useEffect } from 'react';
import { ref, update } from 'firebase/database';
import { db } from '@/lib/firebase';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Label } from '../ui/label';

interface EditCodesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  currentCodes: string[];
}

export function EditCodesDialog({ open, onOpenChange, eventId, currentCodes }: EditCodesDialogProps) {
  const [codes, setCodes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setCodes(currentCodes.join('\n'));
    }
  }, [open, currentCodes]);

  const handleSave = async () => {
    setIsSubmitting(true);
    const updatedCodes = codes.split('\n').map(c => c.trim()).filter(Boolean);
    const eventRef = ref(db, `events/${eventId}`);
    
    try {
      await update(eventRef, { codes: updatedCodes });
      toast({ title: 'Success', description: 'Codes updated successfully!' });
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'Failed to update codes.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Codes</DialogTitle>
          <DialogDescription>
            Add, remove, or change the redeem codes for this event. Enter one code per line.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Label htmlFor="codes-textarea" className="sr-only">Codes</Label>
          <Textarea 
            id="codes-textarea"
            value={codes}
            onChange={(e) => setCodes(e.target.value)}
            rows={10}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
